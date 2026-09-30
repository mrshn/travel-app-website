<script lang="ts">
import type { CostCat, StopKind, Trip } from '#shared/types/trip'
import type { CostEntry } from '#shared/utils/costs'
import { tripMoment } from '#shared/utils/time'

/** "Counts for" values for a cost with no trip day (both store no dayId; the record keeps `when`). */
export const COST_PAD_BEFORE = '@before'
export const COST_PAD_AFTER = '@after'

/**
 * Where a cost with no trip day belongs: after the trip when it says so (`when`, the pad's choice), or, for
 * older records without it, when it was logged after the trip had ended; else before the trip.
 */
export function costPadNoDay(trip: Pick<Trip, 'start' | 'end' | 'timezone' | 'days'>, e: Pick<CostEntry, 'sortAt' | 'expense'>): typeof COST_PAD_BEFORE | typeof COST_PAD_AFTER {
  const when = e.expense?.when
  if (when === 'after' || when === 'before') return when === 'after' ? COST_PAD_AFTER : COST_PAD_BEFORE
  return Number.isFinite(e.sortAt) && e.sortAt > 0 && tripMoment(trip, new Date(e.sortAt)).phase === 'after' ? COST_PAD_AFTER : COST_PAD_BEFORE
}

/** Kinds of stop a cost can be "at" (a walk or a metro ride on now is not something you pay at). */
const AT_KINDS: readonly StopKind[] = ['sight', 'food', 'night']
/** How long after its planned end a stop still takes a cost of its own kind from the "At" link: lunch paid late. */
const AT_LATE_MIN = 90

/**
 * What a cost is linked to, shown on the pad: the stop on now ("At …", with `atNow`) or what the sheet was
 * opened for ("For: …"). × on "For" emits `unlink`; × on "At" unlinks it on the pad.
 */
export interface CostPadLink {
  kind: 'at' | 'for'
  title: string
  stopId?: string
  bookingId?: string
  /** The trip day it belongs to. An "At" link shows only while the pad counts for that day. */
  dayId?: string
  /** The category that fits it: a gold ring in add mode. */
  cat?: CostCat
}

/** Keys of the keypad, in reading order. */
const COST_PAD_KEYS = [
  { key: '1', label: '1' }, { key: '2', label: '2' }, { key: '3', label: '3' },
  { key: '4', label: '4' }, { key: '5', label: '5' }, { key: '6', label: '6' },
  { key: '7', label: '7' }, { key: '8', label: '8' }, { key: '9', label: '9' },
  { key: '.', label: 'Decimal point' }, { key: '0', label: '0' }, { key: 'back', label: 'Delete last digit' },
] as const

/** A category tap this soon after a save, with no amount, is the second tap of a double tap: ignored. */
const DOUBLE_TAP_MS = 700
</script>

<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { COST_CATS, costCatForKind, costLoggedFor, costParseAmount, costPadInput } from '#shared/utils/costs'
import type { ResolvedStop } from '#shared/utils/plan'
import { fmtDate } from '#shared/utils/time'

/**
 * The cost pad (spec 4.2): the amount on an in-app keypad, the day it counts for, an optional note, then
 * what it was for. In add mode a category tap saves; in edit mode categories are toggles and Save or Delete
 * commit. Used inline on the Costs page and inside the cost sheet.
 */
const props = withDefaults(defineProps<{
  mode?: 'add' | 'edit'
  /** 'page': keys typed on the page go here while no sheet is open. 'sheet': keys typed in its sheet. */
  scope?: 'page' | 'sheet'
  /** The cost being edited (edit mode): an expense id or a legacy id. */
  editId?: string
  link?: CostPadLink | null
  /**
   * Add mode, with no `link`: link the cost to the sight, food or night stop on now ("At …"), as on the Costs
   * page. That is only the plan's guess of where you are, so it takes only a cost of its own kind (tapCat).
   */
  atNow?: boolean
  /** The amount to start with (edit: the cost's; add: a planned price). */
  amount?: number
  /** Planned amounts offered as quick picks. */
  picks?: readonly number[]
  /** Edit mode: the cost's category. */
  cat?: CostCat
  /** The day to start with: a trip day id, COST_PAD_BEFORE or COST_PAD_AFTER; else today, before or after by the clock. */
  day?: string
  note?: string
}>(), { mode: 'add', scope: 'page', link: null, picks: () => [] })

