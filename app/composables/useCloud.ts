import { createGlobalState, useEventListener, useOnline, useStorage, watchDebounced } from '@vueuse/core'
import type { Trip, TripProgress } from '#shared/types/trip'
import { decide, itemKey, jsonHash, type CloudItem, type ItemKind, type Known } from '#shared/utils/sync'
import type { Firebase } from '~/lib/firebase'
import { photoIds, readPhoto } from '~/lib/photoStore'

export type CloudStatus =
  | 'off' // never signed in on this device: Firebase isn't even loaded
  | 'starting'
  | 'signed-out'
  | 'signing-in'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'not-owner' // signed in with a Google account that isn't this app's owner
  | 'error'

export interface CloudUser {
  uid: string
  name: string
  email: string
  photo: string | null
}

interface SyncMemory {
  uid: string
  /** What this device and the cloud last agreed on, per item. */
  known: Record<string, Known>
  /** Photos already in the cloud. */
  photos: string[]
}

interface LocalItem {
  kind: ItemKind
  ref: string
  json: string
}

const MESSAGES: Record<string, string> = {
  'auth/configuration-not-found': 'Google sign-in isn’t switched on for this app yet.',
  'auth/operation-not-allowed': 'Google sign-in isn’t switched on for this app yet.',
  'auth/unauthorized-domain': 'This address isn’t allowed to sign in yet.',
  'auth/popup-blocked': 'The sign-in window was blocked. Allow pop-ups for this site and try again.',
  'auth/network-request-failed': 'No connection. Try again when you’re online.',
  'auth/admin-restricted-operation': 'This app is locked to its owner’s Google account.',
  'auth/web-storage-unsupported': 'This browser blocks what sign-in needs. Open the app in Safari or Chrome.',
  'auth/internal-error': 'Google sign-in failed. Try again in a moment.',
  'permission-denied': 'Your account can’t reach the cloud copy (security rules). Is this the account the app belongs to?',
  'failed-precondition': 'The cloud database isn’t ready yet.',
  'not-found': 'The cloud database isn’t set up yet.',
  'unavailable': 'Can’t reach the cloud right now. Your changes are kept on this device.',
}
const QUIET = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'])
const PHOTO_OFF = new Set(['storage/unauthorized', 'storage/bucket-not-found', 'storage/project-not-found', 'storage/unknown'])

const codeOf = (e: unknown) => String((e as { code?: string } | null)?.code ?? '')

