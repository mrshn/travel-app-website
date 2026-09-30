<script setup lang="ts">
import { directionsUrl, fmtDistance, haversine, photosUrl, travelEstimate } from '#shared/utils/geo'
import type { PlaceCard, StopStatus } from '#shared/types/trip'
import { placeIsCollectable, placeLinksForStop, placeStampDate } from '#shared/utils/places'

const v = useTripView()
const route = useRoute()
const router = useRouter()
const actions = useTripActions()
const costSheet = useCostSheet()
const sheet = useQueryState('stop')
const editor = useQueryState('edit')
const geo = useGeo()

const hit = computed(() => (sheet.value.value ? v.locate(sheet.value.value) : null))
const stop = computed(() => hit.value?.stop)
const state = computed(() => hit.value?.state ?? 'upcoming')
const day = computed(() => hit.value?.plan.view.day)
const tod = computed(() => (stop.value ? todFor(stop.value.start, stop.value.tod) : 'day'))
const booking = computed(() => {
  const id = stop.value?.bookingId
  return id ? v.trip.value?.bookings.find(b => b.id === id) : undefined
})
const booked = computed(() => (booking.value ? !!v.progress.value.bookings[booking.value.id] : false))

const fromYou = computed(() => {
  const f = geo.fix.value
  const p = stop.value?.place
  if (!f || !p) return null
  const m = haversine(f, p)
  return { m, est: travelEstimate(m) }
})
const walkMode = computed(() => (fromYou.value?.est.mode === 'transit' ? 'transit' : 'walking'))

/** Ticks through markStop, like every other tick: its toast names any stamp, offers Log and has Undo. */
function setStatus(s: StopStatus | null) {
  if (stop.value) actions.markStop(stop.value, s)
}

// Costs here: what was logged for this stop, newest first.
const currency = computed(() => v.trip.value?.currency ?? 'EUR')
const hereEntries = computed(() => {
  const id = stop.value?.id
  return id ? (v.costs.value?.entries ?? []).filter(e => e.stopId === id) : []
})
const hereTotal = computed(() => (stop.value ? v.costs.value?.byStop[stop.value.id] ?? 0 : 0))
function addCost() {
  if (stop.value) costSheet.open({ stopId: stop.value.id, dayId: stop.value.dayId })
}

// Stamps: the places this stop is, stamped or waiting for the tick.
const stampRows = computed(() => {
  const s = stop.value
  const t = v.trip.value
  if (!s || !t) return []
  const places = t.places ?? []
  return placeLinksForStop(s, places)
    .map(id => places.find(p => p.id === id))
    .filter((p): p is PlaceCard => !!p && placeIsCollectable(p))
    .map((p) => {
      const info = v.stamps.value.get(p.id)
      const date = info ? placeStampDate(t, info) : ''
      return { place: p, stamped: !!info, date, when: date ? `Stamped · ${fmtDate(date, 'short')}` : 'Stamped' }
    })
})
/** The place's sheet takes this one's place in the URL (no stacked sheets). */
function openPlace(id: string) {
  const query = { ...route.query }
  delete query.stop
  query.place = id
  router.replace({ query })
}

function showOnMap() {
  if (!stop.value) return
  navigateTo({ path: `/trips/${v.id.value}/map`, query: { focus: stop.value.id, day: stop.value.dayId } })
}

function edit() {
  if (!stop.value) return
  editor.open(stop.value.id)
}
</script>

