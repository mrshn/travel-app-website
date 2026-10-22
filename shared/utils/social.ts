/**
 * Pure helpers of the social layer (docs/design/2026-10-14-together.md): ids and links, votes and who's in,
 * friends' travel, meetup times and calendar files, plan links and copies, the JSON a group trip shares.
 */
import type { CardTrip, FriendCard, Going, Meetup, Message, Role, Rsvp, Vote } from '../types/social'
import type { Trip } from '../types/trip'
import { addDays, dateMs, diffDays, fmtClock, fmtDate, pad2, zoned, zonedToDate } from './time'

// ---------- ids and links ----------

/** The id of a friendship: both uids sorted, joined by "_". */
export function socialPairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}

/** The other member of a pair id (socialPairId), or '' when `me` isn't in it. */
export function socialOtherOf(pairOrMembers: string | readonly string[], me: string): string {
  const members = typeof pairOrMembers === 'string' ? pairOrMembers.split('_') : pairOrMembers
  if (members.length !== 2 || !members.includes(me)) return ''
  return members[0] === me ? members[1]! : members[0]!
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

/** A random id for links (invites, meetups, plan links, group trips): unguessable, URL-safe, no look-alike letters. */
export function socialToken(length = 22): string {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  let out = ''
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return out
}

/** A token as it may appear in a link: 8 to 64 of letters, digits, "_" and "-". */
export function socialTokenValid(token: unknown): token is string {
  return typeof token === 'string' && /^[\w-]{8,64}$/.test(token)
}

export const HANDLE_RE = /^[a-z0-9_.]{3,20}$/

/** "@Ana.Travels " → "ana.travels". */
export function socialHandle(input: string): string {
  return String(input ?? '').trim().replace(/^@+/, '').toLowerCase()
}

export function socialHandleValid(handle: string): boolean {
  return HANDLE_RE.test(handle) && !/^[._]|[._]$|\.\./.test(handle)
}

export type SocialLinkKind = 'friend' | 'trip' | 'meetup' | 'plan'
const LINK_PREFIX: Record<SocialLinkKind, string> = { friend: 'f', trip: 'j', meetup: 'm', plan: 'p' }

/** The app path of a link: "/f/<token>" (add a friend), "/j/<token>" (join a trip), "/m/<id>" (meetup), "/p/<id>" (plan). */
export function socialPath(kind: SocialLinkKind, id: string): string {
  return `/${LINK_PREFIX[kind]}/${encodeURIComponent(id)}`
}

/** A full link from an app path and where the app lives ("https://travela-emre.firebaseapp.com/" or a test server). */
export function socialUrl(path: string, appBase: string): string {
  const base = appBase.endsWith('/') ? appBase : `${appBase}/`
  return `${base}${path.replace(/^\/+/, '')}`
}

/** The public paths that work without an account (invites, meetups, plan links). */
export function socialPublicPath(path: string): boolean {
  return /^\/(?:f|j|m|p)\/[^/]+\/?$/.test(path)
}

// ---------- people ----------

/** "Ayşe Çelik" → "AÇ"; "ana" → "A"; "" → "?". */
export function socialInitials(name: string): string {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = [...parts[0]!][0] ?? ''
  const last = parts.length > 1 ? [...parts[parts.length - 1]!][0] ?? '' : ''
  return (first + last).toUpperCase() || '?'
}

/** The first name, for short lines ("Ali is in"). */
export function socialFirstName(name: string): string {
  return String(name ?? '').trim().split(/\s+/)[0] || 'Someone'
}

/** Who a post goes to: you and your friends, once each, at most 500. */
export function socialAudience(me: string, friends: readonly string[]): string[] {
  return [...new Set([me, ...friends.filter(Boolean)])].slice(0, 500)
}

/** Owners and editors change the plan; viewers follow along. */
export function socialCanEdit(role?: Role | null): boolean {
  return role === 'owner' || role === 'editor'
}

export const ROLE_LABEL: Record<Role, string> = { owner: 'Organiser', editor: 'Can edit', viewer: 'Can view' }

// ---------- votes and who's in ----------

/** The votes on one option stop: choice id → voters, in the order they voted. */
export function socialVotes(votes: readonly Vote[], stopId: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const v of [...votes].filter(x => x.stopId === stopId).sort((a, b) => a.at - b.at)) {
    if (!out.has(v.choiceId)) out.set(v.choiceId, [])
    out.get(v.choiceId)!.push(v.uid)
  }
  return out
}

