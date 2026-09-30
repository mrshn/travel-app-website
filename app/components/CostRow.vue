<script setup lang="ts">
import type { CostCat } from '#shared/types/trip'
import { costCatForKind, costLegacyId, type CostEntry } from '#shared/utils/costs'
import { findStop, resolveStop } from '#shared/utils/plan'
import { fmtClock, tripMoment, zoned } from '#shared/utils/time'

/**
 * One cost in a list (the Costs page, a stop's "Costs here"): when, what kind, what for and how much.
 * A tap opens it in the cost sheet to edit.
 */
const props = defineProps<{ entry: CostEntry }>()
const v = useTripView()
const sheet = useCostSheet()
const trip = v.trip

const cur = computed(() => trip.value?.currency ?? 'EUR')
const meta = computed(() => COST_META[props.entry.cat] ?? COST_META.other)

/** The category a cost for this stop gets (from its picked option), or null when the stop is gone. */
function stopCat(stopId: string): CostCat | null {
  const hit = v.locate(stopId)?.stop
  if (hit) return costCatForKind(hit.kind)
  const t = trip.value
  const found = t ? findStop(t, stopId) : null
  return found ? costCatForKind(resolveStop(found.stop, v.progress.value.choices ?? {}).kind) : null
}

/** The category a cost for this booking gets: its plan stop's kind, else Sights; null when the booking is gone. */
function bookingCat(bookingId: string): CostCat | null {
  for (const plan of v.plans.value) {
    const s = plan.stops.find(x => x.bookingId === bookingId)
    if (s) return costCatForKind(s.kind)
  }
  return trip.value?.bookings.some(b => b.id === bookingId) ? 'sights' : null
}

/**
 * An old value, or the record that took it over once you edited it (under its fixed legacy id). Its time is
 * made up for the order of the list (the stop's planned start, 23:59 for a day's), not when it was paid.
 */
const fromLegacy = computed(() => props.entry.source === 'legacy' || props.entry.id.startsWith('legacy-'))
/** A day's old "Other spending", before or after an edit. */
const dayValue = computed(() => fromLegacy.value && props.entry.id.startsWith(costLegacyId('day', '')))

/**
 * The note; else the linked stop or booking when its category is the cost's (a stop or booking that is gone
 * keeps the title it had); else the category, with " · at {stop}" when linked.
 */
const title = computed(() => {
  const e = props.entry
  const label = meta.value.label
  if (e.note) return e.note
  if (dayValue.value && !e.stopId && !e.bookingId) return e.title || 'Other spending'
  if (e.stopId) {
    if (!e.title) return label
    const cat = stopCat(e.stopId)
    return cat === null || cat === e.cat ? e.title : `${label} · at ${e.title}`
  }
  if (e.bookingId && e.title) {
    const cat = bookingCat(e.bookingId)
    return cat === null || cat === e.cat ? e.title : `${label} · ${e.title}`
  }
  return label
})

/** The category's name under the title, unless the title already is it. */
const kindLine = computed(() => (title.value === meta.value.label || title.value.startsWith(`${meta.value.label} · `) ? '' : meta.value.label))

function clockOf(ms: number): string {
  const t = trip.value
  return t && Number.isFinite(ms) && ms > 0 ? fmtClock(zoned(new Date(ms), t.timezone).minutes) : ''
}

/**
 * The time it was logged. An old stop value shows the stop's planned start, an old day value none, also
 * once edited (their time isn't a payment's, so never "Paid before" either).
 * A cost paid before the day it counts to (a ticket bought ahead) says "Paid before".
 */
const time = computed(() => {
  const e = props.entry
  const t = trip.value
  if (!t) return ''
  if (fromLegacy.value) return e.stopId && e.dayId && !dayValue.value ? clockOf(e.sortAt) : ''
  if (!e.preview && e.dayId && Number.isFinite(e.sortAt) && e.sortAt > 0) {
    const day = t.days.find(d => d.id === e.dayId)
    if (day && tripMoment(t, new Date(e.sortAt)).dayDate < day.date) return 'Paid before'
  }
  return clockOf(e.sortAt)
})

const home = computed(() => moneyHome(props.entry.amount, trip.value))
</script>

<template>
  <button type="button" class="crow" @click="sheet.openEdit(entry.id)">
    <span class="tm" :class="{ ahead: time === 'Paid before' }">{{ time }}</span>
    <span class="ic" :style="{ color: meta.color }"><AppIcon :name="meta.icon" /></span>
    <span class="mid">
      <span class="ttl">{{ title }}</span>
      <span v-if="kindLine || entry.source === 'legacy' || entry.preview" class="sub">
        <span v-if="kindLine">{{ kindLine }}</span>
        <span v-if="entry.source === 'legacy'" class="tag">Logged earlier</span>
        <span v-else-if="entry.preview" class="tag gold">Preview</span>
      </span>
    </span>
    <span class="amt">
      <b class="num">{{ moneyExact(entry.amount, cur) }}</b>
      <span v-if="home" class="conv num">{{ home }}</span>
    </span>
  </button>
</template>

<style scoped>
.crow {
  display: grid;
  grid-template-columns: 40px 30px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 10px;
  width: 100%;
  min-height: 56px;
  padding: 9px 14px;
  background: none;
  border: 0;
  text-align: left;
  color: var(--fg);
  touch-action: manipulation;
}
@media (hover: hover) { .crow:hover { background: var(--surface-2); } }
.crow:active { background: var(--surface-2); }
.crow:focus-visible { outline-offset: -3px; }
.tm { font: 500 12.5px/1.2 var(--font-data); color: var(--fg-2); font-variant-numeric: tabular-nums; }
.tm.ahead { font: 600 11px/1.15 var(--font-text); }
.ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--surface-2); }
.ic .i { width: 17px; height: 17px; }
.mid { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ttl { font-weight: 620; line-height: 1.3; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sub { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; font-size: 12.5px; color: var(--fg-2); line-height: 1.2; }
.tag { display: inline-flex; align-items: center; min-height: 20px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--line); color: var(--fg-2); font-size: 12px; font-weight: 600; }
.tag.gold { background: var(--gold-soft); border-color: transparent; color: var(--gold-ink); }
.amt { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; white-space: nowrap; }
.amt b { font-size: 15px; font-weight: 600; }
.conv { font-size: 12px; color: var(--fg-2); }
@media (max-width: 359px) {
  .crow { grid-template-columns: 36px 26px minmax(0, 1fr) auto; column-gap: 8px; padding: 9px 12px; }
  .ic { width: 26px; height: 26px; }
  .ic .i { width: 15px; height: 15px; }
}
</style>
