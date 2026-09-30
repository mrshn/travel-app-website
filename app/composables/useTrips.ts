import { createGlobalState, useStorage } from '@vueuse/core'
import type { Day, Scene, Stop, Trip } from '#shared/types/trip'
import { datesBetween } from '#shared/utils/time'
import { editableStops, slugify } from '#shared/utils/plan'
import { copyOfSeed, mergeSeed, planFingerprint } from '#shared/utils/seed'
import { SEED_TRIPS } from '~/data/trips'

export { SEED_TRIPS }

const TRIPS_KEY = 'travel:trips:v1'
/** Versions before accounts noted here which seeds they had added by themselves. Only removed now (clearAll). */
const SEEDED_KEY = 'travel:seeded:v1'

const seedKey = (t: Trip) => t.seedId ?? t.id

const useTripStore = createGlobalState(() => {
  const trips = useStorage<Trip[]>(TRIPS_KEY, [])
  /** Trips with a newer version waiting because you changed them here. */
  const updates = ref<Record<string, Trip>>({})

  // Seeds are never added by themselves (spec D37: a trip comes from you, or from "Try the sample trip"). A copy of
  // one gets the newer versions pushed to the repo: quietly while you haven't changed it, else as Update / Keep mine.
  for (const seed of SEED_TRIPS) {
    const key = seedKey(seed)
    const version = planFingerprint(seed)
    const i = trips.value.findIndex(t => t.seedId === key || t.id === seed.id)
    const local = trips.value[i]
    if (!local || local.seedVersion === version) continue // not on this device, or up to date
    if (!local.seedVersion && planFingerprint(local) === version) {
      local.seedVersion = version // saved before versions existed, and unchanged
      continue
    }
    if (local.seedVersion && !local.edited) trips.value[i] = copyOfSeed(seed, local) // untouched: update quietly
    else updates.value[local.id] = seed
  }

  return { trips, updates }
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
  const { trips, updates } = useTripStore()

  const sorted = computed(() => [...trips.value].sort((a, b) => a.start.localeCompare(b.start)))

  function get(id: string): Trip | undefined {
    return trips.value.find(t => t.id === id)
  }

  function touch(t: Trip) {
    t.updatedAt = new Date().toISOString()
    t.edited = true
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
    return SEED_TRIPS.find(s => seedKey(s) === t.seedId)
  }

  /** Puts a seeded trip back to the original plan (what you did is kept). */
  function resetToSeed(id: string): boolean {
    const idx = trips.value.findIndex(t => t.id === id)
    const local = trips.value[idx]
    const seed = seedOf(local)
    if (!local || !seed) return false
    trips.value[idx] = copyOfSeed(seed, local)
    delete updates.value[id]
    return true
  }

  /** A newer version of this trip is waiting (it came from GitHub while you had changes here). */
  function updateFor(id: string): Trip | undefined {
    return updates.value[id]
  }

  /** Takes the newer version, keeping your own stops and packing items. */
  function applyUpdate(id: string): boolean {
    const idx = trips.value.findIndex(t => t.id === id)
    const seed = updates.value[id]
    const local = trips.value[idx]
    if (!local || !seed) return false
    trips.value[idx] = mergeSeed(local, seed)
    delete updates.value[id]
    return true
  }

  /** Keeps your version; the next newer version will be offered again. */
  function skipUpdate(id: string) {
    const seed = updates.value[id]
    const t = get(id)
    if (t && seed) t.seedVersion = planFingerprint(seed)
    delete updates.value[id]
  }

  /**
   * "Try the sample trip": adds a copy of a seed trip (default: the first) to this device, keeping its seedId so
   * newer versions pushed to the repo still reach it. A trip with that id already here is returned as it is.
   */
  function addSample(seedId?: string): Trip | undefined {
    // Anything but a string (say, the click event of a handler bound as `@click="addSample"`) means the default.
    const seed = typeof seedId === 'string' ? SEED_TRIPS.find(s => seedKey(s) === seedId) : SEED_TRIPS[0]
    if (!seed) return undefined
    const have = get(seed.id)
    if (have) return have
    // Created now: a copy the account deleted earlier on another device doesn't take this one away (sync's decide()).
    const t = copyOfSeed(seed, { id: seed.id, createdAt: new Date().toISOString() })
    trips.value.push(t)
    return get(t.id)
  }

  /**
   * Removes every trip from this device, with the updates waiting for them and the old seeded bookkeeping (another
   * account's copy is about to arrive, or the device is being cleared). Never touches the cloud by itself.
   */
  function clearAll() {
    trips.value = []
    updates.value = {}
    try {
      localStorage.removeItem(SEEDED_KEY)
    }
    catch { /* storage refused */ }
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

  return { trips, sorted, get, create, update, setDates, remove, seedOf, resetToSeed, addSample, updateFor, applyUpdate, skipUpdate, upsertStop, moveStop, removeStop, replaceAll, clearAll }
}
