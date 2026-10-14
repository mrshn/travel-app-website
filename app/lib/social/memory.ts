/**
 * The memory backend of the social layer: a stand-in "cloud" kept in this browser (localStorage
 * `travel:fakecloud:v1`), for browser checks without Firebase (builds with NUXT_PUBLIC_SOCIAL_BACKEND=memory).
 * It follows api.ts and the rules of docs/design/2026-10-14-together.md (6.1): what Firestore would refuse, it refuses.
 *
 * Test hooks, on window.__travelsSocial:
 *   as(person)      a backend acting as someone else, sharing the same cloud (another member, a friend)
 *   store()         a copy of the whole cloud
 *   reset()         empties it
 *   latency(ms)     waits this long in every call (default 0)
 */
import type {
  Comment, FeedItem, FriendCard, FriendRequest, Friendship, Going, GroupPointer, GroupTripDoc, InboxItem, Invite, Meetup,
  MeetupGoing, MemberStatus, Message, PersonRef, Post, Profile, Role, Rsvp, Share, Vote,
} from '#shared/types/social'
import { socialHandle, socialHandleValid, socialPairId, socialToken } from '#shared/utils/social'
import { SocialError, type OnError, type SocialBackend, type Unsub } from './api'

interface Cloud {
  profiles: Record<string, Profile>
  handles: Record<string, string>
  cards: Record<string, FriendCard>
  invites: Record<string, Invite>
  friendships: Record<string, Friendship>
  requests: Record<string, FriendRequest>
  posts: Record<string, Post>
  comments: Record<string, Record<string, Comment>>
  feeds: Record<string, Record<string, FeedItem>>
  inbox: Record<string, Record<string, InboxItem>>
  groups: Record<string, GroupTripDoc>
  pointers: Record<string, Record<string, GroupPointer>>
  messages: Record<string, Record<string, Message>>
  votes: Record<string, Record<string, Vote>>
  rsvps: Record<string, Record<string, Rsvp>>
  statuses: Record<string, Record<string, MemberStatus>>
  meetups: Record<string, Meetup>
  going: Record<string, Record<string, MeetupGoing>>
  shares: Record<string, Share>
}

const KEY = 'travel:fakecloud:v1'

function emptyCloud(): Cloud {
  return {
    profiles: {}, handles: {}, cards: {}, invites: {}, friendships: {}, requests: {}, posts: {}, comments: {}, feeds: {},
    inbox: {}, groups: {}, pointers: {}, messages: {}, votes: {}, rsvps: {}, statuses: {}, meetups: {}, going: {}, shares: {},
  }
}

function loadCloud(): Cloud {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...emptyCloud(), ...JSON.parse(raw) as Partial<Cloud> } : emptyCloud()
  }
  catch {
    return emptyCloud()
  }
}

let cloud: Cloud = typeof localStorage === 'undefined' ? emptyCloud() : loadCloud()
let delay = 0
const listeners = new Set<() => void>()
let notifying = false

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cloud))
  }
  catch { /* full: the cloud stays in memory */ }
}

/** After a change: every live list looks again (once, after the current call). */
function changed() {
  save()
  if (notifying) return
  notifying = true
  queueMicrotask(() => {
    notifying = false
    for (const l of [...listeners]) l()
  })
}

if (typeof window !== 'undefined') {
  // Another page of this browser changed the cloud.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    cloud = loadCloud()
    for (const l of [...listeners]) l()
  })
}

const clone = <T>(x: T): T => (x === undefined ? x : JSON.parse(JSON.stringify(x)) as T)
const wait = () => new Promise<void>(r => setTimeout(r, delay))
const now = () => Date.now()
const bag = <T>(o: Record<string, Record<string, T>>, k: string): Record<string, T> => (o[k] ??= {})

function isFriend(a: string, b: string): boolean {
  return !!cloud.friendships[socialPairId(a, b)]
}

