<script setup lang="ts">
import type { InfoBlock } from '#shared/types/trip'

type Kind = Extract<InfoBlock, { t: 'special' }>['kind']
defineProps<{ kind: Kind }>()
const v = useTripView()
const trip = v.trip

// Converter
const a = ref<number | null>(10)
const fx = computed(() => trip.value?.fx)
const b = computed({
  get: () => (a.value === null || !fx.value ? null : Math.round(a.value * fx.value.rate * 100) / 100),
  set: (x: number | null) => {
    a.value = x === null || !fx.value ? null : Math.round((x / fx.value.rate) * 100) / 100
  },
})
const quick = [1, 5, 10, 25, 50, 100]

// Budget
const CATS = [
  { label: 'Sights & tickets', color: 'var(--c-sight)' },
  { label: 'Food & drink', color: 'var(--c-food)' },
  { label: 'Nightlife', color: 'var(--c-night)' },
  { label: 'Transport', color: 'var(--c-move)' },
]
const budget = computed(() => trip.value?.budget ?? [])
const budgetMax = computed(() => Math.max(1, ...budget.value.map(d => d.values.reduce((x, y) => x + y, 0))))
const budgetTotal = computed(() => budget.value.reduce((s, d) => s + d.values.reduce((x, y) => x + y, 0), 0))
const cur = (n: number) => money(n, trip.value?.currency ?? 'EUR')

// Night chart
const NIGHT = [['Aperitivo', 19 * 60, 21 * 60], ['Dinner', 21 * 60, 23 * 60], ['Bars (busiest)', 24 * 60, 26 * 60], ['Clubs (busiest)', 25.5 * 60, 27.5 * 60]] as const
const X0 = 18 * 60
const SPAN = 11 * 60
const nx = (m: number) => ((m - X0) / SPAN) * 100
</script>

