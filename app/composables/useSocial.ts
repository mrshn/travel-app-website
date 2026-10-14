import { createGlobalState, useOnline, watchDebounced } from '@vueuse/core'
import type { FeedItem, FriendCard, FriendRequest, Friendship, InboxItem, NewPost, PersonRef, Post, Profile } from '#shared/types/social'
import { socialAudience, socialCardTrips, socialOtherOf, socialTravelling, socialUrl } from '#shared/utils/social'
import { SocialError, type SocialBackend, type Unsub } from '~/lib/social/api'

/**
 * Where the social layer stands on this device:
 * - off: no account here (the landing page);
 * - signed-out: an account is remembered but its session is gone ("Sign in again to use friends and group trips");
 * - offline: no connection (screens show what they last had);
 * - loading: getting ready;
 * - ready: everything works;
 * - error: the backend couldn't start (`error` says why).
 */
export type SocialState = 'off' | 'signed-out' | 'offline' | 'loading' | 'ready' | 'error'

/** A friend as lists show them: their uid, their card if it was read, and when you became friends. */
export interface FriendView {
  uid: string
  profile: Profile | null
  since: number
}

/** What each account keeps on the device for reading offline (removed with the device's copy, useCloud.clearLocal). */
interface SocialCache {
  profile?: Profile | null
  people?: Record<string, Profile>
  friendships?: Friendship[]
  incoming?: FriendRequest[]
  outgoing?: FriendRequest[]
  inbox?: InboxItem[]
  feed?: FeedItem[]
  cards?: Record<string, FriendCard | null>
  myCard?: FriendCard | null
  friendToken?: string
  /** Friends this device already gave your recent posts to (spec 6.2). */
  shared?: string[]
}

const CACHE_PREFIX = 'travel:social:v1:'
/** New friendships get your recent posts when they're at most this old (a new device doesn't share them all again). */
const BACKFILL_MS = 7 * 86_400_000
/** Friends' cards are read again after this long. */
const CARD_TTL_MS = 10 * 60_000

function readCache(uid: string): SocialCache {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + uid)
    const v = raw ? JSON.parse(raw) as unknown : null
    return v && typeof v === 'object' ? v as SocialCache : {}
  }
  catch {
    return {}
  }
}

function writeCache(uid: string, c: SocialCache) {
  try {
    localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify(c))
  }
  catch { /* storage full or refused: the cache is only a convenience */ }
}

const asError = (e: unknown): SocialError => (e instanceof SocialError ? e : new SocialError('unknown', String((e as Error)?.message ?? e)))

/**
 * The social layer for the account on this device (docs/design/2026-10-14-together.md): the backend acting for it,
 * your profile, friends, friend requests, activity and friends' cards, kept live while ready and on the device for
 * offline reading. Screens call `api()` for anything else the backend does (api.ts is the contract).
 */