function memberRole(gid: string, uid: string): Role | undefined {
  return cloud.groups[gid]?.roles[uid]
}

/** A live list: `read` runs now and after every change; `cb` hears when its result differs. */
function live<T>(read: () => T, cb: (v: T) => void, onError?: OnError): Unsub {
  let last = ''
  let stopped = false
  const run = () => {
    if (stopped) return
    try {
      const v = read()
      const j = JSON.stringify(v ?? null)
      if (j === last) return
      last = j
      cb(clone(v))
    }
    catch (e) {
      stopped = true
      listeners.delete(run)
      onError?.(e instanceof SocialError ? e : new SocialError('unknown', String(e)))
    }
  }
  listeners.add(run)
  queueMicrotask(run)
  return () => {
    stopped = true
    listeners.delete(run)
  }
}

const tooLong = (s: unknown, max: number) => typeof s === 'string' && s.length > max

export function createMemoryBackend(meIn: PersonRef | null): SocialBackend {
  const me: PersonRef | null = meIn ? { ...meIn } : null
  const subs = new Set<Unsub>()
  const track = (u: Unsub): Unsub => {
    subs.add(u)
    return () => {
      u()
      subs.delete(u)
    }
  }

  function uid(): string {
    if (!me) throw new SocialError('auth', 'Sign in first.')
    return me.uid
  }
  function member(gid: string): Role {
    const r = memberRole(gid, uid())
    if (!r) throw new SocialError('denied', 'You’re not in this trip.')
    return r
  }
  const meRef = (): PersonRef => ({ uid: uid(), name: me!.name, photo: me!.photo })

  function writeFeed(post: Post, to: string[]) {
    const item: FeedItem = clone({ ...post, audience: undefined, likes: undefined }) as unknown as FeedItem
    delete (item as Partial<Post>).audience
    delete (item as Partial<Post>).likes
    for (const f of to) {
      if (f === post.author || isFriend(f, post.author)) bag(cloud.feeds, f)[post.id] = clone(item)
    }
  }

  const b: SocialBackend = {
    kind: 'memory',
    get me() {
      return me
    },
    setMe(p) {
      if (!me) return
      me.name = p.name
      me.photo = p.photo
    },

    // ---------- profiles ----------
    async getProfile(id) {
      await wait()
      uid()
      return clone(cloud.profiles[id] ?? null)
    },
    async saveProfile(p) {
      await wait()
      const id = uid()
      if (tooLong(p.name, 60) || tooLong(p.bio, 160) || tooLong(p.homeCity, 60)) throw new SocialError('invalid')
      const cur = cloud.profiles[id]
      const next: Profile = {
        uid: id,
        name: (p.name ?? cur?.name ?? me!.name).trim() || 'Traveller',
        photo: p.photo !== undefined ? p.photo : (cur?.photo ?? me!.photo),
        ...(cur?.handle ? { handle: cur.handle } : {}),
        ...((p.bio ?? cur?.bio) ? { bio: p.bio ?? cur?.bio } : {}),
        ...((p.homeCity ?? cur?.homeCity) ? { homeCity: p.homeCity ?? cur?.homeCity } : {}),
        updatedAt: now(),
      }
      cloud.profiles[id] = next
      changed()
      return clone(next)
    },
    async claimHandle(raw) {
      await wait()
      const id = uid()
      const old = cloud.profiles[id]?.handle
      if (raw === null) {
        if (old && cloud.handles[old] === id) delete cloud.handles[old]
        if (cloud.profiles[id]) delete cloud.profiles[id].handle
        changed()
        return 'ok'
      }
      const h = socialHandle(raw)
      if (!socialHandleValid(h)) return 'invalid'
      if (cloud.handles[h] && cloud.handles[h] !== id) return 'taken'
      cloud.handles[h] = id
      if (old && old !== h && cloud.handles[old] === id) delete cloud.handles[old]
      cloud.profiles[id] = { ...(cloud.profiles[id] ?? { uid: id, name: me!.name, photo: me!.photo, updatedAt: now() }), handle: h, updatedAt: now() }
      changed()
      return 'ok'
    },
    async findHandle(raw) {
      await wait()
      uid()
      const owner = cloud.handles[socialHandle(raw)]
      return owner ? clone(cloud.profiles[owner] ?? null) : null
    },

    // ---------- cards ----------
    async saveCard(card) {
      await wait()
      const id = uid()
      cloud.cards[id] = { uid: id, showTrips: !!card.showTrips, trips: card.showTrips ? clone(card.trips) : [], updatedAt: now() }
      changed()
    },
    async getCard(id) {
      await wait()
      const mine = uid()
      if (id !== mine && !isFriend(id, mine)) throw new SocialError('denied')
      return clone(cloud.cards[id] ?? null)
    },

    // ---------- invites ----------
    async createInvite(inv) {
      await wait()
      const id = uid()
      if (inv.kind === 'trip') {
        const role = inv.trip ? memberRole(inv.trip, id) : undefined
        if (role !== 'owner' && role !== 'editor') throw new SocialError('denied')
        if (inv.role !== 'editor' && inv.role !== 'viewer') throw new SocialError('invalid')
      }
      const full: Invite = { ...clone(inv), token: socialToken(), from: id, fromName: me!.name, fromPhoto: me!.photo, createdAt: now() }
      cloud.invites[full.token] = full
      changed()
      return clone(full)
    },
    async getInvite(token) {
      await wait()
      return clone(cloud.invites[token] ?? null)
    },
    async revokeInvite(token) {
      await wait()
      const inv = cloud.invites[token]
      if (!inv) return
      if (inv.from !== uid()) throw new SocialError('denied')
      inv.revoked = true
      changed()
    },
    async myInvites() {
      await wait()
      const id = uid()
      return clone(Object.values(cloud.invites).filter(i => i.from === id && !i.revoked).sort((a, b) => b.createdAt - a.createdAt))
    },

    // ---------- friends ----------
    watchFriends(cb, onError) {
      return track(live(() => {
        const id = uid()
        return Object.values(cloud.friendships).filter(f => f.members.includes(id)).sort((a, b) => a.createdAt - b.createdAt)
      }, cb, onError))
    },
    async addFriendByInvite(token) {
      await wait()
      const id = uid()
      const inv = cloud.invites[token]
      if (!inv || inv.revoked || inv.kind !== 'friend') throw new SocialError('not-found', 'This link was reset or doesn’t exist.')
      if (inv.from === id) throw new SocialError('invalid', 'This is your own link.')
      const pid = socialPairId(id, inv.from)
      const f = cloud.friendships[pid] ?? { id: pid, members: [id, inv.from].sort() as [string, string], via: token, createdAt: now() }
      cloud.friendships[pid] = f
      changed()
      return clone(f)
    },
    async sendRequest(to) {
      await wait()
      const id = uid()
      if (to.uid === id || isFriend(id, to.uid)) return
      const rid = `${id}_${to.uid}`
      cloud.requests[rid] = { id: rid, from: id, to: to.uid, fromName: me!.name, fromPhoto: me!.photo, at: now() }
      const nid = socialToken(12)
      bag(cloud.inbox, to.uid)[nid] = { id: nid, kind: 'friend-request', from: id, fromName: me!.name, fromPhoto: me!.photo, text: 'wants to be friends', link: '/friends?tab=friends', at: now() }
      changed()
    },
    watchRequests(cb, onError) {
      return track(live(() => {
        const id = uid()
        const all = Object.values(cloud.requests)
        return [all.filter(r => r.to === id), all.filter(r => r.from === id)] as const
      }, ([inc, out]) => cb([...inc], [...out]), onError))
    },
    async acceptRequest(req) {
      await wait()
      const id = uid()
      if (req.to !== id || !cloud.requests[`${req.from}_${id}`]) throw new SocialError('not-found')
      const pid = socialPairId(id, req.from)
      const f = cloud.friendships[pid] ?? { id: pid, members: [id, req.from].sort() as [string, string], via: 'request', createdAt: now() }
      cloud.friendships[pid] = f
      delete cloud.requests[`${req.from}_${id}`]
      delete cloud.requests[`${id}_${req.from}`]
      changed()
      return clone(f)
    },
    async dropRequest(req) {
      await wait()
      const id = uid()
      if (req.from !== id && req.to !== id) throw new SocialError('denied')
      delete cloud.requests[req.id]
      changed()
    },
    async unfriend(other) {
      await wait()
      const id = uid()
      delete cloud.friendships[socialPairId(id, other)]
      for (const p of Object.values(cloud.posts)) {
        if (p.author === id) {
          p.audience = p.audience.filter(x => x !== other)
          delete cloud.feeds[other]?.[p.id]
        }
        if (p.author === other) delete cloud.feeds[id]?.[p.id]
      }
      changed()
    },

    // ---------- posts ----------
    async createPost(p, audience) {
      await wait()
      const id = uid()
      if (tooLong(p.text, 2000)) throw new SocialError('invalid')
      const aud = [...new Set([id, ...audience])].slice(0, 500)
      const post: Post = { ...clone(p), id: socialToken(), author: id, authorName: me!.name, authorPhoto: me!.photo, audience: aud, likes: {}, at: now() }
      cloud.posts[post.id] = post
      writeFeed(post, aud)
      changed()
      return clone(post)
    },
    async deletePost(pid) {
      await wait()
      const p = cloud.posts[pid]
      if (!p) return
      if (p.author !== uid()) throw new SocialError('denied')
      for (const f of p.audience) delete cloud.feeds[f]?.[pid]
      delete cloud.posts[pid]
      delete cloud.comments[pid]
      changed()
    },
    watchFeed(limit, cb, onError) {
      return track(live(() => Object.values(cloud.feeds[uid()] ?? {}).sort((a, b) => b.at - a.at).slice(0, limit), cb, onError))
    },
    watchPost(pid, cb, onError) {
      return track(live(() => {
        const p = cloud.posts[pid]
        if (!p) return null
        if (!p.audience.includes(uid())) throw new SocialError('denied')
        return p
      }, cb, onError))
    },
    async setLike(pid, on) {
      await wait()
      const id = uid()
      const p = cloud.posts[pid]
      if (!p) throw new SocialError('not-found')
      if (!p.audience.includes(id)) throw new SocialError('denied')
      if (on) p.likes[id] = true
      else delete p.likes[id]
      changed()
    },
    watchComments(pid, cb, onError) {
      return track(live(() => {
        const p = cloud.posts[pid]
        if (!p || !p.audience.includes(uid())) throw new SocialError('denied')
        return Object.values(cloud.comments[pid] ?? {}).sort((a, b) => a.at - b.at)
      }, cb, onError))
    },
    async countComments(pid) {
      await wait()
      const p = cloud.posts[pid]
      if (!p || !p.audience.includes(uid())) throw new SocialError('denied')
      return Object.keys(cloud.comments[pid] ?? {}).length
    },
    async addComment(pid, text) {
      await wait()
      const id = uid()
      const p = cloud.posts[pid]
      if (!p) throw new SocialError('not-found')
      if (!p.audience.includes(id)) throw new SocialError('denied')
      const t = String(text ?? '').trim()
      if (!t || t.length > 1000) throw new SocialError('invalid')
      const c: Comment = { id: socialToken(12), post: pid, author: id, name: me!.name, photo: me!.photo, text: t, at: now() }
      bag(cloud.comments, pid)[c.id] = c
      changed()
      return clone(c)
    },
    async deleteComment(pid, cid) {
      await wait()
      const id = uid()
      const c = cloud.comments[pid]?.[cid]
      if (!c) return
      if (c.author !== id && cloud.posts[pid]?.author !== id) throw new SocialError('denied')
      delete cloud.comments[pid]![cid]
      changed()
    },
    async shareRecentPostsWith(friend, limit = 20) {
      await wait()
      const id = uid()
      if (!isFriend(id, friend)) throw new SocialError('denied')
      const mine = Object.values(cloud.posts).filter(p => p.author === id).sort((a, b) => b.at - a.at).slice(0, limit)
      for (const p of mine) {
        if (!p.audience.includes(friend)) p.audience = [...p.audience, friend].slice(0, 500)
        writeFeed(p, [friend])
      }
      changed()
    },

    // ---------- inbox ----------
    watchInbox(limit, cb, onError) {
      return track(live(() => Object.values(cloud.inbox[uid()] ?? {}).sort((a, b) => b.at - a.at).slice(0, limit), cb, onError))
    },
    async notify(to, item) {
      await wait()
      const id = uid()
      const ok = isFriend(id, to)
        || item.kind === 'friend-request'
        || (item.kind === 'meetup-going' && !!item.ref && cloud.meetups[item.ref]?.host === to)
        || ((item.kind === 'joined-trip' || item.kind === 'trip-invite' || item.kind === 'home-safe') && !!item.ref && !!memberRole(item.ref, id) && !!memberRole(item.ref, to))
      if (!ok) throw new SocialError('denied')
      if (tooLong(item.text, 200)) throw new SocialError('invalid')
      const nid = socialToken(12)
      bag(cloud.inbox, to)[nid] = { ...clone(item), id: nid, from: id, fromName: me!.name, fromPhoto: me!.photo, at: now() }
      changed()
    },
    async markRead(ids) {
      await wait()
      const box = cloud.inbox[uid()] ?? {}
      for (const i of ids) if (box[i]) box[i].read = true
      changed()
    },
    async removeInbox(ids) {
      await wait()
      const box = cloud.inbox[uid()] ?? {}
      for (const i of ids) delete box[i]
      changed()
    },

    // ---------- photos ----------
    async uploadPublicPhoto(blob) {
      await wait()
      uid()
      if (!blob.type.startsWith('image/') || blob.size > 4 * 1024 * 1024) throw new SocialError('invalid')
      if (blob.size < 120_000) {
        return await new Promise<string>((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result))
          r.onerror = () => reject(new SocialError('unknown'))
          r.readAsDataURL(blob)
        })
      }
      return URL.createObjectURL(blob)
    },

    // ---------- group trips ----------
    async createGroup(g) {
      await wait()
      const id = uid()
      if (cloud.groups[g.id]) throw new SocialError('invalid')
      cloud.groups[g.id] = { ...clone(g), owner: id, roles: { [id]: 'owner' }, people: { [id]: { name: me!.name, photo: me!.photo } }, createdAt: now() }
      changed()
      return g.id
    },
    watchPointers(cb, onError) {
      return track(live(() => Object.values(cloud.pointers[uid()] ?? {}).sort((a, b) => a.at - b.at), cb, onError))
    },
    async savePointer(p) {
      await wait()
      bag(cloud.pointers, uid())[p.gid] = clone(p)
      changed()
    },
    async deletePointer(gid) {
      await wait()
      delete cloud.pointers[uid()]?.[gid]
      changed()
    },
    watchGroup(gid, cb, onError) {
      let ended = false
      let unsub: Unsub = () => {}
      unsub = live(() => {
        const g = cloud.groups[gid]
        return g && g.roles[uid()] ? g : null
      }, (g) => {
        if (ended) return
        cb(g)
        if (!g) {
          ended = true
          queueMicrotask(() => unsub())
        }
      }, onError)
      return track(() => unsub())
    },
    async writeGroupJson(gid, json, updatedAt, basis, meta) {
      await wait()
      const role = member(gid)
      if (role === 'viewer') throw new SocialError('denied')
      const g = cloud.groups[gid]!
      if (g.updatedAt !== basis) return false
      if (updatedAt <= g.updatedAt || json.length >= 1_000_000) throw new SocialError('invalid')
      Object.assign(g, clone(meta), { json, updatedAt })
      changed()
      return true
    },
    async joinGroup(token) {
      await wait()
      const id = uid()
      const inv = cloud.invites[token]
      if (!inv || inv.revoked || inv.kind !== 'trip' || !inv.trip) throw new SocialError('not-found', 'This link was reset or doesn’t exist.')
      const g = cloud.groups[inv.trip]
      if (!g) throw new SocialError('not-found', 'This trip isn’t shared any more.')
      const inviter = g.roles[inv.from]
      if (inviter !== 'owner' && inviter !== 'editor') throw new SocialError('not-found', 'This link doesn’t work any more.')
      if (!g.roles[id]) {
        g.roles[id] = inv.role ?? 'viewer'
        g.people[id] = { name: me!.name, photo: me!.photo }
        g.joinedVia = token
        changed()
      }
      return clone(g)
    },
    async leaveGroup(gid) {
      await wait()
      const id = uid()
      const g = cloud.groups[gid]
      if (!g) return
      if (g.owner === id) throw new SocialError('denied', 'The organiser can’t leave: stop sharing instead.')
      delete g.roles[id]
      delete g.people[id]
      changed()
    },
    async setRole(gid, who, role) {
      await wait()
      const g = cloud.groups[gid]
      if (!g || g.owner !== uid()) throw new SocialError('denied')
      if (who === g.owner) throw new SocialError('invalid')
      if (role) g.roles[who] = role
      else {
        delete g.roles[who]
        delete g.people[who]
      }
      changed()
    },
    async deleteGroup(gid) {
      await wait()
      const g = cloud.groups[gid]
      if (!g) return
      if (g.owner !== uid()) throw new SocialError('denied')
      delete cloud.groups[gid]
      delete cloud.messages[gid]
      delete cloud.votes[gid]
      delete cloud.rsvps[gid]
      delete cloud.statuses[gid]
      changed()
    },
    async updateMe(gid) {
      await wait()
      const id = uid()
      member(gid)
      cloud.groups[gid]!.people[id] = { name: me!.name, photo: me!.photo }
      changed()
    },
    watchMessages(gid, limit, cb, onError) {
      return track(live(() => {
        member(gid)
        return Object.values(cloud.messages[gid] ?? {}).sort((a, b) => a.at - b.at).slice(-limit)
      }, cb, onError))
    },
    async sendMessage(gid, m) {
      await wait()
      member(gid)
      if (tooLong(m.text, 1000)) throw new SocialError('invalid')
      const msg: Message = { ...clone(m), id: socialToken(14), author: uid(), name: me!.name, photo: me!.photo, at: now() }
      bag(cloud.messages, gid)[msg.id] = msg
      changed()
      return clone(msg)
    },
    async deleteMessage(gid, id) {
      await wait()
      member(gid)
      const m = cloud.messages[gid]?.[id]
      if (!m) return
      if (m.author !== uid()) throw new SocialError('denied')
      delete cloud.messages[gid]![id]
      changed()
    },
    watchVotes(gid, cb, onError) {
      return track(live(() => {
        member(gid)
        return Object.values(cloud.votes[gid] ?? {})
      }, cb, onError))
    },
    async setVote(gid, stopId, choiceId) {
      await wait()
      member(gid)
      const k = `${stopId}__${uid()}`
      if (choiceId) bag(cloud.votes, gid)[k] = { stopId, uid: uid(), choiceId, at: now() }
      else delete cloud.votes[gid]?.[k]
      changed()
    },
    watchRsvps(gid, cb, onError) {
      return track(live(() => {
        member(gid)
        return Object.values(cloud.rsvps[gid] ?? {})
      }, cb, onError))
    },
    async setRsvp(gid, stopId, going: Going | null) {
      await wait()
      member(gid)
      const k = `${stopId}__${uid()}`
      if (going) bag(cloud.rsvps, gid)[k] = { stopId, uid: uid(), going, at: now() }
      else delete cloud.rsvps[gid]?.[k]
      changed()
    },
    watchStatuses(gid, cb, onError) {
      return track(live(() => {
        member(gid)
        return Object.values(cloud.statuses[gid] ?? {})
      }, cb, onError))
    },
    async setStatus(gid, s) {
      await wait()
      member(gid)
      if (s && tooLong(s.text, 80)) throw new SocialError('invalid')
      if (s) bag(cloud.statuses, gid)[uid()] = { ...clone(s), uid: uid(), at: now() }
      else delete cloud.statuses[gid]?.[uid()]
      changed()
    },

    // ---------- meetups ----------
    async createMeetup(m) {
      await wait()
      const id = uid()
      if (tooLong(m.title, 80) || tooLong(m.note, 280) || !m.title.trim()) throw new SocialError('invalid')
      const meetup: Meetup = { ...clone(m), id: socialToken(), host: id, hostName: me!.name, hostPhoto: me!.photo, createdAt: now(), updatedAt: now() }
      cloud.meetups[meetup.id] = meetup
      changed()
      return clone(meetup)
    },
    async updateMeetup(mid, patch) {
      await wait()
      const m = cloud.meetups[mid]
      if (!m) throw new SocialError('not-found')
      if (m.host !== uid()) throw new SocialError('denied')
      Object.assign(m, clone(patch), { updatedAt: now() })
      changed()
    },
    async getMeetup(mid) {
      await wait()
      return clone(cloud.meetups[mid] ?? null)
    },
    watchMeetup(mid, cb, onError) {
      return track(live(() => cloud.meetups[mid] ?? null, cb, onError))
    },
    async myMeetups() {
      await wait()
      const id = uid()
      return clone(Object.values(cloud.meetups).filter(m => m.host === id).sort((a, b) => b.createdAt - a.createdAt))
    },
    watchGoing(mid, cb, onError) {
      return track(live(() => {
        uid()
        return Object.values(cloud.going[mid] ?? {}).sort((a, b) => a.at - b.at)
      }, cb, onError))
    },
    async setGoing(mid, on) {
      await wait()
      const id = uid()
      if (!cloud.meetups[mid]) throw new SocialError('not-found')
      if (on) bag(cloud.going, mid)[id] = { ...meRef(), at: now() }
      else delete cloud.going[mid]?.[id]
      changed()
    },

    // ---------- plan links ----------
    async createShare(s) {
      await wait()
      const id = uid()
      if (s.json.length >= 1_000_000) throw new SocialError('invalid')
      const share: Share = { ...clone(s), id: socialToken(), owner: id, ownerName: me!.name, ownerPhoto: me!.photo, createdAt: now() }
      cloud.shares[share.id] = share
      changed()
      return clone(share)
    },
    async getShare(sid) {
      await wait()
      return clone(cloud.shares[sid] ?? null)
    },
    async revokeShare(sid) {
      await wait()
      const s = cloud.shares[sid]
      if (!s) return
      if (s.owner !== uid()) throw new SocialError('denied')
      s.revoked = true
      s.json = ''
      changed()
    },
    async myShares() {
      await wait()
      const id = uid()
      return clone(Object.values(cloud.shares).filter(s => s.owner === id && !s.revoked).sort((a, b) => b.createdAt - a.createdAt))
    },

    close() {
      for (const u of [...subs]) u()
      subs.clear()
    },
  }
  return b
}

// Test hooks (this module only loads in memory builds).
if (typeof window !== 'undefined') {
  Object.assign(window, {
    __travelsSocial: {
      as: (person: PersonRef) => createMemoryBackend(person),
      store: () => clone(cloud),
      reset: () => {
        cloud = emptyCloud()
        changed()
      },
      latency: (ms: number) => {
        delay = Math.max(0, ms)
      },
    },
  })
}
