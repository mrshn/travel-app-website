<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'
import type { StopKind } from '#shared/types/trip'
import { costToCents } from '#shared/utils/costs'
import type { ResolvedStop } from '#shared/utils/plan'
import { fmtClock } from '#shared/utils/time'

const v = useTripView()
const route = useRoute()
const router = useRouter()
const sheet = useQueryState('stop')
const actions = useTripActions()
/** What's left: a marked stop leaves the list and the next slides under your finger, so a double tap marks only one. */
const tapOk = tapGuard()
function markLeft(st: ResolvedStop, status: 'done' | 'skipped', e: MouseEvent) {
  if (tapOk(e)) actions.markStop(st, status)
}
const trip = v.trip
const s = v.summary

type View = 'overview' | 'journal' | 'left'
const view = computed<View>({
  get: () => (['overview', 'journal', 'left'].includes(String(route.query.view)) ? String(route.query.view) as View : 'overview'),
  set: (x) => {
    router.replace({ query: { ...route.query, view: x } })
  },
})

const pct = computed(() => Math.round((s.value?.pct ?? 0) * 100))
const kinds = computed(() => {
  const k = s.value?.kinds ?? {}
  return (Object.keys(k) as StopKind[]).filter(x => (k[x]?.total ?? 0) > 0).map(x => ({ kind: x, t: k[x]! }))
})
const w = (n: number, total: number) => (total ? `${(n / total) * 100}%` : '0%')

// Money: the trip days' costs against the plan (the ledger's numbers, as on Costs).
const money2 = (n: number) => money(n, trip.value?.currency ?? 'EUR')
const cents = (n: number) => moneyExact(n, trip.value?.currency ?? 'EUR')
const costs = v.costs
const moneyCard = computed(() => {
  const c = costs.value
  const t = trip.value
  if (!c || !t) return null
  const { spent, planned } = c.trip
  const overCents = planned > 0 ? costToCents(spent) - costToCents(planned) : 0
  // Over the plan says so in words too, not only in amber.
  const note = [overCents > 0 ? `${cents(overCents / 100)} over the plan` : '', spent > 0 ? moneyHome(spent, t) : ''].filter(Boolean).join(' · ')
  return {
    spent: cents(spent),
    planned: planned > 0 ? money2(planned) : '',
    fill: planned > 0 ? `${Math.min(100, (spent / planned) * 100)}%` : '0%',
    over: overCents > 0,
    note,
  }
})
/** What was logged for a stop (any category), from the costs ledger. */
const stopSpent = (stopId: string) => costs.value?.byStop[stopId] ?? 0
/** What a trip day cost (where you stay not included), from the costs ledger. */
const daySpent = (dayId: string) => costs.value?.byDay[dayId]?.spent ?? 0

// Ratings
const topRated = computed(() => {
  const out: { stop: ResolvedStop, rating: number }[] = []
  for (const p of v.plans.value) {
    for (const st of p.stops) {
      const r = v.progress.value.feedback[st.id]?.rating
      if (r) out.push({ stop: st, rating: r })
    }
  }
  return out.sort((a, b) => b.rating - a.rating).slice(0, 5)
})
const tagCounts = computed(() => {
  const c = new Map<string, number>()
  for (const fb of Object.values(v.progress.value.feedback)) for (const t of fb.tags ?? []) c.set(t, (c.get(t) ?? 0) + 1)
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
})

// Journal feed: what you did, rated, wrote or paid for, day by day.
const journal = computed(() => v.plans.value.map((p) => {
  const items = p.stops
    .filter(st => p.states[st.id] === 'done' || p.states[st.id] === 'skipped' || v.progress.value.feedback[st.id] || stopSpent(st.id) > 0)
    .map(st => ({ stop: st, state: p.states[st.id]!, fb: v.progress.value.feedback[st.id], spent: stopSpent(st.id), at: v.progress.value.stops[st.id]?.at }))
  return { plan: p, note: v.progress.value.dayNotes[p.view.day.id], spent: daySpent(p.view.day.id), items }
}).filter(d => d.items.length || d.note?.note || d.note?.rating || d.spent > 0))

