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

const newer = (a?: string, b?: string) => (a ?? '') >= (b ?? '')

/**
 * Two versions of the same progress that grew apart (e.g. used on two devices before signing in).
 * Keeps everything from both; where both have the same thing, the newer one wins.
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
  return out
}

export type Decision =
  | { do: 'nothing' }
  | { do: 'upload' }
  | { do: 'apply' }
  | { do: 'tombstone' }
  | { do: 'delete-local' }
  | { do: 'merge', json: string }

/** Nothing of yours in it: an untouched seeded trip, or progress with no marks. */
export function isPristine(kind: ItemKind, json: string): boolean {
  if (kind === 'trip') return !(JSON.parse(json) as Trip).edited
  const p = JSON.parse(json) as TripProgress
  const n = (o?: object) => Object.keys(o ?? {}).length
  return !n(p.stops) && !n(p.feedback) && !n(p.dayNotes) && !n(p.bookings) && !n(p.packing) && !n(p.choices) && !p.tripNote
}

/**
 * What to do with one item, given this device's copy, the cloud's copy and what they last agreed on.
 * `local` is undefined when the item doesn't exist on this device.
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
    // Deleted elsewhere but changed here: keep yours, unless there's nothing of yours in it.
    return !known && isPristine(kind, local) ? { do: 'delete-local' } : { do: 'upload' }
  }
  if (local === undefined || !localChanged || localHash === jsonHash(remote.json)) return { do: 'apply' }

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
