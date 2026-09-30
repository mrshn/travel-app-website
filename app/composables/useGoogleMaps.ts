import { createGlobalState, useDocumentVisibility, useOnline, useStorage } from '@vueuse/core'
import { decodePolyline, MAX_WALK_MIN, walkMinutes, type LatLng, type TravelEstimate } from '#shared/utils/geo'
import type { TravelLookup } from '#shared/utils/guide'
import { fmtClock, zonedToDate } from '#shared/utils/time'

/**
 * Google Maps Platform, called straight from the browser with a key that only works from this app's
 * addresses: Map Tiles API (the base map) and Routes API (real walking and transit times).
 * Nothing Google sends is stored beyond the browser's normal HTTP cache (their terms); offline the
 * map falls back to the cached OpenStreetMap tiles and the guide to its own estimates.
 */

type Theme = 'light' | 'dark'
interface Session { token: string, expiry: number, style: string }
interface RouteAnswer {
  mode: 'walk' | 'transit'
  seconds: number
  /** Epoch ms to set off, for a ride at a set time. */
  leaveAt?: number
  ride?: { line: string, at: number, from: string }
  points?: [number, number][]
}

const TILES = 'https://tile.googleapis.com'
const ROUTES = 'https://routes.googleapis.com/directions/v2:computeRoutes'
/** Well under the daily cap set on the key's project. */
const ROUTES_PER_DAY = 250
const MIN_GAP_MS = 12_000
const STYLE_VERSION = 2

