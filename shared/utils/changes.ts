/**
 * Plans changed (docs/design/2026-10-14-together.md, T11 and 5.12): shifting the rest of a day, starting a day later,
 * the days a must-do can move to, taking the rest of a day off, and what to do when a flight is cancelled or delayed.
 *
 * Pure. The sheet (PlansChangedSheet.vue) makes the edits through useTrips (times, moves) and useProgress (skips).
 * Times are minutes after midnight of the day's date; values over 1440 are after midnight, as everywhere in a plan.
 * Fixed stops never move: a stop with a booking, a flight or a train, or the way to the airport.
 */
import type { Stop, Trip } from '../types/trip'
import type { DayPlan, ResolvedStop, StopState } from './plan'
import { placeLinksForStop, placeOpenOn } from './places'
import { addDays, fmtClock, fmtDate } from './time'

/** Why a stop stays where it is: it is booked, it is a flight or a train, or it takes you to the airport. */
export type ChangesFixed = 'booked' | 'flight' | 'train' | 'airport'

/** What a stop that stays says beside its time. */
export const CHANGES_STAYS: Readonly<Record<ChangesFixed, string>> = Object.freeze({
  booked: 'Stays: booked',
  flight: 'Stays: flight time',
  train: 'Stays: train time',
  airport: 'Stays: to the airport',
})

const FLIGHT_ICONS = new Set(['flight', 'plane'])

/** A stop of a plan as these helpers read it (a ResolvedStop, so a picked option counts). */
type FixedLike = Pick<Stop, 'bookingId' | 'icon' | 'kind' | 'offToAirport'>

/** Why this stop can't move (null: it can): a booking, a flight or train icon, or a move stop off to the airport. */
export function changesFixed(s: FixedLike): ChangesFixed | null {
  if (s.bookingId) return 'booked'
  if (s.icon && FLIGHT_ICONS.has(s.icon)) return 'flight'
  if (s.icon === 'train') return 'train'
  if (s.kind === 'move' && s.offToAirport) return 'airport'
  return null
}

/** A must-do: tagged "must", or booked. Small logistics steps never are (there is no other day for a check-in). */
export function changesIsMust(s: Pick<Stop, 'tags' | 'bookingId' | 'minor'>): boolean {
  return !s.minor && (!!s.tags?.includes('must') || !!s.bookingId)
}

/** Still to do: not marked done or skipped, and not gone by unmarked ("missed"). */
const isOpen = (st: StopState | undefined) => st !== 'done' && st !== 'skipped' && st !== 'missed'

/** One stop of a shift: where it was, where it goes (or why it stays), and a clash with a stop that stays. */
export interface ChangesShiftItem {
  id: string
  title: string
  minor?: boolean
  /** The planned start. */
  from: number
  /** The new start (the same as `from` for a stop that stays). */
  to: number
  /** The new end, for a stop with an end of its own. */
  end?: number
  /** The new start as "HH:MM" (the stop's new timeLabel). */
  timeLabel: string
  /** Set for a stop that stays: why. */
  stays?: ChangesFixed
  /** A stop that moves and now overlaps a stop that stays. */
  clash?: { id: string, title: string, start: number }
}

export interface ChangesShift {
  /** In the order of the day: the stops that move and the ones that stay. */
  items: ChangesShiftItem[]
  /** How many stops move. */
  moved: number
  /** How many of them now overlap a stop that stays. */
  clashes: number
}

/**
 * Running late: today's stops still to do (not done, skipped or missed) that start at or after `fromMinute`, each
 * `delta` minutes later (start, its own end if it has one, and its timeLabel as "HH:MM"); fixed stops stay
 * (changesFixed). A stop that moves clashes with a stop that stays when their slots (start to the resolved end)
 * now overlap. Times may run past 1440 (after midnight).
 */
export function changesShift(stops: readonly ResolvedStop[], states: Readonly<Record<string, StopState>>, fromMinute: number, delta: number): ChangesShift {
  const d = Number.isFinite(delta) ? Math.round(delta) : 0
  const open = stops.filter(s => isOpen(states[s.id]))
  const staying = open.filter(s => !!changesFixed(s))
  const items: ChangesShiftItem[] = []
  for (const s of open) {
    if (s.start < fromMinute) continue
    const base = { id: s.id, title: s.title, from: s.start, ...(s.minor ? { minor: true } : {}) }
    const stays = changesFixed(s)
    if (stays) {
      items.push({ ...base, to: s.start, timeLabel: fmtClock(s.start), stays })
      continue
    }
    const to = s.start + d
    const toEnd = to + Math.max(1, s.endMin - s.start)
    const item: ChangesShiftItem = { ...base, to, timeLabel: fmtClock(to) }
    if (s.end !== undefined) item.end = s.end + d
    const hit = staying.find(f => f.id !== s.id && to < f.endMin && toEnd > f.start)
    if (hit) item.clash = { id: hit.id, title: hit.title, start: hit.start }
    items.push(item)
  }
  return { items, moved: items.filter(i => !i.stays).length, clashes: items.filter(i => !!i.clash).length }
}

