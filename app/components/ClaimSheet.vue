<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { Claim, ClaimKind, ClaimStatus } from '#shared/types/trip'
import {
  CLAIM_GUIDE, CLAIM_KINDS, CLAIM_STATUSES, claimAddMonths, claimCurrency, claimDeadlineLine, claimEscalateDue, claimSent, claimSettled, claimTemplate,
  claimTotals,
} from '#shared/utils/claims'
import { uid } from '#shared/utils/plan'
import { addDays } from '#shared/utils/time'

/**
 * A claim (?claim=<id>; spec 5.13), mounted once by the trip shell. ?claim=new&kind=<kind> starts one from its template
 * and puts its id in the URL. Everything saves as you go (a moment after you stop typing, and when the sheet closes):
 * title and status; who and the references; the dates (a flight's deadline follows its date, two months on, and the
 * steps' dates follow the deadline and the day it was sent); the amounts; the costs linked from Costs; the steps; a
 * note; links. Delete asks first and has Undo. The cost sheet opens over this one for a cost that is part of it.
 */
const v = useTripView()
const route = useRoute()
const router = useRouter()
const sheet = useQueryState('claim')

const q = computed(() => sheet.value.value ?? '')
const isNew = computed(() => q.value === 'new')
const record = computed(() => (q.value && !isNew.value ? v.progress.value.claims?.[q.value] : undefined))
const live = computed(() => (record.value && !record.value.deleted ? record.value : undefined))

/**
 * The cost sheet stacks over this one (CostSheet.vue raises itself with :has()). A browser without :has() can't, so
 * this sheet steps aside while the cost sheet is open there.
 */
const stacks = typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('selector(:has(a))')
const costOpen = computed(() => typeof route.query.cost === 'string' && !!route.query.cost)
const show = computed(() => !!v.trip.value && !!live.value && (stacks || !costOpen.value))

const today = computed(() => v.moment.value?.local.date ?? '')
const currency = computed(() => (draft.value ? claimCurrency(draft.value, v.trip.value?.currency ?? 'EUR') : v.trip.value?.currency ?? 'EUR'))

// ---------- starting one ----------
const hasKind = (k: unknown): k is ClaimKind => typeof k === 'string' && Object.prototype.hasOwnProperty.call(CLAIM_KINDS, k)

/** The day it happened, to start with: the first day of the trip (the flight there), the last on the last day and after. */
function defaultIncident(): string {
  const t = v.trip.value!
  const m = v.moment.value
  if (m?.phase === 'after') return t.end
  if (m?.phase === 'during' && m.dayIndex === t.days.length - 1) return m.dayDate
  return t.start
}

/** The URL a claim was just started from: a second look at the same URL (a re-run of the watcher) starts no other. */
let started = ''
function start() {
  const t = v.trip.value
  if (!isNew.value) {
    started = ''
    return
  }
  if (!t || started === route.fullPath) return
  started = route.fullPath
  const kind = hasKind(route.query.kind) ? route.query.kind : 'other'
  const id = uid('cl')
  v.saveClaim({ ...claimTemplate(kind, { incident: defaultIncident(), currency: t.currency }), id })
  const query: Record<string, unknown> = { ...route.query, claim: id }
  delete query.kind
  void router.replace({ query: query as typeof route.query })
  toast('Claim started. It saves as you go.', { tone: 'ok', actions: [{ label: 'Undo', run: () => v.removeClaim(id) }] })
}
watch([isNew, () => v.trip.value?.id], start, { immediate: true })

// A claim that isn't there (deleted, or never on this device) leaves the URL.
watch([q, record], () => {
  if (!q.value || isNew.value || !v.trip.value) return
  if (!record.value || record.value.deleted) {
    const query = { ...route.query }
    delete query.claim
    delete query.kind
    void router.replace({ query })
  }
}, { immediate: true })

