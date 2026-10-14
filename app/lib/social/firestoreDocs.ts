/**
 * The documents the Firestore backend (firestore.ts) writes, built field by field: each holds only fields that
 * firebase/firestore.rules accepts for it (its `<name>Fields()` list there) and every field the rules need (its
 * `<name>Needs()` list), with nothing undefined in it, as Firestore refuses undefined. tests/socialcloud.test.ts compares
 * these lists with the rules. Also the error mapping and small helpers. Pure: nothing here talks to Firebase.
 */
import type {
  CardTrip, Comment, FeedItem, FriendCard, FriendRequest, Friendship, Going, GroupPointer, GroupTripDoc, InboxItem, Invite,
  Meetup, MeetupGoing, MemberStatus, Message, NewMessage, NewPost, PersonRef, Post, PostPlace, PostTrip, Profile, Rsvp, Share, Vote,
} from '#shared/types/social'
import type { Scene, Tod } from '#shared/types/trip'
import { SocialError, type GroupMeta, type NewGroup, type NewMeetup, type NewShare } from './api'

/** The fields each document may hold (the rules' `<name>Fields()` lists, in the same order). */
export const FIELDS = {
  profile: ['uid', 'name', 'photo', 'handle', 'bio', 'homeCity', 'updatedAt'],
  card: ['uid', 'showTrips', 'trips', 'updatedAt'],
  invite: ['token', 'kind', 'from', 'fromName', 'fromPhoto', 'createdAt', 'revoked', 'trip', 'role', 'tripTitle', 'tripDestination', 'tripStart', 'tripEnd', 'tripCover'],
  friendship: ['id', 'members', 'via', 'createdAt'],
  request: ['id', 'from', 'to', 'fromName', 'fromPhoto', 'at'],
  post: ['id', 'kind', 'text', 'photo', 'trip', 'place', 'link', 'recap', 'author', 'authorName', 'authorPhoto', 'audience', 'likes', 'at'],
  feed: ['id', 'kind', 'text', 'photo', 'trip', 'place', 'link', 'recap', 'author', 'authorName', 'authorPhoto', 'at'],
  postTrip: ['title', 'destination', 'start', 'end'],
  postPlace: ['name', 'lat', 'lng'],
  comment: ['id', 'post', 'author', 'name', 'photo', 'text', 'at'],
  inbox: ['id', 'kind', 'from', 'fromName', 'fromPhoto', 'text', 'link', 'ref', 'at', 'read'],
  pointer: ['gid', 'localId', 'role', 'title', 'at'],
  group: ['id', 'owner', 'roles', 'people', 'title', 'destination', 'start', 'end', 'cover', 'json', 'updatedAt', 'createdAt', 'joinedVia'],
  person: ['name', 'photo'],
  scene: ['scene', 'tod'],
  message: ['id', 'kind', 'text', 'image', 'stopId', 'stopTitle', 'stopWhen', 'place', 'author', 'name', 'photo', 'at'],
  pin: ['lat', 'lng', 'acc', 'name'],
  vote: ['stopId', 'uid', 'choiceId', 'at'],
  rsvp: ['stopId', 'uid', 'going', 'at'],
  status: ['uid', 'kind', 'text', 'stopId', 'place', 'at'],
  meetup: ['id', 'host', 'hostName', 'hostPhoto', 'title', 'note', 'place', 'start', 'timezone', 'destination', 'tripTitle', 'createdAt', 'updatedAt', 'cancelled'],
  meetupPlace: ['name', 'lat', 'lng', 'query'],
  going: ['uid', 'name', 'photo', 'at'],
  share: ['id', 'owner', 'ownerName', 'ownerPhoto', 'title', 'destination', 'start', 'end', 'cover', 'days', 'json', 'createdAt', 'revoked'],
} as const

/** The fields each document must hold (the rules' `<name>Needs()` lists; documents without one need them all). */
export const NEEDS = {
  profile: ['uid', 'name', 'photo', 'updatedAt'],
  invite: ['token', 'kind', 'from', 'fromName', 'fromPhoto', 'createdAt'],
  post: ['id', 'kind', 'text', 'author', 'authorName', 'authorPhoto', 'audience', 'likes', 'at'],
  feed: ['id', 'kind', 'text', 'author', 'authorName', 'authorPhoto', 'at'],
  postTrip: ['title', 'destination'],
  postPlace: ['name'],
  inbox: ['id', 'kind', 'from', 'fromName', 'fromPhoto', 'text', 'at'],
  group: ['id', 'owner', 'roles', 'people', 'title', 'destination', 'start', 'end', 'cover', 'json', 'updatedAt', 'createdAt'],
  message: ['id', 'kind', 'text', 'author', 'name', 'photo', 'at'],
  pin: ['lat', 'lng'],
  status: ['uid', 'kind', 'text', 'at'],
  meetup: ['id', 'host', 'hostName', 'hostPhoto', 'title', 'note', 'place', 'start', 'timezone', 'createdAt', 'updatedAt'],
  meetupPlace: ['name'],
  share: ['id', 'owner', 'ownerName', 'ownerPhoto', 'title', 'destination', 'start', 'end', 'cover', 'days', 'json', 'createdAt'],
} as const

