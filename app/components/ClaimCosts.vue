<script setup lang="ts">
import type { CostEntry } from '#shared/utils/costs'
import { changesDayLabel } from '#shared/utils/changes'
import { COST_PAD_AFTER, costPadNoDay } from '~/components/CostPad.vue'

/**
 * A claim's receipts (spec 5.13): costs from the Costs ledger, each with a switch "Part of this claim" that writes its
 * Expense.claimId. An old "Logged earlier" value becomes a record under its own id first, as an edit makes it. "Add a
 * cost" opens the cost sheet over the claim; what you log there is part of the claim.
 */
const props = defineProps<{ claimId: string, currency: string }>()
const v = useTripView()
const costSheet = useCostSheet()

const all = computed<CostEntry[]>(() => v.costs.value?.entries ?? [])
const claimOf = (e: CostEntry) => e.expense?.claimId
const linked = computed(() => all.value.filter(e => claimOf(e) === props.claimId))
const others = computed(() => all.value.filter(e => claimOf(e) !== props.claimId))
const sum = computed(() => linked.value.reduce((a, e) => a + Math.round(e.amount * 100), 0) / 100)
const more = ref(false)
const MANY = 12
const showAll = ref(false)
const shownOthers = computed(() => (showAll.value ? others.value : others.value.slice(0, MANY)))

/** Another live claim's title, for a cost that is part of it. */
function otherClaim(e: CostEntry): string {
  const id = claimOf(e)
  const c = id ? v.progress.value.claims?.[id] : undefined
  return c && !c.deleted ? c.title || 'another claim' : ''
}

function titleOf(e: CostEntry): string {
  return e.note || e.title || COST_META[e.cat]?.label || 'A cost'
}
function whenOf(e: CostEntry): string {
  const t = v.trip.value
  const d = e.dayId ? t?.days.find(x => x.id === e.dayId) : undefined
  const day = d ? changesDayLabel(d.date) : t && costPadNoDay(t, e) === COST_PAD_AFTER ? 'After the trip' : 'Before the trip'
  return [day, COST_META[e.cat]?.label].filter(Boolean).join(' · ')
}

function toggle(e: CostEntry, on: boolean) {
  const t = v.trip.value
  if (!t) return
  const claimId = on ? props.claimId : undefined
  if (e.source === 'expense') {
    v.updateExpense(e.id, { claimId })
    return
  }
  if (!on) return
  // An old value: a record under its legacy id takes it over (as saveCost does), now part of the claim.
  v.addExpense({
    id: e.id,
    amount: e.amount,
    currency: t.currency,
    cat: e.cat,
    dayId: e.dayId,
    stopId: e.stopId,
    title: e.title,
    note: e.note,
    claimId: props.claimId,
    at: Number.isFinite(e.sortAt) && e.sortAt > 0 ? new Date(e.sortAt).toISOString() : undefined,
  })
}

function addCost() {
  costSheet.open()
}
</script>

<template>
  <div class="costs">
    <p v-if="linked.length" class="lc-sum tnum">
      <span>{{ linked.length === 1 ? '1 cost' : `${linked.length} costs` }} linked</span>
      <b>{{ moneyExact(sum, currency) }}</b>
    </p>
    <ul v-if="linked.length" class="list">
      <li v-for="e in linked" :key="e.id">
        <label class="lc">
          <span class="tx">
            <b class="t">{{ titleOf(e) }}</b>
            <span class="small muted">{{ whenOf(e) }}</span>
          </span>
          <b class="amt num">{{ moneyExact(e.amount, currency) }}</b>
          <input type="checkbox" role="switch" class="switch" checked :aria-label="`Part of this claim: ${titleOf(e)}, ${moneyExact(e.amount, currency)}`" @change="toggle(e, ($event.target as HTMLInputElement).checked)">
        </label>
      </li>
    </ul>
    <p v-else class="small muted">
      No costs linked yet. Link what you paid because of this: a new ticket, meals, a taxi, a night you lost.
    </p>

    <div class="acts">
      <button class="btn sm" type="button" @click="addCost">
        <AppIcon name="plus" size="sm" />Add a cost
      </button>
      <button v-if="others.length" class="btn sm plain" type="button" :aria-expanded="more" @click="more = !more">
        <AppIcon :name="more ? 'chevu' : 'chev'" size="sm" />{{ more ? 'Hide your other costs' : `Link from your costs (${others.length})` }}
      </button>
    </div>

    <ul v-if="more && others.length" class="list">
      <li v-for="e in shownOthers" :key="e.id">
        <label class="lc">
          <span class="tx">
            <b class="t">{{ titleOf(e) }}</b>
            <span class="small muted">{{ whenOf(e) }}<template v-if="otherClaim(e)"> · in {{ otherClaim(e) }}</template></span>
          </span>
          <b class="amt num">{{ moneyExact(e.amount, currency) }}</b>
          <input type="checkbox" role="switch" class="switch" :aria-label="`Part of this claim: ${titleOf(e)}, ${moneyExact(e.amount, currency)}`" @change="toggle(e, ($event.target as HTMLInputElement).checked)">
        </label>
      </li>
    </ul>
    <button v-if="more && others.length > MANY && !showAll" class="btn sm plain" type="button" @click="showAll = true">
      Show all {{ others.length }}
    </button>
  </div>
</template>

<style scoped>
.costs { display: flex; flex-direction: column; gap: 10px; }
.lc-sum { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 14px; color: var(--fg-2); }
.lc-sum b { color: var(--fg); font-size: 15px; }
.list { list-style: none; display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.list li + li { border-top: 1px solid var(--line); }
.lc { display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 8px 12px; cursor: pointer; }
.tx { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; line-height: 1.3; }
.t { font-weight: 600; overflow-wrap: anywhere; }
.amt { flex: none; font-size: 14.5px; font-weight: 600; }
.acts { display: flex; flex-wrap: wrap; gap: 8px; }

/* A switch: 44 x 26, the knob on the right when on. */
.switch {
  appearance: none;
  -webkit-appearance: none;
  flex: none;
  position: relative;
  width: 44px;
  height: 26px;
  margin: 0;
  border-radius: 999px;
  border: 2px solid var(--fg-3);
  background: var(--surface);
  cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
}
.switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: var(--fg-3); transition: transform .15s ease, background .15s ease; }
.switch:checked { background: var(--ok); border-color: var(--ok); }
.switch:checked::after { transform: translateX(18px); background: var(--ok-ink); }
.switch:focus-visible { outline: 2.5px solid var(--accent); outline-offset: 2px; }
</style>
