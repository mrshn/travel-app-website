<script setup lang="ts">
import L from 'leaflet'
import type { MetroLine } from '#shared/types/trip'
import type { GeoFix } from '~/composables/useGeo'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  title: string
  kind?: string
  /** Stop state, or 'place' for a saved place that isn't in the plan. */
  state?: string
  /** Short text inside the pin (a number); otherwise an icon. */
  label?: string
  icon?: string
}

export interface MapLine {
  points: [number, number][]
  /** CSS colour or a CSS variable name like --accent. */
  color?: string
  dashed?: boolean
  weight?: number
  opacity?: number
}

const props = withDefaults(defineProps<{
  markers?: MapMarker[]
  lines?: MapLine[]
  metro?: MetroLine[]
  home?: { lat: number, lng: number, label?: string } | null
  you?: GeoFix | null
  heading?: number | null
  selected?: string | null
  /** Change this to fit the map to the markers again. */
  fitKey?: string | number
  pick?: boolean
  zoomControl?: boolean
  /** Keep the view on you as you move. */
  follow?: boolean
  label?: string
  /** Extra room around fitted markers for overlays: [top, right, bottom, left] px. */
  fitPad?: [number, number, number, number]
}>(), { markers: () => [], lines: () => [], metro: () => [], zoomControl: true, follow: false, label: 'Map' })

const emit = defineEmits<{
  'select': [id: string]
  'pick': [p: { lat: number, lng: number }]
  'update:follow': [v: boolean]
  'ready': [map: L.Map]
}>()

const el = ref<HTMLElement | null>(null)
const { dark } = useTheme()
let map: L.Map | null = null
let tiles: L.TileLayer | null = null
let metroLayer: L.LayerGroup | null = null
let lineLayer: L.LayerGroup | null = null
let markerLayer: L.LayerGroup | null = null
let youLayer: L.LayerGroup | null = null
let youMarker: L.Marker | null = null
let youCircle: L.Circle | null = null
let ro: ResizeObserver | null = null
let programmatic = false

const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
const tileUrl = () => `https://{s}.basemaps.cartocdn.com/${dark.value ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png`

function cssColor(c: string | undefined, fallback = '--accent'): string {
  const v = c ?? fallback
  if (!v.startsWith('--')) return v
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#8A1538'
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!)
}