/** Writes per batch: each copy in a friend's feed costs the rules one exists(), and a batch may make 20 (spec 6.1). */
export const BATCH_WRITES = 10
/** The largest photo uploadPublicPhoto takes (storage.rules says the same). */
export const MAX_PUBLIC_PHOTO = 4 * 1024 * 1024
/** The largest plan a group trip or a plan link holds, in characters (the rules say the same). */
export const MAX_PLAN_JSON = 1_000_000

// ---------- small helpers ----------

/** A document id Firestore takes: no "/", not "." or "..", not "__…__", and not absurdly long. */
export function idOk(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 700 && !id.includes('/') && id !== '.' && id !== '..' && !/^__.*__$/.test(id)
}

/** A string longer than `max` (anything else is not too long: the checks of memory.ts). */
export const tooLong = (s: unknown, max: number) => typeof s === 'string' && s.length > max

/** `list` in pieces of at most `size`. */
export function chunks<T>(list: readonly T[], size = BATCH_WRITES): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

const text = (v: unknown): string => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v))
const optText = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)
/** A non-empty string (an empty photo or image link means none). */
const optLink = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
const optNum = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const photoOf = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

/** `o` without its undefined fields (Firestore refuses them), one level deep: nested objects are built clean. */
function defined<T extends object>(o: T): T {
  const out = {} as T
  for (const [k, v] of Object.entries(o)) if (v !== undefined) (out as Record<string, unknown>)[k] = v
  return out
}

// ---------- what each document holds ----------

export function sceneOf(c: unknown): Scene {
  const s = (c && typeof c === 'object' ? c : {}) as Partial<Scene>
  return { scene: text(s.scene), tod: text(s.tod) as Tod }
}

export function personOf(p: Pick<PersonRef, 'name' | 'photo'>): { name: string, photo: string | null } {
  return { name: text(p.name), photo: photoOf(p.photo) }
}

/** Your profile after a change, as memory.ts makes it (saveProfile). */
export function nextProfile(cur: Profile | null, p: Partial<Omit<Profile, 'uid' | 'handle' | 'updatedAt'>>, me: PersonRef, at: number): Profile {
  return {
    uid: me.uid,
    name: (p.name ?? cur?.name ?? me.name).trim() || 'Traveller',
    photo: p.photo !== undefined ? p.photo : (cur?.photo ?? me.photo),
    ...(cur?.handle ? { handle: cur.handle } : {}),
    ...((p.bio ?? cur?.bio) ? { bio: p.bio ?? cur?.bio } : {}),
    ...((p.homeCity ?? cur?.homeCity) ? { homeCity: p.homeCity ?? cur?.homeCity } : {}),
    updatedAt: at,
  }
}

export function profileDoc(p: Profile): Profile {
  return defined({
    uid: p.uid,
    name: text(p.name),
    photo: photoOf(p.photo),
    handle: optLink(p.handle),
    bio: optText(p.bio),
    homeCity: optText(p.homeCity),
    updatedAt: p.updatedAt,
  })
}

function cardTripOf(t: CardTrip): CardTrip {
  return defined({
    title: text(t.title),
    destination: text(t.destination),
    country: optText(t.country),
    start: text(t.start),
    end: text(t.end),
    cover: t.cover ? sceneOf(t.cover) : undefined,
  })
}

export function cardDoc(uid: string, card: Pick<FriendCard, 'showTrips' | 'trips'>, at: number): FriendCard {
  const showTrips = !!card.showTrips
  return { uid, showTrips, trips: showTrips ? (card.trips ?? []).map(cardTripOf) : [], updatedAt: at }
}

export type InviteDraft = Omit<Invite, 'token' | 'createdAt' | 'from' | 'fromName' | 'fromPhoto' | 'revoked'>

