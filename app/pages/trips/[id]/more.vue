<script setup lang="ts">
import { directionsUrl } from '#shared/utils/geo'

const v = useTripView()
const trip = v.trip
const s = v.summary
const notesStore = useNotes()
notesStore.load()
const noteCount = computed(() => notesStore.notes.value.filter(n => n.trip === v.id.value).length)
const tiles = computed(() => {
  const t = trip.value
  if (!t) return []
  const sum = s.value
  return [
    { to: 'bookings', icon: 'ticket', title: 'Bookings', sub: sum ? `${sum.bookings.total - sum.bookings.done} to do · ${sum.bookings.done} done` : '', tone: 'var(--c-sight)' },
    { to: 'packing', icon: 'bag', title: 'Packing', sub: sum ? `${sum.packing.done} of ${sum.packing.total} packed` : '', tone: 'var(--gold)' },
    { to: 'places', icon: 'pin', title: 'Places', sub: `${t.places?.length ?? 0} sights, food & photo spots`, tone: 'var(--c-move)' },
    { to: 'guide', icon: 'info', title: 'Guide', sub: `${t.info?.length ?? 0} sections: money, phone, safety…`, tone: 'var(--c-night)' },
    { to: 'notes', icon: 'book', title: 'Notes & chats', sub: noteCount.value ? `${noteCount.value} saved from chats` : 'Research and chats saved from Claude', tone: 'var(--accent)' },
    { to: 'sos', icon: 'phone', title: 'SOS', sub: 'Emergency numbers & what to do', tone: 'var(--bad)' },
    { to: 'settings', icon: 'sliders', title: 'Trip settings', sub: 'Dates, home base, backup, reset', tone: 'var(--fg-2)' },
  ]
})
</script>

<template>
  <div v-if="trip" class="page more">
    <h1 class="h2 ttl">
      More
    </h1>
    <div class="tiles">
      <NuxtLink v-for="t in tiles" :key="t.to" :to="`/trips/${trip.id}/${t.to}`" class="tile card card-link">
        <span class="ic" :style="{ color: t.tone }"><AppIcon :name="t.icon" size="lg" /></span>
        <span class="grow">
          <b>{{ t.title }}</b>
          <span class="small muted">{{ t.sub }}</span>
        </span>
        <AppIcon name="chevr" class="chev" />
      </NuxtLink>
    </div>

    <section class="card pad about">
      <p class="kicker">
        This trip
      </p>
      <dl>
        <div><dt>Dates</dt><dd>{{ fmtRange(trip.start, trip.end) }} · {{ trip.days.length }} days</dd></div>
        <div><dt>Time zone</dt><dd>{{ trip.timezone }}</dd></div>
        <div><dt>Currency</dt><dd>{{ trip.currency }}<template v-if="trip.fx"> · 1 = {{ trip.fx.rate }} {{ trip.fx.homeCurrency }}</template></dd></div>
        <div v-if="trip.home">
          <dt>Staying at</dt>
          <dd>
            {{ trip.home.label }}<template v-if="trip.home.address"><br><span class="small muted">{{ trip.home.address }}</span></template>
            <br><a :href="directionsUrl(trip.home, 'walking')" target="_blank" rel="noopener" class="small">Directions home</a>
          </dd>
        </div>
      </dl>
    </section>

    <NuxtLink to="/" class="btn ghost block">
      <AppIcon name="globe" size="sm" />All trips
    </NuxtLink>
  </div>
</template>

<style scoped>
.more { padding-top: 18px; }
.ttl { margin-bottom: 14px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.tile { display: flex; align-items: center; gap: 14px; padding: 16px; }
.tile .grow { display: flex; flex-direction: column; gap: 2px; }
.tile b { font-size: 16px; }
.ic { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; background: var(--surface-2); flex: none; }
.chev { color: var(--fg-3); }
.about { margin: 18px 0 14px; }
dl { margin: 10px 0 0; display: flex; flex-direction: column; gap: 10px; }
dl div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 10px; }
dt { color: var(--fg-3); font-size: 13.5px; font-weight: 600; }
dd { margin: 0; }
</style>