<template>
  <!-- Currency converter -->
  <div v-if="kind === 'converter' && fx" class="card pad conv">
    <div class="row wrap cv">
      <label class="field grow">
        <span>{{ trip?.currency }}</span>
        <input v-model.number="a" class="input num" type="number" inputmode="decimal" min="0">
      </label>
      <span class="eq" aria-hidden="true">=</span>
      <label class="field grow">
        <span>{{ fx.homeCurrency }}</span>
        <input v-model.number="b" class="input num" type="number" inputmode="decimal" min="0">
      </label>
    </div>
    <div class="row wrap qk">
      <button v-for="q in quick" :key="q" class="chip num" type="button" :aria-pressed="a === q" @click="a = q">
        {{ cur(q) }}
      </button>
    </div>
    <p class="tiny faint">
      1 {{ trip?.currency }} = {{ fx.rate }} {{ fx.homeCurrency }}<template v-if="fx.source">
        · {{ fx.source }}
      </template>
    </p>
  </div>

  <!-- Packing -->
  <NuxtLink v-else-if="kind === 'packing' && trip" :to="`/trips/${trip.id}/packing`" class="card pad card-link row">
    <AppIcon name="bag" /><span class="grow"><b>Packing list</b><br><span class="small muted">{{ v.summary.value?.packing.done }} of {{ v.summary.value?.packing.total }} packed · tick them off</span></span><AppIcon name="chevr" />
  </NuxtLink>

  <!-- Budget -->
  <div v-else-if="kind === 'budget' && budget.length" class="card pad budget">
    <div class="legend">
      <span v-for="c in CATS" :key="c.label"><i :style="{ background: c.color }" />{{ c.label }}</span>
    </div>
    <div v-for="d in budget" :key="d.dayId" class="brow">
      <span class="bl small strong">{{ d.label }}</span>
      <span class="bbar">
        <span
          v-for="(val, j) in d.values"
          :key="j"
          class="bseg"
          :style="{ width: `${(val / budgetMax) * 100}%`, background: CATS[j]!.color }"
          :title="`${CATS[j]!.label}: ${cur(val)}${d.notes?.[j] ? ` (${d.notes[j]})` : ''}`"
        />
      </span>
      <span class="bv small num">{{ cur(d.values.reduce((x, y) => x + y, 0)) }}</span>
    </div>
    <p class="small muted">
      About <b class="num">{{ cur(budgetTotal) }}</b> for the whole trip, before the hostel<template v-if="trip?.fx">
        (≈ {{ money(budgetTotal * trip.fx.rate, trip.fx.homeCurrency) }})</template>.
    </p>
  </div>

  <!-- Phrases -->
  <div v-else-if="kind === 'phrases' && trip?.phrases?.length" class="card phrases">
    <div v-for="(p, i) in trip.phrases" :key="i" class="ph">
      <button class="btn icon sm round" type="button" :aria-label="`Hear “${p[0]}”`" @click="speak(p[0])">
        <AppIcon name="speaker" size="sm" />
      </button>
      <span class="grow">
        <b>{{ p[0] }}</b>
        <span class="small faint">{{ p[1] }}</span>
        <span class="small muted">{{ p[2] }}</span>
      </span>
    </div>
  </div>

  <!-- Dishes -->
  <div v-else-if="kind === 'dishes' && trip?.dishes?.length" class="dishes">
    <article v-for="d in trip.dishes" :key="d.name" class="card dish">
      <div class="dpic art-frame">
        <SceneArt class="scene" :scene="d.scene" tod="day" :label="d.name" />
      </div>
      <div class="dbody">
        <b>{{ d.name }}</b>
        <span class="small muted">{{ d.sub }}</span>
        <span class="chip" :class="/no pork/i.test(d.pork) ? 't-ok' : 't-warn'">{{ d.pork }}</span>
        <span class="tiny muted">{{ d.where }}</span>
      </div>
    </article>
  </div>

  <!-- Night timeline -->
  <!-- On phones each row puts its name and times above a full-width bar, so nothing is cut short. -->
  <div v-else-if="kind === 'nightChart'" class="card pad night" role="img" aria-label="A Roman night: aperitivo 19:00–21:00, dinner until about 23:00, bars busiest midnight to 02:00, clubs busiest 01:30–03:30">
    <div v-for="r in NIGHT" :key="r[0]" class="nrow">
      <span class="nl small"><span>{{ r[0] }}</span><span class="nt num">{{ fmtClock(r[1]) }}–{{ fmtClock(r[2]) }}</span></span>
      <span class="ntrack">
        <span class="nbar num" :style="{ left: `${nx(r[1])}%`, width: `${nx(r[2]) - nx(r[1])}%` }"><span class="nbt">{{ fmtClock(r[1]) }}–{{ fmtClock(r[2]) }}</span></span>
      </span>
    </div>
    <div class="nrow axis">
      <span class="nl" />
      <span class="ntrack">
        <span v-for="(h, i) in [18, 20, 22, 24, 26, 28]" :key="h" class="axis-tick num" :class="{ thin: i % 2 === 0 }" :style="{ left: `${nx(h * 60)}%` }">{{ fmtClock(h * 60) }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.conv { display: flex; flex-direction: column; gap: 12px; }
.cv { align-items: flex-end; flex-wrap: nowrap; }
.cv .field { flex: 1 1 0; min-width: 0; }
.eq { font-size: 22px; color: var(--fg-3); padding-bottom: 8px; }
.qk { gap: 6px; }
.budget { display: flex; flex-direction: column; gap: 10px; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12.5px; color: var(--fg-2); }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; }
.brow { display: grid; grid-template-columns: 56px minmax(0, 1fr) 64px; gap: 10px; align-items: center; }
.bbar { display: flex; height: 20px; border-radius: 6px; overflow: hidden; background: var(--surface-2); }
.bseg { height: 100%; border-right: 2px solid var(--surface); }
.bv { text-align: right; }
.phrases { display: flex; flex-direction: column; }
.ph { display: flex; gap: 12px; align-items: center; padding: 10px 14px; }
.ph + .ph { border-top: 1px solid var(--line); }
.ph .grow { display: flex; flex-direction: column; }
.dishes { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.dish { overflow: hidden; }
.dpic { height: 110px; }
.dbody { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.night { display: flex; flex-direction: column; gap: 8px; }
.nrow { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 10px; align-items: center; }
.nl { text-align: right; color: var(--fg-2); }
.nt { display: none; }
.ntrack { position: relative; height: 26px; background: repeating-linear-gradient(90deg, var(--surface-2) 0 1px, transparent 1px calc(100% / 11)); border-radius: 6px; }
.nbar { position: absolute; top: 0; bottom: 0; border-radius: 6px; background: var(--c-night); color: #fff; font-size: 11.5px; display: flex; align-items: center; padding: 0 6px; white-space: nowrap; overflow: hidden; }
.axis .ntrack { background: none; height: 16px; }
.axis-tick { position: absolute; transform: translateX(-50%); font-size: 11px; color: var(--fg-3); white-space: nowrap; }
@media (max-width: 599px) {
  /* Every four hours (20:00, 00:00, 04:00), so the labels never run together. */
  .axis-tick.thin { display: none; }
  .night { gap: 10px; }
  .nrow { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .nl { display: flex; justify-content: space-between; gap: 8px; text-align: left; }
  .nt { display: inline; color: var(--fg-2); font-size: 12px; }
  .nbt { display: none; }
  .ntrack { height: 14px; }
  .nbar { border-radius: 4px; }
  .axis { margin-top: -2px; }
  .axis .nl { display: none; }
}
</style>
