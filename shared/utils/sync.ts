/** Keeping this device and the cloud copy in step. Pure functions: the Firebase side lives in the app. */
import type { Feedback, Trip, TripProgress } from '../types/trip'
import { emptyProgress } from './plan'
import { hashString } from './seed'

export type ItemKind = 'trip' | 'progress'

/** What's stored in the cloud for one trip or one trip's progress. */
export interface CloudItem {
  kind: ItemKind
  ref: string
  /** The trip or progress as JSON (Firestore can't hold nested arrays, and this keeps it exact). */
  json: string
  /** Milliseconds; set by the device that wrote it. */
  updatedAt: number
  deleted?: boolean
}

/** What this device last agreed with the cloud about an item. */
export interface Known {
  hash: string
  updatedAt: number
}

export const itemKey = (kind: ItemKind, ref: string) => `${kind}-${ref}`

export function jsonHash(json: string): string {
  return `${json.length.toString(36)}.${hashString(json)}`
}

/**
 * Milliseconds of an ISO time (Date.parse, so "…+02:00" and "…Z" compare right); unreadable counts as oldest.
 * A time with no zone is read as UTC, so every device reads it the same whatever its own time zone.
 * A number is taken as milliseconds, in case a writer stored Date.now() instead of an ISO string.
 */
function timeOf(iso?: string | number): number {
  if (typeof iso === 'number') return Number.isFinite(iso) ? iso : Number.NEGATIVE_INFINITY
  if (typeof iso !== 'string') return Number.NEGATIVE_INFINITY
  const s = iso.trim()
  const t = Date.parse(/T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(s) ? `${s}Z` : s)
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t
}

const newer = (a?: string, b?: string) => timeOf(a) >= timeOf(b)

/** Own property check (Object.hasOwn is too new for some phones). */
const own = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key)

/** Top-level progress fields this version knows; any other field is kept as it is. */
const PROGRESS_FIELDS = new Set(['stops', 'feedback', 'choices', 'bookings', 'packing', 'variant', 'dayNotes', 'tripNote', 'expenses', 'stamps'])

function recordsOf<T>(m: unknown): Record<string, T> {
  return m && typeof m === 'object' && !Array.isArray(m) ? m as Record<string, T> : {}
}

const isRecord = (r: unknown): r is object => !!r && typeof r === 'object' && !Array.isArray(r)

/** A deletion: a cost's tombstone or a stamp taken back. */
const isRemoval = (r: object) => (r as { deleted?: unknown }).deleted === true || (r as { on?: unknown }).on === false

/**
 * Records with their own updatedAt: the newer copy wins; on a tie a deletion (deleted or on: false) wins,
 * then the larger JSON string, so merge(a, b) equals merge(b, a). Ids come out sorted, so both orders give
 * the same JSON too.
 */
export function mergeRecords<T extends { updatedAt: string }>(a?: Record<string, T>, b?: Record<string, T>): Record<string, T> {
  const ra = recordsOf<T>(a)
  const rb = recordsOf<T>(b)
  const out: Record<string, T> = {}
  const ids = [...new Set([...Object.keys(ra), ...Object.keys(rb)])].filter(id => id !== '__proto__').sort()
  for (const id of ids) {
    const x = own(ra, id) && isRecord(ra[id]) ? ra[id] : undefined
    const y = own(rb, id) && isRecord(rb[id]) ? rb[id] : undefined
    const win = x && y ? pickRecord(x, y) : (x ?? y)
    if (win) out[id] = win
  }
  return out
}

function pickRecord<T extends { updatedAt: string }>(x: T, y: T): T {
  const tx = timeOf(x.updatedAt)
  const ty = timeOf(y.updatedAt)
  if (tx !== ty) return tx > ty ? x : y
  const dx = isRemoval(x)
  const dy = isRemoval(y)
  if (dx !== dy) return dx ? x : y
  return JSON.stringify(x) >= JSON.stringify(y) ? x : y
}

