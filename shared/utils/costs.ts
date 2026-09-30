/**
 * Costs: what you paid, by day and kind, against the daily plan. Every sum is made in whole cents.
 *
 * New costs are records in TripProgress.expenses (tombstones included). The old Feedback.spent and
 * DayNote.extraSpent values are read as "Logged earlier" entries and never written; a record under their
 * fixed legacy id (live or deleted) hides the old value, so nothing is counted twice or brought back.
 *
 * No runtime import of plan.ts: plan.ts imports this file (summarize() reads costSummary()).
 */
import type { Booking, CostCat, Expense, Stop, StopKind, Trip, TripProgress } from '../types/trip'
import type { DayPlan } from './plan'
import { tripMoment, zonedToDate } from './time'

/** Every category, in display order. */
export const COST_CATS: readonly CostCat[] = Object.freeze(['food', 'sights', 'night', 'transport', 'stay', 'other'] as const)

/** Index into BudgetDay.values for the categories the daily plan covers. */
export const COST_PLANNED: Partial<Record<CostCat, 0 | 1 | 2 | 3>> = Object.freeze({ sights: 0, food: 1, night: 2, transport: 3 })

/** The largest amount one cost can have. */
export const COST_MAX = 99_999.99

const MAX_CENTS = 9_999_999

/** Own property check (Object.hasOwn is too new for some phones). */
const own = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key)

const KIND_CAT: Readonly<Record<StopKind, CostCat>> = { sight: 'sights', food: 'food', night: 'night', move: 'transport', rest: 'stay', task: 'other' }

/** The category a cost linked to a stop of this kind gets. */
export function costCatForKind(kind: StopKind): CostCat {
  return own(KIND_CAT, kind) ? KIND_CAT[kind] : 'other'
}

/** Euros to whole cents. */
export function costToCents(n: number): number {
  return Math.round(n * 100)
}

function isCat(x: unknown): x is CostCat {
  return typeof x === 'string' && (COST_CATS as readonly string[]).includes(x)
}

/** A stored amount as whole cents, or 0 when it isn't a usable amount (missing, text, 0, negative, too big). */
function amountCents(x: unknown): number {
  const n = typeof x === 'number' ? x : typeof x === 'string' && x.trim() ? Number(x) : Number.NaN
  if (!Number.isFinite(n) || n <= 0) return 0
  const c = costToCents(n)
  return c > 0 && c <= MAX_CENTS ? c : 0
}

/**
 * A cost's amount in the trip's currency, as whole cents (0 when it can't be used). This version logs in the
 * trip's currency only; a cost in the home currency (from a later version) is converted with trip.fx, and one
 * in any other currency is left out rather than counted at the wrong value.
 */
function expenseCents(e: Pick<Expense, 'amount' | 'currency'>, trip: Pick<Trip, 'currency' | 'fx'>): number {
  const cents = amountCents(e.amount)
  if (!cents || !e.currency || e.currency === trip.currency) return cents
  const fx = trip.fx
  if (fx && e.currency === fx.homeCurrency && Number.isFinite(fx.rate) && fx.rate > 0) return amountCents(cents / 100 / fx.rate)
  return 0
}

/** A budget figure as whole cents (0 when missing or unreadable). */
function planCents(x: unknown): number {
  return typeof x === 'number' && Number.isFinite(x) && x > 0 ? costToCents(x) : 0
}

/**
 * Digits with at most one "." or "," as whole cents, or null.
 * One separator followed by exactly three digits, after one to three digits that don't start with 0,
 * is a thousands separator ("1.250" and "1,250" are 1250). Otherwise it is the decimal point, and the
 * cents are rounded half up from the digits themselves ("4.5678" is 4.57), so no float error creeps in.
 */