/** The choice with the most votes, or null when nobody voted or two lead together. */
export function socialLeading(tally: Map<string, string[]>): string | null {
  let best: string | null = null
  let n = 0
  let tie = false
  for (const [id, uids] of tally) {
    if (uids.length > n) {
      best = id
      n = uids.length
      tie = false
    }
    else if (uids.length === n && n > 0) {
      tie = true
    }
  }
  return tie ? null : best
}

/** Who's in, maybe or out for one stop. */
export function socialGoing(rsvps: readonly Rsvp[], stopId: string): Record<Going, string[]> {
  const out: Record<Going, string[]> = { in: [], maybe: [], out: [] }
  for (const r of [...rsvps].filter(x => x.stopId === stopId).sort((a, b) => a.at - b.at)) out[r.going].push(r.uid)
  return out
}

// ---------- friends' travel ----------

/** Your trips as friends see them: not ended more than two weeks ago, by start date, at most 8. */
export function socialCardTrips(trips: readonly Trip[], today: string): CardTrip[] {
  const from = addDays(today, -14)
  return trips
    .filter(t => t.start && t.end && t.end >= from)
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 8)
    .map(t => ({
      title: t.title,
      destination: t.destination,
      ...(t.country ? { country: t.country } : {}),
      start: t.start,
      end: t.end,
      ...(t.cover ? { cover: { scene: t.cover.scene, tod: t.cover.tod } } : {}),
    }))
}

/** A place name for comparing: no accents, no case, no "city of", no punctuation. */
export function socialPlaceKey(name: string): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/\bcity of\b|\bthe\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function socialSamePlace(a: string, b: string): boolean {
  const x = socialPlaceKey(a)
  const y = socialPlaceKey(b)
  return !!x && !!y && (x === y || x.startsWith(`${y} `) || y.startsWith(`${x} `))
}

/** Two date ranges (YYYY-MM-DD, inclusive) share at least one day. */
export function socialOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

export interface FriendTrip {
  uid: string
  trip: CardTrip
}

/** Friends with a trip to the same place on overlapping dates (cards of friends who let you see their trips). */
export function socialFriendsThere(cards: readonly FriendCard[], where: { destination: string, start: string, end: string }): FriendTrip[] {
  const out: FriendTrip[] = []
  for (const c of cards) {
    if (!c?.showTrips) continue
    const t = (c.trips ?? []).find(x => socialSamePlace(x.destination, where.destination) && socialOverlap(x.start, x.end, where.start, where.end))
    if (t) out.push({ uid: c.uid, trip: t })
  }
  return out
}

/** Friends travelling today, and those leaving in the next `days` days. */
export function socialTravelling(cards: readonly FriendCard[], today: string, days = 30): { now: FriendTrip[], soon: FriendTrip[] } {
  const now: FriendTrip[] = []
  const soon: FriendTrip[] = []
  const until = addDays(today, days)
  for (const c of cards) {
    if (!c?.showTrips) continue
    const trips = (c.trips ?? []).slice().sort((a, b) => a.start.localeCompare(b.start))
    const on = trips.find(t => t.start <= today && today <= t.end)
    if (on) {
      now.push({ uid: c.uid, trip: on })
      continue
    }
    const next = trips.find(t => t.start > today && t.start <= until)
    if (next) soon.push({ uid: c.uid, trip: next })
  }
  soon.sort((a, b) => a.trip.start.localeCompare(b.trip.start))
  return { now, soon }
}

