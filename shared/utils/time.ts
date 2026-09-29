/**
 * Time helpers. Everything on a trip runs on the trip's own clock (its time zone),
 * whatever time zone the phone is set to.
 */

/** Hours before this count to the previous trip day (a night out ends at 03:00, not on a new day). */
export const ROLLOVER_MIN = 5 * 60

const formatters = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    const opts: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }
    try {
      f = new Intl.DateTimeFormat('en-CA', { ...opts, timeZone })
    }
    catch {
      f = new Intl.DateTimeFormat('en-CA', opts)
    }
    formatters.set(timeZone, f)
  }
  return f
}

export interface ZonedTime {
  /** YYYY-MM-DD */
  date: string
  /** Minutes after local midnight, 0–1439. */
  minutes: number
  seconds: number
}

/** Wall-clock date and time of an instant in a time zone. */
export function zoned(at: Date, timeZone: string): ZonedTime {
  const v: Record<string, string> = {}
  for (const p of partsFormatter(timeZone).formatToParts(at)) v[p.type] = p.value
  const hour = Number(v.hour) % 24
  return {
    date: `${v.year}-${v.month}-${v.day}`,
    minutes: hour * 60 + Number(v.minute),
    seconds: Number(v.second),
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  }
  catch {
    return false
  }
}

/** Milliseconds of a YYYY-MM-DD date at 00:00 UTC. */
export function dateMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function addDays(date: string, n: number): string {
  return new Date(dateMs(date) + n * 86_400_000).toISOString().slice(0, 10)
}

export function diffDays(from: string, to: string): number {
  return Math.round((dateMs(to) - dateMs(from)) / 86_400_000)
}

/** Every date from start to end, inclusive. */
export function datesBetween(start: string, end: string): string[] {
  const out: string[] = []
  const n = diffDays(start, end)
  for (let i = 0; i <= n && i < 366; i++) out.push(addDays(start, i))
  return out
}

/** The instant when the wall clock in `timeZone` shows `date` + `minutes` (minutes may run past 1440). */
export function zonedToDate(date: string, minutes: number, timeZone: string): Date {
  const target = dateMs(date) + minutes * 60_000
  let t = target
  for (let i = 0; i < 3; i++) {
    const z = zoned(new Date(t), timeZone)
    const wall = dateMs(z.date) + z.minutes * 60_000
    const diff = wall - target
    if (diff === 0) break
    t -= diff
  }
  return new Date(t)
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 870 → "14:30"; 1500 → "01:00". */
export function fmtClock(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`
}

/** "14:30" or "2:30" or "1430" → minutes; null when it can't be read. */
export function parseClock(text: string): number | null {
  const s = text.trim()
  const m = /^(\d{1,2})(?::|\.|h)?(\d{2})?$/.exec(s)
  if (!m) return null
  const h = Number(m[1])
  const mi = m[2] ? Number(m[2]) : 0
  if (h > 29 || mi > 59) return null
  return h * 60 + mi
}

/** 75 → "1 h 15 min". */
export function fmtDuration(min: number): string {
  const m = Math.max(0, Math.round(Math.abs(min)))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h < 24) return r ? `${h} h ${r} min` : `${h} h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh ? `${d} d ${rh} h` : `${d} d`
}

/** Short countdown: "3 d 4 h", "2 h 05", "12 min". */
export function fmtCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return `${d} d ${h} h`
  if (h > 0) return `${h} h ${pad2(m)}`
  return `${m} min`
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export type DateStyle = 'short' | 'long' | 'weekday' | 'weekdayLong' | 'dayMonth' | 'full'

/** Formats a calendar date: "Fri 9 Oct", "Friday 9 October"… (no time zone games: the date is the date). */
export function fmtDate(date: string, style: DateStyle = 'short'): string {
  if (!date) return ''
  const d = new Date(dateMs(date))
  const wd = WEEKDAYS[d.getUTCDay()]!
  const mo = MONTHS[d.getUTCMonth()]!
  const day = d.getUTCDate()
  switch (style) {
    case 'long': return `${wd} ${day} ${mo}`
    case 'weekday': return wd.slice(0, 3)
    case 'weekdayLong': return wd
    case 'dayMonth': return `${day} ${mo.slice(0, 3)}`
    case 'full': return `${wd.slice(0, 3)} ${day} ${mo.slice(0, 3)} ${d.getUTCFullYear()}`
    default: return `${wd.slice(0, 3)} ${day} ${mo.slice(0, 3)}`
  }
}

/** "8–12 Oct 2026" or "28 Sep – 3 Oct 2026". */
export function fmtRange(start: string, end: string): string {
  if (!start) return ''
  const a = new Date(dateMs(start))
  const b = new Date(dateMs(end || start))
  const dm = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]!.slice(0, 3)}`
  const dmy = (d: Date) => `${dm(d)} ${d.getUTCFullYear()}`
  if (start === end || !end) return dmy(a)
  if (a.getUTCFullYear() === b.getUTCFullYear()) {
    if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${dmy(b)}`
    return `${dm(a)} – ${dmy(b)}`
  }
  return `${dmy(a)} – ${dmy(b)}`
}

/** "today", "tomorrow", "in 3 days", "yesterday", "5 days ago". */
export function fmtRelDay(date: string, today: string): string {
  const n = diffDays(today, date)
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}

export type Phase = 'before' | 'during' | 'after'

export interface TripClockInput {
  start: string
  end: string
  timezone: string
  days: { date: string }[]
}

export interface TripMoment {
  phase: Phase
  /** The trip day this moment belongs to (hours before 05:00 count to the day before). */
  dayDate: string
  /** Index into trip.days, or -1. */
  dayIndex: number
  /** Minutes on that day's clock; runs past 1440 after midnight. */
  minutes: number
  /** Wall clock in the trip's time zone. */
  local: ZonedTime
  /** Calendar days from today (trip time) to the first day. */
  daysToStart: number
}

export function tripMoment(trip: TripClockInput, now: Date): TripMoment {
  const local = zoned(now, trip.timezone)
  let dayDate = local.date
  let minutes = local.minutes
  if (minutes < ROLLOVER_MIN) {
    const prev = addDays(local.date, -1)
    if (prev >= trip.start && prev <= trip.end) {
      dayDate = prev
      minutes += 1440
    }
  }
  const phase: Phase = dayDate < trip.start ? 'before' : dayDate > trip.end ? 'after' : 'during'
  const dayIndex = phase === 'during' ? trip.days.findIndex(d => d.date === dayDate) : -1
  return { phase, dayDate, dayIndex, minutes, local, daysToStart: diffDays(local.date, trip.start) }
}

/** Offset between two time zones at an instant, in minutes (b − a). */
export function zoneGap(at: Date, a: string, b: string): number {
  const za = zoned(at, a)
  const zb = zoned(at, b)
  return (dateMs(zb.date) - dateMs(za.date)) / 60_000 + zb.minutes - za.minutes
}

export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  }
  catch {
    return 'UTC'
  }
}
