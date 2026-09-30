import { describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import { costSummary } from '../shared/utils/costs'
import { GAME_BADGES, GAME_RANKS, gameBadges, gameNumeral, gameRank, gameState, type GameBadge, type GameState } from '../shared/utils/game'
import { placeIsCollectable, placeSetProgress, placeStamps } from '../shared/utils/places'
import { emptyProgress, planDays, sortStops } from '../shared/utils/plan'
import { mergeProgress } from '../shared/utils/sync'
import { parseClock, tripMoment, zonedToDate, type TripMoment } from '../shared/utils/time'
import type { Day, Expense, PlaceCard, Stop, Trip, TripProgress } from '../shared/types/trip'

const trip = romeTrip as Trip
const rome = (date: string, clock: string) => zonedToDate(date, parseClock(clock)!, trip.timezone).toISOString()
const liveFri = tripMoment(trip, new Date(rome('2026-10-09', '16:40')))
const collectable = (trip.places ?? []).filter(placeIsCollectable)
const ofCategory = (c: PlaceCard['category']) => collectable.filter(p => p.category === c).map(p => p.id)

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

/** The game as the app works it out: the resolved plan, stamps, costs and sets of that progress. */
function game(p: TripProgress, t: Trip = trip, at: TripMoment = liveFri): GameState {
  const plans = planDays(t, p, at)
  const stamps = placeStamps(t, p, plans)
  const costs = costSummary(t, p, plans)
  return gameState({ trip: t, p, plans, stamps, costs, sets: placeSetProgress(t, stamps) })
}

const badge = (g: GameState, id: string) => g.badges.find(b => b.id === id)
/** What the Badges page shows for a badge: "Earned", "2 of 8", or nothing when hidden. */
const shown = (b?: GameBadge) => (b ? (b.earned ? 'Earned' : `${b.value} of ${b.goal}`) : 'hidden')

function stampByHand(p: TripProgress, ids: string[], at = rome('2026-10-09', '16:45')) {
  for (const id of ids) p.stamps![id] = { on: true, at, updatedAt: at }
}

function tick(p: TripProgress, stopId: string, at: string) {
  p.stops[stopId] = { status: 'done', at }
}

/** A one-day trip on Fri 9 Oct (sunset 18:38), for rules the Rome data can't isolate. */
function tinyTrip(stops: Stop[], extra: Partial<Trip> = {}): Trip {
  const day: Day = {
    id: 'd1', date: '2026-10-09', num: '1', label: 'Day', title: 'Day', cover: { scene: 'skyline', tod: 'day' },
    sun: { rise: 435, set: 1118 }, facts: [], stops,
  }
  return {
    id: 'tiny', title: 'Tiny', destination: 'Tiny', timezone: 'Europe/Rome', start: '2026-10-09', end: '2026-10-09',
    cover: { scene: 'skyline', tod: 'day' }, currency: 'EUR', days: [day], bookings: [], packing: [],
    createdAt: '2026-09-30T10:00:00.000Z', updatedAt: '2026-09-30T10:00:00.000Z', ...extra,
  }
}
const stop = (id: string, start: number, end: number, kind: Stop['kind'], extra: Partial<Stop> = {}): Stop =>
  ({ id, start, end, timeLabel: '', kind, title: id, ...extra })

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o)
    for (const v of Object.values(o as object)) deepFreeze(v)
  }
  return o
}

