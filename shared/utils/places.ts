/**
 * Places as a collection: sets, which stops are which place, stamps and where each place sits in the plan.
 *
 * A place is stamped when you stamped it (stamps[id].on === true) or a done stop is that place, unless you
 * took the stamp back (on === false). A stop is a place when it links to it explicitly (Stop.placeId or
 * Choice.placeId), or when its title holds the place's core name as whole words and the kinds fit.
 * Never by distance. Tourist traps and closed places are never stamped.
 */
import type { PlaceCard, PlaceSet, StopKind, Trip, TripProgress } from '../types/trip'
import type { DayPlan } from './plan'
import { dateMs, tripMoment } from './time'

/** Display order of the sets. */
export const PLACE_SET_ORDER: readonly PlaceSet[] = Object.freeze([
  'ancient', 'art', 'church', 'underground', 'views', 'sight-other',
  'pasta', 'street', 'sweet', 'food-other',
  'morning', 'golden', 'anytime',
] as const)

type PlaceCategory = PlaceCard['category']

const SET_CATEGORY = new Map<string, PlaceCategory>([
  ['ancient', 'sight'], ['art', 'sight'], ['church', 'sight'], ['underground', 'sight'], ['views', 'sight'], ['sight-other', 'sight'],
  ['pasta', 'food'], ['street', 'food'], ['sweet', 'food'], ['food-other', 'food'],
  ['morning', 'photo'], ['golden', 'photo'], ['anytime', 'photo'],
])

/** Scene art to set (spec Appendix A). A scene only counts for a set of the place's own category. */
const SCENE_SET = new Map<string, PlaceSet>(Object.entries({
  colosseum: 'ancient', forum: 'ancient', ruins: 'ancient', appia: 'ancient', argentina: 'ancient', pantheon: 'ancient',
  spiral: 'art', borghese: 'art', capitoline: 'art', gallery: 'art', perspective: 'art', castel: 'art',
  stpeters: 'church', church: 'church', tempietto: 'church',
  catacomb: 'underground',
  trevi: 'views', steps: 'views', navona: 'views', keyhole: 'views', lake: 'views', market: 'views', skyline: 'views', vittoriano: 'views', alley: 'views',
  rigatoni: 'pasta', carbonara: 'pasta', cacio: 'pasta', lasagna: 'pasta',
  taglio: 'street', tonda: 'street', pizzabianca: 'street', suppli: 'street', trapizzino: 'street', panino: 'street',
  gelato: 'sweet', tiramisu: 'sweet', maritozzo: 'sweet', espresso: 'sweet',
} satisfies Record<string, PlaceSet>))

/** Words in a sight's name that put it underground, whatever its scene. */
const UNDERGROUND_WORDS = [' catacomb ', ' catacombs ', ' necropolis ', ' scavi ', ' underground ']

/**
 * Minutes of the first clock time in a text ("06:35–07:15, or after 22:00" is 395; "7:20" is 440), or null.
 * A photo spot's best time sorts it into a set here and starts a stop added from it in the stop editor.
 */
export function placeFirstClock(text?: string): number | null {
  const re = /(\d{1,2})[:.](\d{2})/g
  for (const m of (text ?? '').matchAll(re)) {
    const before = m.index ? text![m.index - 1] : ''
    const after = text![m.index! + m[0].length] ?? ''
    // Not part of a longer number or a price ("€7.45", "1.250").
    if (/[\d.,€$]/.test(before ?? '') || /\d/.test(after)) continue
    const h = Number(m[1])
    const min = Number(m[2])
    if (h < 24 && min < 60) return h * 60 + min
  }
  return null
}

/** The category a set belongs to. */
export function placeSetCategory(set: PlaceSet): PlaceCategory {
  return SET_CATEGORY.get(set) ?? 'sight'
}

/**
 * The set of a place: `p.set` when it is a known set of the place's own category; photo spots by the first
 * clock time of their best time (before 12:00 morning, from 12:00 golden, none any time); sights named
 * catacomb(s), necropolis, scavi or underground are underground, else by scene, else sight-other; food by
 * scene, else food-other.
 */
export function placeSetOf(p: PlaceCard): PlaceSet {
  if (p.set && SET_CATEGORY.get(p.set) === p.category) return p.set
  if (p.category === 'photo') {
    const t = placeFirstClock(p.bestTime)
    return t === null ? 'anytime' : t < 12 * 60 ? 'morning' : 'golden'
  }
  const byScene = SCENE_SET.get(p.scene)
  if (p.category === 'food') return byScene && SET_CATEGORY.get(byScene) === 'food' ? byScene : 'food-other'
  const name = placeNorm(p.name)
  if (UNDERGROUND_WORDS.some(w => name.includes(w))) return 'underground'
  return byScene && SET_CATEGORY.get(byScene) === 'sight' ? byScene : 'sight-other'
}