const photos = computed(() => {
  const out: string[] = []
  for (const d of journal.value) for (const it of d.items) out.push(...(it.fb?.photos ?? []))
  return out
})

// What's left
const left = computed(() => v.plans.value.map(p => ({
  plan: p,
  missed: p.stops.filter(st => p.states[st.id] === 'missed' && !st.minor),
  upcoming: p.stops.filter(st => ['now', 'next', 'upcoming'].includes(p.states[st.id] ?? '') && !st.minor),
})).filter(d => d.missed.length || d.upcoming.length))
const openBookings = computed(() => (trip.value?.bookings ?? []).filter(b => !v.progress.value.bookings[b.id]))
const openPacking = computed(() => (trip.value?.packing ?? []).filter(x => !v.progress.value.packing[x]))

// Trip note
const tripNote = ref(v.progress.value.tripNote ?? '')
watchDebounced(tripNote, n => v.setTripNote(n), { debounce: 500 })

function stars(n?: number) {
  return n ? '★'.repeat(n) + '☆'.repeat(5 - n) : ''
}

function exportMarkdown() {
  const t = trip.value
  const sum = s.value
  if (!t || !sum) return
  const lines: string[] = []
  lines.push(`# ${t.title}: travel journal`, '')
  const tripSpent = costs.value?.trip.spent ?? 0
  lines.push(`${fmtRange(t.start, t.end)} · ${sum.all.done} of ${sum.all.total} stops done${sum.avgRating ? ` · average ${sum.avgRating.toFixed(1)}/5` : ''}${tripSpent ? ` · ${cents(tripSpent)} spent` : ''}`, '')
  if (v.progress.value.tripNote) lines.push(v.progress.value.tripNote, '')
  for (const p of v.plans.value) {
    const note = v.progress.value.dayNotes[p.view.day.id]
    const spent = daySpent(p.view.day.id)
    lines.push(`## ${fmtDate(p.view.day.date, 'long')}: ${p.view.title || p.view.day.label}`)
    if (note?.rating) lines.push(stars(note.rating))
    if (spent) lines.push(`Spent: ${cents(spent)}`)
    if (note?.note) lines.push('', note.note)
    lines.push('')
    for (const st of p.stops) {
      if (st.minor) continue
      const state = p.states[st.id]
      const fb = v.progress.value.feedback[st.id]
      const paid = stopSpent(st.id)
      const box = state === 'done' ? '[x]' : state === 'skipped' ? '[-]' : '[ ]'
      let line = `- ${box} ${fmtClock(st.start)} ${st.title}`
      if (fb?.rating) line += ` · ${stars(fb.rating)}`
      if (paid) line += ` · ${cents(paid)}`
      if (fb?.tags?.length) line += ` · ${fb.tags.map(x => `#${x.replace(/\s+/g, '')}`).join(' ')}`
      lines.push(line)
      if (fb?.note) lines.push(`  > ${fb.note.replace(/\n/g, '\n  > ')}`)
    }
    lines.push('')
  }
  downloadFile(`${t.id}-journal.md`, lines.join('\n'), 'text/markdown')
}
</script>

