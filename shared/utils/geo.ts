/** Distances, walking estimates and map links. */

export interface LatLng {
  lat: number
  lng: number
}

const R = 6_371_000

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** 4.8 km/h. */
export const WALK_M_PER_MIN = 80
/** Streets are not straight lines. */
export const DETOUR = 1.3
/** Longer than this on foot, and we suggest transit instead. */
export const MAX_WALK_MIN = 35

export function walkMinutes(meters: number): number {
  return Math.max(1, Math.round((meters * DETOUR) / WALK_M_PER_MIN))
}

export interface TravelEstimate {
  mode: 'walk' | 'transit'
  /** Door to door. */
  minutes: number
  /** 'google' when it comes from Google's live routes, otherwise a straight-line estimate. */
  source?: 'google'
  /** When to set off (minutes on the trip day's clock), for a transit ride that leaves at a set time. */
  leaveBy?: number
  /** The first ride, e.g. "Metro A 10:04 from Termini". */
  ride?: string
  /** The path to draw, as [lat, lng]. */
  points?: [number, number][]
}

export function travelEstimate(meters: number): TravelEstimate {
  const walk = walkMinutes(meters)
  if (walk <= MAX_WALK_MIN) return { mode: 'walk', minutes: walk }
  // Walk to a stop, wait, ride at ~20 km/h door to door, walk out.
  return { mode: 'transit', minutes: Math.round(12 + ((meters * DETOUR) / 1000 / 20) * 60) }
}

export function fmtDistance(meters: number): string {
  if (meters < 950) return `${Math.max(10, Math.round(meters / 10) * 10)} m`
  const km = meters / 1000
  return `${km < 9.95 ? km.toFixed(1) : Math.round(km)} km`
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearing(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
export function compass(deg: number): string {
  return POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!
}

export type TravelMode = 'walking' | 'transit' | 'driving'

/** Google Maps directions (opens the app on phones). */
export function directionsUrl(to: LatLng, mode: TravelMode = 'walking', from?: LatLng | null): string {
  const q = new URLSearchParams({ api: '1', destination: `${to.lat},${to.lng}`, travelmode: mode })
  if (from) q.set('origin', `${from.lat},${from.lng}`)
  return `https://www.google.com/maps/dir/?${q.toString()}`
}

export function searchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function photosUrl(query: string): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`
}

/** Reads "41.9, 12.49", a Google Maps link with @lat,lng or ?q=lat,lng. */
export function parseLatLng(text: string): LatLng | null {
  const s = text.trim()
  const pats = [
    /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /[?&](?:q|query|ll|destination)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i,
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
    /^(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/,
  ]
  for (const p of pats) {
    const m = p.exec(s)
    if (m) {
      const lat = Number(m[1])
      const lng = Number(m[2])
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
    }
  }
  return null
}

/** Decodes a Google encoded polyline (precision 5) into [lat, lng] pairs. */
export function decodePolyline(str: string): [number, number][] {
  const out: [number, number][] = []
  let i = 0
  let lat = 0
  let lng = 0
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0
      let result = 0
      let b: number
      do {
        b = str.charCodeAt(i++) - 63
        result |= (b & 0x1F) << shift
        shift += 5
      } while (b >= 0x20 && i < str.length)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (axis === 0) lat += delta
      else lng += delta
    }
    out.push([lat / 1e5, lng / 1e5])
  }
  return out
}
