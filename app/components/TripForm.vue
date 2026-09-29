<script setup lang="ts">
import type { Scene, Tod, Trip } from '#shared/types/trip'
import { parseLatLng } from '#shared/utils/geo'
import { addDays, deviceTimeZone, diffDays } from '#shared/utils/time'

export interface TripFormValue {
  title: string
  destination: string
  country: string
  subtitle: string
  start: string
  end: string
  timezone: string
  currency: string
  homeCurrency: string
  rate: number | null
  cover: Scene
  home: { label: string, address: string, lat: number | null, lng: number | null }
}

const props = defineProps<{ trip?: Trip, submitLabel: string }>()
const emit = defineEmits<{ submit: [v: TripFormValue] }>()

function initial(): TripFormValue {
  const t = props.trip
  const today = new Date().toISOString().slice(0, 10)
  return {
    title: t?.title ?? '',
    destination: t?.destination ?? '',
    country: t?.country ?? '',
    subtitle: t?.subtitle ?? '',
    start: t?.start ?? addDays(today, 14),
    end: t?.end ?? addDays(today, 17),
    timezone: t?.timezone ?? deviceTimeZone(),
    currency: t?.currency ?? 'EUR',
    homeCurrency: t?.fx?.homeCurrency ?? '',
    rate: t?.fx?.rate ?? null,
    cover: t?.cover ? { ...t.cover } : { scene: 'plane', tod: 'golden' },
    home: { label: t?.home?.label ?? '', address: t?.home?.address ?? '', lat: t?.home?.lat ?? null, lng: t?.home?.lng ?? null },
  }
}
const f = reactive<TripFormValue>(initial())
watch(() => props.trip?.id, () => Object.assign(f, initial()))

const zones = allTimeZones()
const geo = useGeo()
const paste = ref('')
const fitKey = ref(0)
const TODS: Tod[] = ['dawn', 'day', 'golden', 'sunset', 'blue', 'night']
const covers = ['plane', 'train', 'alley', 'lake', 'market', 'perspective', 'steps', 'monti', 'skyline', 'colosseum', 'trevi', 'pantheon', 'navona', 'stpeters', 'forum', 'tempietto']
const nights = computed(() => Math.max(0, diffDays(f.start, f.end)))
const valid = computed(() => (f.title.trim() || f.destination.trim()) && f.start && f.end && f.end >= f.start && nights.value < 60)

watch(() => f.start, (s) => {
  if (f.end < s) f.end = s
})

const homeMarkers = computed(() => (f.home.lat !== null && f.home.lng !== null ? [{ id: 'home', lat: f.home.lat, lng: f.home.lng, title: f.home.label || 'Home', state: 'next', icon: 'bed', kind: 'rest' }] : []))
function pick(p: { lat: number, lng: number }) {
  f.home.lat = p.lat
  f.home.lng = p.lng
}
function applyPaste() {
  const p = parseLatLng(paste.value)
  if (!p) {
    toast('No coordinates found in that text', { tone: 'warn' })
    return
  }
  pick(p)
  paste.value = ''
  fitKey.value++
}
function mine() {
  if (geo.fix.value) {
    pick({ lat: +geo.fix.value.lat.toFixed(6), lng: +geo.fix.value.lng.toFixed(6) })
    fitKey.value++
  }
  else {
    geo.start()
    toast('Finding you… tap again in a moment')
  }
}

function submit() {
  if (!valid.value) return
  emit('submit', JSON.parse(JSON.stringify(f)) as TripFormValue)
}
</script>