export const useSocial = createGlobalState(() => {
  const cloud = useCloud()
  const online = useOnline()
  const copy = useCopyEpoch()
  const memoryMode = useRuntimeConfig().public.socialBackend === 'memory'

  /** Who you are to Google (memory builds: the remembered account). */
  const signedInAs = computed<PersonRef | null>(() => {
    const u = memoryMode ? cloud.account.value : cloud.user.value
    if (!u) return null
    return { uid: u.uid, name: u.name || u.email.split('@')[0] || 'Traveller', photo: u.photo ?? null }
  })

  const backend = shallowRef<SocialBackend | null>(null)
  const error = ref('')
  const profile = ref<Profile | null>(null)

  /** You as others see you: your profile's name and photo, else Google's. */
  const me = computed<PersonRef | null>(() => {
    const g = signedInAs.value
    if (!g) return null
    const p = profile.value?.uid === g.uid ? profile.value : null
    return { uid: g.uid, name: p?.name || g.name, photo: p ? (p.photo ?? null) : g.photo }
  })

  const state = computed<SocialState>(() => {
    if (!signedInAs.value) return cloud.account.value ? 'signed-out' : 'off'
    if (!online.value) return 'offline'
    if (error.value) return 'error'
    return backend.value ? 'ready' : 'loading'
  })
  const ready = computed(() => state.value === 'ready')

  /** The backend, or a SocialError saying why there is none ('auth' signed out, 'offline', 'unknown'). */
  function api(): SocialBackend {
    const b = backend.value
    if (b && ready.value) return b
    if (!signedInAs.value) throw new SocialError('auth', 'Sign in to use friends and group trips.')
    if (!online.value) throw new SocialError('offline', 'You’re offline.')
    throw new SocialError('unknown', error.value || 'Still getting ready. Try again in a moment.')
  }

  async function makeBackend(person: PersonRef | null): Promise<SocialBackend> {
    if (memoryMode) return (await import('~/lib/social/memory')).createMemoryBackend(person)
    const fb = await cloud.firebase()
    if (!fb) throw new SocialError('offline', 'Couldn’t reach the cloud.')
    return (await import('~/lib/social/firestore')).createFirestoreBackend(fb, person)
  }

  // ---------- the backend for the account ----------
  let madeFor: string | null = null
  let making = 0
  async function rebuild() {
    const person = me.value
    const uid = person?.uid ?? null
    if (uid === madeFor && (backend.value || !uid)) return
    const turn = ++making
    backend.value?.close()
    backend.value = null
    madeFor = uid
    error.value = ''
    loadCache(uid)
    if (!uid || !person) return
    try {
      const b = await makeBackend(person)
      if (turn !== making) {
        b.close()
        return
      }
      backend.value = b
    }
    catch (e) {
      if (turn === making) error.value = asError(e).message
    }
  }
  watch(() => signedInAs.value?.uid ?? null, () => void rebuild(), { immediate: true })
  // Another account's copy left the device: start again from nothing.
  watch(copy, () => {
    madeFor = null
    void rebuild()
  })
  // A failed start is tried again when the connection comes back.
  watch(online, (on) => {
    if (on && error.value) {
      madeFor = null
      void rebuild()
    }
  })
  watch(() => [me.value?.name, me.value?.photo] as const, () => {
    const m = me.value
    if (m && backend.value?.me?.uid === m.uid) backend.value.setMe({ name: m.name, photo: m.photo })
  })

  // ---------- live lists ----------
  const friendships = ref<Friendship[]>([])
  const incoming = ref<FriendRequest[]>([])
  const outgoing = ref<FriendRequest[]>([])
  const inbox = ref<InboxItem[]>([])
  const people = ref<Record<string, Profile>>({})
  const cards = ref<Record<string, FriendCard | null>>({})
  const myCard = ref<FriendCard | null>(null)
  const feed = ref<FeedItem[]>([])
  const friendToken = ref('')
  let shared: string[] = []
  const cardsReadAt = new Map<string, number>()

  function loadCache(uid: string | null) {
    const c = uid ? readCache(uid) : {}
    profile.value = c.profile ?? null
    people.value = c.people ?? {}
    friendships.value = c.friendships ?? []
    incoming.value = c.incoming ?? []
    outgoing.value = c.outgoing ?? []
    inbox.value = c.inbox ?? []
    feed.value = c.feed ?? []
    cards.value = c.cards ?? {}
    myCard.value = c.myCard ?? null
    friendToken.value = c.friendToken ?? ''
    shared = c.shared ?? []
    cardsReadAt.clear()
  }

  watchDebounced([profile, people, friendships, incoming, outgoing, inbox, feed, cards, myCard, friendToken], () => {
    const uid = madeFor
    if (!uid) return
    writeCache(uid, {
      profile: profile.value,
      people: people.value,
      friendships: friendships.value,
      incoming: incoming.value,
      outgoing: outgoing.value,
      inbox: inbox.value.slice(0, 50),
      feed: feed.value.slice(0, 20),
      cards: cards.value,
      myCard: myCard.value,
      friendToken: friendToken.value,
      shared,
    })
  }, { deep: true, debounce: 500, maxWait: 3000 })

  let subs: Unsub[] = []
  /** A live list stopped at an error: start them again when the connection comes back. */
  let liveStopped = false
  function stopLive() {
    for (const u of subs) u()
    subs = []
  }
  function onLiveError(e: SocialError) {
    liveStopped = true
    if (e.code !== 'offline') console.warn('[social]', e.code, e.message)
  }

  async function startLive(b: SocialBackend | null) {
    stopLive()
    liveStopped = false
    if (!b?.me) return
    const uid = b.me.uid
    subs.push(b.watchFriends((list) => {
      friendships.value = list
      void backfill(b, list)
      void loadPeople(list.map(f => socialOtherOf(f.members, uid)))
    }, onLiveError))
    subs.push(b.watchRequests((inc, out) => {
      incoming.value = inc
      outgoing.value = out
      void loadPeople([...inc.map(r => r.from), ...out.map(r => r.to)])
    }, onLiveError))
    subs.push(b.watchInbox(50, (items) => {
      inbox.value = items
    }, onLiveError))
    try {
      let p = await b.getProfile(uid)
      if (!p) p = await b.saveProfile({ name: b.me.name, photo: b.me.photo })
      if (backend.value === b) profile.value = p
      const card = await b.getCard(uid).catch(() => null)
      if (backend.value === b) myCard.value = card
    }
    catch (e) {
      onLiveError(asError(e))
    }
  }
  watch(backend, b => void startLive(b))
  watch(online, (on) => {
    if (on && liveStopped && backend.value) void startLive(backend.value)
  })

  /** A new friend gets your recent posts (spec 6.2), once per device and pair, for friendships of the last week. */
  async function backfill(b: SocialBackend, list: Friendship[]) {
    const uid = b.me!.uid
    for (const f of list) {
      const other = socialOtherOf(f.members, uid)
      if (!other || shared.includes(f.id) || Date.now() - f.createdAt > BACKFILL_MS) continue
      shared = [...shared, f.id]
      try {
        await b.shareRecentPostsWith(other)
      }
      catch (e) {
        shared = shared.filter(x => x !== f.id)
        onLiveError(asError(e))
      }
    }
  }

  // ---------- people ----------
  const asking = new Map<string, Promise<Profile | null>>()
  /** Someone's public card: from memory, else read once (null when it can't be read). */
  function person(uid: string): Promise<Profile | null> {
    const have = people.value[uid]
    if (have) return Promise.resolve(have)
    const b = backend.value
    if (!b || !ready.value) return Promise.resolve(null)
    let p = asking.get(uid)
    if (!p) {
      p = b.getProfile(uid).then((x) => {
        if (x) people.value = { ...people.value, [uid]: x }
        return x
      }, () => null).finally(() => asking.delete(uid))
      asking.set(uid, p)
    }
    return p
  }
  async function loadPeople(uids: string[]) {
    await Promise.all([...new Set(uids)].filter(Boolean).map(u => person(u)))
  }
  /** A name and photo for someone, from what's known (their card, else a fallback you give). */
  function personRef(uid: string, fallback?: Partial<PersonRef>): PersonRef {
    if (uid === me.value?.uid) return me.value
    const p = people.value[uid]
    return { uid, name: p?.name ?? fallback?.name ?? 'Someone', photo: p ? (p.photo ?? null) : (fallback?.photo ?? null) }
  }

  const friends = computed<FriendView[]>(() => {
    const uid = me.value?.uid
    if (!uid) return []
    return friendships.value
      .map(f => ({ uid: socialOtherOf(f.members, uid), profile: people.value[socialOtherOf(f.members, uid)] ?? null, since: f.createdAt }))
      .filter(f => f.uid)
      .sort((a, b) => (a.profile?.name ?? '').localeCompare(b.profile?.name ?? ''))
  })
  const friendIds = computed(() => friends.value.map(f => f.uid))
  const isFriend = (uid: string) => friendIds.value.includes(uid)

  /** Unread activity plus friend requests waiting for you: the dot on Friends. */
  const unread = computed(() => inbox.value.filter(i => !i.read).length)
  const badge = computed(() => unread.value + incoming.value.length)

  // ---------- your profile ----------
  async function saveProfile(patch: Partial<Pick<Profile, 'name' | 'photo' | 'bio' | 'homeCity'>>): Promise<Profile> {
    const p = await api().saveProfile(patch)
    profile.value = p
    return p
  }
  async function claimHandle(handle: string | null): Promise<'ok' | 'taken' | 'invalid'> {
    const b = api()
    const r = await b.claimHandle(handle)
    if (r === 'ok' && b.me) profile.value = await b.getProfile(b.me.uid)
    return r
  }

  // ---------- your trips, for friends ----------
  const trips = useTrips()
  const today = () => new Date().toISOString().slice(0, 10)
  async function setShowTrips(on: boolean) {
    const card = { showTrips: on, trips: on ? socialCardTrips(trips.trips.value, today()) : [] }
    await api().saveCard(card)
    myCard.value = { uid: me.value!.uid, ...card, updatedAt: Date.now() }
  }
  // While friends may see your trips, the card follows them.
  watchDebounced([() => trips.trips.value, ready], async () => {
    const c = myCard.value
    if (!ready.value || !c?.showTrips) return
    const next = socialCardTrips(trips.trips.value, today())
    if (JSON.stringify(next) === JSON.stringify(c.trips)) return
    try {
      await api().saveCard({ showTrips: true, trips: next })
      myCard.value = { ...c, trips: next, updatedAt: Date.now() }
    }
    catch (e) {
      onLiveError(asError(e))
    }
  }, { deep: true, debounce: 2000 })

  /** Friends' cards (who shares their trips), read again after 10 minutes. */
  async function loadCards(force = false) {
    const b = backend.value
    if (!b || !ready.value) return
    const now = Date.now()
    await Promise.all(friendIds.value.map(async (uid) => {
      if (!force && now - (cardsReadAt.get(uid) ?? 0) < CARD_TTL_MS && uid in cards.value) return
      cardsReadAt.set(uid, now)
      try {
        const c = await b.getCard(uid)
        cards.value = { ...cards.value, [uid]: c }
      }
      catch { /* not readable now: keep what we had */ }
    }))
  }
  const travelling = computed(() => socialTravelling(
    Object.values(cards.value).filter((c): c is FriendCard => !!c && friendIds.value.includes(c.uid)),
    today(),
  ))

  // ---------- links ----------
  /** Where the app lives, for links people open elsewhere. */
  function appBase(): string {
    return `${location.origin}${useRuntimeConfig().app.baseURL || '/'}`
  }
  /** A full link for an app path ("/m/abc" → "https://…/m/abc"). */
  const link = (path: string) => socialUrl(path, appBase())

  /** Your friend link's token: the one you have, or a new one. */
  async function friendLinkToken(): Promise<string> {
    const b = api()
    if (friendToken.value) {
      const inv = await b.getInvite(friendToken.value).catch(() => null)
      if (inv && !inv.revoked && inv.from === b.me?.uid) return friendToken.value
    }
    const mine = (await b.myInvites()).find(i => i.kind === 'friend' && !i.revoked)
    const inv = mine ?? await b.createInvite({ kind: 'friend' })
    friendToken.value = inv.token
    return inv.token
  }
  /** Resets your friend link (the old one stops working) and makes a new one. */
  async function resetFriendLink(): Promise<string> {
    const b = api()
    for (const i of (await b.myInvites()).filter(x => x.kind === 'friend' && !x.revoked)) await b.revokeInvite(i.token)
    friendToken.value = ''
    return friendLinkToken()
  }

  // ---------- doing things ----------
  /** Posts to your friends (and you). */
  async function post(p: NewPost): Promise<Post> {
    const b = api()
    return b.createPost(p, socialAudience(b.me!.uid, friendIds.value))
  }
  /** Becomes friends from someone's link, and tells them. */
  async function addFriend(token: string): Promise<Friendship> {
    const b = api()
    const f = await b.addFriendByInvite(token)
    const other = socialOtherOf(f.members, b.me!.uid)
    if (other) void b.notify(other, { kind: 'friend-accepted', text: 'added you as a friend', link: '/friends?tab=friends' }).catch(onLiveError)
    return f
  }
  async function acceptRequest(req: FriendRequest): Promise<Friendship> {
    const b = api()
    const f = await b.acceptRequest(req)
    void b.notify(req.from, { kind: 'friend-accepted', text: 'accepted your friend request', link: '/friends?tab=friends' }).catch(onLiveError)
    return f
  }

  // ---------- the feed, live while a screen shows it ----------
  let feedUsers = 0
  let feedUnsub: Unsub | null = null
  const feedLimit = ref(20)
  function startFeed() {
    feedUnsub?.()
    feedUnsub = null
    const b = backend.value
    if (!b || !ready.value || !feedUsers) return
    feedUnsub = b.watchFeed(feedLimit.value, (items) => {
      feed.value = items
    }, onLiveError)
  }
  watch([backend, ready, feedLimit], startFeed)
  /** Call in a screen's setup that shows the feed: it stays live while such a screen is mounted. */
  function useFeed() {
    onMounted(() => {
      feedUsers++
      if (feedUsers === 1) startFeed()
    })
    onBeforeUnmount(() => {
      feedUsers = Math.max(0, feedUsers - 1)
      if (!feedUsers) {
        feedUnsub?.()
        feedUnsub = null
      }
    })
    return { feed, more: () => (feedLimit.value += 20), limit: feedLimit }
  }

  // ---------- reading links signed out ----------
  let publicBackend: Promise<SocialBackend> | null = null
  /** A backend for the public reads of a link (invite, meetup, plan link): yours when ready, else one for nobody. */
  function publicApi(): Promise<SocialBackend> {
    if (backend.value && ready.value) return Promise.resolve(backend.value)
    publicBackend ??= makeBackend(null).catch((e) => {
      publicBackend = null
      throw asError(e)
    })
    return publicBackend
  }

  return {
    state, ready, error, me, api, publicApi, profile, people, person, personRef, loadPeople, friends, friendIds, isFriend,
    friendships, incoming, outgoing, inbox, unread, badge, cards, loadCards, travelling, myCard, setShowTrips,
    saveProfile, claimHandle, link, friendLinkToken, resetFriendLink, post, addFriend, acceptRequest, useFeed, feed,
    /** Tests: the backend itself. */
    backend,
  }
})