<template>
  <div v-if="trip && s" class="page progress">
    <section class="card summary">
      <ProgressRing
        :size="148"
        :stroke="16"
        :total="s.all.total"
        :segments="[
          { value: s.all.done, color: 'var(--ok)', label: 'Done' },
          { value: s.all.skipped, color: 'var(--closed)', label: 'Skipped' },
          { value: s.all.missed, color: 'var(--warn)', label: 'Not marked' },
        ]"
        :label="`${s.all.done} of ${s.all.total} done`"
      >
        <b class="num big">{{ pct }}<small>%</small></b>
        <span class="tiny faint">done</span>
      </ProgressRing>
      <div class="sum-r">
        <p class="kicker">
          Planned vs done
        </p>
        <h1 class="h2">
          {{ s.all.done }} of {{ s.all.total }} stops done
        </h1>
        <ul class="legend">
          <li><i class="sw done" />Done <b class="num">{{ s.all.done }}</b></li>
          <li><i class="sw skipped" />Skipped <b class="num">{{ s.all.skipped }}</b></li>
          <li><i class="sw missed" />Not marked <b class="num">{{ s.all.missed }}</b></li>
          <li><i class="sw left" />Still to come <b class="num">{{ s.all.left }}</b></li>
        </ul>
      </div>
    </section>

    <div class="seg block tabs" role="tablist" aria-label="Progress views">
      <button type="button" role="tab" :aria-selected="view === 'overview'" :aria-pressed="view === 'overview'" @click="view = 'overview'">
        <AppIcon name="pie" size="sm" />Overview
      </button>
      <button type="button" role="tab" :aria-selected="view === 'journal'" :aria-pressed="view === 'journal'" @click="view = 'journal'">
        <AppIcon name="book" size="sm" />Journal
      </button>
      <button type="button" role="tab" :aria-selected="view === 'left'" :aria-pressed="view === 'left'" @click="view = 'left'">
        <AppIcon name="list" size="sm" />What's left
      </button>
    </div>

    <!-- OVERVIEW -->
    <template v-if="view === 'overview'">
      <div class="grid2">
        <section class="card pad">
          <h2 class="h3">
            Day by day
          </h2>
          <div class="days">
            <NuxtLink v-for="d in s.days" :key="d.id" :to="{ path: `/trips/${trip.id}/plan`, query: { day: d.id } }" class="drow">
              <span class="dl"><b>{{ fmtDate(d.date, 'weekday') }} {{ Number(d.date.slice(8)) }}</b><span class="tiny faint ellipsis">{{ d.label }}</span></span>
              <span class="grow stack tight">
                <span class="bar thick">
                  <i class="done" :style="{ width: w(d.tally.done, d.tally.total) }" />
                  <i class="skipped" :style="{ width: w(d.tally.skipped, d.tally.total) }" />
                  <i class="missed" :style="{ width: w(d.tally.missed, d.tally.total) }" />
                </span>
                <span class="tiny muted num">{{ d.tally.done }}/{{ d.tally.total }} done<template v-if="d.rating"> · {{ stars(d.rating) }}</template></span>
              </span>
            </NuxtLink>
          </div>
        </section>

        <section class="card pad">
          <h2 class="h3">
            By kind
          </h2>
          <div class="kinds">
            <div v-for="k in kinds" :key="k.kind" class="krow">
              <span class="kic" :style="{ color: KIND_META[k.kind].color }"><AppIcon :name="KIND_META[k.kind].icon" /></span>
              <span class="grow stack tight">
                <span class="row between"><b class="small">{{ KIND_META[k.kind].plural }}</b><span class="tiny muted num">{{ k.t.done }}/{{ k.t.total }}</span></span>
                <span class="bar"><i class="done" :style="{ width: w(k.t.done, k.t.total) }" /><i class="skipped" :style="{ width: w(k.t.skipped, k.t.total) }" /><i class="missed" :style="{ width: w(k.t.missed, k.t.total) }" /></span>
              </span>
            </div>
          </div>
          <div class="prep">
            <NuxtLink :to="`/trips/${trip.id}/bookings`" class="pp">
              <span class="small strong">Bookings</span><span class="num">{{ s.bookings.done }}/{{ s.bookings.total }}</span>
              <span class="bar thin"><i class="gold" :style="{ width: w(s.bookings.done, s.bookings.total) }" /></span>
            </NuxtLink>
            <NuxtLink :to="`/trips/${trip.id}/packing`" class="pp">
              <span class="small strong">Packing</span><span class="num">{{ s.packing.done }}/{{ s.packing.total }}</span>
              <span class="bar thin"><i class="gold" :style="{ width: w(s.packing.done, s.packing.total) }" /></span>
            </NuxtLink>
          </div>
        </section>

        <section v-if="moneyCard" class="card pad mcard" aria-labelledby="progress-money">
          <div class="row between">
            <h2 id="progress-money" class="h3">
              Money
            </h2>
            <NuxtLink :to="`/trips/${trip.id}/costs`" class="btn sm ghost">
              See costs<AppIcon name="chevr" size="sm" />
            </NuxtLink>
          </div>
          <p class="mline">
            <b class="tnum">{{ moneyCard.spent }}</b><span v-if="moneyCard.planned" class="muted tnum"> of ~{{ moneyCard.planned }}</span>
          </p>
          <span v-if="moneyCard.planned" class="bar" aria-hidden="true"><i :class="moneyCard.over ? 'over' : 'fill'" :style="{ width: moneyCard.fill }" /></span>
          <p v-if="moneyCard.note" class="small muted tnum mnote">
            {{ moneyCard.note }}
          </p>
        </section>

        <section class="card pad">
          <div class="row between">
            <h2 class="h3">
              Ratings
            </h2>
            <span v-if="s.rated" class="chip t-gold"><AppIcon name="star" />{{ s.avgRating.toFixed(1) }} avg · {{ s.rated }} rated</span>
          </div>
          <div v-if="topRated.length" class="top">
            <button v-for="r in topRated" :key="r.stop.id" type="button" class="trow" @click="sheet.open(r.stop.id)">
              <span class="tpic art-frame"><SceneArt class="scene" :scene="sceneFor(r.stop)" :tod="todFor(r.stop.start, r.stop.tod)" /></span>
              <span class="grow ellipsis strong">{{ r.stop.title }}</span>
              <StarRating :model-value="r.rating" :size="14" readonly />
            </button>
          </div>
          <p v-else class="muted small">
            Rate stops as you go (tap a stop, then the stars) and your favourites show up here.
          </p>
          <div v-if="tagCounts.length" class="row wrap tagc">
            <span v-for="[t, n] in tagCounts" :key="t" class="chip">{{ t }} <b class="num">{{ n }}</b></span>
          </div>
        </section>
      </div>
    </template>

    <!-- JOURNAL -->
    <template v-else-if="view === 'journal'">
      <section class="card pad tnote">
        <label class="field">
          <span>Trip note</span>
          <textarea v-model="tripNote" class="textarea" rows="3" placeholder="The story of this trip in a few lines…" />
        </label>
      </section>

      <section v-if="photos.length" class="card pad">
        <h2 class="h3">
          Photos <span class="faint num">{{ photos.length }}</span>
        </h2>
        <div class="pgrid">
          <PhotoThumb v-for="p in photos" :key="p" :id="p" />
        </div>
      </section>

      <div v-if="!journal.length" class="card empty">
        <AppIcon name="book" />
        <h3>Your journal is empty</h3>
        <p>Tick stops off, rate them and add notes or photos; they collect here day by day.</p>
      </div>

      <section v-for="d in journal" :key="d.plan.view.day.id" class="jday">
        <div class="sec-h">
          <h2>{{ fmtDate(d.plan.view.day.date, 'long') }}</h2>
          <span v-if="d.note?.rating || d.spent" class="aside">
            <span v-if="d.note?.rating" class="stars-t">{{ stars(d.note.rating) }}</span>
            <span v-if="d.spent" class="tnum spent-d">Spent: {{ cents(d.spent) }}</span>
          </span>
        </div>
        <p v-if="d.note?.note" class="card pad dnote">
          {{ d.note.note }}
        </p>
        <ol class="feed">
          <li v-for="it in d.items" :key="it.stop.id" class="card fitem" :class="`s-${it.state}`">
            <button type="button" class="fhead" @click="sheet.open(it.stop.id)">
              <span class="num small faint">{{ fmtClock(it.stop.start) }}</span>
              <span class="grow strong">{{ it.stop.title }}</span>
              <StateBadge :state="it.state" />
            </button>
            <div v-if="it.fb || it.spent" class="fbody">
              <div v-if="it.fb?.rating || it.spent" class="row wrap">
                <StarRating v-if="it.fb?.rating" :model-value="it.fb.rating" :size="16" readonly />
                <span v-if="it.spent" class="chip num">{{ cents(it.spent) }}</span>
              </div>
              <p v-if="it.fb?.note" class="fnote">
                {{ it.fb.note }}
              </p>
              <div v-if="it.fb?.tags?.length" class="row wrap">
                <span v-for="t in it.fb.tags" :key="t" class="chip">{{ t }}</span>
              </div>
              <div v-if="it.fb?.photos?.length" class="pgrid small-grid">
                <PhotoThumb v-for="p in it.fb.photos" :key="p" :id="p" />
              </div>
            </div>
          </li>
        </ol>
      </section>

      <div class="row wrap exp">
        <button class="btn ghost" type="button" @click="exportMarkdown">
          <AppIcon name="download" size="sm" />Download journal (.md)
        </button>
      </div>
    </template>

    <!-- WHAT'S LEFT -->
    <template v-else>
      <div v-if="!left.length && !openBookings.length && !openPacking.length" class="card empty">
        <AppIcon name="flag" />
        <h3>Nothing left</h3>
        <p>Every stop is marked. What a trip.</p>
      </div>
      <section v-for="d in left" :key="d.plan.view.day.id">
        <div class="sec-h">
          <h2>{{ fmtDate(d.plan.view.day.date, 'long') }}</h2>
          <span class="aside">{{ d.upcoming.length }} to come<template v-if="d.missed.length"> · {{ d.missed.length }} not marked</template></span>
        </div>
        <div class="card rows">
          <div v-for="st in d.missed" :key="st.id" class="row-item lrow">
            <span class="num small faint tm">{{ fmtClock(st.start) }}</span>
            <button type="button" class="grow link-like" @click="sheet.open(st.id)">
              <span class="ellipsis">{{ st.title }}</span>
            </button>
            <span class="chip t-warn hide-xs">Not marked</span>
            <button class="btn xs ok" type="button" @click="markLeft(st, 'done', $event)">
              Did it
            </button>
            <button class="btn xs" type="button" @click="markLeft(st, 'skipped', $event)">
              Skipped
            </button>
          </div>
          <div v-for="st in d.upcoming" :key="st.id" class="row-item lrow">
            <span class="num small faint tm">{{ fmtClock(st.start) }}</span>
            <button type="button" class="grow link-like" @click="sheet.open(st.id)">
              <span class="ellipsis">{{ st.title }}</span>
            </button>
            <StateBadge v-if="d.plan.states[st.id] !== 'upcoming'" :state="d.plan.states[st.id]!" />
            <button class="btn xs icon" type="button" :aria-label="`Mark ${st.title} as done`" @click="markLeft(st, 'done', $event)">
              <AppIcon name="check" size="xs" />
            </button>
          </div>
        </div>
      </section>
      <section v-if="openBookings.length || openPacking.length">
        <div class="sec-h">
          <h2>Before you go</h2>
        </div>
        <div class="grid2">
          <NuxtLink v-if="openBookings.length" :to="`/trips/${trip.id}/bookings`" class="card pad card-link row">
            <AppIcon name="ticket" /><span class="grow"><b>{{ openBookings.length }} bookings</b> not done</span><AppIcon name="chevr" />
          </NuxtLink>
          <NuxtLink v-if="openPacking.length" :to="`/trips/${trip.id}/packing`" class="card pad card-link row">
            <AppIcon name="bag" /><span class="grow"><b>{{ openPacking.length }} things</b> not packed</span><AppIcon name="chevr" />
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.progress { padding-top: 16px; }
.summary { display: flex; align-items: center; gap: 22px; padding: 18px; flex-wrap: wrap; }
.big { font-size: 38px; font-weight: 600; line-height: 1; }
.big small { font-size: 18px; }
.sum-r { flex: 1 1 220px; display: flex; flex-direction: column; gap: 6px; }
.legend { list-style: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 14px; margin-top: 6px; }
.legend li { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.legend b { margin-left: auto; }
.sw { display: inline-block; width: 12px; height: 12px; border-radius: 4px; flex: none; }
.sw.done { background: var(--ok); }
.sw.skipped { background: var(--closed); opacity: .6; }
.sw.missed { background: var(--warn); opacity: .75; }
.sw.left { background: var(--surface-2); outline: 1px solid var(--line); }
.tabs { margin: 16px 0; }
/* Touch targets of at least 44 px: the view tabs, the day and prep rows, rated stops, stop names. */
.tabs button { min-height: 44px; }
@media (max-width: 420px) { .tabs :deep(.i) { display: none; } }
.grid2 { display: grid; gap: 14px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 820px) { .grid2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.days, .kinds, .top { display: flex; flex-direction: column; gap: 12px; margin-top: 14px; }
.drow { display: flex; align-items: center; gap: 12px; min-height: 44px; text-decoration: none; color: var(--fg); }
.dl { width: 76px; display: flex; flex-direction: column; flex: none; }
.krow { display: flex; align-items: center; gap: 12px; }
.kic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--surface-2); flex: none; }
.prep { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--line); }
.pp { display: grid; grid-template-columns: 1fr auto; align-content: center; gap: 6px; min-height: 44px; text-decoration: none; color: var(--fg); }
.pp .bar { grid-column: 1 / -1; }
.mcard { display: flex; flex-direction: column; gap: 10px; }
.mline { font-size: 15px; }
.mline b { font-size: 24px; font-weight: 700; letter-spacing: -.01em; }
.bar > i.over { background: var(--warn); }
.spent-d { font-size: 13px; color: var(--fg-2); font-weight: 600; }
.aside .stars-t + .spent-d { margin-left: 8px; }
.trow { display: flex; align-items: center; gap: 12px; min-height: 44px; background: none; border: 0; padding: 0; text-align: left; color: var(--fg); }
/* Only the title gives way to a long name: the stars, badges and buttons beside it keep their size. */
.trow > :not(.grow), .lrow > :not(.grow) { flex: none; }
.tpic { width: 40px; height: 40px; border-radius: 10px; flex: none; }
.tagc { margin-top: 14px; gap: 6px; }
.tnote { margin-bottom: 14px; }
.pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; margin-top: 12px; }
.pgrid.small-grid { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); margin-top: 4px; }
.dnote { margin-bottom: 10px; white-space: pre-wrap; }
.feed { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.fitem { overflow: hidden; }
.fhead { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px 14px; background: none; border: 0; text-align: left; color: var(--fg); }
.fhead:hover { background: var(--surface-2); }
.fitem.s-skipped .fhead .strong { color: var(--fg-3); text-decoration: line-through; }
.fbody { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 8px; }
.fnote { white-space: pre-wrap; font-size: 15px; }
.exp { margin-top: 20px; }
/* "Before you go": .card-link would make these links blocks; they are rows (icon, text, chevron at the end). */
.card-link.row { display: flex; }
.tm { width: 44px; flex: none; }
.lrow { padding-top: 6px; padding-bottom: 6px; }
.link-like { display: flex; align-items: center; min-height: 44px; background: none; border: 0; padding: 0; text-align: left; color: var(--fg); font-weight: 600; }
.link-like:hover { color: var(--accent); }
.stars-t { color: var(--gold); letter-spacing: .08em; }
@media (max-width: 420px) { .hide-xs { display: none; } }
</style>