<template>
  <form class="tform" @submit.prevent="submit">
    <section class="card pad stack">
      <h2 class="h3">
        Where and when
      </h2>
      <div class="form-grid">
        <label class="field">
          <span>Destination</span>
          <input v-model="f.destination" class="input" placeholder="e.g. Lisbon" required>
        </label>
        <label class="field">
          <span>Country <span class="hint">(optional)</span></span>
          <input v-model="f.country" class="input" placeholder="e.g. Portugal">
        </label>
        <label class="field full">
          <span>Trip name</span>
          <input v-model="f.title" class="input" :placeholder="f.destination || 'e.g. Lisbon'">
        </label>
        <label class="field">
          <span>First day</span>
          <input v-model="f.start" class="input num" type="date" required>
        </label>
        <label class="field">
          <span>Last day</span>
          <input v-model="f.end" class="input num" type="date" :min="f.start" required>
        </label>
        <p class="full small muted">
          {{ nights + 1 }} days · {{ nights }} nights
        </p>
        <label class="field">
          <span>Time zone there</span>
          <select v-model="f.timezone" class="select">
            <option v-for="z in zones" :key="z" :value="z">{{ z }}</option>
          </select>
        </label>
        <label class="field">
          <span>Money there</span>
          <select v-model="f.currency" class="select">
            <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label class="field">
          <span>Your home currency <span class="hint">(optional)</span></span>
          <select v-model="f.homeCurrency" class="select">
            <option value="">—</option>
            <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
        <label v-if="f.homeCurrency && f.homeCurrency !== f.currency" class="field">
          <span>1 {{ f.currency }} = ? {{ f.homeCurrency }}</span>
          <input v-model.number="f.rate" class="input num" type="number" step="0.0001" min="0" inputmode="decimal">
        </label>
        <label class="field full">
          <span>Note <span class="hint">(optional)</span></span>
          <input v-model="f.subtitle" class="input" placeholder="e.g. Solo · first time abroad">
        </label>
      </div>
    </section>

    <section class="card pad stack">
      <h2 class="h3">
        Where you're staying
      </h2>
      <p class="small muted">
        The guide works out your first walk of each day from here.
      </p>
      <div class="form-grid">
        <label class="field">
          <span>Name</span>
          <input v-model="f.home.label" class="input" placeholder="e.g. Hostel name">
        </label>
        <label class="field">
          <span>Address</span>
          <input v-model="f.home.address" class="input" placeholder="Street, number, city">
        </label>
      </div>
      <div class="mapbox">
        <ClientOnly>
          <MapView :markers="homeMarkers" :fit-key="fitKey" :you="geo.fix.value" pick label="Pick where you're staying" @pick="pick" />
        </ClientOnly>
        <span class="maphint small">Tap the map to set it</span>
      </div>
      <div class="row wrap">
        <input v-model="paste" class="input grow" placeholder="…or paste a Google Maps link / “lat, lng”" @keydown.enter.prevent="applyPaste">
        <button class="btn" type="button" :disabled="!paste" @click="applyPaste">
          Use
        </button>
        <button class="btn plain" type="button" @click="mine">
          <AppIcon name="locate" size="sm" />Here
        </button>
      </div>
    </section>

    <section class="card pad stack">
      <h2 class="h3">
        Cover picture
      </h2>
      <div class="covers">
        <button
          v-for="c in covers"
          :key="c"
          type="button"
          class="cv art-frame"
          :aria-pressed="f.cover.scene === c"
          :aria-label="c"
          @click="f.cover.scene = c"
        >
          <SceneArt class="scene" :scene="c" :tod="f.cover.tod" />
        </button>
      </div>
      <div class="seg" role="group" aria-label="Light">
        <button v-for="t in TODS" :key="t" type="button" :aria-pressed="f.cover.tod === t" @click="f.cover.tod = t">
          {{ t }}
        </button>
      </div>
    </section>

    <div class="row end">
      <slot name="extra" />
      <span class="grow" />
      <button class="btn primary lg" type="submit" :disabled="!valid">
        <AppIcon name="check" />{{ submitLabel }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.tform { display: flex; flex-direction: column; gap: 14px; }
.mapbox { position: relative; height: 220px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); }
.maphint { position: absolute; left: 10px; top: 10px; z-index: 500; padding: 4px 10px; border-radius: 999px; background: var(--surface); box-shadow: var(--shadow); pointer-events: none; font-weight: 600; }
.covers { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
.cv { height: 64px; border-radius: 12px; border: 0; padding: 0; outline: 1px solid var(--line); }
.cv[aria-pressed="true"] { outline: 3px solid var(--accent); outline-offset: 1px; }
.seg button { text-transform: capitalize; }
.end { margin-top: 4px; }
</style>