// ---------- meetups ----------

/** An ISO time with its offset for a wall-clock time in a zone: ("2026-10-09", 480, "Europe/Rome") → "2026-10-09T08:00:00+02:00". */
export function socialZonedIso(date: string, minutes: number, timeZone: string): string {
  const instant = zonedToDate(date, minutes, timeZone)
  const z = zoned(instant, timeZone)
  const offset = Math.round((dateMs(z.date) + z.minutes * 60_000 + z.seconds * 1000 - instant.getTime()) / 60_000)
  const sign = offset < 0 ? '-' : '+'
  const abs = Math.abs(offset)
  return `${z.date}T${fmtClock(z.minutes)}:${pad2(z.seconds)}${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

export interface MeetupWhen {
  /** YYYY-MM-DD and minutes, in the meetup's own time zone. */
  date: string
  minutes: number
  /** "Fri 9 Oct, 08:00" (the meetup's time zone). */
  label: string
  /** "09:00 your time" when the viewer's zone shows another time, else ''. */
  yours: string
}

/** When a meetup is, as it is where it happens, and as it is for the viewer. */
export function socialMeetupWhen(m: Pick<Meetup, 'start' | 'timezone'>, viewerZone?: string): MeetupWhen {
  const at = new Date(m.start)
  if (Number.isNaN(at.getTime())) return { date: '', minutes: 0, label: '', yours: '' }
  const here = zoned(at, m.timezone)
  let yours = ''
  if (viewerZone && viewerZone !== m.timezone) {
    try {
      const v = zoned(at, viewerZone)
      if (v.minutes !== here.minutes || v.date !== here.date) yours = `${v.date === here.date ? '' : `${fmtDate(v.date, 'short')}, `}${fmtClock(v.minutes)} your time`
    }
    catch { /* unknown zone */ }
  }
  return { date: here.date, minutes: here.minutes, label: `${fmtDate(here.date, 'short')}, ${fmtClock(here.minutes)}`, yours }
}

/** A meetup is over a few hours after it starts (it stays readable, marked as passed). */
export function socialMeetupPassed(m: Pick<Meetup, 'start'>, now: number, hours = 4): boolean {
  const t = Date.parse(m.start)
  return Number.isFinite(t) && now > t + hours * 3_600_000
}

const icsText = (s: string) => String(s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => `\\${m}`)
const icsTime = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** A calendar file (.ics) for a meetup: one event of `minutes` (default 90), in UTC. */
export function socialMeetupIcs(m: Pick<Meetup, 'id' | 'title' | 'note' | 'start' | 'place'>, url: string, minutes = 90): string {
  const start = Date.parse(m.start)
  const where = m.place ? [m.place.name, m.place.lat !== undefined && m.place.lng !== undefined ? `${m.place.lat},${m.place.lng}` : ''].filter(Boolean).join(' ') : ''
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Travels//Meetup//EN',
    'BEGIN:VEVENT',
    `UID:${m.id}@travels`,
    `DTSTAMP:${icsTime(start)}`,
    `DTSTART:${icsTime(start)}`,
    `DTEND:${icsTime(start + minutes * 60_000)}`,
    `SUMMARY:${icsText(m.title)}`,
    `DESCRIPTION:${icsText([m.note, url].filter(Boolean).join('\n'))}`,
    ...(where ? [`LOCATION:${icsText(where)}`] : []),
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

// ---------- plan links and copies ----------

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

/**
 * A plan as a plan link holds it: nothing of yours in it. No group, seed or edit marks, no tombstones; where you
 * stay (home, the driver card and SOS lines naming it) only when `includeHome`.
 */
export function socialShareTrip(trip: Trip, opts: { includeHome?: boolean } = {}): Trip {
  const t = clone(trip)
  delete t.group
  delete t.seedId
  delete t.seedVersion
  delete t.edited
  delete t.tombstones
  delete t.copiedFrom
  if (!opts.includeHome) {
    const home = trip.home
    delete t.home
    delete t.driverCard
    if (home && t.sos) {
      const words = [home.label, home.name, home.address].filter((x): x is string => !!x && x.length > 3)
      t.sos = t.sos.filter(e => !words.some(w => `${e.label} ${e.value}`.includes(w)))
    }
  }
  return t
}

/** "9" → "IX" (a day of the month as the app shows it). */
export function socialRomanDay(n: number): string {
  const table: [number, string][] = [[30, 'XXX'], [20, 'XX'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let x = Math.max(1, Math.min(31, Math.round(n)))
  let out = ''
  for (const [v, s] of table) {
    while (x >= v) {
      out += s
      x -= v
    }
  }
  return out
}

/**
 * A copy of a shared plan for your own trips: a new id, a fresh start (nothing ticked, nothing edited), moved to
 * start on `start` when given (every date of the plan moves with it).
 */
export function socialCopyTrip(trip: Trip, opts: { id: string, now: string, start?: string, from?: Trip['copiedFrom'] }): Trip {
  const t = socialShareTrip(trip, { includeHome: true })
  t.id = opts.id
  t.createdAt = opts.now
  t.updatedAt = opts.now
  if (opts.from) t.copiedFrom = { ...opts.from }
  const shift = opts.start && /^\d{4}-\d{2}-\d{2}$/.test(opts.start) ? diffDays(trip.start, opts.start) : 0
  if (shift) {
    t.start = addDays(t.start, shift)
    t.end = addDays(t.end, shift)
    for (const d of t.days) {
      d.date = addDays(d.date, shift)
      d.num = socialRomanDay(Number(d.date.slice(8, 10)))
    }
    for (const b of t.bookings ?? []) {
      if (b.due) b.due = addDays(b.due, shift)
    }
  }
  return t
}

// ---------- group trips ----------

/**
 * The shared plan of a group trip as the cloud holds it: the trip with the group's id, and without what is yours
 * alone (your role, the seed it came from, the edited mark). Every member's copy gives the same JSON.
 */
export function socialGroupJson(trip: Trip, gid: string): string {
  const t = clone(trip)
  t.id = gid
  delete t.group
  delete t.seedId
  delete t.seedVersion
  delete t.edited
  return JSON.stringify(t)
}

/** A member's copy of a group trip: the shared plan under the id it has on their devices, with their role. */
export function socialGroupTrip(json: string, localId: string, gid: string, role: Role): Trip {
  const t = JSON.parse(json) as Trip
  t.id = localId
  t.group = { id: gid, role }
  delete t.seedId
  delete t.seedVersion
  delete t.edited
  return t
}

// ---------- lines ----------

/** "now", "5 min", "3 h", "yesterday", "Mon", "12 Oct": how long ago, short. */
export function socialAgo(at: number, now: number): string {
  const min = Math.floor((now - at) / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h`
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  const days = diffDays(day(at), day(now))
  if (days <= 1) return 'yesterday'
  if (days < 7) return fmtDate(day(at), 'weekday')
  return fmtDate(day(at), 'dayMonth')
}

/** A message in one line, for lists ("Ali: Meet at 8?", "Ali shared a photo"). */
export function socialMessageLine(m: Pick<Message, 'kind' | 'text' | 'name' | 'stopTitle'>): string {
  const who = socialFirstName(m.name)
  switch (m.kind) {
    case 'photo': return m.text ? `${who}: ${m.text}` : `${who} shared a photo`
    case 'stop': return `${who} shared ${m.stopTitle || 'a stop'}${m.text ? `: ${m.text}` : ''}`
    case 'location': return `${who} shared where they are`
    case 'system':
    case 'status': return m.text
    default: return `${who}: ${m.text}`
  }
}