/** A dark base map that matches the app's night theme. */
const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1c2024' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ba2a8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#121517' }] },
  { elementType: 'labels.icon', stylers: [{ lightness: -35 }, { saturation: -40 }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a4046' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#20252a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#22282d' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8c949b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1c2b22' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6f9a7c' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3338' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#191d20' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#a7adb2' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#40474d' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a3035' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#b8bec3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a23' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5a6c7a' }] },
]

const seconds = (d?: string) => (d ? Number.parseInt(d, 10) || 0 : 0)

export const useGoogleMaps = createGlobalState(() => {
  const key = String(useAppConfig().mapsKey ?? '')
  const online = useOnline()
  const visible = useDocumentVisibility()
  /** The base map you picked. */
  const provider = useStorage<'google' | 'osm'>('travel:map:provider', 'google')
  /** null: not tried yet; false: Google said no (key or billing not set up). */
  const tilesWork = ref<boolean | null>(null)
  const routesWork = ref<boolean | null>(null)
  const sessions = useStorage<Record<string, Session>>('travel:gmaps:sessions:v1', {})
  const usage = useStorage('travel:gmaps:usage:v1', { day: '', routes: 0 })

  const useGoogleTiles = computed(() => !!key && provider.value === 'google' && tilesWork.value !== false)

  // ---------- map tiles ----------
  const pending: Partial<Record<string, Promise<string | null>>> = {}
  const hd = () => typeof devicePixelRatio === 'number' && devicePixelRatio >= 1.5
  const region = () => (typeof navigator !== 'undefined' && /-([A-Z]{2})$/i.exec(navigator.language)?.[1]?.toUpperCase()) || 'US'

  /** A session token for tiles in this theme (valid two weeks; shared by every map in the app). */
  function session(theme: Theme): Promise<string | null> {
    if (!key) return Promise.resolve(null)
    const style = `${theme}.${hd() ? 'hd' : 'sd'}.${STYLE_VERSION}`
    const s = sessions.value[theme]
    if (s && s.style === style && s.expiry * 1000 - Date.now() > 86_400_000) return Promise.resolve(s.token)
    return (pending[style] ??= (async () => {
      try {
        const body: Record<string, unknown> = { mapType: 'roadmap', language: 'en', region: region() }
        if (hd()) Object.assign(body, { scale: 'scaleFactor2x', highDpi: true })
        if (theme === 'dark') body.styles = DARK_STYLE
        const res = await fetch(`${TILES}/v1/createSession?key=${encodeURIComponent(key)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) tilesWork.value = false
          return null
        }
        const j = await res.json() as { session: string, expiry: string | number }
        sessions.value = { ...sessions.value, [theme]: { token: j.session, expiry: Number(j.expiry), style } }
        tilesWork.value = true
        return j.session
      }
      catch {
        return null
      }
      finally {
        delete pending[style]
      }
    })())
  }

  const tileUrl = (token: string) => `${TILES}/v1/2dtiles/{z}/{x}/{y}?session=${token}&key=${encodeURIComponent(key)}`

  /** The copyright line Google asks to show for what's on screen. */
  async function copyright(theme: Theme, b: { north: number, south: number, east: number, west: number }, zoom: number): Promise<string | null> {
    const token = await session(theme)
    if (!token) return null
    const q = new URLSearchParams({ session: token, key, zoom: String(Math.round(zoom)), north: b.north.toFixed(5), south: b.south.toFixed(5), east: b.east.toFixed(5), west: b.west.toFixed(5) })
    try {
      const res = await fetch(`${TILES}/tile/v1/viewport?${q.toString()}`)
      if (!res.ok) return null
      return ((await res.json()) as { copyright?: string }).copyright ?? null
    }
    catch {
      return null
    }
  }

  /** Tiles stopped loading (session expired, key changed): start over with a new session next time. */
  function resetTiles() {
    sessions.value = {}
  }

  // ---------- routes ----------
  const answers = new Map<string, { at: number, value: RouteAnswer | null }>()
  const inflight = new Set<string>()
  const version = ref(0)
  let lastAsk = 0

  function allowance(): boolean {
    const today = new Date().toISOString().slice(0, 10)
    if (usage.value.day !== today) usage.value = { day: today, routes: 0 }
    return usage.value.routes < ROUTES_PER_DAY
  }

  async function ask(k: string, mode: 'WALK' | 'TRANSIT', from: LatLng, to: LatLng, arriveAt: Date | null) {
    inflight.add(k)
    lastAsk = Date.now()
    usage.value = { ...usage.value, routes: usage.value.routes + 1 }
    const body: Record<string, unknown> = {
      origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
      destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
      travelMode: mode,
      languageCode: 'en',
      units: 'METRIC',
    }
    if (mode === 'TRANSIT' && arriveAt && arriveAt.getTime() > Date.now() + 5 * 60_000) body.arrivalTime = arriveAt.toISOString()
    try {
      const res = await fetch(ROUTES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': 'routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails.stopDetails,routes.legs.steps.transitDetails.transitLine',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        if (res.status === 403 || res.status === 400) routesWork.value = false
        return
      }
      routesWork.value = true
      type Step = { travelMode?: string, staticDuration?: string, transitDetails?: { stopDetails?: { departureTime?: string, departureStop?: { name?: string } }, transitLine?: { nameShort?: string, name?: string, vehicle?: { name?: { text?: string } } } } }
      const j = await res.json() as { routes?: { duration?: string, polyline?: { encodedPolyline?: string }, legs?: { steps?: Step[] }[] }[] }
      const r = j.routes?.[0]
      if (!r) {
        answers.set(k, { at: Date.now(), value: null }) // no route (e.g. no transit at night)
        return
      }
      const steps = (r.legs ?? []).flatMap(l => l.steps ?? [])
      const answer: RouteAnswer = { mode: 'walk', seconds: seconds(r.duration) }
      if (r.polyline?.encodedPolyline) answer.points = decodePolyline(r.polyline.encodedPolyline)
      const i = steps.findIndex(s => s.travelMode === 'TRANSIT')
      const t = i >= 0 ? steps[i]!.transitDetails : undefined
      if (t) {
        answer.mode = 'transit'
        const dep = Date.parse(t.stopDetails?.departureTime ?? '')
        if (Number.isFinite(dep)) {
          const walkFirst = steps.slice(0, i).reduce((a, s) => a + seconds(s.staticDuration), 0)
          answer.leaveAt = dep - walkFirst * 1000
          const line = [t.transitLine?.vehicle?.name?.text, t.transitLine?.nameShort || t.transitLine?.name].filter(Boolean).join(' ')
          answer.ride = { line, at: dep, from: t.stopDetails?.departureStop?.name ?? '' }
        }
      }
      answers.set(k, { at: Date.now(), value: answer })
    }
    catch {
      // offline or blocked: the estimate stands
    }
    finally {
      inflight.delete(k)
      version.value++
    }
  }

  /**
   * Google's time for a trip from → to, arriving by `arriveAt`, as a TravelEstimate on the trip's clock
   * (`toTripMinutes` turns a time into minutes on the trip day). Returns what it knows now (or null)
   * and asks Google in the background; the answer arrives reactively.
   */
  function travel(from: LatLng, to: LatLng, meters: number, arriveAt: Date | null, toTripMinutes: (t: number) => number): TravelEstimate | null {
    void version.value
    if (!key || routesWork.value === false) return null
    const mode = walkMinutes(meters) <= MAX_WALK_MIN ? 'WALK' : 'TRANSIT'
    const slot = mode === 'TRANSIT' && arriveAt ? Math.round(arriveAt.getTime() / 300_000) : ''
    const k = `${mode}|${from.lat.toFixed(3)},${from.lng.toFixed(3)}|${to.lat.toFixed(4)},${to.lng.toFixed(4)}|${slot}`
    const hit = answers.get(k)
    const fresh = hit && Date.now() - hit.at < (mode === 'WALK' ? 30 : 10) * 60_000
    if (!fresh && !inflight.has(k) && online.value && visible.value === 'visible' && Date.now() - lastAsk > MIN_GAP_MS && allowance()) {
      void ask(k, mode, from, to, arriveAt)
    }
    const a = hit?.value
    if (!a) return null
    const est: TravelEstimate = { mode: a.mode, minutes: Math.max(1, Math.round(a.seconds / 60)), source: 'google' }
    if (a.leaveAt) est.leaveBy = Math.floor(toTripMinutes(a.leaveAt))
    if (a.ride) est.ride = `${a.ride.line} ${fmtClock(Math.round(toTripMinutes(a.ride.at)))}${a.ride.from ? ` from ${a.ride.from}` : ''}`.trim()
    if (a.points) est.points = a.points
    return est
  }

  /** Real travel times for one trip day, for the live guide. */
  function lookupFor(timezone: string, date: string): TravelLookup {
    const start = zonedToDate(date, 0, timezone).getTime()
    return (from, to, meters, arriveBy) => travel(from, to, meters, zonedToDate(date, arriveBy, timezone), t => (t - start) / 60_000)
  }

  return { key, provider, tilesWork, routesWork, useGoogleTiles, session, tileUrl, copyright, resetTiles, travel, lookupFor }
})
