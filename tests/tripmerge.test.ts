import { describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import { mergeTrips, placedStops, stopKey, stopListKey, stopTombstone } from '../shared/utils/tripmerge'
import type { Stop, Trip } from '../shared/types/trip'

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T
const T0 = '2026-10-01T10:00:00.000Z'
const at = (min: number) => new Date(Date.parse(T0) + min * 60_000).toISOString()

function stop(id: string, start: number, extra: Partial<Stop> = {}): Stop {
  return { id, start, timeLabel: `${Math.floor(start / 60)}:00`, kind: 'sight', title: id, ...extra }
}

/** A small trip: two days, the second with a variant list that repeats a stop id of the first. */
function base(): Trip {
  return {
    id: 'g-test',
    title: 'Lisbon',
    destination: 'Lisbon',
    timezone: 'Europe/Lisbon',
    start: '2026-11-05',
    end: '2026-11-06',
    cover: { scene: 'skyline', tod: 'day' },
    currency: 'EUR',
    days: [
      { id: 'd1', date: '2026-11-05', num: 'V', label: 'Day 1', title: 'Alfama', cover: { scene: 'alley', tod: 'day' }, facts: [], stops: [stop('castle', 540), stop('lunch', 780, { kind: 'food' }), stop('tram', 900)] },
      {
        id: 'd2',
        date: '2026-11-06',
        num: 'VI',
        label: 'Day 2',
        title: 'Belem',
        cover: { scene: 'perspective', tod: 'day' },
        facts: [],
        stops: [stop('belem', 600), stop('pasteis', 720, { kind: 'food' })],
        variants: { alt: { title: 'Sintra instead', cover: { scene: 'lake', tod: 'day' }, stops: [stop('castle', 600), stop('sintra', 720)] } },
      },
    ],
    bookings: [{ id: 'castle-ticket', due: null, dueLabel: 'Any time', title: 'Castle ticket' }],
    packing: ['Passport', 'Adapter'],
    createdAt: T0,
    updatedAt: T0,
  }
}

const titles = (t: Trip, dayId: string, list = '') => {
  const d = t.days.find(x => x.id === dayId)!
  return (list ? d.variants![list]!.stops : d.stops).map(s => s.title)
}

/** Both ways round give the same plan (the local-only `group` aside). */
function both(a: Trip, b: Trip): Trip {
  const ab = mergeTrips(a, b)
  const ba = mergeTrips(b, a)
  const strip = (t: Trip) => JSON.stringify({ ...t, group: undefined })
  expect(strip(ab)).toBe(strip(ba))
  return ab
}

describe('merging two versions of a shared plan', () => {
  it('keys stops by day, list and id', () => {
    const keys = [...placedStops(base()).keys()]
    expect(keys).toContain('d1::castle')
    expect(keys).toContain('d2:alt:castle')
    expect(keys).toHaveLength(7)
    expect(stopListKey(base().days[1]!, 'alt')).toBe('alt')
    expect(stopListKey(base().days[0]!, 'alt')).toBe('')
    expect(stopTombstone('d1', '', 'castle')).toBe(`stop:${stopKey('d1', '', 'castle')}`)
  })

  it('leaves a plan nobody changed as it is', () => {
    const t = base()
    expect(both(t, clone(t))).toEqual(t)
  })

  it('keeps changes to different stops from both sides', () => {
    const a = base()
    const b = base()
    a.days[0]!.stops[0] = { ...a.days[0]!.stops[0]!, title: 'Castle at 9', updatedAt: at(5) }
    a.updatedAt = at(5)
    b.days[1]!.stops[1] = { ...b.days[1]!.stops[1]!, title: 'Pasteis de Belem', updatedAt: at(7) }
    b.updatedAt = at(7)
    const m = both(a, b)
    expect(titles(m, 'd1')).toEqual(['Castle at 9', 'lunch', 'tram'])
    expect(titles(m, 'd2')).toEqual(['belem', 'Pasteis de Belem'])
    expect(m.updatedAt).toBe(at(7))
  })

  it('keeps the stop changed last when both changed it', () => {
    const a = base()
    const b = base()
    a.days[0]!.stops[1] = { ...a.days[0]!.stops[1]!, start: 750, updatedAt: at(9) }
    a.updatedAt = at(1) // the trip's own time doesn't decide a stop
    b.days[0]!.stops[1] = { ...b.days[0]!.stops[1]!, start: 810, updatedAt: at(3) }
    b.updatedAt = at(3)
    const m = both(a, b)
    expect(m.days[0]!.stops.find(s => s.id === 'lunch')!.start).toBe(750)
  })

  it('takes everything else from the trip changed last', () => {
    const a = base()
    const b = base()
    a.title = 'Lisbon with friends'
    a.updatedAt = at(10)
    b.days[0]!.title = 'Old town'
    b.updatedAt = at(2)
    const m = both(a, b)
    expect(m.title).toBe('Lisbon with friends')
    expect(m.days[0]!.title).toBe('Alfama')
  })

  it('keeps stops added on both sides, in time order', () => {
    const a = base()
    const b = base()
    a.days[0]!.stops.push(stop('miradouro', 1080, { custom: true, updatedAt: at(4) }))
    a.updatedAt = at(4)
    b.days[0]!.stops.push(stop('fado', 1260, { kind: 'night', custom: true, updatedAt: at(6) }))
    b.days[0]!.stops.push(stop('coffee', 600, { kind: 'food', custom: true, updatedAt: at(6) }))
    b.updatedAt = at(6)
    const m = both(a, b)
    expect(titles(m, 'd1')).toEqual(['castle', 'coffee', 'lunch', 'tram', 'miradouro', 'fado'])
  })

  it('keeps a deletion made after the last change, and a change made after the deletion', () => {
    const a = base()
    const b = base()
    // a deletes the tram at 10; b changed it at 5: deleted.
    a.days[0]!.stops = a.days[0]!.stops.filter(s => s.id !== 'tram')
    a.tombstones = { [stopTombstone('d1', '', 'tram')]: at(10) }
    a.updatedAt = at(10)
    b.days[0]!.stops[2] = { ...b.days[0]!.stops[2]!, title: 'Tram 28', updatedAt: at(5) }
    // b changes lunch at 12; a deleted it at 10: kept.
    a.days[0]!.stops = a.days[0]!.stops.filter(s => s.id !== 'lunch')
    a.tombstones[stopTombstone('d1', '', 'lunch')] = at(10)
    b.days[0]!.stops[1] = { ...b.days[0]!.stops[1]!, title: 'Late lunch', updatedAt: at(12) }
    b.updatedAt = at(12)
    const m = both(a, b)
    expect(titles(m, 'd1')).toEqual(['castle', 'Late lunch'])
    expect(m.tombstones).toEqual({ [stopTombstone('d1', '', 'tram')]: at(10), [stopTombstone('d1', '', 'lunch')]: at(10) })
  })

  it('never brings back a stop from the trip data that someone deleted', () => {
    const a = base()
    const b = base()
    a.days[1]!.stops = a.days[1]!.stops.filter(s => s.id !== 'belem')
    a.tombstones = { [stopTombstone('d2', '', 'belem')]: at(1) }
    a.updatedAt = at(1)
    b.updatedAt = at(30) // an older copy that never saw the deletion, saved later for another reason
    b.title = 'Lisbon!'
    const m = both(a, b)
    expect(titles(m, 'd2')).toEqual(['pasteis'])
    expect(m.title).toBe('Lisbon!')
  })

  it('merges a variant list on its own, even when it repeats an id of another list', () => {
    const a = base()
    const b = base()
    a.days[1]!.variants!.alt!.stops[0] = { ...a.days[1]!.variants!.alt!.stops[0]!, title: 'Moorish castle', updatedAt: at(3) }
    a.updatedAt = at(3)
    b.days[0]!.stops[0] = { ...b.days[0]!.stops[0]!, title: 'Sao Jorge castle', updatedAt: at(4) }
    b.updatedAt = at(4)
    const m = both(a, b)
    expect(titles(m, 'd1')[0]).toBe('Sao Jorge castle')
    expect(titles(m, 'd2', 'alt')[0]).toBe('Moorish castle')
  })

  it('moves a stop to another day when one side moved it', () => {
    const a = base()
    const b = base()
    const tram = { ...a.days[0]!.stops[2]!, updatedAt: at(8) }
    a.days[0]!.stops = a.days[0]!.stops.filter(s => s.id !== 'tram')
    a.days[1]!.stops.push(tram)
    a.tombstones = { [stopTombstone('d1', '', 'tram')]: at(8) }
    a.updatedAt = at(8)
    const m = both(a, b)
    expect(titles(m, 'd1')).toEqual(['castle', 'lunch'])
    expect(titles(m, 'd2')).toEqual(['belem', 'pasteis', 'tram'])
  })

  it('merges bookings by id and packing by item, less what was deleted', () => {
    const a = base()
    const b = base()
    a.packing.push('Sunscreen')
    a.packing = a.packing.filter(x => x !== 'Adapter')
    a.tombstones = { 'packing:Adapter': at(2) }
    a.updatedAt = at(2)
    b.packing.push('Umbrella')
    b.bookings.push({ id: 'fado-table', due: '2026-11-01', dueLabel: 'By 1 Nov', title: 'Fado dinner' })
    b.updatedAt = at(3)
    const m = both(a, b)
    expect(m.packing).toEqual(['Passport', 'Umbrella', 'Sunscreen'])
    expect(m.bookings.map(x => x.id)).toEqual(['castle-ticket', 'fado-table'])
  })

  it('drops stops of a day the newer plan no longer has (shorter dates)', () => {
    const a = base()
    const b = base()
    a.days = a.days.slice(0, 1)
    a.end = a.start
    a.updatedAt = at(9)
    b.days[1]!.stops.push(stop('night-out', 1320, { kind: 'night', custom: true, updatedAt: at(5) }))
    b.updatedAt = at(5)
    const m = both(a, b)
    expect(m.days.map(d => d.id)).toEqual(['d1'])
  })

  it('keeps the first trip\'s group link and ids', () => {
    const a = { ...base(), group: { id: 'g-test', role: 'editor' as const } }
    const b = base()
    b.updatedAt = at(1)
    expect(mergeTrips(a, b).group).toEqual({ id: 'g-test', role: 'editor' })
    expect(mergeTrips(b, a).group).toBeUndefined()
  })

  it('merges two real edits of the Rome sample', () => {
    const a = clone(romeTrip)
    const b = clone(romeTrip)
    const fri = a.days.find(d => d.id === 'fri')!
    fri.stops[0] = { ...fri.stops[0]!, start: fri.stops[0]!.start + 30, updatedAt: at(1) }
    a.updatedAt = at(1)
    const sat = b.days.find(d => d.id === 'sat')!
    sat.variants!.sun!.stops.push(stop('gelato-break', 960, { kind: 'food', custom: true, updatedAt: at(2) }))
    b.updatedAt = at(2)
    const m = both(a, b)
    expect(m.days.find(d => d.id === 'fri')!.stops.find(s => s.id === fri.stops[0]!.id)!.start).toBe(fri.stops[0]!.start)
    expect(m.days.find(d => d.id === 'sat')!.variants!.sun!.stops.some(s => s.id === 'gelato-break')).toBe(true)
    expect(placedStops(m).size).toBe(placedStops(romeTrip).size + 1)
  })
})