// ---------- the copy being edited ----------
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T
/** JSON with sorted keys, without the save time: the same claim gives the same text. */
function sig(c: Claim): string {
  const sorted = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(sorted)
    if (x && typeof x === 'object') {
      return Object.fromEntries(Object.keys(x).sort().filter(k => k !== 'updatedAt' && (x as Record<string, unknown>)[k] !== undefined).map(k => [k, sorted((x as Record<string, unknown>)[k])]))
    }
    return x
  }
  return JSON.stringify(sorted(c))
}

const draft = ref<Claim | null>(null)
let dirty = false

/** Optional texts left empty are left out. */
function tidy(d: Claim) {
  for (const k of ['company', 'reference', 'claimRef', 'note'] as const) {
    if (typeof d[k] === 'string' && !d[k]!.trim()) delete d[k]
  }
}

function commit() {
  const d = draft.value
  if (!d || !dirty) return
  dirty = false
  const cur = v.progress.value.claims?.[d.id]
  if (!cur || cur.deleted) return
  tidy(d)
  v.saveClaim(clone(d))
}
const commitSoon = useDebounceFn(commit, 400)

watch(live, (c) => {
  const d = draft.value
  if (d && dirty && d.id !== c?.id) commit()
  if (!c) {
    draft.value = null
    return
  }
  if (d && d.id === c.id && (dirty || sig(d) === sig(c))) return
  draft.value = clone(c)
}, { immediate: true })

watch(draft, (d) => {
  if (!d) return
  const c = live.value
  if (c && c.id === d.id && sig(d) === sig(c)) {
    dirty = false
    return
  }
  dirty = true
  void commitSoon()
}, { deep: true })

watch(show, (s) => {
  if (!s) commit()
})
onBeforeUnmount(commit)

// ---------- what it says at the top ----------
const kindMeta = computed(() => CLAIM_KINDS[draft.value?.kind ?? 'other'] ?? CLAIM_KINDS.other)
const statusMeta = computed(() => CLAIM_STATUSES[draft.value?.status ?? 'draft'] ?? CLAIM_STATUSES.draft)
const TONE_CHIP: Record<string, string> = { plain: 't-plain', accent: 't-accent-soft', gold: 't-gold', warn: 't-warn', ok: 't-ok', bad: 't-bad', closed: 't-closed' }
const totals = computed(() => (draft.value ? claimTotals(draft.value, v.progress.value.expenses, currency.value) : null))
const deadlineLine = computed(() => (draft.value ? claimDeadlineLine(draft.value, today.value) : null))
/** What was paid back, per amount: once the claim is sent (nothing is paid before), or once something was. */
const showPaid = computed(() => {
  const d = draft.value
  return !!d && (claimSent(d) || claimSettled(d) || d.lines.some(l => (l.paid ?? 0) > 0))
})
const isFlight = computed(() => draft.value?.kind === 'flight-cancelled' || draft.value?.kind === 'flight-delayed')
const STATUSES = Object.entries(CLAIM_STATUSES) as [ClaimStatus, { label: string }][]

// ---------- dates and status, which move each other ----------
/** The deadline a template gives from the day it happened ('' for none). */
function autoDeadline(kind: ClaimKind, incident?: string): string {
  if (!incident) return ''
  if (kind === 'flight-cancelled' || kind === 'flight-delayed') return claimAddMonths(incident, 2)
  return kind === 'bag' ? addDays(incident, 7) : ''
}

