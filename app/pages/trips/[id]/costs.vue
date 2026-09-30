<script setup lang="ts">
import type { CostCat } from '#shared/types/trip'
import { COST_CATS, COST_PLANNED, costOfferFor, costToCents, type CostEntry } from '#shared/utils/costs'
import type { ResolvedStop } from '#shared/utils/plan'
import { fmtDate } from '#shared/utils/time'
import { COST_PAD_AFTER, costPadNoDay } from '~/components/CostPad.vue'

/**
 * Costs (spec 4.1): today against its plan, the cost pad, what is still to log, every cost by day, the trip
 * so far, by kind and everything. Numbers: logged money always with cents, plans in lists in whole euros,
 * lira whole and approximate.
 */
const v = useTripView()
const actions = useTripActions()
const sheet = useCostSheet()
const trip = v.trip
const costs = v.costs
const moment = v.moment

const cur = computed(() => trip.value?.currency ?? 'EUR')
const exact = (n: number) => moneyExact(n, cur.value)
const whole = (n: number) => money(n, cur.value, 0)
const cents = costToCents
/** "≈ ₺2,065", or nothing for no money (and for a trip without a rate). */
const home = (n: number) => (cents(n) > 0 ? moneyHome(n, trip.value) : '')
/** A share as a CSS width, 0 to 100 %. */
const pct = (part: number, of: number) => `${of > 0 ? Math.max(0, Math.min(100, (part / of) * 100)) : 0}%`

const phase = computed(() => moment.value?.phase ?? 'before')
const hasBudget = computed(() => (costs.value?.trip.planned ?? 0) > 0)
const todayDay = computed(() => {
  const m = moment.value
  return m?.phase === 'during' && m.dayIndex >= 0 ? trip.value?.days[m.dayIndex] : undefined
})

const kicker = computed(() => {
  const t = trip.value
  const m = moment.value
  if (!t || !m) return ''
  if (m.phase === 'during') return todayDay.value ? `${fmtDate(todayDay.value.date, 'short')} · Day ${m.dayIndex + 1} of ${t.days.length}` : 'On the trip'
  if (m.phase === 'before') return m.daysToStart <= 0 ? 'Today' : m.daysToStart === 1 ? 'Tomorrow' : `In ${m.daysToStart} days`
  return 'Trip done'
})

// ---------- summary card ----------
const today = computed(() => {
  const x = v.todayCosts.value
  const spent = x?.spent ?? 0
  const planned = hasBudget.value ? x?.planned ?? 0 : 0
  const diff = cents(spent) - cents(planned)
  return { spent, planned, over: planned > 0 && diff > 0, diff: Math.abs(diff) / 100 }
})
const dayPlans = computed(() => {
  const t = trip.value
  const s = costs.value
  if (!t || !s) return ''
  return t.days
    .filter(d => (s.byDay[d.id]?.planned ?? 0) > 0)
    .map(d => `${fmtDate(d.date, 'weekday')} ${whole(s.byDay[d.id]!.planned)}`)
    .join(' · ')
})
const budgetLine = computed(() => {
  const n = trip.value?.days.length ?? 0
  const lira = home(costs.value?.trip.planned ?? 0)
  return `for ${n} ${n === 1 ? 'day' : 'days'}${lira ? ` · ${lira}` : ''}`
})

/** What you logged today for where you stay: never compared with the day's plan (D8), so it is named beside it. */
const todayStay = computed(() => {
  const id = todayDay.value?.id
  const sum = (costs.value?.entries ?? []).filter(e => e.dayId === id && e.cat === 'stay').reduce((a, e) => a + cents(e.amount), 0)
  return id ? sum / 100 : 0
})

// ---------- lists ----------
const previewCount = computed(() => (costs.value?.entries ?? []).filter(e => e.source === 'expense' && e.preview).length)

/**
 * Today's done stops with a planned price and nothing logged for them in their own category, newest first
 * like the rest of the page: the stop you just left, the one you most likely paid for, comes first.
 */