describe('ranks', () => {
  it('has the seven Roman ranks of the spec', () => {
    expect(GAME_RANKS.map(r => `${gameNumeral(r.n)} ${r.min} ${r.name} (${r.gloss}): ${r.line}`)).toEqual([
      'I 0 Peregrinus (the newcomer): Your first stamp is waiting.',
      'II 3 Viator (the wayfarer): The road is yours.',
      'III 8 Explorator (the scout): You know your way around.',
      'IV 15 Civis (the citizen): The city treats you like a local now.',
      'V 22 Tribunus (the tribune): People ask you for directions.',
      'VI 30 Consul (the consul): Your stamps fill a whole page.',
      'VII 40 Imperator (the emperor): Veni, vidi, vici.',
    ])
  })

  it('rises at 3, 8, 15, 22, 30 and 40 stamps (boundaries 2/3, 7/8, 39/40)', () => {
    const at = (n: number) => `${gameRank(n).name} +${gameRank(n).toNext} ${gameRank(n).next?.name ?? '-'}`
    expect(at(0)).toBe('Peregrinus +3 Viator')
    expect(at(2)).toBe('Peregrinus +1 Viator')
    expect(at(3)).toBe('Viator +5 Explorator')
    expect(at(7)).toBe('Viator +1 Explorator')
    expect(at(8)).toBe('Explorator +7 Civis')
    expect(at(14)).toBe('Explorator +1 Civis')
    expect(at(15)).toBe('Civis +7 Tribunus')
    expect(at(22)).toBe('Tribunus +8 Consul')
    expect(at(30)).toBe('Consul +10 Imperator')
    expect(at(39)).toBe('Consul +1 Imperator')
    expect(at(40)).toBe('Imperator +0 -')
    expect(gameRank(79)).toMatchObject({ n: 7, name: 'Imperator', stamps: 79, toNext: 0 })
    expect(gameRank(79).next).toBeUndefined()
    expect(gameRank(3)).toMatchObject({ n: 2, min: 3, gloss: 'the wayfarer', line: 'The road is yours.', stamps: 3 })
  })

  it('reads a count that is not a whole number above 0 as what it can', () => {
    expect(gameRank(-4)).toMatchObject({ n: 1, stamps: 0 })
    expect(gameRank(Number.NaN)).toMatchObject({ n: 1, stamps: 0 })
    expect(gameRank(Number.POSITIVE_INFINITY)).toMatchObject({ n: 1, stamps: 0 })
    expect(gameRank(8.9)).toMatchObject({ n: 3, stamps: 8 })
  })

  it('writes rank numbers in Roman numerals', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 9, 12, 14, 19, 31, 40].map(gameNumeral)).toEqual(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'IX', 'XII', 'XIV', 'XIX', 'XXXI', 'XL'])
    expect(gameNumeral(0)).toBe('')
    expect(gameNumeral(Number.NaN)).toBe('')
  })
})

