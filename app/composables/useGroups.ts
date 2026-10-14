import { createGlobalState, useOnline, useStorage, watchDebounced } from '@vueuse/core'
import type { ComputedRef, Ref } from 'vue'
import type { Going, GroupPointer, GroupTripDoc, MemberStatus, Message, NewMessage, PersonRef, Role, Rsvp, Vote } from '#shared/types/social'
import type { Trip } from '#shared/types/trip'
import { socialCanEdit, socialGroupJson, socialGroupTrip, socialToken } from '#shared/utils/social'
import { jsonHash } from '#shared/utils/sync'
import { mergeTrips } from '#shared/utils/tripmerge'
import type { GroupMeta, SocialBackend, SocialError, Unsub } from '~/lib/social/api'

/** What this device last agreed with the cloud about one group trip's plan. */
interface Known {
  hash: string
  updatedAt: number
}

interface GroupMemory {
  uid: string
  known: Record<string, Known>
}

/** How a group trip's plan stands with the cloud on this device. */
export type GroupSync = 'syncing' | 'synced' | 'offline' | 'error'

/** A member of a group trip, as lists show them. */
export interface GroupMember extends PersonRef {
  role: Role
}

/** What a group trip's screens see live: votes, who's in, statuses, and (while the chat is open) messages. */
export interface GroupLive {
  votes: Vote[]
  rsvps: Rsvp[]
  statuses: MemberStatus[]
  /** Newest last. The last 100 stay on the device for offline reading. */
  messages: Message[]
}

const MEMORY_KEY = 'travel:groups:sync:v1'
const CHAT_KEY = 'travel:groups:chat:v1:'
const READ_KEY = 'travel:groups:read:v1:'
const ROLE_ORDER: Record<Role, number> = { owner: 0, editor: 1, viewer: 2 }

const jsonStore = <T>(read: (raw: string) => T | null) => ({ read, write: (v: T | null) => JSON.stringify(v) })
function readMemory(raw: string): GroupMemory | null {
  try {
    const v = JSON.parse(raw) as GroupMemory
    return v && typeof v.uid === 'string' && v.known && typeof v.known === 'object' ? v : null
  }
  catch {
    return null
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  }
  catch {
    return fallback
  }
}
function writeJson(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  }
  catch { /* a convenience only */ }
}

const metaOf = (t: Trip): GroupMeta => ({ title: t.title, destination: t.destination, start: t.start, end: t.end, cover: { scene: t.cover.scene, tod: t.cover.tod } })

/**
 * Group trips (docs/design/2026-10-14-together.md, section 7): keeps each group trip's plan on this device in step
 * with its document in the cloud (merging when two people changed it at once), and does what a group trip needs:
 * make one, join, leave, roles, the group pick, and saying in the chat what changed.
 */
