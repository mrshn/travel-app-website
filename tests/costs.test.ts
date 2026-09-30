import { afterEach, describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import {
  COST_CATS, COST_MAX, COST_PLANNED, costCatForKind, costDayFor, costEntries, costHints, costLegacyId, costLoggedFor,
  costOfferFor, costPadInput, costParseAmount, costSummary, costToCents,
} from '../shared/utils/costs'
import { emptyProgress, findStop, planDays, resolveStop, sortStops, summarize, type ResolvedStop } from '../shared/utils/plan'
import { parseClock, tripMoment, zonedToDate } from '../shared/utils/time'
import type { Expense, Stop, Trip, TripProgress } from '../shared/types/trip'

const trip = romeTrip as Trip
const rome = (date: string, clock: string) => zonedToDate(date, parseClock(clock)!, trip.timezone).toISOString()
const liveFri = tripMoment(trip, new Date(rome('2026-10-09', '16:40')))

/** Seed S of the spec (section 9): the state of the screenshots, Friday 16:40. */
function seedS(): TripProgress {
  const p = emptyProgress()
  for (const s of trip.days[0]!.stops) p.stops[s.id] = { status: 'done', at: rome('2026-10-08', '23:30') }
  const fri = sortStops(trip.days[1]!.stops).filter(s => s.start < 16 * 60)
  fri.forEach((s, i) => {
    p.stops[s.id] = { status: i === 3 ? 'skipped' : 'done', at: rome('2026-10-09', `${9 + i}:10`) }
  })
  const ratings = [5, 4, 5]
  const spent = [25, 12]
  fri.slice(0, 3).forEach((s, i) => {
    p.feedback[s.id] = { rating: ratings[i], ...(spent[i] ? { spent: spent[i] } : {}), updatedAt: rome('2026-10-09', '15:00') }
  })
  p.dayNotes.thu = { note: 'Landed late, pizza by the hostel.', extraSpent: 9, updatedAt: rome('2026-10-08', '23:59') }
  for (const b of trip.bookings.slice(0, 4)) p.bookings[b.id] = true
  for (const x of trip.packing.slice(0, 12)) p.packing[x] = true
  return p
}

let n = 0
function expense(e: Partial<Expense> & Pick<Expense, 'amount' | 'cat'>): Expense {
  const at = e.at ?? rome('2026-10-09', '16:40')
  return { id: e.id ?? `c-test${++n}`, currency: 'EUR', at, updatedAt: e.updatedAt ?? at, ...e } as Expense
}
function withExpenses(p: TripProgress, ...list: Expense[]): TripProgress {
  p.expenses = { ...p.expenses }
  for (const e of list) p.expenses[e.id] = e
  return p
}
function stop(id: string, p: TripProgress = emptyProgress()): ResolvedStop {
  for (const plan of planDays(trip, p, liveFri)) {
    const s = plan.stops.find(x => x.id === id)
    if (s) return s
  }
  throw new Error(`no stop ${id}`)
}

describe('constants', () => {
  it('has six categories, the first four matching the daily budget', () => {
    expect(COST_CATS).toEqual(['food', 'sights', 'night', 'transport', 'stay', 'other'])
    expect(COST_PLANNED).toEqual({ sights: 0, food: 1, night: 2, transport: 3 })
    expect(COST_MAX).toBe(99_999.99)
  })

  it('maps stop kinds to categories', () => {
    expect(costCatForKind('sight')).toBe('sights')
    expect(costCatForKind('food')).toBe('food')
    expect(costCatForKind('night')).toBe('night')
    expect(costCatForKind('move')).toBe('transport')
    expect(costCatForKind('rest')).toBe('stay')
    expect(costCatForKind('task')).toBe('other')
  })

  it('names legacy records and counts in cents', () => {
    expect(costLegacyId('stop', 'pantheon')).toBe('legacy-stop-pantheon')
    expect(costLegacyId('day', 'thu')).toBe('legacy-day-thu')
    expect(costToCents(3.5)).toBe(350)
    expect(costToCents(1.1)).toBe(110)
    expect(costToCents(0.1 + 0.2)).toBe(30)
  })
})

describe('costParseAmount', () => {
  it.each([
    ['3,50', 3.5],
    ['3.50', 3.5],
    ['3', 3],
    [' 12 ', 12],
    ['€7', 7],
    ['7 €', 7],
    ['€ 7', 7],
    ['7€', 7],
    ['€7,50', 7.5],
    ['1.250', 1250],
    ['1,250', 1250],
    ['99.999', 99_999],
    ['99999.99', 99_999.99],
    ['4.5678', 4.57],
    ['4.5649', 4.56],
    ['0,125', 0.13],
    ['0.005', 0.01],
    ['0.500', 0.5],
    ['1234.567', 1234.57],
    ['5.', 5],
    [',5', 0.5],
    ['007', 7],
  ])('reads %j as %s', (text, value) => {
    expect(costParseAmount(text)).toBe(value)
  })

  // The spec also gives "4.567 is 4.57", which contradicts its own rule that one separator followed by
  // three digits is a thousands separator ("1.250" is 1250). The rule wins; rounding shows on 4+ decimals.
  it('reads one separator followed by three digits as thousands', () => {
    expect(costParseAmount('4.567')).toBe(4567)
    expect(costParseAmount('12.500')).toBe(12_500)
  })

  it.each(['', '   ', '0', '0,00', '0.004', '-3', '+3', 'abc', '4,5,0', '1.250,50', '3e2', '1 250', '.', '€', '100000', '99999.995', '123.456', '12,5 €x'])(
    'rejects %j',
    (text) => {
      expect(costParseAmount(text)).toBeNull()
    },
  )

  it('never gives more than COST_MAX', () => {
    expect(costParseAmount('99999.99')).toBe(COST_MAX)
    expect(costParseAmount('100000.00')).toBeNull()
  })
})

describe('costPadInput', () => {
  const type = (keys: string[], from = '') => keys.reduce(costPadInput, from)

  it('types an amount', () => {
    expect(type(['3', '.', '5', '0'])).toBe('3.50')
    expect(costParseAmount(type(['3', '.', '5', '0']))).toBe(3.5)
    expect(type(['1', '2'])).toBe('12')
  })

  it('has no leading zeros', () => {
    expect(type(['0'])).toBe('0')
    expect(type(['0', '5'])).toBe('5')
    expect(type(['0', '0'])).toBe('0')
    expect(type(['0', '.', '0', '5'])).toBe('0.05')
  })

  it('starts "." on empty as "0." and keeps one point', () => {
    expect(type(['.'])).toBe('0.')
    expect(type([','])).toBe('0.')
    expect(type(['3', ','])).toBe('3.')
    expect(type(['3', '.', '.', ','])).toBe('3.')
    expect(type(['3', '.', '5', '.'])).toBe('3.5')
  })

  it('ignores a third decimal and a sixth whole digit (C5)', () => {
    expect(type(['3', '.', '5', '0', '1'])).toBe('3.50')
    expect(type(['1', '2', '3', '4', '5', '6'])).toBe('12345')
    expect(type(['9', '9', '9', '9', '9', '9', '.', '9', '9', '9'])).toBe('99999.99')
    expect(costParseAmount(type(['9', '9', '9', '9', '9', '.', '9', '9']))).toBe(COST_MAX)
  })

  it('deletes and clears', () => {
    expect(type(['back'], '3.50')).toBe('3.5')
    expect(type(['back', 'back'], '3.50')).toBe('3.')
    expect(type(['back', 'back', 'back'], '3.50')).toBe('3')
    expect(type(['back'], '')).toBe('')
    expect(type(['clear'], '3.50')).toBe('')
    expect(type(['back', '7'], '0.')).toBe('7')
  })

  it('ignores other keys', () => {
    expect(type(['Enter', 'x', '-', ''], '3.5')).toBe('3.5')
  })
})

describe('costHints (Appendix C: every planned-cost text of the Rome trip)', () => {
  const one: [string, number][] = [
    ['€7.45', 7.45], ['€14', 14], ['€55', 55], ['€14 city tax', 14], ['€1.50 tap', 1.5], ['€25', 25], ['€18', 18],
    ['€7', 7], ['€94', 94], ['€10', 10], ['about €13', 13], ['€24', 24],
  ]
  const free = ['Free', 'Included', 'Free, no ticket']
  const several: [string, number[]][] = [
    ['~€10–15', [10, 15]],
    ['€10–22', [10, 22]],
    ['Piazza free · basin €2', [2]],
    ['~€30–45', [30, 45]],
    ['€15 online · €20 door', [15, 20]],
    ['€15–20', [15, 20]],
    ['~€4–5', [4, 5]],
    ['€18 or €24', [18, 24]],
    ['€10–25', [10, 25]],
    ['Drinks €8–16 · dinner €25–50', [8, 16, 25, 50]],
    ['€3–12 a drink', [3, 12]],
    ['Free RSVP · else €10 / €15', [10, 15]],
    ['€1.50 / ~€20', [1.5, 20]],
    ['~€4–5 + €1.50', [4, 5, 1.5]],
    ['Pasta €12–15', [12, 15]],
    ['€5–15', [5, 15]],
    ['€10–45', [10, 45]],
    ['€1.50 / from €3.50', [1.5, 3.5]],
    ['dorm ~€35–70/night + €3.50/night tax', [35, 70, 3.5]],
    ['€7 · €17/€22', [7, 17, 22]],
  ]
  const nothing = ['Buy online', '≈US$40–56', 'Price not out yet', 'Cheap drinks', 'Tip-based', 'Price not listed', '~$11–21']

  it('covers all 42 texts of the trip (stops, options and bookings)', () => {
    const texts = new Set<string>()
    const add = (t?: string) => t !== undefined && texts.add(t)
    for (const d of trip.days) {
      for (const list of [d.stops, ...Object.values(d.variants ?? {}).map(v => v.stops)]) {
        for (const s of list) {
          add(s.cost)
          for (const c of s.options?.choices ?? []) add(c.cost)
        }
      }
    }
    for (const b of trip.bookings) add(b.cost)
    const table = [...one.map(x => x[0]), ...free, ...several.map(x => x[0]), ...nothing]
    expect(table).toHaveLength(42)
    expect([...texts].sort()).toEqual([...table].sort())
  })

  it.each(one)('%j is one amount to log: %s', (text, amount) => {
    expect(costHints(text)).toEqual({ exact: amount, options: [amount] })
  })

  it.each(free)('%j is free: nothing to log', (text) => {
    expect(costHints(text)).toEqual({ exact: 0, options: [] })
  })

  it.each(several)('%j gives amounts to pick from', (text, options) => {
    expect(costHints(text)).toEqual({ options })
  })

  it.each(nothing)('%j has no euro amount', (text) => {
    expect(costHints(text)).toEqual({ options: [] })
  })

  it('reads other shapes', () => {
    expect(costHints()).toEqual({ options: [] })
    expect(costHints('')).toEqual({ options: [] })
    expect(costHints('€ 7')).toEqual({ exact: 7, options: [7] })
    expect(costHints('7 €')).toEqual({ exact: 7, options: [7] })
    expect(costHints('10–15 €')).toEqual({ options: [10, 15] })
    expect(costHints('€10-15')).toEqual({ options: [10, 15] })
    expect(costHints('€2,50 each')).toEqual({ exact: 2.5, options: [2.5] })
    expect(costHints('€€')).toEqual({ options: [] })
    expect(costHints('€7 or so')).toEqual({ options: [7] })
  })
})

describe('costDayFor (C10)', () => {
  const at = (iso: string) => new Date(iso)
  const cases: [string, string | undefined][] = [
    ['2026-10-09T23:30:00Z', 'fri'], // Sat 10 Oct 01:30 in Rome: still Friday night
    ['2026-10-10T03:00:00Z', 'sat'], // Sat 05:00 in Rome
    ['2026-10-10T02:59:00Z', 'fri'], // Sat 04:59
    ['2026-10-07T10:00:00Z', undefined], // Wed 7 Oct, noon: before the trip
    ['2026-10-13T10:00:00Z', undefined], // Tue 13 Oct, noon: after the trip
    ['2026-10-12T23:30:00Z', 'mon'], // Tue 01:30: the last night still counts to Monday
    ['2026-10-07T23:30:00Z', 'thu'], // Thu 01:30: the day before isn't a trip day, so it is Thursday
  ]
  const zones = ['Europe/Rome', 'America/New_York', 'Asia/Tokyo', 'Pacific/Kiritimati', 'UTC']
  const saved = process.env.TZ
  afterEach(() => {
    process.env.TZ = saved
  })

  it.each(zones)('gives the trip day whatever the device time zone (%s)', (zone) => {
    process.env.TZ = zone
    for (const [iso, day] of cases) expect(costDayFor(trip, at(iso)), `${iso} on a phone in ${zone}`).toBe(day)
  })

  it('matches the rollover of the app clock', () => {
    expect(costDayFor(trip, zonedToDate('2026-10-10', 90, trip.timezone))).toBe('fri')
    expect(costDayFor(trip, zonedToDate('2026-10-10', 300, trip.timezone))).toBe('sat')
  })

  it('gives nothing for a date it cannot read', () => {
    expect(costDayFor(trip, new Date(Number.NaN))).toBeUndefined()
  })
})

describe('costEntries: new records and old spend values', () => {
  it('reads old values as "Logged earlier" entries, newest first (Seed S)', () => {
    const p = seedS()
    const e = costEntries(trip, p, planDays(trip, p, liveFri))
    expect(e.map(x => [x.id, x.source, x.amount, x.cat, x.dayId, x.title])).toEqual([
      ['legacy-stop-vatican-museums-sistine-chapel', 'legacy', 12, 'sights', 'fri', 'Vatican Museums + Sistine Chapel'],
      ['legacy-stop-metro-a-termini-ottaviano', 'legacy', 25, 'transport', 'fri', 'Metro A, Termini → Ottaviano'],
      ['legacy-day-thu', 'legacy', 9, 'other', 'thu', 'Other spending'],
    ])
    // A stop entry sorts at its planned start, a day's other spending at 23:59.
    expect(new Date(e[0]!.sortAt).toISOString()).toBe(rome('2026-10-09', '08:00'))
    expect(new Date(e[2]!.sortAt).toISOString()).toBe(rome('2026-10-08', '23:59'))
    expect(e[0]!.stopId).toBe('vatican-museums-sistine-chapel')
    // Without the plan it finds the same.
    expect(costEntries(trip, p)).toEqual(e)
  })

  it('puts new costs first and keeps what they link to', () => {
    const p = withExpenses(seedS(), expense({ id: 'c-espresso', amount: 1.2, cat: 'food', dayId: 'fri', note: 'Espresso', placeId: 'food-sant-eustachio-il-caffe' }))
    const e = costEntries(trip, p)
    expect(e[0]).toMatchObject({ id: 'c-espresso', source: 'expense', amount: 1.2, cat: 'food', dayId: 'fri', note: 'Espresso', placeId: 'food-sant-eustachio-il-caffe' })
    expect(e[0]!.expense).toBe(p.expenses!['c-espresso'])
    expect(e[0]!.sortAt).toBe(Date.parse(rome('2026-10-09', '16:40')))
    expect(e).toHaveLength(4)
  })

  it('lets a live record under the legacy id replace the old value (edited)', () => {
    const id = costLegacyId('stop', 'vatican-museums-sistine-chapel')
    const p = withExpenses(seedS(), expense({ id, amount: 13, cat: 'sights', dayId: 'fri', stopId: 'vatican-museums-sistine-chapel' }))
    const e = costEntries(trip, p).filter(x => x.id === id)
    expect(e).toHaveLength(1)
    expect(e[0]).toMatchObject({ source: 'expense', amount: 13 })
    const s = costSummary(trip, p)
    expect(s.byDay.fri!.spent).toBe(38) // C7: not 50
    expect(s.all).toBe(47)
    // The old field is left as it was.
    expect(p.feedback['vatican-museums-sistine-chapel']!.spent).toBe(12)
  })

  it('lets a deleted record under the legacy id hide the old value', () => {
    const p = withExpenses(seedS(), expense({ id: costLegacyId('day', 'thu'), amount: 9, cat: 'other', dayId: 'thu', deleted: true }))
    const s = costSummary(trip, p)
    expect(s.entries.map(x => x.id)).not.toContain('legacy-day-thu')
    expect(s.byDay.thu!.spent).toBe(0) // C7
    expect(s.trip.spent).toBe(37)
    expect(p.dayNotes.thu!.extraSpent).toBe(9)
  })

  it('leaves out deleted costs and values that are not amounts', () => {
    const p = withExpenses(
      emptyProgress(),
      expense({ amount: 5, cat: 'food', dayId: 'fri', deleted: true }),
      expense({ amount: 0, cat: 'food', dayId: 'fri' }),
      expense({ amount: -4, cat: 'food', dayId: 'fri' }),
      expense({ amount: Number.NaN, cat: 'food', dayId: 'fri' }),
      expense({ amount: 'x' as unknown as number, cat: 'food', dayId: 'fri' }),
      expense({ amount: 250_000, cat: 'food', dayId: 'fri' }),
      expense({ amount: 2, cat: 'food', dayId: 'fri' }),
    )
    p.feedback.pantheon = { spent: 'abc' as unknown as number, updatedAt: rome('2026-10-09', '18:00') }
    p.dayNotes.fri = { extraSpent: -3 }
    const s = costSummary(trip, p)
    expect(s.entries.map(x => x.amount)).toEqual([2])
    expect(s.all).toBe(2)
    expect(Number.isNaN(s.trip.spent)).toBe(false)
  })

  it('reads a text amount written by an old form', () => {
    const p = emptyProgress()
    p.feedback.pantheon = { spent: '7' as unknown as number, updatedAt: rome('2026-10-09', '18:00') }
    expect(costSummary(trip, p).byDay.fri!.spent).toBe(7)
  })

  it('works on saves from before costs (no expenses or stamps keys)', () => {
    const p = seedS()
    delete p.expenses
    delete p.stamps
    const s = costSummary(trip, p)
    expect(s.trip.spent).toBe(46)
    expect(summarize(trip, p, liveFri).spent).toBe(46)
  })

  it('counts a cost of an unknown category as other, and one of an unknown day to no day', () => {
    const p = withExpenses(
      emptyProgress(),
      expense({ amount: 4, cat: 'souvenirs' as unknown as 'other', dayId: 'fri' }),
      expense({ amount: 6, cat: 'food', dayId: 'tue' }),
    )
    const s = costSummary(trip, p)
    expect(s.byCat.other.spent).toBe(4)
    expect(s.entries.find(x => x.amount === 6)!.dayId).toBeUndefined()
    expect(s.trip.spent).toBe(4)
    expect(s.all).toBe(10)
  })

  it('counts a cost in the home currency at the trip rate, and leaves out other currencies', () => {
    const p = withExpenses(
      emptyProgress(),
      expense({ amount: 558, currency: 'TRY', cat: 'food', dayId: 'fri' }), // 1 € = 55.8 ₺
      expense({ amount: 20, currency: 'USD', cat: 'food', dayId: 'fri' }),
      expense({ amount: 2, cat: 'food', dayId: 'fri' }),
    )
    const s = costSummary(trip, p)
    expect(s.entries.map(x => x.amount).sort((a, b) => a - b)).toEqual([2, 10])
    expect(s.all).toBe(12)
    expect(costSummary({ ...trip, fx: undefined }, p).all).toBe(2)
  })

  it('copes with odd stop ids and a stop time it cannot read', () => {
    const odd: Stop = { id: 'constructor', start: Number.NaN, timeLabel: '', kind: 'food', title: 'Constructor' }
    const t: Trip = { ...trip, days: trip.days.map(d => (d.id === 'fri' ? { ...d, stops: [...d.stops, odd] } : d)) }
    const p = emptyProgress()
    p.feedback.constructor = { spent: 5, updatedAt: rome('2026-10-09', '12:00') }
    const s = costSummary(t, p)
    expect(s.entries[0]).toMatchObject({ id: 'legacy-stop-constructor', dayId: 'fri', cat: 'food', title: 'Constructor' })
    expect(s.entries[0]!.sortAt).toBe(Date.parse(rome('2026-10-09', '12:00')))
    expect(s.byStop.constructor).toBe(5)
    expect(s.byDay.fri!.spent).toBe(5)
  })

  it('marks rehearsal costs', () => {
    const p = withExpenses(emptyProgress(), expense({ amount: 2, cat: 'food', dayId: 'fri', preview: true }), expense({ amount: 3, cat: 'food', dayId: 'fri' }))
    const e = costEntries(trip, p)
    expect(e.filter(x => x.preview)).toHaveLength(1)
    expect(e.find(x => x.amount === 3)!.preview).toBeUndefined()
  })

  it('titles a linked cost from its snapshot, else from the stop or booking', () => {
    const p = withExpenses(
      emptyProgress(),
      expense({ id: 'c-a', amount: 30, cat: 'food', dayId: 'sun', stopId: 'deleted-stop', title: 'Dinner at a place I added' }),
      expense({ id: 'c-b', amount: 7, cat: 'sights', dayId: 'fri', stopId: 'pantheon' }),
      expense({ id: 'c-c', amount: 25, cat: 'sights', dayId: 'fri', bookingId: 'vatican' }),
    )
    const e = new Map(costEntries(trip, p).map(x => [x.id, x]))
    expect(e.get('c-a')!.title).toBe('Dinner at a place I added')
    expect(e.get('c-b')!.title).toBe('Pantheon')
    expect(e.get('c-c')!.title).toBe('Vatican Museums, Fri 9 Oct, 08:00')
  })
})

describe('costs belong to days, not to the active plan', () => {
  it('still counts a legacy spend on a stop outside the active plan', () => {
    const p = emptyProgress()
    p.variant = 'sun' // Saturday is the Trastevere day now: the Saturday breakfast stop is not in the plan
    p.feedback['bar-breakfast-cornetto-cappuccino-at-the-counter'] = { spent: 4.5, updatedAt: rome('2026-10-10', '08:00') }
    const plans = planDays(trip, p, liveFri)
    expect(plans.some(d => d.stops.some(s => s.id === 'bar-breakfast-cornetto-cappuccino-at-the-counter'))).toBe(false)
    const s = costSummary(trip, p, plans)
    expect(s.entries[0]).toMatchObject({ dayId: 'sat', cat: 'food', title: 'Bar breakfast: cornetto + cappuccino at the counter' })
    expect(s.byDay.sat!.spent).toBe(4.5)
    expect(s.trip.spent).toBe(4.5)
  })

  it('follows a stop to the day it is on in the active plan', () => {
    const p = emptyProgress()
    p.feedback.colosseum = { spent: 18, updatedAt: rome('2026-10-10', '10:00') }
    expect(costSummary(trip, p).entries[0]!.dayId).toBe('sat')
    p.variant = 'sun'
    expect(costSummary(trip, p).entries[0]!.dayId).toBe('sun')
    expect(costSummary(trip, p).trip.spent).toBe(18)
  })

  it('counts a spend on a stop that no longer exists to no day', () => {
    const p = emptyProgress()
    p.feedback['my-own-stop'] = { spent: 11, updatedAt: rome('2026-10-10', '10:00') }
    const s = costSummary(trip, p)
    expect(s.entries[0]).toMatchObject({ id: 'legacy-stop-my-own-stop', cat: 'other', stopId: 'my-own-stop' })
    expect(s.entries[0]!.dayId).toBeUndefined()
    expect(s.entries[0]!.sortAt).toBe(Date.parse(rome('2026-10-10', '10:00')))
    expect(s.all).toBe(11)
    expect(s.trip.spent).toBe(0)
  })

  it('uses the picked option for the kind of a legacy stop spend', () => {
    const p = emptyProgress()
    p.choices['pick-satafternoon'] = 'argentina'
    p.feedback['pick-satafternoon'] = { spent: 7, updatedAt: rome('2026-10-10', '16:00') }
    expect(costSummary(trip, p).entries[0]).toMatchObject({ cat: 'sights', title: 'Largo Argentina and the Jewish Ghetto' })
  })
})

describe('costSummary', () => {
  it('sums in cents: 10 x €1.50 is €15.00 and 3 x €1.10 is €3.30', () => {
    const tens = withExpenses(emptyProgress(), ...Array.from({ length: 10 }, () => expense({ amount: 1.5, cat: 'transport', dayId: 'fri' })))
    expect(costSummary(trip, tens).byDay.fri!.spent).toBe(15)
    const threes = withExpenses(emptyProgress(), ...Array.from({ length: 3 }, () => expense({ amount: 1.1, cat: 'food', dayId: 'fri' })))
    const s = costSummary(trip, threes)
    expect(s.byDay.fri!.spent).toBe(3.3)
    expect(s.all).toBe(3.3)
    expect(s.byCat.food.spent).toBe(3.3)
    const odd = withExpenses(emptyProgress(), expense({ amount: 0.1, cat: 'food', dayId: 'fri' }), expense({ amount: 0.2, cat: 'food', dayId: 'fri' }))
    expect(costSummary(trip, odd).all).toBe(0.3)
  })

  it('gives the seeded numbers of C1 (Seed S, Friday 16:40)', () => {
    const p = seedS()
    const s = costSummary(trip, p, planDays(trip, p, liveFri))
    expect(s.byDay).toEqual({
      thu: { spent: 9, planned: 21.45 },
      fri: { spent: 37, planned: 171.5 },
      sat: { spent: 0, planned: 155 },
      sun: { spent: 0, planned: 123 },
      mon: { spent: 0, planned: 32 },
    })
    expect(s.trip).toEqual({ spent: 46, planned: 502.95 })
    expect(s.byCat).toEqual({
      food: { spent: 0, planned: 225 },
      sights: { spent: 12, planned: 100 },
      night: { spent: 0, planned: 100 },
      transport: { spent: 25, planned: 77.95 },
      stay: { spent: 0, planned: 0 },
      other: { spent: 9, planned: 0 },
    })
    expect(s.all).toBe(46)
    expect(s.days).toBe(2)
    expect(s.byStop).toEqual({ 'vatican-museums-sistine-chapel': 12, 'metro-a-termini-ottaviano': 25 })
  })

  it('keeps where you stay out of the days, and costs before the trip out of the trip (C13)', () => {
    const p = withExpenses(
      emptyProgress(),
      expense({ amount: 14, cat: 'stay', dayId: 'thu', note: 'City tax' }),
      expense({ amount: 35, cat: 'stay', at: '2026-09-30T10:00:00.000Z' }),
      expense({ amount: 3.5, cat: 'food', dayId: 'thu' }),
    )
    const s = costSummary(trip, p)
    expect(s.byDay.thu!.spent).toBe(3.5)
    expect(s.trip.spent).toBe(3.5)
    expect(s.byCat.stay).toEqual({ spent: 14, planned: 0 })
    expect(s.all).toBe(52.5)
    expect(s.days).toBe(1)
  })

  it('has every trip day, all six categories and zeros for a fresh trip (C14)', () => {
    const s = costSummary(trip, emptyProgress())
    expect(Object.keys(s.byDay)).toEqual(['thu', 'fri', 'sat', 'sun', 'mon'])
    expect(Object.keys(s.byCat)).toEqual([...COST_CATS])
    expect(s.entries).toEqual([])
    expect(s.all).toBe(0)
    expect(s.trip).toEqual({ spent: 0, planned: 502.95 })
    const bare = { ...trip, budget: undefined }
    expect(costSummary(bare, emptyProgress()).trip).toEqual({ spent: 0, planned: 0 })
  })

  it('counts linked costs per stop, any category', () => {
    const p = withExpenses(seedS(), expense({ amount: 3, cat: 'food', dayId: 'fri', stopId: 'vatican-museums-sistine-chapel' }))
    expect(costSummary(trip, p).byStop['vatican-museums-sistine-chapel']).toBe(15)
  })

  it('feeds summarize(), so every screen shows the same totals', () => {
    const p = withExpenses(seedS(), expense({ amount: 35, cat: 'stay', at: '2026-09-30T10:00:00.000Z' }))
    const plans = planDays(trip, p, liveFri)
    const costs = costSummary(trip, p, plans)
    const s = summarize(trip, p, liveFri, plans, costs)
    expect(s.spent).toBe(46)
    expect(s.spentAll).toBe(81)
    expect(s.days.map(d => d.spent)).toEqual([9, 37, 0, 0, 0])
    expect(summarize(trip, p, liveFri)).toEqual(s)
  })
})

describe('offers to log (costLoggedFor, costOfferFor)', () => {
  it('offers one amount, a range or nothing (C9)', () => {
    const p = seedS()
    const s = costSummary(trip, p)
    expect(costOfferFor(stop('castel-sant-angelo-the-angel-s-terrace'), s)).toEqual({ exact: 18, options: [18] })
    expect(costOfferFor(stop('early-lunch-at-bonci-pizzarium'), s)).toEqual({ options: [10, 15] })
    expect(costOfferFor(stop('climb-the-dome'), s)).toEqual({ options: [10, 22] })
    expect(costOfferFor(stop('pantheon'), s)).toEqual({ exact: 7, options: [7] })
    // Already logged (old values), free, or no cost text.
    expect(costOfferFor(stop('vatican-museums-sistine-chapel'), s)).toBeNull()
    expect(costOfferFor(stop('metro-a-termini-ottaviano'), s)).toBeNull()
    expect(costOfferFor(stop('st-peter-s-basilica-the-free-grottoes'), s)).toBeNull()
    expect(costOfferFor(stop('pick-frinight'), s)).toBeNull() // the pub crawl is priced in US$
    expect(costOfferFor(stop('security'), s)).toBeNull()
  })

  it('stops offering once a cost in the stop\'s own category is linked', () => {
    const castel = stop('castel-sant-angelo-the-angel-s-terrace')
    const food = withExpenses(seedS(), expense({ amount: 4, cat: 'food', dayId: 'fri', stopId: castel.id }))
    expect(costLoggedFor(castel, costSummary(trip, food))).toBe(false)
    expect(costOfferFor(castel, costSummary(trip, food))).toEqual({ exact: 18, options: [18] })
    const sights = withExpenses(seedS(), expense({ amount: 18, cat: 'sights', dayId: 'fri', stopId: castel.id }))
    expect(costLoggedFor(castel, costSummary(trip, sights))).toBe(true)
    expect(costOfferFor(castel, costSummary(trip, sights))).toBeNull()
    // A deleted cost doesn't count as logged.
    const gone = withExpenses(seedS(), expense({ amount: 18, cat: 'sights', dayId: 'fri', stopId: castel.id, deleted: true }))
    expect(costOfferFor(castel, costSummary(trip, gone))).toEqual({ exact: 18, options: [18] })
  })

  it('reads the picked option\'s cost', () => {
    const p = emptyProgress()
    p.choices['pick-satclub'] = 'illuminati'
    const club = stop('pick-satclub', p)
    expect(club.cost).toBe('€10')
    expect(costOfferFor(club, costSummary(trip, p))).toEqual({ exact: 10, options: [10] })
    expect(costCatForKind(resolveStop(findStop(trip, 'pick-satclub')!.stop, p.choices).kind)).toBe('night')
  })
})
