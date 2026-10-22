<script setup lang="ts">
import type { ClaimLine, ClaimOdds } from '#shared/types/trip'
import { CLAIM_ODDS } from '#shared/utils/claims'
import { costParseAmount } from '#shared/utils/costs'
import { uid } from '#shared/utils/plan'

/**
 * The amounts of a claim (spec 5.13): what for, how much, how likely it is to be paid and, once something was paid,
 * what. Edits change the claim sheet's copy in place; the sheet saves it.
 */
const lines = defineModel<ClaimLine[]>({ required: true })
const props = defineProps<{ currency: string, showPaid: boolean }>()

const ODDS = Object.entries(CLAIM_ODDS) as [ClaimOdds, string][]
const symbol = computed(() => money(0, props.currency, 0).replace(/[\d\s.,]/g, '') || props.currency)
const root = ref<HTMLElement | null>(null)

/** What you are typing in an amount, kept as typed until you leave the field ("3,5" stays "3,5"). */
const typing = reactive<Record<string, string>>({})
const key = (l: ClaimLine, f: 'amount' | 'paid') => `${l.id}:${f}`

function shown(l: ClaimLine, f: 'amount' | 'paid'): string {
  const k = key(l, f)
  if (k in typing) return typing[k]!
  const n = l[f]
  return typeof n === 'number' && n > 0 ? n.toFixed(2) : ''
}

function typed(l: ClaimLine, f: 'amount' | 'paid', text: string) {
  typing[key(l, f)] = text
  const t = text.trim()
  if (!t) {
    if (f === 'amount') l.amount = 0
    else delete l.paid
    return
  }
  const n = costParseAmount(t)
  if (n !== null) l[f] = n
}

function left(l: ClaimLine, f: 'amount' | 'paid') {
  delete typing[key(l, f)]
}

async function add() {
  lines.value.push({ id: uid('ln'), label: '', amount: 0, currency: props.currency, odds: 'likely' })
  await nextTick()
  const all = root.value?.querySelectorAll<HTMLInputElement>('.ln-label')
  all?.[all.length - 1]?.focus()
}

function remove(l: ClaimLine) {
  const i = lines.value.indexOf(l)
  if (i < 0) return
  const [gone] = lines.value.splice(i, 1)
  if (!gone) return
  toast(`Removed: ${gone.label || 'an amount'}`, {
    actions: [{ label: 'Undo', run: () => lines.value.splice(Math.min(i, lines.value.length), 0, gone) }],
  })
}
</script>

<template>
  <div ref="root" class="lines">
    <div v-for="(l, i) in lines" :key="l.id" class="ln">
      <input v-model="l.label" class="input ln-label" type="text" maxlength="80" placeholder="What for" :aria-label="`Amount ${i + 1}: what for`">
      <div class="ln-row" :class="{ paid: showPaid }">
        <label class="money-in">
          <span class="sym" aria-hidden="true">{{ symbol }}</span>
          <input
            class="input num"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
            :value="shown(l, 'amount')"
            :aria-label="`${l.label || `Amount ${i + 1}`}: amount in ${currency}`"
            @input="typed(l, 'amount', ($event.target as HTMLInputElement).value)"
            @blur="left(l, 'amount')"
          >
        </label>
        <select v-model="l.odds" class="select" :aria-label="`${l.label || `Amount ${i + 1}`}: how likely`">
          <option v-for="[k, label] in ODDS" :key="k" :value="k">
            {{ label }}
          </option>
        </select>
        <button class="btn icon plain rm" type="button" :aria-label="`Remove ${l.label || `amount ${i + 1}`}`" @click="remove(l)">
          <AppIcon name="x" size="sm" />
        </button>
        <label v-if="showPaid" class="money-in paid-in">
          <span class="sym">Paid {{ symbol }}</span>
          <input
            class="input num"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
            :value="shown(l, 'paid')"
            :aria-label="`${l.label || `Amount ${i + 1}`}: paid back`"
            @input="typed(l, 'paid', ($event.target as HTMLInputElement).value)"
            @blur="left(l, 'paid')"
          >
        </label>
      </div>
    </div>
    <p v-if="!lines.length" class="small muted">
      No amounts yet.
    </p>
    <button class="btn sm ghost add" type="button" @click="add">
      <AppIcon name="plus" size="sm" />Add an amount
    </button>
  </div>
</template>

<style scoped>
.lines { display: flex; flex-direction: column; gap: 10px; }
.ln { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.ln-label { font-weight: 600; }
/* Amount, how likely, remove; what was paid on a row of its own. */
.ln-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 44px; gap: 8px; align-items: center; }
.rm { color: var(--fg-2); }
.paid-in { grid-column: 1 / -1; }
.money-in { position: relative; display: flex; align-items: center; min-width: 0; }
.money-in .sym { position: absolute; left: 12px; font: 600 15px/1 var(--font-data); color: var(--fg-2); pointer-events: none; }
.money-in .input { padding-left: 30px; }
.paid-in .input { padding-left: 64px; }
.paid-in .sym { font-family: var(--font-text); font-size: 14px; }
.add { align-self: flex-start; }
</style>