export const useGroups = createGlobalState(() => {
  const social = useSocial()
  const tripsStore = useTrips()
  const trips = tripsStore.trips
  const online = useOnline()
  const memory = useStorage<GroupMemory | null>(MEMORY_KEY, null, undefined, { serializer: jsonStore(readMemory) })

  const pointers = ref<GroupPointer[]>([])
  const docs = shallowRef(new Map<string, GroupTripDoc>())
  const sync = ref<Record<string, GroupSync>>({})
  /** The newest messages of each group trip (for the unread dot), live while signed in. */
  const latest = ref<Record<string, Message[]>>({})
  const lastRead = ref<Record<string, number>>({})

  // ---------- live lists of one group trip, shared by the screens that use them ----------
  interface LiveSub {
    users: { meta: number, chat: number }
    state: GroupLive
    unsubs: { meta: Unsub[], chat: Unsub[] }
    stop: () => void
  }
  const liveSubs = new Map<string, LiveSub>()
  const liveState = ref<Record<string, GroupLive>>({})

  const writing = new Set<string>()
  const watchers = new Map<string, Unsub>()
  const latestWatchers = new Map<string, Unsub>()
  let pointerUnsub: Unsub | null = null

  function known(): Record<string, Known> {
    const uid = social.me.value?.uid
    if (!uid) return {}
    if (memory.value?.uid !== uid) memory.value = { uid, known: {} }
    return memory.value.known
  }
  function setSync(gid: string, s: GroupSync) {
    if (sync.value[gid] !== s) sync.value = { ...sync.value, [gid]: s }
  }

  /** This device's copy of a group trip. */
  const localOf = (gid: string): Trip | undefined => trips.value.find(t => t.group?.id === gid)
  /** The id a group trip has on this device (for links from the inbox and lists). */
  const localIdOf = (gid: string): string | undefined => localOf(gid)?.id ?? pointers.value.find(p => p.gid === gid)?.localId

  function setLocal(gid: string, next: Trip) {
    const i = trips.value.findIndex(t => t.group?.id === gid)
    if (i >= 0) trips.value[i] = next
  }

  // ---------- following the cloud ----------
  function stopAll() {
    pointerUnsub?.()
    pointerUnsub = null
    for (const u of watchers.values()) u()
    watchers.clear()
    for (const u of latestWatchers.values()) u()
    latestWatchers.clear()
    for (const u of liveSubs.values()) u.stop()
    liveSubs.clear()
    docs.value = new Map()
    pointers.value = []
  }

  watch(() => (social.ready.value ? social.backend.value : null), (b) => {
    stopAll()
    const uid = b?.me?.uid
    lastRead.value = uid ? readJson(READ_KEY + uid, {}) : {}
    if (!b || !uid) return
    pointerUnsub = b.watchPointers((list) => {
      pointers.value = list
      follow(b)
    }, e => console.warn('[groups]', e.code, e.message))
  }, { immediate: true })

  // Back online: follow again whatever stopped at an error.
  watch(online, (on) => {
    const b = social.backend.value
    if (on && b && social.ready.value) follow(b)
  })

  function follow(b: SocialBackend) {
    const want = new Set(pointers.value.map(p => p.gid))
    for (const [gid, u] of watchers) {
      if (!want.has(gid)) {
        u()
        watchers.delete(gid)
      }
    }
    for (const [gid, u] of latestWatchers) {
      if (!want.has(gid)) {
        u()
        latestWatchers.delete(gid)
      }
    }
    for (const p of pointers.value) {
      if (!watchers.has(p.gid)) {
        setSync(p.gid, 'syncing')
        watchers.set(p.gid, b.watchGroup(p.gid, (doc) => {
          if (!doc) {
            watchers.get(p.gid)?.()
            watchers.delete(p.gid)
            void gone(b, p)
            return
          }
          const m = new Map(docs.value)
          m.set(p.gid, doc)
          docs.value = m
          reconcile(p.gid)
        }, (e: SocialError) => {
          watchers.delete(p.gid)
          setSync(p.gid, e.code === 'offline' ? 'offline' : 'error')
        }))
      }
      if (!latestWatchers.has(p.gid)) {
        latestWatchers.set(p.gid, b.watchMessages(p.gid, 30, (list) => {
          latest.value = { ...latest.value, [p.gid]: list }
        }, () => latestWatchers.delete(p.gid)))
      }
    }
  }

  /** Compares one group trip's copy here with its document and moves whatever changed (section 7). */
  function reconcile(gid: string) {
    const b = social.backend.value
    const me = social.me.value
    const doc = docs.value.get(gid)
    const ptr = pointers.value.find(p => p.gid === gid)
    if (!b || !me || !doc || !ptr || writing.has(gid)) return
    const role = doc.roles[me.uid]
    if (!role) return
    const k = known()
    const was = k[gid]
    const remoteHash = jsonHash(doc.json)
    const local = localOf(gid)

    if (!local) {
      // The organiser's other device holds the trip as a personal one under the same id: it is adopted, merged.
      const i = trips.value.findIndex(t => t.id === ptr.localId && !t.group)
      const theirs = socialGroupTrip(doc.json, ptr.localId, gid, role)
      if (i >= 0) {
        const mine = { ...trips.value[i]!, group: undefined, seedId: undefined, seedVersion: undefined }
        const merged = mergeTrips({ ...mine, group: { id: gid, role } }, theirs)
        merged.id = ptr.localId
        trips.value[i] = merged
      }
      else {
        trips.value.push(theirs)
      }
      k[gid] = { hash: remoteHash, updatedAt: doc.updatedAt }
      setSync(gid, 'synced')
      queueMicrotask(() => reconcile(gid))
      return
    }
    if (local.group?.role !== role) setLocal(gid, { ...local, group: { id: gid, role } })

    const localJson = socialGroupJson(local, gid)
    const localHash = jsonHash(localJson)
    const localChanged = localHash !== was?.hash
    const remoteChanged = !was || doc.updatedAt > was.updatedAt

    if (localHash === remoteHash) {
      k[gid] = { hash: remoteHash, updatedAt: Math.max(doc.updatedAt, was?.updatedAt ?? 0) }
      setSync(gid, 'synced')
      return
    }
    const take = () => {
      setLocal(gid, socialGroupTrip(doc.json, local.id, gid, role))
      k[gid] = { hash: remoteHash, updatedAt: doc.updatedAt }
      setSync(gid, 'synced')
    }
    if (!localChanged) return take()
    if (!socialCanEdit(role)) return take() // a viewer's copy follows the plan
    if (!remoteChanged) return void upload(b, gid, local, doc.updatedAt)
    // Both changed since they last agreed: merge, keep, write.
    const merged = mergeTrips(local, socialGroupTrip(doc.json, local.id, gid, role))
    setLocal(gid, merged)
    k[gid] = { hash: remoteHash, updatedAt: doc.updatedAt }
    void upload(b, gid, merged, doc.updatedAt)
  }

  async function upload(b: SocialBackend, gid: string, trip: Trip, basis: number) {
    const json = socialGroupJson(trip, gid)
    const at = Math.max(Date.now(), basis + 1)
    writing.add(gid)
    setSync(gid, 'syncing')
    try {
      if (await b.writeGroupJson(gid, json, at, basis, metaOf(trip))) {
        known()[gid] = { hash: jsonHash(json), updatedAt: at }
        setSync(gid, 'synced')
      }
    }
    catch (e) {
      const code = (e as SocialError)?.code
      setSync(gid, code === 'offline' ? 'offline' : 'error')
      if (code === 'denied') toast('Your changes to this trip couldn’t be saved: you can only view it now.', { tone: 'warn' })
    }
    finally {
      writing.delete(gid)
      setTimeout(() => reconcile(gid), 0)
    }
  }

  // Changes made here go up a moment after they're made.
  watchDebounced(trips, () => {
    for (const p of pointers.value) reconcile(p.gid)
  }, { deep: true, debounce: 800, maxWait: 5000 })

  /** A group trip you can't read any more (deleted, or you were removed): your copy stays, as a trip of your own. */
  async function gone(b: SocialBackend, p: GroupPointer) {
    const local = localOf(p.gid)
    if (local) {
      const mine: Trip = { ...local, edited: true, updatedAt: new Date().toISOString() }
      delete mine.group
      setLocal(p.gid, mine)
      toast(`“${local.title}” isn’t shared with you any more. Your copy stays on this device.`, { tone: 'info' })
    }
    delete known()[p.gid]
    const m = new Map(docs.value)
    m.delete(p.gid)
    docs.value = m
    await b.deletePointer(p.gid).catch(() => {})
  }

  // ---------- making, joining, leaving ----------
  /** Makes one of your trips a group trip (the first invite does it); resolves to its group id. */
  async function makeGroup(tripId: string): Promise<string> {
    const b = social.api()
    const t = tripsStore.get(tripId)
    if (!t) throw new Error('No such trip on this device')
    if (t.group) return t.group.id
    const gid = socialToken()
    const now = Date.now()
    const json = socialGroupJson(t, gid)
    await b.createGroup({ id: gid, ...metaOf(t), json, updatedAt: now })
    await b.savePointer({ gid, localId: t.id, role: 'owner', title: t.title, at: now })
    const i = trips.value.findIndex(x => x.id === tripId)
    if (i >= 0) {
      const next: Trip = { ...trips.value[i]!, group: { id: gid, role: 'owner' } }
      delete next.seedId
      delete next.seedVersion
      trips.value[i] = next
    }
    known()[gid] = { hash: jsonHash(json), updatedAt: now }
    return gid
  }

  /** Joins a group trip with an invite token; resolves to its group id and its id on this device once the plan is here. */
  async function join(token: string): Promise<{ gid: string, localId: string }> {
    const b = social.api()
    const inv = await b.getInvite(token)
    const doc = await b.joinGroup(token)
    const gid = doc.id
    const role = doc.roles[b.me!.uid] ?? inv?.role ?? 'viewer'
    const existing = localOf(gid)
    const localId = existing?.id ?? (tripsStore.get(gid) ? `${gid}-${socialToken(4)}` : gid)
    await b.savePointer({ gid, localId, role, title: doc.title, at: Date.now() })
    if (!pointers.value.some(p => p.gid === gid)) pointers.value = [...pointers.value, { gid, localId, role, title: doc.title, at: Date.now() }]
    const m = new Map(docs.value)
    m.set(gid, doc)
    docs.value = m
    reconcile(gid)
    follow(b)
    if (inv && inv.from !== b.me!.uid) {
      void b.notify(inv.from, { kind: 'joined-trip', text: `joined ${doc.title}`, ref: gid }).catch(() => {})
    }
    void b.sendMessage(gid, { kind: 'system', text: `${b.me!.name} joined the trip` }).catch(() => {})
    return { gid, localId: localOf(gid)?.id ?? localId }
  }

  /** Leaves a group trip: keeps your copy as a trip of your own, or removes it from this device. */
  async function leave(gid: string, opts: { keep: boolean }) {
    const b = social.api()
    const local = localOf(gid)
    void b.sendMessage(gid, { kind: 'system', text: `${b.me!.name} left the trip` }).catch(() => {})
    await b.leaveGroup(gid)
    await b.deletePointer(gid).catch(() => {})
    watchers.get(gid)?.()
    watchers.delete(gid)
    delete known()[gid]
    pointers.value = pointers.value.filter(p => p.gid !== gid)
    if (local) {
      if (opts.keep) {
        const mine: Trip = { ...local, edited: true, updatedAt: new Date().toISOString() }
        delete mine.group
        setLocal(gid, mine)
      }
      else {
        const store = useProgressStore()
        delete store.value[local.id]
        tripsStore.remove(local.id)
      }
    }
  }

  /** The organiser stops sharing: the group goes for everyone, and everyone keeps their copy. */
  async function stopSharing(gid: string) {
    const b = social.api()
    const local = localOf(gid)
    watchers.get(gid)?.()
    watchers.delete(gid)
    await b.deleteGroup(gid)
    await b.deletePointer(gid).catch(() => {})
    delete known()[gid]
    pointers.value = pointers.value.filter(p => p.gid !== gid)
    if (local) {
      const mine: Trip = { ...local, edited: true, updatedAt: new Date().toISOString() }
      delete mine.group
      setLocal(gid, mine)
    }
  }

  /** Organiser: someone's role, or null to remove them. */
  async function setRole(gid: string, uid: string, role: Exclude<Role, 'owner'> | null) {
    await social.api().setRole(gid, uid, role)
  }

  /** Says in a group trip's chat what changed (best effort: never fails the change itself). */
  function announce(tripId: string, text: string) {
    const gid = tripsStore.get(tripId)?.group?.id
    const b = social.backend.value
    if (!gid || !b || !social.ready.value) return
    void b.sendMessage(gid, { kind: 'system', text }).catch(() => {})
  }

  /** The members of a group trip, organiser first. */
  function membersOf(gid: string | null | undefined): GroupMember[] {
    const doc = gid ? docs.value.get(gid) : undefined
    if (!doc) return []
    return Object.entries(doc.roles)
      .map(([uid, role]) => ({ uid, role, name: doc.people[uid]?.name ?? 'Someone', photo: doc.people[uid]?.photo ?? null }))
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.name.localeCompare(b.name))
  }

  // Your name or photo changed: every group trip you're in shows the new one.
  watch(() => [social.me.value?.name, social.me.value?.photo, pointers.value.length] as const, () => {
    const b = social.backend.value
    const me = social.me.value
    if (!b || !me || !social.ready.value) return
    for (const p of pointers.value) {
      const mine = docs.value.get(p.gid)?.people[me.uid]
      if (mine && (mine.name !== me.name || (mine.photo ?? null) !== me.photo)) void b.updateMe(p.gid).catch(() => {})
    }
  })

  // ---------- unread ----------
  function unreadOf(gid: string | null | undefined): number {
    if (!gid) return 0
    const me = social.me.value?.uid
    const since = lastRead.value[gid] ?? 0
    return (latest.value[gid] ?? []).filter(m => m.at > since && m.author !== me && m.kind !== 'system').length
  }
  function markRead(gid: string, at = Date.now()) {
    if ((lastRead.value[gid] ?? 0) >= at) return
    lastRead.value = { ...lastRead.value, [gid]: at }
    const uid = social.me.value?.uid
    if (uid) writeJson(READ_KEY + uid, lastRead.value)
  }

  function emptyLive(gid: string): GroupLive {
    const uid = social.me.value?.uid
    const cached = uid ? readJson<Message[]>(`${CHAT_KEY}${uid}:${gid}`, []) : []
    return { votes: [], rsvps: [], statuses: [], messages: Array.isArray(cached) ? cached : [] }
  }
  function patchLive(gid: string, patch: Partial<GroupLive>) {
    const cur = liveState.value[gid] ?? emptyLive(gid)
    liveState.value = { ...liveState.value, [gid]: { ...cur, ...patch } }
    if (patch.messages) {
      const uid = social.me.value?.uid
      if (uid) writeJson(`${CHAT_KEY}${uid}:${gid}`, patch.messages.slice(-100))
    }
  }

  function startLive(gid: string, what: 'meta' | 'chat') {
    const b = social.backend.value
    const sub = liveSubs.get(gid)
    if (!b || !sub || !social.ready.value || sub.unsubs[what].length) return
    const quiet = () => {
      sub.unsubs[what] = []
    }
    if (what === 'meta') {
      sub.unsubs.meta = [
        b.watchVotes(gid, list => patchLive(gid, { votes: list }), quiet),
        b.watchRsvps(gid, list => patchLive(gid, { rsvps: list }), quiet),
        b.watchStatuses(gid, list => patchLive(gid, { statuses: list }), quiet),
      ]
    }
    else {
      sub.unsubs.chat = [b.watchMessages(gid, 200, list => patchLive(gid, { messages: list }), quiet)]
    }
  }

  /**
   * Keeps a group trip's votes, who's in and statuses (and with `chat`, its messages) live while the calling screen is
   * mounted. Call in setup; returns the live state (empty while not a group trip).
   */
  function useLive(gid: Ref<string | null>, opts: { chat?: boolean } = {}): ComputedRef<GroupLive> {
    const what: ('meta' | 'chat')[] = opts.chat ? ['meta', 'chat'] : ['meta']
    let held: string | null = null
    function hold(id: string | null) {
      if (held === id) return
      release()
      held = id
      if (!id) return
      let sub = liveSubs.get(id)
      if (!sub) {
        sub = {
          users: { meta: 0, chat: 0 },
          state: emptyLive(id),
          unsubs: { meta: [], chat: [] },
          stop() {
            for (const u of [...this.unsubs.meta, ...this.unsubs.chat]) u()
            this.unsubs = { meta: [], chat: [] }
          },
        }
        liveSubs.set(id, sub)
        if (!liveState.value[id]) liveState.value = { ...liveState.value, [id]: sub.state }
      }
      for (const w of what) {
        sub.users[w]++
        startLive(id, w)
      }
    }
    function release() {
      const id = held
      held = null
      const sub = id ? liveSubs.get(id) : undefined
      if (!id || !sub) return
      for (const w of what) {
        sub.users[w] = Math.max(0, sub.users[w] - 1)
        if (!sub.users[w]) {
          for (const u of sub.unsubs[w]) u()
          sub.unsubs[w] = []
        }
      }
      if (!sub.users.meta && !sub.users.chat) liveSubs.delete(id)
    }
    onMounted(() => hold(gid.value))
    watch(gid, id => hold(id))
    // A new backend (signed in again, back online): the screens on show subscribe again.
    watch(() => [social.ready.value, social.backend.value] as const, () => {
      const id = held
      if (id) for (const w of what) startLive(id, w)
    })
    onBeforeUnmount(release)
    return computed(() => (gid.value ? liveState.value[gid.value] ?? emptyLive(gid.value) : { votes: [], rsvps: [], statuses: [], messages: [] }))
  }

  // ---------- small actions ----------
  const backendFor = () => social.api()
  async function vote(gid: string, stopId: string, choiceId: string | null) {
    await backendFor().setVote(gid, stopId, choiceId)
  }
  async function rsvp(gid: string, stopId: string, going: Going | null) {
    await backendFor().setRsvp(gid, stopId, going)
  }
  async function setStatus(gid: string, s: Omit<MemberStatus, 'uid' | 'at'> | null, opts: { tell?: boolean } = {}) {
    const b = backendFor()
    await b.setStatus(gid, s)
    if (s && opts.tell !== false) void b.sendMessage(gid, { kind: 'status', text: `${b.me!.name}: ${s.text}` }).catch(() => {})
  }
  async function send(gid: string, m: NewMessage): Promise<Message> {
    const msg = await backendFor().sendMessage(gid, m)
    markRead(gid, msg.at)
    return msg
  }

  return {
    pointers, docs, sync, localOf, localIdOf, membersOf, makeGroup, join, leave, stopSharing, setRole, announce,
    unreadOf, markRead, useLive, vote, rsvp, setStatus, send, reconcile,
  }
})