const notLogged = computed(() => {
  const plan = v.today.value
  const s = costs.value
  if (!plan || !s) return []
  const out: { stop: ResolvedStop, exact: number }[] = []
  for (const stop of plan.stops) {
    if (plan.states[stop.id] !== 'done') continue
    const offer = costOfferFor(stop, s)
    if (offer) out.push({ stop, exact: (offer.exact ?? 0) > 0 ? offer.exact! : 0 })
  }
  return out.sort((a, b) => b.stop.start - a.stop.start)
})
/** A logged stop leaves the list and the next one's button slides under your finger: a double tap does one. */
const tapOk = tapGuard()
function logIt(x: { stop: ResolvedStop, exact: number }, e: MouseEvent) {
  if (tapOk(e)) actions.logStopCost(x.stop, x.exact)
}
function addFor(x: { stop: ResolvedStop }, e: MouseEvent) {
  if (tapOk(e)) sheet.open({ stopId: x.stop.id, dayId: x.stop.dayId })
}

const BEFORE = 'before'
const AFTER = 'after'

interface CostGroup { key: string, label: string, total: number, entries: CostEntry[] }

/** A cost with no trip day: where "Counts for" put it (older records: after the trip if logged after it). */
function noDayGroup(e: CostEntry): string {
  const t = trip.value
  return t && costPadNoDay(t, e) === COST_PAD_AFTER ? AFTER : BEFORE
}

/** Every cost by day, newest first: after the trip, the trip days from the last, then before the trip. */
const groups = computed<CostGroup[]>(() => {
  const t = trip.value
  const s = costs.value
  if (!t || !s) return []
  const byKey = new Map<string, CostEntry[]>()
  for (const e of s.entries) {
    const key = e.dayId ? `day:${e.dayId}` : noDayGroup(e)
    const list = byKey.get(key)
    if (list) list.push(e)
    else byKey.set(key, [e])
  }
  const out: CostGroup[] = []
  const add = (key: string, label: string) => {
    const entries = byKey.get(key)
    if (entries?.length) out.push({ key, label, entries, total: entries.reduce((a, e) => a + cents(e.amount), 0) / 100 })
  }
  add(AFTER, 'After the trip')
  for (const d of [...t.days].reverse()) add(`day:${d.id}`, `${fmtDate(d.date, 'short')}${d.id === todayDay.value?.id ? ' · today' : ''}`)
  add(BEFORE, 'Before the trip')
  return out
})

const todayEmpty = computed(() => {
  const id = todayDay.value?.id
  return !!id && !(costs.value?.entries ?? []).some(e => e.dayId === id)
})

// ---------- totals ----------
const tripDays = computed(() => {
  const t = trip.value
  const s = costs.value
  if (!t || !s) return []
  const rows = t.days.map((d) => {
    const pair = s.byDay[d.id] ?? { spent: 0, planned: 0 }
    const planned = hasBudget.value ? pair.planned : 0
    const diff = cents(pair.spent) - cents(planned)
    return { id: d.id, label: fmtDate(d.date, 'weekday'), spent: pair.spent, planned, over: planned > 0 && diff > 0, overBy: diff / 100 }
  })
  const max = Math.max(1, ...rows.map(r => Math.max(r.spent, r.planned)))
  return rows.map(r => ({ ...r, spentW: pct(r.spent, max), planW: pct(r.planned, max) }))
})

const kinds = computed(() => {
  const s = costs.value
  if (!s) return []
  return COST_CATS.map((c: CostCat) => {
    const pair = s.byCat[c] ?? { spent: 0, planned: 0 }
    const inPlan = COST_PLANNED[c] !== undefined
    const planned = inPlan && hasBudget.value ? pair.planned : 0
    const diff = cents(pair.spent) - cents(planned)
    return {
      cat: c,
      ...COST_META[c],
      spent: pair.spent,
      planned,
      inPlan,
      over: planned > 0 && diff > 0,
      overBy: diff / 100,
      w: pct(pair.spent, planned),
    }
  })
})

