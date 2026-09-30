import { describe, expect, it } from 'vitest'
import { decide, isPristine, jsonHash, mergeProgress, type CloudItem } from '../shared/utils/sync'
import { emptyProgress } from '../shared/utils/plan'
import type { TripProgress } from '../shared/types/trip'

const P = (f: (p: TripProgress) => void) => {
  const p = emptyProgress()
  f(p)
  return p
}
const cloud = (json: string, updatedAt: number, deleted = false): CloudItem => ({ kind: 'progress', ref: 'rome', json, updatedAt, deleted })

describe('merging progress from two devices', () => {
  it('keeps everything and the newer version of shared things', () => {
    const a = P((p) => {
      p.stops.vatican = { status: 'done', at: '2026-10-09T09:00:00Z' }
      p.stops.pantheon = { status: 'skipped', at: '2026-10-09T15:00:00Z' }
      p.feedback.vatican = { rating: 4, photos: ['ph-a'], updatedAt: '2026-10-09T10:00:00Z' }
      p.bookings.hostel = true
    })
    const b = P((p) => {
      p.stops.pantheon = { status: 'done', at: '2026-10-09T17:00:00Z' }
      p.feedback.vatican = { rating: 5, note: 'wow', photos: ['ph-b'], updatedAt: '2026-10-09T11:00:00Z' }
      p.packing.adapter = true
      p.variant = 'sun'
    })
    const m = mergeProgress(a, b)
    expect(m.stops.vatican?.status).toBe('done')
    expect(m.stops.pantheon?.status).toBe('done')
    expect(m.feedback.vatican).toMatchObject({ rating: 5, note: 'wow' })
    expect(m.feedback.vatican?.photos?.sort()).toEqual(['ph-a', 'ph-b'])
    expect(m.bookings.hostel).toBe(true)
    expect(m.packing.adapter).toBe(true)
    expect(m.variant).toBe('sun')
  })
})

describe('deciding what to sync', () => {
  const one = JSON.stringify(P(p => (p.bookings.hostel = true)))
  const two = JSON.stringify(P(p => (p.bookings.vatican = true)))
  const empty = JSON.stringify(emptyProgress())

  it('uploads new things and leaves agreed things alone', () => {
    expect(decide('progress', one, undefined, undefined)).toEqual({ do: 'upload' })
    expect(decide('progress', one, cloud(one, 5), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'nothing' })
    expect(decide('progress', two, cloud(one, 5), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'upload' })
  })

  it('takes newer cloud copies when nothing changed here', () => {
    expect(decide('progress', one, cloud(two, 9), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'apply' })
    expect(decide('progress', undefined, cloud(two, 9), undefined)).toEqual({ do: 'apply' })
  })

  it('merges when both sides changed', () => {
    const d = decide('progress', two, cloud(one, 9), { hash: jsonHash(empty), updatedAt: 5 })
    expect(d.do).toBe('merge')
    const merged = JSON.parse((d as { json: string }).json) as TripProgress
    expect(merged.bookings).toEqual({ hostel: true, vatican: true })
  })

  it('spreads deletions both ways without losing your changes', () => {
    // deleted here since we agreed
    expect(decide('progress', undefined, cloud(one, 5), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'tombstone' })
    // deleted elsewhere, untouched here
    expect(decide('progress', one, cloud(one, 9, true), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'delete-local' })
    // deleted elsewhere, but changed here: keep it
    expect(decide('progress', two, cloud(one, 9, true), { hash: jsonHash(one), updatedAt: 5 })).toEqual({ do: 'upload' })
    // never synced, nothing of yours here: follow the deletion
    expect(decide('progress', empty, cloud(one, 9, true), undefined)).toEqual({ do: 'delete-local' })
    expect(isPristine('progress', empty)).toBe(true)
  })

  it('picks the newer trip when both changed', () => {
    const t = (u: string, title: string) => JSON.stringify({ id: 'x', title, updatedAt: u, edited: true })
    const localT = t('2026-10-02T00:00:00Z', 'mine')
    const remoteT: CloudItem = { kind: 'trip', ref: 'x', json: t('2026-10-01T00:00:00Z', 'theirs'), updatedAt: 9 }
    expect(decide('trip', localT, remoteT, undefined)).toEqual({ do: 'upload' })
    expect(decide('trip', t('2026-09-01T00:00:00Z', 'old'), remoteT, undefined)).toEqual({ do: 'apply' })
  })

  it('never lets a fresh copy of a trip replace the one you changed', () => {
    // A new phone seeds the trip "now", so its copy looks newer than your edited one in the cloud.
    const fresh = JSON.stringify({ id: 'x', title: 'seed', updatedAt: '2026-10-05T00:00:00Z', edited: false })
    const yours: CloudItem = { kind: 'trip', ref: 'x', json: JSON.stringify({ id: 'x', title: 'mine', updatedAt: '2026-10-01T00:00:00Z', edited: true }), updatedAt: 9 }
    expect(decide('trip', fresh, yours, undefined)).toEqual({ do: 'apply' })
    // …and the other way round: your changes here beat an untouched copy in the cloud.
    const untouched: CloudItem = { kind: 'trip', ref: 'x', json: fresh, updatedAt: 9 }
    expect(decide('trip', yours.json, untouched, undefined)).toEqual({ do: 'upload' })
  })
})
