/**
 * The social layer: friends, the feed, group trips, meetups and plan links (docs/design/2026-10-14-together.md).
 * Everything here lives in the cloud and needs a signed-in account; the trip companion itself keeps working offline.
 * Times are milliseconds (Date.now() of the device that wrote them), as in the sync items.
 */
import type { Scene, Trip } from './trip'

/** What a person can do in a group trip. Owner: everything; editor: change the plan; viewer: follow along and chat. */
export type Role = 'owner' | 'editor' | 'viewer'

/** Who someone is, as shown next to what they did (a name and a photo, never an email). */
export interface PersonRef {
  uid: string
  name: string
  /** A photo URL (Google's, or one uploaded), or null for initials. */
  photo: string | null
}

/** A person's public card: what any signed-in account sees (an invite, a meetup, a comment). */
export interface Profile extends PersonRef {
  /** Unique, lower case, 3 to 20 of a-z 0-9 _ . (handles/{handle} holds who has it). */
  handle?: string
  /** At most 160 characters. */
  bio?: string
  /** At most 60 characters. */
  homeCity?: string
  updatedAt: number
}

/** One of your trips as friends see it on your card: where and when, nothing else. */
export interface CardTrip {
  title: string
  destination: string
  country?: string
  /** YYYY-MM-DD */
  start: string
  end: string
  cover?: Scene
}

/** Your card for friends only: where you're travelling, when you let them see it. */
export interface FriendCard {
  uid: string
  /** False: friends see nothing of your trips (the default until you turn it on). */
  showTrips: boolean
  trips: CardTrip[]
  updatedAt: number
}

export type InviteKind = 'friend' | 'trip'

/**
 * A link that does one thing for whoever opens it: adds you as a friend (/f/<token>) or lets them join a trip
 * (/j/<token>). Anyone with the token can read it; only its maker can reset (revoke) it.
 */
export interface Invite {
  token: string
  kind: InviteKind
  from: string
  fromName: string
  fromPhoto: string | null
  createdAt: number
  revoked?: boolean
  /** Trip invites: the group trip, the role it gives, and enough to show what you're joining before you can read it. */
  trip?: string
  role?: Exclude<Role, 'owner'>
  tripTitle?: string
  tripDestination?: string
  tripStart?: string
  tripEnd?: string
  tripCover?: Scene
}

/** Two people who are friends. Its id is the two uids sorted and joined by "_" (socialPairId). */
export interface Friendship {
  id: string
  members: [string, string]
  /** The invite token that made it, or 'request' for an accepted friend request. */
  via: string
  createdAt: number
}

/** A friend request (from a group trip, a meetup or an @handle). Its id is `${from}_${to}`. */
export interface FriendRequest {
  id: string
  from: string
  to: string
  fromName: string
  fromPhoto: string | null
  at: number
}

export type PostKind = 'moment' | 'stop' | 'day' | 'plan' | 'meetup'

/** What a post is about, shown as a chip: a trip, and a place in it. */
export interface PostTrip {
  title: string
  destination: string
  start?: string
  end?: string
}

export interface PostPlace {
  name: string
  lat?: number
  lng?: number
}

/** A post as it is written: everything but the bookkeeping. */
export interface NewPost {
  kind: PostKind
  /** At most 2,000 characters. May be empty when there is a photo, a link or a recap. */
  text: string
  /** A photo URL (uploadPublicPhoto). */
  photo?: string
  trip?: PostTrip
  place?: PostPlace
  /** A link the card opens: a meetup (/m/<id>) or a plan link (/p/<id>), as a path of the app. */
  link?: string
  /** A short line under the text for a day recap or a plan ("11 stops · 4 stamps · ★★★★★"). */
  recap?: string
}

/** A post to friends. The canonical copy (posts/{id}) holds who may read it and the likes. */
export interface Post extends NewPost {
  id: string
  author: string
  authorName: string
  authorPhoto: string | null
  /** Who may read it: the author and the friends it was posted to (at most 500). */
  audience: string[]
  /** Who liked it. */
  likes: Record<string, true>
  at: number
}

/** A post as it sits in a reader's feed (users/{uid}/feed/{postId}): a copy without the audience and likes. */
export type FeedItem = Omit<Post, 'audience' | 'likes'>

export interface Comment {
  id: string
  post: string
  author: string
  name: string
  photo: string | null
  /** At most 1,000 characters. */
  text: string
  at: number
}

export type InboxKind =
  | 'friend-request' | 'friend-accepted' | 'trip-invite' | 'joined-trip'
  | 'like' | 'comment' | 'meetup-going' | 'home-safe'

