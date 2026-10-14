<script setup lang="ts">
import type { ClaimStep } from '#shared/types/trip'
import { uid } from '#shared/utils/plan'
import { diffDays, fmtRelDay } from '#shared/utils/time'

/**
 * The steps of a claim (spec 5.13): tick them off, give them a date, add your own, remove them. Edits change the
 * claim sheet's copy in place; the sheet saves it.
 */
const steps = defineModel<ClaimStep[]>({ required: true })
const props = defineProps<{ today: string }>()

const text = ref('')
const input = ref<HTMLInputElement | null>(null)

/** "in 55 days", "today", "3 days ago", and how it stands: late when it has passed and isn't done. */
function when(s: ClaimStep): { text: string, tone: string } | null {
  if (!s.due || !props.today) return null
  const n = diffDays(props.today, s.due)
  const rel = fmtRelDay(s.due, props.today)
  if (s.done) return { text: rel, tone: '' }
  if (n < 0) return { text: `${rel}: late`, tone: 'bad' }
  return { text: rel, tone: n <= 3 ? 'warn' : '' }
}

function setDue(s: ClaimStep, value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) s.due = value
  else delete s.due
}

function add() {
  const t = text.value.trim()
  if (!t) {
    input.value?.focus()
    return
  }
  steps.value.push({ id: uid('st'), text: t.slice(0, 200) })
  text.value = ''
}

function remove(s: ClaimStep) {
  const i = steps.value.indexOf(s)
  if (i < 0) return
  const [gone] = steps.value.splice(i, 1)
  if (!gone) return
  toast(`Removed: ${gone.text}`, {
    actions: [{ label: 'Undo', run: () => steps.value.splice(Math.min(i, steps.value.length), 0, gone) }],
  })
}
</script>

<template>
  <div class="steps">
    <ul v-if="steps.length" class="list">
      <li v-for="s in steps" :key="s.id" class="st" :class="{ done: s.done }">
        <div class="st-top">
          <label class="st-check">
            <input v-model="s.done" type="checkbox" class="check" :aria-label="`Done: ${s.text}`">
          </label>
          <span class="st-text">{{ s.text }}</span>
          <button class="btn icon sm plain" type="button" :aria-label="`Remove step: ${s.text}`" @click="remove(s)">
            <AppIcon name="x" size="sm" />
          </button>
        </div>
        <div class="st-due">
          <label v-if="s.due" class="due">
            <span class="small muted">Due</span>
            <input class="input num" type="date" :value="s.due" :aria-label="`Due date: ${s.text}`" @change="setDue(s, ($event.target as HTMLInputElement).value)">
          </label>
          <button v-else class="btn xs plain" type="button" :aria-label="`Add a date: ${s.text}`" @click="setDue(s, today)">
            <AppIcon name="calendar" size="xs" />Add a date
          </button>
          <span v-if="when(s)" class="small rel" :class="when(s)!.tone">{{ when(s)!.text }}</span>
        </div>
      </li>
    </ul>
    <form class="new" @submit.prevent="add">
      <input ref="input" v-model="text" class="input" type="text" maxlength="200" placeholder="Add a step" aria-label="A new step">
      <button class="btn" type="submit">
        Add
      </button>
    </form>
  </div>
</template>

<style scoped>
.steps { display: flex; flex-direction: column; gap: 10px; }
.list { list-style: none; display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.st { display: flex; flex-direction: column; gap: 4px; padding: 6px 6px 10px 4px; }
.st + .st { border-top: 1px solid var(--line); }
.st-top { display: flex; align-items: flex-start; gap: 4px; }
/* A 44 px target around the 24 px box. */
.st-check { flex: none; display: grid; place-items: center; width: 44px; height: 44px; cursor: pointer; }
.st-text { flex: 1 1 auto; min-width: 0; padding-top: 11px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.st.done .st-text { color: var(--fg-2); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--fg-2) 50%, transparent); }
.st-top .btn { flex: none; margin-top: 4px; }
.st-due { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; padding-left: 44px; }
.due { display: flex; align-items: center; gap: 8px; }
.due .input { width: auto; min-width: 0; max-width: 170px; padding: 6px 10px; font-size: 15px; }
.rel { font-weight: 600; color: var(--fg-2); }
.rel.warn { color: var(--warn); }
.rel.bad { color: var(--bad); }
.new { display: flex; gap: 8px; }
.new .input { flex: 1 1 auto; min-width: 0; }
.new .btn { flex: none; }
</style>
