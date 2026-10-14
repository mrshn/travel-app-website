/**
 * The Firestore backend of the social layer (docs/design/2026-10-14-together.md, 6.1 and 6.2): what api.ts promises,
 * on Firestore and Cloud Storage, guarded by firebase/firestore.rules and storage.rules. It behaves as memory.ts does
 * from the caller's side (the same results, the same SocialError codes); where Firestore can't answer a question the
 * memory backend answers by looking (is this post still there?), it reads first or reads after a refusal.
 *
 * Every query is on one field (no composite indexes): an equality, an array-contains, or one orderBy with a limit.
 * Writes that cost the rules a lookup each (copies in friends' feeds) go in batches of 10.
 * Loaded with a dynamic import: nothing here runs until createFirestoreBackend is called.
 */
import {
  FieldPath, arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getCountFromServer, getDoc, getDocs, limit as limitTo,
  onSnapshot, orderBy, query, runTransaction, setDoc, updateDoc, where, writeBatch,
  type DocumentReference, type DocumentSnapshot, type Query, type WriteBatch,
} from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import type {
  Comment, FeedItem, FriendCard, FriendRequest, Friendship, GroupPointer, GroupTripDoc, InboxItem, Invite, Meetup, MeetupGoing,
  MemberStatus, Message, PersonRef, Post, Profile, Rsvp, Share, Vote,
} from '#shared/types/social'
import { socialHandle, socialHandleValid, socialPairId, socialToken, socialTokenValid } from '#shared/utils/social'
import type { Firebase } from '~/lib/firebase'
import { SocialError, type OnError, type SocialBackend, type Unsub } from './api'
import {
  MAX_PLAN_JSON, MAX_PUBLIC_PHOTO, cardDoc, chunks, commentDoc, feedDoc, firebaseCode, friendshipDoc, goingDoc, groupDoc,
  groupMetaDoc, idOk, inboxDoc, inviteDoc, meetupDoc, meetupPatch, messageDoc, nextProfile, personOf, pointerDoc, postDoc,
  profileDoc, requestDoc, rsvpDoc, shareDoc, socialErrorOf, statusDoc, tooLong, voteDoc,
} from './firestoreDocs'

/** One write of a batch. */
type Op = (b: WriteBatch) => void
/** A group trip as you can see it: its document, gone, or not yours to read (you're not in it). */
type GroupSeen = GroupTripDoc | 'missing' | 'outside'
type TripPart = 'messages' | 'votes' | 'rsvps' | 'status'

const isCode = (e: unknown, code: string) => firebaseCode(e) === code
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false
const byAt = <T extends { at: number }>(a: T, b: T) => a.at - b.at
const newestFirst = <T extends { createdAt: number }>(a: T, b: T) => b.createdAt - a.createdAt

