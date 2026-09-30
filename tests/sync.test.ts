import { afterEach, describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import { decide, isPristine, jsonHash, mergeProgress, mergeRecords, type CloudItem, type Decision, type Known } from '../shared/utils/sync'
import { costLegacyId, costSummary } from '../shared/utils/costs'
import { emptyProgress } from '../shared/utils/plan'
import type { Expense, PlaceStamp, Trip, TripProgress } from '../shared/types/trip'

const P = (f: (p: TripProgress) => void) => {
  const p = emptyProgress()
  f(p)
  return p
}
const cloud = (json: string, updatedAt: number, deleted = false): CloudItem => ({ kind: 'progress', ref: 'rome', json, updatedAt, deleted })

describe('merging progress from two devices', () => {
  it('keeps everything and the newer version of shared things', () => {
    const a = P((p) => {
      p.stops.vatican = { status: 'done', at: '2026-10-09T09:00:00Z' }
      p.stops.pantheon = { status: 'skipped', at: '2026-10-09T15:00:00Z' }
      p.feedback.vatican = { rating: 4, photos: ['ph-a'], updatedAt: '2026-10-09T10:00:00Z' }
      p.bookings.hostel = true
    })
    const b = P((p) => {
      p.stops.pantheon = { status: 'done', at: '2026-10-09T17:00:00Z' }
      p.feedback.vatican = { rating: 5, note: 'wow', photos: ['ph-b'], updatedAt: '2026-10-09T11:00:00Z' }
      p.packing.adapter = true
      p.variant = 'sun'
    })
    const m = mergeProgress(a, b)
    expect(m.stops.vatican?.status).toBe('done')
    expect(m.stops.pantheon?.status).toBe('done')
    expect(m.feedback.vatican).toMatchObject({ rating: 5, note: 'wow' })
    expect(m.feedback.vatican?.photos?.sort()).toEqual(['ph-a', 'ph-b'])
    expect(m.bookings.hostel).toBe(true)
    expect(m.packing.adapter).toBe(true)
    expect(m.variant).toBe('sun')
  })
})

describe('deciding what to sync', () => {
  const one = JSON.stringify(P(p => (p.bookings.hostel = true)))
  const two = JSON.stringify(P(p => (p.bookings.vatican = true)))
  const empty = JSON.stringify(emptyProgress())

  it('uploads new things and leaves agreed things alone', () => {
    expect(decide('progress', one, undefined, undefined)).toEqual({ do: 'upload' })
    expect(decide('progress', one, cloud(one, 5), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'nothing' })
    expect(decide('progress', two, cloud(one, 5), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'upload' })
  })

  it('takes newer cloud copies when nothing changed here', () => {
    expect(decide('progress', one, cloud(two, 9), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'apply' })
    expect(decide('progress', undefined, cloud(two, 9), undefined)).toEqual({ do: 'apply' })
  })

  it('merges when both sides changed', () => {
    const d = decide('progress', two, cloud(one, 9), { hash: jsonHash(empty), updatedAt: 5 })
    expect(d.do).toBe('merge')
    const merged = JSON.parse((d as { json: string }).json) as TripProgress
    expect(merged.bookings).toEqual({ hostel: true, vatican: true })
  })

  it('spreads deletions both ways without losing your changes', () => {
    // deleted here since we agreed
    expect(decide('progress', undefined, cloud(one, 5), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'tombstone' })
    // deleted elsewhere, untouched here
    expect(decide('progress', one, cloud(one, 9, true), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'delete-local' })
    // deleted elsewhere, but changed here: keep it
    expect(decide('progress', two, cloud(one, 9, true), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'upload' })
    // never synced, nothing of yours here: follow the deletion
    expect(decide('progress', empty, cloud(one, 9, true), undefined)).toEqual({ do: 'delete-local' })
    expect(isPristine('progress', empty)).toBe(true)
  })

  it('picks the newer trip when both changed', () => {
    const t = (u: string, title: string) => JSON.stringify({ id: 'x', title, updatedAt: u, edited: true })
    const localT = t('2026-10-02T00:00:00Z', 'mine')
    const remoteT: CloudItem = { kind: 'trip', ref: 'x', json: t('2026-10-01T00:00:00Z', 'theirs'), updatedAt: 9 }
    expect(decide('trip', localT, remoteT, undefined)).toEqual({ do: 'upload' })
    expect(decide('trip', t('2026-09-01T00:00:00Z', 'old'), remoteT, undefined)).toEqual({ do: 'apply' })
  })

  it('never lets a fresh copy of a trip replace the one you changed', () => {
    // A new phone seeds the trip "now", so its copy looks newer than your edited one in the cloud.
    const fresh = JSON.stringify({ id: 'x', title: 'seed', updatedAt: '2026-10-05T00:00:00Z', edited: false })
    const yours: CloudItem = { kind: 'trip', ref: 'x', json: JSON.stringify({ id: 'x', title: 'mine', updatedAt: '2026-10-01T00:00:00Z', edited: true }), updatedAt: 9 }
    expect(decide('trip', fresh, yours, undefined)).toEqual({ do: 'apply' })
    // …and the other way round: your changes here beat an untouched copy in the cloud.
    const untouched: CloudItem = { kind: 'trip', ref: 'x', json: fresh, updatedAt: 9 }
    expect(decide('trip', yours.json, untouched, undefined)).toEqual({ do: 'upload' })
  })
})

/* ---------- costs and stamps (spec 5.6, 9.7) ---------- */

const trip = romeTrip as Trip
const T = (hhmm: string) => `2026-10-09T${hhmm}:00.000Z`
const cost = (id: string, amount: number, updatedAt: string, more: Partial<Expense> = {}): Expense =>
  ({ id, amount, currency: 'EUR', cat: 'food', dayId: 'fri', at: T('10:00'), updatedAt, ...more })
const stampRec = (on: boolean | null, updatedAt: string): PlaceStamp => ({ on, at: T('10:00'), updatedAt })
const withRecords = (expenses: Expense[] = [], stamps: Record<string, PlaceStamp> = {}) => P((p) => {
  for (const e of expenses) p.expenses![e.id] = e
  p.stamps = { ...stamps }
})
const both = <T extends { updatedAt: string }>(a: Record<string, T>, b: Record<string, T>) => {
  const ab = mergeRecords(a, b)
  expect(JSON.stringify(mergeRecords(b, a)), 'merge(a, b) and merge(b, a) differ').toBe(JSON.stringify(ab))
  return ab
}

describe('mergeRecords', () => {
  it('keeps both devices\' records and the newer copy of a shared one (D1)', () => {
    const a = { x: cost('x', 5, T('10:00')), s: cost('s', 3, T('10:00')) }
    const b = { y: cost('y', 7, T('10:05')), s: cost('s', 4, T('11:00')) }
    const m = both(a, b)
    expect(Object.keys(m)).toEqual(['s', 'x', 'y'])
    expect(m.s!.amount).toBe(4)
  })

  it('lets a newer tombstone beat an older live copy, and a newer live copy beat an older tombstone (D1)', () => {
    const live = cost('x', 5, T('10:00'))
    const dead = { ...live, deleted: true as const, updatedAt: T('10:01') }
    expect(both({ x: live }, { x: dead }).x!.deleted).toBe(true)
    const back = { ...live, amount: 6, updatedAt: T('10:02') }
    expect(both({ x: dead }, { x: back }).x).toEqual(back)
  })

  it('lets a deletion win a tie, both ways (D1)', () => {
    const live = cost('x', 5, T('10:00'))
    const dead = { ...live, deleted: true as const }
    expect(both({ x: live }, { x: dead }).x).toEqual(dead)
    expect(both({ p: stampRec(true, T('10:00')) }, { p: stampRec(false, T('10:00')) }).p!.on).toBe(false)
    expect(both({ p: stampRec(null, T('10:00')) }, { p: stampRec(false, T('10:00')) }).p!.on).toBe(false)
  })

  it('breaks other ties the same way on both devices', () => {
    const x = cost('x', 5, T('10:00'))
    const y = cost('x', 6, T('10:00'), { note: 'two coffees' })
    expect(both({ x }, { x: y }).x).toEqual(mergeRecords({ x: y }, { x }).x)
    expect(both({ p: stampRec(true, T('10:00')) }, { p: stampRec(null, T('10:00')) }).p).toEqual(mergeRecords({ p: stampRec(null, T('10:00')) }, { p: stampRec(true, T('10:00')) }).p)
  })

  it('changes nothing when merged with itself (D1)', () => {
    const a = { x: cost('x', 5, T('10:00')), y: cost('y', 7, T('10:00'), { deleted: true }) }
    expect(mergeRecords(a, a)).toEqual(a)
    const m = mergeRecords(a, { z: cost('z', 1, T('09:00')) })
    expect(mergeRecords(m, m)).toEqual(m)
    expect(mergeRecords(m, a)).toEqual(m)
  })

  it('compares times as times, not text (mixed ISO formats)', () => {
    // 10:00+02:00 is 08:00 UTC: older, though its text sorts after "09:00Z".
    const early = cost('x', 5, '2026-10-09T10:00:00+02:00')
    const late = cost('x', 6, '2026-10-09T09:00:00Z')
    expect(both({ x: early }, { x: late }).x!.amount).toBe(6)
    // The same instant written two ways is a tie: the deletion wins.
    const a = cost('x', 5, '2026-10-09T09:00:00.000Z')
    const b = cost('x', 5, '2026-10-09T09:00:00Z', { deleted: true })
    expect(both({ x: a }, { x: b }).x!.deleted).toBe(true)
    // An unreadable time loses to any real one.
    expect(both({ x: cost('x', 5, 'yesterday') }, { x: cost('x', 6, T('00:00')) }).x!.amount).toBe(6)
    // A time stored as milliseconds still counts as a time.
    const ms = Date.parse(T('10:05')) as unknown as string
    expect(both({ x: cost('x', 5, ms) }, { x: cost('x', 6, T('10:00')) }).x!.amount).toBe(5)
  })

  describe('with the device in another time zone', () => {
    const saved = process.env.TZ
    afterEach(() => {
      process.env.TZ = saved
    })
    it.each(['Europe/Istanbul', 'America/New_York', 'Asia/Tokyo'])('reads a time without a zone as UTC (%s)', (zone) => {
      process.env.TZ = zone
      const noZone = cost('x', 5, '2026-10-09T09:30:00')
      const utc = cost('x', 6, '2026-10-09T09:00:00Z')
      expect(both({ x: noZone }, { x: utc }).x!.amount).toBe(5)
    })
  })

  it('takes missing maps and ignores entries that are not records', () => {
    const x = cost('x', 5, T('10:00'))
    expect(mergeRecords(undefined, { x })).toEqual({ x })
    expect(mergeRecords({ x }, undefined)).toEqual({ x })
    expect(mergeRecords()).toEqual({})
    const junk = JSON.parse('{"a": null, "b": [1], "c": 3, "__proto__": {"polluted": true}}') as Record<string, Expense>
    expect(mergeRecords(junk, { x })).toEqual({ x })
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  it('is a join: any order and grouping of merges gives the same records', () => {
    let seed = 7
    const rnd = () => {
      seed = (seed + 0x6D2B79F5) | 0
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    const pick = <X>(xs: X[]) => xs[Math.floor(rnd() * xs.length)]!
    const device = () => {
      const r: Record<string, Expense> = {}
      for (const id of ['a', 'b', 'c', 'd']) {
        if (rnd() < 0.3) continue
        r[id] = cost(id, pick([1, 2, 3]), pick([T('10:00'), T('10:01'), '2026-10-09T12:00:00+02:00']), rnd() < 0.3 ? { deleted: true } : {})
      }
      return r
    }
    for (let i = 0; i < 300; i++) {
      const [a, b, c] = [device(), device(), device()]
      const left = JSON.stringify(mergeRecords(mergeRecords(a, b), c))
      expect(JSON.stringify(mergeRecords(a, mergeRecords(b, c)))).toBe(left)
      expect(JSON.stringify(mergeRecords(c, mergeRecords(b, a)))).toBe(left)
      expect(JSON.stringify(mergeRecords(mergeRecords(a, b), mergeRecords(a, b)))).toBe(JSON.stringify(mergeRecords(a, b)))
    }
  })
})

describe('merging costs and stamps from two devices', () => {
  it('keeps both devices\' costs and stamps (D1)', () => {
    const a = withRecords([cost('c-a', 5, T('10:00'))], { 'sight-pantheon': stampRec(true, T('10:00')) })
    const b = withRecords([cost('c-b', 7, T('10:01'))], { 'sight-pantheon': stampRec(false, T('10:05')), 'food-giolitti': stampRec(true, T('10:02')) })
    const m = mergeProgress(a, b)
    expect(Object.keys(m.expenses!)).toEqual(['c-a', 'c-b'])
    expect(m.stamps).toEqual({ 'food-giolitti': stampRec(true, T('10:02')), 'sight-pantheon': stampRec(false, T('10:05')) })
    expect(mergeProgress(b, a).expenses).toEqual(m.expenses)
    expect(mergeProgress(b, a).stamps).toEqual(m.stamps)
    expect(mergeProgress(m, m)).toEqual(m)
  })

  it('adds, deletes and edits on two phones offline and agrees (D6, as a unit test)', () => {
    const a = withRecords([cost('c-a', 5, T('10:00'))])
    const b = withRecords([cost('c-b', 7, T('10:01'))])
    const synced = mergeProgress(a, b)
    expect(costSummary(trip, synced).all).toBe(12)
    const a2 = structuredClone(synced)
    a2.expenses!['c-a'] = { ...a2.expenses!['c-a']!, deleted: true, updatedAt: T('11:00') }
    const b2 = structuredClone(synced)
    b2.expenses!['c-b'] = { ...b2.expenses!['c-b']!, amount: 8, updatedAt: T('11:01') }
    for (const m of [mergeProgress(a2, b2), mergeProgress(b2, a2)]) {
      expect(costSummary(trip, m).all).toBe(8)
      expect(m.expenses!['c-a']!.deleted).toBe(true)
    }
  })

  it('keeps costs and stamps when the other copy is an older save without them', () => {
    const a = withRecords([cost('c-a', 5, T('10:00'))], { 'sight-pantheon': stampRec(true, T('10:00')) })
    const old = JSON.parse(JSON.stringify(P(p => (p.bookings.hostel = true)))) as TripProgress
    delete old.expenses
    delete old.stamps
    for (const m of [mergeProgress(a, old), mergeProgress(old, a)]) {
      expect(Object.keys(m.expenses!)).toEqual(['c-a'])
      expect(Object.keys(m.stamps!)).toEqual(['sight-pantheon'])
      expect(m.bookings.hostel).toBe(true)
    }
  })

  it('keeps top-level fields it does not know, the second copy winning (D2)', () => {
    const a = P(p => Object.assign(p, { future: { x: 1 }, mine: 'a' }))
    const b = P(p => Object.assign(p, { future: { x: 2 } }))
    expect((mergeProgress(a, emptyProgress()) as unknown as Record<string, unknown>).future).toEqual({ x: 1 })
    expect((mergeProgress(emptyProgress(), a) as unknown as Record<string, unknown>).future).toEqual({ x: 1 })
    const m = mergeProgress(a, b) as unknown as Record<string, unknown>
    expect(m.future).toEqual({ x: 2 })
    expect(m.mine).toBe('a')
  })

  it('keeps the newer local costs and stamps when an older backup is imported (D7)', () => {
    const local = withRecords([cost('c-a', 6, T('12:00'))], { 'sight-pantheon': stampRec(false, T('12:00')) })
    const backup = withRecords([cost('c-a', 5, T('10:00')), cost('c-old', 2, T('09:00'))], { 'sight-pantheon': stampRec(true, T('10:00')) })
    const m = mergeProgress(local, backup)
    expect(m.expenses!['c-a']!.amount).toBe(6)
    expect(m.expenses!['c-old']!.amount).toBe(2)
    expect(m.stamps!['sight-pantheon']!.on).toBe(false)
  })

  it('gives one record and one total when two devices edit the same old spend value (D8)', () => {
    const seed = () => P((p) => {
      p.feedback['vatican-museums-sistine-chapel'] = { rating: 4, spent: 12, updatedAt: T('08:00') }
      p.feedback['metro-a-termini-ottaviano'] = { spent: 25, updatedAt: T('08:00') }
    })
    const id = costLegacyId('stop', 'vatican-museums-sistine-chapel')
    const edit = (amount: number, at: string, more: Partial<Expense> = {}) => {
      const p = seed()
      p.expenses![id] = cost(id, amount, at, { cat: 'sights', stopId: 'vatican-museums-sistine-chapel', ...more })
      return p
    }
    const a = edit(13, T('11:00'))
    const b = edit(14, T('11:05'))
    for (const m of [mergeProgress(a, b), mergeProgress(b, a)]) {
      expect(Object.keys(m.expenses!)).toEqual([id])
      const s = costSummary(trip, m)
      expect(s.entries.filter(e => e.stopId === 'vatican-museums-sistine-chapel')).toHaveLength(1)
      expect(s.byDay.fri!.spent).toBe(39) // 25 + 14, never 12 + 13 + 14
      expect(s.all).toBe(39)
    }
    // One phone deletes the row while the other edits it earlier: the deletion wins, and the old 12 stays hidden.
    const del = edit(12, T('11:10'), { deleted: true })
    for (const m of [mergeProgress(del, b), mergeProgress(b, del)]) {
      expect(costSummary(trip, m).byDay.fri!.spent).toBe(25)
    }
  })

  it('compares the times of ticks, notes and feedback as times too', () => {
    const a = P(p => (p.stops.pantheon = { status: 'skipped', at: '2026-10-09T11:00:00+02:00' }))
    const b = P(p => (p.stops.pantheon = { status: 'done', at: '2026-10-09T09:30:00Z' }))
    expect(mergeProgress(a, b).stops.pantheon!.status).toBe('done')
    expect(mergeProgress(b, a).stops.pantheon!.status).toBe('done')
  })
})

describe('pristine progress (D3)', () => {
  const json = (f: (p: TripProgress) => void) => JSON.stringify(P(f))

  it('is pristine only with nothing of yours in it', () => {
    expect(isPristine('progress', JSON.stringify(emptyProgress()))).toBe(true)
    expect(isPristine('progress', JSON.stringify({ stops: {}, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {} }))).toBe(true)
    expect(isPristine('progress', json(p => (p.expenses!.x = cost('x', 5, T('10:00'), { deleted: true }))))).toBe(false)
    expect(isPristine('progress', json(p => (p.stamps!['sight-pantheon'] = stampRec(null, T('10:00')))))).toBe(false)
    expect(isPristine('progress', json(p => (p.variant = 'sun')))).toBe(false)
  })
})

describe('deciding what to sync, with costs and stamps', () => {
  const mine = JSON.stringify(withRecords([cost('c-a', 5, T('10:00'))]))
  /** What an older app version uploads after merging: it knows neither costs nor stamps. */
  const olderApp = (f: (p: TripProgress) => void) => {
    const p = P(f) as unknown as Record<string, unknown>
    delete p.expenses
    delete p.stamps
    return JSON.stringify(p)
  }

  it('merges instead of applying a newer copy that dropped both keys (D4)', () => {
    const theirs = olderApp(p => (p.stops.pantheon = { status: 'done', at: T('17:20') }))
    const d = decide('progress', mine, cloud(theirs, 9), { hash: jsonHash(mine), updatedAt: 5 })
    expect(d.do).toBe('merge')
    const merged = JSON.parse((d as { json: string }).json) as TripProgress
    expect(merged.expenses!['c-a']!.amount).toBe(5)
    expect(merged.stops.pantheon!.status).toBe('done')
    // Once both sides hold the merged copy, there is nothing left to do.
    const json = (d as { json: string }).json
    expect(decide('progress', json, cloud(json, 10), { hash: jsonHash(json), updatedAt: 10 })).toEqual({ do: 'nothing' })
  })

  it('does the same for a device that holds only stamps', () => {
    const stampsOnly = JSON.stringify(withRecords([], { 'sight-pantheon': stampRec(true, T('10:00')) }))
    const d = decide('progress', stampsOnly, cloud(olderApp(() => {}), 9), { hash: jsonHash(stampsOnly), updatedAt: 5 })
    expect(d.do).toBe('merge')
    expect((JSON.parse((d as { json: string }).json) as TripProgress).stamps!['sight-pantheon']!.on).toBe(true)
  })

  it('merges back a cost and a stamp that a newer copy lost on its way through an older app version', () => {
    // Phone A logged a cost and stamped a place, and synced. Phone B, still on the older app, merged an unsynced
    // tick: its merge dropped both maps. B then reloaded into this version, whose next edit saved them back
    // empty (useProgress: p.expenses ??= {}), with or without a cost of its own. A has not changed since.
    const a = JSON.stringify(withRecords([cost('c-a1', 12.5, T('08:00'))], { 'sight-pantheon': stampRec(true, T('08:00')) }))
    const fromB = (expenses: Record<string, Expense>) => {
      const p = JSON.parse(olderApp((q) => {
        q.packing.adapter = true
        q.stops.pantheon = { status: 'done', at: T('09:00') }
      })) as TripProgress
      return JSON.stringify({ ...p, expenses, stamps: {} })
    }
    const known = { hash: jsonHash(a), updatedAt: 2 }
    for (const theirs of [fromB({}), fromB({ 'c-b1': cost('c-b1', 4, T('09:05')) })]) {
      const d = decide('progress', a, cloud(theirs, 4), known)
      expect(d.do).toBe('merge')
      const m = JSON.parse((d as { json: string }).json) as TripProgress
      expect(m.expenses!['c-a1']!.amount).toBe(12.5)
      expect(m.stamps!['sight-pantheon']!.on).toBe(true)
      expect(m.stops.pantheon!.status).toBe('done')
      expect(m.packing.adapter).toBe(true)
      expect(Object.keys(m.expenses!)).toEqual(['c-a1', ...Object.keys((JSON.parse(theirs) as TripProgress).expenses!)])
    }
    // The same whichever maps the newer copy has: both empty, or only one of them.
    expect(decide('progress', mine, cloud(JSON.stringify(emptyProgress()), 9), { hash: jsonHash(mine), updatedAt: 5 }).do).toBe('merge')
    const onlyStamps = JSON.stringify({ ...JSON.parse(olderApp(() => {})), stamps: {} })
    expect(decide('progress', mine, cloud(onlyStamps, 9), { hash: jsonHash(mine), updatedAt: 5 }).do).toBe('merge')
  })

  it('merges back an edit or a deletion that the newer copy holds in an older version', () => {
    // After an older app version dropped the maps, a phone that had not seen A's latest changes put back the
    // versions it held. The ids are all there, but applying that copy would undo A's edit, deletion and removal.
    const a = JSON.stringify(withRecords(
      [cost('c-a', 6, T('11:00')), cost('c-x', 3, T('11:05'), { deleted: true })],
      { 'sight-pantheon': stampRec(false, T('11:10')) },
    ))
    const stale = JSON.stringify(withRecords(
      [cost('c-a', 5, T('10:00')), cost('c-x', 3, T('10:00'))],
      { 'sight-pantheon': stampRec(true, T('10:00')) },
    ))
    const d = decide('progress', a, cloud(stale, 9), { hash: jsonHash(a), updatedAt: 5 })
    expect(d.do).toBe('merge')
    const m = JSON.parse((d as { json: string }).json) as TripProgress
    expect(m.expenses!['c-a']!.amount).toBe(6)
    expect(m.expenses!['c-x']!.deleted).toBe(true)
    expect(m.stamps!['sight-pantheon']!.on).toBe(false)
    expect(costSummary(trip, m).all).toBe(6)
  })

  it('takes everything but costs and stamps from the newer copy when it merges them back', () => {
    // Nothing changed here since the last sync, so the newer copy's ticks and notes are the latest ones:
    // a stop unticked on the other phone stays unticked.
    const here = JSON.stringify(P((p) => {
      p.stops.pantheon = { status: 'done', at: T('09:00') }
      p.expenses!['c-a'] = cost('c-a', 5, T('10:00'))
    }))
    const theirs = olderApp(p => (p.dayNotes.fri = { note: 'Rain all afternoon', updatedAt: T('12:00') }))
    const d = decide('progress', here, cloud(theirs, 9), { hash: jsonHash(here), updatedAt: 5 })
    expect(d.do).toBe('merge')
    const json = (d as { json: string }).json
    const m = JSON.parse(json) as TripProgress
    expect(m.stops.pantheon).toBeUndefined()
    expect(m.dayNotes.fri!.note).toBe('Rain all afternoon')
    expect(m.expenses!['c-a']!.amount).toBe(5)
    // The other phone takes the merged copy as it is, and then there is nothing left to do.
    expect(decide('progress', theirs, cloud(json, 10), { hash: jsonHash(theirs), updatedAt: 9 })).toEqual({ do: 'apply' })
    expect(decide('progress', json, cloud(json, 10), { hash: jsonHash(json), updatedAt: 10 })).toEqual({ do: 'nothing' })
  })

  it('applies a newer copy that holds this device\'s costs and stamps at least as new, or when this device has none', () => {
    const known = { hash: jsonHash(mine), updatedAt: 5 }
    const newer = (f: (p: TripProgress) => void) => {
      const p = JSON.parse(mine) as TripProgress
      f(p)
      return JSON.stringify(p)
    }
    // The other phone ticked a stop, changed the cost later, deleted it later, or stamped a place.
    expect(decide('progress', mine, cloud(newer(p => (p.stops.pantheon = { status: 'done', at: T('17:20') })), 9), known)).toEqual({ do: 'apply' })
    expect(decide('progress', mine, cloud(newer(p => (p.expenses!['c-a'] = cost('c-a', 6, T('11:00')))), 9), known)).toEqual({ do: 'apply' })
    expect(decide('progress', mine, cloud(newer(p => (p.expenses!['c-a'] = cost('c-a', 5, T('11:00'), { deleted: true }))), 9), known)).toEqual({ do: 'apply' })
    expect(decide('progress', mine, cloud(newer(p => (p.stamps!['sight-pantheon'] = stampRec(false, T('11:00')))), 9), known)).toEqual({ do: 'apply' })
    // Nothing of this device's to lose.
    const plain = JSON.stringify(emptyProgress())
    expect(decide('progress', plain, cloud(olderApp(() => {}), 9), { hash: jsonHash(plain), updatedAt: 5 })).toEqual({ do: 'apply' })
    expect(decide('progress', undefined, cloud(olderApp(() => {}), 9), undefined)).toEqual({ do: 'apply' })
  })

  it('uploads from a never-synced device holding only a cost, facing a cloud tombstone (D5)', () => {
    expect(decide('progress', mine, cloud('', 9, true), undefined)).toEqual({ do: 'upload' })
    const stampsOnly = JSON.stringify(withRecords([], { 'sight-pantheon': stampRec(false, T('10:00')) }))
    expect(decide('progress', stampsOnly, cloud('', 9, true), undefined)).toEqual({ do: 'upload' })
    // With nothing of yours in it, the deletion still wins.
    expect(decide('progress', JSON.stringify(emptyProgress()), cloud('', 9, true), undefined)).toEqual({ do: 'delete-local' })
  })

  it('keeps both devices\' costs when both changed', () => {
    const theirs = JSON.stringify(withRecords([cost('c-b', 7, T('10:01'))]))
    const d = decide('progress', mine, cloud(theirs, 9), { hash: jsonHash(JSON.stringify(emptyProgress())), updatedAt: 5 })
    expect(d.do).toBe('merge')
    expect(Object.keys((JSON.parse((d as { json: string }).json) as TripProgress).expenses!)).toEqual(['c-a', 'c-b'])
  })
})

describe('phones syncing through the rollout (randomised, as useCloud.reconcile() does)', () => {
  /** A save from before costs: neither map. */
  const before = JSON.stringify({ stops: {}, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {} })
  /** An older app version's merge: it knows neither costs nor stamps, so both maps go. */
  const olderMerge = (a: TripProgress, b: TripProgress) => {
    const m = mergeProgress(a, b)
    delete m.expenses
    delete m.stamps
    return m
  }
  /** decide() of an older app version: nothing to keep, and its merge drops the maps. */
  const olderDecide = (local: string, remote: CloudItem, known: Known): Decision => {
    const changed = jsonHash(local) !== known.hash
    if (remote.updatedAt <= known.updatedAt) return changed ? { do: 'upload' } : { do: 'nothing' }
    if (!changed || jsonHash(local) === jsonHash(remote.json)) return { do: 'apply' }
    return { do: 'merge', json: JSON.stringify(olderMerge(JSON.parse(local) as TripProgress, JSON.parse(remote.json) as TripProgress)) }
  }
  interface Phone { app: 'old' | 'new', local: string, known: Known, online: boolean }

  function simulate(seed: number, apps: Phone['app'][], steps: number) {
    let s = seed
    const rnd = () => (s = (s * 48271) % 2147483647) / 2147483647
    const pick = <X>(xs: readonly X[]) => xs[Math.floor(rnd() * xs.length)]!
    let clock = 0
    const now = () => new Date(Date.UTC(2026, 9, 1) + ++clock * 1000).toISOString()
    let item = cloud(before, 1)
    const phones: Phone[] = apps.map(app => ({ app, local: before, known: { hash: jsonHash(before), updatedAt: 1 }, online: true }))
    /** The latest change of every cost and stamp: what every phone must end up with. */
    const latest = new Map<string, Expense | PlaceStamp>()

    // One reconcile, on a phone that sees the cloud copy as it is now.
    const sync = (ph: Phone) => {
      if (!ph.online) return
      const d = ph.app === 'new' ? decide('progress', ph.local, item, ph.known) : olderDecide(ph.local, item, ph.known)
      const write = (json: string) => {
        item = cloud(json, item.updatedAt + 1)
        ph.local = json
        ph.known = { hash: jsonHash(json), updatedAt: item.updatedAt }
      }
      if (d.do === 'upload') write(ph.local)
      else if (d.do === 'merge') write(d.json)
      else if (d.do === 'apply') {
        ph.local = item.json
        ph.known = { hash: jsonHash(item.json), updatedAt: item.updatedAt }
      }
    }
    // An edit. This version's edit() adds the maps first (useProgress: p.expenses ??= {}; p.stamps ??= {}).
    const edit = (ph: Phone, f: (p: TripProgress) => void) => {
      const p = JSON.parse(ph.local) as TripProgress
      if (ph.app === 'new') {
        p.expenses ??= {}
        p.stamps ??= {}
      }
      f(p)
      ph.local = JSON.stringify(p)
    }
    // Log, change, delete or bring back a cost; or stamp a place, take the stamp back or undo it.
    const record = (p: TripProgress) => {
      const t = now()
      if (rnd() < 0.3) {
        const id = pick(['sight-pantheon', 'food-pompi', 'photo-momo-staircase'])
        const st: PlaceStamp = { on: pick([true, false, null]), at: t, updatedAt: t }
        p.stamps![id] = st
        latest.set(`stamp ${id}`, st)
        return
      }
      const had = Object.values(p.expenses!)
      let e: Expense
      if (!had.length || rnd() < 0.4) {
        e = { id: `c-${clock}`, amount: 1 + Math.floor(rnd() * 20), currency: 'EUR', cat: 'food', at: t, updatedAt: t }
      }
      else {
        const was = { ...pick(had) }
        delete was.deleted
        e = rnd() < 0.5 ? { ...was, deleted: true, updatedAt: t } : { ...was, amount: 1 + Math.floor(rnd() * 20), updatedAt: t }
      }
      p.expenses![e.id] = e
      latest.set(`cost ${e.id}`, e)
    }

    for (let i = 0; i < steps; i++) {
      const ph = pick(phones)
      const op = rnd()
      if (op < 0.15) ph.online = !ph.online
      else if (op < 0.2) ph.app = 'new' // reloads into this version
      else if (op < 0.55) sync(ph)
      else if (op < 0.7) edit(ph, p => (p.stops[pick(['a', 'b', 'c'])] = { status: 'done', at: now() }))
      else if (ph.app === 'new') edit(ph, record)
    }
    // Every phone updates, comes online and settles.
    for (const ph of phones) Object.assign(ph, { app: 'new', online: true })
    for (let round = 0; round < 8; round++) phones.forEach(sync)
    return { json: item.json, phones, latest }
  }

  for (const apps of [['new', 'old', 'new'], ['old', 'new', 'old', 'new']] as Phone['app'][][]) {
    it(`keeps the latest change of every cost and stamp, and all phones agree (${apps.join(', ')})`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        const { json, phones, latest } = simulate(seed, apps, 150)
        const end = JSON.parse(json) as TripProgress
        for (const [key, rec] of latest) {
          const [map, id] = key.split(' ') as ['cost' | 'stamp', string]
          expect((map === 'cost' ? end.expenses : end.stamps)?.[id], `seed ${seed}: ${key}`).toEqual(rec)
        }
        for (const ph of phones) expect(ph.local, `seed ${seed}: a phone differs from the cloud`).toBe(json)
      }
    })
  }
})
