<script setup lang="ts">
import type { Day } from '#shared/types/trip'
import { directionsUrl, fmtDistance, haversine, travelEstimate, walkMinutes, type LatLng } from '#shared/utils/geo'
import { fmtDuration } from '#shared/utils/time'

/**
 * "Getting back", the late-night card on Now: the way home, the card for the taxi driver and a taxi number,
 * all from what the trip already has (home, driverCard, the first SOS entry about a taxi with a number, the
 * day's metro fact). A piece the trip lacks is left out; with no way home, driver card or taxi, no card.
 */
const props = defineProps<{
  /** The trip day it is for: its first metro fact shows ("Last metro ~01:30"). */
  day?: Day
  /** Your live position, when there is one. */
  you?: LatLng | null
  /** Where the plan has you (the stop on now, or the last one that started), to pick walking or transit without a position. */
  near?: LatLng | null
}>()

const v = useTripView()
const trip = v.trip
const driver = ref(false)
const titleId = useId()

const home = computed(() => {
  const h = trip.value?.home
  return h && Number.isFinite(h.lat) && Number.isFinite(h.lng) ? h : undefined
})
const homeName = computed(() => home.value?.label || home.value?.name || '')
const driverLines = computed(() => (trip.value?.driverCard ?? []).filter(l => typeof l === 'string' && !!l.trim()))
const taxi = computed(() => (trip.value?.sos ?? []).find(s => /\btaxi/i.test(s.label ?? '') && !!s.tel?.trim()))
/** The number as the trip writes it ("060609" from "060609 · 117"), else the digits dialled. */
const taxiNumber = computed(() => {
  const t = taxi.value
  if (!t?.tel) return ''
  const digits = (s: string) => s.replace(/\D/g, '')
  const head = String(t.value ?? '').split('·')[0]!.trim()
  return head && digits(head) === digits(t.tel) ? head : t.tel.trim()
})
const taxiHref = computed(() => (taxi.value?.tel ? `tel:${taxi.value.tel.replace(/[^\d+]/g, '')}` : ''))
const metro = computed(() => props.day?.facts?.find(f => f.icon === 'metro')?.text ?? '')

/**
 * Walking when home is a walk away, else transit: the rule of Now's directions (travelEstimate says transit past
 * 35 min on foot, about 2.2 km; never walking past 2.8 km). With no idea where you are, transit.
 */
const mode = computed<'walking' | 'transit'>(() => {
  const from = props.you ?? props.near
  if (!home.value || !from) return 'transit'
  const m = haversine(from, home.value)
  return travelEstimate(m).mode === 'transit' || m > 2800 ? 'transit' : 'walking'
})
const homeHref = computed(() => (home.value ? directionsUrl(home.value, mode.value, props.you ?? null) : ''))
const distance = computed(() => {
  if (!home.value || !props.you) return ''
  const m = haversine(props.you, home.value)
  return `${fmtDistance(m)} from you · about ${fmtDuration(walkMinutes(m))} on foot`
})

const show = computed(() => !!home.value || !!driverLines.value.length || !!taxi.value)
</script>

<template>
  <section v-if="show" class="card pad hc" :aria-labelledby="titleId">
    <p class="kicker hc-k">
      <AppIcon name="moon" size="xs" />Late night
    </p>
    <h2 :id="titleId" class="h3">
      Getting back<template v-if="homeName">
        to {{ homeName }}
      </template>
    </h2>
    <p v-if="home?.address" class="small muted">
      {{ home.address }}
    </p>
    <p v-if="distance" class="small tnum hc-line">
      <AppIcon name="walk" size="sm" /><span>{{ distance }}</span>
    </p>
    <p v-if="metro" class="small hc-line">
      <AppIcon name="metro" size="sm" /><span>{{ metro }}</span>
    </p>
    <div class="hc-acts">
      <a v-if="home" class="btn primary" :href="homeHref" target="_blank" rel="noopener">
        <AppIcon name="navigate" size="sm" />Take me home
      </a>
      <button v-if="driverLines.length" class="btn gold" type="button" @click="driver = true">
        <AppIcon name="taxi" size="sm" />Show the driver
      </button>
      <a v-if="taxi" class="btn ghost call tnum" :href="taxiHref">
        <AppIcon name="phone" size="sm" />Call a taxi · {{ taxiNumber }}
      </a>
    </div>
    <DriverCard v-model:open="driver" :lines="driverLines" />
  </section>
</template>

<style scoped>
.hc {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: color-mix(in srgb, var(--c-night) 7%, var(--surface));
  border-color: color-mix(in srgb, var(--c-night) 30%, var(--line));
}
.hc-k { display: flex; align-items: center; gap: 6px; }
.hc-k .i { color: var(--c-night); }
.hc h2 { margin-top: 2px; }
.hc-line { display: flex; align-items: flex-start; gap: 8px; color: var(--fg-2); }
.hc-line .i { flex: none; margin-top: 1px; color: var(--c-night); }
.hc-acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.hc-acts .btn { flex: 1 1 auto; }
.hc-acts .call { flex-basis: 100%; }
</style>