/** Starting later: the stops you'll miss, and the must-dos among them, which can move to another day or be skipped. */
export interface ChangesStartLater {
  /** Stops before then, still to do, that are skipped (must-dos left out). */
  skip: ResolvedStop[]
  /** Must-dos and booked stops before then (changesIsMust): each moves to another day or is skipped. */
  must: ResolvedStop[]
}

/** The stops of a day, not done or skipped, that start before `until` (minutes): the plain ones and the must-dos. */
export function changesStartLater(stops: readonly ResolvedStop[], states: Readonly<Record<string, StopState>>, until: number): ChangesStartLater {
  const out: ChangesStartLater = { skip: [], must: [] }
  for (const s of stops) {
    const st = states[s.id]
    if (st === 'done' || st === 'skipped' || !(s.start < until)) continue
    if (changesIsMust(s)) out.must.push(s)
    else out.skip.push(s)
  }
  return out
}

/** A day a stop can move to. */
export interface ChangesMoveTarget {
  dayId: string
  /** "Sat 10" */
  label: string
  /** Stops already on that day (small logistics steps not counted). */
  stops: number
  /** 'open': every place the stop is is open that day; 'unknown': not known (no place, or no opening days). */
  open: 'open' | 'unknown'
}

/** "Sat 10" for a trip day. */
export function changesDayLabel(date: string): string {
  return `${fmtDate(date, 'weekday')} ${Number(date.slice(8, 10))}`
}

/**
 * The days a stop can move to: days after `todayId` (all but the last when it isn't a trip day), never the last day
 * (the way home), nor a day whose plan already has that stop; and none where a place the stop is (placeLinksForStop)
 * is closed (placeOpenOn). Fewest stops first, then the earlier day.
 */
export function changesMoveTargets(
  trip: Pick<Trip, 'days' | 'openDays' | 'places'>,
  plans: readonly DayPlan[],
  stop: Pick<ResolvedStop, 'id' | 'title' | 'kind' | 'icon' | 'placeId' | 'choice'>,
  todayId: string,
): ChangesMoveTarget[] {
  const days = trip.days ?? []
  const from = days.findIndex(d => d.id === todayId)
  const last = days.length - 1
  const places = trip.places ?? []
  const linked = placeLinksForStop(stop, places).map(id => places.find(p => p.id === id)!).filter(Boolean)
  const out: (ChangesMoveTarget & { i: number })[] = []
  days.forEach((d, i) => {
    if (i <= from || i >= last) return
    const plan = plans.find(p => p.view.day.id === d.id)
    if (plan?.stops.some(s => s.id === stop.id)) return
    const open = linked.map(p => placeOpenOn(p, trip, d.id))
    if (open.includes('closed')) return
    out.push({
      dayId: d.id,
      label: changesDayLabel(d.date),
      stops: plan ? plan.stops.filter(s => !s.minor).length : 0,
      open: open.length && open.every(x => x === 'open') ? 'open' : 'unknown',
      i,
    })
  })
  return out.sort((a, b) => a.stops - b.stops || a.i - b.i).map(({ i: _i, ...t }) => t)
}

/** Taking the rest of the day off. */
export interface ChangesRestOfDay {
  /** What's left (not done or skipped, not over by `now`): skipped. */
  skip: ResolvedStop[]
  /** Fixed stops left (a booking, a flight, a train, the airport): they stay in the plan. */
  keep: ResolvedStop[]
}

/** The stops left today at `now` (minutes): the ones to skip, and the fixed ones that stay. */
export function changesRestOfDay(stops: readonly ResolvedStop[], states: Readonly<Record<string, StopState>>, now: number): ChangesRestOfDay {
  const out: ChangesRestOfDay = { skip: [], keep: [] }
  for (const s of stops) {
    const st = states[s.id]
    if (st === 'done' || st === 'skipped' || s.endMin <= now) continue
    if (changesFixed(s)) out.keep.push(s)
    else out.skip.push(s)
  }
  return out
}