<template>
  <BottomSheet :open="!!stop" bare size="lg" :title="stop?.title" @close="sheet.close()">
    <template v-if="stop && day">
      <div class="hero art-frame">
        <SceneArt class="scene" :scene="sceneFor(stop)" :tod="tod" :label="stop.title" :lazy="false" />
        <div class="scrim" />
        <button class="btn icon sm on-art round close" type="button" aria-label="Close" @click="sheet.close()">
          <AppIcon name="x" />
        </button>
        <div class="hero-in on-art">
          <div class="row wrap">
            <StateBadge :state="state" on-art />
            <span class="chip on-art num">{{ fmtDate(day.date, 'short') }} · {{ fmtClock(stop.start) }}–{{ fmtClock(stop.endMin) }}</span>
          </div>
          <p v-if="stop.base.options" class="opt">
            {{ stop.base.title }}
          </p>
          <h2 class="ttl">
            {{ stop.title }}
          </h2>
        </div>
      </div>

      <div class="content">
        <div class="seg block status" role="group" aria-label="Status">
          <button type="button" :aria-pressed="state !== 'done' && state !== 'skipped'" @click="setStatus(null)">
            <AppIcon name="circle" size="sm" />{{ state === 'missed' ? 'Not marked' : 'Planned' }}
          </button>
          <button type="button" :aria-pressed="state === 'done'" @click="setStatus('done')">
            <AppIcon name="check" size="sm" />Done
          </button>
          <button type="button" :aria-pressed="state === 'skipped'" @click="setStatus('skipped')">
            <AppIcon name="skip" size="sm" />Skipped
          </button>
        </div>

        <div class="row wrap facts">
          <span class="chip"><AppIcon :name="stopIcon(stop)" :style="{ color: KIND_META[stop.kind].color }" />{{ KIND_META[stop.kind].label }}</span>
          <span v-if="stop.cost" class="chip num"><AppIcon name="euro" />{{ stop.cost }}</span>
          <span v-if="stop.tags?.includes('must')" class="chip t-accent-soft">Must do</span>
          <span v-if="stop.tags?.includes('optional')" class="chip t-plain">Optional</span>
          <span v-if="stop.tags?.includes('skipIfTired')" class="chip t-plain">Skip if tired</span>
          <span v-if="stop.minor" class="chip t-plain">Logistics step</span>
          <NuxtLink v-if="booking" :to="`/trips/${v.id.value}/bookings`" class="chip" :class="booked ? 't-ok' : 't-warn'">
            <AppIcon :name="booked ? 'check' : 'ticket'" />{{ booked ? 'Booked' : 'Book this' }}
          </NuxtLink>
        </div>

        <section class="here" aria-labelledby="stop-costs-h">
          <div class="here-h">
            <h3 id="stop-costs-h" class="h3">
              Costs here
            </h3>
            <span v-if="hereTotal > 0" class="num strong">{{ moneyExact(hereTotal, currency) }}</span>
          </div>
          <div v-if="hereEntries.length" class="card flat rows here-rows">
            <CostRow v-for="e in hereEntries.slice(0, 3)" :key="e.id" :entry="e" />
          </div>
          <p v-else class="small muted">
            Nothing logged here yet.
          </p>
          <div class="row wrap here-acts">
            <button class="btn sm" type="button" @click="addCost">
              <AppIcon name="plus" size="sm" />Add a cost
            </button>
            <NuxtLink v-if="hereEntries.length > 3" :to="`/trips/${v.id.value}/costs`" class="btn sm plain">
              See all {{ hereEntries.length }}
            </NuxtLink>
          </div>
        </section>

        <section v-if="stampRows.length" class="stamps" aria-label="Stamps">
          <button v-for="r in stampRows" :key="r.place.id" type="button" class="st" @click="openPlace(r.place.id)">
            <span class="st-mark" aria-hidden="true">
              <StampMark v-if="r.stamped" :place="r.place" :date="r.date || undefined" :size="58" />
              <span v-else class="st-empty"><AppIcon name="stamp" /></span>
            </span>
            <span class="st-t">
              <template v-if="r.stamped">
                <b class="st-name">{{ r.place.name }}</b>
                <span class="small muted">{{ r.when }}</span>
              </template>
              <span v-else-if="state === 'done'" class="small">Stamp removed: <b>{{ r.place.name }}</b></span>
              <span v-else class="small">Stamps when done: <b>{{ r.place.name }}</b></span>
            </span>
            <AppIcon name="chevr" size="sm" class="st-go" />
          </button>
        </section>

        <p v-if="stop.tip" class="tip">
          {{ stop.tip }}
        </p>
        <ul v-if="stop.lines?.length && !stop.base.options" class="lines">
          <li v-for="(l, i) in stop.lines" :key="i">
            {{ l }}
          </li>
        </ul>

        <ChoicePicker v-if="stop.base.options" :stop="stop" @choose="(c) => v.choose(stop!.id, c)" />

        <div v-if="stop.place" class="card flat where">
          <div class="row top">
            <AppIcon name="pin" class="pin" />
            <div class="grow">
              <div class="strong">
                {{ stop.place.name }}
              </div>
              <div v-if="fromYou" class="small muted num">
                {{ fmtDistance(fromYou.m) }} from you · ~{{ fromYou.est.minutes }} min {{ fromYou.est.mode === 'walk' ? 'walk' : 'by transit' }}
              </div>
              <div v-else-if="stop.via && typeof stop.via === 'object'" class="small muted">
                Metro {{ stop.via.line }} · {{ stop.via.from }} → {{ stop.via.to }}
              </div>
            </div>
          </div>
          <div class="row wrap acts">
            <a class="btn primary sm" :href="directionsUrl(stop.place, walkMode)" target="_blank" rel="noopener">
              <AppIcon name="navigate" size="sm" />Directions
            </a>
            <a v-if="walkMode === 'walking'" class="btn sm" :href="directionsUrl(stop.place, 'transit')" target="_blank" rel="noopener">
              <AppIcon name="metro" size="sm" />Transit
            </a>
            <button class="btn sm" type="button" @click="showOnMap">
              <AppIcon name="map" size="sm" />Map
            </button>
            <a class="btn sm plain" :href="photosUrl(stop.place.query ?? stop.place.name)" target="_blank" rel="noopener">
              <AppIcon name="image" size="sm" />Photos
            </a>
          </div>
        </div>

        <div v-if="stop.links?.length" class="links">
          <a v-for="l in stop.links" :key="l.url" :href="l.url" target="_blank" rel="noopener" class="lk">
            <AppIcon name="ext" size="sm" /><span class="grow">{{ l.label }}</span>
          </a>
        </div>

        <hr class="divider">
        <FeedbackEditor :stop-id="stop.id" />
        <hr class="divider">

        <div class="row wrap">
          <button class="btn ghost sm" type="button" @click="edit">
            <AppIcon name="edit" size="sm" />Edit stop
          </button>
        </div>
      </div>
    </template>
  </BottomSheet>