function pinIcon(m: MapMarker): L.DivIcon {
  const isPlace = m.state === 'place'
  const size = isPlace ? 24 : 30
  const inner = m.label
    ? esc(m.label)
    : `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${iconSvg(m.state === 'done' ? 'check' : m.icon)}</svg>`
  const cls = ['mk', m.kind ? `k-${m.kind}` : '', m.state ? `s-${m.state}` : '', isPlace ? 'place' : '', props.selected === m.id ? 'sel' : ''].join(' ')
  return L.divIcon({
    className: 'mk-wrap',
    html: `<div class="${cls}"><span>${inner}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2 + size * 0.707],
  })
}

function drawMarkers() {
  if (!map || !markerLayer) return
  markerLayer.clearLayers()
  for (const m of props.markers) {
    const z = props.selected === m.id ? 1000 : m.state === 'now' || m.state === 'next' ? 500 : m.state === 'place' ? -200 : 0
    const mk = L.marker([m.lat, m.lng], { icon: pinIcon(m), title: m.title, alt: m.title, keyboard: true, riseOnHover: true, zIndexOffset: z })
    mk.on('click', () => emit('select', m.id))
    mk.addTo(markerLayer)
  }
  if (props.home) {
    L.marker([props.home.lat, props.home.lng], {
      icon: L.divIcon({ className: 'mk-wrap', html: `<div class="mk-home" title="${esc(props.home.label ?? 'Home')}"><svg class="i" viewBox="0 0 24 24">${iconSvg('bed')}</svg></div>`, iconSize: [30, 30], iconAnchor: [15, 15] }),
      title: props.home.label ?? 'Home',
      zIndexOffset: -100,
    }).addTo(markerLayer)
  }
}

function drawLines() {
  if (!map || !lineLayer) return
  lineLayer.clearLayers()
  for (const ln of props.lines) {
    if (ln.points.length < 2) continue
    L.polyline(ln.points, {
      color: cssColor(ln.color, '--map-route'),
      weight: ln.weight ?? 4,
      opacity: ln.opacity ?? 0.85,
      dashArray: ln.dashed ? '2 8' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(lineLayer)
  }
}

function drawMetro() {
  if (!map || !metroLayer) return
  metroLayer.clearLayers()
  for (const line of props.metro) {
    const pts = line.stations.map(s => [s.lat, s.lng] as [number, number])
    L.polyline(pts, { color: line.color, weight: 5, opacity: 0.55, interactive: false }).addTo(metroLayer)
    for (const s of line.stations) {
      if (!s.name) continue
      L.circleMarker([s.lat, s.lng], { radius: 3.5, color: line.color, weight: 2, fillColor: '#fff', fillOpacity: 1 })
        .bindTooltip(`${line.id} · ${s.name}`, { direction: 'top', offset: [0, -4] })
        .addTo(metroLayer)
    }
  }
}

function drawYou() {
  if (!map || !youLayer) return
  const f = props.you
  if (!f) {
    youLayer.clearLayers()
    youMarker = null
    youCircle = null
    return
  }
  const h = props.heading
  const html = `<div class="you-dot">${h === null || h === undefined ? '' : `<b style="transform:rotate(${Math.round(h)}deg)"></b>`}<i></i></div>`
  const icon = L.divIcon({ className: 'mk-wrap', html, iconSize: [22, 22], iconAnchor: [11, 11] })
  if (!youMarker) {
    youCircle = L.circle([f.lat, f.lng], { radius: f.accuracy, color: cssColor('--you'), weight: 1, opacity: 0.4, fillOpacity: 0.1, interactive: false }).addTo(youLayer)
    youMarker = L.marker([f.lat, f.lng], { icon, title: 'You', zIndexOffset: 2000, keyboard: false }).addTo(youLayer)
  }
  else {
    youMarker.setLatLng([f.lat, f.lng])
    youMarker.setIcon(icon)
    youCircle?.setLatLng([f.lat, f.lng]).setRadius(f.accuracy)
  }
}

function fit() {
  if (!map) return
  const pts: [number, number][] = props.markers.filter(m => m.state !== 'place').map(m => [m.lat, m.lng])
  const all = pts.length ? pts : props.markers.map(m => [m.lat, m.lng] as [number, number])
  if (props.home && all.length < 2) all.push([props.home.lat, props.home.lng])
  if (!all.length) {
    if (props.you) map.setView([props.you.lat, props.you.lng], 15)
    else if (props.home) map.setView([props.home.lat, props.home.lng], 14)
    else map.setView([41.8986, 12.4769], 13)
    return
  }
  programmatic = true
  if (all.length === 1) map.setView(all[0]!, 16)
  else {
    const [t, r, b, l] = props.fitPad ?? [0, 0, 0, 0]
    map.fitBounds(L.latLngBounds(all), { paddingTopLeft: [36 + l, 36 + t], paddingBottomRight: [36 + r, 36 + b], maxZoom: 16 })
  }
  setTimeout(() => (programmatic = false), 400)
}

function centerOnYou() {
  if (!map || !props.you) return
  programmatic = true
  map.setView([props.you.lat, props.you.lng], Math.max(map.getZoom(), 16), { animate: true })
  setTimeout(() => (programmatic = false), 500)
}

onMounted(() => {
  if (!el.value) return
  map = L.map(el.value, { zoomControl: false, attributionControl: true, tapHold: false } as L.MapOptions)
  map.attributionControl.setPrefix(false)
  if (props.zoomControl) L.control.zoom({ position: 'bottomright' }).addTo(map)
  tiles = L.tileLayer(tileUrl(), { attribution: ATTR, subdomains: 'abcd', maxZoom: 20, detectRetina: false }).addTo(map)
  metroLayer = L.layerGroup().addTo(map)
  lineLayer = L.layerGroup().addTo(map)
  markerLayer = L.layerGroup().addTo(map)
  youLayer = L.layerGroup().addTo(map)
  drawMetro()
  drawLines()
  drawMarkers()
  drawYou()
  fit()
  if (props.follow) centerOnYou()
  map.on('dragstart', () => {
    if (!programmatic && props.follow) emit('update:follow', false)
  })
  map.on('click', (e: L.LeafletMouseEvent) => {
    if (props.pick) emit('pick', { lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) })
  })
  ro = new ResizeObserver(() => map?.invalidateSize())
  ro.observe(el.value)
  emit('ready', map)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  map?.remove()
  map = null
})

// Redraw only when something on the map actually changed (the clock ticks often).
watch(() => JSON.stringify([props.markers, props.selected, props.home]), drawMarkers)
watch(() => JSON.stringify(props.lines), drawLines)
watch(() => JSON.stringify(props.metro), drawMetro)
watch(() => [props.you?.lat, props.you?.lng, props.you?.accuracy, props.heading], () => {
  drawYou()
  if (props.follow) centerOnYou()
})
watch(() => props.follow, (v) => {
  if (v) centerOnYou()
})
watch(() => props.fitKey, () => nextTick(fit))
watch(dark, () => {
  tiles?.setUrl(tileUrl())
  drawLines()
  if (youCircle) youCircle.setStyle({ color: cssColor('--you') })
})

defineExpose({
  fit,
  centerOnYou,
  flyTo: (lat: number, lng: number, zoom = 17) => map?.flyTo([lat, lng], zoom, { duration: 0.6 }),
  invalidate: () => map?.invalidateSize(),
})
</script>

<template>
  <div ref="el" class="mapview" :class="{ picking: pick }" role="region" :aria-label="label" />
</template>

<style scoped>
.mapview { width: 100%; height: 100%; min-height: 200px; z-index: 0; }
.mapview.picking { cursor: crosshair; }
</style>

<style>
.mk-wrap { background: none; border: 0; }
.mapview.picking .leaflet-grab { cursor: crosshair; }
</style>
