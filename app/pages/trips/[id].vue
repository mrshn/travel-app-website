<script setup lang="ts">
const route = useRoute()
const v = provideTripView(() => String(route.params.id ?? ''))
const trip = v.trip
useLiveAlerts(v)
const online = useOnline()
// A preview belongs to the trip you were looking at.
onBeforeUnmount(() => v.clock.live())

/** The five jobs of the trip (spec D1); the same five as top tabs from 900 px. */
const tabs = [
  { key: 'now', label: 'Now', icon: 'target' },
  { key: 'plan', label: 'Plan', icon: 'list' },
  { key: 'places', label: 'Places', icon: 'pin' },
  { key: 'costs', label: 'Costs', icon: 'wallet' },
  { key: 'more', label: 'More', icon: 'grid' },
]
/** Sections that live under More. */
const UNDER_MORE = new Set(['more', 'progress', 'badges', 'bookings', 'packing', 'guide', 'notes', 'sos', 'settings'])
const section = computed(() => String(route.path.split('/')[3] || 'now'))
/** The lit tab (spec 3.2): the map lights Plan, or Places when opened from a place; More's sections light More. */
const activeTab = computed(() => {
  const sec = section.value
  if (sec === 'map') {
    const q = route.query.from
    const from = Array.isArray(q) ? q[0] : q
    return typeof from === 'string' && from.startsWith('place') ? 'places' : 'plan'
  }
  return UNDER_MORE.has(sec) ? 'more' : sec
})

/** "8–12 Oct", or "28 Sep – 3 Oct" across two months. */
function shortRange(start: string, end: string): string {
  if (!start) return ''
  if (!end || end === start) return fmtDate(start, 'dayMonth')
  if (start.slice(0, 7) === end.slice(0, 7)) return `${Number(start.slice(8, 10))}–${fmtDate(end, 'dayMonth')}`
  return `${fmtDate(start, 'dayMonth')} – ${fmtDate(end, 'dayMonth')}`
}

/** Header line 2 (spec 3.1): where the trip stands, on the app's clock (a preview included). */
const status = computed(() => {
  const m = v.moment.value
  const t = trip.value
  if (!m || !t) return ''
  const dates = shortRange(t.start, t.end)
  if (m.phase === 'before') {
    const when = m.daysToStart <= 0 ? 'Today' : m.daysToStart === 1 ? 'Tomorrow' : `In ${m.daysToStart} days`
    return `${when} · ${dates}`
  }
  if (m.phase === 'during') {
    return m.dayIndex >= 0
      ? `Day ${m.dayIndex + 1} of ${t.days.length} · ${fmtDate(m.dayDate, 'weekday')} ${Number(m.dayDate.slice(8, 10))}`
      : `On the trip · ${dates}`
  }
  return `Trip done · ${dates}`
})
const live = computed(() => v.moment.value?.phase === 'during')

// A newer version of this trip arrived from GitHub while you had your own changes here.
const pending = computed(() => (trip.value ? v.trips.updateFor(trip.value.id) : undefined))
function takeUpdate() {
  if (trip.value && v.trips.applyUpdate(trip.value.id)) toast('Plan updated. Your ticks, notes and own stops are kept.', { tone: 'ok' })
}
function keepMine() {
  if (trip.value) v.trips.skipUpdate(trip.value.id)
}

/**
 * --shell-extra: the height of the preview bar plus the update banner under the header, margins included
 * (0px when neither shows). The full-screen map adds it to its top, so nothing sits under those bars.
 */
const shellEl = ref<HTMLElement | null>(null)
const extra = ref(0)
const BARS = ':scope > .pvbar, :scope > .updbar'
function measureExtra() {
  const el = shellEl.value
  if (!el) return
  let h = 0
  for (const bar of el.querySelectorAll<HTMLElement>(BARS)) {
    const cs = getComputedStyle(bar)
    h += bar.getBoundingClientRect().height + (Number.parseFloat(cs.marginTop) || 0) + (Number.parseFloat(cs.marginBottom) || 0)
  }
  extra.value = Math.round(h)
}
let barsResize: ResizeObserver | undefined
let barsCome: MutationObserver | undefined
function watchBars() {
  const el = shellEl.value
  barsResize?.disconnect()
  if (el && typeof ResizeObserver !== 'undefined') {
    barsResize ??= new ResizeObserver(measureExtra)
    for (const bar of el.querySelectorAll<HTMLElement>(BARS)) barsResize.observe(bar)
  }
  measureExtra()
}
watch(shellEl, (el) => {
  barsCome?.disconnect()
  if (el && typeof MutationObserver !== 'undefined') {
    barsCome ??= new MutationObserver(watchBars)
    barsCome.observe(el, { childList: true })
  }
  if (el) watchBars()
  else extra.value = 0
}, { flush: 'post' })
onBeforeUnmount(() => {
  barsCome?.disconnect()
  barsResize?.disconnect()
})

useHead({ title: computed(() => (trip.value ? `${trip.value.title} · Travels` : 'Travels')) })
</script>