</template>

<style scoped>
.hero { height: 220px; display: flex; align-items: flex-end; }
@media (min-width: 900px) { .hero { height: 240px; } }
.hero-in { padding: 16px 18px 16px; display: flex; flex-direction: column; gap: 6px; width: 100%; }
/* Below the sheet's 30 px drag strip, so the whole 44 px touch area can be tapped. */
.close { position: absolute; top: 34px; right: 14px; }
.opt { font-size: 12px; font-weight: 650; letter-spacing: .06em; text-transform: uppercase; color: var(--on-art-2); }
.ttl { font-size: 23px; font-weight: 700; line-height: 1.2; text-shadow: 0 1px 12px rgba(0, 0, 0, .35); }
.content { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.status button { min-height: 44px; }
.facts { gap: 6px; }
/* The plain chips' shared grey is 4.1:1 on the sheet's background in light mode: one step darker for 4.5:1. */
.facts .chip.t-plain { color: var(--fg-2); }
.here { display: flex; flex-direction: column; gap: 8px; }
.here-h { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.here-rows { overflow: hidden; background: var(--surface); }
.here-acts { gap: 8px; }
.stamps { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--surface); }
.st { display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px 14px 8px 10px; background: none; border: 0; text-align: left; color: var(--fg); }
.st + .st { border-top: 1px solid var(--line); }
@media (hover: hover) { .st:hover { background: var(--surface-2); } }
.st:active { background: var(--surface-2); }
.st:focus-visible { outline-offset: -3px; }
.st-mark { flex: none; width: 58px; height: 58px; display: grid; place-items: center; }
.st-empty { width: 50px; height: 50px; border-radius: 50%; border: 2px dashed var(--line); display: grid; place-items: center; color: var(--fg-3); }
.st-t { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; line-height: 1.35; }
.st-name { font-weight: 650; }
.st-go { color: var(--fg-3); flex: none; }
.tip { font-size: 15.5px; line-height: 1.55; }
.lines { padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.where { padding: 14px; display: flex; flex-direction: column; gap: 12px; background: var(--surface); }
.pin { color: var(--accent); margin-top: 2px; }
.acts { gap: 8px; }
.links { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; background: var(--surface); }
.lk { display: flex; align-items: center; gap: 10px; padding: 12px 14px; text-decoration: none; color: var(--fg); font-weight: 550; }
.lk + .lk { border-top: 1px solid var(--line); }
.lk:hover { background: var(--surface-2); }
.lk .i { color: var(--accent); }
</style>
