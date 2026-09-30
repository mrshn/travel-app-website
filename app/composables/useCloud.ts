import { createGlobalState, until, useEventListener, useOnline, useStorage, watchDebounced } from '@vueuse/core'
import type { Trip, TripProgress } from '#shared/types/trip'
import {
  ACCOUNT_KEY, accountFrom, accountMobileUA, accountOnSignIn, accountOwnAddress, accountSignIn, accountSignInMethod,
  accountSwitchKept, accountSwitchQuestion, accountUnsynced, syncMemoryFrom, type RememberedAccount, type SignInEnv, type SyncMemory,
} from '#shared/utils/account'
import { decide, itemKey, jsonHash, type CloudItem, type ItemKind } from '#shared/utils/sync'
import type { Firebase, User } from '~/lib/firebase'
import { clearPhotos, photoIds, readPhoto } from '~/lib/photoStore'

export type CloudStatus =
  | 'off' // Firebase isn't loaded on this device: nobody signed in here yet, or you signed out
  | 'starting' // loading Firebase and picking up your session
  | 'signed-out' // Firebase reports nobody signed in (with a remembered account: sign in again to keep saving)
  | 'signing-in'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'error'

export interface CloudUser {
  uid: string
  name: string
  email: string
  photo: string | null
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
  'auth/admin-restricted-operation': 'New accounts can’t sign up right now. Accounts that already use the app still can.',
  'auth/web-storage-unsupported': 'This browser blocks what sign-in needs. Open the app in Safari or Chrome.',
  'auth/internal-error': 'Google sign-in failed. Try again in a moment.',
  'permission-denied': 'The cloud turned this account away (security rules). Your changes are kept on this device.',
  'failed-precondition': 'The cloud database isn’t ready yet.',
  'not-found': 'The cloud database isn’t set up yet.',
  'unavailable': 'Can’t reach the cloud right now. Your changes are kept on this device.',
}
const QUIET = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled', 'auth/redirect-cancelled-by-user'])
const PHOTO_OFF = new Set(['storage/unauthorized', 'storage/bucket-not-found', 'storage/project-not-found', 'storage/unknown'])

const codeOf = (e: unknown) => String((e as { code?: string } | null)?.code ?? '')

/** A value stored as JSON, read back through a check (anything unreadable reads as null). */
const jsonStore = <T>(read: (raw: string) => T | null) => ({ read, write: (v: T | null) => JSON.stringify(v) })

/** Which celebrations this device already showed, per trip id (GameHost.vue): they go with the device's copy. */
const CELEBRATED_KEY = 'travel:game:seen:v1'

/** Firebase noted, in this tab, a sign-in that went to Google's page: its return is to be picked up. */
function signInComingBack(): boolean {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      if (sessionStorage.key(i)?.startsWith('firebase:pendingRedirect:')) return true
    }
  }
  catch { /* storage refused */ }
  return false
}

/** How long a start may look busy while Firebase checks a return from Google (a stalled network never answers). */
const START_PATIENCE_MS = 12000

/**
 * Your Google account: sign-in, the account this device's copy belongs to, and keeping trips, progress and photos
 * in step with that account's cloud copy (spec D31 to D36 and D39).
 */