function digitsToCents(s: string): number | null {
  const m = /^(\d*)(?:([.,])(\d*))?$/.exec(s)
  if (!m) return null
  const whole = m[1] ?? ''
  const sep = m[2]
  const frac = m[3] ?? ''
  if (!whole && !frac) return null
  if (sep && frac.length === 3 && /^[1-9]\d{0,2}$/.test(whole)) return Number(whole + frac) * 100
  const first3 = `${frac}000`.slice(0, 3)
  const cents = Number(whole || '0') * 100 + Number(first3.slice(0, 2)) + (Number(first3[2]) >= 5 ? 1 : 0)
  return Number.isSafeInteger(cents) ? cents : null
}

/**
 * An amount typed or pasted by you: "3,50", "3.50", "3", " 12 ", "€7", "7 €". Rounded to cents.
 * null for empty, 0, negative, anything above COST_MAX, "4,5,0" and other text.
 */
export function costParseAmount(text: string): number | null {
  if (typeof text !== 'string') return null
  const s = text.trim().replace(/^€\s*/, '').replace(/\s*€$/, '')
  const cents = digitsToCents(s)
  if (cents === null || cents <= 0 || cents > MAX_CENTS) return null
  return cents / 100
}

/**
 * The keypad: the amount as typed so far after one more key ('0'-'9', '.' or ',', 'back', 'clear').
 * No leading zeros ("0" then "5" gives "5"; "." on empty gives "0."), one point, at most 2 decimals and
 * 5 whole digits, so the largest amount is 99999.99 (COST_MAX). Keys that don't fit are ignored.
 */
export function costPadInput(current: string, key: string): string {
  const cur = String(current ?? '').replace(',', '.')
  if (key === 'clear') return ''
  if (key === 'back') return cur.slice(0, -1)
  if (key === '.' || key === ',') {
    if (cur.includes('.')) return cur
    return cur ? `${cur}.` : '0.'
  }
  if (!/^\d$/.test(key)) return cur
  const dot = cur.indexOf('.')
  if (dot >= 0) return cur.length - dot - 1 >= 2 ? cur : cur + key
  if (cur === '0') return key
  return cur.length >= 5 ? cur : cur + key
}

/** Euro amounts found in a planned-cost text. */
export interface CostHints {
  /** Set when the text holds exactly one amount (0 for "Free" or "Included" with no amount). */
  exact?: number
  /** Every amount above 0, in the order of the text, each once. */
  options: number[]
}

const NUM = String.raw`\d+(?:[.,]\d+)?`
const EURO_AMOUNTS = new RegExp(
  String.raw`€\s?(${NUM})(?:\s*(?:[–-]|\bto\b)\s*€?\s?(${NUM}))?|(${NUM})(?:\s*(?:[–-]|\bto\b)\s*(${NUM}))?\s?€`,
  'g',
)

/**
 * The euro amounts of a planned cost ("€7", "€1.50 tap", "about €13", "~€10–15", "€18 or €24").
 * `exact` is set only for exactly one amount, with no range and none of " or ", "+", "·" or "/" in the text.
 * "Free" or "Included" with no euro amount gives exact 0. Texts with no euro amount (US$, $, tip-based)
 * give nothing.
 */
export function costHints(text?: string): CostHints {
  if (!text || typeof text !== 'string') return { options: [] }
  const amounts: number[] = []
  let range = false
  for (const m of text.matchAll(EURO_AMOUNTS)) {
    const [a, b] = m[1] !== undefined ? [m[1], m[2]] : [m[3], m[4]]
    if (b !== undefined) range = true
    for (const s of [a, b]) {
      if (s === undefined) continue
      const c = digitsToCents(s)
      if (c !== null && c <= MAX_CENTS) amounts.push(c / 100)
    }
  }
  if (!amounts.length) return /\b(?:free|included)\b/i.test(text) ? { exact: 0, options: [] } : { options: [] }
  const options = [...new Set(amounts.filter(x => x > 0))]
  const single = amounts.length === 1 && !range && !/\sor\s|\+|·|\//i.test(text)
  return single ? { exact: amounts[0]!, options } : { options }
}

