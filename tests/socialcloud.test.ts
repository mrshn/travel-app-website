import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SocialError } from '../app/lib/social/api'
import {
  BATCH_WRITES, FIELDS, NEEDS, cardDoc, chunks, commentDoc, feedDoc, friendshipDoc, goingDoc, groupDoc, groupMetaDoc, idOk,
  inboxDoc, inviteDoc, meetupDoc, meetupPatch, messageDoc, nextProfile, pointerDoc, postDoc, profileDoc, requestDoc, rsvpDoc,
  sceneOf, shareDoc, socialErrorOf, statusDoc, voteDoc,
} from '../app/lib/social/firestoreDocs'
import type { PersonRef } from '../shared/types/social'

// The Firestore backend writes documents the rules accept: the same field lists on both sides, every field a document
// needs, nothing undefined. The rules themselves only run on the emulators (tests/e2e/social-cloud.e2e.mjs, in CI);
// here they are read as text, for the lists and a light check of their syntax.

const RULES = readFileSync(new URL('../firebase/firestore.rules', import.meta.url), 'utf8')
const STORAGE_RULES = readFileSync(new URL('../firebase/storage.rules', import.meta.url), 'utf8')

/** The lists the rules' `<name>Fields()` and `<name>Needs()` functions return. */
function ruleLists(kind: 'Fields' | 'Needs'): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  const re = new RegExp(`function (\\w+)${kind}\\(\\) \\{\\s*return \\[([^\\]]*)\\];\\s*\\}`, 'g')
  for (const m of RULES.matchAll(re)) out[m[1]!] = [...m[2]!.matchAll(/'([^']*)'/g)].map(x => x[1]!)
  return out
}

const ME: PersonRef = { uid: 'uAlice', name: 'Alice', photo: null }
const AT = 1_760_000_000_000

/** Every key of `o` (deep): none undefined, and the top level within `fields` and holding `needs`. */
function fits(o: object, name: keyof typeof FIELDS) {
  const keys = Object.keys(o)
  const needs: readonly string[] = (NEEDS as Record<string, readonly string[]>)[name] ?? FIELDS[name]
  expect(keys.filter(k => !(FIELDS[name] as readonly string[]).includes(k)), `${name}: fields the rules refuse`).toEqual([])
  expect(needs.filter(k => !keys.includes(k)), `${name}: fields the rules need`).toEqual([])
  expect(JSON.stringify(o), `${name}: undefined inside`).toBe(JSON.stringify(JSON.parse(JSON.stringify(o))))
  const walk = (v: unknown): void => {
    if (v === undefined) throw new Error(`${name}: undefined value`)
    if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x)
  }
  walk(o)
}

