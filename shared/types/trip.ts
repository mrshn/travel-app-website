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
  /** This option is that saved place (PlaceCard.id): it stamps the place when done and puts it "in your plan". */
  placeId?: string
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
  /** This stop is that saved place (PlaceCard.id): it stamps the place when done and puts it "in your plan". */
  placeId?: string
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
  /** The set it belongs to. Optional: worked out from the scene and best time when missing. */
  set?: PlaceSet
}

/** Finer groups of places. Optional in trip data; worked out from the scene and best time when missing. */
export type PlaceSet =
  | 'ancient' | 'art' | 'church' | 'underground' | 'views' | 'sight-other'
  | 'pasta' | 'street' | 'sweet' | 'food-other'
  | 'morning' | 'golden' | 'anytime'

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
  /** Fingerprint of the seed this copy came from (to spot newer versions pushed to GitHub). */
  seedVersion?: string
  /** You changed the plan in the app (so a newer seed is offered, not applied silently). */
  edited?: boolean
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
  /** Logged here before costs had their own page. Read as a "Logged earlier" cost (costEntries); never written any more. */
  spent?: number
  photos?: string[]
  updatedAt: string
}

export interface DayNote {
  rating?: number
  note?: string
  /** Money spent that day outside any stop (water, souvenirs, tickets…), from before costs had their own page.
   *  Read as a "Logged earlier" cost (costEntries); never written any more. */
  extraSpent?: number
  updatedAt?: string
}

/** What a cost was for. The first four line up with Trip.budget values [sights, food, night, transport]. */
export type CostCat = 'food' | 'sights' | 'night' | 'transport' | 'stay' | 'other'

/** One thing you paid for. Kept by id; never removed, only marked deleted. */
export interface Expense {
  id: string
  /** More than 0, at most 99,999.99, rounded to cents, in `currency`. */
  amount: number
  /** The currency it was paid in (the trip's currency in this version). */
  currency: string
  cat: CostCat
  /** The trip day it counts towards. Missing: before or after the trip. */
  dayId?: string
  /**
   * With no dayId: whether it counts before or after the trip, as picked on the pad. Missing (older records):
   * from when it was logged, after the trip's end or not.
   */
  when?: 'before' | 'after'
  note?: string
  stopId?: string
  placeId?: string
  bookingId?: string
  /** Title of the linked stop or booking when it was logged, so it still reads well if that goes away. */
  title?: string
  /** Logged while previewing another moment of the trip. */
  preview?: true
  /** When it was logged (ISO, real clock). */
  at: string
  /** Last change (ISO). The newer copy wins when two devices merge. */
  updatedAt: string
  /** Deleted. Kept so a merge with an older copy can't bring it back. */
  deleted?: true
}

/** A place you stamped yourself, or took a stamp back from. */
export interface PlaceStamp {
  /** true: stamped by hand. false: taken back (also hides a stamp a done stop would give).
   *  null: no choice any more (a stamp you undid at once); a done stop can still stamp it. */
  on: boolean | null
  at: string
  updatedAt: string
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
  /** Costs by id, tombstones included (older saves lack it). Feedback.spent and DayNote.extraSpent are read, never written. */
  expenses?: Record<string, Expense>
  /** Stamps you gave or took back by hand, by place id (older saves lack it). Stamps from done stops are derived. */
  stamps?: Record<string, PlaceStamp>
}
