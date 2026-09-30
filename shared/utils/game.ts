/**
 * The game: stamps fill sets, a Roman rank rises with them, and 12 badges reward moments of the trip.
 * Everything here is worked out from what you already do (ticks, stamps, ratings, notes, costs, bookings
 * and packing); nothing is stored, so nothing can be farmed and nothing needs syncing.
 * Time rules read the planned times of stops, never the time you tapped.
 */
import type { PlaceCard, Trip, TripProgress } from '../types/trip'
import type { CostSummary } from './costs'
import type { DayPlan } from './plan'
import { placeIsCollectable, type PlaceSetProgress, type PlaceStampInfo } from './places'

export interface GameRankDef {
  /** 1 to 7, shown in Roman numerals ("Rank II"). */
  n: number
  /** Stamps needed. */
  min: number
  name: string
  gloss: string
  line: string
}

/** The Roman ranks, by number of stamps (spec 4.5). */
export const GAME_RANKS: readonly GameRankDef[] = Object.freeze([
  { n: 1, min: 0, name: 'Peregrinus', gloss: 'the newcomer', line: 'Your first stamp is waiting.' },
  { n: 2, min: 3, name: 'Viator', gloss: 'the wayfarer', line: 'The road is yours.' },
  { n: 3, min: 8, name: 'Explorator', gloss: 'the scout', line: 'You know your way around.' },
  { n: 4, min: 15, name: 'Civis', gloss: 'the citizen', line: 'The city treats you like a local now.' },
  { n: 5, min: 22, name: 'Tribunus', gloss: 'the tribune', line: 'People ask you for directions.' },
  { n: 6, min: 30, name: 'Consul', gloss: 'the consul', line: 'Your stamps fill a whole page.' },
  { n: 7, min: 40, name: 'Imperator', gloss: 'the emperor', line: 'Veni, vidi, vici.' },
].map(r => Object.freeze(r)))

export interface GameRank extends GameRankDef {
  stamps: number
  /** The rank after this one; missing at the top. */
  next?: GameRankDef
  /** Stamps still needed for the next rank (0 at the top). */
  toNext: number
}

/** The rank for a number of stamps (anything that isn't a whole number of 1 or more counts as 0). */
export function gameRank(stamps: number): GameRank {
  const count = Number.isFinite(stamps) && stamps > 0 ? Math.floor(stamps) : 0
  let i = 0
  while (i + 1 < GAME_RANKS.length && count >= GAME_RANKS[i + 1]!.min) i++
  const next = GAME_RANKS[i + 1]
  const out: GameRank = { ...GAME_RANKS[i]!, stamps: count, toNext: next ? next.min - count : 0 }
  if (next) out.next = next
  return out
}

const NUMERALS: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]

/** A whole number in Roman numerals ("II", "IX"); "" for anything below 1. */
export function gameNumeral(n: number): string {
  let rest = Number.isFinite(n) ? Math.floor(n) : 0
  let out = ''
  for (const [v, s] of NUMERALS) {
    while (rest >= v) {
      out += s
      rest -= v
    }
  }
  return out
}

export type BadgeId = 'first-stamp' | 'top-picks' | 'sightseer' | 'foodie' | 'shutterbug' | 'early-bird'
  | 'golden-hour' | 'night-owl' | 'money-diary' | 'critic' | 'storyteller' | 'ready'

export interface BadgeDef {
  id: BadgeId
  label: string
  /** How to earn it, shown while it is locked (the wording for Rome; GameBadge.rule fits the trip's goal). */
  rule: string
  icon: string
}

/** The 12 badges, in the order of the spec (4.5). */
export const GAME_BADGES: readonly BadgeDef[] = Object.freeze(([
  { id: 'first-stamp', label: 'First stamp', rule: 'Stamp your first place.', icon: 'stamp' },
  { id: 'top-picks', label: 'Top picks', rule: 'Stamp all 8 top picks.', icon: 'star' },
  { id: 'sightseer', label: 'Sightseer', rule: 'Stamp 10 sights.', icon: 'landmark' },
  { id: 'foodie', label: 'Foodie', rule: 'Stamp 5 places to eat.', icon: 'food' },
  { id: 'shutterbug', label: 'Shutterbug', rule: 'Stamp 5 photo spots.', icon: 'camera' },
  { id: 'early-bird', label: 'Early bird', rule: 'Tick off a stop that starts before 08:00.', icon: 'sunrise' },
  { id: 'golden-hour', label: 'Golden hour', rule: 'Be at a stop when the sun sets.', icon: 'sunset' },
  { id: 'night-owl', label: 'Night owl', rule: 'Tick off a night out.', icon: 'moon' },
  { id: 'money-diary', label: 'Money diary', rule: 'Log a cost on 3 days of the trip.', icon: 'wallet' },
  { id: 'critic', label: 'Critic', rule: 'Rate 10 stops.', icon: 'heart' },
  { id: 'storyteller', label: 'Storyteller', rule: 'Write a day journal on 3 days.', icon: 'book' },
  { id: 'ready', label: 'Ready to go', rule: 'Tick every "Do now" booking and pack everything.', icon: 'bag' },
] satisfies BadgeDef[]).map(b => Object.freeze(b)))

export interface GameBadge extends BadgeDef {
  /** How many count so far (it can pass the goal). */
  value: number
  /** How many it takes, capped by what the trip offers (never 0: such a badge is left out). */
  goal: number
  earned: boolean
}

/** What gameBadges reads. */
export interface GameInput {
  trip: Trip
  p: TripProgress
  /** The resolved plan (planDays). */
  plans: readonly DayPlan[]
  /** placeStamps(): the stamped places. */
  stamps: ReadonlyMap<string, PlaceStampInfo>
  costs: CostSummary
}