describe('the documents and the rules agree', () => {
  it('has the same field lists as the rules', () => {
    const fields = ruleLists('Fields')
    const needs = ruleLists('Needs')
    for (const name of Object.keys(FIELDS) as (keyof typeof FIELDS)[]) {
      expect(fields[name], `rules ${name}Fields()`).toEqual([...FIELDS[name]])
      const want = (NEEDS as Record<string, readonly string[]>)[name]
      if (want) expect(needs[name], `rules ${name}Needs()`).toEqual([...want])
      else expect(needs[name], `rules ${name}Needs() (it needs every field)`).toBeUndefined()
    }
    for (const name of Object.keys(fields)) expect(Object.keys(FIELDS), `${name}Fields() in the rules only`).toContain(name)
  })

  it('builds every document with exactly what the rules take, at its smallest and its fullest', () => {
    const scene = { scene: 'skyline', tod: 'sunset' as const }
    fits(profileDoc(nextProfile(null, {}, ME, AT)), 'profile')
    fits(profileDoc({ uid: 'u', name: 'A', photo: 'https://x/p.jpg', handle: 'ana', bio: 'b', homeCity: 'c', updatedAt: AT }), 'profile')
    fits(cardDoc('u', { showTrips: false, trips: [{ title: 'Rome', destination: 'Rome', start: '2026-10-08', end: '2026-10-12' }] }, AT), 'card')
    fits(cardDoc('u', { showTrips: true, trips: [{ title: 'Rome', destination: 'Rome', start: '2026-10-08', end: '2026-10-12', cover: scene }] }, AT), 'card')
    fits(inviteDoc({ kind: 'friend' }, 'tok', ME, AT), 'invite')
    fits(inviteDoc({ kind: 'friend', trip: 'g', role: 'editor', tripTitle: 'Rome' }, 'tok', ME, AT), 'invite')
    fits(inviteDoc({ kind: 'trip', trip: 'g', role: 'viewer', tripTitle: 'Rome', tripDestination: 'Rome', tripStart: '2026-10-08', tripEnd: '2026-10-12', tripCover: scene }, 'tok', ME, AT), 'invite')
    fits(friendshipDoc('b', 'a', 'request', AT), 'friendship')
    fits(requestDoc(ME, 'uBob', AT), 'request')
    const small = postDoc({ kind: 'moment', text: '' }, 'p1', ME, ['uAlice'], AT)
    const full = postDoc({ kind: 'stop', text: 'Hi', photo: 'https://x/p.jpg', trip: { title: 'Rome', destination: 'Rome', start: 'a', end: 'b' }, place: { name: 'Pantheon', lat: 41.9, lng: 12.47 }, link: '/m/x', recap: '3 stops' }, 'p2', ME, ['uAlice', 'uBob'], AT)
    fits(small, 'post')
    fits(full, 'post')
    fits(full.trip!, 'postTrip')
    fits(full.place!, 'postPlace')
    fits(postDoc({ kind: 'moment', text: 'x', trip: { title: 'T', destination: 'D' }, place: { name: 'P' }, photo: '' }, 'p3', ME, [], AT).trip!, 'postTrip')
    fits(feedDoc(small), 'feed')
    fits(feedDoc(full), 'feed')
    fits(commentDoc('p1', 'c1', ME, 'Nice', AT), 'comment')
    fits(inboxDoc({ kind: 'like', text: 'liked your post' }, 'i1', ME, AT), 'inbox')
    fits(inboxDoc({ kind: 'trip-invite', text: 'invited you', link: '/j/x', ref: 'g' }, 'i2', ME, AT), 'inbox')
    fits(pointerDoc({ gid: 'g', localId: 'rome', role: 'owner', title: 'Rome', at: AT }), 'pointer')
    const g = groupDoc({ id: 'g', title: 'Rome', destination: 'Rome', start: 'a', end: 'b', cover: scene, json: '{}', updatedAt: AT }, ME, AT)
    fits(g, 'group')
    fits(g.people[ME.uid]!, 'person')
    fits(g.cover, 'scene')
    fits(messageDoc({ kind: 'text', text: 'Hi' }, 'm1', ME, AT), 'message')
    const where = messageDoc({ kind: 'location', text: '', image: 'https://x', stopId: 's', stopTitle: 'S', stopWhen: 'Fri', place: { lat: 1, lng: 2, acc: 5, name: 'Here' } }, 'm2', ME, AT)
    fits(where, 'message')
    fits(where.place!, 'pin')
    fits(voteDoc('s', 'u', 'c', AT), 'vote')
    fits(rsvpDoc('s', 'u', 'maybe', AT), 'rsvp')
    fits(statusDoc({ kind: 'late', text: 'Running late' }, 'u', AT), 'status')
    fits(statusDoc({ kind: 'at', text: 'At Pantheon', stopId: 's', place: { lat: 1, lng: 2 } }, 'u', AT), 'status')
    const meet = meetupDoc({ title: 'Vatican', note: '', place: null, start: '2026-10-09T08:00:00+02:00', timezone: 'Europe/Rome' }, 'm', ME, AT)
    fits(meet, 'meetup')
    const meet2 = meetupDoc({ title: 'Vatican', note: 'Anyone?', place: { name: 'Vatican', lat: 1, lng: 2, query: 'q' }, start: 's', timezone: 'z', destination: 'Rome', tripTitle: 'Rome' }, 'm', ME, AT)
    fits(meet2, 'meetup')
    fits(meet2.place!, 'meetupPlace')
    fits(goingDoc(ME, AT), 'going')
    fits(shareDoc({ title: 'Rome', destination: 'Rome', start: 'a', end: 'b', cover: scene, days: 5, json: '{}' }, 's', ME, AT), 'share')
  })

  it('keeps nothing of a trip on a friend invite, and only the meta of a plan write', () => {
    expect(Object.keys(inviteDoc({ kind: 'friend', trip: 'g', role: 'editor' }, 't', ME, AT)).sort()).toEqual(['createdAt', 'from', 'fromName', 'fromPhoto', 'kind', 'token'])
    expect(groupMetaDoc({ title: 'R', destination: 'D', start: 'a', end: 'b', cover: { scene: 's', tod: 'day', extra: 1 } as never })).toEqual({ title: 'R', destination: 'D', start: 'a', end: 'b', cover: { scene: 's', tod: 'day' } })
    expect(sceneOf(undefined)).toEqual({ scene: '', tod: '' })
  })

  it('makes friendships and requests with the ids the rules expect', () => {
    expect(friendshipDoc('zed', 'amy', 'tok', AT)).toEqual({ id: 'amy_zed', members: ['amy', 'zed'], via: 'tok', createdAt: AT })
    expect(requestDoc(ME, 'uBob', AT).id).toBe('uAlice_uBob')
    expect(postDoc({ kind: 'moment', text: 'x' }, 'p', ME, ['uAlice'], AT).likes).toEqual({})
    expect(feedDoc(postDoc({ kind: 'moment', text: 'x' }, 'p', ME, ['uAlice'], AT))).not.toHaveProperty('audience')
  })

  it('changes a meetup field by field, leaving fields given as undefined as they are (as memory.ts does)', () => {
    expect(meetupPatch({ cancelled: true })).toEqual({ cancelled: true })
    expect(meetupPatch({ title: 'New', destination: undefined, place: null })).toEqual({ title: 'New', place: null })
    expect(meetupPatch({ title: undefined, note: 'n', place: { name: 'P', lat: 1, lng: 2, extra: 3 } as never })).toEqual({ note: 'n', place: { name: 'P', lat: 1, lng: 2 } })
  })

  it('keeps your profile as memory.ts does', () => {
    const cur = { uid: 'uAlice', name: 'Alice', photo: 'p', handle: 'alice', bio: 'Hi', updatedAt: 1 }
    expect(nextProfile(cur, { bio: '' }, ME, AT)).toEqual({ uid: 'uAlice', name: 'Alice', photo: 'p', handle: 'alice', updatedAt: AT })
    expect(nextProfile(null, { name: '  ' }, ME, AT).name).toBe('Traveller')
    expect(nextProfile(cur, { photo: null }, ME, AT).photo).toBeNull()
  })
})

