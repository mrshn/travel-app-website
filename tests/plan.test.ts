import { describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import { activeVariant, dayViews, emptyProgress, findStop, planDays, resolveStop, resolveStops, stopStates, summarize } from '../shared/utils/plan'
import { liveGuide } from '../shared/utils/guide'
import { tripMoment } from '../shared/utils/time'
import type { Stop, Trip } from '../shared/types/trip'

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
