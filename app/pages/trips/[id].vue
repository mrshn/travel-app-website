<script setup lang="ts">
const route = useRoute()
const v = provideTripView(() => String(route.params.id ?? ''))
const trip = v.trip
useLiveAlerts(v)
const online = useOnline()
// A preview belongs to the trip you were looking at.
onBeforeUnmount(() => v.clock.live())

const tabs = [
  { key: 'now', label: 'Now', icon: 'target' },
  { key: 'plan', label: 'Plan', icon: 'list' },
  { key: 'map', label: 'Map', icon: 'map' },
  { key: 'progress', label: 'Progress', icon: 'pie' },
  { key: 'more', label: 'More', icon: 'grid' },
]
const MORE = ['more', 'bookings', 'packing', 'places', 'guide', 'sos', 'settings']
const section = computed(() => String(route.path.split('/')[3] ?? 'now'))
const activeTab = computed(() => (MORE.includes(section.value) ? 'more' : section.value))

const status = computed(() => {
  const m = v.moment.value
  const t = trip.value
  if (!m || !t) return ''
  if (m.phase === 'before') return m.daysToStart <= 0 ? 'Today' : m.daysToStart === 1 ? 'Tomorrow' : `In ${m.daysToStart} days`
  if (m.phase === 'during') return m.dayIndex >= 0 ? `Day ${m.dayIndex + 1} of ${t.days.length}` : 'On the trip'
  return 'Trip done'
})
const live = computed(() => v.moment.value?.phase === 'during')

useHead({ title: computed(() => (trip.value ? `${trip.value.title} · Travels` : 'Travels')) })
</script>

<template>
  <div v-if="trip" class="shell" :class="`sec-${section}`">
    <header class="top">
      <div class="top-in">
        <NuxtLink to="/" class="btn icon plain round back" aria-label="All trips">
          <AppIcon name="chevl" />
        </NuxtLink>
        <NuxtLink :to="`/trips/${trip.id}/now`" class="ttl">
          <span class="name display">{{ trip.title }}</span>
          <span class="dates">{{ fmtRange(trip.start, trip.end) }}</span>
        </NuxtLink>
        <nav class="tabs-top" aria-label="Trip sections">
          <NuxtLink
            v-for="t in tabs"
            :key="t.key"
            :to="`/trips/${trip.id}/${t.key}`"
            class="tt"
            :aria-current="activeTab === t.key ? 'page' : undefined"
          >
            <AppIcon :name="t.icon" size="sm" />{{ t.label }}
          </NuxtLink>
        </nav>
        <span class="grow" />
        <span v-if="!online" class="chip t-warn offline" title="Your plan, map pins and notes still work offline"><AppIcon name="signal" />Offline</span>
        <span class="chip status num" :class="live ? 't-accent-soft' : 't-gold'">
          <span v-if="live" class="live-dot" aria-hidden="true" />{{ status }}
        </span>
        <NuxtLink v-if="trip.sos?.length" :to="`/trips/${trip.id}/sos`" class="sosbtn" aria-label="Emergency numbers">
          <AppIcon name="phone" size="xs" />SOS
        </NuxtLink>
      </div>
    </header>
    <PreviewBar :timezone="trip.timezone" />

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
    <StopEditor />
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
.ttl { display: flex; flex-direction: column; min-width: 0; text-decoration: none; color: var(--fg); line-height: 1.1; }
.name { font-size: 18px; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dates { font-size: 11.5px; color: var(--fg-3); font-weight: 600; letter-spacing: .02em; }
.status { gap: 6px; }
.sosbtn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; background: var(--bad); color: #fff; font-weight: 700; font-size: 12.5px; text-decoration: none; letter-spacing: .04em; }
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
  grid-template-columns: repeat(5, 1fr);
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  backdrop-filter: saturate(1.4) blur(16px);
  -webkit-backdrop-filter: saturate(1.4) blur(16px);
  border-top: 1px solid var(--line);
}
.tb { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; text-decoration: none; color: var(--fg-3); font-size: 11.5px; font-weight: 650; border-radius: 14px; }
.tb .ic { position: relative; display: grid; place-items: center; width: 56px; height: 30px; border-radius: 999px; transition: background .2s ease, color .2s ease; }
.tb[aria-current="page"] { color: var(--accent); }
.tb[aria-current="page"] .ic { background: var(--accent-soft); }
.dotlive { position: absolute; top: 3px; right: 14px; width: 8px; height: 8px; border-radius: 50%; background: var(--bad); border: 2px solid var(--surface); }

@media (max-width: 420px) {
  .status { display: none; }
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
