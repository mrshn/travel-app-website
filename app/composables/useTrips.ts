import { createGlobalState, useStorage } from '@vueuse/core'
import type { Day, Scene, Stop, Trip } from '#shared/types/trip'
import { datesBetween } from '#shared/utils/time'
import { editableStops, slugify } from '#shared/utils/plan'
import { romeTrip } from '~/data/rome'

/** Trips that ship with the app. Copied into your browser once; you can reset them later. */
export const SEED_TRIPS: Trip[] = [romeTrip]

const TRIPS_KEY = 'travel:trips:v1'
const SEEDED_KEY = 'travel:seeded:v1'

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

const useTripStore = createGlobalState(() => {
  const trips = useStorage<Trip[]>(TRIPS_KEY, [])
  const seeded = useStorage<string[]>(SEEDED_KEY, [])
  for (const seed of SEED_TRIPS) {
    const key = seed.seedId ?? seed.id
    if (seeded.value.includes(key)) continue
    if (!trips.value.some(t => t.id === seed.id)) trips.value.push(clone(seed))
    seeded.value = [...seeded.value, key]
  }
  return { trips }
})

const ROMAN: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
export function toRoman(n: number): string {
  let out = ''
  let x = Math.max(1, Math.min(39, Math.round(n)))
  for (const [v, s] of ROMAN) {
    while (x >= v) {
      out += s
      x -= v
    }
  }
  return out
}

const COVERS = ['skyline', 'alley', 'steps', 'lake', 'market', 'perspective', 'navona', 'monti']

export function blankDay(date: string, i: number, n: number): Day {
  return {
    id: `d${i + 1}-${date.slice(5).replace('-', '')}`,
    date,
    num: toRoman(Number(date.slice(8, 10))),
    label: i === 0 ? 'Arrival' : i === n - 1 && n > 1 ? 'Departure' : `Day ${i + 1}`,
    title: '',
    cover: { scene: COVERS[i % COVERS.length]!, tod: i === 0 ? 'golden' : 'day' },
    facts: [],
    stops: [],
  }
}

export interface NewTripInput {
  title: string
  destination: string
  country?: string
  subtitle?: string
  start: string
  end: string
  timezone: string
  currency: string
  cover?: Scene
  home?: Trip['home']
}

export function useTrips() {
  const { trips } = useTripStore()

  const sorted = computed(() => [...trips.value].sort((a, b) => a.start.localeCompare(b.start)))

  function get(id: string): Trip | undefined {
    return trips.value.find(t => t.id === id)
  }

  function touch(t: Trip) {
    t.updatedAt = new Date().toISOString()
  }

  function create(input: NewTripInput): Trip {
    const dates = datesBetween(input.start, input.end)
    const now = new Date().toISOString()
    let id = `${slugify(input.destination || input.title)}-${input.start.slice(0, 7)}`
    while (get(id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`
    const trip: Trip = {
      id,
      title: input.title.trim() || input.destination.trim(),
      destination: input.destination.trim(),
      country: input.country?.trim() || undefined,
      subtitle: input.subtitle?.trim() || undefined,
      timezone: input.timezone,
      start: input.start,
      end: input.end,
      cover: input.cover ?? { scene: 'plane', tod: 'golden' },
      currency: input.currency || 'EUR',
      home: input.home,
      days: dates.map((d, i) => blankDay(d, i, dates.length)),
      bookings: [],
      packing: [],
      createdAt: now,
      updatedAt: now,
    }
    trips.value.push(trip)
    return trip
  }

  function update(id: string, fn: (t: Trip) => void) {
    const t = get(id)
    if (!t) return
    fn(t)
    touch(t)
  }

  /** Moves the trip to new dates, keeping days (and their stops) in order. */
  function setDates(id: string, start: string, end: string) {
    update(id, (t) => {
      const dates = datesBetween(start, end)
      const days: Day[] = dates.map((date, i) => {
        const old = t.days[i]
        if (!old) return blankDay(date, i, dates.length)
        return { ...old, date, num: toRoman(Number(date.slice(8, 10))) }
      })
      t.start = start
      t.end = end
      t.days = days
    })
  }

  function remove(id: string) {
    trips.value = trips.value.filter(t => t.id !== id)
  }

  function seedOf(t: Trip | undefined): Trip | undefined {
    if (!t?.seedId) return undefined
    return SEED_TRIPS.find(s => (s.seedId ?? s.id) === t.seedId)
  }

  /** Puts a seeded trip back to the original plan (what you did is kept). */
  function resetToSeed(id: string): boolean {
    const idx = trips.value.findIndex(t => t.id === id)
    const seed = seedOf(trips.value[idx])
    if (idx < 0 || !seed) return false
    trips.value[idx] = { ...clone(seed), id, updatedAt: new Date().toISOString() }
    return true
  }

  /** Brings back a seeded trip you deleted. */
  function restoreSeed(seedId: string): Trip | undefined {
    const seed = SEED_TRIPS.find(s => (s.seedId ?? s.id) === seedId)
    if (!seed) return undefined
    if (get(seed.id)) return get(seed.id)
    const t = clone(seed)
    trips.value.push(t)
    return t
  }

  function upsertStop(tripId: string, dayId: string, variant: string | undefined, stop: Stop) {
    update(tripId, (t) => {
      const day = t.days.find(d => d.id === dayId)
      if (!day) return
      const list = editableStops(day, variant)
      const i = list.findIndex(s => s.id === stop.id)
      if (i >= 0) list[i] = stop
      else list.push(stop)
    })
  }

  /** Moves a stop to another day (same version of the plan). */
  function moveStop(tripId: string, fromDay: string, toDay: string, variant: string | undefined, stop: Stop) {
    update(tripId, (t) => {
      const a = t.days.find(d => d.id === fromDay)
      const b = t.days.find(d => d.id === toDay)
      if (!a || !b) return
      const from = editableStops(a, variant)
      const i = from.findIndex(s => s.id === stop.id)
      if (i >= 0) from.splice(i, 1)
      editableStops(b, variant).push(stop)
    })
  }

  function removeStop(tripId: string, dayId: string, variant: string | undefined, stopId: string) {
    update(tripId, (t) => {
      const day = t.days.find(d => d.id === dayId)
      if (!day) return
      const list = editableStops(day, variant)
      const i = list.findIndex(s => s.id === stopId)
      if (i >= 0) list.splice(i, 1)
    })
  }

  function replaceAll(next: Trip[]) {
    trips.value = next
  }

  return { trips, sorted, get, create, update, setDates, remove, seedOf, resetToSeed, restoreSeed, upsertStop, moveStop, removeStop, replaceAll }
}