describe('helpers', () => {
  it('batches writes ten at a time', () => {
    expect(BATCH_WRITES).toBe(10)
    expect(chunks(Array.from({ length: 23 }, (_, i) => i)).map(c => c.length)).toEqual([10, 10, 3])
    expect(chunks([])).toEqual([])
  })

  it('knows which ids Firestore takes', () => {
    for (const ok of ['abc', 'Ab3_x-y', 'a.b']) expect(idOk(ok)).toBe(true)
    for (const bad of ['', 'a/b', '.', '..', '__x__', 7, null, 'x'.repeat(701)]) expect(idOk(bad)).toBe(false)
  })

  it('turns Firebase errors into SocialErrors', () => {
    const fe = (code: string, message = '') => Object.assign(new Error(message), { code })
    expect(socialErrorOf(fe('permission-denied'), true).code).toBe('denied')
    expect(socialErrorOf(fe('permission-denied'), false).code).toBe('auth')
    expect(socialErrorOf(fe('storage/unauthorized'), true).code).toBe('denied')
    expect(socialErrorOf(fe('unauthenticated'), true).code).toBe('auth')
    expect(socialErrorOf(fe('not-found'), true).code).toBe('not-found')
    expect(socialErrorOf(fe('storage/object-not-found'), true).code).toBe('not-found')
    expect(socialErrorOf(fe('unavailable'), true).code).toBe('offline')
    expect(socialErrorOf(fe('failed-precondition', 'Failed to get document because the client is offline.'), true).code).toBe('offline')
    expect(socialErrorOf(fe('failed-precondition', 'The query requires an index.'), true).code).toBe('unknown')
    expect(socialErrorOf(fe('invalid-argument'), true).code).toBe('invalid')
    expect(socialErrorOf(fe('internal'), true).code).toBe('unknown')
    expect(socialErrorOf(fe('internal'), true, true).code).toBe('offline')
    expect(socialErrorOf(new Error('boom'), true).code).toBe('unknown')
    const own = new SocialError('taken')
    expect(socialErrorOf(own, true)).toBe(own)
    expect(socialErrorOf(fe('permission-denied'), true)).toBeInstanceOf(SocialError)
  })
})

