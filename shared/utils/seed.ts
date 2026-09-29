/** Keeping trips that ship with the app (seeds) in step with newer versions pushed to GitHub. */
import type { Stop, Trip } from '../types/trip'

/** FNV-1a, 32-bit, as hex. */
export function hashString(s: string): string {
  let h = 0x811C9DC5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** A fingerprint of the plan itself: ids, timestamps and local flags don't count. */
export function planFingerprint(t: Trip): string {
  const { id: _id, createdAt: _c, updatedAt: _u, seedVersion: _v, edited: _e, ...plan } = t
  return hashString(JSON.stringify(plan))
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

/** A fresh copy of a seed, ready to store. */
export function copyOfSeed(seed: Trip, keep?: Pick<Trip, 'id' | 'createdAt'>): Trip {
  const t = clone(seed)
  if (keep) {
    t.id = keep.id
    t.createdAt = keep.createdAt
  }
  t.seedVersion = planFingerprint(seed)
  t.edited = false
  t.updatedAt = new Date().toISOString()
  return t
}

/**
 * The newer seed, plus what you added yourself: your own stops (on the same day and
 * version of the plan) and packing items. Changes you made to seeded stops are replaced.
 */
export function mergeSeed(local: Trip, seed: Trip): Trip {
  const next = copyOfSeed(seed, local)
  let carried = 0
  for (const day of local.days) {
    const target = next.days.find(d => d.id === day.id)
    if (!target) continue
    const lists: [Stop[], Stop[]][] = [[day.stops, target.stops]]
    for (const [key, v] of Object.entries(day.variants ?? {})) {
      const tv = target.variants?.[key]
      lists.push([v.stops, tv ? tv.stops : target.stops])
    }
    for (const [from, to] of lists) {
      for (const s of from) {
        if (s.custom && !to.some(x => x.id === s.id)) {
          to.push(clone(s))
          carried++
        }
      }
    }
  }
  const extraPacking = local.packing.filter(x => !next.packing.includes(x))
  next.packing = [...next.packing, ...extraPacking]
  next.edited = carried > 0 || extraPacking.length > 0
  return next
}
