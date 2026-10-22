/**
 * The social layer's backend: one interface, two implementations.
 *   firestore.ts  the real one (Firestore + Cloud Storage, guarded by firebase/firestore.rules)
 *   memory.ts     a stand-in kept in the browser, for browser checks (NUXT_PUBLIC_SOCIAL_BACKEND=memory)
 * Both behave the same way, rules included, as described here and in docs/design/2026-10-14-together.md (section 6).
 *
 * A backend is made for one signed-in person (`me`), or for nobody (me = null): then only the public reads work
 * (getInvite, getMeetup, watchMeetup, getShare) and everything else rejects with SocialError 'auth'.
 *
 * Errors: every method rejects with a SocialError, never anything else. Subscriptions (watch*) call `onError` and stop.
 * Times are milliseconds from the device (Date.now()).
 */
import type {
  Comment, FeedItem, FriendCard, FriendRequest, Friendship, GroupPointer, GroupTripDoc, InboxItem, Invite, Meetup,
  MeetupGoing, MemberStatus, Message, NewMessage, NewPost, PersonRef, Post, Profile, Role, Rsvp, Share, Vote, Going,
} from '#shared/types/social'

export type Unsub = () => void

export type SocialErrorCode =
  | 'auth' // needs a signed-in account (or this account isn't allowed: the rules said no)
  | 'not-found' // no such thing, or it was removed or reset
  | 'denied' // not allowed: not a member, not yours, not a friend
  | 'taken' // a handle someone else has
  | 'invalid' // bad input (too long, wrong shape)
  | 'offline' // no connection
  | 'conflict' // someone else changed it first (writeGroupJson returns false instead)
  | 'unknown'

export class SocialError extends Error {
  constructor(public code: SocialErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'SocialError'
  }
}

export type OnError = (e: SocialError) => void

/** A new group trip, as its maker writes it (createGroup adds createdAt and the maker as owner). */
export interface NewGroup {
  /** socialToken(): the plan's JSON already carries it as its id. */
  id: string
  title: string
  destination: string
  start: string
  end: string
  cover: GroupTripDoc['cover']
  json: string
  updatedAt: number
}

/** What a group trip's plan write also updates, so lists and invites stay right without reading the plan. */
export interface GroupMeta {
  title: string
  destination: string
  start: string
  end: string
  cover: GroupTripDoc['cover']
}

export interface NewMeetup {
  title: string
  note: string
  place: Meetup['place']
  start: string
  timezone: string
  destination?: string
  tripTitle?: string
}

export interface NewShare {
  title: string
  destination: string
  start: string
  end: string
  cover: Share['cover']
  days: number
  json: string
}

export interface SocialBackend {
  readonly kind: 'firestore' | 'memory'
  /** Who this backend acts for (null: public reads only). */
  readonly me: PersonRef | null
  /** Your name or photo changed (your profile): what you write from now on carries them. The uid never changes. */
  setMe(p: Pick<PersonRef, 'name' | 'photo'>): void

  // ---------- profiles ----------
  /** Anyone's public card (signed in), or null. */
  getProfile(uid: string): Promise<Profile | null>
  /** Writes your own card (name, photo, bio, homeCity; never `handle`: claimHandle does that). Creates it when missing. */
  saveProfile(p: Partial<Omit<Profile, 'uid' | 'handle' | 'updatedAt'>>): Promise<Profile>
  /**
   * Takes a handle (lower case, 3 to 20 of a-z 0-9 _ .): 'taken' when someone else has it, 'invalid' when malformed.
   * Gives up your old one. null removes yours.
   */
  claimHandle(handle: string | null): Promise<'ok' | 'taken' | 'invalid'>
  /** Whose handle this is (exact, without "@"), or null. */
  findHandle(handle: string): Promise<Profile | null>

  // ---------- your trips, for friends ----------
  saveCard(card: Omit<FriendCard, 'uid' | 'updatedAt'>): Promise<void>
  /** A friend's card (or yours). 'denied' for someone who isn't your friend. */
  getCard(uid: string): Promise<FriendCard | null>

  // ---------- invite links ----------
  /** A new invite from you. Trip invites need you to be owner or editor of that group trip. */
  createInvite(inv: Omit<Invite, 'token' | 'createdAt' | 'from' | 'fromName' | 'fromPhoto' | 'revoked'>): Promise<Invite>
  /** Anyone (even signed out) can read an invite by its token; null when there's none. A reset one comes back with revoked. */
  getInvite(token: string): Promise<Invite | null>
  /** Resets one of your links: it stops working. */
  revokeInvite(token: string): Promise<void>
  /** Your invites that still work, newest first. */
  myInvites(): Promise<Invite[]>

  // ---------- friends ----------
  /** Your friendships, live. */
  watchFriends(cb: (list: Friendship[]) => void, onError?: OnError): Unsub
  /** Becomes friends with whoever made this friend invite. 'not-found' when reset; your own link is 'invalid'. */
  addFriendByInvite(token: string): Promise<Friendship>
  /** Asks someone to be friends (and tells them in their inbox). Already friends: nothing happens. */
  sendRequest(to: PersonRef): Promise<void>
  /** Requests to you and from you, live. */
  watchRequests(cb: (incoming: FriendRequest[], outgoing: FriendRequest[]) => void, onError?: OnError): Unsub
  acceptRequest(req: FriendRequest): Promise<Friendship>
  /** Declines a request to you, or takes back one of yours. */
  dropRequest(req: FriendRequest): Promise<void>
  /** Stops being friends: your posts leave their feed and theirs leave yours. */
  unfriend(uid: string): Promise<void>