/**
 * Two versions of the same progress that grew apart (e.g. used on two devices before signing in).
 * Keeps everything from both; where both have the same thing, the newer one wins. Costs and stamps merge
 * record by record (mergeRecords); top-level fields this version doesn't know are kept, b's winning.
 */
export function mergeProgress(a: TripProgress, b: TripProgress): TripProgress {
  const out = emptyProgress()
  for (const id of new Set([...Object.keys(a.stops ?? {}), ...Object.keys(b.stops ?? {})])) {
    const x = a.stops?.[id]
    const y = b.stops?.[id]
    out.stops[id] = x && y ? (newer(x.at, y.at) ? x : y) : (x ?? y)!
  }
  for (const id of new Set([...Object.keys(a.feedback ?? {}), ...Object.keys(b.feedback ?? {})])) {
    const x = a.feedback?.[id]
    const y = b.feedback?.[id]
    if (x && y) {
      const win: Feedback = newer(x.updatedAt, y.updatedAt) ? { ...x } : { ...y }
      const photos = [...new Set([...(x.photos ?? []), ...(y.photos ?? [])])]
      if (photos.length) win.photos = photos
      out.feedback[id] = win
    }
    else {
      out.feedback[id] = (x ?? y)!
    }
  }
  for (const id of new Set([...Object.keys(a.dayNotes ?? {}), ...Object.keys(b.dayNotes ?? {})])) {
    const x = a.dayNotes?.[id]
    const y = b.dayNotes?.[id]
    out.dayNotes[id] = x && y ? (newer(x.updatedAt, y.updatedAt) ? x : y) : (x ?? y)!
  }
  out.choices = { ...a.choices, ...b.choices }
  out.bookings = { ...a.bookings, ...b.bookings }
  out.packing = { ...a.packing, ...b.packing }
  const variant = b.variant ?? a.variant
  if (variant) out.variant = variant
  const note = (b.tripNote?.length ?? 0) >= (a.tripNote?.length ?? 0) ? b.tripNote : a.tripNote
  if (note) out.tripNote = note
  out.expenses = mergeRecords(a.expenses, b.expenses)
  out.stamps = mergeRecords(a.stamps, b.stamps)
  // Fields from a newer app version survive a merge made by this one.
  const extra = out as unknown as Record<string, unknown>
  for (const src of [a, b]) {
    for (const [k, v] of Object.entries(src ?? {})) {
      if (!PROGRESS_FIELDS.has(k) && k !== '__proto__') extra[k] = v
    }
  }
  return out
}

export type Decision =
  | { do: 'nothing' }
  | { do: 'upload' }
  | { do: 'apply' }
  | { do: 'tombstone' }
  | { do: 'delete-local' }
  | { do: 'merge', json: string }

/** Nothing of yours in it: an untouched seeded trip, or progress with no marks (a cost tombstone or a stamp record counts). */
export function isPristine(kind: ItemKind, json: string): boolean {
  if (kind === 'trip') return !(JSON.parse(json) as Trip).edited
  const p = JSON.parse(json) as TripProgress
  const n = (o?: object) => Object.keys(o ?? {}).length
  return !n(p.stops) && !n(p.feedback) && !n(p.dayNotes) && !n(p.bookings) && !n(p.packing) && !n(p.choices) && !p.tripNote
    && !n(p.expenses) && !n(p.stamps) && !p.variant
}

/**
 * A trip put on this device after `at` (milliseconds): its createdAt, which "Try the sample trip" sets to the moment
 * it adds the copy, and a new trip to the moment it is made. A copy of a seed the app added by itself before accounts
 * carries the seed's own date.
 */
function addedAfter(kind: ItemKind, json: string, at: number): boolean {
  return kind === 'trip' && timeOf((JSON.parse(json) as Trip).createdAt) > at
}

