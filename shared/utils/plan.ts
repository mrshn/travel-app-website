/** Views over a trip and what you did: resolved stops, states and progress numbers. */
import type { Choice, Day, Scene, Stop, StopKind, Trip, TripProgress } from '../types/trip'
import type { TripMoment } from './time'
import { costSummary, type CostSummary } from './costs'

export function emptyProgress(): TripProgress {
  return { stops: {}, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {}, expenses: {}, stamps: {} }
}

/** Which version of the plan is on (e.g. Colosseum Saturday or Sunday). */
export function activeVariant(trip: Trip, p?: TripProgress | null): string | undefined {
  if (!trip.variant) return undefined
  const v = p?.variant
  return v && trip.variant.options.some(o => o.id === v) ? v : trip.variant.default
}

export function sortStops<T extends { start: number }>(stops: T[]): T[] {
  return stops
    .map((s, i) => [s, i] as const)
    .sort((a, b) => a[0].start - b[0].start || a[1] - b[1])
    .map(x => x[0])
}

export interface DayView {
  day: Day
  index: number
  title: string
  cover: Scene
  banner?: string
  /** Stops as stored for the active version of the day. */
  stops: Stop[]
  /** Set when the stops come from a day variant. */
  variantKey?: string
}

export function dayView(day: Day, index: number, variant?: string): DayView {
  const v = variant ? day.variants?.[variant] : undefined
  return {
    day,
    index,
    title: v?.title ?? day.title,
    cover: v?.cover ?? day.cover,
    banner: v?.banner,
    stops: v?.stops ?? day.stops,
    variantKey: v ? variant : undefined,
  }
}

export function dayViews(trip: Trip, p?: TripProgress | null): DayView[] {
  const v = activeVariant(trip, p)
  return trip.days.map((d, i) => dayView(d, i, v))
}

export interface ResolvedStop extends Stop {
  /** The stop as planned, before an option was picked. */
  base: Stop
  choice?: Choice
  /** Detail lines of the picked option. */
  lines?: string[]
  /** When this stop's slot ends (explicit end, else the next stop's start, else +60). */
  endMin: number
  dayId: string
}

export function resolveStop(stop: Stop, choices: Record<string, string>): Omit<ResolvedStop, 'endMin' | 'dayId'> {
  if (!stop.options?.choices.length) return { ...stop, base: stop }
  const id = choices[stop.id] ?? stop.options.default
  const c = stop.options.choices.find(x => x.id === id) ?? stop.options.choices[0]!
  return {
    ...stop,
    base: stop,
    choice: c,
    lines: c.lines,
    title: c.title,
    kind: c.kind ?? stop.kind,
    icon: c.icon ?? stop.icon,
    cost: c.cost ?? stop.cost,
    place: c.place === undefined ? stop.place : c.place,
    via: c.via ?? stop.via,
    scene: c.scene ?? stop.scene,
    tod: c.tod ?? stop.tod,
    bookingId: c.bookingId ?? stop.bookingId,
    links: c.links?.length ? c.links : stop.links,
  }
}

export function resolveStops(stops: Stop[], choices: Record<string, string>, dayId: string): ResolvedStop[] {
  const sorted = sortStops(stops)
  return sorted.map((s, i) => {
    const later = sorted.slice(i + 1).find(x => x.start > s.start)
    const end = s.end ?? later?.start ?? s.start + 60
    return { ...resolveStop(s, choices), endMin: Math.max(end, s.start + 1), dayId }
  })
}

export type StopState = 'done' | 'skipped' | 'missed' | 'now' | 'next' | 'upcoming'

/** Where each stop of one day stands at a moment. */
export function stopStates(dayDate: string, stops: ResolvedStop[], p: TripProgress, m: TripMoment): Record<string, StopState> {
  const out: Record<string, StopState> = {}
  const today = m.phase === 'during' && dayDate === m.dayDate
  const past = m.phase === 'after' || (m.phase === 'during' && dayDate < m.dayDate)
  let nextGiven = false
  for (const s of stops) {
    const mark = p.stops[s.id]?.status
    if (mark) {
      out[s.id] = mark
      continue
    }
    if (past) {
      out[s.id] = 'missed'
      continue
    }
    if (today) {
      if (s.endMin <= m.minutes) {
        out[s.id] = 'missed'
        continue
      }
      if (s.start <= m.minutes) {
        out[s.id] = 'now'
        continue
      }
      if (!nextGiven) {
        nextGiven = true
        out[s.id] = 'next'
        continue
      }
    }
    out[s.id] = 'upcoming'
  }
  return out
}

export interface Tally {
  total: number
  done: number
  skipped: number
  missed: number
  left: number
}

export function emptyTally(): Tally {
  return { total: 0, done: 0, skipped: 0, missed: 0, left: 0 }
}

