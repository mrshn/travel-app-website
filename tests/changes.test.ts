import { describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import {
  CHANGES_FLIGHT_CHECKLIST, CHANGES_STAYS, changesDayLabel, changesFixed, changesIsMust, changesMoveTargets, changesRestOfDay,
  changesShift, changesStartLater, changesStayMessage,
} from '../shared/utils/changes'
import { emptyProgress, planDays, sortStops, type DayPlan, type ResolvedStop } from '../shared/utils/plan'
import { parseClock, tripMoment, zonedToDate } from '../shared/utils/time'
import type { Stop, Trip, TripProgress } from '../shared/types/trip'

const trip = romeTrip as Trip
const rome = (date: string, clock: string) => zonedToDate(date, parseClock(clock)!, trip.timezone).toISOString()
const momentAt = (date: string, clock: string) => tripMoment(trip, new Date(rome(date, clock)))

/** Seed S of the spec (section 9): Thursday done, Friday's stops before 16:00 done (St Peter's skipped). */
function seedS(): TripProgress {
  const p = emptyProgress()
  for (const s of trip.days[0]!.stops) p.stops[s.id] = { status: 'done', at: rome('2026-10-08', '23:30') }
  const fri = sortStops(trip.days[1]!.stops).filter(s => s.start < 16 * 60)
  fri.forEach((s, i) => {
    p.stops[s.id] = { status: i === 3 ? 'skipped' : 'done', at: rome('2026-10-09', `${9 + i}:10`) }
  })
  return p
}

function plansAt(p: TripProgress, date: string, clock: string): DayPlan[] {
  return planDays(trip, p, momentAt(date, clock))
}
const dayOf = (plans: DayPlan[], id: string) => plans.find(x => x.view.day.id === id)!
const stopIn = (plan: DayPlan, id: string): ResolvedStop => plan.stops.find(s => s.id === id)!

const VATICAN = 'vatican-museums-sistine-chapel'
const CASTEL = 'castel-sant-angelo-the-angel-s-terrace'
const PONTE = 'ponte-sant-angelo-via-dei-coronari-piazza-navona'
const STEPS = 'top-of-the-spanish-steps-for-sunset-18-38'
const ARMANDO = 'dinner-at-armando-al-pantheon'

describe('fixed stops', () => {
  const base: Stop = { id: 'x', start: 600, timeLabel: '10:00', kind: 'sight', title: 'X' }
  it('never moves a booked stop, a flight, a train or the way to the airport', () => {
    expect(changesFixed({ ...base, bookingId: 'vatican' })).toBe('booked')
    expect(changesFixed({ ...base, kind: 'move', icon: 'flight' })).toBe('flight')
    expect(changesFixed({ ...base, kind: 'move', icon: 'plane' })).toBe('flight')
    expect(changesFixed({ ...base, kind: 'move', icon: 'train' })).toBe('train')
    expect(changesFixed({ ...base, kind: 'move', icon: 'metro', offToAirport: true })).toBe('airport')
    expect(changesFixed({ ...base, kind: 'move', icon: 'metro' })).toBeNull()
    expect(changesFixed({ ...base, offToAirport: true })).toBeNull()
    expect(changesFixed(base)).toBeNull()
    expect(CHANGES_STAYS.booked).toBe('Stays: booked')
  })

  it('reads the picked option: a choice with a booking stays', () => {
    const p = emptyProgress()
    const fri = dayOf(plansAt(p, '2026-10-09', '10:00'), 'fri')
    expect(changesFixed(stopIn(fri, ARMANDO))).toBe('booked')
    expect(changesFixed(stopIn(fri, 'pantheon'))).toBe('booked')
    expect(changesFixed(stopIn(fri, PONTE))).toBeNull()
  })

  it('knows a must-do: tagged must or booked, never a small logistics step', () => {
    expect(changesIsMust({ tags: ['must'] })).toBe(true)
    expect(changesIsMust({ bookingId: 'b' })).toBe(true)
    expect(changesIsMust({ tags: ['must'], minor: true })).toBe(false)
    expect(changesIsMust({ tags: ['skipIfTired'] })).toBe(false)
  })
})

describe('running late: changesShift', () => {
  it('Seed S at Fri 10:00, 30 min late: seven stops move, the booked Pantheon and dinner stay, two clashes', () => {
    const fri = dayOf(plansAt(seedS(), '2026-10-09', '10:00'), 'fri')
    const r = changesShift(fri.stops, fri.states, 600, 30)
    expect(r.moved).toBe(7)
    expect(r.items.map(i => i.id)).toEqual([
      PONTE, 'pantheon', 'sant-ignazio-s-painted-false-dome', 'galleria-sciarra', 'trevi-fountain', STEPS, ARMANDO,
      'pick-frinight', 'trevi-at-night-free-and-lit',
    ])
    const ponte = r.items.find(i => i.id === PONTE)!
    expect(ponte).toMatchObject({ from: 990, to: 1020, end: 1065, timeLabel: '17:00' })
    expect(ponte.clash).toEqual({ id: 'pantheon', title: 'Pantheon', start: 1035 })
    const pantheon = r.items.find(i => i.id === 'pantheon')!
    expect(pantheon).toMatchObject({ from: 1035, to: 1035, stays: 'booked', timeLabel: '17:15' })
    expect(pantheon.end).toBeUndefined()
    expect(r.items.find(i => i.id === ARMANDO)!.stays).toBe('booked')
    expect(r.items.find(i => i.id === STEPS)!.clash?.id).toBe(ARMANDO)
    expect(r.clashes).toBe(2)
    // Done and skipped stops (the morning) are never listed.
    expect(r.items.some(i => i.id === VATICAN || i.id === CASTEL)).toBe(false)
  })

  it('leaves out stops that start before the given minute', () => {
    const fri = dayOf(plansAt(emptyProgress(), '2026-10-09', '07:00'), 'fri')
    const r = changesShift(fri.stops, fri.states, 17 * 60 + 30, 15)
    expect(r.items.every(i => i.from >= 1050)).toBe(true)
    expect(r.items[0]!.id).toBe('sant-ignazio-s-painted-false-dome')
    expect(r.items.find(i => i.id === 'trevi-fountain')).toMatchObject({ to: 1100, end: 1115, timeLabel: '18:20' })
  })

  it('runs past midnight with values over 1440, as plans do', () => {
    const sat = dayOf(plansAt(emptyProgress(), '2026-10-10', '20:00'), 'sat')
    const r = changesShift(sat.stops, sat.states, 23 * 60, 90)
    const bars = r.items.find(i => i.id === 'trastevere-bars')!
    expect(bars).toMatchObject({ from: 1380, to: 1470, end: 1590, timeLabel: '00:30' })
    const club = r.items.find(i => i.id === 'pick-satclub')!
    expect(club).toMatchObject({ from: 1500, to: 1590, timeLabel: '02:30' })
    const home = r.items.find(i => i.id === 'home-by-night-bus-nmb-or-an-official-taxi')!
    expect(home).toMatchObject({ from: 1680, to: 1770, timeLabel: '05:30', minor: true })
    expect(home.end).toBeUndefined()
  })

  it('keeps the train and the way to the airport on the last day, and warns of the clash', () => {
    const mon = dayOf(plansAt(emptyProgress(), '2026-10-12', '06:00'), 'mon')
    const r = changesShift(mon.stops, mon.states, 9 * 60, 60)
    const by = (id: string) => r.items.find(i => i.id.startsWith(id))!
    expect(by('termini-platforms').stays).toBe('train')
    expect(by('leonardo-express').stays).toBe('train')
    expect(by('terminal-3').stays).toBe('flight')
    expect(by('pegasus').stays).toBe('flight')
    // The last visit's default pick is the booked Pantheon: it stays too.
    expect(by('pick-monnine')).toMatchObject({ to: 540, stays: 'booked' })
    // The bus, 09:40 to 10:15, now 10:40 to 11:15: over the platforms (10:45); collecting the bag, over the train.
    expect(by('bus-40')).toMatchObject({ from: 580, to: 640, timeLabel: '10:40' })
    expect(by('bus-40').clash?.id).toMatch(/^termini-platforms/)
    expect(by('collect-your-bag').clash?.id).toMatch(/^leonardo-express/)
    expect(r.moved).toBe(2)
  })

  it('leaves out missed stops (gone by, unmarked) and stops marked done or skipped', () => {
    const p = emptyProgress()
    p.stops[STEPS] = { status: 'skipped', at: rome('2026-10-09', '18:00') }
    const fri = dayOf(plansAt(p, '2026-10-09', '18:10'), 'fri')
    expect(fri.states.pantheon).toBe('missed')
    const r = changesShift(fri.stops, fri.states, 1000, 30)
    expect(r.items.map(i => i.id)).not.toContain('pantheon')
    expect(r.items.map(i => i.id)).not.toContain(STEPS)
    expect(r.items.map(i => i.id)).toContain('trevi-fountain')
  })

  it('moves nothing with no stops left', () => {
    expect(changesShift([], {}, 600, 30)).toEqual({ items: [], moved: 0, clashes: 0 })
  })
})

describe('starting later: changesStartLater', () => {
  it('Fri 10:00, untouched, start at 13:00: three to skip, the Vatican to move or skip', () => {
    const fri = dayOf(plansAt(emptyProgress(), '2026-10-09', '10:00'), 'fri')
    const r = changesStartLater(fri.stops, fri.states, 13 * 60)
    expect(r.skip.map(s => s.id)).toEqual(['metro-a-termini-ottaviano', 'early-lunch-at-bonci-pizzarium', 'st-peter-s-basilica-the-free-grottoes'])
    expect(r.must.map(s => s.id)).toEqual([VATICAN])
  })

  it('leaves out what is done or skipped, and what starts at that time or later', () => {
    const fri = dayOf(plansAt(seedS(), '2026-10-09', '10:00'), 'fri')
    const r = changesStartLater(fri.stops, fri.states, 17 * 60)
    expect(r.must).toEqual([])
    expect(r.skip.map(s => s.id)).toEqual([PONTE])
  })

  it('a small must-do step (check-in) is skipped, not moved', () => {
    const thu = dayOf(plansAt(emptyProgress(), '2026-10-08', '12:00'), 'thu')
    const r = changesStartLater(thu.stops, thu.states, 23 * 60)
    expect(r.skip.map(s => s.id)).toContain('online-check-in-done-boarding-pass-printed')
    expect(r.must).toEqual([])
  })
})

describe('where a must-do can go: changesMoveTargets', () => {
  const plans = plansAt(emptyProgress(), '2026-10-09', '10:00')
  const fri = dayOf(plans, 'fri')

  it('the Vatican Museums are closed on Sunday and Monday is the way home: Sat 10 only', () => {
    const t = changesMoveTargets(trip, plans, stopIn(fri, VATICAN), 'fri')
    expect(t).toEqual([{ dayId: 'sat', label: 'Sat 10', stops: 10, open: 'open' }])
  })

  it('Castel Sant\'Angelo is open both days: the day with fewer stops first', () => {
    const t = changesMoveTargets(trip, plans, stopIn(fri, CASTEL), 'fri')
    expect(t.map(x => x.label)).toEqual(['Sat 10', 'Sun 11'])
    expect(t.map(x => x.stops)).toEqual([10, 11])
  })

  it('with the Colosseum on Sunday, Saturday has fewer stops and comes first; never a day the stop is already on', () => {
    const p = emptyProgress()
    p.variant = 'sun'
    const pl = plansAt(p, '2026-10-09', '10:00')
    const t = changesMoveTargets(trip, pl, stopIn(dayOf(pl, 'fri'), CASTEL), 'fri')
    expect(t[0]!.dayId).toBe('sat')
    // Saturday's afternoon pick is already on Saturday: Sunday (10 stops) and Friday (11).
    const afternoon = stopIn(dayOf(pl, 'sat'), 'pick-satafternoon')
    expect(changesMoveTargets(trip, pl, afternoon, 'thu').map(x => `${x.dayId} ${x.stops}`)).toEqual(['sun 10', 'fri 11'])
  })

  it('a stop that is no known place may go to any day ahead but the last, as not known', () => {
    const lunch = stopIn(fri, 'early-lunch-at-bonci-pizzarium')
    const t = changesMoveTargets(trip, plans, { ...lunch, title: 'Lunch somewhere nice', placeId: undefined }, 'fri')
    expect(t.map(x => x.dayId)).toEqual(['sat', 'sun'])
    expect(t.every(x => x.open === 'unknown')).toBe(true)
  })

  it('nothing from the day before the last, or on a short trip', () => {
    expect(changesMoveTargets(trip, plans, stopIn(fri, CASTEL), 'sun')).toEqual([])
    const two = { ...trip, days: trip.days.slice(0, 2) }
    expect(changesMoveTargets(two, plans, stopIn(fri, CASTEL), 'thu')).toEqual([])
  })

  it('labels a day as the pad does', () => {
    expect(changesDayLabel('2026-10-10')).toBe('Sat 10')
    expect(changesDayLabel('2026-10-01')).toBe('Thu 1')
  })
})

describe('the rest of today off: changesRestOfDay', () => {
  it('Seed S at Fri 16:40: what is left is skipped, the booked Pantheon and dinner stay', () => {
    const fri = dayOf(plansAt(seedS(), '2026-10-09', '16:40'), 'fri')
    const r = changesRestOfDay(fri.stops, fri.states, 1000)
    expect(r.skip.map(s => s.id)).toEqual([
      PONTE, 'sant-ignazio-s-painted-false-dome', 'galleria-sciarra', 'trevi-fountain', STEPS, 'pick-frinight', 'trevi-at-night-free-and-lit',
    ])
    expect(r.keep.map(s => s.id)).toEqual(['pantheon', ARMANDO])
  })

  it('nothing left late at night', () => {
    const fri = dayOf(plansAt(seedS(), '2026-10-09', '23:50'), 'fri')
    const done = { ...fri.states }
    for (const s of fri.stops) if (s.endMin > 1430) done[s.id] = 'done'
    expect(changesRestOfDay(fri.stops, done, 1430)).toEqual({ skip: [], keep: [] })
  })
})

describe('a cancelled or delayed flight', () => {
  it('has the checklist of spec 5.12', () => {
    expect(CHANGES_FLIGHT_CHECKLIST.map(c => c.text)).toEqual([
      'Ask for rerouting on another airline before accepting a refund or credit',
      'Ask for meal vouchers and a hotel in writing',
      'Keep every receipt and screenshot',
      'Screenshot the cancellation email and the app',
      'Ask for the reason in writing',
      'Tell your stay you\'ll arrive later',
      'Check which bookings you can move',
    ])
    expect(new Set(CHANGES_FLIGHT_CHECKLIST.map(c => c.id)).size).toBe(7)
  })

  it('writes to the place you stay in English and Italian', () => {
    const m = changesStayMessage(trip, { date: '2026-10-09', minutes: 12 * 60 })
    expect(m.lang).toBe('Italian')
    expect(m.en).toBe('Hello. I have a booking with you from Thursday 8 October. Because of a problem with my flight, I\'ll arrive later than planned: on Friday 9 October, around 12:00. Please don\'t cancel my booking: I\'m still coming. Thank you.')
    expect(m.local).toBe('Buongiorno. Ho una prenotazione da voi a partire da giovedì 8 ottobre. A causa di un problema con il mio volo, arriverò più tardi del previsto: venerdì 9 ottobre, verso le ore 12:00. Vi prego di non cancellare la prenotazione: arrivo comunque. Grazie.')
  })

  it('a time after midnight is the next calendar day; no time, no "around"', () => {
    const late = changesStayMessage(trip, { date: '2026-10-08', minutes: 1530 })
    expect(late.en).toContain('on Friday 9 October, around 01:30.')
    expect(late.local).toContain('venerdì 9 ottobre, verso le ore 01:30.')
    const day = changesStayMessage(trip, { date: '2026-10-09' })
    expect(day.en).toContain('on Friday 9 October.')
    expect(day.local).toContain('venerdì 9 ottobre.')
  })

  it('English only for a trip outside Italy', () => {
    const lisbon = { ...trip, country: 'Portugal', timezone: 'Europe/Lisbon', start: '2026-11-05' }
    const m = changesStayMessage(lisbon, { date: '2026-11-06', minutes: 600 })
    expect(m.local).toBeNull()
    expect(m.lang).toBeNull()
    expect(m.en).toContain('from Thursday 5 November')
    expect(m.en).toContain('on Friday 6 November, around 10:00.')
  })

  it('has no em dash in any text', () => {
    const dash = String.fromCharCode(0x2014)
    const texts = [
      ...CHANGES_FLIGHT_CHECKLIST.flatMap(c => [c.text, c.why ?? '']),
      ...Object.values(CHANGES_STAYS),
      changesStayMessage(trip, { date: '2026-10-09', minutes: 600 }).en,
      changesStayMessage(trip, { date: '2026-10-09', minutes: 600 }).local!,
    ]
    expect(texts.filter(t => t.includes(dash))).toEqual([])
  })
})