/** Something that happened for you (the bell). Written by whoever did it; read, marked and removed by you. */
export interface InboxItem {
  id: string
  kind: InboxKind
  from: string
  fromName: string
  fromPhoto: string | null
  /** One line, at most 200 characters ("liked your post", "invited you to Lisbon"). */
  text: string
  /** Where tapping it goes: a path of the app ("/j/<token>", "/friends?tab=friends", "/m/<id>"). */
  link?: string
  /** What it is about: a post id, a group trip id, a meetup id. */
  ref?: string
  at: number
  read?: boolean
}

/** A group trip in the cloud (trips/{gid}): who is in it, and the shared plan. */
export interface GroupTripDoc {
  id: string
  owner: string
  roles: Record<string, Role>
  /** Names and photos of the members, each written by that member. */
  people: Record<string, { name: string, photo: string | null }>
  /** Shown without reading the plan (lists, invites). */
  title: string
  destination: string
  start: string
  end: string
  cover: Scene
  /** The shared plan: a Trip as JSON with id = the group id and no `group`, seed or `edited` fields (groupTripJson). */
  json: string
  /** Milliseconds; only goes up. Writes are conditional on it, like the sync items. */
  updatedAt: number
  createdAt: number
  /** The invite token of the last member who joined (the rules check it). */
  joinedVia?: string
}

/** A group trip of yours (users/{uid}/groups/{gid}): what each of your devices needs to keep its copy. */
export interface GroupPointer {
  gid: string
  /** The trip's id on your devices: the trip's own id for whoever made the group, the group id for people who joined. */
  localId: string
  role: Role
  title: string
  at: number
}

export type MessageKind = 'text' | 'photo' | 'stop' | 'system' | 'status' | 'location'

export interface NewMessage {
  kind: MessageKind
  /** At most 1,000 characters. */
  text: string
  /** kind 'photo': the picture's URL (uploadPublicPhoto). */
  image?: string
  /** kind 'stop': the stop it points at, with its title and time when sent (so it reads well if the plan changes). */
  stopId?: string
  stopTitle?: string
  stopWhen?: string
  /** kind 'location': where you were. */
  place?: { lat: number, lng: number, acc?: number, name?: string }
}

export interface Message extends NewMessage {
  id: string
  author: string
  name: string
  /** The author's photo. */
  photo: string | null
  at: number
}

/** Your vote on an option stop of a group trip (id `${stopId}__${uid}`). */
export interface Vote {
  stopId: string
  uid: string
  choiceId: string
  at: number
}

export type Going = 'in' | 'maybe' | 'out'

/** Whether you're in for a stop of a group trip (id `${stopId}__${uid}`). */
export interface Rsvp {
  stopId: string
  uid: string
  going: Going
  at: number
}

export type StatusKind = 'onway' | 'late' | 'at' | 'free' | 'home' | 'custom'

/** Where you are, as you told the group (status/{uid}). Never tracked: set by hand or by "Share where I am". */
export interface MemberStatus {
  uid: string
  kind: StatusKind
  /** At most 80 characters ("At Pantheon", "Home safe"). */
  text: string
  stopId?: string
  place?: { lat: number, lng: number, acc?: number }
  at: number
}

/** An open invite to a plan of yours that anyone with the link can see (/m/<id>). */
export interface Meetup {
  id: string
  host: string
  hostName: string
  hostPhoto: string | null
  /** At most 80 characters ("Vatican Museums"). */
  title: string
  /** At most 280 characters ("Anyone for the Vatican at 8 on Friday?"). */
  note: string
  place: { name: string, lat?: number, lng?: number, query?: string } | null
  /** When, as an ISO time with its offset ("2026-10-09T08:00:00+02:00"). */
  start: string
  /** The place's time zone, to show the time as it is there. */
  timezone: string
  destination?: string
  tripTitle?: string
  createdAt: number
  updatedAt: number
  cancelled?: boolean
}

export interface MeetupGoing extends PersonRef {
  at: number
}

/** A read-only copy of a plan that anyone with the link can open and copy (/p/<id>). */
export interface Share {
  id: string
  owner: string
  ownerName: string
  ownerPhoto: string | null
  title: string
  destination: string
  start: string
  end: string
  cover: Scene
  days: number
  /** The plan as JSON (socialShareTrip: nothing personal in it). */
  json: string
  createdAt: number
  revoked?: boolean
}

/** A plan as a share holds it, parsed. */
export type SharedTrip = Trip
