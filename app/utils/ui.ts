import type { CostCat, PlaceSet, Stop, StopKind, Tod, Trip } from '#shared/types/trip'
import type { StopState } from '#shared/utils/plan'

export const KIND_META: Record<StopKind, { label: string, short: string, plural: string, icon: string, color: string }> = {
  sight: { label: 'Sight', short: 'Sight', plural: 'Sights', icon: 'landmark', color: 'var(--c-sight)' },
  food: { label: 'Food', short: 'Food', plural: 'Food', icon: 'food', color: 'var(--c-food)' },
  night: { label: 'Night out', short: 'Night', plural: 'Nights out', icon: 'glass', color: 'var(--c-night)' },
  move: { label: 'Getting there', short: 'Transit', plural: 'Transport', icon: 'metro', color: 'var(--c-move)' },
  rest: { label: 'Rest', short: 'Rest', plural: 'Rest', icon: 'coffee', color: 'var(--c-rest)' },
  task: { label: 'To do', short: 'To do', plural: 'To-dos', icon: 'task', color: 'var(--c-task)' },
}

export const KINDS = Object.keys(KIND_META) as StopKind[]

export function stopIcon(s: Pick<Stop, 'icon' | 'kind'>): string {
  return s.icon || KIND_META[s.kind]?.icon || 'circle'
}

export const STATE_META: Record<StopState, { label: string, tone: string, icon: string }> = {
  done: { label: 'Done', tone: 'ok', icon: 'check' },
  skipped: { label: 'Skipped', tone: 'closed', icon: 'skip' },
  missed: { label: 'Not marked', tone: 'warn', icon: 'alert' },
  now: { label: 'Now', tone: 'accent', icon: 'target' },
  next: { label: 'Next', tone: 'gold', icon: 'arrow' },
  upcoming: { label: 'Planned', tone: 'plain', icon: 'circle' },
}

export const FEEDBACK_TAGS = [
  'Loved it', 'Worth it', 'Hidden gem', 'Great photos', 'Tasty', 'Met people',
  'Would return', 'Too crowded', 'Overrated', 'Too pricey', 'Tiring',
]

export const CURRENCIES = ['EUR', 'TRY', 'USD', 'GBP', 'CHF', 'CZK', 'HUF', 'PLN', 'SEK', 'NOK', 'DKK', 'JPY', 'AED', 'THB', 'GEL', 'MAD', 'EGP']

const moneyFormats = new Map<string, Intl.NumberFormat | null>()

/** A currency formatter with the narrow symbol ("₺", "$"), else the plain symbol on older browsers; null if neither works. */
function moneyFormat(currency: string, digits: number): Intl.NumberFormat | null {
  const key = `${currency}|${digits}`
  let f = moneyFormats.get(key)
  if (f === undefined) {
    f = null
    for (const currencyDisplay of ['narrowSymbol', 'symbol'] as const) {
      try {
        f = new Intl.NumberFormat('en-GB', { style: 'currency', currency, currencyDisplay, maximumFractionDigits: digits, minimumFractionDigits: digits })
        break
      }
      catch { /* try the next one */ }
    }
    moneyFormats.set(key, f)
  }
  return f
}

/** "€37", "€3.50", "₺2,567": cents only for small amounts that have them, unless `digits` says otherwise. */
export function money(n: number, currency = 'EUR', digits?: number): string {
  const x = Number.isFinite(n) ? n : 0
  const d = digits ?? (Math.abs(x) < 100 && x % 1 !== 0 ? 2 : 0)
  const f = moneyFormat(currency, d)
  return f ? f.format(x) : `${x.toFixed(d)} ${currency}`
}

/** Always with cents: "€37.00", "€134.50". */
export function moneyExact(n: number, currency = 'EUR'): string {
  return money(n, currency, 2)
}

/** The amount in the home currency, whole units and always approximate: "≈ ₺2,065". "" when the trip has no rate. */
export function moneyHome(n: number, trip?: Pick<Trip, 'fx'> | null): string {
  const fx = trip?.fx
  if (!fx?.homeCurrency || !Number.isFinite(fx.rate) || fx.rate <= 0 || !Number.isFinite(n)) return ''
  return `≈ ${money(Math.round(n * fx.rate), fx.homeCurrency, 0)}`
}

const ROMAN: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]

function roman(n: number): string {
  let rest = Math.floor(n)
  let out = ''
  for (const [v, s] of ROMAN) {
    while (rest >= v) {
      out += s
      rest -= v
    }
  }
  return out
}

/** Day and month in Roman numerals, as on a stamp: "2026-10-09" is "IX·X". "" when it isn't a date. */
export function romanDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(typeof date === 'string' ? date : '')
  const month = m ? Number(m[2]) : 0
  const day = m ? Number(m[3]) : 0
  if (month < 1 || month > 12 || day < 1 || day > 31) return ''
  return `${roman(day)}·${roman(month)}`
}

/** How a cost category looks: its name, one line about it, an icon and a colour token. */
export interface CostMeta {
  label: string
  blurb: string
  icon: string
  color: string
}

/** How a place set looks (the same shape as a cost category). */
export type PlaceSetMeta = CostMeta

/** The six cost categories (labels from the spec's copy; icons and colours from its Appendix D). */
export const COST_META = {
  food: { label: 'Food', blurb: 'Meals, snacks, coffee and gelato', icon: 'food', color: 'var(--c-food)' },
  sights: { label: 'Sights', blurb: 'Tickets, tours and entry fees', icon: 'ticket', color: 'var(--c-sight)' },
  night: { label: 'Nightlife', blurb: 'Drinks, bars and clubs', icon: 'glass', color: 'var(--c-night)' },
  transport: { label: 'Transport', blurb: 'Metro, buses, trains and taxis', icon: 'metro', color: 'var(--c-move)' },
  stay: { label: 'Stay', blurb: 'Where you sleep and the city tax', icon: 'bed', color: 'var(--c-rest)' },
  other: { label: 'Other', blurb: 'Souvenirs, a SIM card and the rest', icon: 'tag', color: 'var(--c-task)' },
} satisfies Record<CostCat, CostMeta>