/** A currency's own sign ("€", "₺"), from the app's money format. */
const sign = (code: string) => money(0, code, 0).replace(/[\d\s.,]/g, '') || code
const fxLine = computed(() => {
  const fx = trip.value?.fx
  if (!fx?.homeCurrency || !Number.isFinite(fx.rate) || fx.rate <= 0) return ''
  const rate = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 4 }).format(fx.rate)
  return `1 ${sign(cur.value)} = ${rate} ${sign(fx.homeCurrency)}${fx.source ? ` · ${fx.source}` : ''}`
})
</script>

<template>
  <div v-if="trip && costs" class="page costs">
    <header class="head">
      <p class="kicker">
        {{ kicker }}
      </p>
      <h1 class="h2">
        Costs
      </h1>
    </header>

    <div v-if="previewCount" class="rehearse" role="status">
      <AppIcon name="eye" />
      <span class="grow">{{ previewCount === 1 ? '1 cost was logged while previewing.' : `${previewCount} costs were logged while previewing.` }}</span>
      <button class="btn sm gold" type="button" @click="actions.removePreviewCosts()">
        {{ previewCount === 1 ? 'Remove it' : 'Remove them' }}
      </button>
    </div>

    <div class="cols">
      <div class="col">
        <!-- summary: today during the trip, the budget before it, everything after it -->
        <section v-if="phase === 'during'" class="card sum" aria-label="Today">
          <div class="sum-row">
            <span class="sum-lbl">
              <span class="lbl">Today</span>
              <span v-if="home(today.spent)" class="conv num">{{ home(today.spent) }}</span>
            </span>
            <b class="big num">{{ exact(today.spent) }}</b>
          </div>
          <template v-if="today.planned > 0">
            <span class="bar" aria-hidden="true"><i :class="today.over ? 'warnfill' : 'fill'" :style="{ width: pct(today.spent, today.planned) }" /></span>
            <p class="sum-note tnum" :class="{ over: today.over }">
              <template v-if="today.over">
                <AppIcon name="alert" size="sm" />{{ exact(today.diff) }} over today's plan
              </template>
              <template v-else>
                {{ exact(today.diff) }} left of {{ exact(today.planned) }}
              </template>
            </p>
          </template>
          <p v-else class="sum-note muted">
            No plan for today
          </p>
          <p v-if="todayStay > 0" class="stay tnum">
            + {{ exact(todayStay) }} stay, not in the plan
          </p>
        </section>
        <section v-else-if="phase === 'before' && hasBudget" class="card sum" aria-label="Your budget">
          <div class="sum-row">
            <span class="sum-lbl"><span class="lbl">Your budget</span></span>
            <b class="big num">~{{ whole(costs.trip.planned) }}</b>
          </div>
          <p class="sum-note tnum">
            {{ budgetLine }}
          </p>
          <p class="plans tnum">
            {{ dayPlans }}
          </p>
          <p class="small muted">
            Where you stay isn't included.
          </p>
        </section>
        <section v-else class="card sum" aria-label="All in">
          <div class="sum-row">
            <span class="sum-lbl">
              <span class="lbl">All in</span>
              <span v-if="home(costs.all)" class="conv num">{{ home(costs.all) }}</span>
            </span>
            <b class="big num">{{ exact(costs.all) }}</b>
          </div>
          <p v-if="phase === 'after'" class="sum-note tnum">
            {{ `Trip days ${exact(costs.trip.spent)}${hasBudget ? ` of ~${whole(costs.trip.planned)}` : ''}` }}
          </p>
        </section>

        <section class="card padcard" aria-label="Add a cost">
          <CostPad scope="page" at-now />
        </section>
      </div>

      <div class="col lists">
        <section v-if="notLogged.length" class="blk" aria-labelledby="costs-nl">
          <h2 id="costs-nl" class="bh">
            Not logged yet
          </h2>
          <div class="card rows">
            <div v-for="x in notLogged" :key="x.stop.id" class="nl">
              <span class="nl-t">
                <b>{{ x.stop.title }}</b>
                <span class="small muted tnum">{{ x.stop.cost }}</span>
              </span>
              <button v-if="x.exact" class="btn sm ok" type="button" :aria-label="`Log ${money(x.exact, cur)} for ${x.stop.title}`" @click="logIt(x, $event)">
                Log {{ money(x.exact, cur) }}
              </button>
              <button v-else class="btn sm" type="button" :aria-label="`Add a cost for ${x.stop.title}`" @click="addFor(x, $event)">
                Add
              </button>
            </div>
          </div>
        </section>

        <p v-if="todayEmpty" class="card empty-s">
          Nothing logged today yet. That first espresso counts too.
        </p>
        <p v-else-if="!costs.entries.length" class="card empty-s">
          No costs yet. Type an amount, then tap what it was for.
        </p>

        <section v-for="g in groups" :key="g.key" class="blk" :aria-labelledby="`costs-g-${g.key.replace(':', '-')}`">
          <div class="bhrow">
            <h2 :id="`costs-g-${g.key.replace(':', '-')}`" class="bh">
              {{ g.label }}
            </h2>
            <span class="num strong">{{ exact(g.total) }}</span>
          </div>
          <div class="card rows">
            <CostRow v-for="e in g.entries" :key="e.id" :entry="e" />
          </div>
        </section>

        <section class="blk" aria-labelledby="costs-tsf">
          <div class="bhrow">
            <h2 id="costs-tsf" class="bh">
              Trip so far
            </h2>
            <span class="tnum strong">{{ exact(costs.trip.spent) }}<template v-if="hasBudget"> of ~{{ whole(costs.trip.planned) }}</template></span>
          </div>
          <div class="card pad">
            <ul class="tsf" :class="{ plain: !hasBudget }">
              <li v-for="d in tripDays" :key="d.id" class="tsf-row">
                <span class="dl">{{ d.label }}</span>
                <span v-if="hasBudget" class="bars" aria-hidden="true">
                  <i v-if="d.planned > 0" class="pl" :style="{ width: d.planW }" />
                  <i v-if="d.spent > 0" class="sp" :class="{ over: d.over }" :style="{ width: d.spentW }" />
                </span>
                <span class="dv tnum">
                  <span>{{ exact(d.spent) }}<template v-if="d.planned > 0"> of {{ whole(d.planned) }}</template></span>
                  <span v-if="d.over" class="over">{{ exact(d.overBy) }} over</span>
                </span>
              </li>
            </ul>
            <p v-if="hasBudget" class="legend">
              Dashed: the plan. Solid: what you logged.
            </p>
            <p v-if="costs.byCat.stay.spent > 0" class="legend tnum">
              + {{ exact(costs.byCat.stay.spent) }} stay, not in the plan
            </p>
          </div>
        </section>

        <section class="blk" aria-labelledby="costs-bk">
          <h2 id="costs-bk" class="bh">
            By kind
          </h2>
          <div class="card pad">
            <ul class="kinds">
              <li v-for="k in kinds" :key="k.cat" class="krow">
                <span class="kic" :style="{ color: k.color }"><AppIcon :name="k.icon" /></span>
                <span class="kb">
                  <span class="kt">
                    <b>{{ k.label }}</b>
                    <span class="tnum">{{ exact(k.spent) }}<template v-if="k.planned > 0"> of {{ whole(k.planned) }}</template></span>
                  </span>
                  <span v-if="k.planned > 0" class="bar thin" aria-hidden="true"><i :class="k.over ? 'warnfill' : 'fill'" :style="{ width: k.w }" /></span>
                  <span v-if="k.over" class="over tiny">{{ exact(k.overBy) }} over</span>
                  <span v-if="!k.inPlan" class="tiny muted">not in the plan</span>
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section class="card pad every" aria-labelledby="costs-all">
          <div class="bhrow flat">
            <h2 id="costs-all" class="h3">
              Everything
            </h2>
            <span class="tnum strong">{{ exact(costs.all) }}<template v-if="home(costs.all)"> · {{ home(costs.all) }}</template></span>
          </div>
          <p v-if="fxLine" class="fx tnum">
            {{ fxLine }}
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.costs { padding-top: 10px; }
.head { margin-bottom: 8px; }
.head .h2 { margin-top: 1px; }