export function createFirestoreBackend(fb: Firebase, meIn: PersonRef | null): SocialBackend {
  const db = fb.db
  const me: PersonRef | null = meIn ? { ...meIn } : null
  /** Every live subscription this backend started (close() stops them). */
  const subs = new Set<Unsub>()

  // ---------- where things live (spec 6.1) ----------
  const at = {
    profile: (uid: string) => doc(db, 'profiles', uid),
    handle: (h: string) => doc(db, 'handles', h),
    card: (uid: string) => doc(db, 'cards', uid),
    invite: (token: string) => doc(db, 'invites', token),
    invites: () => collection(db, 'invites'),
    friendship: (pair: string) => doc(db, 'friendships', pair),
    friendships: () => collection(db, 'friendships'),
    request: (id: string) => doc(db, 'requests', id),
    requests: () => collection(db, 'requests'),
    post: (id: string) => doc(db, 'posts', id),
    posts: () => collection(db, 'posts'),
    comments: (post: string) => collection(db, 'posts', post, 'comments'),
    feed: (uid: string) => collection(db, 'users', uid, 'feed'),
    inbox: (uid: string) => collection(db, 'users', uid, 'inbox'),
    pointers: (uid: string) => collection(db, 'users', uid, 'groups'),
    group: (gid: string) => doc(db, 'trips', gid),
    part: (gid: string, part: TripPart) => collection(db, 'trips', gid, part),
    meetup: (id: string) => doc(db, 'meetups', id),
    meetups: () => collection(db, 'meetups'),
    going: (id: string) => collection(db, 'meetups', id, 'going'),
    share: (id: string) => doc(db, 'shares', id),
    shares: () => collection(db, 'shares'),
  }

  // ---------- who, and errors ----------
  function uid(): string {
    if (!me) throw new SocialError('auth', 'Sign in first.')
    return me.uid
  }
  const meRef = (): PersonRef => ({ uid: uid(), name: me!.name, photo: me!.photo })
  const fail = (e: unknown) => socialErrorOf(e, !!me, offline())

  /** Runs one call: no connection is 'offline' at once (a write would wait for one), anything thrown a SocialError. */
  async function attempt<T>(fn: () => Promise<T>): Promise<T> {
    try {
      if (offline()) throw new SocialError('offline', 'You’re offline.')
      return await fn()
    }
    catch (e) {
      throw fail(e)
    }
  }

  /** Commits writes in batches (BATCH_WRITES each), one after another. */
  async function commitAll(ops: Op[]) {
    for (const part of chunks(ops)) {
      const batch = writeBatch(db)
      for (const op of part) op(batch)
      await batch.commit()
    }
  }

  // ---------- live reads ----------
  /**
   * A live read started by `start`, which gets `failed` for Firestore's error callback. The first error stops it and
   * goes to onError once (as a SocialError); a throw from `start` itself (nobody signed in) arrives the same way.
   */
  function live(start: (failed: (e: unknown) => void) => Unsub, onError?: OnError): Unsub {
    let stop: Unsub = () => {}
    let done = false
    const end = () => {
      if (done) return
      done = true
      subs.delete(end)
      stop()
    }
    const failed = (e: unknown) => {
      if (done) return
      end()
      onError?.(fail(e))
    }
    subs.add(end)
    try {
      stop = start(failed)
    }
    catch (e) {
      queueMicrotask(() => failed(e))
    }
    if (done) stop()
    return end
  }

  /** The documents of a query, live. */
  function watchQuery<T>(q: () => Query, cb: (list: T[]) => void, onError?: OnError): Unsub {
    return live(failed => onSnapshot(q(), snap => cb(snap.docs.map(d => d.data() as T)), failed), onError)
  }

  /**
   * One document, live: its data, or null when there is none. A "none" from this device's cache alone (no answer
   * from the cloud yet) is not believed.
   */
  function watchDoc<T>(ref: () => DocumentReference | null, cb: (v: T | null) => void, onError?: OnError): Unsub {
    return live((failed) => {
      const r = ref()
      if (!r) {
        queueMicrotask(() => cb(null))
        return () => {}
      }
      return onSnapshot(r, (s) => {
        if (s.exists()) cb(s.data() as T)
        else if (!s.metadata.fromCache) cb(null)
      }, failed)
    }, onError)
  }

  // ---------- reading ----------
  const dataOf = <T>(s: DocumentSnapshot): T | null => (s.exists() ? s.data() as T : null)
  const read = async <T>(r: DocumentReference): Promise<T | null> => dataOf<T>(await getDoc(r))
  const readInvite = (token: string) => (socialTokenValid(token) ? read<Invite>(at.invite(token)) : Promise.resolve(null))

  /** A group trip as you can see it (a member reads it; anyone may learn that it doesn't exist). */
  async function seeGroup(gid: string): Promise<GroupSeen> {
    try {
      const g = await read<GroupTripDoc>(at.group(gid))
      if (!g) return 'missing'
      return g.roles?.[uid()] ? g : 'outside'
    }
    catch (e) {
      if (isCode(e, 'permission-denied')) return 'outside'
      throw e
    }
  }

  /** The uids of your friends, as the cloud has them now. */
  async function friendsNow(id: string): Promise<Set<string>> {
    const snap = await getDocs(query(at.friendships(), where('members', 'array-contains', id)))
    const out = new Set<string>()
    for (const d of snap.docs) for (const m of (d.data() as Friendship).members ?? []) if (m !== id) out.add(m)
    return out
  }

  const areFriends = async (a: string, b: string) => (await getDoc(at.friendship(socialPairId(a, b)))).exists()

  /** Your posts (all of them: a query on two fields would need an index). */
  async function myPosts(id: string): Promise<Post[]> {
    return (await getDocs(query(at.posts(), where('author', '==', id)))).docs.map(d => d.data() as Post)
  }

  /** Becomes friends with `other` (or finds you already are). */
  async function befriend(id: string, other: string, via: string): Promise<Friendship> {
    const ref = at.friendship(socialPairId(id, other))
    const have = await read<Friendship>(ref)
    if (have) return have
    const f = friendshipDoc(id, other, via, Date.now())
    try {
      await setDoc(ref, f)
    }
    catch (e) {
      // Made a moment ago by the other side: the friendship is there all the same.
      const now = await read<Friendship>(ref).catch(() => null)
      if (now) return now
      throw e
    }
    return f
  }

  /** A handle's owner, or null. */
  const handleOwner = async (h: string) => (await read<{ uid?: string }>(at.handle(h)))?.uid ?? null

  const b: SocialBackend = {
    kind: 'firestore',
    get me() {
      return me
    },
    setMe(p) {
      if (!me) return
      me.name = p.name
      me.photo = p.photo
    },

    // ---------- profiles ----------
    getProfile(id) {
      return attempt(async () => {
        uid()
        return idOk(id) ? read<Profile>(at.profile(id)) : null
      })
    },
    saveProfile(p) {
      return attempt(async () => {
        const id = uid()
        if (tooLong(p.name, 60) || tooLong(p.bio, 160) || tooLong(p.homeCity, 60)) throw new SocialError('invalid')
        const next = profileDoc(nextProfile(await read<Profile>(at.profile(id)), p, me!, Date.now()))
        await setDoc(at.profile(id), next)
        return next
      })
    },
    claimHandle(raw) {
      return attempt(async () => {
        const id = uid()
        const cur = await read<Profile>(at.profile(id))
        const old = cur?.handle
        const now = Date.now()
        const batch = writeBatch(db)
        if (raw === null) {
          if (old && await handleOwner(old) === id) batch.delete(at.handle(old))
          if (cur) {
            const rest: Profile = { ...cur, updatedAt: now }
            delete rest.handle
            batch.set(at.profile(id), profileDoc(rest))
          }
          await batch.commit()
          return 'ok'
        }
        const h = socialHandle(raw)
        if (!socialHandleValid(h)) return 'invalid'
        const owner = await handleOwner(h)
        if (owner && owner !== id) return 'taken'
        // The handle and the profile naming it go together (the rules check each against the other).
        if (!owner) batch.set(at.handle(h), { uid: id })
        batch.set(at.profile(id), profileDoc({ ...(cur ?? { uid: id, name: me!.name, photo: me!.photo, updatedAt: now }), handle: h, updatedAt: now }))
        if (old && old !== h && await handleOwner(old) === id) batch.delete(at.handle(old))
        try {
          await batch.commit()
        }
        catch (e) {
          // Taken a moment ago by someone else.
          const holder = isCode(e, 'permission-denied') ? await handleOwner(h).catch(() => null) : null
          if (holder && holder !== id) return 'taken'
          throw e
        }
        return 'ok'
      })
    },
    findHandle(raw) {
      return attempt(async () => {
        uid()
        const h = socialHandle(raw)
        if (!socialHandleValid(h)) return null
        const owner = await handleOwner(h)
        return owner && idOk(owner) ? read<Profile>(at.profile(owner)) : null
      })
    },

    // ---------- your trips, for friends ----------
    saveCard(card) {
      return attempt(async () => {
        const id = uid()
        await setDoc(at.card(id), cardDoc(id, card, Date.now()))
      })
    },
    getCard(id) {
      return attempt(async () => {
        uid()
        if (!idOk(id)) throw new SocialError('denied')
        return read<FriendCard>(at.card(id))
      })
    },

    // ---------- invite links ----------
    createInvite(inv) {
      return attempt(async () => {
        const id = uid()
        if (inv.kind === 'trip') {
          const g = inv.trip && idOk(inv.trip) ? await seeGroup(inv.trip) : 'missing'
          const role = typeof g === 'object' ? g.roles[id] : undefined
          if (role !== 'owner' && role !== 'editor') throw new SocialError('denied')
          if (inv.role !== 'editor' && inv.role !== 'viewer') throw new SocialError('invalid')
        }
        const token = socialToken()
        const full = inviteDoc(inv, token, meRef(), Date.now())
        await setDoc(at.invite(token), full)
        return full
      })
    },
    getInvite(token) {
      return attempt(() => readInvite(token))
    },
    revokeInvite(token) {
      return attempt(async () => {
        const id = uid()
        const inv = await readInvite(token)
        if (!inv) return
        if (inv.from !== id) throw new SocialError('denied')
        await updateDoc(at.invite(token), { revoked: true })
      })
    },
    myInvites() {
      return attempt(async () => {
        const id = uid()
        const snap = await getDocs(query(at.invites(), where('from', '==', id)))
        return snap.docs.map(d => d.data() as Invite).filter(i => !i.revoked).sort(newestFirst)
      })
    },

    // ---------- friends ----------
    watchFriends(cb, onError) {
      return watchQuery<Friendship>(() => query(at.friendships(), where('members', 'array-contains', uid())), list => cb(list.sort((x, y) => x.createdAt - y.createdAt)), onError)
    },
    addFriendByInvite(token) {
      return attempt(async () => {
        const id = uid()
        const inv = await readInvite(token)
        if (!inv || inv.revoked || inv.kind !== 'friend' || !idOk(inv.from)) throw new SocialError('not-found', 'This link was reset or doesn’t exist.')
        if (inv.from === id) throw new SocialError('invalid', 'This is your own link.')
        return befriend(id, inv.from, token)
      })
    },
    sendRequest(to) {
      return attempt(async () => {
        const id = uid()
        if (to.uid === id || !idOk(to.uid) || await areFriends(id, to.uid)) return
        const now = Date.now()
        const note = doc(at.inbox(to.uid))
        const batch = writeBatch(db)
        batch.set(at.request(`${id}_${to.uid}`), requestDoc(meRef(), to.uid, now))
        batch.set(note, inboxDoc({ kind: 'friend-request', text: 'wants to be friends', link: '/friends?tab=friends' }, note.id, meRef(), now))
        await batch.commit()
      })
    },
    watchRequests(cb, onError) {
      let incoming: FriendRequest[] | null = null
      let outgoing: FriendRequest[] | null = null
      const tell = () => {
        if (incoming && outgoing) cb([...incoming], [...outgoing])
      }
      return live((failed) => {
        const id = uid()
        const list = (field: 'to' | 'from', set: (l: FriendRequest[]) => void) => onSnapshot(
          query(at.requests(), where(field, '==', id)),
          (snap) => {
            set(snap.docs.map(d => d.data() as FriendRequest).sort(byAt))
            tell()
          },
          failed,
        )
        const stopIn = list('to', (l) => {
          incoming = l
        })
        const stopOut = list('from', (l) => {
          outgoing = l
        })
        return () => {
          stopIn()
          stopOut()
        }
      }, onError)
    },
    acceptRequest(req) {
      return attempt(async () => {
        const id = uid()
        if (req.to !== id || !idOk(req.from) || req.from === id) throw new SocialError('not-found')
        const theirs = at.request(`${req.from}_${id}`)
        if (!(await getDoc(theirs)).exists()) throw new SocialError('not-found')
        const pair = at.friendship(socialPairId(id, req.from))
        const have = await read<Friendship>(pair)
        const f = have ?? friendshipDoc(id, req.from, 'request', Date.now())
        // The friendship and the answered request go together (the rules see the request as it was before).
        const batch = writeBatch(db)
        if (!have) batch.set(pair, f)
        batch.delete(theirs)
        await batch.commit()
        // A request of yours to them is answered too.
        const mine = at.request(`${id}_${req.from}`)
        if ((await getDoc(mine)).exists()) await deleteDoc(mine)
        return f
      })
    },
    dropRequest(req) {
      return attempt(async () => {
        const id = uid()
        if (req.from !== id && req.to !== id) throw new SocialError('denied')
        if (idOk(req.id)) await deleteDoc(at.request(req.id))
      })
    },
    unfriend(other) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(other) || other === id) return
        // Your posts leave their feed and their audience; their posts leave your feed; then the friendship goes
        // (last, so a call that stops halfway can be made again).
        const ops: Op[] = []
        for (const p of await myPosts(id)) {
          if (p.audience?.includes(other)) ops.push(w => w.update(at.post(p.id), { audience: arrayRemove(other) }))
        }
        for (const d of (await getDocs(query(at.feed(other), where('author', '==', id)))).docs) ops.push(w => w.delete(d.ref))
        for (const d of (await getDocs(query(at.feed(id), where('author', '==', other)))).docs) ops.push(w => w.delete(d.ref))
        await commitAll(ops)
        await deleteDoc(at.friendship(socialPairId(id, other)))
      })
    },

    // ---------- posts and the feed ----------
    createPost(p, audience) {
      return attempt(async () => {
        const id = uid()
        if (tooLong(p.text, 2000)) throw new SocialError('invalid')
        const aud = [...new Set([id, ...audience])].slice(0, 500)
        const post = postDoc(p, socialToken(), meRef(), aud, Date.now())
        await setDoc(at.post(post.id), post)
        // A copy in your feed and in each friend's: only friends get one (the rules let nobody else write there).
        const friends = await friendsNow(id)
        const copy = feedDoc(post)
        await commitAll(aud.filter(f => f === id || (idOk(f) && friends.has(f))).map(f => (w: WriteBatch) => w.set(doc(at.feed(f), post.id), copy)))
        return post
      })
    },
    deletePost(pid) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(pid)) return
        const p = await read<Post>(at.post(pid))
        if (!p) return
        if (p.author !== id) throw new SocialError('denied')
        // The copies, the comments, then the post (the rules read the post to let its author delete comments).
        const comments = await getDocs(at.comments(pid))
        await commitAll([
          ...(p.audience ?? []).filter(idOk).map(f => (w: WriteBatch) => w.delete(doc(at.feed(f), pid))),
          ...comments.docs.map(d => (w: WriteBatch) => w.delete(d.ref)),
        ])
        await deleteDoc(at.post(pid))
      })
    },
    watchFeed(n, cb, onError) {
      return watchQuery<FeedItem>(() => query(at.feed(uid()), orderBy('at', 'desc'), limitTo(Math.max(1, n))), list => cb(list.slice(0, Math.max(0, n))), onError)
    },
    watchPost(pid, cb, onError) {
      return watchDoc<Post>(() => {
        uid()
        return idOk(pid) ? at.post(pid) : null
      }, cb, onError)
    },
    setLike(pid, on) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(pid)) throw new SocialError('not-found')
        try {
          await updateDoc(at.post(pid), new FieldPath('likes', id), on ? true : deleteField())
        }
        catch (e) {
          // Gone, or not for you: reading it tells which (a read you may not make is 'denied').
          if (isCode(e, 'not-found') || isCode(e, 'permission-denied')) {
            if (!(await getDoc(at.post(pid))).exists()) throw new SocialError('not-found')
          }
          throw e
        }
      })
    },
    watchComments(pid, cb, onError) {
      return watchQuery<Comment>(() => {
        uid()
        if (!idOk(pid)) throw new SocialError('denied')
        return query(at.comments(pid), orderBy('at'))
      }, cb, onError)
    },
    countComments(pid) {
      return attempt(async () => {
        uid()
        if (!idOk(pid)) throw new SocialError('denied')
        return (await getCountFromServer(at.comments(pid))).data().count
      })
    },
    addComment(pid, body) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(pid)) throw new SocialError('not-found')
        // Gone is 'not-found'; a post you may not read is 'denied' (the read itself is refused).
        if (!(await getDoc(at.post(pid))).exists()) throw new SocialError('not-found')
        const t = String(body ?? '').trim()
        if (!t || t.length > 1000) throw new SocialError('invalid')
        const c = commentDoc(pid, socialToken(12), meRef(), t, Date.now())
        await setDoc(doc(at.comments(pid), c.id), c)
        return c
      })
    },
    deleteComment(pid, cid) {
      return attempt(async () => {
        uid()
        if (!idOk(pid) || !idOk(cid)) return
        const ref = doc(at.comments(pid), cid)
        try {
          await deleteDoc(ref)
        }
        catch (e) {
          // Refused: fine when it's already gone, else not yours to delete.
          if (isCode(e, 'permission-denied')) {
            const s = await getDoc(ref).catch(() => null)
            if (s && !s.exists()) return
          }
          throw e
        }
      })
    },
    shareRecentPostsWith(friend, n = 20) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(friend) || friend === id || !(await areFriends(id, friend))) throw new SocialError('denied')
        const recent = (await myPosts(id)).sort((x, y) => y.at - x.at).slice(0, Math.max(0, n))
        const ops: Op[] = []
        for (const p of recent) {
          const has = (p.audience ?? []).includes(friend)
          if (!has && (p.audience ?? []).length >= 500) continue
          if (!has) ops.push(w => w.update(at.post(p.id), { audience: arrayUnion(friend) }))
          ops.push(w => w.set(doc(at.feed(friend), p.id), feedDoc(p)))
        }
        await commitAll(ops)
      })
    },

    // ---------- inbox ----------
    watchInbox(n, cb, onError) {
      return watchQuery<InboxItem>(() => query(at.inbox(uid()), orderBy('at', 'desc'), limitTo(Math.max(1, n))), list => cb(list.slice(0, Math.max(0, n))), onError)
    },
    notify(to, item) {
      return attempt(async () => {
        uid()
        if (!idOk(to)) throw new SocialError('denied')
        if (tooLong(item.text, 200)) throw new SocialError('invalid')
        const ref = doc(at.inbox(to))
        await setDoc(ref, inboxDoc(item, ref.id, meRef(), Date.now()))
      })
    },
    markRead(ids) {
      return attempt(async () => {
        const id = uid()
        const list = ids.filter(idOk)
        const mark = (x: string) => doc(at.inbox(id), x)
        try {
          await commitAll(list.map(x => (w: WriteBatch) => w.update(mark(x), { read: true })))
        }
        catch (e) {
          if (!isCode(e, 'not-found')) throw e
          // One was removed meanwhile (on another device): mark the others one by one.
          for (const x of list) {
            await updateDoc(mark(x), { read: true }).catch((err: unknown) => {
              if (!isCode(err, 'not-found')) throw err
            })
          }
        }
      })
    },
    removeInbox(ids) {
      return attempt(async () => {
        const id = uid()
        await commitAll(ids.filter(idOk).map(x => (w: WriteBatch) => w.delete(doc(at.inbox(id), x))))
      })
    },

    // ---------- photos ----------
    uploadPublicPhoto(blob) {
      return attempt(async () => {
        const id = uid()
        if (!blob.type.startsWith('image/') || blob.size > MAX_PUBLIC_PHOTO) throw new SocialError('invalid')
        const r = storageRef(fb.storage, `users/${id}/public/${socialToken()}.jpg`)
        await uploadBytes(r, blob, { contentType: blob.type })
        return await getDownloadURL(r)
      })
    },

    // ---------- group trips ----------
    createGroup(g) {
      return attempt(async () => {
        uid()
        if (!idOk(g.id) || await seeGroup(g.id) !== 'missing') throw new SocialError('invalid')
        await setDoc(at.group(g.id), groupDoc(g, meRef(), Date.now()))
        return g.id
      })
    },
    watchPointers(cb, onError) {
      return watchQuery<GroupPointer>(() => at.pointers(uid()), list => cb(list.sort(byAt)), onError)
    },
    savePointer(p) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(p.gid)) throw new SocialError('invalid')
        await setDoc(doc(at.pointers(id), p.gid), pointerDoc(p))
      })
    },
    deletePointer(gid) {
      return attempt(async () => {
        const id = uid()
        if (idOk(gid)) await deleteDoc(doc(at.pointers(id), gid))
      })
    },
    watchGroup(gid, cb, onError) {
      // Gone, or you're not in it any more (left, removed, deleted): null once, and the watch ends.
      let ended = false
      let stop: Unsub = () => {}
      const gone = () => {
        if (ended) return
        ended = true
        stop()
        cb(null)
      }
      stop = live((failed) => {
        const id = uid()
        if (!idOk(gid)) {
          queueMicrotask(gone)
          return () => {}
        }
        return onSnapshot(at.group(gid), (s) => {
          if (ended) return
          if (!s.exists()) {
            if (!s.metadata.fromCache) gone()
            return
          }
          const g = s.data() as GroupTripDoc
          if (g.roles?.[id]) cb(g)
          else gone()
        }, e => (isCode(e, 'permission-denied') ? gone() : failed(e)))
      }, onError)
      return stop
    },
    writeGroupJson(gid, json, updatedAt, basis, meta) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(gid)) throw new SocialError('denied')
        const ref = at.group(gid)
        // Written only if the cloud still has the version this write was based on (the rules check the version goes up).
        return runTransaction(db, async (tx) => {
          const g = dataOf<GroupTripDoc>(await tx.get(ref))
          const role = g?.roles?.[id]
          if (!g || !role || role === 'viewer') throw new SocialError('denied')
          if (g.updatedAt !== basis) return false
          if (updatedAt <= g.updatedAt || json.length >= MAX_PLAN_JSON) throw new SocialError('invalid')
          tx.update(ref, { ...groupMetaDoc(meta), json, updatedAt })
          return true
        })
      })
    },
    joinGroup(token) {
      return attempt(async () => {
        const id = uid()
        const inv = await readInvite(token)
        if (!inv || inv.revoked || inv.kind !== 'trip' || !inv.trip || !idOk(inv.trip)) throw new SocialError('not-found', 'This link was reset or doesn’t exist.')
        const ref = at.group(inv.trip)
        const seen = await seeGroup(inv.trip)
        if (seen === 'missing') throw new SocialError('not-found', 'This trip isn’t shared any more.')
        if (seen !== 'outside') return seen
        // Only your own keys, with the invite's role and the invite named (the rules check it still works).
        try {
          await updateDoc(ref, new FieldPath('roles', id), inv.role ?? 'viewer', new FieldPath('people', id), personOf(me!), 'joinedVia', token)
        }
        catch (e) {
          if (isCode(e, 'permission-denied') || isCode(e, 'not-found')) throw new SocialError('not-found', 'This link doesn’t work any more.')
          throw e
        }
        const g = await read<GroupTripDoc>(ref)
        if (!g) throw new SocialError('not-found', 'This trip isn’t shared any more.')
        return g
      })
    },
    leaveGroup(gid) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(gid)) return
        const g = await seeGroup(gid)
        if (typeof g !== 'object') return
        if (g.owner === id) throw new SocialError('denied', 'The organiser can’t leave: stop sharing instead.')
        await updateDoc(at.group(gid), new FieldPath('roles', id), deleteField(), new FieldPath('people', id), deleteField())
      })
    },
    setRole(gid, who, role) {
      return attempt(async () => {
        const id = uid()
        const g = idOk(gid) ? await seeGroup(gid) : 'missing'
        if (typeof g !== 'object' || g.owner !== id) throw new SocialError('denied')
        if (who === g.owner || (role !== null && role !== 'editor' && role !== 'viewer')) throw new SocialError('invalid')
        if (!idOk(who) || !g.roles[who]) {
          // Not in the trip: nothing to remove, and nobody joins but by an invite.
          if (role === null) return
          throw new SocialError('not-found', 'They’re not in this trip.')
        }
        if (role) await updateDoc(at.group(gid), new FieldPath('roles', who), role)
        else await updateDoc(at.group(gid), new FieldPath('roles', who), deleteField(), new FieldPath('people', who), deleteField())
      })
    },
    deleteGroup(gid) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(gid)) return
        const g = await seeGroup(gid)
        if (g === 'missing') return
        if (g === 'outside' || g.owner !== id) throw new SocialError('denied')
        // What was said and decided first (the rules read the trip to let its organiser delete them), then the trip.
        for (const part of ['messages', 'votes', 'rsvps', 'status'] as const) {
          const snap = await getDocs(at.part(gid, part))
          await commitAll(snap.docs.map(d => (w: WriteBatch) => w.delete(d.ref)))
        }
        await deleteDoc(at.group(gid))
      })
    },
    updateMe(gid) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(gid)) throw new SocialError('denied')
        try {
          await updateDoc(at.group(gid), new FieldPath('people', id), personOf(me!))
        }
        catch (e) {
          throw isCode(e, 'not-found') ? new SocialError('denied') : e
        }
      })
    },

    watchMessages(gid, n, cb, onError) {
      return watchQuery<Message>(() => {
        uid()
        if (!idOk(gid)) throw new SocialError('denied')
        return query(at.part(gid, 'messages'), orderBy('at', 'desc'), limitTo(Math.max(1, n)))
      }, list => cb(list.reverse()), onError)
    },
    sendMessage(gid, m) {
      return attempt(async () => {
        uid()
        if (!idOk(gid)) throw new SocialError('denied')
        if (tooLong(m.text, 1000)) throw new SocialError('invalid')
        const msg = messageDoc(m, socialToken(14), meRef(), Date.now())
        await setDoc(doc(at.part(gid, 'messages'), msg.id), msg)
        return msg
      })
    },
    deleteMessage(gid, mid) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(gid)) throw new SocialError('denied')
        if (!idOk(mid)) return
        const ref = doc(at.part(gid, 'messages'), mid)
        const m = await read<Message>(ref)
        if (!m) return
        if (m.author !== id) throw new SocialError('denied')
        await deleteDoc(ref)
      })
    },
    watchVotes(gid, cb, onError) {
      return watchQuery<Vote>(() => partOf(gid, 'votes'), cb, onError)
    },
    setVote(gid, stopId, choiceId) {
      return attempt(async () => {
        const id = uid()
        const ref = mineIn(gid, 'votes', stopId)
        if (choiceId) await setDoc(ref, voteDoc(stopId, id, choiceId, Date.now()))
        else await deleteDoc(ref)
      })
    },
    watchRsvps(gid, cb, onError) {
      return watchQuery<Rsvp>(() => partOf(gid, 'rsvps'), cb, onError)
    },
    setRsvp(gid, stopId, going) {
      return attempt(async () => {
        const id = uid()
        const ref = mineIn(gid, 'rsvps', stopId)
        if (going) await setDoc(ref, rsvpDoc(stopId, id, going, Date.now()))
        else await deleteDoc(ref)
      })
    },
    watchStatuses(gid, cb, onError) {
      return watchQuery<MemberStatus>(() => partOf(gid, 'status'), cb, onError)
    },
    setStatus(gid, s) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(gid)) throw new SocialError('denied')
        if (s && tooLong(s.text, 80)) throw new SocialError('invalid')
        const ref = doc(at.part(gid, 'status'), id)
        if (s) await setDoc(ref, statusDoc(s, id, Date.now()))
        else await deleteDoc(ref)
      })
    },

    // ---------- meetups ----------
    createMeetup(m) {
      return attempt(async () => {
        uid()
        if (tooLong(m.title, 80) || tooLong(m.note, 280) || !String(m.title ?? '').trim()) throw new SocialError('invalid')
        const meetup = meetupDoc(m, socialToken(), meRef(), Date.now())
        await setDoc(at.meetup(meetup.id), meetup)
        return meetup
      })
    },
    updateMeetup(mid, patch) {
      return attempt(async () => {
        const id = uid()
        const m = idOk(mid) ? await read<Meetup>(at.meetup(mid)) : null
        if (!m) throw new SocialError('not-found')
        if (m.host !== id) throw new SocialError('denied')
        if (tooLong(patch.title, 80) || tooLong(patch.note, 280) || (patch.title !== undefined && !String(patch.title).trim())) throw new SocialError('invalid')
        await updateDoc(at.meetup(mid), { ...meetupPatch(patch), updatedAt: Date.now() })
      })
    },
    getMeetup(mid) {
      return attempt(async () => (idOk(mid) ? read<Meetup>(at.meetup(mid)) : null))
    },
    watchMeetup(mid, cb, onError) {
      return watchDoc<Meetup>(() => (idOk(mid) ? at.meetup(mid) : null), cb, onError)
    },
    myMeetups() {
      return attempt(async () => {
        const id = uid()
        const snap = await getDocs(query(at.meetups(), where('host', '==', id)))
        return snap.docs.map(d => d.data() as Meetup).sort(newestFirst)
      })
    },
    watchGoing(mid, cb, onError) {
      return watchQuery<MeetupGoing>(() => {
        uid()
        if (!idOk(mid)) throw new SocialError('not-found')
        return at.going(mid)
      }, list => cb(list.sort(byAt)), onError)
    },
    setGoing(mid, on) {
      return attempt(async () => {
        const id = uid()
        if (!idOk(mid) || !(await getDoc(at.meetup(mid))).exists()) throw new SocialError('not-found')
        const ref = doc(at.going(mid), id)
        if (on) await setDoc(ref, goingDoc(meRef(), Date.now()))
        else await deleteDoc(ref)
      })
    },

    // ---------- plan links ----------
    createShare(s) {
      return attempt(async () => {
        uid()
        if (String(s.json ?? '').length >= MAX_PLAN_JSON) throw new SocialError('invalid')
        const share = shareDoc(s, socialToken(), meRef(), Date.now())
        await setDoc(at.share(share.id), share)
        return share
      })
    },
    getShare(sid) {
      return attempt(async () => (idOk(sid) ? read<Share>(at.share(sid)) : null))
    },
    revokeShare(sid) {
      return attempt(async () => {
        const id = uid()
        const s = idOk(sid) ? await read<Share>(at.share(sid)) : null
        if (!s) return
        if (s.owner !== id) throw new SocialError('denied')
        await updateDoc(at.share(sid), { revoked: true, json: '' })
      })
    },
    myShares() {
      return attempt(async () => {
        const id = uid()
        const snap = await getDocs(query(at.shares(), where('owner', '==', id)))
        return snap.docs.map(d => d.data() as Share).filter(s => !s.revoked).sort(newestFirst)
      })
    },

    close() {
      for (const u of [...subs]) u()
      subs.clear()
    },
  }

  /** A part of a group trip (votes, who's in, statuses), for a live read. */
  function partOf(gid: string, part: TripPart): Query {
    uid()
    if (!idOk(gid)) throw new SocialError('denied')
    return at.part(gid, part)
  }

  /** Your own vote or answer for a stop of a group trip (`${stopId}__${uid}`). */
  function mineIn(gid: string, part: 'votes' | 'rsvps', stopId: string): DocumentReference {
    if (!idOk(gid)) throw new SocialError('denied')
    const key = `${stopId}__${uid()}`
    if (!stopId || !idOk(key)) throw new SocialError('invalid')
    return doc(at.part(gid, part), key)
  }

  return b
}