/** One thing to do at the airport desk when a flight is cancelled or delayed. */
export interface ChangesCheck {
  id: string
  text: string
  /** Why it matters, in one line. */
  why?: string
}

/** What to do, and what not to accept in a hurry, when a flight is cancelled or delayed (spec 5.12, card 3). */
export const CHANGES_FLIGHT_CHECKLIST: readonly ChangesCheck[] = Object.freeze([
  { id: 'reroute', text: 'Ask for rerouting on another airline before accepting a refund or credit', why: 'Once you take a refund or credit, they no longer have to get you there.' },
  { id: 'care', text: 'Ask for meal vouchers and a hotel in writing', why: 'If they can\'t give them, buy what you need within reason and keep the receipts.' },
  { id: 'receipts', text: 'Keep every receipt and screenshot', why: 'Food, transport, a new ticket, a night you lost: each one counts in a claim.' },
  { id: 'screens', text: 'Screenshot the cancellation email and the app', why: 'Times and wording can change later.' },
  { id: 'reason', text: 'Ask for the reason in writing', why: 'Compensation depends on it: bad weather or a strike can rule it out.' },
  { id: 'stay', text: 'Tell your stay you\'ll arrive later', why: 'Some places cancel the whole booking when you don\'t show up.' },
  { id: 'bookings', text: 'Check which bookings you can move', why: 'Timed tickets for your first morning may be lost.' },
])

/** When you'll arrive: a trip day's date and, if you know it, the time (minutes; over 1440 is after midnight). */
export interface ChangesArrival {
  date: string
  minutes?: number | null
}

/** A message to the place you stay, in English and, where the trip is in Italy, in Italian. */
export interface ChangesStayMessage {
  en: string
  /** The message in the local language, or null (English only). */
  local: string | null
  /** The local language's name ("Italian"), or null. */
  lang: string | null
}

const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const IT_DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const IT_MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

function longDate(date: string, days: string[], months: string[]): string {
  const [y, m, d] = date.split('-').map(Number)
  const at = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1))
  return `${days[at.getUTCDay()]} ${at.getUTCDate()} ${months[at.getUTCMonth()]}`
}

/** The trip is in Italy: its country says so, or its clock is Rome's. */
function inItaly(trip: Pick<Trip, 'country' | 'timezone'>): boolean {
  return /^(?:italy|italia|it)$/i.test((trip.country ?? '').trim()) || trip.timezone === 'Europe/Rome'
}

/**
 * The message to send the place you stay when you'll arrive later than planned: the booking from the trip's first
 * day, the new arrival (its calendar date: a time after midnight is the next day) and a request not to cancel the
 * booking. English always; Italian too for a trip in Italy.
 */
export function changesStayMessage(trip: Pick<Trip, 'start' | 'country' | 'timezone'>, arrival: ChangesArrival): ChangesStayMessage {
  let date = /^\d{4}-\d{2}-\d{2}$/.test(arrival?.date ?? '') ? arrival.date : trip.start
  let min = typeof arrival?.minutes === 'number' && Number.isFinite(arrival.minutes) ? Math.round(arrival.minutes) : null
  if (min !== null && min >= 1440) {
    date = addDays(date, Math.floor(min / 1440))
    min %= 1440
  }
  const time = min !== null && min >= 0 ? fmtClock(min) : ''
  const en = [
    `Hello. I have a booking with you from ${longDate(trip.start, EN_DAYS, EN_MONTHS)}.`,
    `Because of a problem with my flight, I'll arrive later than planned: on ${longDate(date, EN_DAYS, EN_MONTHS)}${time ? `, around ${time}` : ''}.`,
    'Please don\'t cancel my booking: I\'m still coming. Thank you.',
  ].join(' ')
  if (!inItaly(trip)) return { en, local: null, lang: null }
  const local = [
    `Buongiorno. Ho una prenotazione da voi a partire da ${longDate(trip.start, IT_DAYS, IT_MONTHS)}.`,
    `A causa di un problema con il mio volo, arriverò più tardi del previsto: ${longDate(date, IT_DAYS, IT_MONTHS)}${time ? `, verso le ore ${time}` : ''}.`,
    'Vi prego di non cancellare la prenotazione: arrivo comunque. Grazie.',
  ].join(' ')
  return { en, local, lang: 'Italian' }
}
