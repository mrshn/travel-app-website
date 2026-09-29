import type { Stop, StopKind, Tod, Trip } from '#shared/types/trip'
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

export function money(n: number, currency = 'EUR', digits?: number): string {
  const d = digits ?? (Math.abs(n) < 100 && n % 1 !== 0 ? 2 : 0)
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: d, minimumFractionDigits: d }).format(n)
  }
  catch {
    return `${n.toFixed(d)} ${currency}`
  }
}

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