/** The trip day id of an instant on the trip's clock (05:00 rule, trip time zone); undefined before or after the trip. */
export function costDayFor(trip: Pick<Trip, 'start' | 'end' | 'timezone' | 'days'>, at: Date): string | undefined {
  if (!(at instanceof Date) || Number.isNaN(at.getTime())) return undefined
  const m = tripMoment(trip, at)
  return m.dayIndex >= 0 ? trip.days[m.dayIndex]?.id : undefined
}

/** The fixed record id that takes over an old spend value when you edit or delete it. */
export function costLegacyId(kind: 'stop' | 'day', id: string): string {
  return `legacy-${kind}-${id}`
}

export interface CostEntry {
  /** The expense id, or the legacy id. */
  id: string
  source: 'expense' | 'legacy'
  /** In the trip's currency. */
  amount: number
  cat: CostCat
  /** A day of the trip; missing for costs before or after the trip. */
  dayId?: string
  stopId?: string
  placeId?: string
  bookingId?: string
  note?: string
  /** The linked stop's or booking's title (the snapshot taken when it was logged, else today's). */
  title?: string
  /** For ordering, in ms: expenses use `at`, legacy stop entries their planned start, legacy day entries 23:59. */
  sortAt: number
  preview?: boolean
  expense?: Expense
}

export interface CostPair {
  spent: number
  planned: number
}

export interface CostSummary {
  /** Every live cost, newest first. */
  entries: CostEntry[]
  /** Every trip day; spent excludes 'stay'; planned from trip.budget. */
  byDay: Record<string, CostPair>
  /** Trip days only; planned for the four budget categories, 0 for stay and other. */
  byCat: Record<CostCat, CostPair>
  /** The sum of byDay. */
  trip: CostPair
  /** Every live entry, any day, any category. */
  all: number
  /** Live entries linked to each stop, any category. */
  byStop: Record<string, number>
  /** Trip days with at least one entry. */
  days: number
}

interface StopInfo {
  dayId: string
  date: string
  start: number
  kind: StopKind
  title: string
}

/** Title and kind with the picked option applied (as plan.ts resolveStop does). */
function resolvedLook(s: Stop, choices: Record<string, string> | undefined): { kind: StopKind, title: string } {
  const list = s.options?.choices
  if (!list?.length) return { kind: s.kind, title: s.title }
  const id = choices?.[s.id] ?? s.options!.default
  const c = list.find(x => x.id === id) ?? list[0]!
  return { kind: c.kind ?? s.kind, title: c.title }
}

/** Finds a stop's day, kind and title: the resolved plan first, then any version of the trip. */
function stopFinder(trip: Trip, p: TripProgress, plans?: readonly DayPlan[]): (stopId: string) => StopInfo | undefined {
  const active = new Map<string, StopInfo>()
  const anyVersion = new Map<string, StopInfo>()
  const put = (map: Map<string, StopInfo>, dayId: string, date: string, s: Stop, look: { kind: StopKind, title: string }) => {
    if (s && typeof s.id === 'string' && !map.has(s.id)) map.set(s.id, { dayId, date, start: s.start, ...look })
  }
  if (plans) {
    for (const plan of plans) {
      for (const s of plan.stops) put(active, plan.view.day.id, plan.view.day.date, s, { kind: s.kind, title: s.title })
    }
  }
  else {
    // The same choice of version as plan.ts activeVariant().
    const v = trip.variant
      ? (p.variant && trip.variant.options.some(o => o.id === p.variant) ? p.variant : trip.variant.default)
      : undefined
    for (const d of trip.days) {
      const stops = (v ? d.variants?.[v]?.stops : undefined) ?? d.stops ?? []
      for (const s of stops) put(active, d.id, d.date, s, resolvedLook(s, p.choices))
    }
  }
  let built = false
  return (stopId) => {
    const hit = active.get(stopId)
    if (hit) return hit
    if (!built) {
      built = true
      for (const d of trip.days) {
        for (const s of d.stops ?? []) put(anyVersion, d.id, d.date, s, resolvedLook(s, p.choices))
        for (const vs of Object.values(d.variants ?? {})) {
          for (const s of vs.stops ?? []) put(anyVersion, d.id, d.date, s, resolvedLook(s, p.choices))
        }
      }
    }
    return anyVersion.get(stopId)
  }
}