/** Minor logistics steps don't count. */
export function counts(stop: Stop): boolean {
  return !stop.minor
}

function add(t: Tally, st: StopState) {
  t.total++
  if (st === 'done') t.done++
  else if (st === 'skipped') t.skipped++
  else if (st === 'missed') t.missed++
  else t.left++
}

export interface DaySummary {
  id: string
  date: string
  num: string
  label: string
  title: string
  tally: Tally
  spent: number
  planned: number
  rating?: number
}

export interface TripSummary {
  all: Tally
  days: DaySummary[]
  kinds: Partial<Record<StopKind, Tally>>
  /** Costs on trip days, without where you stay (costSummary().trip.spent). */
  spent: number
  /** Every live cost: any day (before and after the trip too) and any category (costSummary().all). */
  spentAll: number
  planned: number
  rated: number
  avgRating: number
  photos: number
  notes: number
  bookings: { total: number, done: number }
  packing: { total: number, done: number }
  /** Share of countable stops done, 0–1. */
  pct: number
  /** Share handled (done or skipped), 0–1. */
  handledPct: number
}

export interface DayPlan {
  view: DayView
  stops: ResolvedStop[]
  states: Record<string, StopState>
}

export function planDays(trip: Trip, p: TripProgress, m: TripMoment): DayPlan[] {
  return dayViews(trip, p).map((view) => {
    const stops = resolveStops(view.stops, p.choices, view.day.id)
    return { view, stops, states: stopStates(view.day.date, stops, p, m) }
  })
}

/** Money comes from the costs ledger (costSummary), so every screen shows the same totals. */
export function summarize(
  trip: Trip,
  p: TripProgress,
  m: TripMoment,
  plans = planDays(trip, p, m),
  costs: CostSummary = costSummary(trip, p, plans),
): TripSummary {
  const all = emptyTally()
  const kinds: Partial<Record<StopKind, Tally>> = {}
  let rated = 0
  let ratingSum = 0
  let photos = 0
  let notes = 0
  const days: DaySummary[] = plans.map(({ view, stops, states }) => {
    const t = emptyTally()
    for (const s of stops) {
      if (!counts(s)) continue
      const st = states[s.id] ?? 'upcoming'
      add(t, st)
      add(all, st)
      const k = (kinds[s.kind] ??= emptyTally())
      add(k, st)
    }
    const note = p.dayNotes[view.day.id]
    const daySpent = costs.byDay[view.day.id]?.spent ?? 0
    const planned = trip.budget?.find(b => b.dayId === view.day.id)?.values.reduce((a, b) => a + b, 0) ?? 0
    return {
      id: view.day.id,
      date: view.day.date,
      num: view.day.num,
      label: view.day.label,
      title: view.title,
      tally: t,
      spent: daySpent,
      planned,
      rating: note?.rating,
    }
  })
  for (const fb of Object.values(p.feedback)) {
    if (fb.rating) {
      rated++
      ratingSum += fb.rating
    }
    photos += fb.photos?.length ?? 0
    if (fb.note?.trim()) notes++
  }
  const bookings = { total: trip.bookings.length, done: trip.bookings.filter(b => p.bookings[b.id]).length }
  const packing = { total: trip.packing.length, done: trip.packing.filter(x => p.packing[x]).length }
  return {
    all,
    days,
    kinds,
    spent: costs.trip.spent,
    spentAll: costs.all,
    planned: days.reduce((a, d) => a + d.planned, 0),
    rated,
    avgRating: rated ? ratingSum / rated : 0,
    photos,
    notes,
    bookings,
    packing,
    pct: all.total ? all.done / all.total : 0,
    handledPct: all.total ? (all.done + all.skipped) / all.total : 0,
  }
}

/** Finds a stop anywhere in the trip (base days and variants). */
export function findStop(trip: Trip, stopId: string): { day: Day, stop: Stop, variant?: string } | null {
  for (const day of trip.days) {
    const s = day.stops.find(x => x.id === stopId)
    if (s) return { day, stop: s }
    for (const [k, v] of Object.entries(day.variants ?? {})) {
      const vs = v.stops.find(x => x.id === stopId)
      if (vs) return { day, stop: vs, variant: k }
    }
  }
  return null
}

/** Stop list of a day that edits should go to, given the active variant. */
export function editableStops(day: Day, variant?: string): Stop[] {
  const v = variant ? day.variants?.[variant] : undefined
  return v ? v.stops : day.stops
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'item'
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

/** Progress of one day (minor steps don't count). */
export function dayTally(plan: DayPlan): Tally {
  const t = emptyTally()
  for (const s of plan.stops) {
    if (counts(s)) add(t, plan.states[s.id] ?? 'upcoming')
  }
  return t
}