const emit = defineEmits<{ saved: [id: string], deleted: [], unlink: [] }>()

const v = useTripView()
const actions = useTripActions()
const clock = useClock()

const root = ref<HTMLElement | null>(null)
const noteEl = ref<HTMLInputElement | null>(null)
const keys = COST_PAD_KEYS

// Toasts keep clear of the pad while it is on screen, so a quick second tap can't land on one (or on its Undo).
const toasts = useToasts()
let unclear: (() => void) | undefined
onMounted(() => {
  if (root.value) unclear = toasts.keepClear(root.value)
})
onBeforeUnmount(() => unclear?.())

const cur = computed(() => v.trip.value?.currency ?? 'EUR')
/** The currency's own sign ("€"), from the app's money format. */
const symbol = computed(() => money(0, cur.value, 0).replace(/[\d\s.,]/g, '') || cur.value)

// ---------- amount ----------
/** An amount as the keypad would have typed it: "18", "1.50"; edit mode always shows cents ("12.00"). */
function padText(n: number | undefined, cents = false): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return ''
  return cents || n % 1 !== 0 ? n.toFixed(2) : String(n)
}
const text = ref(padText(props.amount, props.mode === 'edit'))
/** A given amount (prefilled or picked): the next digit starts a new one, as on a calculator. */
const fresh = ref(text.value !== '')
const amount = computed(() => costParseAmount(text.value))
const shown = computed(() => {
  const [whole = '', frac] = text.value.split('.')
  const w = (whole || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return frac === undefined ? w : `${w}.${frac}`
})
const home = computed(() => (amount.value ? moneyHome(amount.value, v.trip.value) : ''))
/** Characters in the amount as shown, which sizes its font. */
const len = computed(() => symbol.value.length + (text.value ? shown.value.length : 1))

const warn = ref('')
let lastSave = Number.NEGATIVE_INFINITY

function press(key: string) {
  warn.value = ''
  if (fresh.value && key !== 'back') text.value = ''
  fresh.value = false
  text.value = costPadInput(text.value, key)
}

function pick(n: number) {
  warn.value = ''
  text.value = padText(n)
  fresh.value = true
}

// ---------- day ----------
const dayOptions = computed(() => {
  const out = [{ value: COST_PAD_BEFORE, label: 'Before the trip' }]
  for (const d of v.trip.value?.days ?? []) out.push({ value: d.id, label: `${fmtDate(d.date, 'weekday')} ${Number(d.date.slice(8, 10))}` })
  out.push({ value: COST_PAD_AFTER, label: 'After the trip' })
  return out
})
/** Today during the trip (a preview's day while previewing), else before or after it. */
const defaultDay = computed(() => {
  const m = v.moment.value
  if (m?.phase === 'during' && m.dayIndex >= 0) return v.trip.value?.days[m.dayIndex]?.id ?? COST_PAD_BEFORE
  return m?.phase === 'after' ? COST_PAD_AFTER : COST_PAD_BEFORE
})
const picked = ref<string | null>(null)
const day = computed<string>({
  get: () => {
    const want = picked.value ?? props.day
    return want && dayOptions.value.some(o => o.value === want) ? want : defaultDay.value
  },
  set: (x) => {
    picked.value = x
  },
})
const dayLabel = computed(() => dayOptions.value.find(o => o.value === day.value)?.label ?? '')
/** The trip day the cost counts to; none before or after the trip. */
const dayId = computed(() => (day.value === COST_PAD_BEFORE || day.value === COST_PAD_AFTER ? undefined : day.value))
/** With no trip day: before or after the trip, kept on the record so the list shows it where you put it. */
const when = computed(() => (day.value === COST_PAD_AFTER ? 'after' : day.value === COST_PAD_BEFORE ? 'before' : undefined))
/** The day stays after a save: it stands out while it isn't the usual one (today during the trip). */
const offDay = computed(() => props.mode === 'add' && day.value !== defaultDay.value)

// ---------- link, note, category ----------
/** The sight, food or night stop whose slot holds now (the one Now shows you at), unless you skipped it. */
const atStop = computed<ResolvedStop | null>(() => {
  if (!props.atNow || props.mode !== 'add') return null
  const plan = v.today.value
  const m = v.moment.value
  if (!plan || !m) return null
  let hit: ResolvedStop | undefined
  for (const s of plan.stops) {
    if (s.start <= m.minutes && m.minutes < s.endMin) hit = s
  }
  if (!hit || plan.states[hit.id] === 'skipped' || !AT_KINDS.includes(hit.kind)) return null
  return hit
})
/** The stop whose "At" chip you closed: no link to it from this pad (a new stop on now shows again). */
const unlinkedAt = ref('')
const shownLink = computed<CostPadLink | null>(() => {
  const s = atStop.value
  const l = props.link ?? (s && s.id !== unlinkedAt.value
    ? { kind: 'at' as const, title: s.title, stopId: s.id, dayId: s.dayId, cat: costCatForKind(s.kind) }
    : null)
  if (!l) return null
  if (l.kind === 'at' && l.dayId && l.dayId !== dayId.value) return null
  return l
})
function unlink() {
  if (!props.link && atStop.value) unlinkedAt.value = atStop.value.id
  else emit('unlink')
}

/**
 * The stop a cost of category c goes to. A "For" link is your choice: always. The "At" stop is the plan's guess
 * of where you are: only a cost of its own kind. Another kind goes to the latest stop of that kind today that
 * has started, ended at most AT_LATE_MIN ago, wasn't skipped and has nothing logged for it yet (the pizza you
 * pay for at 12:20 when the plan has moved on to St Peter's), else to none.
 */
function linkFor(c: CostCat): { stopId?: string, bookingId?: string } {
  const l = shownLink.value
  if (!l) return {}
  if (l.kind !== 'at' || !l.cat || l.cat === c) return { stopId: l.stopId, bookingId: l.bookingId }
  const plan = v.today.value
  const m = v.moment.value
  const costs = v.costs.value
  if (!plan || !m || !costs) return {}
  let hit: ResolvedStop | undefined
  for (const s of plan.stops) {
    if (!AT_KINDS.includes(s.kind) || costCatForKind(s.kind) !== c) continue
    if (s.start > m.minutes || s.endMin + AT_LATE_MIN < m.minutes) continue
    if (plan.states[s.id] === 'skipped' || costLoggedFor(s, costs)) continue
    hit = s
  }
  return hit ? { stopId: hit.id } : {}
}
const ring = computed(() => (props.mode === 'add' ? shownLink.value?.cat : undefined))

const note = ref(props.note ?? '')
const noteOpen = ref(props.mode === 'edit' || !!props.note)
async function openNote() {
  noteOpen.value = true
  await nextTick()
  noteEl.value?.focus()
}

const cat = ref<CostCat | null>(props.cat ?? null)

const previewLine = computed(() => {
  if (props.mode !== 'add' || !clock.previewing.value) return ''
  const counts = day.value === COST_PAD_BEFORE ? 'before the trip' : day.value === COST_PAD_AFTER ? 'after the trip' : `for ${dayLabel.value}`
  return `Preview is on. This cost is real and counts ${counts}.`
})

function catName(c: CostCat): string {
  const label = COST_META[c].label
  return props.mode === 'add' && amount.value ? `Save ${moneyExact(amount.value, cur.value)} as ${label}` : label
}

// ---------- saving ----------
function tapCat(c: CostCat) {
  if (props.mode === 'edit') {
    cat.value = c
    return
  }
  const a = amount.value
  if (a === null) {
    if (performance.now() - lastSave < DOUBLE_TAP_MS) return
    warn.value = 'Type an amount first'
    return
  }
  const id = actions.addCost({
    amount: a,
    cat: c,
    // Always given, so "Before the trip" stays before the trip (a missing key would mean today).
    dayId: dayId.value,
    when: when.value,
    note: note.value.trim() || undefined,
    ...linkFor(c),
  })
  if (!id) return
  lastSave = performance.now()
  text.value = ''
  fresh.value = false
  note.value = ''
  noteOpen.value = false
  warn.value = ''
  emit('saved', id)
}

function save() {
  if (props.mode !== 'edit' || !props.editId) return
  const a = amount.value
  if (a === null) {
    warn.value = 'Type an amount first'
    return
  }
  if (!cat.value) return
  actions.saveCost(props.editId, {
    amount: a,
    cat: cat.value,
    dayId: dayId.value,
    when: when.value,
    note: note.value.trim(),
    stopId: props.link?.stopId,
    bookingId: props.link?.bookingId,
  })
  emit('saved', props.editId)
}

function remove() {
  if (props.mode !== 'edit' || !props.editId) return
  actions.deleteCost(props.editId)
  emit('deleted')
}

function noteEnter() {
  if (props.mode === 'edit') save()
  else noteEl.value?.blur()
}

// ---------- a physical keyboard ----------
function onKey(e: KeyboardEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
  const target = e.target instanceof Element ? e.target : null
  // Typing in the note, the day picker or any other field stays there.
  if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
  if (props.scope === 'page') {
    // A sheet or any other dialog over the page takes the keys.
    if (document.documentElement.classList.contains('sheet-open') || document.querySelector('[aria-modal="true"]')) return
  }
  else {
    const box = root.value?.closest('[role="dialog"]')
    const onBody = !target || target === document.body || target === document.documentElement
    if (!box || !(onBody || box.contains(target))) return
  }
  const k = e.key
  if (/^\d$/.test(k) || k === '.' || k === ',') {
    e.preventDefault()
    press(k === ',' ? '.' : k)
  }
  else if (k === 'Backspace') {
    e.preventDefault()
    press('back')
  }
  else if (k === 'Enter' && props.mode === 'edit' && !target?.closest('button, a[href]')) {
    e.preventDefault()
    save()
  }
}
if (typeof document !== 'undefined') useEventListener(document, 'keydown', onKey)
</script>

<template>
  <div ref="root" class="pad" :class="`m-${mode}`">
    <p v-if="shownLink?.kind === 'for'" class="for">
      <AppIcon name="pin" size="sm" />
      <span class="grow ellipsis">For: {{ shownLink.title }}</span>
      <button type="button" class="btn icon xs plain round" :aria-label="`Don't link this cost to ${shownLink.title}`" @click="unlink">
        <AppIcon name="x" size="sm" />
      </button>
    </p>

    <!-- Never wraps while you type: the amount shrinks to fit, so the keypad stays where your finger is. -->
    <div class="top">
      <div class="top-in">
        <div class="amtbox">
          <output class="amt" aria-live="polite" :style="{ '--len': String(len) }"><span>{{ symbol }}</span><span v-if="text">{{ shown }}</span><span v-else class="zero">0</span></output>
          <p class="conv num">
            {{ home }}
          </p>
          <span v-if="shownLink?.kind === 'at'" class="chip at" :title="`At ${shownLink.title}`">
            <AppIcon name="pin" />
            <span class="ellipsis">At {{ shownLink.title }}</span>
            <button type="button" class="x hit" :aria-label="`Don't link this cost to ${shownLink.title}`" @click="unlink">
              <AppIcon name="x" size="xs" />
            </button>
          </span>
        </div>
        <div class="side">
          <div class="dayp" :class="{ off: offDay }">
            <span class="cap" aria-hidden="true">Counts for</span>
            <span class="val" aria-hidden="true"><span class="ellipsis">{{ dayLabel }}</span><AppIcon name="chev" size="xs" /></span>
            <select v-model="day" class="native" aria-label="Counts for">
              <option v-for="o in dayOptions" :key="o.value" :value="o.value">
                {{ o.label }}
              </option>
            </select>
          </div>
          <button v-if="!noteOpen" type="button" class="chip" @click="openNote">
            + Note
          </button>
        </div>
      </div>
    </div>
    <slot name="info" />

    <div v-if="picks.length" class="chips">
      <button v-for="p in picks" :key="p" type="button" class="chip num pick" :aria-label="`Fill in ${money(p, cur)}`" @click="pick(p)">
        {{ money(p, cur) }}
      </button>
    </div>
    <label v-if="noteOpen" class="note">
      <span class="cap">What was it? (optional)</span>
      <input ref="noteEl" v-model="note" class="input" type="text" maxlength="80" autocomplete="off" enterkeyhint="done" @keydown.enter.prevent="noteEnter">
    </label>

    <div class="keys">
      <button v-for="k in keys" :key="k.key" type="button" class="key" :class="{ fn: k.key === 'back' }" :aria-label="k.label" @click="press(k.key)">
        <AppIcon v-if="k.key === 'back'" name="backspace" />
        <template v-else>
          {{ k.key }}
        </template>
      </button>
    </div>

    <p class="line">
      <span class="warn" aria-live="polite">{{ warn }}</span>
      <template v-if="!warn">
        <span v-if="previewLine" class="prev">{{ previewLine }}</span>
        <span v-else-if="mode === 'add'" class="hint">Type the amount, then tap what it was for.</span>
      </template>
    </p>

    <div class="cats" role="group" aria-label="What was it for?">
      <button
        v-for="c in COST_CATS"
        :key="c"
        type="button"
        class="cat"
        :class="{ ring: ring === c }"
        :style="{ '--c': COST_META[c].color }"
        :aria-label="catName(c)"
        :aria-pressed="mode === 'edit' ? cat === c : undefined"
        @click="tapCat(c)"
      >
        <AppIcon :name="COST_META[c].icon" />
        <span>{{ COST_META[c].label }}</span>
      </button>
    </div>

    <div v-if="mode === 'edit'" class="acts">
      <button type="button" class="btn danger" @click="remove">
        <AppIcon name="trash" size="sm" />Delete
      </button>
      <button type="button" class="btn primary grow" @click="save">
        Save
      </button>
    </div>
  </div>
</template>

<style scoped>
.pad { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.for { display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 12px; border-radius: 12px; background: var(--surface-2); font-weight: 620; font-size: 14px; }
.for .i { color: var(--accent); }
.top { container-type: inline-size; }
.top-in { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 6px 12px; }
.amtbox { display: flex; flex-direction: column; min-width: 0; }
.amt {
  display: block;
  font-family: var(--font-data);
  font-weight: 600;
  font-size: min(40px, 11.5vw);
  line-height: 44px;
  letter-spacing: -.02em;
  font-variant-numeric: tabular-nums;
  min-width: 0;
  overflow-wrap: anywhere;
}
/* Plex Mono is 0.6 em a character: the whole amount fits beside the day picker (144 px and a 12 px gap). */
@supports (width: 1cqi) {
  .amt { white-space: nowrap; overflow-wrap: normal; font-size: min(40px, calc((100cqi - 156px) / (var(--len) * .6))); }
}
.amt .zero { color: var(--fg-3); }
.side { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.dayp {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 144px;
  min-height: 44px;
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  line-height: 1.2;
}
.dayp:focus-within { outline: 2.5px solid var(--accent); outline-offset: 2px; }
/* Counting for another day than the usual one: gold, so the next cost isn't logged there unnoticed. */
.dayp.off { border-color: var(--gold-rim); background: var(--gold-soft); }
.dayp.off .cap { color: var(--gold-ink); }
.dayp .cap { font-size: 11.5px; font-weight: 600; color: var(--fg-2); }
.dayp .val { display: flex; align-items: center; gap: 6px; font-weight: 650; font-size: 14.5px; min-width: 0; }
.dayp .val .i { color: var(--fg-2); flex: none; }
/* The native picker, invisible over the box: the phone's own list opens on a tap. */
.dayp .native { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; font-size: 16px; border: 0; }
.side .chip { min-height: 30px; font-size: 13px; border-color: var(--line); background: var(--surface); color: var(--fg); }
/* A narrow pad (320 px phones): the amount gets the whole width, the day picker and "+ Note" go under it. */
@container (max-width: 299px) {
  .top-in { grid-template-columns: minmax(0, 1fr); }
  .amt { font-size: min(40px, calc(100cqi / (var(--len) * .6))); }
  .side { flex-direction: row; align-items: center; justify-content: space-between; }
  /* The day picker comes right under the "At" chip here: room for the whole 44 px touch area of its ×. */
  .chip.at { margin-bottom: 4px; }
}
/* Its line is kept while empty, so the keypad doesn't move under your finger when the first digit lands. */
.conv { min-height: 18px; font-size: 13px; line-height: 18px; color: var(--fg-2); }
.chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.chips .chip { min-height: 30px; font-size: 13px; }
.chips button.chip { border-color: var(--line); background: var(--surface); color: var(--fg); }
.chip.at { align-self: flex-start; max-width: 100%; min-height: 28px; margin-top: 2px; padding-right: 3px; font-size: 13px; background: var(--accent-soft); color: var(--accent); }
.chip.at .x { flex: none; display: grid; place-items: center; width: 22px; height: 22px; border: 0; border-radius: 50%; background: none; color: inherit; padding: 0; }
.note { display: flex; flex-direction: column; gap: 4px; }
.note .cap { font-size: 12.5px; font-weight: 650; color: var(--fg-2); }
.keys { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.key {
  height: 48px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--fg);
  font: 600 22px/1 var(--font-data);
  display: grid;
  place-items: center;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: background .12s ease, transform .08s ease;
}
.key:active { background: var(--surface-3); transform: scale(.97); }
.key.fn { color: var(--fg-2); }
.key .i { width: 24px; height: 24px; }
.line { font-size: 13.5px; line-height: 1.4; }
.m-add .line { min-height: 20px; }
/* Rendered even while empty (an empty inline box takes no room): a live region that appears only with its
   message is not read out reliably. */
.line .warn { color: var(--warn); font-weight: 650; }
.line .hint { color: var(--fg-2); }
.line .prev { display: block; padding: 5px 10px; border-radius: 10px; background: var(--gold-soft); color: var(--gold-ink); font-weight: 600; }
.cats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.cat {
  min-height: 48px;
  padding: 4px 4px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: var(--surface-2);
  color: var(--fg);
  font-weight: 650;
  font-size: 13px;
  line-height: 1.15;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: background .12s ease, transform .08s ease;
}
.cat .i { color: var(--c); width: 19px; height: 19px; }
.cat span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cat:active { transform: scale(.97); }
.cat.ring { border-color: var(--gold-rim); box-shadow: 0 0 0 1.5px var(--gold-rim); }
.cat[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
.cat[aria-pressed="true"] .i { color: currentColor; }
.acts { display: flex; gap: 10px; margin-top: 6px; }
/* Phones that aren't tall (an installed app gives about 80 px to the notch and the home bar): 44 px keys and
   category buttons, so the whole pad clears the tab bar without scrolling. */
@media (max-width: 899px) and (max-height: 880px) {
  .keys, .cats { gap: 5px; }
  .key { height: 44px; }
  .cat { min-height: 44px; }
}
/* Hover only where there is one: on a phone a tapped key would keep looking pressed. */
@media (hover: hover) {
  .key:hover { background: var(--surface-2); }
  .cat:hover { background: var(--surface-3); }
  .cat[aria-pressed="true"]:hover { background: var(--accent); }
  .chip.at .x:hover { background: color-mix(in srgb, currentColor 14%, transparent); }
}
</style>