/** "Rate 10 stops." / "Rate a stop.": the rule for a goal, one or many. */
const counted = (goal: number, one: string, many: (n: number) => string) => (goal === 1 ? one : many(goal))

/** The rule for a badge, worded for the goal this trip gives it (on Rome, the spec's words). */
function ruleFor(def: BadgeDef, goal: number, parts: { bookings: number, packing: number }): string {
  switch (def.id) {
    case 'top-picks': return counted(goal, 'Stamp the top pick.', n => `Stamp all ${n} top picks.`)
    case 'sightseer': return counted(goal, 'Stamp a sight.', n => `Stamp ${n} sights.`)
    case 'foodie': return counted(goal, 'Stamp a place to eat.', n => `Stamp ${n} places to eat.`)
    case 'shutterbug': return counted(goal, 'Stamp a photo spot.', n => `Stamp ${n} photo spots.`)
    case 'money-diary': return counted(goal, 'Log a cost on a day of the trip.', n => `Log a cost on ${n} days of the trip.`)
    case 'critic': return counted(goal, 'Rate a stop.', n => `Rate ${n} stops.`)
    case 'storyteller': return counted(goal, 'Write a day journal.', n => `Write a day journal on ${n} days.`)
    case 'ready':
      if (!parts.bookings) return 'Pack everything.'
      if (!parts.packing) return 'Tick every "Do now" booking.'
      return def.rule
    default: return def.rule
  }
}

const EARLY = 8 * 60

/**
 * Every badge the trip offers (a goal of 0 leaves the badge out), in the spec's order, with how far you are.
 * Stamps count collectable places only; stops count from the resolved plan, by their planned times:
 * Early bird is a done stop (small steps too) planned to start before 08:00; Golden hour a done stop of kind
 * sight, food or night, not a small step, whose planned slot [start, end) holds its day's sunset.
 */
export function gameBadges(i: GameInput): GameBadge[] {
  const { trip, p, plans, stamps, costs } = i
  const places = (trip.places ?? []).filter(placeIsCollectable)
  const byId = new Map(places.map(x => [x.id, x]))
  const stamped: PlaceCard[] = []
  for (const id of stamps.keys()) {
    const place = byId.get(id)
    if (place) stamped.push(place)
  }
  const of = (list: readonly PlaceCard[], c: PlaceCard['category']) => list.filter(x => x.category === c).length

  const marks = p.stops ?? {}
  const done = (id: string) => marks[id]?.status === 'done'
  const stops = plans.flatMap(plan => plan.stops.map(s => ({ s, sunset: plan.view.day.sun?.set })))
  const early = stops.filter(({ s }) => Number.isFinite(s.start) && s.start < EARLY)
  const golden = stops.filter(({ s, sunset }) =>
    !s.minor && (s.kind === 'sight' || s.kind === 'food' || s.kind === 'night')
    && typeof sunset === 'number' && s.start <= sunset && sunset < s.endMin)
  const nights = stops.filter(({ s }) => s.kind === 'night')
  const doneOf = (list: typeof stops) => list.filter(({ s }) => done(s.id)).length

  const rated = Object.values(p.feedback ?? {}).filter(fb => (fb?.rating ?? 0) > 0).length
  const journals = trip.days.filter(d => !!p.dayNotes?.[d.id]?.note?.trim()).length
  const asap = (trip.bookings ?? []).filter(b => b.asap)
  const packing = trip.packing ?? []
  const ready = asap.filter(b => !!p.bookings?.[b.id]).length + packing.filter(x => !!p.packing?.[x]).length
  const days = trip.days.length

  const tally: Record<BadgeId, [value: number, goal: number]> = {
    'first-stamp': [stamped.length, Math.min(1, places.length)],
    'top-picks': [stamped.filter(x => x.top).length, places.filter(x => x.top).length],
    'sightseer': [of(stamped, 'sight'), Math.min(10, of(places, 'sight'))],
    'foodie': [of(stamped, 'food'), Math.min(5, of(places, 'food'))],
    'shutterbug': [of(stamped, 'photo'), Math.min(5, of(places, 'photo'))],
    'early-bird': [doneOf(early), Math.min(1, early.length)],
    'golden-hour': [doneOf(golden), Math.min(1, golden.length)],
    'night-owl': [doneOf(nights), Math.min(1, nights.length)],
    'money-diary': [costs.days, Math.min(3, days)],
    'critic': [rated, Math.min(10, stops.length)],
    'storyteller': [journals, Math.min(3, days)],
    'ready': [ready, asap.length + packing.length],
  }

  const out: GameBadge[] = []
  for (const def of GAME_BADGES) {
    const [value, goal] = tally[def.id]
    if (!(goal > 0)) continue
    out.push({ ...def, rule: ruleFor(def, goal, { bookings: asap.length, packing: packing.length }), value, goal, earned: value >= goal })
  }
  return out
}

export interface GameState {
  /** Stamped places (collectable ones). */
  stamps: number
  rank: GameRank
  /** The badges this trip offers, earned or not. */
  badges: GameBadge[]
  /** How many of them are earned. */
  earned: number
  sets: PlaceSetProgress[]
}

/** Stamps, rank, badges and sets of a trip, all worked out from the progress (nothing is stored). */
export function gameState(i: GameInput & { sets: PlaceSetProgress[] }): GameState {
  const badges = gameBadges(i)
  const collectable = new Set((i.trip.places ?? []).filter(placeIsCollectable).map(x => x.id))
  let stamps = 0
  for (const id of i.stamps.keys()) {
    if (collectable.has(id)) stamps++
  }
  return { stamps, rank: gameRank(stamps), badges, earned: badges.filter(b => b.earned).length, sets: i.sets }
}