describe('badges', () => {
  it('lists the 12 badges of the spec, in its order', () => {
    expect(GAME_BADGES.map(b => b.id)).toMatchInlineSnapshot(`
      [
        "first-stamp",
        "top-picks",
        "sightseer",
        "foodie",
        "shutterbug",
        "early-bird",
        "golden-hour",
        "night-owl",
        "money-diary",
        "critic",
        "storyteller",
        "ready",
      ]
    `)
    expect(GAME_BADGES.map(b => `${b.label} | ${b.rule} | ${b.icon}`)).toEqual([
      'First stamp | Stamp your first place. | stamp',
      'Top picks | Stamp all 8 top picks. | star',
      'Sightseer | Stamp 10 sights. | landmark',
      'Foodie | Stamp 5 places to eat. | food',
      'Shutterbug | Stamp 5 photo spots. | camera',
      'Early bird | Tick off a stop that starts before 08:00. | sunrise',
      'Golden hour | Be at a stop when the sun sets. | sunset',
      'Night owl | Tick off a night out. | moon',
      'Money diary | Log a cost on 3 days of the trip. | wallet',
      'Critic | Rate 10 stops. | heart',
      'Storyteller | Write a day journal on 3 days. | book',
      'Ready to go | Tick every "Do now" booking and pack everything. | bag',
    ])
  })

  it('reads Seed S as the spec says (G1)', () => {
    const g = game(seedS())
    expect(g.badges).toHaveLength(12)
    expect(g.earned).toBe(2)
    expect(g.badges.filter(b => b.earned).map(b => b.id)).toEqual(['first-stamp', 'early-bird'])
    expect(Object.fromEntries(g.badges.map(b => [b.id, shown(b)]))).toEqual({
      'first-stamp': 'Earned',
      'top-picks': '2 of 8',
      'sightseer': '2 of 10',
      'foodie': '1 of 5',
      'shutterbug': '0 of 5',
      'early-bird': 'Earned',
      'golden-hour': '0 of 1',
      'night-owl': '0 of 1',
      'money-diary': '2 of 3',
      'critic': '3 of 10',
      'storyteller': '1 of 3',
      'ready': '16 of 26',
    })
    expect(g.stamps).toBe(3)
    expect(g.rank).toMatchObject({ n: 2, name: 'Viator', gloss: 'the wayfarer', stamps: 3, toNext: 5 })
    expect(g.rank.next?.name).toBe('Explorator')
    // On Rome the rules read as the spec's table.
    expect(g.badges.map(b => b.rule)).toEqual(GAME_BADGES.map(b => b.rule))
  })

  it('reads fresh progress as rank I with nothing earned', () => {
    const g = game(emptyProgress())
    expect(g.stamps).toBe(0)
    expect(g.rank).toMatchObject({ n: 1, name: 'Peregrinus', line: 'Your first stamp is waiting.', toNext: 3 })
    expect(g.earned).toBe(0)
    expect(g.badges).toHaveLength(12)
    expect(g.badges.every(b => b.value === 0 && !b.earned)).toBe(true)
  })

  it('gives First stamp for one stamp, by hand or from a tick', () => {
    const p = emptyProgress()
    stampByHand(p, ['sight-galleria-doria-pamphilj'])
    expect(shown(badge(game(p), 'first-stamp'))).toBe('Earned')
    const q = emptyProgress()
    tick(q, 'pantheon', rome('2026-10-09', '17:30'))
    expect(shown(badge(game(q), 'first-stamp'))).toBe('Earned')
  })

  it('gives Top picks for all 8 top picks', () => {
    const top = collectable.filter(p => p.top).map(p => p.id)
    expect(top).toHaveLength(8)
    const p = emptyProgress()
    stampByHand(p, top.slice(0, 7))
    expect(shown(badge(game(p), 'top-picks'))).toBe('7 of 8')
    stampByHand(p, top.slice(7))
    expect(shown(badge(game(p), 'top-picks'))).toBe('Earned')
  })

  it('gives Sightseer for 10 sights, Foodie for 5 places to eat and Shutterbug for 5 photo spots', () => {
    const p = emptyProgress()
    stampByHand(p, [...ofCategory('sight').slice(0, 9), ...ofCategory('food').slice(0, 4), ...ofCategory('photo').slice(0, 4)])
    let g = game(p)
    expect([shown(badge(g, 'sightseer')), shown(badge(g, 'foodie')), shown(badge(g, 'shutterbug'))]).toEqual(['9 of 10', '4 of 5', '4 of 5'])
    stampByHand(p, [ofCategory('sight')[9]!, ofCategory('food')[4]!, ofCategory('photo')[4]!])
    g = game(p)
    expect([shown(badge(g, 'sightseer')), shown(badge(g, 'foodie')), shown(badge(g, 'shutterbug'))]).toEqual(['Earned', 'Earned', 'Earned'])
  })

  it('does not count a stamp taken back, or a place that is not collectable', () => {
    const p = seedS()
    const at = rome('2026-10-09', '16:50')
    p.stamps!['sight-vatican-museums'] = { on: false, at, updatedAt: at }
    p.stamps!['food-tonnarello'] = { on: true, at, updatedAt: at }
    const g = game(p)
    expect(g.stamps).toBe(2)
    expect(shown(badge(g, 'sightseer'))).toBe('1 of 10')
    expect(shown(badge(g, 'foodie'))).toBe('1 of 5')
  })

  it('gives Early bird for a stop planned before 08:00, whenever you ticked it', () => {
    const p = emptyProgress()
    // Planned 08:00 sharp, ticked at 07:30: not before 08:00 by the plan.
    tick(p, 'vatican-museums-sistine-chapel', rome('2026-10-09', '07:30'))
    // Planned 00:45 after Thursday (24:45): a late night, not an early morning.
    tick(p, 'check-in-at-yellowsquare-via-palestro-51', rome('2026-10-09', '00:50'))
    expect(shown(badge(game(p), 'early-bird'))).toBe('0 of 1')
    // Planned 07:00, ticked mid-morning.
    tick(p, 'spanish-steps-nearly-empty-sunrise-07-19', rome('2026-10-12', '10:30'))
    expect(shown(badge(game(p), 'early-bird'))).toBe('Earned')
  })

  it('counts a small step for Early bird (Seed S: Metro A at 07:15)', () => {
    const p = emptyProgress()
    tick(p, 'metro-a-termini-ottaviano', rome('2026-10-09', '09:10'))
    expect(shown(badge(game(p), 'early-bird'))).toBe('Earned')
  })

  it('gives Golden hour for a stop whose planned slot holds the sunset, whenever you ticked it', () => {
    const p = emptyProgress()
    // Trevi is planned 18:05 to 18:20; ticked during the sunset, it still isn't a sunset stop.
    tick(p, 'trevi-fountain', rome('2026-10-09', '18:38'))
    expect(shown(badge(game(p), 'golden-hour'))).toBe('0 of 1')
    // The Spanish Steps are planned 18:20 to 19:20 and the sun sets at 18:38; ticked late at night.
    tick(p, 'top-of-the-spanish-steps-for-sunset-18-38', rome('2026-10-09', '23:00'))
    expect(shown(badge(game(p), 'golden-hour'))).toBe('Earned')
  })

  it('leaves small steps, moves and days without a sunset out of Golden hour', () => {
    const at = rome('2026-10-09', '19:00')
    const stops = [
      stop('minor-sight', 18 * 60 + 30, 19 * 60, 'sight', { minor: true }),
      stop('walk', 18 * 60 + 30, 19 * 60, 'move'),
      stop('rest', 18 * 60 + 30, 19 * 60, 'rest'),
      stop('drinks', 17 * 60, 18 * 60 + 38, 'night'), // ends as the sun sets: [start, end) leaves it out
      stop('dinner', 18 * 60 + 38, 20 * 60, 'food'), // starts as the sun sets: in
    ]
    const t = tinyTrip(stops)
    const p = emptyProgress()
    for (const id of ['minor-sight', 'walk', 'rest', 'drinks']) tick(p, id, at)
    expect(shown(badge(game(p, t), 'golden-hour'))).toBe('0 of 1')
    tick(p, 'dinner', at)
    expect(shown(badge(game(p, t), 'golden-hour'))).toBe('Earned')
    // The same day with no sunset time offers no Golden hour at all.
    const dark = tinyTrip(stops)
    delete dark.days[0]!.sun
    expect(badge(game(p, dark), 'golden-hour')).toBeUndefined()
  })

  it('gives Night owl for a night out ticked off', () => {
    const p = seedS()
    expect(shown(badge(game(p), 'night-owl'))).toBe('0 of 1')
    tick(p, 'pick-frinight', rome('2026-10-10', '01:30'))
    expect(shown(badge(game(p), 'night-owl'))).toBe('Earned')
  })

  it('gives Money diary for costs on 3 trip days (not before the trip, not deleted, once per day)', () => {
    const at = rome('2026-10-09', '12:00')
    const cost = (id: string, dayId?: string, extra: Partial<Expense> = {}): Expense => ({ id, amount: 5, currency: 'EUR', cat: 'food', dayId, at, updatedAt: at, ...extra })
    const p = emptyProgress()
    p.expenses = { c1: cost('c1', 'fri'), c2: cost('c2', 'fri'), c3: cost('c3', 'sat'), c4: cost('c4'), c5: cost('c5', 'sun', { deleted: true }) }
    expect(shown(badge(game(p), 'money-diary'))).toBe('2 of 3')
    p.expenses.c6 = cost('c6', 'mon', { cat: 'stay' })
    expect(shown(badge(game(p), 'money-diary'))).toBe('Earned')
  })

  it('gives Critic for 10 rated stops', () => {
    const p = emptyProgress()
    const ids = planDays(trip, p, liveFri).flatMap(d => d.stops.map(s => s.id)).slice(0, 10)
    const at = rome('2026-10-09', '12:00')
    for (const id of ids.slice(0, 9)) p.feedback[id] = { rating: 4, updatedAt: at }
    p.feedback[ids[9]!] = { note: 'No stars yet', updatedAt: at }
    expect(shown(badge(game(p), 'critic'))).toBe('9 of 10')
    p.feedback[ids[9]!] = { rating: 1, updatedAt: at }
    expect(shown(badge(game(p), 'critic'))).toBe('Earned')
  })

  it('gives Storyteller for a day journal with words on 3 days', () => {
    const at = rome('2026-10-09', '23:00')
    const p = emptyProgress()
    p.dayNotes = { thu: { note: 'Landed.', updatedAt: at }, fri: { note: '   ', rating: 5, updatedAt: at }, sat: { rating: 4, updatedAt: at } }
    expect(shown(badge(game(p), 'storyteller'))).toBe('1 of 3')
    p.dayNotes.fri = { note: 'Vatican day.', updatedAt: at }
    p.dayNotes.sun = { note: 'Trastevere.', updatedAt: at }
    expect(shown(badge(game(p), 'storyteller'))).toBe('Earned')
  })

  it('gives Ready to go for every "Do now" booking and every packing item', () => {
    const p = emptyProgress()
    const asap = trip.bookings.filter(b => b.asap)
    expect(asap).toHaveLength(9)
    for (const b of trip.bookings.filter(b => !b.asap)) p.bookings[b.id] = true
    for (const x of trip.packing) p.packing[x] = true
    expect(shown(badge(game(p), 'ready'))).toBe('17 of 26')
    for (const b of asap) p.bookings[b.id] = true
    expect(shown(badge(game(p), 'ready'))).toBe('Earned')
  })

  it('hides a badge whose goal is 0 and words the rules for what the trip offers', () => {
    const t = tinyTrip([stop('lunch', 12 * 60, 13 * 60, 'food'), stop('museum', 14 * 60, 16 * 60, 'sight')])
    const g = game(emptyProgress(), t)
    expect(g.badges.map(b => `${b.id} ${b.goal}: ${b.rule}`)).toEqual([
      'money-diary 1: Log a cost on a day of the trip.',
      'critic 2: Rate 2 stops.',
      'storyteller 1: Write a day journal.',
    ])
    expect(g.earned).toBe(0)
  })

  it('caps goals by what the trip offers', () => {
    const card = (id: string, category: PlaceCard['category'], extra: Partial<PlaceCard> = {}): PlaceCard => ({ id, category, name: id, text: '', scene: 'skyline', ...extra })
    const places = [
      card('s1', 'sight', { top: true }), card('s2', 'sight'), card('s3', 'sight'),
      card('f1', 'food'), card('f2', 'food'), card('trap', 'food', { verdict: 'trap', top: true }),
    ]
    const bookings = [{ id: 'b1', due: null, dueLabel: 'Now', title: 'Tickets', asap: true }, { id: 'b2', due: null, dueLabel: 'Later', title: 'Later' }]
    const t = tinyTrip([stop('breakfast', 7 * 60 + 30, 8 * 60, 'food'), stop('bar', 22 * 60, 24 * 60, 'night')], { places, bookings, packing: [] })
    const p = emptyProgress()
    stampByHand(p, ['s1', 's2', 'f1'])
    const g = game(p, t)
    expect(g.badges.map(b => `${b.id} ${b.value}/${b.goal}${b.earned ? ' earned' : ''}: ${b.rule}`)).toEqual([
      'first-stamp 3/1 earned: Stamp your first place.',
      'top-picks 1/1 earned: Stamp the top pick.',
      'sightseer 2/3: Stamp 3 sights.',
      'foodie 1/2: Stamp 2 places to eat.',
      'early-bird 0/1: Tick off a stop that starts before 08:00.',
      'night-owl 0/1: Tick off a night out.',
      'money-diary 0/1: Log a cost on a day of the trip.',
      'critic 0/2: Rate 2 stops.',
      'storyteller 0/1: Write a day journal.',
      'ready 0/1: Tick every "Do now" booking.',
    ])
    const packOnly = tinyTrip([], { packing: ['Passport', 'Charger'] })
    expect(game(emptyProgress(), packOnly).badges.find(b => b.id === 'ready')?.rule).toBe('Pack everything.')
  })

  it('gives the same list from gameBadges as from gameState', () => {
    const p = seedS()
    const plans = planDays(trip, p, liveFri)
    const stamps = placeStamps(trip, p, plans)
    expect(gameBadges({ trip, p, plans, stamps, costs: costSummary(trip, p, plans) })).toEqual(game(p).badges)
  })
})