  // ---------- posts and the feed ----------
  /** Posts to you and `audience` (your friends' uids): the post, and a copy in each feed. */
  createPost(p: NewPost, audience: string[]): Promise<Post>
  /** Deletes one of your posts, everywhere. */
  deletePost(id: string): Promise<void>
  /** Your feed (yours and friends' posts), newest first, at most `limit`, live. */
  watchFeed(limit: number, cb: (items: FeedItem[]) => void, onError?: OnError): Unsub
  /** A post you may read (with its likes), live; null when it's gone. */
  watchPost(id: string, cb: (post: Post | null) => void, onError?: OnError): Unsub
  setLike(id: string, on: boolean): Promise<void>
  watchComments(postId: string, cb: (list: Comment[]) => void, onError?: OnError): Unsub
  countComments(postId: string): Promise<number>
  addComment(postId: string, text: string): Promise<Comment>
  /** Deletes a comment of yours, or any comment on your post. */
  deleteComment(postId: string, id: string): Promise<void>
  /** A new friend gets your recent posts (at most `limit`) in their feed, and may read them. */
  shareRecentPostsWith(uid: string, limit?: number): Promise<void>

  // ---------- inbox ----------
  watchInbox(limit: number, cb: (items: InboxItem[]) => void, onError?: OnError): Unsub
  /** Tells someone something (from you). Allowed for friends, people in a group trip with you, a meetup's host and requests. */
  notify(to: string, item: Omit<InboxItem, 'id' | 'from' | 'fromName' | 'fromPhoto' | 'at' | 'read'>): Promise<void>
  markRead(ids: string[]): Promise<void>
  removeInbox(ids: string[]): Promise<void>

  // ---------- photos ----------
  /** Uploads a photo anyone with its URL can see (posts, chat): resolves to that URL. At most 4 MB, an image. */
  uploadPublicPhoto(blob: Blob): Promise<string>

  // ---------- group trips ----------
  /** Makes a group trip with you as its owner; resolves to its id. (Your pointer to it is useGroups' to write.) */
  createGroup(g: NewGroup): Promise<string>
  /** Your group trips (the pointers), live. */
  watchPointers(cb: (list: GroupPointer[]) => void, onError?: OnError): Unsub
  savePointer(p: GroupPointer): Promise<void>
  deletePointer(gid: string): Promise<void>
  /**
   * A group trip, live. cb(null) when it's gone or you're not in it any more (removed, left, deleted); the
   * subscription then stops. Network trouble is onError('offline') and the caller may watch again later.
   */
  watchGroup(gid: string, cb: (doc: GroupTripDoc | null) => void, onError?: OnError): Unsub
  /**
   * Writes the plan if the cloud still has version `basis` (its updatedAt): true when written, false when someone
   * else wrote first (wait for the next snapshot). Owners and editors only ('denied' for viewers).
   */
  writeGroupJson(gid: string, json: string, updatedAt: number, basis: number, meta: GroupMeta): Promise<boolean>
  /** Joins with a trip invite: adds you with the invite's role. Already in it: nothing happens. */
  joinGroup(token: string): Promise<GroupTripDoc>
  /** Leaves a group trip (not its owner: the owner deletes it instead). */
  leaveGroup(gid: string): Promise<void>
  /** Owner only: changes someone's role, or removes them (null). */
  setRole(gid: string, uid: string, role: Exclude<Role, 'owner'> | null): Promise<void>
  /** Owner only: deletes the group trip and what was said and decided in it. */
  deleteGroup(gid: string): Promise<void>
  /** Your own name and photo in a group trip you're in. */
  updateMe(gid: string): Promise<void>

  watchMessages(gid: string, limit: number, cb: (list: Message[]) => void, onError?: OnError): Unsub
  sendMessage(gid: string, m: NewMessage): Promise<Message>
  deleteMessage(gid: string, id: string): Promise<void>
  watchVotes(gid: string, cb: (list: Vote[]) => void, onError?: OnError): Unsub
  /** Your vote for an option stop; null takes it back. */
  setVote(gid: string, stopId: string, choiceId: string | null): Promise<void>
  watchRsvps(gid: string, cb: (list: Rsvp[]) => void, onError?: OnError): Unsub
  setRsvp(gid: string, stopId: string, going: Going | null): Promise<void>
  watchStatuses(gid: string, cb: (list: MemberStatus[]) => void, onError?: OnError): Unsub
  setStatus(gid: string, s: Omit<MemberStatus, 'uid' | 'at'> | null): Promise<void>

  // ---------- meetups ----------
  createMeetup(m: NewMeetup): Promise<Meetup>
  updateMeetup(id: string, patch: Partial<NewMeetup> & { cancelled?: boolean }): Promise<void>
  /** Anyone (even signed out) can read a meetup by its id. */
  getMeetup(id: string): Promise<Meetup | null>
  watchMeetup(id: string, cb: (m: Meetup | null) => void, onError?: OnError): Unsub
  /** Your meetups, newest first. */
  myMeetups(): Promise<Meetup[]>
  /** Who's going (signed in only), live. */
  watchGoing(id: string, cb: (list: MeetupGoing[]) => void, onError?: OnError): Unsub
  setGoing(id: string, on: boolean): Promise<void>

  // ---------- plan links ----------
  createShare(s: NewShare): Promise<Share>
  /** Anyone (even signed out) can read a plan link; a removed one comes back with revoked (and no plan). */
  getShare(id: string): Promise<Share | null>
  /** Removes one of your plan links: it stops working. */
  revokeShare(id: string): Promise<void>
  /** Your plan links that still work, newest first. */
  myShares(): Promise<Share[]>

  /** Stops every subscription of this backend (signing out, another account). */
  close(): void
}

/** A backend acting for `me` (or for nobody). */
export type SocialBackendFactory = (me: PersonRef | null) => SocialBackend
