import { describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import { activeVariant, dayViews, emptyProgress, findStop, planDays, resolveStop, resolveStops, stopStates, summarize } from '../shared/utils/plan'
import { LEAVE_BUFFER, liveGuide } from '../shared/utils/guide'
import { costSummary } from '../shared/utils/costs'
import { tripMoment } from '../shared/utils/time'
import type { Expense, Stop, Trip } from '../shared/types/trip'

const trip = romeTrip as Trip
const at = (iso: string) => tripMoment(trip, new Date(iso))

describe('Rome seed data', () => {
  it('has unique stop ids within each version of each day', () => {
    for (const day of trip.days) {
      for (const list of [day.stops, ...Object.values(day.variants ?? {}).map(v => v.stops)]) {
        const ids = list.map(s => s.id)
        expect(new Set(ids).size).toBe(ids.length)
      }
    }
  })

  it('has places with sane Rome coordinates', () => {
    for (const day of trip.days) {
      for (const s of day.stops) {
        if (!s.place) continue
        expect(s.place.lat).toBeGreaterThan(41.7)
        expect(s.place.lat).toBeLessThan(42.0)
        expect(s.place.lng).toBeGreaterThan(12.2)
        expect(s.place.lng).toBeLessThan(12.6)
      }
    }
  })

  it('points options at existing choices', () => {
    for (const day of trip.days) {
      for (const s of day.stops) {
        if (s.options) expect(s.options.choices.some(c => c.id === s.options!.default)).toBe(true)
      }
    }
  })
})

describe('variants and options', () => {
  it('swaps the weekend when the Colosseum moves to Sunday', () => {
    const p = emptyProgress()
    expect(activeVariant(trip, p)).toBe('sat')
    const sat = dayViews(trip, p)[2]!
    expect(sat.stops.some(s => s.id === 'colosseum')).toBe(true)
    p.variant = 'sun'
    const sat2 = dayViews(trip, p)[2]!
    const sun2 = dayViews(trip, p)[3]!
    expect(sat2.variantKey).toBe('sun')
    expect(sat2.stops.some(s => s.id === 'colosseum')).toBe(false)
    expect(sun2.stops.some(s => s.id === 'colosseum')).toBe(true)
  })

  it('resolves the picked option', () => {
    const stop = findStop(trip, 'pick-ride')!.stop
    const def = resolveStop(stop, {})
    expect(def.choice?.id).toBe(stop.options!.default)
    const train = resolveStop(stop, { 'pick-ride': 'train' })
    expect(train.choice?.id).toBe('train')
    expect(train.title).toContain('Leonardo Express')
  })

  it('gives every stop a slot that ends after it starts', () => {
    for (const day of trip.days) {
      for (const s of resolveStops(day.stops, {}, day.id)) expect(s.endMin).toBeGreaterThan(s.start)
    }
  })
})

describe('states and progress', () => {
  it('marks now, next and missed stops on Friday 10:30', () => {
    const m = at('2026-10-09T08:30:00Z')
    const day = trip.days[1]!
    const stops = resolveStops(day.stops, {}, day.id)
    const st = stopStates(day.date, stops, emptyProgress(), m)
    expect(st['vatican-museums-sistine-chapel']).toBe('now')
    expect(st['metro-a-termini-ottaviano']).toBe('missed')
    expect(st['early-lunch-at-bonci-pizzarium']).toBe('next')
    expect(Object.values(st).filter(x => x === 'next')).toHaveLength(1)
  })

  it('keeps marks and counts only non-minor stops', () => {
    const p = emptyProgress()
    p.stops['vatican-museums-sistine-chapel'] = { status: 'done', at: '2026-10-09T09:00:00Z' }
    p.stops['metro-a-termini-ottaviano'] = { status: 'done', at: '2026-10-09T05:40:00Z' } // minor
    p.feedback['vatican-museums-sistine-chapel'] = { rating: 5, spent: 25, updatedAt: '2026-10-09T10:00:00Z' }
    const m = at('2026-10-09T08:30:00Z')
    const s = summarize(trip, p, m)
    expect(s.all.done).toBe(1)
    expect(s.days[1]!.tally.done).toBe(1)
    expect(s.spent).toBe(25)
    expect(s.avgRating).toBe(5)
    const minorCount = trip.days.flatMap(d => d.stops).filter((x: Stop) => x.minor).length
    const total = trip.days.flatMap(d => d.stops).length
    expect(s.all.total).toBe(total - minorCount)
    // Thursday's three countable stops are over and unmarked.
    expect(s.all.missed).toBe(3)
    expect(s.planned).toBeGreaterThan(300)
  })

  it('calls everything unmarked "missed" after the trip', () => {
    const s = summarize(trip, emptyProgress(), at('2026-10-20T10:00:00Z'))
    expect(s.all.missed).toBe(s.all.total)
  })
})

describe('live guide', () => {
  const plans = (iso: string) => {
    const m = at(iso)
    return { m, plan: planDays(trip, emptyProgress(), m)[m.dayIndex]! }
  }

  it('says you are at the Vatican and when to leave for lunch', () => {
    const { m, plan } = plans('2026-10-09T08:30:00Z')
    const g = liveGuide(plan.stops, plan.states, m.minutes, { home: trip.home })
    expect(g.mode).toBe('at')
    expect(g.focus?.id).toBe('vatican-museums-sistine-chapel')
    expect(g.next?.id).toBe('early-lunch-at-bonci-pizzarium')
    expect(g.leg?.est.mode).toBe('walk')
    expect(g.leaveBy).toBeLessThan(675)
    expect(g.currentProgress).toBeGreaterThan(0.6)
  })

  it('tells you to head out when a gap is ending', () => {
    // Friday 11:05: Vatican is over (660), lunch starts 11:15 (675)
    const { m, plan } = plans('2026-10-09T09:05:00Z')
    const g = liveGuide(plan.stops, plan.states, m.minutes, { home: trip.home })
    expect(g.mode).toBe('go')
    expect(g.focus?.id).toBe('early-lunch-at-bonci-pizzarium')
    expect(['soon', 'now', 'late']).toContain(g.urgency)
    expect(g.behind.map(s => s.id)).toContain('vatican-museums-sistine-chapel')
  })

  it('uses your live position for the leg', () => {
    const { m, plan } = plans('2026-10-09T09:05:00Z')
    const you = { lat: 41.9029, lng: 12.4534 } // St Peter's Square
    const g = liveGuide(plan.stops, plan.states, m.minutes, { you })
    expect(g.leg?.from).toBe('you')
    expect(g.focusLeg?.meters).toBeGreaterThan(300)
  })

  it('uses real travel times when it has them', () => {
    const { m, plan } = plans('2026-10-11T07:00:00Z') // 09:00 Sunday, next: Porta Portese at 10:00
    const asked: number[] = []
    const g = liveGuide(plan.stops, plan.states, m.minutes, {
      home: trip.home,
      travel: (_from, _to, _meters, arriveBy) => {
        asked.push(arriveBy)
        return { mode: 'transit', minutes: 31, leaveBy: 562, source: 'google', ride: 'Tram 8 09:26 from Arenula' }
      },
    })
    expect(asked[0]).toBe(g.next!.start)
    expect(g.leg?.est.source).toBe('google')
    // Leave to catch the ride, with the usual few minutes of slack.
    expect(g.leaveBy).toBe(562 - LEAVE_BUFFER)
    // Without a set departure, it counts back from the start.
    const w = liveGuide(plan.stops, plan.states, m.minutes, { home: trip.home, travel: () => ({ mode: 'walk', minutes: 20, source: 'google' }) })
    expect(w.leaveBy).toBe(w.next!.start - 20 - LEAVE_BUFFER)
    // No answer: back to the estimate.
    const e = liveGuide(plan.stops, plan.states, m.minutes, { home: trip.home, travel: () => null })
    expect(e.leg?.est.source).toBeUndefined()
  })

  it('starts the day from home', () => {
    const { m, plan } = plans('2026-10-09T04:40:00Z') // 06:40 Friday
    const g = liveGuide(plan.stops, plan.states, m.minutes, { home: trip.home })
    expect(g.mode).toBe('free')
    expect(g.next?.id).toBe('metro-a-termini-ottaviano')
    // A transit step starts where you are, so there is no walk to it.
    expect(g.leg).toBeUndefined()
    expect(g.leaveBy).toBe(435)
  })

  it('works out the first walk from home', () => {
    const { m, plan } = plans('2026-10-11T07:00:00Z') // 09:00 Sunday
    const g = liveGuide(plan.stops, plan.states, m.minutes, { home: trip.home })
    expect(g.next?.id).toBe('porta-portese-flea-market')
    expect(g.leg?.from).toBe('home')
    expect(g.leaveBy!).toBeLessThan(600)
  })

  it('handles an after-midnight club night', () => {
    const { m, plan } = plans('2026-10-11T00:00:00Z') // 02:00 Sunday = Saturday 26:00
    expect(m.dayDate).toBe('2026-10-10')
    const g = liveGuide(plan.stops, plan.states, m.minutes)
    expect(g.current?.id).toBe('pick-satclub')
    expect(g.mode).toBe('at')
  })

  it('is done at the end of the day and empty without stops', () => {
    const { m, plan } = plans('2026-10-12T20:00:00Z')
    expect(liveGuide(plan.stops, plan.states, m.minutes).mode).toBe('done')
    expect(liveGuide([], {}, 600).mode).toBe('empty')
  })
})

describe('money from the costs ledger', () => {
  const m = at('2026-10-09T14:40:00Z') // Friday 16:40
  const cost = (id: string, amount: number, more: Partial<Expense>): Expense =>
    ({ id, amount, currency: 'EUR', cat: 'food', at: '2026-10-09T14:00:00.000Z', updatedAt: '2026-10-09T14:00:00.000Z', ...more })

  it('starts empty progress with no costs and no stamps', () => {
    expect(emptyProgress()).toEqual({ stops: {}, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {}, expenses: {}, stamps: {} })
  })

  it('takes spent from the ledger, and spentAll from every cost', () => {
    const p = emptyProgress()
    p.feedback['vatican-museums-sistine-chapel'] = { rating: 5, spent: 25, updatedAt: '2026-10-09T10:00:00Z' }
    p.dayNotes.thu = { extraSpent: 9 }
    p.expenses = {
      'c-1': cost('c-1', 3.5, { dayId: 'fri' }),
      'c-2': cost('c-2', 35, { cat: 'stay' }), // before the trip
      'c-3': cost('c-3', 14, { cat: 'stay', dayId: 'thu' }), // city tax: not part of the daily plan
      'c-4': cost('c-4', 50, { dayId: 'fri', deleted: true }),
    }
    const plans = planDays(trip, p, m)
    const costs = costSummary(trip, p, plans)
    const s = summarize(trip, p, m, plans, costs)
    expect(s.spent).toBe(37.5)
    expect(s.spent).toBe(costs.trip.spent)
    expect(s.spentAll).toBe(86.5)
    expect(s.spentAll).toBe(costs.all)
    expect(s.days.map(d => [d.id, d.spent])).toEqual([['thu', 9], ['fri', 28.5], ['sat', 0], ['sun', 0], ['mon', 0]])
    // Without costs given, summarize() works them out the same way.
    expect(summarize(trip, p, m)).toEqual(s)
  })

  it('keeps spent when the Colosseum day switches', () => {
    const p = emptyProgress()
    p.feedback.colosseum = { spent: 18, updatedAt: '2026-10-10T08:00:00Z' } // moves from Saturday to Sunday
    p.feedback['bar-breakfast-cornetto-cappuccino-at-the-counter'] = { spent: 4.5, updatedAt: '2026-10-10T06:00:00Z' } // only in the Saturday version
    p.expenses = { 'c-1': cost('c-1', 10, { dayId: 'sat' }) }
    const before = summarize(trip, p, m)
    p.variant = 'sun'
    const after = summarize(trip, p, m)
    expect(before.spent).toBe(32.5)
    expect(after.spent).toBe(before.spent)
    expect(after.spentAll).toBe(before.spentAll)
    expect(before.days.find(d => d.id === 'sat')!.spent).toBe(32.5)
    expect(after.days.find(d => d.id === 'sat')!.spent).toBe(14.5)
    expect(after.days.find(d => d.id === 'sun')!.spent).toBe(18)
  })
})
