<script setup lang="ts">
import { directionsUrl } from '#shared/utils/geo'

/** The More hub (spec 4.6): your trip at a glance, then everything else in three groups. */
const v = useTripView()
const trip = v.trip
const s = v.summary
const game = useGame()
const notesStore = useNotes()
notesStore.load()
const noteCount = computed(() => notesStore.notes.value.filter(n => n.trip === v.id.value).length)

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const pct = computed(() => Math.round((s.value?.pct ?? 0) * 100))
const gameLine = computed(() => {
  const g = game.value
  return g ? `${g.rank.name} · ${plural(g.stamps, 'stamp', 'stamps')} · ${plural(g.earned, 'badge', 'badges')}` : ''
})
/** Six seals, earned ones first. */
const strip = computed(() => {
  const list = game.value?.badges ?? []
  return [...list.filter(b => b.earned), ...list.filter(b => !b.earned)].slice(0, 6)
})

interface Row { to: string, icon: string, title: string, sub: string, tone: string }
interface Group { key: string, title: string, rows: Row[] }

const groups = computed<Group[]>(() => {
  const t = trip.value
  if (!t) return []
  const sum = s.value
  const ready: Group = {
    key: 'ready',
    title: 'Get ready',
    rows: [
      { to: 'bookings', icon: 'ticket', title: 'Bookings', sub: sum ? `${sum.bookings.total - sum.bookings.done} to do · ${sum.bookings.done} done` : '', tone: 'var(--c-sight)' },
      { to: 'packing', icon: 'bag', title: 'Packing', sub: sum ? `${sum.packing.done} of ${sum.packing.total} packed` : '', tone: 'var(--gold)' },
    ],
  }
  const way: Group = {
    key: 'way',
    title: 'Find your way',
    rows: [
      { to: 'map', icon: 'map', title: 'Map', sub: 'Days, places and the metro', tone: 'var(--c-move)' },
      { to: 'guide', icon: 'info', title: 'Guide', sub: `${t.info?.length ?? 0} sections: money, phone, safety…`, tone: 'var(--c-night)' },
      { to: 'notes', icon: 'book', title: 'Notes & chats', sub: noteCount.value ? `${noteCount.value} saved from chats` : 'Research and chats saved from Claude', tone: 'var(--accent)' },
    ],
  }
  const help: Group = {
    key: 'help',
    title: 'Help and settings',
    rows: [
      { to: 'sos', icon: 'phone', title: 'SOS', sub: 'Emergency numbers & what to do', tone: 'var(--bad)' },
      { to: 'settings', icon: 'sliders', title: 'Trip settings', sub: 'Dates, home base, backup, reset', tone: 'var(--fg-2)' },
    ],
  }
  // On the trip and after it, finding your way matters more than getting ready.
  return v.moment.value && v.moment.value.phase !== 'before' ? [way, ready, help] : [ready, way, help]
})
</script>

<template>
  <div v-if="trip" class="page more">
    <h1 class="h2 ttl">
      More
    </h1>

    <section v-if="s" class="card pad you" aria-label="Your trip">
      <div class="you-top">
        <ProgressRing
          :size="72"
          :stroke="8"
          :total="s.all.total"
          :segments="[
            { value: s.all.done, color: 'var(--ok)', label: 'Done' },
            { value: s.all.skipped, color: 'var(--closed)', label: 'Skipped' },
            { value: s.all.missed, color: 'var(--warn)', label: 'Not marked' },
          ]"
          :label="`${pct}% of stops done`"
        >
          <b class="num pc">{{ pct }}<small>%</small></b>
        </ProgressRing>
        <div class="you-r">
          <h2 class="h3">
            {{ s.all.done }} of {{ s.all.total }} stops done
          </h2>
          <p v-if="gameLine" class="small muted">
            {{ gameLine }}
          </p>
          <NuxtLink :to="`/trips/${trip.id}/progress`" class="btn sm ghost pj">
            Progress &amp; journal<AppIcon name="chevr" size="sm" />
          </NuxtLink>
        </div>
      </div>
      <NuxtLink v-if="strip.length" :to="`/trips/${trip.id}/badges`" class="strip">
        <span class="seals" aria-hidden="true">
          <BadgeSeal v-for="b in strip" :key="b.id" :badge="b" :size="32" />
        </span>
        <span class="all">All badges<AppIcon name="chevr" size="sm" /></span>
      </NuxtLink>
    </section>

    <section v-for="g in groups" :key="g.key" class="grp" :aria-labelledby="`more-${g.key}`">
      <h2 :id="`more-${g.key}`" class="gh">
        {{ g.title }}
      </h2>
      <div class="card rows">
        <NuxtLink v-for="r in g.rows" :key="r.to" :to="`/trips/${trip.id}/${r.to}`" class="row-item mrow">
          <span class="ic" :style="{ color: r.tone }"><AppIcon :name="r.icon" /></span>
          <span class="grow tx">
            <b>{{ r.title }}</b>
            <span class="small muted sub">{{ r.sub }}</span>
          </span>
          <AppIcon name="chevr" class="chev" />
        </NuxtLink>
      </div>
    </section>

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
.you { display: flex; flex-direction: column; gap: 12px; }
.you-top { display: flex; align-items: center; gap: 16px; }
.you-r { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.pc { font-size: 17px; font-weight: 600; line-height: 1; }
.pc small { font-size: 11px; }
.pj { margin-top: 6px; }
.strip { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; min-height: 48px; padding-top: 10px; border-top: 1px solid var(--line); color: var(--accent); text-decoration: none; }
.seals { display: flex; gap: 4px; }
.all { display: inline-flex; align-items: center; gap: 2px; margin-left: auto; min-height: 32px; font-weight: 650; font-size: 14px; }
.strip:hover .all { text-decoration: underline; text-underline-offset: 2px; }
.grp { margin-top: 20px; }
.gh { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 4px 8px; }
.rows { overflow: hidden; }
.mrow { min-height: 56px; padding: 8px 14px; gap: 12px; }
/* The card clips its corners, so the focus ring goes inside the row. */
.mrow:focus-visible { outline-offset: -3px; }
.ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: var(--surface-2); flex: none; }
.tx { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.tx b { font-size: 15.5px; }
.sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chev { color: var(--fg-3); }
.about { margin: 20px 0 14px; }
dl { margin: 10px 0 0; display: flex; flex-direction: column; gap: 10px; }
dl div { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 10px; }
dt { color: var(--fg-3); font-size: 13.5px; font-weight: 600; }
dd { margin: 0; }
</style>
