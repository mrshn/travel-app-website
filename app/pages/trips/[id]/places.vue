<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import type { PlaceCard } from '#shared/types/trip'
import { directionsUrl, fmtDistance, haversine, photosUrl, searchUrl } from '#shared/utils/geo'

const v = useTripView()
const route = useRoute()
const router = useRouter()
const geo = useGeo()
const trip = v.trip

type Cat = 'all' | 'sight' | 'food' | 'photo'
const cat = useStorage<Cat>('travel:places:cat', 'all')
const q = ref('')
const topOnly = ref(false)
const openDay = ref<string>('')
const sortNear = ref(false)

const VERDICT: Record<string, { label: string, tone: string }> = {
  worth: { label: 'Worth it', tone: 't-ok' },
  split: { label: 'Mixed reviews', tone: 't-gold' },
  over: { label: 'Overrated', tone: 't-warn' },
  trap: { label: 'Tourist trap', tone: 't-bad' },
  closed: { label: 'Closed', tone: 't-closed' },
}

const openDays = computed(() => {
  const t = trip.value
  if (!t) return []
  const ids = t.openDays ?? t.days.map(d => d.id)
  return ids.map(id => t.days.find(d => d.id === id)).filter(Boolean).map(d => d!)
})

// Which places are already in the plan (by name or within ~70 m).
const planned = computed(() => {
  const set = new Set<string>()
  const t = trip.value
  if (!t) return set
  const stops = t.days.flatMap(d => [...d.stops, ...Object.values(d.variants ?? {}).flatMap(x => x.stops)])
  for (const p of t.places ?? []) {
    const name = p.name.toLowerCase()
    const hit = stops.some(s => s.title.toLowerCase().includes(name) || (s.place && p.place && haversine(s.place, p.place) < 70))
    if (hit) set.add(p.id)
  }
  return set
})

function openState(p: PlaceCard): { s: string, note?: string } | null {
  if (!openDay.value || !p.open) return null
  const i = openDays.value.findIndex(d => d.id === openDay.value)
  if (i < 0) return null
  return { s: p.open[i] ?? 'n', note: p.openNotes?.[i] }
}

const list = computed(() => {
  const t = trip.value
  if (!t) return []
  const needle = q.value.trim().toLowerCase()
  let out = (t.places ?? []).filter(p =>
    (cat.value === 'all' || p.category === cat.value)
    && (!topOnly.value || p.top)
    && (!needle || `${p.name} ${p.area ?? ''} ${p.text}`.toLowerCase().includes(needle)),
  )
  const f = geo.fix.value
  if (sortNear.value && f) out = [...out].sort((a, b) => (a.place ? haversine(f, a.place) : 9e9) - (b.place ? haversine(f, b.place) : 9e9))
  return out
})
const counts = computed(() => {
  const ps = trip.value?.places ?? []
  return { all: ps.length, sight: ps.filter(p => p.category === 'sight').length, food: ps.filter(p => p.category === 'food').length, photo: ps.filter(p => p.category === 'photo').length }
})

function addToPlan(p: PlaceCard) {
  router.push({ query: { ...route.query, edit: 'new', from: `place:${p.id}`, day: openDay.value || v.today.value?.view.day.id || trip.value?.days[1]?.id } })
}
function near() {
  if (!geo.active.value) geo.start()
  sortNear.value = !sortNear.value
}
</script>