export const useCloud = createGlobalState(() => {
  const config = useAppConfig()
  const emulators = String(useRuntimeConfig().public.firebaseEmulators ?? '')
  const online = useOnline()
  /** This device uses the cloud (so Firebase loads when the app opens). */
  const enabled = useStorage('travel:cloud:on', false)
  /** The account this device's copy belongs to (spec D34). Kept when you sign out, with `out` set. */
  const stored = useStorage<RememberedAccount | null>(ACCOUNT_KEY, null, undefined, { serializer: jsonStore(accountFrom) })
  const memory = useStorage<SyncMemory | null>('travel:cloud:sync:v1', null, undefined, { serializer: jsonStore(syncMemoryFrom) })
  /** Another account's copy is being removed from this device: no account shows until it is gone. */
  const switching = ref(false)

  const status = ref<CloudStatus>(enabled.value ? 'starting' : 'off')
  /** Who Firebase reports signed in right now. */
  const user = shallowRef<CloudUser | null>(null)
  const signedIn = computed(() => !!user.value)
  /**
   * The account this device opens into: the remembered one, until you sign out (then the landing page shows) or
   * remove it from this device. Read-only: only signing in, out or forget() change it, so the remembered account
   * never drops while its copy is still on the device (the next account would adopt that copy).
   */
  const account = computed<CloudUser | null>(() => {
    const a = stored.value
    return a && !a.out && !switching.value ? { uid: a.uid, name: a.name, email: a.email, photo: a.photo } : null
  })
  const message = ref('')
  const lastSynced = ref<number | null>(null)
  /** Bumped when photos may have become available (you signed in). */
  const photoEpoch = ref(0)
  const photosWaiting = ref(0)
  const photoBackup = ref<'on' | 'unavailable'>('on')
  /** Back from Google's page, but the sign-in didn't complete (spec D31). */
  const redirectFailed = `Sign-in didn't finish. Open ${config.firebase.authDomain} in Safari or Chrome and try again.`

  let fb: Firebase | null = null
  let loading: Promise<Firebase | null> | null = null
  let stopWatch: (() => void) | null = null
  let remote = new Map<string, CloudItem>()
  /** The latest cloud snapshot came from the server (not a cache while offline). */
  let fresh = false
  /** Items being written right now. */
  const writing = new Set<string>()
  let uploading = false
  /** Counts sign-in changes, so one that finishes late never overrides a newer one. */
  let turn = 0
  /** Sign-ins removing another account's copy right now (onUser). */
  let settling = 0
  /** Signing out right now: a session Firebase reports meanwhile is the one being ended. */
  let leaving = false

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
        report(e, online.value ? 'Couldn’t load sign-in.' : 'No connection. Try again when you’re online.')
        status.value = 'error'
        return null
      })
    return loading
  }

  // ---------- local data ----------
  const tripStore = useTrips()
  const trips = tripStore.trips
  const progress = useProgressStore()
  const copy = useCopyEpoch()

  function localItems(): Map<string, LocalItem> {
    const m = new Map<string, LocalItem>()
    for (const t of trips.value) m.set(itemKey('trip', t.id), { kind: 'trip', ref: t.id, json: JSON.stringify(t) })
    for (const [id, p] of Object.entries(progress.value)) m.set(itemKey('progress', id), { kind: 'progress', ref: id, json: JSON.stringify(p) })
    return m
  }

  const hasLocalData = () => trips.value.length > 0 || Object.keys(progress.value).length > 0

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

  /**
   * Removes this device's copy, never the cloud's (spec D35, D36): trips, progress, the sync memory, the updates
   * waiting, the old seeded bookkeeping and the celebrations already shown. Photos go with clearDevicePhotos(). A
   * change begun on this copy (a trip screen still open, a photo being saved or fetched) never lands in the next (D44).
   */
  function clearLocal() {
    copy.value++
    memory.value = null
    tripStore.clearAll()
    progress.value = {}
    photosWaiting.value = 0
    lastSynced.value = null
    try {
      localStorage.removeItem(CELEBRATED_KEY)
    }
    catch { /* storage refused */ }
  }

  /** Removes this device's photos; resolves to the ids it couldn't remove, which must never be uploaded. */
  async function clearDevicePhotos(): Promise<string[]> {
    try {
      await clearPhotos()
      return []
    }
    catch (e) {
      console.warn('[cloud] clearing photos', e)
      return photoIds().catch(() => [])
    }
  }

  // ---------- what hasn't reached the account ----------
  /** Items this device hasn't agreed with the cloud yet (spec D36). */
  const unsynced = computed(() => {
    const m = memory.value
    const a = stored.value
    const known = m && (!a || m.uid === a.uid) ? m.known : undefined
    return accountUnsynced([...localItems()].map(([key, l]) => [key, l.json] as const), known)
  })
  /** Items not yet agreed with the cloud, plus photos waiting to back up (while photo backup works). */
  const pending = computed(() => unsynced.value + (photoBackup.value === 'on' ? photosWaiting.value : 0))

  /**
   * The photos this device's copy holds (its stops' photos): the only ones that ever go up to the account (spec D44).
   * A photo nothing holds (left by an account that has since gone, or saved as another signed in) stays on the device.
   */
  function photosInUse(): Set<string> {
    const ids = new Set<string>()
    for (const p of Object.values(progress.value)) {
      for (const f of Object.values(p?.feedback ?? {})) {
        for (const id of f?.photos ?? []) ids.add(id)
      }
    }
    return ids
  }

  /** Photos on this device that its copy holds and the account doesn't have yet (`done`). */
  async function photosToBackUp(done: readonly string[]): Promise<string[]> {
    const use = photosInUse()
    const have = new Set(done)
    return (await photoIds()).filter(id => use.has(id) && !have.has(id))
  }

  async function countWaiting() {
    try {
      photosWaiting.value = (await photosToBackUp(memory.value?.photos ?? [])).length
    }
    catch { /* no IndexedDB in this browser */ }
  }

  // ---------- sync ----------
  /** Signed in, and the sync memory belongs to that account: the only time anything is read into or sent from here. */
  function syncing(): { uid: string, m: SyncMemory } | null {
    const u = user.value
    const m = memory.value
    return fb && u && m && m.uid === u.uid && !switching.value ? { uid: u.uid, m } : null
  }

  function setStatus() {
    if (!user.value) return
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
    const s = syncing()
    if (!s) return
    writing.add(key)
    setStatus()
    let written = false
    try {
      written = await fb!.writeItemIf(s.uid, key, item, basis)
      if (written) s.m.known[key] = { hash: item.deleted ? '' : jsonHash(item.json), updatedAt: item.updatedAt }
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
      // Catch up with changes made here meanwhile. (If another device got there first, its version arrives in
      // the next snapshot, which decides again. When that snapshot came while this write was on its way, it
      // skipped this item, so decide again now: otherwise both devices would stay "synced" apart.)
      if (written || (remote.get(key)?.updatedAt ?? -1) > (basis ?? -1)) reconcile()
    }
  }

  /** Compares every trip and progress here with the cloud and moves whatever changed. */
  function reconcile() {
    const s = syncing()
    // Only against what the server says right now: offline, changes wait on the device.
    if (!s || !fresh || !online.value) return
    const m = s.m
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
      if (user.value?.uid !== uid) return // a snapshot of an account that has since signed out
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

  async function onUser(u: Pick<User, 'uid' | 'displayName' | 'email' | 'photoURL'> | null) {
    const mine = ++turn
    if (!u) {
      stop()
      switching.value = false
      user.value = null
      // A sign-in under way (Firebase loaded by the tap reports nobody yet, on its way to Google's page) stays so:
      // signIn() sets the status once it has finished.
      if (status.value !== 'signing-in') status.value = 'signed-out'
      return
    }
    if (leaving) return // the session being ended by signOut()
    const next: CloudUser = { uid: u.uid, name: u.displayName ?? '', email: u.email ?? '', photo: u.photoURL ?? null }
    if (user.value?.uid === next.uid && stopWatch) {
      user.value = next // the same session, told again
      return
    }
    stop()
    let leftovers: string[] = []
    const was = stored.value
    settling++
    try {
      // Photos waiting to back up count too (spec D36): count them now, as they are.
      if (was && was.uid !== next.uid) await countWaiting()
      if (mine !== turn) return // signed out, or someone else signed in, meanwhile
      let decision = accountOnSignIn({ remembered: was?.uid, incoming: next.uid, hasLocalData: hasLocalData(), pending: pending.value })
      if (decision === 'ask') {
        // Clearing would lose changes that haven't reached the remembered account (spec D42): ask first. Keeping them
        // (Cancel, or closing the question) signs this account out again, and nothing on the device changes.
        const n = pending.value
        if (!window.confirm(accountSwitchQuestion(n, was!.email, next.email))) {
          if (mine === turn) await keepCopy(n, was!, next)
          return
        }
        if (mine !== turn) return
        decision = 'clear'
      }
      if (decision === 'clear') {
        // Another account's copy is on this device (spec D35): hide it now, and remove all of it before this account's
        // data arrives, so none of it shows or reaches this account. The remembered account is marked signed out
        // first (a reload meanwhile opens on the landing page) and changes only once the copy is gone, so a clear cut
        // short (the app closed) runs again at the next sign-in.
        switching.value = true
        user.value = null
        if (was && !was.out) stored.value = { ...was, out: true }
        clearLocal()
        leftovers = await clearDevicePhotos()
        if (mine !== turn) return
      }
    }
    finally {
      settling--
    }
    // Keep (the same account again) or adopt (a copy from before accounts: it merges into this account, as before).
    stored.value = { uid: next.uid, name: next.name, email: next.email, photo: next.photo }
    if (memory.value?.uid !== next.uid) memory.value = { uid: next.uid, known: {}, photos: leftovers }
    switching.value = false
    user.value = next
    enabled.value = true
    message.value = ''
    watchCloud(next.uid)
    photoEpoch.value++
    void countWaiting().then(() => backupPhotos())
  }

  /**
   * "Keep them" (spec D42): the device's copy stays with the remembered account, and the account that just signed in is
   * signed out again; the sign-in button then says why, and which account to sign in with to save the changes.
   */
  async function keepCopy(n: number, was: RememberedAccount, other: CloudUser) {
    leaving = true
    try {
      await fb?.signOut().catch(e => report(e))
    }
    finally {
      leaving = false
    }
    stop()
    switching.value = false
    user.value = null
    status.value = fb ? 'signed-out' : 'off'
    message.value = accountSwitchKept(n, was.email, other.email)
    // Firebase loads at start only for an account signed in here (not one signed out on purpose).
    if (!account.value) enabled.value = false
  }

  /** Firebase signed someone in without telling onUser (the same account as a session it still held): catch up. */
  function caughtUp() {
    const current = fb?.auth.currentUser
    if (current && !settling && !leaving && user.value?.uid !== current.uid) void onUser(current)
  }

  /**
   * Opens Firebase and picks up whoever is signed in (and a sign-in coming back from Google). With no account on this
   * device and no sign-in coming back, Firebase stays unloaded: a sign-in that never finished (Back on Google's page)
   * would otherwise load it, and ask Google, at every start of the landing page.
   */
  async function start() {
    if (!account.value && !signInComingBack()) {
      enabled.value = false
      status.value = 'off'
      return
    }
    if (status.value === 'off') status.value = 'starting'
    const f = await load()
    if (!f) return
    // Nobody came back from Google, and no account is here: Firebase needn't load at the next start.
    const settled = () => {
      if (!f.auth.currentUser && !account.value) enabled.value = false
    }
    // A stalled network never answers Firebase's check of the return: the sign-in buttons come back all the same (the
    // answer, if it comes, still signs you in).
    const patience = setTimeout(() => {
      if (status.value === 'starting' && !user.value) {
        status.value = 'signed-out'
        settled()
      }
    }, START_PATIENCE_MS)
    f.redirectResult().then(settled, (e) => {
      const code = codeOf(e)
      if (!QUIET.has(code)) {
        message.value = code === 'auth/network-request-failed' ? MESSAGES[code]! : redirectFailed
        console.warn('[cloud]', e)
      }
      if (!user.value) status.value = 'signed-out'
      settled()
    }).finally(() => clearTimeout(patience))
  }

  /**
   * Loads Firebase ahead of a tap, so a desktop pop-up can open inside it: call it when a sign-in button appears.
   * Where sign-in goes to Google's page instead (a phone, a tablet or the Home Screen app on the app's own address),
   * nothing has to be ready before the tap, so nothing loads: on a phone Firebase would fetch Google's sign-in
   * script at once, and the landing page asks no other address until you tap (spec W2).
   */
  async function prepare(): Promise<void> {
    if (accountSignInMethod(signInEnv()) === 'redirect') return
    await load()
  }

  function signInEnv(): SignInEnv {
    const mq = (q: string) => {
      try {
        return window.matchMedia(q).matches
      }
      catch {
        return false
      }
    }
    const nav = navigator as Navigator & { standalone?: boolean }
    return {
      host: location.hostname,
      authDomain: config.firebase.authDomain,
      standalone: nav.standalone === true || ['standalone', 'fullscreen', 'minimal-ui'].some(m => mq(`(display-mode: ${m})`)),
      coarse: mq('(pointer: coarse)'),
      mobileUA: accountMobileUA(navigator.userAgent, navigator.maxTouchPoints || 0),
    }
  }

  /**
   * Signs in with Google (spec D31). On the app's own address a phone, a tablet or the Home Screen app goes to Google's
   * page and back; a desktop browser opens a pop-up straight from the tap (so call this right in the click handler,
   * after prepare()), falling back to Google's page when the pop-up is blocked. Elsewhere, a pop-up as before.
   */
  function signIn(): Promise<void> {
    message.value = ''
    enabled.value = true
    status.value = 'signing-in'
    const env = signInEnv()
    // Google's account list picks out the account this device remembers (spec D42): the same person rarely picks
    // another account by mistake.
    const hint = stored.value?.email || undefined
    return accountSignIn({
      method: accountSignInMethod(env),
      own: accountOwnAddress(env.host, env.authDomain),
      loaded: !!fb,
      load: async () => !!(await load()),
      popup: () => fb!.signInPopup(hint),
      redirect: () => fb!.signInRedirect(hint),
    }).then(caughtUp, (e: unknown) => {
      report(e, 'Sign-in didn’t work.')
    }).finally(() => {
      // Nobody signed in (the pop-up closed, or sign-in failed): back to how it was.
      if (!fb?.auth.currentUser && status.value === 'signing-in') {
        status.value = fb ? 'signed-out' : 'off'
        // Firebase loads at start only to pick up a remembered account's session (not after a sign-out, or never).
        if (!account.value) enabled.value = false
      }
    })
  }

  /** Pending changes after giving them a moment to go up, when they can. */
  async function flush(): Promise<number> {
    if (!pending.value) return 0
    if (syncing() && fresh && online.value) {
      reconcile()
      void backupPhotos()
      await until(pending).toBe(0, { timeout: 4000 })
    }
    return pending.value
  }

  /**
   * Signs out (spec D36): the landing page shows, and this device's copy stays with the remembered account (the same
   * account signing in again finds it at once). With changes that haven't reached the account yet, after a moment
   * for them to go up, it changes nothing and returns 'pending', unless `force` is true.
   */
  async function signOut(opts: { force?: boolean } = {}): Promise<'done' | 'pending'> {
    if (!opts.force && (await flush()) > 0) return 'pending'
    const used = enabled.value
    turn++ // a sign-in still on its way no longer counts
    stop()
    switching.value = false
    user.value = null
    const a = stored.value
    if (a && !a.out) stored.value = { ...a, out: true }
    enabled.value = false
    // End Firebase's session too (it's kept on the device), loading Firebase for that if this device used it.
    leaving = true
    try {
      const f = fb ?? (used ? await load() : null)
      if (f) await f.signOut().catch(e => report(e))
    }
    finally {
      leaving = false
    }
    status.value = fb ? 'signed-out' : 'off'
    return 'done'
  }

  /**
   * "Sign out and remove from this device" (spec D36): signs out, then removes this device's copy and the remembered
   * account. The account is forgotten only once its photos are gone too: if some can't be removed now (or the app is
   * closed meanwhile), it stays remembered, signed out, so the next account to sign in here removes them first (D44).
   */
  async function forget(): Promise<void> {
    await signOut({ force: true })
    clearLocal()
    if ((await clearDevicePhotos()).length) return
    stored.value = null
  }

  // Local changes go up a moment after you make them, and so does a photo once a stop holds it.
  watchDebounced([trips, progress], () => {
    reconcile()
    void backupPhotos()
  }, { deep: true, debounce: 800, maxWait: 5000 })

  // ---------- photos ----------
  async function backupPhotos() {
    const s = syncing()
    if (!s || uploading || !online.value || photoBackup.value === 'unavailable') return
    uploading = true
    try {
      const todo = await photosToBackUp(s.m.photos)
      photosWaiting.value = todo.length
      for (const id of todo) {
        if (syncing()?.m !== s.m) break // signed out, or another account came in
        const blob = await readPhoto(id)
        if (!blob) continue
        try {
          await fb!.uploadPhoto(s.uid, id, blob)
          s.m.photos.push(id)
          photosWaiting.value = Math.max(0, photosWaiting.value - 1)
        }
        catch (e) {
          if (PHOTO_OFF.has(codeOf(e))) photoBackup.value = 'unavailable'
          console.warn('[cloud] photo backup', e)
          break // try again later
        }
      }
    }
    catch (e) {
      console.warn('[cloud] photo backup', e)
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
    const s = syncing()
    if (s) void fb!.deletePhoto(s.uid, id)
    void countWaiting()
  }

  /** A photo taken on another device: the file, or a URL to show it by. */
  async function fetchPhoto(id: string): Promise<Blob | string | null> {
    const s = syncing()
    if (!s || !online.value) return null
    const got = await fb!.downloadPhoto(s.uid, id)
    if (got instanceof Blob && syncing()?.m === s.m && !s.m.photos.includes(id)) s.m.photos.push(id)
    return got
  }

  useEventListener('online', () => {
    reconcile()
    void backupPhotos()
  })
  watch(online, setStatus)

  // Back on a page the browser kept (the back-forward cache) after leaving it for Google's page: that sign-in never
  // finished, so the sign-in buttons come back (spec D31).
  useEventListener('pageshow', (e: PageTransitionEvent) => {
    if (!e.persisted || status.value !== 'signing-in' || fb?.auth.currentUser) return
    status.value = fb ? 'signed-out' : 'off'
    if (!account.value) enabled.value = false
  })

  // Photos still waiting to back up count as changes that haven't reached the account (also offline).
  if (stored.value) void countWaiting()

  /** Tests only (emulator builds): sign in as a made-up Google account. */
  async function testSignIn(sub: string, email: string) {
    enabled.value = true
    const f = await load()
    await f?.testSignIn(sub, email)
    caughtUp()
  }
  const testPeek = async (uid: string) => (await load())?.peek(uid)
  const testPoke = async (uid: string) => (await load())?.poke(uid)
  /** Tests only: Firebase itself, to watch or stand in for its sign-in calls. */
  const testFirebase = () => load()

  return {
    enabled, status, user, account, signedIn, pending, message, lastSynced, photoEpoch, photosWaiting, photoBackup, online,
    prepare, start, signIn, signOut, forget, backupPhotos, photoAdded, photoRemoved, fetchPhoto,
    ...(emulators ? { testSignIn, testPeek, testPoke, testFirebase } : {}),
  }
})