function setDate(field: 'incident' | 'deadline' | 'sentOn', raw: string) {
  const d = draft.value
  if (!d) return
  const value = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ''
  const old = d[field]
  if (value) d[field] = value
  else delete d[field]
  if (field === 'incident') {
    // The deadline follows the date while it is still the template's.
    if (!d.deadline || d.deadline === autoDeadline(d.kind, old)) setDate('deadline', autoDeadline(d.kind, value))
    const report = d.steps.find(s => s.id === 'report')
    if (report && (!report.due || report.due === old)) {
      if (value) report.due = value
      else delete report.due
    }
  }
  else if (field === 'deadline') {
    const send = d.steps.find(s => s.id === 'send')
    if (send && (!send.due || send.due === old)) {
      if (value) send.due = value
      else delete send.due
    }
  }
  else {
    if (value && d.status === 'draft') d.status = 'sent'
    const escalate = d.steps.find(s => s.id === 'escalate')
    if (escalate && (!escalate.due || (old && escalate.due === claimEscalateDue(old)))) {
      if (value) escalate.due = claimEscalateDue(value)
      else delete escalate.due
    }
    const send = d.steps.find(s => s.id === 'send')
    if (value && send) send.done = true
  }
}

function setStatus(s: string) {
  const d = draft.value
  if (!d || !Object.prototype.hasOwnProperty.call(CLAIM_STATUSES, s)) return
  d.status = s as ClaimStatus
  if (s === 'draft') {
    if (d.sentOn) setDate('sentOn', '')
  }
  else if ((s === 'sent' || s === 'waiting') && !d.sentOn && today.value) {
    setDate('sentOn', today.value)
  }
}

const note = computed({
  get: () => draft.value?.note ?? '',
  set: (x: string) => {
    if (draft.value) draft.value.note = x
  },
})
/** The links (ClaimLinks hands back a new list on each change; none is left out rather than kept empty). */
const links = computed({
  get: () => draft.value?.links ?? [],
  set: (x) => {
    const d = draft.value
    if (!d) return
    if (x.length) d.links = x
    else delete d.links
  },
})

// ---------- closing and deleting ----------
function close() {
  commit()
  sheet.close()
}

function remove() {
  const d = draft.value
  if (!d) return
  if (typeof window !== 'undefined' && !window.confirm(`Delete “${d.title || kindMeta.value.label}”? Its costs stay in Costs.`)) return
  commit()
  dirty = false
  const before = v.removeClaim(d.id)
  if (!before) return
  toast(`Deleted: ${before.title || kindMeta.value.label}`, { actions: [{ label: 'Undo', run: () => v.saveClaim(before) }] })
}
</script>

