<script setup lang="ts">
import type { Claim, ClaimKind } from '#shared/types/trip'
import { CLAIM_GUIDE, CLAIM_KINDS, CLAIM_STATUSES, claimDeadlineLine, claimSort, claimStepsDone, claimTotals, type ClaimKindMeta } from '#shared/utils/claims'

/**
 * Claims (spec 5.13; lights More): money back for a cancelled flight, a lost bag or a booking. Each claim with its
 * company, where it stands, its deadline, what it comes to ("€579.39 · likely €255") and its steps; New claim starts
 * one from a template (?claim=new&kind=…), and a claim opens in its sheet (?claim=<id>).
 */
const v = useTripView()
const trip = v.trip
const today = computed(() => v.moment.value?.local.date ?? '')

const TONE_CHIP: Record<string, string> = { plain: 't-plain', accent: 't-accent-soft', gold: 't-gold', warn: 't-warn', ok: 't-ok', bad: 't-bad', closed: 't-closed' }
const KINDS = Object.entries(CLAIM_KINDS) as [ClaimKind, ClaimKindMeta][]

const claims = computed<Claim[]>(() => Object.values(v.progress.value.claims ?? {}).filter((c): c is Claim => !!c && !c.deleted).sort(claimSort))
const rows = computed(() => claims.value.map((c) => {
  const totals = claimTotals(c, v.progress.value.expenses, trip.value?.currency ?? 'EUR')
  const steps = claimStepsDone(c)
  const status = CLAIM_STATUSES[c.status] ?? CLAIM_STATUSES.draft
  return {
    claim: c,
    title: c.title?.trim() || CLAIM_KINDS[c.kind]?.label || 'Claim',
    who: [c.company, c.reference].filter(Boolean).join(' · '),
    status: { label: status.label, chip: TONE_CHIP[status.tone] ?? 't-plain' },
    line: claimDeadlineLine(c, today.value),
    money: totals.total > 0 ? `${moneyExact(totals.total, totals.currency)} · likely ${money(totals.likely, totals.currency)}` : '',
    steps: steps.total ? `${steps.done} of ${steps.total} steps done` : '',
    icon: CLAIM_KINDS[c.kind]?.icon ?? 'doc',
  }
}))

/** The templates show by themselves while there is no claim, else behind "New claim". */
const picking = ref(false)
const pickerOpen = computed(() => picking.value || !claims.value.length)

useHead({ title: 'Claims · Travels' })
</script>

<template>
  <div v-if="trip" class="page claims">
    <header class="head">
      <p class="kicker">
        If plans change
      </p>
      <h1 class="h2">
        Claims
      </h1>
      <p class="muted intro">
        Money back for a cancelled flight, a lost bag or a booking you couldn't use: what to ask for, by when, and what you've done. Only you see your claims.
      </p>
    </header>

    <section v-if="rows.length" class="list" aria-label="Your claims">
      <NuxtLink v-for="r in rows" :key="r.claim.id" :to="{ query: { claim: r.claim.id } }" class="card cl-card">
        <span class="cl-top">
          <span class="cl-ic" aria-hidden="true"><AppIcon :name="r.icon" /></span>
          <span class="cl-name">
            <b class="cl-title">{{ r.title }}</b>
            <span v-if="r.who" class="small muted">{{ r.who }}</span>
          </span>
          <span class="chip" :class="r.status.chip">{{ r.status.label }}</span>
        </span>
        <span v-if="r.line" class="cl-dl" :class="`tone-${r.line.tone}`">
          <AppIcon :name="r.line.tone === 'overdue' ? 'alert' : 'calendar'" size="sm" />{{ r.line.text }}
        </span>
        <span v-if="r.money || r.steps" class="cl-sum small tnum">
          <span v-if="r.money">{{ r.money }}</span><span v-if="r.money && r.steps" aria-hidden="true"> · </span><span v-if="r.steps" class="muted">{{ r.steps }}</span>
        </span>
      </NuxtLink>
    </section>

    <section class="pick" :aria-labelledby="pickerOpen ? 'cl-new-h' : undefined" :aria-label="pickerOpen ? undefined : 'New claim'">
      <button v-if="rows.length" class="btn newbtn" :class="picking ? 'ghost' : 'primary'" type="button" :aria-expanded="pickerOpen" aria-controls="cl-kinds" @click="picking = !picking">
        <AppIcon :name="picking ? 'x' : 'plus'" size="sm" />{{ picking ? 'Not now' : 'New claim' }}
      </button>
      <h2 v-if="pickerOpen" id="cl-new-h" class="h3">
        What happened?
      </h2>
      <div v-if="pickerOpen" id="cl-kinds" class="card rows kinds">
        <NuxtLink v-for="[k, meta] in KINDS" :key="k" :to="{ query: { claim: 'new', kind: k } }" class="row-item kind">
          <span class="k-ic" aria-hidden="true"><AppIcon :name="meta.icon" /></span>
          <span class="grow k-tx">
            <b>{{ meta.label }}</b>
            <span class="small muted">{{ meta.hint }}</span>
          </span>
          <AppIcon name="chevr" class="chev" />
        </NuxtLink>
      </div>
    </section>

    <p class="small faint guide">
      {{ CLAIM_GUIDE }}
    </p>
  </div>
</template>

<style scoped>
.claims { padding-top: 18px; }
.head { display: flex; flex-direction: column; gap: 2px; margin-bottom: 16px; }
.intro { margin-top: 6px; font-size: 14.5px; max-width: 60ch; }
.list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px; }
.cl-card { display: flex; flex-direction: column; gap: 8px; padding: 14px; color: var(--fg); text-decoration: none; }
@media (hover: hover) { .cl-card:hover { background: var(--surface-2); } }
.cl-top { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.cl-ic { flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: var(--gold-soft); color: var(--gold-ink); }
.cl-name { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; line-height: 1.3; }
.cl-title { font-size: 16px; overflow-wrap: anywhere; }
.cl-top .chip { flex: none; margin-top: 2px; }
.cl-dl { display: flex; align-items: flex-start; gap: 6px; font-weight: 650; font-size: 14px; color: var(--fg-2); padding-left: 50px; }
.cl-dl .i { flex: none; margin-top: 2px; }
.cl-dl.tone-soon { color: var(--warn); }
.cl-dl.tone-overdue { color: var(--bad); }
.cl-sum { padding-left: 50px; color: var(--fg); font-weight: 600; }
.cl-sum .muted { font-weight: 500; }
.pick { display: flex; flex-direction: column; align-items: stretch; gap: 10px; }
.newbtn { align-self: flex-start; }
.kinds { overflow: hidden; }
.kind { min-height: 60px; gap: 12px; padding: 10px 14px; }
.kind:focus-visible { outline-offset: -3px; }
.k-ic { flex: none; width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; background: var(--surface-2); color: var(--accent); }
.k-tx { display: flex; flex-direction: column; gap: 1px; line-height: 1.3; }
.chev { flex: none; color: var(--fg-3); }
.guide { margin-top: 18px; text-align: center; }
@media (max-width: 359px) {
  .cl-dl, .cl-sum { padding-left: 0; }
}
</style>