.rehearse { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; padding: 10px 12px; margin-bottom: 12px; border-radius: 14px; background: var(--gold-soft); color: var(--gold-ink); font-weight: 600; font-size: 14px; }
.rehearse .i { flex: none; }

.cols { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
@media (min-width: 900px) {
  .cols { grid-template-columns: minmax(340px, 420px) minmax(0, 1fr); gap: 24px; align-items: start; }
}

/* summary */
.sum { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
/* A very long amount takes a line of its own before it would break inside the number. */
.sum-row { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 2px 12px; }
.sum-lbl { display: flex; flex-direction: column; gap: 1px; padding-top: 3px; }
.lbl { font-weight: 650; font-size: 15px; }
.big { margin-left: auto; min-width: 0; max-width: 100%; font-size: min(32px, 9vw); font-weight: 600; line-height: 1.1; letter-spacing: -.02em; overflow-wrap: anywhere; text-align: right; }
.conv { font-size: 13px; color: var(--fg-2); }
.sum-note { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: var(--fg-2); }
.sum-note.over { color: var(--warn); }
.plans { font-size: 13.5px; color: var(--fg); font-weight: 550; }
.stay { font-size: 13px; color: var(--fg-2); }
.bar > i.warnfill { background: var(--warn); }

.padcard { padding: 10px 14px 12px; }
/* Short phones (a browser's toolbars, an iPhone SE or mini): the pad comes first, so every key and category is
   above the tab bar without scrolling; today's total follows it. The shortest also drop the kicker, which the
   header's second line already says. */
@media (max-width: 899px) and (max-height: 820px) {
  .padcard { order: -1; }
}
@media (max-width: 899px) and (max-height: 700px) {
  .head .kicker { display: none; }
}

/* lists */
.blk { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.bh { font-size: 16px; font-weight: 700; letter-spacing: -.005em; }
.bhrow { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.bhrow .strong { font-size: 15px; }
.rows { overflow: hidden; }
.empty-s { padding: 14px 16px; color: var(--fg-2); font-size: 14.5px; }

.nl { display: flex; align-items: center; gap: 12px; padding: 10px 14px; min-height: 56px; }
.nl-t { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; line-height: 1.3; }
.nl-t b { font-weight: 620; overflow-wrap: anywhere; }
.nl .btn { flex: none; }

/* trip so far */
.tsf { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.tsf-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
.tsf.plain .tsf-row { grid-template-columns: 34px minmax(0, 1fr); }
.dl { font-weight: 650; font-size: 13.5px; }
.bars { position: relative; height: 18px; }
.bars > i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 6px; }
.bars > .pl { border: 1.5px dashed var(--fg-3); }
.bars > .sp { top: 4px; bottom: 4px; min-width: 4px; background: var(--accent); }
.bars > .sp.over { background: var(--warn); }
.dv { display: flex; flex-direction: column; align-items: flex-end; font-size: 13px; color: var(--fg); text-align: right; white-space: nowrap; }
.over { color: var(--warn); font-weight: 650; }
.legend { margin-top: 12px; font-size: 12.5px; color: var(--fg-2); }

/* by kind */
.kinds { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.krow { display: flex; align-items: center; gap: 12px; }
.kic { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--surface-2); flex: none; }
.kb { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.kt { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.kt b { font-weight: 650; }
.kt .tnum { font-size: 14px; }

.every { display: flex; flex-direction: column; gap: 6px; }
.bhrow.flat { align-items: baseline; }
.fx { font-size: 12.5px; color: var(--fg-2); }
</style>