/** A new invite. A friend invite holds nothing about a trip. */
export function inviteDoc(inv: InviteDraft, token: string, from: PersonRef, at: number): Invite {
  const base: Invite = { token, kind: inv.kind, from: from.uid, fromName: text(from.name), fromPhoto: photoOf(from.photo), createdAt: at }
  if (inv.kind !== 'trip') return base
  return defined({
    ...base,
    trip: optText(inv.trip),
    role: inv.role,
    tripTitle: optText(inv.tripTitle),
    tripDestination: optText(inv.tripDestination),
    tripStart: optText(inv.tripStart),
    tripEnd: optText(inv.tripEnd),
    tripCover: inv.tripCover ? sceneOf(inv.tripCover) : undefined,
  })
}

/** A friendship of `a` and `b`: its id and members sorted the same way as socialPairId. */
export function friendshipDoc(a: string, b: string, via: string, at: number): Friendship {
  const members = (a < b ? [a, b] : [b, a]) as [string, string]
  return { id: `${members[0]}_${members[1]}`, members, via, createdAt: at }
}

export function requestDoc(from: PersonRef, to: string, at: number): FriendRequest {
  return { id: `${from.uid}_${to}`, from: from.uid, to, fromName: text(from.name), fromPhoto: photoOf(from.photo), at }
}

function postTripOf(t: PostTrip): PostTrip {
  return defined({ title: text(t.title), destination: text(t.destination), start: optText(t.start), end: optText(t.end) })
}

function postPlaceOf(p: PostPlace): PostPlace {
  return defined({ name: text(p.name), lat: optNum(p.lat), lng: optNum(p.lng) })
}

/** What a post says: the fields a post and its feed copies share. */
function postBody(p: NewPost) {
  return {
    kind: p.kind,
    text: text(p.text),
    photo: optLink(p.photo),
    trip: p.trip ? postTripOf(p.trip) : undefined,
    place: p.place ? postPlaceOf(p.place) : undefined,
    link: optText(p.link),
    recap: optText(p.recap),
  }
}

export function postDoc(p: NewPost, id: string, author: PersonRef, audience: string[], at: number): Post {
  return defined({
    id,
    ...postBody(p),
    author: author.uid,
    authorName: text(author.name),
    authorPhoto: photoOf(author.photo),
    audience: [...audience],
    likes: {},
    at,
  })
}

/** A post as it sits in a reader's feed: the post without who may read it and who liked it. */
export function feedDoc(p: Post): FeedItem {
  return defined({
    id: p.id,
    ...postBody(p),
    author: p.author,
    authorName: text(p.authorName),
    authorPhoto: photoOf(p.authorPhoto),
    at: p.at,
  })
}

export function commentDoc(post: string, id: string, author: PersonRef, body: string, at: number): Comment {
  return { id, post, author: author.uid, name: text(author.name), photo: photoOf(author.photo), text: body, at }
}

export type InboxDraft = Omit<InboxItem, 'id' | 'from' | 'fromName' | 'fromPhoto' | 'at' | 'read'>

export function inboxDoc(item: InboxDraft, id: string, from: PersonRef, at: number): InboxItem {
  return defined({
    id,
    kind: item.kind,
    from: from.uid,
    fromName: text(from.name),
    fromPhoto: photoOf(from.photo),
    text: text(item.text),
    link: optText(item.link),
    ref: optText(item.ref),
    at,
  })
}

export function pointerDoc(p: GroupPointer): GroupPointer {
  return { gid: p.gid, localId: text(p.localId), role: p.role, title: text(p.title), at: p.at }
}

/** What a plan write also updates (title, places and dates, the cover). */
export function groupMetaDoc(m: GroupMeta): GroupMeta {
  return { title: text(m.title), destination: text(m.destination), start: text(m.start), end: text(m.end), cover: sceneOf(m.cover) }
}

export function groupDoc(g: NewGroup, owner: PersonRef, at: number): GroupTripDoc {
  return {
    id: g.id,
    owner: owner.uid,
    roles: { [owner.uid]: 'owner' },
    people: { [owner.uid]: personOf(owner) },
    ...groupMetaDoc(g),
    json: text(g.json),
    updatedAt: g.updatedAt,
    createdAt: at,
  }
}

function pinOf(p: NonNullable<NewMessage['place']>): NonNullable<NewMessage['place']> {
  return defined({ lat: Number(p.lat), lng: Number(p.lng), acc: optNum(p.acc), name: optText(p.name) })
}