/** The place sets, in the words of the spec's copy (section 6) with the icons and colours of its Appendix D. */
export const PLACE_SET_META = {
  'ancient': { label: 'Ancient sites', blurb: 'Arenas, forums and old stones', icon: 'column', color: 'var(--c-sight)' },
  'art': { label: 'Museums & art', blurb: 'Frescoes, statues and grand rooms', icon: 'image', color: 'var(--c-sight)' },
  'church': { label: 'Churches', blurb: 'Domes, mosaics and quiet corners', icon: 'church', color: 'var(--c-sight)' },
  'underground': { label: 'Underground', blurb: 'Catacombs and what lies below', icon: 'arch', color: 'var(--c-sight)' },
  'views': { label: 'Piazzas & views', blurb: 'Fountains, steps, terraces and gardens', icon: 'eye', color: 'var(--c-sight)' },
  'sight-other': { label: 'Sights', blurb: 'More to see', icon: 'landmark', color: 'var(--c-sight)' },
  'pasta': { label: 'Trattorias & pasta', blurb: 'Sit-down meals and fresh pasta', icon: 'food', color: 'var(--c-food)' },
  'street': { label: 'Pizza & street food', blurb: 'Slices, supplì and quick bites', icon: 'slice', color: 'var(--c-food)' },
  'sweet': { label: 'Coffee & sweets', blurb: 'Espresso, gelato and pastries', icon: 'coffee', color: 'var(--c-food)' },
  'food-other': { label: 'Food', blurb: 'More to eat', icon: 'food', color: 'var(--c-food)' },
  'morning': { label: 'Morning light', blurb: 'Empty streets before the crowds', icon: 'sunrise', color: 'var(--c-night)' },
  'golden': { label: 'Golden hour', blurb: 'Terraces and bridges in the evening light', icon: 'sunset', color: 'var(--c-night)' },
  'anytime': { label: 'Any time', blurb: 'Good at any hour', icon: 'camera', color: 'var(--c-night)' },
} satisfies Record<PlaceSet, PlaceSetMeta>

/** A time of day to light a picture by. */
export function todFor(minutes: number, given?: Tod): Tod {
  return (given ?? todFromMinutes(minutes)) as Tod
}

export function allTimeZones(): string[] {
  try {
    const v = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone')
    if (v?.length) return v
  }
  catch { /* old browser */ }
  return ['Europe/Rome', 'Europe/Istanbul', 'Europe/London', 'Europe/Paris', 'Europe/Madrid', 'Europe/Berlin', 'Europe/Athens', 'America/New_York', 'Asia/Tokyo', 'UTC']
}

export function tripPlaces(trip: Trip) {
  return (trip.places ?? []).filter(p => p.place)
}

/** Copies text; returns false when the browser refuses. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  }
  catch {
    return false
  }
}

/**
 * For controls whose row moves when tapped (a ticked item leaves its list and the next one slides into its
 * place), or that another control replaces in the same spot: the second tap of a double tap lands on that
 * next one. `const ok = tapGuard()` once per list, then `ok(e)` in the handler is false for that second tap:
 * a click with detail 2 or more (a double click or tap), or a tap within `ms` of the last one let through and
 * where it landed (phones that report every tap as a single click; a tap on a label's text, which may come
 * without a place, counts as landing there too). A key press on the focused control (detail 0) always counts.
 * On a checkbox, call e.preventDefault() on its click when `ok(e)` is false, so the box keeps its state.
 */
export function tapGuard(ms = 500): (e?: Event) => boolean {
  let last = Number.NEGATIVE_INFINITY
  let lastAt: [number, number] | null = null
  return (e) => {
    const m = e as MouseEvent | undefined
    const detail = m?.detail ?? 0
    if (detail > 1) return false
    if (m && detail === 0 && typeof document !== 'undefined' && document.activeElement === m.target) return true
    // performance.now() keeps moving when a test freezes the date (Playwright's setFixedTime).
    const now = performance.now()
    const at: [number, number] | null = typeof m?.clientX === 'number' && (m.clientX || m.clientY) ? [m.clientX, m.clientY] : null
    const same = !at || !lastAt || Math.hypot(at[0] - lastAt[0], at[1] - lastAt[1]) < 30
    if (now - last < ms && same) return false
    last = now
    lastAt = at
    return true
  }
}

export function downloadFile(name: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function speak(text: string, lang = 'it-IT') {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.9
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  }
  catch { /* no speech */ }
}

export function greeting(minutes: number): string {
  if (minutes < 300) return 'Late night'
  if (minutes < 720) return 'Good morning'
  if (minutes < 1080) return 'Good afternoon'
  return 'Good evening'
}

const ICON_SCENES: Record<string, string> = { metro: 'train', train: 'train', bus: 'bus', taxi: 'taxi', flight: 'plane', plane: 'plane', bed: 'hostel', photo: 'steps' }
const KIND_SCENES: Record<string, string> = { sight: 'skyline', food: 'taglio', night: 'crawl', move: 'train', rest: 'hostel', task: 'skyline' }

/** A picture for a stop that has none of its own. */
export function sceneFor(s: Pick<Stop, 'scene' | 'icon' | 'kind'>): string {
  return s.scene || (s.icon && ICON_SCENES[s.icon]) || KIND_SCENES[s.kind] || 'skyline'
}