<template>
  <div v-if="trip" ref="shellEl" class="shell" :class="`sec-${section}`" :style="{ '--shell-extra': `${extra}px` }">
    <header class="top">
      <div class="top-in">
        <NuxtLink to="/" class="btn icon plain round back" aria-label="All trips">
          <AppIcon name="chevl" />
        </NuxtLink>
        <NuxtLink :to="`/trips/${trip.id}/now`" class="ttl">
          <span class="name display">{{ trip.title }}</span>
          <span class="status" :class="{ live }"><span v-if="live" class="live-dot" aria-hidden="true" /><span class="st-t">{{ status }}</span></span>
        </NuxtLink>
        <nav class="tabs-top" aria-label="Trip sections">
          <NuxtLink
            v-for="t in tabs"
            :key="t.key"
            :to="`/trips/${trip.id}/${t.key}`"
            class="tt hit"
            :aria-current="activeTab === t.key ? 'page' : undefined"
          >
            <AppIcon :name="t.icon" size="sm" />{{ t.label }}
          </NuxtLink>
        </nav>
        <span class="grow" />
        <span v-if="!online" class="chip t-warn offline" title="Your plan, map pins and notes still work offline"><AppIcon name="signal-off" /><span class="off-t">Offline</span></span>
        <NuxtLink v-if="trip.sos?.length" :to="`/trips/${trip.id}/sos`" class="sosbtn hit" aria-label="Emergency numbers">
          <AppIcon name="phone" size="xs" />SOS
        </NuxtLink>
      </div>
    </header>
    <PreviewBar :timezone="trip.timezone" />
    <div v-if="pending" class="updbar" role="status">
      <AppIcon name="refresh" size="sm" />
      <span class="grow"><b>This plan has a newer version</b> (saved from a chat). Your ticks, ratings, notes and own stops are kept; edits to the original stops are replaced.</span>
      <button class="btn xs gold" type="button" @click="takeUpdate">
        Update
      </button>
      <button class="btn xs plain" type="button" @click="keepMine">
        Keep mine
      </button>
    </div>

    <NuxtPage />

    <nav class="tabbar" aria-label="Trip sections">
      <NuxtLink
        v-for="t in tabs"
        :key="t.key"
        :to="`/trips/${trip.id}/${t.key}`"
        class="tb"
        :aria-current="activeTab === t.key ? 'page' : undefined"
      >
        <span class="ic">
          <AppIcon :name="t.icon" />
          <span v-if="t.key === 'now' && live" class="dotlive" aria-hidden="true" />
        </span>
        <span class="lb">{{ t.label }}</span>
      </NuxtLink>
    </nav>

    <StopSheet />
    <PlaceSheet />
    <StopEditor />
    <CostSheet />
    <GameHost />
  </div>
  <div v-else class="page">
    <div class="empty">
      <AppIcon name="map" />
      <h3>Trip not found</h3>
      <p>It may have been deleted on this device.</p>
      <p style="margin-top: 14px">
        <NuxtLink to="/" class="btn primary">
          All trips
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.top {
  position: sticky;
  top: 0;
  z-index: 50;
  padding-top: var(--safe-t);
  background: color-mix(in srgb, var(--bg) 95%, transparent);
  backdrop-filter: saturate(1.4) blur(14px);
  -webkit-backdrop-filter: saturate(1.4) blur(14px);
  border-bottom: 1px solid var(--line);
}
.top-in { max-width: var(--page-max); margin: 0 auto; height: var(--top-h); display: flex; align-items: center; gap: 8px; padding: 0 12px 0 6px; }
.back { flex: none; }
/* The trip name and line 2: one link, at least 44 px tall. */
.ttl { display: flex; flex-direction: column; justify-content: center; min-width: 44px; min-height: 44px; text-decoration: none; color: var(--fg); line-height: 1.15; flex: 0 1 auto; }
.name { font-size: 18px; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { display: flex; align-items: center; gap: 7px; min-width: 0; font-size: 12px; font-weight: 600; color: var(--fg-2); letter-spacing: .01em; }
.status .live-dot { width: 7px; height: 7px; }
.st-t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.offline { flex: none; }
.updbar { max-width: var(--page-max); margin: 10px auto 0; width: calc(100% - 32px); display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: var(--gold-soft); font-size: 13.5px; flex-wrap: wrap; }
.updbar .i { color: var(--gold-ink); }
/* The page's own colour on red: light on the dark red of the light theme, dark on the light red of the dark one. */
.sosbtn { flex: none; display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; background: var(--bad); color: var(--bg); font-weight: 700; font-size: 12.5px; text-decoration: none; letter-spacing: .04em; }
.tabs-top { display: none; }

.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 60;
  height: calc(var(--tab-h) + var(--safe-b));
  padding: 6px 6px var(--safe-b);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: saturate(1.4) blur(16px);
  -webkit-backdrop-filter: saturate(1.4) blur(16px);
  border-top: 1px solid var(--line);
}
.tb { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 44px; min-height: 44px; text-decoration: none; color: var(--fg-2); font-size: 11.5px; font-weight: 650; border-radius: 14px; }
.tb .ic { position: relative; display: grid; place-items: center; width: 56px; max-width: 100%; height: 30px; border-radius: 999px; transition: background .2s ease, color .2s ease; }
.tb[aria-current="page"] { color: var(--accent); }
.tb[aria-current="page"] .ic { background: var(--accent-soft); }
.dotlive { position: absolute; top: 3px; right: 14px; width: 8px; height: 8px; border-radius: 50%; background: var(--bad); border: 2px solid var(--surface); }

/* Narrow phones: the offline chip keeps its icon, and says "Offline" to screen readers only. */
@media (max-width: 360px) {
  .offline { padding: 2px 7px; }
  .off-t { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
}
@media (min-width: 900px) {
  .top-in { padding: 0 20px 0 10px; gap: 12px; }
  .tabbar { display: none; }
  .tabs-top { display: flex; gap: 4px; margin-left: 18px; padding: 4px; border-radius: 14px; background: var(--surface-2); }
  .tt { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 10px; text-decoration: none; color: var(--fg-2); font-weight: 650; font-size: 14px; }
  .tt:hover { color: var(--fg); }
  .tt[aria-current="page"] { background: var(--surface); color: var(--accent); box-shadow: 0 1px 3px rgba(0, 0, 0, .1); }
}
</style>