export function messageDoc(m: NewMessage, id: string, author: PersonRef, at: number): Message {
  return defined({
    id,
    kind: m.kind,
    text: text(m.text),
    image: optLink(m.image),
    stopId: optText(m.stopId),
    stopTitle: optText(m.stopTitle),
    stopWhen: optText(m.stopWhen),
    place: m.place ? pinOf(m.place) : undefined,
    author: author.uid,
    name: text(author.name),
    photo: photoOf(author.photo),
    at,
  })
}

export function voteDoc(stopId: string, uid: string, choiceId: string, at: number): Vote {
  return { stopId, uid, choiceId, at }
}

export function rsvpDoc(stopId: string, uid: string, going: Going, at: number): Rsvp {
  return { stopId, uid, going, at }
}

export function statusDoc(s: Omit<MemberStatus, 'uid' | 'at'>, uid: string, at: number): MemberStatus {
  return defined({
    uid,
    kind: s.kind,
    text: text(s.text),
    stopId: optText(s.stopId),
    place: s.place ? defined({ lat: Number(s.place.lat), lng: Number(s.place.lng), acc: optNum(s.place.acc) }) : undefined,
    at,
  })
}

function meetupPlaceOf(p: Meetup['place']): Meetup['place'] {
  if (!p) return null
  return defined({ name: text(p.name), lat: optNum(p.lat), lng: optNum(p.lng), query: optText(p.query) })
}

export function meetupDoc(m: NewMeetup, id: string, host: PersonRef, at: number): Meetup {
  return defined({
    id,
    host: host.uid,
    hostName: text(host.name),
    hostPhoto: photoOf(host.photo),
    title: text(m.title),
    note: text(m.note),
    place: meetupPlaceOf(m.place),
    start: text(m.start),
    timezone: text(m.timezone),
    destination: optText(m.destination),
    tripTitle: optText(m.tripTitle),
    createdAt: at,
    updatedAt: at,
  })
}

export type MeetupChange = Partial<NewMeetup> & { cancelled?: boolean }

/** A change to a meetup: the fields given (a field given as undefined stays as it is, as in memory.ts). */
export function meetupPatch(patch: MeetupChange): Record<string, unknown> {
  const set: Record<string, unknown> = {}
  for (const k of ['title', 'note', 'start', 'timezone', 'destination', 'tripTitle'] as const) {
    if (patch[k] !== undefined) set[k] = text(patch[k])
  }
  if (patch.place !== undefined) set.place = meetupPlaceOf(patch.place)
  if (patch.cancelled !== undefined) set.cancelled = !!patch.cancelled
  return set
}

export function goingDoc(p: PersonRef, at: number): MeetupGoing {
  return { uid: p.uid, name: text(p.name), photo: photoOf(p.photo), at }
}

export function shareDoc(s: NewShare, id: string, owner: PersonRef, at: number): Share {
  return {
    id,
    owner: owner.uid,
    ownerName: text(owner.name),
    ownerPhoto: photoOf(owner.photo),
    title: text(s.title),
    destination: text(s.destination),
    start: text(s.start),
    end: text(s.end),
    cover: sceneOf(s.cover),
    days: Math.max(0, Math.round(Number(s.days) || 0)),
    json: text(s.json),
    createdAt: at,
  }
}

// ---------- errors ----------

/** The code of a Firebase error ("permission-denied"; Storage's "storage/unauthorized" without its prefix), or ''. */
export function firebaseCode(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code
  return typeof code === 'string' ? code.replace(/^(?:firestore|storage)\//, '') : ''
}

/**
 * Whatever a call to Firebase threw, as a SocialError (api.ts): the rules saying no is 'denied' (or 'auth' with
 * nobody signed in), a missing document 'not-found', no connection 'offline', bad input 'invalid'.
 */
export function socialErrorOf(e: unknown, signedIn: boolean, offline = false): SocialError {
  if (e instanceof SocialError) return e
  const code = firebaseCode(e)
  const message = String((e as { message?: unknown } | null)?.message ?? e ?? '')
  switch (code) {
    case 'permission-denied':
    case 'unauthorized':
      return new SocialError(signedIn ? 'denied' : 'auth', message)
    case 'unauthenticated':
      return new SocialError('auth', message)
    case 'not-found':
    case 'object-not-found':
      return new SocialError('not-found', message)
    case 'unavailable':
    case 'deadline-exceeded':
    case 'retry-limit-exceeded':
      return new SocialError('offline', message)
    case 'failed-precondition':
      return new SocialError(offline || /offline|network|connect/i.test(message) ? 'offline' : 'unknown', message)
    case 'invalid-argument':
    case 'invalid-format':
      return new SocialError('invalid', message)
    default:
      return new SocialError(offline ? 'offline' : 'unknown', message)
  }
}