/**
 * A newer cloud copy with this device's costs and stamps merged back in (mergeRecords), when taking it as it is
 * would lose some: it lacks one of them, or holds an older version of one (so an edit, a deletion or a stamp
 * taken back would be undone). Else undefined. Everything else comes from the newer copy, as when applying it.
 *
 * Records are never removed while a trip's progress exists (a deletion is a tombstone, a stamp taken back is
 * `on: false` or `null`), so such a copy lost them on its way: an older app version's merge drops both maps,
 * this version's next edit on that phone saves them back empty, and a phone that had not seen the latest
 * changes may put back the older versions it held.
 */
function keepRecords(local: string, remote: string): string | undefined {
  try {
    const l = JSON.parse(local) as unknown
    const r = JSON.parse(remote) as unknown
    if (!isRecord(l) || !isRecord(r)) return undefined
    const mine = l as Partial<TripProgress>
    const theirs = r as Partial<TripProgress>
    const expenses = mergeRecords(mine.expenses, theirs.expenses)
    const stamps = mergeRecords(mine.stamps, theirs.stamps)
    // mergeRecords of their map alone is that map tidied (ids sorted, non-records left out).
    const same = (merged: object, map?: Record<string, { updatedAt: string }>) => JSON.stringify(merged) === JSON.stringify(mergeRecords(map))
    if (same(expenses, theirs.expenses) && same(stamps, theirs.stamps)) return undefined
    return JSON.stringify({ ...theirs, expenses, stamps })
  }
  catch {
    return undefined
  }
}

/**
 * What to do with one item, given this device's copy, the cloud's copy and what they last agreed on.
 * `local` is undefined when the item doesn't exist on this device.
 * A newer progress copy that would lose or roll back one of this device's costs or stamps is not applied as it
 * is: `merge` gives that copy with them merged back in (keepRecords).
 */
export function decide(kind: ItemKind, local: string | undefined, remote: CloudItem | undefined, known: Known | undefined): Decision {
  const localHash = local === undefined ? undefined : jsonHash(local)
  const localChanged = localHash !== known?.hash

  if (!remote) return local === undefined ? { do: 'nothing' } : { do: 'upload' }

  const remoteChanged = !known || remote.updatedAt > known.updatedAt

  if (!remoteChanged) {
    // The cloud hasn't moved since we last agreed.
    if (local === undefined) return remote.deleted ? { do: 'nothing' } : { do: 'tombstone' }
    return localChanged ? { do: 'upload' } : { do: 'nothing' }
  }

  // The cloud has something newer than what we last saw.
  if (remote.deleted) {
    if (local === undefined) return { do: 'nothing' }
    if (!localChanged) return { do: 'delete-local' }
    // Deleted elsewhere but changed here: keep yours, unless there's nothing of yours in it. A trip put here after
    // the deletion is yours all the same (the sample tried again on a new device): the deletion was of another copy.
    return !known && isPristine(kind, local) && !addedAfter(kind, local, remote.updatedAt) ? { do: 'delete-local' } : { do: 'upload' }
  }
  if (local === undefined || !localChanged || localHash === jsonHash(remote.json)) {
    // Taking the newer copy must never lose or roll back this device's costs and stamps (an older app
    // version's merge drops them): merge them back in instead.
    const json = kind === 'progress' && local !== undefined ? keepRecords(local, remote.json) : undefined
    return json === undefined ? { do: 'apply' } : { do: 'merge', json }
  }

  // Both changed since they last agreed (or never met): combine.
  if (kind === 'progress') {
    const merged = mergeProgress(JSON.parse(local) as TripProgress, JSON.parse(remote.json) as TripProgress)
    return { do: 'merge', json: JSON.stringify(merged) }
  }
  // A trip nobody changed (fresh from the app) never replaces one you worked on.
  const localPristine = isPristine('trip', local)
  const remotePristine = isPristine('trip', remote.json)
  if (localPristine !== remotePristine) return localPristine ? { do: 'apply' } : { do: 'upload' }
  const lt = JSON.parse(local) as Trip
  const rt = JSON.parse(remote.json) as Trip
  return newer(lt.updatedAt, rt.updatedAt) ? { do: 'upload' } : { do: 'apply' }
}
