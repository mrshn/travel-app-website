import { describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import { copyOfSeed, mergeSeed, planFingerprint } from '../shared/utils/seed'
import type { Trip } from '../shared/types/trip'

const seed = romeTrip as Trip
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x))

describe('seed versions', () => {
  it('ignores ids, timestamps and local flags', () => {
    const copy = copyOfSeed(seed)
    copy.updatedAt = '2030-01-01T00:00:00Z'
    copy.edited = true
    expect(planFingerprint(copy)).toBe(planFingerprint(seed))
  })

  it('changes when the plan changes', () => {
    const next = clone(seed)
    next.days[1]!.stops[1]!.tip = 'New tip'
    expect(planFingerprint(next)).not.toBe(planFingerprint(seed))
  })

  it('merges a newer seed with your own stops and packing', () => {
    const local = copyOfSeed(seed)
    local.days[1]!.stops.push({ id: 'my-gelato', start: 960, timeLabel: '16:00', kind: 'food', title: 'Gelato', custom: true })
    local.days[2]!.variants!.sun!.stops.push({ id: 'my-sun', start: 700, timeLabel: '11:40', kind: 'sight', title: 'Mine', custom: true })
    local.packing.push('Travel pillow')
    local.days[1]!.stops[1]!.title = 'Renamed by me'
    const newer = clone(seed)
    newer.days[1]!.stops[1]!.tip = 'Updated from a chat'
    const merged = mergeSeed(local, newer)
    expect(merged.id).toBe(local.id)
    expect(merged.days[1]!.stops.some(s => s.id === 'my-gelato')).toBe(true)
    expect(merged.days[2]!.variants!.sun!.stops.some(s => s.id === 'my-sun')).toBe(true)
    expect(merged.packing).toContain('Travel pillow')
    expect(merged.days[1]!.stops[1]!.tip).toBe('Updated from a chat')
    expect(merged.days[1]!.stops[1]!.title).toBe(seed.days[1]!.stops[1]!.title)
    expect(merged.seedVersion).toBe(planFingerprint(newer))
    expect(merged.edited).toBe(true)
  })
})
