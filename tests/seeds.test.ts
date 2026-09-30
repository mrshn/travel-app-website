import { describe, expect, it } from 'vitest'
import { SEED_TRIPS } from '../app/data/trips'
import { PLACE_SET_ORDER, placeSetCategory } from '../shared/utils/places'
import { datesBetween } from '../shared/utils/time'
import type { Stop, Trip } from '../shared/types/trip'

// Checks every trip that ships with the app, so a trip saved from a chat can't break the site.

function allStopLists(t: Trip): { where: string, stops: Stop[] }[] {
  return t.days.flatMap(d => [
    { where: d.id, stops: d.stops },
    ...Object.entries(d.variants ?? {}).map(([k, v]) => ({ where: `${d.id}/${k}`, stops: v.stops })),
  ])
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

describe.each(SEED_TRIPS.map(t => [t.id, t] as const))('trip %s', (_id, t) => {
  it('has matching ids, a valid time zone and consecutive days', () => {
    expect(t.id).toMatch(/^[a-z0-9-]+$/)
    expect(t.seedId ?? t.id).toBe(t.id)
    expect(() => new Intl.DateTimeFormat('en', { timeZone: t.timezone })).not.toThrow()
    expect(t.days.map(d => d.date)).toEqual(datesBetween(t.start, t.end))
    expect(new Set(t.days.map(d => d.id)).size).toBe(t.days.length)
  })

  it('has unique stop ids and sane times in every version of every day', () => {
    for (const { where, stops } of allStopLists(t)) {
      const ids = stops.map(s => s.id)
      expect(new Set(ids).size, `duplicate stop id in ${where}`).toBe(ids.length)
      for (const s of stops) {
        expect(s.id, `${where}`).toMatch(/^[a-z0-9][a-z0-9-]*$/)
        expect(s.title.length, `${where}/${s.id} title`).toBeGreaterThan(0)
        expect(s.start, `${where}/${s.id} start`).toBeGreaterThanOrEqual(0)
        expect(s.start, `${where}/${s.id} start`).toBeLessThan(2880)
        if (s.end !== undefined) expect(s.end, `${where}/${s.id} end`).toBeGreaterThan(s.start)
      }
    }
  })

  it('never reuses a stop id on two days of the main plan (progress is stored by id)', () => {
    const seen = new Map<string, string>()
    for (const d of t.days) {
      for (const s of d.stops) {
        const other = seen.get(s.id)
        expect(other, `stop id ${s.id} is on ${other} and ${d.id}`).toBeUndefined()
        seen.set(s.id, d.id)
      }
    }
  })

  it('points options at real choices', () => {
    for (const { where, stops } of allStopLists(t)) {
      for (const s of stops) {
        if (!s.options) continue
        const ids = s.options.choices.map(c => c.id)
        expect(new Set(ids).size, `${where}/${s.id} choices`).toBe(ids.length)
        expect(ids, `${where}/${s.id} default`).toContain(s.options.default)
      }
    }
  })

  it('keeps map pins in one area', () => {
    const pts = allStopLists(t).flatMap(l => l.stops).filter(s => s.place).map(s => s.place!)
    if (t.home) pts.push(t.home)
    if (!pts.length) return
    const lat = median(pts.map(p => p.lat))
    const lng = median(pts.map(p => p.lng))
    for (const p of pts) {
      expect(Number.isFinite(p.lat) && Number.isFinite(p.lng), p.name).toBe(true)
      // Within ~1.5° (roughly 150 km) of the trip's centre: catches swapped or mistyped coordinates.
      expect(Math.abs(p.lat - lat), `${p.name} latitude`).toBeLessThan(1.5)
      expect(Math.abs(p.lng - lng), `${p.name} longitude`).toBeLessThan(1.5)
    }
  })

  it('lists bookings and places with unique ids', () => {
    const b = t.bookings.map(x => x.id)
    expect(new Set(b).size).toBe(b.length)
    const p = (t.places ?? []).map(x => x.id)
    expect(new Set(p).size).toBe(p.length)
  })

  it('puts places only in known sets of their own category', () => {
    for (const p of t.places ?? []) {
      if (p.set === undefined) continue
      expect(PLACE_SET_ORDER, `${p.id} set`).toContain(p.set)
      expect(placeSetCategory(p.set), `${p.id}: ${p.set} is not a ${p.category} set`).toBe(p.category)
    }
  })

  it('links stops and options only to places that exist', () => {
    const ids = new Set((t.places ?? []).map(p => p.id))
    for (const { where, stops } of allStopLists(t)) {
      for (const s of stops) {
        if (s.placeId !== undefined) expect(ids.has(s.placeId), `${where}/${s.id} placeId ${s.placeId}`).toBe(true)
        for (const c of s.options?.choices ?? []) {
          if (c.placeId !== undefined) expect(ids.has(c.placeId), `${where}/${s.id}/${c.id} placeId ${c.placeId}`).toBe(true)
        }
      }
    }
  })
})
