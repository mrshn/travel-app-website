<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import { liveGuide } from '#shared/utils/guide'
import { directionsUrl, fmtDistance, haversine, travelEstimate } from '#shared/utils/geo'
import type { MapLine, MapMarker } from '~/components/MapView.vue'

const v = useTripView()
const route = useRoute()
const router = useRouter()
const geo = useGeo()
const sheet = useQueryState('stop')
const trip = v.trip

const dayId = computed({
  get: () => {
    const q = route.query.day
    if (q === 'all') return 'all'
    if (typeof q === 'string' && trip.value?.days.some(d => d.id === q)) return q
    return v.today.value?.view.day.id ?? 'all'
  },
  set: (id: string) => {
    router.replace({ query: { ...route.query, day: id, focus: undefined } })
    selected.value = null
  },
})
const showPlaces = useStorage('travel:map:places', false)
const showMetro = useStorage('travel:map:metro', true)
const follow = ref(false)
const selected = ref<string | null>(typeof route.query.focus === 'string' ? route.query.focus : null)
const mapRef = ref<{ flyTo: (lat: number, lng: number, z?: number) => void, fit: () => void } | null>(null)

const plan = computed(() => (dayId.value === 'all' ? undefined : v.plans.value.find(p => p.view.day.id === dayId.value)))

const markers = computed<MapMarker[]>(() => {
  const t = trip.value
  if (!t) return []
  let out: MapMarker[] = []
  if (plan.value) out = stopMarkers(plan.value.stops, plan.value.states)
  else {
    v.plans.value.forEach((p, i) => {
      for (const mk of stopMarkers(p.stops, p.states)) out.push({ ...mk, label: mk.state === 'done' ? undefined : String(i + 1) })
    })
  }
  if (showPlaces.value) out = out.concat(placeMarkers(t))
  return out
})
const lines = computed<MapLine[]>(() => (plan.value && trip.value ? routeLines(plan.value.stops, trip.value, plan.value.states) : []))
const metro = computed(() => (showMetro.value ? trip.value?.overlay?.lines ?? [] : []))

// Selection
const selStop = computed(() => (selected.value && !selected.value.startsWith('place:') ? v.locate(selected.value) : null))
const selPlace = computed(() => (selected.value?.startsWith('place:') ? trip.value?.places?.find(p => `place:${p.id}` === selected.value) : undefined))
const selPoint = computed(() => selStop.value?.stop.place ?? selPlace.value?.place ?? null)
const fromYou = computed(() => {
  const f = geo.fix.value
  const p = selPoint.value
  if (!f || !p) return null
  const m = haversine(f, p)
  return { m, est: travelEstimate(m) }
})

function onSelect(id: string) {
  selected.value = id
}

watch(() => route.query.focus, (f) => {
  if (typeof f === 'string') selected.value = f
})
onMounted(() => {
  if (selPoint.value) setTimeout(() => mapRef.value?.flyTo(selPoint.value!.lat, selPoint.value!.lng, 16), 250)
})

function showMe() {
  if (!geo.active.value) geo.start(true)
  follow.value = true
  selected.value = null
}

// When you're out and about: the next stop, with an arrow.
const nextUp = computed(() => {
  const t = v.today.value
  const m = v.moment.value
  if (!t || !m) return null
  const g = liveGuide(t.stops, t.states, m.minutes, { you: geo.fix.value, home: trip.value?.home })
  return g.focus?.place ? g.focus : null
})

function toggleDone() {
  const s = selStop.value
  if (!s) return
  v.mark(s.stop.id, s.state === 'done' ? null : 'done')
  if (s.state !== 'done') toast(`Done: ${s.stop.title}`, { tone: 'ok' })
}

function addPlace() {
  if (!selPlace.value) return
  router.push({ query: { ...route.query, edit: 'new', from: `place:${selPlace.value.id}`, day: plan.value?.view.day.id ?? v.today.value?.view.day.id ?? trip.value?.days[0]?.id } })
}
</script>