<template>
  <div v-if="trip" class="page places">
    <p class="kicker">
      Saved for this trip
    </p>
    <h1 class="h2">
      Places
    </h1>

    <div class="filters">
      <div class="seg" role="tablist" aria-label="Kind">
        <button type="button" :aria-pressed="cat === 'all'" @click="cat = 'all'">
          All <span class="num faint">{{ counts.all }}</span>
        </button>
        <button type="button" :aria-pressed="cat === 'sight'" @click="cat = 'sight'">
          <AppIcon name="landmark" size="sm" />Sights
        </button>
        <button type="button" :aria-pressed="cat === 'food'" @click="cat = 'food'">
          <AppIcon name="food" size="sm" />Food
        </button>
        <button type="button" :aria-pressed="cat === 'photo'" @click="cat = 'photo'">
          <AppIcon name="camera" size="sm" />Photo
        </button>
      </div>
      <label class="search">
        <AppIcon name="search" size="sm" />
        <input v-model="q" type="search" placeholder="Search places" aria-label="Search places">
      </label>
      <div class="row wrap chips">
        <button type="button" class="chip" :aria-pressed="topOnly" @click="topOnly = !topOnly">
          <AppIcon name="star" />Top picks
        </button>
        <button type="button" class="chip" :aria-pressed="sortNear" @click="near">
          <AppIcon name="locate" />Nearest first
        </button>
        <select v-if="openDays.length && trip.places?.some(p => p.open)" v-model="openDay" class="chip daysel" aria-label="Open on">
          <option value="">
            Open on…
          </option>
          <option v-for="d in openDays" :key="d.id" :value="d.id">
            Open {{ fmtDate(d.date, 'short') }}
          </option>
        </select>
      </div>
    </div>

    <p v-if="!list.length" class="card empty">
      Nothing matches.
    </p>

    <div class="grid">
      <article v-for="p in list" :key="p.id" class="card pc" :class="{ closed: openState(p)?.s === 'c' }">
        <div class="pic art-frame">
          <SceneArt class="scene" :scene="p.scene" :tod="p.tod ?? 'day'" :label="p.name" />
          <div class="badges">
            <span v-if="p.top" class="chip t-gold"><AppIcon name="star" />Top</span>
            <span v-if="p.verdict" class="chip" :class="VERDICT[p.verdict]?.tone">{{ VERDICT[p.verdict]?.label }}</span>
          </div>
          <span v-if="planned.has(p.id)" class="chip t-ok inplan"><AppIcon name="check" />In your plan</span>
        </div>
        <div class="body">
          <div class="row between top">
            <b class="name">{{ p.name }}</b>
            <span v-if="geo.fix.value && p.place" class="tiny faint num nowrap">{{ fmtDistance(haversine(geo.fix.value, p.place)) }}</span>
          </div>
          <span v-if="p.area || p.where" class="small muted">{{ p.area || p.where }}</span>
          <p class="small txt">
            {{ p.text }}
          </p>
          <div class="row wrap meta">
            <span v-if="p.price" class="chip num"><AppIcon name="euro" />{{ p.price }}</span>
            <span v-if="p.booking && p.booking !== 'No'" class="chip t-accent-soft"><AppIcon name="ticket" />Book: {{ p.booking }}</span>
            <span v-if="p.bestTime" class="chip"><AppIcon name="clock" />{{ p.bestTime }}</span>
            <span v-if="openState(p)" class="chip" :class="openState(p)!.s === 'o' ? 't-ok' : openState(p)!.s === 'c' ? 't-bad' : 't-plain'">
              {{ openState(p)!.s === 'o' ? 'Open' : openState(p)!.s === 'c' ? 'Closed' : 'n/a' }}<template v-if="openState(p)!.note && openState(p)!.s !== 'c'"> · {{ openState(p)!.note }}</template>
            </span>
          </div>
          <div v-if="p.open?.length && !openDay" class="days" :aria-label="`Open days for ${p.name}`">
            <span v-for="(o, i) in p.open" :key="i" class="dd" :class="`o-${o}`" :title="`${openDays[i] ? fmtDate(openDays[i]!.date, 'short') : ''}: ${o === 'o' ? 'open' : o === 'c' ? 'closed' : 'n/a'}${p.openNotes?.[i] ? ` (${p.openNotes[i]})` : ''}`">
              {{ openDays[i] ? fmtDate(openDays[i]!.date, 'weekday').slice(0, 2) : '' }}
            </span>
          </div>
          <div class="row acts">
            <a v-if="p.place" class="btn xs" :href="directionsUrl(p.place, 'walking', geo.fix.value)" target="_blank" rel="noopener"><AppIcon name="navigate" size="xs" />Go</a>
            <a v-else class="btn xs" :href="searchUrl(p.searchQuery ?? p.query ?? p.name)" target="_blank" rel="noopener"><AppIcon name="map" size="xs" />Maps</a>
            <a class="btn xs plain" :href="photosUrl(p.searchQuery ?? p.query ?? p.name)" target="_blank" rel="noopener"><AppIcon name="image" size="xs" />Photos</a>
            <a v-for="l in (p.links ?? []).slice(0, 1)" :key="l.url" class="btn xs plain" :href="l.url" target="_blank" rel="noopener"><AppIcon name="ext" size="xs" />Site</a>
            <span class="grow" />
            <button v-if="!planned.has(p.id)" class="btn xs ghost" type="button" @click="addToPlan(p)">
              <AppIcon name="plus" size="xs" />Plan
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.places { padding-top: 18px; }
.filters { display: flex; flex-direction: column; gap: 10px; margin: 14px 0 16px; }
.search { display: flex; align-items: center; gap: 8px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--fg-3); }
.search input { flex: 1; border: 0; background: none; min-height: 44px; font-size: 16px; color: var(--fg); outline: none; }
.search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.chips { gap: 6px; }
.chips .chip { min-height: 34px; background: var(--surface); border-color: var(--line); }
.daysel { appearance: none; -webkit-appearance: none; padding-right: 12px; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--fg-2); }
.grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
.pc { overflow: hidden; display: flex; flex-direction: column; }
.pc.closed { opacity: .55; }
.pic { height: 140px; }
.badges { position: absolute; left: 10px; top: 10px; display: flex; gap: 6px; flex-wrap: wrap; }
.inplan { position: absolute; right: 10px; bottom: 10px; }
.body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
.top { align-items: baseline; }
.name { font-size: 16.5px; line-height: 1.25; }
.txt { color: var(--fg-2); }
.meta { gap: 6px; }
.days { display: flex; gap: 4px; }
.dd { width: 30px; height: 22px; border-radius: 6px; display: grid; place-items: center; font-size: 11px; font-weight: 700; }
.dd.o-o { background: var(--ok-soft); color: var(--ok); }
.dd.o-c { background: var(--bad-soft); color: var(--bad); text-decoration: line-through; }
.dd.o-n { background: var(--surface-2); color: var(--fg-3); }
.acts { gap: 6px; margin-top: auto; padding-top: 6px; }
</style>