<template>
  <BottomSheet :open="show" title="Claim" size="lg" @close="close">
    <div v-if="draft && totals" class="cl">
      <section class="cl-sum" aria-label="At a glance">
        <div class="cl-sum-top">
          <span class="kind"><AppIcon :name="kindMeta.icon" size="sm" />{{ kindMeta.label }}</span>
          <span class="chip" :class="TONE_CHIP[statusMeta.tone]">{{ statusMeta.label }}</span>
        </div>
        <p class="totals tnum">
          <b class="num">{{ moneyExact(totals.total, totals.currency) }}</b>
          <span class="muted"> · likely {{ money(totals.likely, totals.currency) }}</span><template v-if="totals.paid > 0">
            <span class="muted"> · paid {{ moneyExact(totals.paid, totals.currency) }}</span>
          </template>
        </p>
        <p v-if="deadlineLine" class="dl" :class="`tone-${deadlineLine.tone}`">
          <AppIcon :name="deadlineLine.tone === 'overdue' ? 'alert' : 'calendar'" size="sm" />{{ deadlineLine.text }}
        </p>
      </section>

      <label class="field">
        <span>Title</span>
        <input v-model="draft.title" class="input title-in" type="text" maxlength="80" :placeholder="kindMeta.label">
      </label>
      <label class="field">
        <span>Where it stands</span>
        <select class="select" :value="draft.status" @change="setStatus(($event.target as HTMLSelectElement).value)">
          <option v-for="[k, s] in STATUSES" :key="k" :value="k">{{ s.label }}</option>
        </select>
      </label>

      <section class="grp" aria-labelledby="cl-who">
        <h3 id="cl-who" class="h3">
          Who
        </h3>
        <label class="field">
          <span>Company</span>
          <input v-model="draft.company" class="input" type="text" maxlength="60" :placeholder="isFlight ? 'The airline' : 'Who you claim from'" autocomplete="off">
        </label>
        <div class="form-grid">
          <label class="field">
            <span>Your booking reference</span>
            <input v-model="draft.reference" class="input num" type="text" maxlength="40" autocomplete="off" autocapitalize="characters">
          </label>
          <label class="field">
            <span>Their claim reference</span>
            <input v-model="draft.claimRef" class="input num" type="text" maxlength="40" autocomplete="off">
          </label>
        </div>
      </section>

      <section class="grp" aria-labelledby="cl-dates">
        <h3 id="cl-dates" class="h3">
          Dates
        </h3>
        <div class="form-grid">
          <label class="field">
            <span>It happened on</span>
            <input class="input num" type="date" :value="draft.incident ?? ''" @change="setDate('incident', ($event.target as HTMLInputElement).value)">
          </label>
          <label class="field">
            <span>Send it by</span>
            <input class="input num" type="date" :value="draft.deadline ?? ''" @change="setDate('deadline', ($event.target as HTMLInputElement).value)">
          </label>
          <p v-if="isFlight" class="hint full small muted">
            Two months after the flight, to be safe. Check their own deadline.
          </p>
          <label class="field">
            <span>Sent on</span>
            <input class="input num" type="date" :value="draft.sentOn ?? ''" @change="setDate('sentOn', ($event.target as HTMLInputElement).value)">
          </label>
        </div>
      </section>

      <section class="grp" aria-labelledby="cl-amounts">
        <div class="grp-h">
          <h3 id="cl-amounts" class="h3">
            Amounts
          </h3>
          <span class="tnum strong">{{ moneyExact(totals.total, totals.currency) }}</span>
        </div>
        <ClaimLines v-model="draft.lines" :currency="currency" :show-paid="showPaid" />
      </section>

      <section class="grp" aria-labelledby="cl-costs">
        <h3 id="cl-costs" class="h3">
          Linked costs
        </h3>
        <ClaimCosts :claim-id="draft.id" :currency="currency" />
      </section>

      <section class="grp" aria-labelledby="cl-steps">
        <h3 id="cl-steps" class="h3">
          Steps
        </h3>
        <ClaimSteps v-model="draft.steps" :today="today" />
      </section>

      <label class="field">
        <span>Note</span>
        <textarea v-model="note" class="textarea" rows="3" maxlength="2000" placeholder="What happened, who you spoke to, what they said" />
      </label>

      <section class="grp" aria-labelledby="cl-links">
        <h3 id="cl-links" class="h3">
          Links
        </h3>
        <ClaimLinks v-model="links" />
      </section>

      <p class="small faint guide">
        {{ CLAIM_GUIDE }}
      </p>
    </div>
    <template #footer>
      <button class="btn danger" type="button" @click="remove">
        <AppIcon name="trash" size="sm" />Delete
      </button>
      <span class="grow" />
      <button class="btn primary" type="button" @click="close">
        Done
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.cl { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 16px; }
.cl-sum { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 16px; background: var(--surface); border: 1px solid var(--line); }
.cl-sum-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.kind { display: inline-flex; align-items: center; gap: 6px; font-weight: 650; font-size: 14px; color: var(--fg-2); }
.kind .i { color: var(--accent); }
.totals { font-size: 15px; }
.totals b { font-size: 22px; font-weight: 600; color: var(--fg); }
.dl { display: flex; align-items: flex-start; gap: 6px; font-weight: 650; font-size: 14px; color: var(--fg-2); }
.dl .i { flex: none; margin-top: 2px; }
.dl.tone-soon { color: var(--warn); }
.dl.tone-overdue { color: var(--bad); }
.title-in { font-weight: 650; }
.grp { display: flex; flex-direction: column; gap: 10px; }
.grp-h { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.guide { text-align: center; }
</style>