<template>
  <div v-if="trip" class="mappage">
    <ClientOnly>
      <MapView
        ref="mapRef"
        v-model:follow="follow"
        :markers="markers"
        :lines="lines"
        :metro="metro"
        :home="trip.home"
        :you="geo.fix.value"
        :heading="geo.heading.value"
        :selected="selected"
        :fit-key="dayId"
        :zoom-control="false"
        :fit-pad="[96, 40, 150, 0]"
        label="Trip map"
        @select="onSelect"
      />
    </ClientOnly>

    <div class="topbar">
      <div class="hscroll chips" role="tablist" aria-label="Days">
        <button type="button" class="chip dchip" role="tab" :aria-selected="dayId === 'all'" :aria-pressed="dayId === 'all'" @click="dayId = 'all'">
          All days
        </button>
        <button
          v-for="(p, i) in v.plans.value"
          :key="p.view.day.id"
          type="button"
          class="chip dchip"
          role="tab"
          :aria-selected="dayId === p.view.day.id"
          :aria-pressed="dayId === p.view.day.id"
          @click="dayId = p.view.day.id"
        >
          <b class="num">{{ i + 1 }}</b> {{ fmtDate(p.view.day.date, 'weekday') }}<span v-if="p.view.day.id === v.today.value?.view.day.id" class="live-dot" />
        </button>
      </div>
      <div class="layers">
        <button type="button" class="chip lchip" :aria-pressed="showPlaces" @click="showPlaces = !showPlaces">
          <AppIcon name="pin" />Places
        </button>
        <button v-if="trip.overlay?.lines?.length" type="button" class="chip lchip" :aria-pressed="showMetro" @click="showMetro = !showMetro">
          <AppIcon name="metro" />Metro
        </button>
      </div>
    </div>

    <div class="ctl" :class="{ raised: !!(selStop || selPlace || (geo.fix.value && nextUp)) }">
      <button class="btn icon round" type="button" aria-label="Fit the map" title="Fit" @click="mapRef?.fit()">
        <AppIcon name="expand" />
      </button>
      <button class="btn icon round" :class="geo.active.value && follow ? 'primary' : ''" type="button" :aria-label="geo.active.value ? 'Follow me' : 'Show where I am'" :title="geo.active.value ? 'Follow me' : 'Show me'" @click="showMe">
        <AppIcon name="locate" />
      </button>
    </div>

    <Transition name="card">
      <div v-if="selStop" class="selcard card">
        <div class="row top">
          <div class="sc-pic art-frame">
            <SceneArt class="scene" :scene="sceneFor(selStop.stop)" :tod="todFor(selStop.stop.start, selStop.stop.tod)" :lazy="false" />
          </div>
          <div class="grow stack tight">
            <span class="kicker">{{ fmtDate(selStop.plan.view.day.date, 'short') }} · {{ fmtClock(selStop.stop.start) }}</span>
            <b class="sc-t">{{ selStop.stop.title }}</b>
            <div class="row wrap">
              <StateBadge :state="selStop.state" />
              <span v-if="fromYou" class="small muted num">{{ fmtDistance(fromYou.m) }} · ~{{ fromYou.est.minutes }} min</span>
            </div>
          </div>
          <button class="btn icon sm plain round" type="button" aria-label="Close" @click="selected = null">
            <AppIcon name="x" />
          </button>
        </div>
        <div class="row acts">
          <button class="btn sm grow" :class="selStop.state === 'done' ? 'ok' : 'ghost'" type="button" @click="toggleDone">
            <AppIcon name="check" size="sm" />{{ selStop.state === 'done' ? 'Done' : 'Mark done' }}
          </button>
          <a v-if="selPoint" class="btn sm primary grow" :href="directionsUrl(selPoint, fromYou?.est.mode === 'transit' ? 'transit' : 'walking', geo.fix.value)" target="_blank" rel="noopener">
            <AppIcon name="navigate" size="sm" />Directions
          </a>
          <button class="btn sm icon" type="button" aria-label="Details and feedback" @click="sheet.open(selStop.stop.id)">
            <AppIcon name="dots" size="sm" />
          </button>
        </div>
      </div>
      <div v-else-if="selPlace" class="selcard card">
        <div class="row top">
          <div class="sc-pic art-frame">
            <SceneArt class="scene" :scene="selPlace.scene" :tod="selPlace.tod ?? 'day'" :lazy="false" />
          </div>
          <div class="grow stack tight">
            <span class="kicker">{{ selPlace.category === 'photo' ? 'Photo spot' : selPlace.category === 'food' ? 'Food' : 'Sight' }}<template v-if="selPlace.area"> · {{ selPlace.area }}</template></span>
            <b class="sc-t">{{ selPlace.name }}</b>
            <p class="small muted clamp-2">
              {{ selPlace.text }}
            </p>
          </div>
          <button class="btn icon sm plain round" type="button" aria-label="Close" @click="selected = null">
            <AppIcon name="x" />
          </button>
        </div>
        <div class="row acts">
          <button class="btn sm ghost grow" type="button" @click="addPlace">
            <AppIcon name="plus" size="sm" />Add to plan
          </button>
          <a v-if="selPoint" class="btn sm primary grow" :href="directionsUrl(selPoint, fromYou?.est.mode === 'transit' ? 'transit' : 'walking', geo.fix.value)" target="_blank" rel="noopener">
            <AppIcon name="navigate" size="sm" />Directions
          </a>
        </div>
      </div>
      <div v-else-if="geo.fix.value && nextUp" class="selcard card nextcard">
        <DirectionPill :from="geo.fix.value" :to="nextUp.place!" :heading="geo.heading.value" :name="nextUp.title" />
        <button class="btn sm icon" type="button" :aria-label="`Show ${nextUp.title}`" @click="selected = nextUp.id">
          <AppIcon name="chevu" size="sm" />
        </button>
      </div>
    </Transition>
    <p v-if="geo.error.value === 'denied'" class="geo-err small card">
      Location is blocked for this site. Allow it in your browser settings to follow yourself on the map.
    </p>
  </div>