/** Your Google account: sign-in, and keeping trips, progress and photos in step with the cloud. */
export const useCloud = createGlobalState(() => {
  const config = useAppConfig()
  const emulators = String(useRuntimeConfig().public.firebaseEmulators ?? '')
  const online = useOnline()
  /** This device uses the cloud (so Firebase loads when the app opens). */
  const enabled = useStorage('travel:cloud:on', false)
  const memory = useStorage<SyncMemory | null>('travel:cloud:sync:v1', null)

  const status = ref<CloudStatus>(enabled.value ? 'starting' : 'off')
  const user = shallowRef<CloudUser | null>(null)
  const message = ref('')
  const lastSynced = ref<number | null>(null)
  /** Bumped when photos may have become available (you signed in). */
  const photoEpoch = ref(0)
  const photosWaiting = ref(0)
  const photoBackup = ref<'on' | 'unavailable'>('on')

  let fb: Firebase | null = null
  let loading: Promise<Firebase | null> | null = null
  let stopWatch: (() => void) | null = null
  let remote = new Map<string, CloudItem>()
  /** The latest cloud snapshot came from the server (not a cache while offline). */
  let fresh = false
  /** Items being written right now. */
  const writing = new Set<string>()
  let uploading = false

  function report(e: unknown, fallback = 'Something went wrong with sync.') {
    const code = codeOf(e)
    if (QUIET.has(code)) return
    message.value = MESSAGES[code] ?? `${fallback}${code ? ` (${code})` : ''}`
    console.warn('[cloud]', e)
  }

  function load(): Promise<Firebase | null> {
    if (fb) return Promise.resolve(fb)
    loading ??= import('~/lib/firebase')
      .then(({ createFirebase }) => {
        fb = createFirebase(config.firebase, emulators)
        fb.onUser(u => void onUser(u))
        return fb
      })
      .catch((e) => {
        loading = null
        report(e, 'Couldn’t load sign-in.')
        status.value = 'error'
        return null
      })
    return loading
  }

  // ---------- local data ----------
  const trips = useTrips().trips
  const progress = useProgressStore()

  function localItems(): Map<string, LocalItem> {
    const m = new Map<string, LocalItem>()
    for (const t of trips.value) m.set(itemKey('trip', t.id), { kind: 'trip', ref: t.id, json: JSON.stringify(t) })
    for (const [id, p] of Object.entries(progress.value)) m.set(itemKey('progress', id), { kind: 'progress', ref: id, json: JSON.stringify(p) })
    return m
  }

  function setLocal(kind: ItemKind, ref: string, json: string) {
    if (kind === 'trip') {
      const t = JSON.parse(json) as Trip
      const i = trips.value.findIndex(x => x.id === ref)
      if (i >= 0) trips.value[i] = t
      else trips.value.push(t)
    }
    else {
      progress.value[ref] = JSON.parse(json) as TripProgress
    }
  }

  function removeLocal(kind: ItemKind, ref: string) {
    if (kind === 'trip') trips.value = trips.value.filter(t => t.id !== ref)
    else delete progress.value[ref]
  }

  // ---------- sync ----------
  function setStatus() {
    if (!user.value || status.value === 'not-owner') return
    if (!fresh) status.value = online.value ? 'syncing' : 'offline'
    else if (writing.size) status.value = 'syncing'
    else {
      if (status.value !== 'synced') message.value = ''
      status.value = 'synced'
      lastSynced.value = Date.now()
    }
  }

  /**
   * Writes one item, but only if the cloud still has the version the decision was based on.
   * If another device changed it meanwhile, nothing is written and the next snapshot decides again.
   */
  async function write(key: string, item: CloudItem, basis: number | null) {
    const m = memory.value
    if (!fb || !user.value || !m) return
    writing.add(key)
    setStatus()
    let written = false
    try {
      written = await fb.writeItemIf(user.value.uid, key, item, basis)
      if (written) m.known[key] = { hash: item.deleted ? '' : jsonHash(item.json), updatedAt: item.updatedAt }
    }
    catch (e) {
      if (codeOf(e) !== 'unavailable') {
        status.value = 'error'
        report(e)
      }
    }
    finally {
      writing.delete(key)
      setStatus()
      // Catch up with changes made here meanwhile. (If another device got there first,
      // its version arrives in the next snapshot, which decides again.)
      if (written) reconcile()
    }
  }

  /** Compares every trip and progress here with the cloud and moves whatever changed. */
  function reconcile() {
    const m = memory.value
    // Only against what the server says right now: offline, changes wait on the device.
    if (!fb || !user.value || !m || !fresh || !online.value) return
    const locals = localItems()
    for (const key of new Set([...locals.keys(), ...remote.keys()])) {
      if (writing.has(key)) continue
      const l = locals.get(key)
      const r = remote.get(key)
      const kind = (l?.kind ?? r?.kind)!
      const ref = (l?.ref ?? r?.ref)!
      const d = decide(kind, l?.json, r, m.known[key])
      // The version the cloud should have now: the newest we've seen or written.
      const seen = Math.max(r?.updatedAt ?? -1, m.known[key]?.updatedAt ?? -1)
      const basis = seen < 0 ? null : seen
      // Versions only go up, even if this device's clock is behind another's.
      const at = Math.max(Date.now(), seen + 1)
      switch (d.do) {
        case 'upload':
          void write(key, { kind, ref, json: l!.json, updatedAt: at }, basis)
          break
        case 'apply':
          setLocal(kind, ref, r!.json)
          m.known[key] = { hash: jsonHash(r!.json), updatedAt: r!.updatedAt }
          break
        case 'merge':
          setLocal(kind, ref, d.json)
          void write(key, { kind, ref, json: d.json, updatedAt: at }, basis)
          break
        case 'tombstone':
          void write(key, { kind, ref, json: '', updatedAt: at, deleted: true }, basis)
          break
        case 'delete-local':
          removeLocal(kind, ref)
          m.known[key] = { hash: '', updatedAt: r!.updatedAt }
          break
      }
    }
  }

  function watchCloud(uid: string) {
    stopWatch?.()
    fresh = false
    setStatus()
    stopWatch = fb!.watchItems(uid, (items, meta) => {
      remote = items
      fresh = !meta.fromCache
      reconcile()
      setStatus()
    }, (e) => {
      status.value = 'error'
      report(e)
    })
  }

  function stop() {
    stopWatch?.()
    stopWatch = null
    fresh = false
    remote = new Map()
  }

  async function onUser(u: { uid: string, displayName: string | null, email: string | null, photoURL: string | null } | null) {
    if (!u) {
      stop()
      user.value = null
      status.value = 'signed-out'
      return
    }
    user.value = { uid: u.uid, name: u.displayName ?? '', email: u.email ?? '', photo: u.photoURL }
    enabled.value = true
    if (memory.value?.uid !== u.uid) memory.value = { uid: u.uid, known: {}, photos: [] }
    memory.value!.photos ??= []
    try {
      if (!(await fb!.claim(u.uid))) {
        stop()
        status.value = 'not-owner'
        return
      }
    }
    catch (e) {
      // Offline, the rules still guard the data; carry on from the device's copy.
      if (codeOf(e) !== 'unavailable') {
        status.value = 'error'
        report(e)
        return
      }
    }
    watchCloud(u.uid)
    photoEpoch.value++
    void backupPhotos()
  }

  /** Opens Firebase and picks up whoever is signed in (and a sign-in coming back from Google). */
  async function start() {
    if (status.value === 'off') status.value = 'starting'
    const f = await load()
    if (!f) return
    f.redirectResult().catch((e) => {
      report(e, 'Sign-in didn’t finish.')
      if (!user.value) status.value = 'signed-out'
    })
  }

  async function signIn() {
    message.value = ''
    enabled.value = true
    const f = await load()
    if (!f) return
    status.value = 'signing-in'
    // On the app's own Firebase address a redirect is the most reliable (also from the Home Screen);
    // elsewhere the sign-in page opens in a window.
    const sameOrigin = location.hostname === config.firebase.authDomain
    try {
      if (sameOrigin) await f.signInRedirect()
      else await f.signInPopup()
    }
    catch (e) {
      report(e, 'Sign-in didn’t work.')
      if (!user.value) {
        status.value = 'signed-out'
        if (!memory.value) enabled.value = false // never signed in here: don't load sign-in at start
      }
    }
  }

  async function signOut() {
    stop()
    await fb?.signOut().catch(report)
    user.value = null
    enabled.value = false
    status.value = 'signed-out'
  }

  /** Signs out and forgets what was synced, so clearing this device doesn't clear your account. */
  async function forget() {
    await signOut()
    memory.value = null
  }

  // Local changes go up a moment after you make them.
  watchDebounced([trips, progress], reconcile, { deep: true, debounce: 800, maxWait: 5000 })

  // ---------- photos ----------
  async function backupPhotos() {
    const m = memory.value
    if (!fb || !user.value || !m || uploading || !online.value || photoBackup.value === 'unavailable') return
    uploading = true
    try {
      const todo = (await photoIds()).filter(id => !m.photos.includes(id))
      photosWaiting.value = todo.length
      for (const id of todo) {
        const blob = await readPhoto(id)
        if (!blob) continue
        try {
          await fb.uploadPhoto(user.value.uid, id, blob)
          m.photos.push(id)
          photosWaiting.value = Math.max(0, photosWaiting.value - 1)
        }
        catch (e) {
          if (PHOTO_OFF.has(codeOf(e))) photoBackup.value = 'unavailable'
          console.warn('[cloud] photo backup', e)
          break // try again later
        }
      }
    }
    finally {
      uploading = false
    }
  }

  let photoTimer: ReturnType<typeof setTimeout> | undefined
  function photoAdded(_id: string) {
    photosWaiting.value++
    clearTimeout(photoTimer)
    photoTimer = setTimeout(() => void backupPhotos(), 1500)
  }

  function photoRemoved(id: string) {
    const m = memory.value
    if (m) m.photos = m.photos.filter(x => x !== id)
    if (fb && user.value) void fb.deletePhoto(user.value.uid, id)
  }

  /** A photo taken on another device: the file, or a URL to show it by. */
  async function fetchPhoto(id: string): Promise<Blob | string | null> {
    if (!fb || !user.value || !online.value) return null
    const got = await fb.downloadPhoto(user.value.uid, id)
    if (got instanceof Blob) memory.value?.photos.push(id)
    return got
  }

  useEventListener('online', () => {
    reconcile()
    void backupPhotos()
  })
  watch(online, setStatus)

  /** Tests only (emulator builds): sign in as a made-up Google account. */
  async function testSignIn(sub: string, email: string) {
    enabled.value = true
    const f = await load()
    await f?.testSignIn(sub, email)
  }
  const testPeek = async (uid: string) => (await load())?.peek(uid)

  return {
    enabled, status, user, message, lastSynced, photoEpoch, photosWaiting, photoBackup, online,
    start, signIn, signOut, forget, backupPhotos, photoAdded, photoRemoved, fetchPhoto,
    ...(emulators ? { testSignIn, testPeek } : {}),
  }
})