function timeMs(iso: unknown): number {
  const t = typeof iso === 'string' ? Date.parse(iso) : Number.NaN
  return Number.isNaN(t) ? Number.NaN : t
}

/** The instant of a planned time on a trip day, in ms, or NaN when the data can't give one. */
function plannedMs(date: string, minutes: number, timeZone: string): number {
  if (!Number.isFinite(minutes)) return Number.NaN
  try {
    return zonedToDate(date, minutes, timeZone).getTime()
  }
  catch {
    return Number.NaN
  }
}

/** The first of these times that can be read, else 0. */
const firstMs = (...ts: number[]) => ts.find(t => Number.isFinite(t)) ?? 0

/**
 * Every live cost, newest first: live expenses, plus one "Logged earlier" entry per feedback[stopId].spent > 0
 * and per dayNotes[dayId].extraSpent > 0, unless a record (live or deleted) exists under its legacy id.
 * A legacy stop entry takes its day and kind from the resolved plan, else from any version of the trip,
 * else none (then it counts to no day, as 'other'). A day's extraSpent is 'other', titled "Other spending".
 * `plans` is the resolved plan (planDays); without it the active version of each day is used.
 */
export function costEntries(trip: Trip, p: TripProgress, plans?: readonly DayPlan[]): CostEntry[] {
  const out: CostEntry[] = []
  const days = new Map(trip.days.map(d => [d.id, d]))
  const find = stopFinder(trip, p, plans)
  const bookings = new Map((trip.bookings ?? []).map((b: Booking) => [b.id, b]))
  const records = p.expenses && typeof p.expenses === 'object' ? p.expenses : {}
  // A record under a legacy id, live or deleted, takes over the old value.
  const hasRecord = (id: string) => own(records, id) && !!records[id] && typeof records[id] === 'object'

  for (const [id, e] of Object.entries(records)) {
    if (!e || typeof e !== 'object' || e.deleted) continue
    const cents = expenseCents(e, trip)
    if (!cents) continue
    const entry: CostEntry = {
      id,
      source: 'expense',
      amount: cents / 100,
      cat: isCat(e.cat) ? e.cat : 'other',
      sortAt: firstMs(timeMs(e.at), timeMs(e.updatedAt)),
      expense: e,
    }
    if (typeof e.dayId === 'string' && days.has(e.dayId)) entry.dayId = e.dayId
    if (e.stopId) entry.stopId = e.stopId
    if (e.placeId) entry.placeId = e.placeId
    if (e.bookingId) entry.bookingId = e.bookingId
    if (e.note) entry.note = e.note
    const title = e.title || (e.stopId ? find(e.stopId)?.title : undefined) || (e.bookingId ? bookings.get(e.bookingId)?.title : undefined)
    if (title) entry.title = title
    if (e.preview === true) entry.preview = true
    out.push(entry)
  }

  for (const [stopId, fb] of Object.entries(p.feedback ?? {})) {
    const cents = amountCents(fb?.spent)
    const id = costLegacyId('stop', stopId)
    if (!cents || hasRecord(id)) continue
    const info = find(stopId)
    const entry: CostEntry = {
      id,
      source: 'legacy',
      amount: cents / 100,
      cat: info ? costCatForKind(info.kind) : 'other',
      stopId,
      sortAt: firstMs(info ? plannedMs(info.date, info.start, trip.timezone) : Number.NaN, timeMs(fb?.updatedAt)),
    }
    if (info) {
      entry.dayId = info.dayId
      entry.title = info.title
    }
    out.push(entry)
  }

  for (const [dayId, note] of Object.entries(p.dayNotes ?? {})) {
    const cents = amountCents(note?.extraSpent)
    const id = costLegacyId('day', dayId)
    if (!cents || hasRecord(id)) continue
    const day = days.get(dayId)
    const entry: CostEntry = {
      id,
      source: 'legacy',
      amount: cents / 100,
      cat: 'other',
      title: 'Other spending',
      sortAt: firstMs(day ? plannedMs(day.date, 23 * 60 + 59, trip.timezone) : Number.NaN, timeMs(note?.updatedAt)),
    }
    if (day) entry.dayId = dayId
    out.push(entry)
  }

  return out.sort((a, b) => b.sortAt - a.sortAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** Totals by day, by kind and overall, against the daily plan (trip.budget). */
export function costSummary(trip: Trip, p: TripProgress, plans?: readonly DayPlan[]): CostSummary {
  const entries = costEntries(trip, p, plans)
  const budget = (dayId: string) => (trip.budget ?? []).find(b => b.dayId === dayId)

  // Maps, not plain objects: an id like "constructor" must not meet Object.prototype.
  const dayCents = new Map<string, CostPair>()
  for (const d of trip.days) {
    const values = budget(d.id)?.values ?? []
    if (!dayCents.has(d.id)) dayCents.set(d.id, { spent: 0, planned: values.reduce((a, v) => a + planCents(v), 0) })
  }
  const catCents = {} as Record<CostCat, CostPair>
  for (const c of COST_CATS) {
    const i = COST_PLANNED[c]
    let planned = 0
    if (i !== undefined) for (const d of trip.days) planned += planCents(budget(d.id)?.values?.[i])
    catCents[c] = { spent: 0, planned }
  }

  let all = 0
  const stopCents = new Map<string, number>()
  const daysWithCosts = new Set<string>()
  for (const e of entries) {
    const c = costToCents(e.amount)
    all += c
    if (e.stopId) stopCents.set(e.stopId, (stopCents.get(e.stopId) ?? 0) + c)
    const day = e.dayId !== undefined ? dayCents.get(e.dayId) : undefined
    if (!day) continue
    daysWithCosts.add(e.dayId!)
    catCents[e.cat].spent += c
    if (e.cat !== 'stay') day.spent += c
  }

  const euros = (x: CostPair): CostPair => ({ spent: x.spent / 100, planned: x.planned / 100 })
  const tripCents = [...dayCents.values()].reduce((a, d) => ({ spent: a.spent + d.spent, planned: a.planned + d.planned }), { spent: 0, planned: 0 })
  return {
    entries,
    byDay: Object.fromEntries([...dayCents].map(([k, v]) => [k, euros(v)])),
    byCat: Object.fromEntries(COST_CATS.map(c => [c, euros(catCents[c])])) as Record<CostCat, CostPair>,
    trip: euros(tripCents),
    all: all / 100,
    byStop: Object.fromEntries([...stopCents].map(([k, v]) => [k, v / 100])),
    days: daysWithCosts.size,
  }
}

/** A live entry is linked to this stop in the stop's own category. */
export function costLoggedFor(stop: Pick<Stop, 'id' | 'kind'>, s: CostSummary): boolean {
  const cat = costCatForKind(stop.kind)
  return s.entries.some(e => e.stopId === stop.id && e.cat === cat)
}

/** The stop's planned amounts when they hold an amount above 0 and nothing is logged for it yet, else null. */
export function costOfferFor(stop: Pick<Stop, 'id' | 'kind' | 'cost'>, s: CostSummary): CostHints | null {
  const h = costHints(stop.cost)
  if (!((h.exact ?? 0) > 0) && !h.options.length) return null
  return costLoggedFor(stop, s) ? null : h
}