describe('the game state (G6)', () => {
  it('is pure: the same progress gives the same state, and nothing is written to it', () => {
    const p = deepFreeze(seedS())
    const before = JSON.stringify(p)
    const a = game(p)
    const b = game(p)
    expect(a).toEqual(b)
    expect(JSON.stringify(p)).toBe(before)
    // Nothing about the game is kept in the progress.
    expect(Object.keys(p).sort()).toEqual(['bookings', 'choices', 'dayNotes', 'expenses', 'feedback', 'packing', 'stamps', 'stops'])
  })

  it('does not depend on the time of day it is worked out', () => {
    const p = seedS()
    tick(p, 'top-of-the-spanish-steps-for-sunset-18-38', rome('2026-10-09', '18:45'))
    const later = tripMoment(trip, new Date(rome('2026-10-11', '10:00')))
    expect(game(p, trip, later)).toEqual(game(p))
  })

  it('lowers the counts and the rank when you untick', () => {
    const p = seedS()
    tick(p, 'top-of-the-spanish-steps-for-sunset-18-38', rome('2026-10-09', '18:45'))
    let g = game(p)
    expect(g.stamps).toBe(5)
    expect(badge(g, 'golden-hour')?.earned).toBe(true)
    delete p.stops['top-of-the-spanish-steps-for-sunset-18-38']
    g = game(p)
    expect(g.stamps).toBe(3)
    expect(badge(g, 'golden-hour')?.earned).toBe(false)

    stampByHand(p, ['sight-galleria-doria-pamphilj', 'sight-galleria-spada', 'sight-domus-aurea', 'sight-ostia-antica', 'sight-appian-way'])
    g = game(p)
    expect(g.stamps).toBe(8)
    expect(g.rank.name).toBe('Explorator')
    delete p.stops['castel-sant-angelo-the-angel-s-terrace']
    g = game(p)
    expect(g.stamps).toBe(7)
    expect(g.rank.name).toBe('Viator')
    expect(shown(badge(g, 'top-picks'))).toBe('1 of 8')
  })

  it('gives the same state whatever order two devices merged in', () => {
    const phone = seedS()
    const laptop = emptyProgress()
    const at = rome('2026-10-09', '17:40')
    tick(laptop, 'pantheon', at)
    laptop.feedback.pantheon = { rating: 4, updatedAt: at }
    laptop.stamps = {
      'sight-galleria-doria-pamphilj': { on: true, at, updatedAt: at },
      'sight-vatican-museums': { on: false, at, updatedAt: at },
    }
    laptop.expenses = { c1: { id: 'c1', amount: 3.5, currency: 'EUR', cat: 'food', dayId: 'sat', at, updatedAt: at } }
    laptop.dayNotes.fri = { note: 'Long day.', updatedAt: at }
    const ab = game(mergeProgress(phone, laptop))
    const ba = game(mergeProgress(laptop, phone))
    expect(ab).toEqual(ba)
    expect(JSON.stringify(ab)).toBe(JSON.stringify(ba))
    expect(ab.stamps).toBe(4) // Bonci, Castel Sant'Angelo, Pantheon, Doria Pamphilj; the Vatican stamp taken back
    expect(shown(badge(ab, 'money-diary'))).toBe('Earned')
    expect(shown(badge(ab, 'critic'))).toBe('4 of 10')
  })

  it('works on saves from before costs and stamps', () => {
    const p = seedS()
    delete p.stamps
    delete p.expenses
    const g = game(p)
    expect(g.stamps).toBe(3)
    expect(g.earned).toBe(2)
  })

  it('counts only collectable places of the trip, whatever map it is given', () => {
    const p = emptyProgress()
    const plans = planDays(trip, p, liveFri)
    const at = rome('2026-10-09', '16:45')
    const stamps = new Map([
      ['sight-pantheon', { placeId: 'sight-pantheon', at, via: 'tap' as const }],
      ['food-tonnarello', { placeId: 'food-tonnarello', at, via: 'tap' as const }],
      ['sight-nowhere', { placeId: 'sight-nowhere', at, via: 'tap' as const }],
    ])
    const g = gameState({ trip, p, plans, stamps, costs: costSummary(trip, p, plans), sets: [] })
    expect(g.stamps).toBe(1)
    expect(shown(badge(g, 'foodie'))).toBe('0 of 5')
    expect(shown(badge(g, 'sightseer'))).toBe('1 of 10')
  })

  it('passes the sets through', () => {
    const p = seedS()
    stampByHand(p, ['sight-st-peter-s-basilica', 'sight-santa-maria-maggiore', 'sight-st-john-lateran', 'sight-tempietto-del-bramante'])
    const g = game(p)
    expect(g.sets.find(s => s.set === 'church')).toEqual({ set: 'church', total: 4, stamped: 4, complete: true })
    expect(g.sets.filter(s => s.complete).map(s => s.set)).toEqual(['church'])
  })
})
