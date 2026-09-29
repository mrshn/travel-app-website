import type { MetroLine, Trip, Via } from '#shared/types/trip'
import type { ResolvedStop, StopState } from '#shared/utils/plan'
import type { MapLine, MapMarker } from '~/components/MapView.vue'

type Pt = { lat: number, lng: number }

/** Pins for the stops of a day: numbered in order, checks for done ones. */
export function stopMarkers(stops: ResolvedStop[], states: Record<string, StopState>): MapMarker[] {
  let n = 0
  const out: MapMarker[] = []
  for (const s of stops) {
    if (!s.place) continue
    const num = s.minor ? undefined : String(++n)
    const st = states[s.id]
    out.push({
      id: s.id,
      lat: s.place.lat,
      lng: s.place.lng,
      title: s.title,
      kind: s.kind,
      state: st,
      label: st === 'done' ? undefined : num,
      icon: stopIcon(s),
    })
  }
  return out
}

function metroPath(lines: MetroLine[] | undefined, via: Via | undefined): { color: string, pts: [number, number][], from?: Pt, to?: Pt } | null {
  if (!via || typeof via !== 'object' || !lines) return null
  const line = lines.find(l => l.id === via.line)
  if (!line) return null
  const idx = (name: string) => line.stations.findIndex(s => s.name === name)
  const a = idx(via.from)
  const b = idx(via.to)
  if (a < 0 || b < 0) return { color: line.color, pts: [] }
  const seg = a <= b ? line.stations.slice(a, b + 1) : line.stations.slice(b, a + 1).reverse()
  return { color: line.color, pts: seg.map(s => [s.lat, s.lng]), from: line.stations[a], to: line.stations[b] }
}

/** Lines between consecutive stops: dashed for walks, coloured for metro rides. */
export function routeLines(stops: ResolvedStop[], trip: Trip, states?: Record<string, StopState>): MapLine[] {
  const out: MapLine[] = []
  // The day starts from where you sleep.
  let prev: Pt | null = trip.home ?? null
  for (const s of stops) {
    if (!s.place) continue
    const faded = states && (states[s.id] === 'done' || states[s.id] === 'skipped' || states[s.id] === 'missed')
    const opacity = faded ? 0.35 : 0.9
    const metro = metroPath(trip.overlay?.lines, s.via)
    if (metro && metro.pts.length > 1) {
      if (prev && metro.from) out.push({ points: [[prev.lat, prev.lng], [metro.from.lat, metro.from.lng]], color: '--map-route', dashed: true, opacity })
      out.push({ points: metro.pts, color: metro.color, weight: 6, opacity })
      if (metro.to) out.push({ points: [[metro.to.lat, metro.to.lng], [s.place.lat, s.place.lng]], color: '--map-route', dashed: true, opacity })
    }
    else if (prev) {
      const ride = s.via === 'ride' || (!!s.via && typeof s.via === 'object')
      out.push({ points: [[prev.lat, prev.lng], [s.place.lat, s.place.lng]], color: ride ? '--c-move' : '--map-route', dashed: !ride, weight: ride ? 5 : 4, opacity })
    }
    prev = s.place
  }
  return out
}

/** Saved places (sights, food, photo spots) as small pins. */
export function placeMarkers(trip: Trip, skip: Set<string> = new Set()): MapMarker[] {
  return (trip.places ?? [])
    .filter(p => p.place && !skip.has(p.id))
    .map(p => ({
      id: `place:${p.id}`,
      lat: p.place!.lat,
      lng: p.place!.lng,
      title: p.name,
      kind: p.category === 'photo' ? 'night' : p.category,
      state: 'place',
      icon: p.category === 'photo' ? 'camera' : p.category === 'food' ? 'food' : 'landmark',
    }))
}
