/**
 * Two versions of one shared plan, merged (group trips: docs/design/2026-10-14-together.md, section 7).
 *
 * A plan is kept as lists of stops: each day's own list, and each day's variant lists (the Colosseum swap). Stop ids
 * are unique within a version of the plan, not across the trip (the same "Colosseum" stop sits on Saturday's list
 * and on Sunday's "sun" list), so a stop is keyed by its list and its id: "<dayId>:<variant or ''>:<stopId>".
 *
 * - The newer trip (updatedAt) gives everything that isn't a stop, a booking or a packing item: names, dates, days.
 * - A stop both versions have: the one changed last (Stop.updatedAt; a stop never changed in the app counts as oldest).
 * - A stop only one has: kept, unless the other deleted it at or after that change (Trip.tombstones "stop:<key>").
 * - Bookings by id and packing items by text: everything from both, less what either deleted.
 * Pure, and the same both ways round: mergeTrips(a, b) equals mergeTrips(b, a) except for the local-only `group`,
 * which comes from `a`.
 */
import type { Booking, Day, Stop, Trip } from '../types/trip'

/** Milliseconds of an ISO time; missing or unreadable is 0 (the oldest). */
function ms(iso?: string): number {
  const t = iso ? Date.parse(iso) : Number.NaN
  return Number.isFinite(t) ? t : 0
}

/** Which of a day's lists holds a version's stops: the variant's own list when the day has one, else the day's. */
export function stopListKey(day: Pick<Day, 'variants'>, variant?: string): string {
  return variant && day.variants?.[variant] ? variant : ''
}

/** The key a stop is merged by: its day, its list ('' for the day's own) and its id. */
export function stopKey(dayId: string, list: string, stopId: string): string {
  return `${dayId}:${list}:${stopId}`
}

/** The tombstone of a stop deleted from a list. */
export function stopTombstone(dayId: string, list: string, stopId: string): string {
  return `stop:${stopKey(dayId, list, stopId)}`
}

interface Placed {
  stop: Stop
  dayId: string
  list: string
}

/** Every stop of a trip by its key (stopKey). */
export function placedStops(trip: Pick<Trip, 'days'>): Map<string, Placed> {
  const out = new Map<string, Placed>()
  for (const d of trip.days ?? []) {
    for (const s of d.stops ?? []) {
      const k = stopKey(d.id, '', s.id)
      if (!out.has(k)) out.set(k, { stop: s, dayId: d.id, list: '' })
    }
    for (const [list, v] of Object.entries(d.variants ?? {})) {
      for (const s of v?.stops ?? []) {
        const k = stopKey(d.id, list, s.id)
        if (!out.has(k)) out.set(k, { stop: s, dayId: d.id, list })
      }
    }
  }
  return out
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

/** The newer of two trips, the same whichever comes first: updatedAt, then the larger JSON. */
function newerTrip(a: Trip, b: Trip): [Trip, Trip] {
  const ta = ms(a.updatedAt)
  const tb = ms(b.updatedAt)
  if (ta !== tb) return ta > tb ? [a, b] : [b, a]
  const ja = JSON.stringify({ ...a, group: undefined })
  const jb = JSON.stringify({ ...b, group: undefined })
  return ja >= jb ? [a, b] : [b, a]
}

/** Both sets of tombstones, the later time of each. */
function mergeTombstones(a?: Record<string, string>, b?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const src of [a, b]) {
    for (const [k, v] of Object.entries(src ?? {})) {
      if (typeof v !== 'string' || k === '__proto__') continue
      const cur = out[k]
      if (cur === undefined || ms(v) > ms(cur) || (ms(v) === ms(cur) && v > cur)) out[k] = v
    }
  }
  return out
}

/** The one of two versions of a stop to keep: changed last, then the newer trip's. */
function pickStop(x: Stop, y: Stop, xFromNewer: boolean): Stop {
  const tx = ms(x.updatedAt)
  const ty = ms(y.updatedAt)
  if (tx !== ty) return tx > ty ? x : y
  return xFromNewer ? x : y
}

/** Deleted at or after it was last changed (a stop never changed in the app loses to any deletion). */
function buried(stop: Stop, tomb: string | undefined): boolean {
  return tomb !== undefined && ms(tomb) >= ms(stop.updatedAt)
}

export function mergeTrips(a: Trip, b: Trip): Trip {
  const [newer, older] = newerTrip(a, b)
  const out = clone(newer)
  const tombstones = mergeTombstones(a.tombstones, b.tombstones)

  // Stops: list by list, key by key.
  const fromNewer = placedStops(newer)
  const fromOlder = placedStops(older)
  const keys = [...new Set([...fromNewer.keys(), ...fromOlder.keys()])]
  const lists = new Map<string, Stop[]>()
  for (const k of keys) {
    const x = fromNewer.get(k)
    const y = fromOlder.get(k)
    const place = (x ?? y)!
    const stop = x && y ? pickStop(x.stop, y.stop, true) : place.stop
    if (buried(stop, tombstones[`stop:${k}`])) continue
    const listId = `${place.dayId}:${place.list}`
    if (!lists.has(listId)) lists.set(listId, [])
    lists.get(listId)!.push(clone(stop))
  }
  for (const day of out.days ?? []) {
    day.stops = ordered(lists.get(`${day.id}:`) ?? [], day.stops)
    for (const [list, v] of Object.entries(day.variants ?? {})) {
      if (v) v.stops = ordered(lists.get(`${day.id}:${list}`) ?? [], v.stops)
    }
  }

  // Bookings: everything from both (the newer trip's version of each), less the deleted ones.
  const bookings: Booking[] = []
  const seen = new Set<string>()
  for (const bk of [...(newer.bookings ?? []), ...(older.bookings ?? [])]) {
    if (!bk?.id || seen.has(bk.id)) continue
    seen.add(bk.id)
    if (tombstones[`booking:${bk.id}`] === undefined) bookings.push(clone(bk))
  }
  out.bookings = bookings

  // Packing: the newer trip's order, then what only the older has, less the deleted ones.
  const packing: string[] = []
  for (const item of [...(newer.packing ?? []), ...(older.packing ?? [])]) {
    if (typeof item !== 'string' || packing.includes(item)) continue
    if (tombstones[`packing:${item}`] === undefined) packing.push(item)
  }
  out.packing = packing

  if (Object.keys(tombstones).length) out.tombstones = tombstones
  else delete out.tombstones
  out.updatedAt = ms(a.updatedAt) >= ms(b.updatedAt) ? a.updatedAt : b.updatedAt
  if (a.edited || b.edited) out.edited = true
  if (a.group) out.group = clone(a.group)
  else delete out.group
  return out
}

/**
 * The merged stops of one list, in a stable order: by start time, then as the newer trip had them, then the rest
 * by id (so both ways round give the same list).
 */
function ordered(stops: Stop[], was: Stop[] | undefined): Stop[] {
  const pos = new Map((was ?? []).map((s, i) => [s.id, i] as const))
  return stops
    .slice()
    .sort((x, y) => (x.start - y.start)
      || ((pos.get(x.id) ?? Number.MAX_SAFE_INTEGER) - (pos.get(y.id) ?? Number.MAX_SAFE_INTEGER))
      || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))
}
