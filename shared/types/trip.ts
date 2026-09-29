/** Light of the moment a picture is drawn for. */
export type Tod = 'dawn' | 'day' | 'golden' | 'sunset' | 'blue' | 'night'

/** What a stop is, for colours, progress and icons. */
export type StopKind = 'sight' | 'food' | 'night' | 'move' | 'rest' | 'task'

export interface Place {
  name: string
  lat: number
  lng: number
  /** Text used for Google Maps / photo searches. */
  query?: string
}

export interface LinkRef {
  label: string
  url: string
}

/** How you get to a stop from the previous one (drawn on the map). */
export type Via = 'walk' | 'ride' | { line: string, from: string, to: string }

export interface Scene {
  scene: string
  tod: Tod
}

export interface Choice {
  id: string
  label: string
  title: string
  kind?: StopKind
  icon?: string
  cost?: string
  badge?: string
  lines: string[]
  place?: Place | null
  via?: Via
  scene?: string
  tod?: Tod
  bookingId?: string
  links?: LinkRef[]
}

export interface StopOptions {
  label: string
  default: string
  helper?: string
  note?: string
  choices: Choice[]
}

export type StopTag = 'must' | 'optional' | 'skipIfTired'

export interface Stop {
  id: string
  /** Minutes after midnight of the day's date. Values over 1440 are after midnight. */
  start: number
  end?: number
  timeLabel: string
  kind: StopKind
  /** Finer icon hint: metro, bus, train, taxi, flight, walk, bed, shield, task, photo… */
  icon?: string
  title: string
  tip?: string
  cost?: string
  bookingId?: string
  tags?: StopTag[]
  place?: Place | null
  via?: Via
  scene?: string
  tod?: Tod
  links?: LinkRef[]
  /** Small logistics steps: shown compact and not counted in progress. */
  minor?: boolean
  metro?: string[]
  /** This stop leaves the map towards the airport. */
  offToAirport?: boolean
  options?: StopOptions
  /** Added by you in the app. */
  custom?: boolean
}

export interface DayAlert {
  from: number
  to: number
  icon: string
  text: string
  tone?: 'info' | 'warn'
}

export interface JourneyNode {
  time: string
  name: string
  sub: string
  mode?: '' | 'walk' | 'ride' | 'fly'
  label?: string
}

export interface NearbyFood {
  name: string
  sub: string
  query: string
  scene: string
}

export interface InfoCard {
  title: string
  icon: string
  items: { icon: string, text: string }[]
}

export interface DayVariant {
  title: string
  cover: Scene
  stops: Stop[]
  banner?: string
}

export interface Day {
  id: string
  date: string
  num: string
  label: string
  title: string
  cover: Scene
  sun?: { rise: number, set: number, blueAm?: [number, number], bluePm?: [number, number] }
  facts: { icon: string, text: string }[]
  stops: Stop[]
  alerts?: DayAlert[]
  journey?: { title: string, nodes: JourneyNode[] }
  nearby?: { food?: NearbyFood[], photos?: string[], cards?: InfoCard[] }
  /** Alternative versions of this day, keyed by trip variant option id. */
  variants?: Record<string, DayVariant>
}

export interface Booking {
  id: string
  /** YYYY-MM-DD, or null when it has no fixed date. */
  due: string | null
  dueLabel: string
  asap?: boolean
  key?: string
  title: string
  detail?: string
  cost?: string
  links?: LinkRef[]
  scene?: Scene
}

export interface PlaceCard {
  id: string
  category: 'sight' | 'food' | 'photo'
  name: string
  text: string
  area?: string
  where?: string
  price?: string
  booking?: string
  /** Open status for each trip day: o = open, c = closed, n = not applicable. */
  open?: string[]
  openNotes?: string[]
  verdict?: 'worth' | 'split' | 'over' | 'trap' | 'closed'
  closed?: string
  sunday?: boolean | null
  bestTime?: string
  top?: boolean
  scene: string
  tod?: Tod
  place?: Place | null
  links?: LinkRef[]
  /** Text for Google Maps / Photos searches. */
  searchQuery?: string
  query?: string
}

export type InfoBlock =
  | { t: 'p', text: string }
  | { t: 'list', items: string[], ordered?: boolean }
  | { t: 'table', head: string[], rows: string[][] }
  | { t: 'callout', title: string, text: string, tone?: 'accent' | 'gold' }
  | { t: 'tags', items: string[] }
  | { t: 'special', kind: 'converter' | 'packing' | 'budget' | 'phrases' | 'dishes' | 'nightChart' }

export interface InfoSection {
  id: string
  title: string
  subtitle?: string
  icon: string
  blocks: InfoBlock[]
}

export interface SosEntry {
  label: string
  value: string
  /** Digits for a tel: link. */
  tel?: string
  big?: boolean
  text?: boolean
}

export interface BudgetDay {
  dayId: string
  label: string
  /** Planned spend by category: sights, food, night, transport. */
  values: [number, number, number, number]
  notes?: [string, string, string, string]
}

export interface MetroLine {
  id: string
  color: string
  stations: { name: string | null, lat: number, lng: number }[]
}

export interface TripVariantSwitch {
  id: string
  question: string
  hint?: string
  default: string
  options: { id: string, label: string }[]
}

export interface Trip {
  id: string
  title: string
  destination: string
  country?: string
  timezone: string
  /** YYYY-MM-DD */
  start: string
  end: string
  subtitle?: string
  cover: Scene
  currency: string
  /** Optional exchange rate to show a converter: 1 unit of `currency` = rate × `homeCurrency`. */
  fx?: { homeCurrency: string, rate: number, source?: string }
  home?: Place & { label: string, address?: string }
  days: Day[]
  bookings: Booking[]
  bookingTips?: InfoCard[]
  packing: string[]
  places?: PlaceCard[]
  /** Day ids that PlaceCard.open / openNotes refer to, in order. */
  openDays?: string[]
  dishes?: { name: string, sub: string, pork: string, where: string, scene: string }[]
  info?: InfoSection[]
  sos?: SosEntry[]
  sosSteps?: string[]
  driverCard?: string[]
  phrases?: [string, string, string][]
  budget?: BudgetDay[]
  overlay?: { lines: MetroLine[] }
  variant?: TripVariantSwitch
  nightCards?: { num: string, day: string, title: string, text: string, scene: string, dayId: string }[]
  airport?: { name: string, lat: number, lng: number, label: string }
  /** Seeded trips can be reset to the original plan. */
  seedId?: string
  createdAt: string
  updatedAt: string
}

/* ---------- progress (what you did) ---------- */

export type StopStatus = 'done' | 'skipped'

export interface StopProgress {
  status: StopStatus
  /** ISO timestamp of when you marked it. */
  at: string
}

export interface Feedback {
  rating?: number
  tags?: string[]
  note?: string
  spent?: number
  photos?: string[]
  updatedAt: string
}

export interface DayNote {
  rating?: number
  note?: string
  /** Money spent that day outside any stop (water, souvenirs, tickets…). */
  extraSpent?: number
  updatedAt?: string
}

export interface TripProgress {
  stops: Record<string, StopProgress>
  feedback: Record<string, Feedback>
  choices: Record<string, string>
  bookings: Record<string, boolean>
  packing: Record<string, boolean>
  variant?: string
  dayNotes: Record<string, DayNote>
  tripNote?: string
}