// ---------- a light check of the rules' syntax (the emulators compile them for real in CI) ----------

/** The rules without comments and strings (so brackets and names inside them don't count). */
function code(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '').replace(/'(?:[^'\\]|\\.)*'/g, '\'\'')
}

const BUILTIN = new Set([
  'get', 'exists', 'getAfter', 'existsAfter', 'debug', 'int', 'float', 'string', 'bool', 'path', 'duration', 'timestamp', 'latlng',
  'hashing', 'math', 'if', 'function', 'match', 'service',
])

describe('the rules, as text', () => {
  for (const [name, src] of [['firestore.rules', RULES], ['storage.rules', STORAGE_RULES]] as const) {
    it(`${name}: brackets balance and statements end`, () => {
      const c = code(src)
      const stack: string[] = []
      const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
      for (const ch of c) {
        if ('([{'.includes(ch)) stack.push(ch)
        else if (ch in pairs) expect(stack.pop(), `unbalanced ${ch}`).toBe(pairs[ch])
      }
      expect(stack).toEqual([])
      // Every allow and return statement ends with a semicolon before the next statement starts.
      for (const stmt of c.split(/(?=\ballow\b|\breturn\b|\bfunction\b|\bmatch\b|\})/)) {
        if (/^\s*(allow|return)\b/.test(stmt)) expect(stmt.trimEnd().endsWith(';'), stmt.slice(0, 80)).toBe(true)
      }
      expect(src.includes(String.fromCharCode(0x2014)), 'an em dash').toBe(false)
    })
  }

  it('firestore.rules: every function called is defined, with as many arguments as it takes', () => {
    const c = code(RULES)
    const defined = new Map<string, number>()
    for (const m of c.matchAll(/function (\w+)\(([^)]*)\)/g)) {
      const params = m[2]!.trim() ? m[2]!.split(',').length : 0
      expect(defined.has(m[1]!) && defined.get(m[1]!) !== params, `${m[1]} defined twice differently`).toBe(false)
      defined.set(m[1]!, params)
    }
    for (const m of c.matchAll(/(^|[^.\w$])(\w+)\(/g)) {
      const fn = m[2]!
      if (BUILTIN.has(fn) || /^function$/.test(fn)) continue
      // A definition, not a call.
      const before = c.slice(Math.max(0, m.index! - 10), m.index! + m[1]!.length)
      if (/function\s*$/.test(before)) continue
      expect(defined.has(fn), `${fn}() is called but not defined`).toBe(true)
      // Count its arguments: top-level commas up to the matching bracket.
      let depth = 0
      let args = 0
      let any = false
      for (let i = m.index! + m[0].length; i < c.length; i++) {
        const ch = c[i]!
        if ('([{'.includes(ch)) depth++
        else if (')]}'.includes(ch)) {
          if (depth === 0) break
          depth--
        }
        else if (ch === ',' && depth === 0) args++
        if (!/\s/.test(ch)) any = true
      }
      expect(any ? args + 1 : 0, `${fn}() takes ${defined.get(fn)} arguments`).toBe(defined.get(fn))
    }
  })

  it('firestore.rules: keeps the items rule, uses no let (the rules call functions instead) and denies by default', () => {
    expect(RULES).toContain(`    match /users/{uid}/items/{item} {
      allow read: if isOwner(uid);
      allow write: if isOwner(uid)
        && request.resource.data.keys().hasOnly(['kind', 'ref', 'json', 'updatedAt', 'deleted'])`)
    expect(code(RULES)).not.toMatch(/\blet\b/)
    expect(code(RULES)).not.toMatch(/\{document=\*\*\}/)
    // Only the public reads of links are open to everyone.
    const open = [...code(RULES).matchAll(/allow (\w+(?:, \w+)*): if true;/g)].map(m => m[1])
    expect(open).toEqual(['get', 'get', 'get'])
  })
})