</template>

<style scoped>
.mappage {
  position: fixed;
  left: 0;
  right: 0;
  top: calc(var(--top-h) + var(--safe-t) + 1px);
  bottom: calc(var(--tab-h) + var(--safe-b));
  z-index: 1;
}
@media (min-width: 900px) { .mappage { bottom: 0; } }
.mappage :deep(.mapview) { position: absolute; inset: 0; }
.topbar { position: absolute; left: 0; right: 0; top: 0; z-index: 500; display: flex; flex-direction: column; gap: 6px; padding-top: 10px; pointer-events: none; }
.topbar > * { pointer-events: auto; }
.chips { margin: 0; padding: 2px 12px 4px; gap: 6px; }
.dchip, .lchip { min-height: 36px; padding: 4px 13px; font-size: 13.5px; background: var(--surface); color: var(--fg); box-shadow: 0 1px 4px rgba(0, 0, 0, .18); border-color: var(--line); gap: 6px; }
.dchip[aria-pressed="true"], .lchip[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.dchip b { font-weight: 700; }
.layers { display: flex; gap: 6px; padding: 0 12px; align-self: flex-start; }
.lchip[aria-pressed="false"] { opacity: .85; }
.ctl { position: absolute; right: 12px; bottom: 20px; z-index: 500; display: flex; flex-direction: column; gap: 10px; transition: bottom .2s ease; }
.ctl.raised { bottom: 180px; }
.ctl .btn { background: var(--surface); box-shadow: var(--shadow); }
.ctl .btn.primary { background: var(--accent); color: var(--accent-ink); }
.selcard { position: absolute; left: 10px; right: 10px; bottom: 12px; z-index: 600; padding: 12px; display: flex; flex-direction: column; gap: 12px; box-shadow: var(--shadow-lg); max-width: 520px; margin: 0 auto; }
.sc-pic { width: 64px; height: 64px; border-radius: 12px; flex: none; }
.sc-t { font-size: 16px; line-height: 1.25; }
.acts { gap: 8px; }
.nextcard { flex-direction: row; align-items: center; justify-content: space-between; }
.geo-err { position: absolute; left: 12px; right: 12px; top: 100px; z-index: 600; padding: 10px 12px; }
.mappage :deep(.leaflet-bottom.leaflet-right) { margin-bottom: 0; }
.card-enter-active, .card-leave-active { transition: all .2s ease; }
.card-enter-from, .card-leave-to { opacity: 0; transform: translateY(12px); }
</style>