/** Part of the collection: everything but tourist traps and closed places. */
export function placeIsCollectable(p: PlaceCard): boolean {
  return p.verdict !== 'trap' && p.verdict !== 'closed'
}

const normCache = new Map<string, string>()

/**
 * Text for whole-word matching: lower case, accents and apostrophes removed, other punctuation to spaces,
 * single spaces, padded with one space on each side (" castel santangelo the angels terrace ").
 * Text with no letters or digits gives "".
 */
export function placeNorm(text: string): string {
  const src = typeof text === 'string' ? text : ''
  const hit = normCache.get(src)
  if (hit !== undefined) return hit
  const words = src
    .toLowerCase()
    .replace(/['‘’ʼ`´]/g, '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
  const out = words ? ` ${words} ` : ''
  if (normCache.size > 2000) normCache.clear()
  normCache.set(src, out)
  return out
}

/**
 * The name that stops are matched on: placeNorm of the part before " + ", " (", ":" or " · ", without a
 * leading la, il, lo, le, i, gli or the ("Colosseum + Forum + Palatine (24h)" is " colosseum ").
 */
export function placeCoreName(name: string): string {
  const head = (typeof name === 'string' ? name : '').split(/ \+ | \(|:| · /)[0] ?? ''
  return placeNorm(head).replace(/^ (?:la|il|lo|le|i|gli|the) (?=\S)/, ' ')
}

const letterCount = (s: string) => s.match(/\p{L}/gu)?.length ?? 0

/** Which categories of place a stop can be: sight stops are sights, food stops food, photo stops photo spots. */
function fits(category: PlaceCategory, kind: StopKind, icon?: string): boolean {
  if (category === 'sight') return kind === 'sight'
  if (category === 'food') return kind === 'food'
  return kind === 'sight' && icon === 'photo'
}

/** What placeLinksForStop reads from a stop (a ResolvedStop, or a plain Stop). */
interface LinkableStop {
  title: string
  kind: StopKind
  icon?: string
  placeId?: string
  choice?: { placeId?: string }
}

/**
 * The places a stop is (resolved title, kind and icon): the explicit `stop.choice?.placeId ?? stop.placeId`
 * when set (only if that place exists; it may be one that isn't collectable, which placeStamps ignores);
 * else every collectable place whose core name has at least 5 letters, sits in the stop's normalised
 * title as whole words, and whose category fits (sight from a sight stop, food from a food stop, photo spot
 * from a sight stop with the `photo` icon).
 */
export function placeLinksForStop(stop: LinkableStop, places: readonly PlaceCard[] = []): string[] {
  const explicit = stop.choice?.placeId || stop.placeId
  if (explicit) return places.some(p => p.id === explicit) ? [explicit] : []
  const title = placeNorm(stop.title)
  if (!title) return []
  const out: string[] = []
  for (const p of places) {
    if (!placeIsCollectable(p) || !fits(p.category, stop.kind, stop.icon)) continue
    const core = placeCoreName(p.name)
    if (letterCount(core) >= 5 && title.includes(core)) out.push(p.id)
  }
  return out
}

export interface PlaceStampInfo {
  placeId: string
  /** When it was stamped (ISO): the tick of the done stop, or the tap. The earlier one wins. */
  at: string
  via: 'tap' | 'stop'
  /** The done stop that gave the stamp (via 'stop'). */
  stopId?: string
}

export interface PlacePlanHit {
  stopId: string
  dayId: string
  /** The day's date, YYYY-MM-DD. */
  date: string
  /** Minutes after midnight of that day (over 1440 after midnight). */
  start: number
  title: string
}

export interface PlaceSetProgress {
  set: PlaceSet
  /** Collectable places in the set. */
  total: number
  stamped: number
  complete: boolean
}

/** Milliseconds of an ISO time; unreadable times sort after every real one. */
function ms(iso: string): number {
  const t = typeof iso === 'string' ? Date.parse(iso) : Number.NaN
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t
}

/**
 * Every stamped place, ordered by stamp time: places of done stops in the resolved plan (the earliest
 * tick wins) and places you stamped by hand (on: true; the earlier of hand and tick time wins).
 * on: false removes a stamp, derived ones included; on: null (or no record) leaves derived stamps alone.
 * Ids not in trip.places and places that aren't collectable are ignored.
 */
export function placeStamps(trip: Trip, p: TripProgress, plans: readonly DayPlan[]): Map<string, PlaceStampInfo> {
  const places = trip.places ?? []
  const order = new Map(places.map((x, i) => [x.id, i]))
  const collectable = (id: string) => {
    const i = order.get(id)
    return i !== undefined && placeIsCollectable(places[i]!)
  }
  const best = new Map<string, PlaceStampInfo>()
  const offer = (info: PlaceStampInfo) => {
    const cur = best.get(info.placeId)
    if (!cur || ms(info.at) < ms(cur.at)) best.set(info.placeId, info)
  }

  for (const plan of plans) {
    for (const s of plan.stops) {
      const mark = p.stops?.[s.id]
      if (mark?.status !== 'done') continue
      for (const id of placeLinksForStop(s, places)) {
        if (collectable(id)) offer({ placeId: id, at: mark.at, via: 'stop', stopId: s.id })
      }
    }
  }
  const records = p.stamps && typeof p.stamps === 'object' ? p.stamps : {}
  for (const [id, r] of Object.entries(records)) {
    if (r && r.on === true && collectable(id)) offer({ placeId: id, at: r.at, via: 'tap' })
  }
  for (const [id, r] of Object.entries(records)) {
    if (r && r.on === false) best.delete(id)
  }

  const sorted = [...best.values()].sort((a, b) => {
    const ta = ms(a.at)
    const tb = ms(b.at)
    if (ta !== tb) return ta < tb ? -1 : 1
    return (order.get(a.placeId) ?? 0) - (order.get(b.placeId) ?? 0)
  })
  return new Map(sorted.map(x => [x.placeId, x]))
}

/**
 * The date a stamp counts to, YYYY-MM-DD: the trip day of its time by the 05:00 rule, else its calendar
 * date in the trip's time zone. "" when the time can't be read.
 */
export function placeStampDate(trip: Pick<Trip, 'start' | 'end' | 'timezone' | 'days'>, info: Pick<PlaceStampInfo, 'at'>): string {
  const t = typeof info?.at === 'string' ? Date.parse(info.at) : Number.NaN
  if (Number.isNaN(t)) return ''
  return tripMoment(trip, new Date(t)).dayDate
}

/** The first stop of the resolved plan that is each place (any state), by day then start. */
export function placesInPlan(trip: Trip, plans: readonly DayPlan[]): Map<string, PlacePlanHit> {
  const places = trip.places ?? []
  const out = new Map<string, PlacePlanHit>()
  const days = [...plans].sort((a, b) => a.view.index - b.view.index)
  for (const plan of days) {
    const stops = [...plan.stops].sort((a, b) => a.start - b.start)
    for (const s of stops) {
      for (const id of placeLinksForStop(s, places)) {
        if (!out.has(id)) out.set(id, { stopId: s.id, dayId: plan.view.day.id, date: plan.view.day.date, start: s.start, title: s.title })
      }
    }
  }
  return out
}

/**
 * Whether a place is open on a trip day: verdict closed is closed; else PlaceCard.open at the index of
 * the day in trip.openDays (else the trip's day order), 'o' open and 'c' closed; else food with
 * sunday === false is closed on a Sunday; otherwise unknown.
 */
export function placeOpenOn(p: PlaceCard, trip: Pick<Trip, 'days' | 'openDays'>, dayId: string): 'open' | 'closed' | 'unknown' {
  if (p.verdict === 'closed') return 'closed'
  const order = trip.openDays ?? trip.days.map(d => d.id)
  const i = order.indexOf(dayId)
  const v = i >= 0 ? String(p.open?.[i] ?? '').toLowerCase() : ''
  if (v === 'o') return 'open'
  if (v === 'c') return 'closed'
  if (p.category === 'food' && p.sunday === false) {
    const day = trip.days.find(d => d.id === dayId)
    if (day && new Date(dateMs(day.date)).getUTCDay() === 0) return 'closed'
  }
  return 'unknown'
}

/** The price mentions "free". */
export function placeIsFree(p: PlaceCard): boolean {
  return /\bfree\b/i.test(p.price ?? '')
}

const BOOK_AHEAD = new Set(['yes', 'recommended', 'timed slot', 'online', 'guided', 'request form'])

/** Booking is Yes, Recommended, Timed slot, Online, Guided or Request form. */
export function placeNeedsBooking(p: PlaceCard): boolean {
  return BOOK_AHEAD.has((p.booking ?? '').trim().toLowerCase())
}

/**
 * Progress of every set that has collectable places, in PLACE_SET_ORDER: collectable places, how many of
 * them are stamped, and whether that is all of them. `stamps` is placeStamps() (a Set of ids works too).
 */
export function placeSetProgress(trip: Pick<Trip, 'places'>, stamps: { has(placeId: string): boolean }): PlaceSetProgress[] {
  const counts = new Map<PlaceSet, { total: number, stamped: number }>()
  for (const p of trip.places ?? []) {
    if (!placeIsCollectable(p)) continue
    const set = placeSetOf(p)
    const c = counts.get(set) ?? { total: 0, stamped: 0 }
    c.total++
    if (stamps.has(p.id)) c.stamped++
    counts.set(set, c)
  }
  return PLACE_SET_ORDER.filter(s => counts.has(s)).map((set) => {
    const c = counts.get(set)!
    return { set, total: c.total, stamped: c.stamped, complete: c.stamped === c.total }
  })
}
