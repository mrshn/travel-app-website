/** The live guide: what to do right now, what's next, and when to leave. */
import type { LatLng, TravelEstimate } from './geo'
import { haversine, travelEstimate } from './geo'
import type { ResolvedStop, StopState } from './plan'

/**
 * at    – a stop is on right now
 * go    – nothing on, and it's time to head to the next stop
 * free  – nothing on, plenty of time before the next stop
 * done  – nothing left today
 * empty – no stops planned today
 */
export type GuideMode = 'at' | 'go' | 'free' | 'done' | 'empty'
export type Urgency = 'late' | 'now' | 'soon' | 'relaxed'

export interface GuideLeg {
  from: 'you' | 'plan' | 'home'
  meters: number
  est: TravelEstimate
}

export interface Guide {
  mode: GuideMode
  /** Stop whose slot contains now (even if already marked). */
  current?: ResolvedStop
  /** First open stop starting after now. */
  next?: ResolvedStop
  /** The one thing to look at: the open current stop, else the next. */
  focus?: ResolvedStop
  /** 0–1 through the current stop's slot. */
  currentProgress?: number
  minutesLeftInCurrent?: number
  /** Getting to the next stop. */
  leg?: GuideLeg
  /** You → the focus stop (only with a live position). */
  focusLeg?: GuideLeg
  leaveBy?: number
  leaveIn?: number
  startsIn?: number
  urgency?: Urgency
  /** Open stops after the next one. */
  later: ResolvedStop[]
  /** Earlier stops today with no mark yet. */
  behind: ResolvedStop[]
}

/** Minutes of slack added before each departure. */
export const LEAVE_BUFFER = 5

const isOpen = (states: Record<string, StopState>, s: ResolvedStop) => {
  const st = states[s.id]
  return st !== 'done' && st !== 'skipped'
}

/**
 * Real travel times (e.g. from Google), or null to use the straight-line estimate.
 * `arriveBy` is the stop's start, in minutes on the trip day's clock.
 */
export type TravelLookup = (from: LatLng, to: LatLng, meters: number, arriveBy: number) => TravelEstimate | null

export interface GuideOptions {
  you?: LatLng | null
  home?: LatLng | null
  travel?: TravelLookup
}

export function liveGuide(
  stops: ResolvedStop[],
  states: Record<string, StopState>,
  minutes: number,
  opts: GuideOptions = {},
): Guide {
  if (!stops.length) return { mode: 'empty', later: [], behind: [] }

  let current: ResolvedStop | undefined
  for (const s of stops) {
    if (s.start <= minutes && minutes < s.endMin) current = s
  }
  const currentOpen = current && isOpen(states, current) ? current : undefined
  const next = stops.find(s => s.start > minutes && isOpen(states, s))
  const later = stops.filter(s => s.start > minutes && s !== next && isOpen(states, s))
  const behind = stops.filter(s => states[s.id] === 'missed' && !s.minor)

  const g: Guide = { mode: 'done', current, next, later, behind }

  if (current) {
    const span = Math.max(1, current.endMin - current.start)
    g.currentProgress = Math.min(1, Math.max(0, (minutes - current.start) / span))
    g.minutesLeftInCurrent = Math.max(0, current.endMin - minutes)
  }

  if (next) {
    g.startsIn = next.start - minutes
    const dest = next.place
    let origin: { p: LatLng, from: GuideLeg['from'] } | undefined
    if (opts.you) origin = { p: opts.you, from: 'you' }
    else if (currentOpen?.place) origin = { p: currentOpen.place, from: 'plan' }
    else {
      const idx = stops.indexOf(next)
      for (let i = idx - 1; i >= 0; i--) {
        const s = stops[i]!
        if (s.place && states[s.id] !== 'skipped') {
          origin = { p: s.place, from: 'plan' }
          break
        }
      }
      if (!origin && opts.home) origin = { p: opts.home, from: 'home' }
    }
    // A transit step starts where you are: its place is where it takes you.
    if (dest && origin && next.kind !== 'move') {
      const meters = haversine(origin.p, dest)
      g.leg = { from: origin.from, meters, est: opts.travel?.(origin.p, dest, meters, next.start) ?? travelEstimate(meters) }
    }
    const est = g.leg?.est
    g.leaveBy = est ? (est.leaveBy ?? next.start - est.minutes) - LEAVE_BUFFER : next.start
    g.leaveIn = g.leaveBy - minutes
    g.urgency = g.leaveIn < 0 ? 'late' : g.leaveIn <= 5 ? 'now' : g.leaveIn <= 20 ? 'soon' : 'relaxed'
  }

  if (currentOpen) {
    g.mode = 'at'
    g.focus = currentOpen
  }
  else if (next) {
    g.mode = g.urgency === 'relaxed' ? 'free' : 'go'
    g.focus = next
  }

  if (opts.you && g.focus?.place) {
    const meters = haversine(opts.you, g.focus.place)
    const same = g.focus === next && g.leg?.from === 'you'
    g.focusLeg = { from: 'you', meters, est: same ? g.leg!.est : (opts.travel?.(opts.you, g.focus.place, meters, g.focus.start) ?? travelEstimate(meters)) }
  }
  return g
}

/** You're close enough to call it "here". */
export const ARRIVED_M = 150
