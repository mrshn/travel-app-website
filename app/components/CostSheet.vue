<script setup lang="ts">
import type { Claim, CostCat } from '#shared/types/trip'
import { claimSort } from '#shared/utils/claims'
import { costCatForKind, costHints, costLoggedFor, costOfferFor, type CostEntry } from '#shared/utils/costs'
import { findStop, resolveStop, type ResolvedStop } from '#shared/utils/plan'
import { costPadNoDay, type CostPadLink } from './CostPad.vue'

/**
 * The cost sheet (spec 4.2), mounted once by the trip shell with no props and driven by the URL through
 * useCostSheet(): ?cost=new (with &for=stop:<id> or &for=booking:<id>, and &cday=<dayId>) adds a cost,
 * ?cost=<id> edits one (legacy ids included). It opens over a stop sheet, and over a claim (spec 5.13): opened from
 * one (&claim=<id>), the new cost is part of that claim; editing, "Part of a claim" links a cost to an open claim.
 */
const v = useTripView()
const sheet = useCostSheet()
const route = useRoute()

/** The cost being edited: a live entry (an expense or an old "Logged earlier" value). */
const entry = computed<CostEntry | null>(() => {
  const id = sheet.editId.value
  return id ? v.costs.value?.entries.find(e => e.id === id) ?? null : null
})

const show = computed(() => !!v.trip.value && !!v.costs.value && (sheet.mode.value === 'new' || !!entry.value))
const isEdit = computed(() => sheet.mode.value === 'edit')

/** A stop by id with its picked option applied: the active plan first, else any version of the trip. */
function stopById(id: string): (Pick<ResolvedStop, 'id' | 'title' | 'kind' | 'cost'> & { dayId: string }) | null {
  const hit = v.locate(id)?.stop
  if (hit) return hit
  const t = v.trip.value
  const found = t ? findStop(t, id) : null
  if (!found) return null
  const s = resolveStop(found.stop, v.progress.value.choices ?? {})
  return { id: s.id, title: s.title, kind: s.kind, cost: s.cost, dayId: found.day.id }
}

/** The first stop of the plan (by day and time) that uses a booking. */
function planStopFor(bookingId: string): ResolvedStop | undefined {
  for (const plan of v.plans.value) {
    const s = plan.stops.find(x => x.bookingId === bookingId)
    if (s) return s
  }
  return undefined
}

/** What ?for= links a new cost to: its chip, the category that fits, quick picks and a prefilled price. */
const target = computed<{ link: CostPadLink, picks: number[], prefill?: number } | null>(() => {
  const t = v.trip.value
  const costs = v.costs.value
  const tg = sheet.target.value
  if (!t || !costs || !tg) return null
  if (tg.kind === 'stop') {
    const s = stopById(tg.id)
    if (!s) return null
    const offer = costOfferFor(s, costs)
    return {
      link: { kind: 'for', title: s.title, stopId: s.id, dayId: s.dayId, cat: costCatForKind(s.kind) },
      picks: costHints(s.cost).options,
      prefill: (offer?.exact ?? 0) > 0 ? offer!.exact : undefined,
    }
  }
  const b = t.bookings.find(x => x.id === tg.id)
  if (!b) return null
  const s = planStopFor(b.id)
  const hints = costHints(b.cost)
  const logged = costs.entries.some(e => e.bookingId === b.id) || (!!s && costLoggedFor(s, costs))
  const cat: CostCat = s ? costCatForKind(s.kind) : 'sights'
  return {
    // Linked to the plan stop that uses the booking too, so it shows under that stop's costs.
    link: { kind: 'for', title: b.title, bookingId: b.id, stopId: s?.id, dayId: s?.dayId, cat },
    picks: hints.options,
    prefill: !logged && (hints.exact ?? 0) > 0 ? hints.exact : undefined,
  }
})

/** × on the "For:" chip, until the sheet opens again. */
const unlinked = ref(false)

const link = computed<CostPadLink | null>(() => {
  if (unlinked.value) return null
  if (!isEdit.value) return target.value?.link ?? null
  const e = entry.value
  if (!e || (!e.stopId && !e.bookingId)) return null
  const title = e.title || (e.stopId ? stopById(e.stopId)?.title : undefined) || v.trip.value?.bookings.find(b => b.id === e.bookingId)?.title
  return { kind: 'for', title: title || 'a stop', stopId: e.stopId, bookingId: e.bookingId }
})

/** The day the pad starts on: the cost's own (edit), else &cday=, else the day of the stop it is for. */
const startDay = computed<string | undefined>(() => {
  const t = v.trip.value
  if (!t) return undefined
  const isDay = (id?: string | null) => !!id && t.days.some(d => d.id === id)
  if (isEdit.value) {
    const e = entry.value
    if (!e) return undefined
    if (isDay(e.dayId)) return e.dayId
    return costPadNoDay(t, e)
  }
  if (isDay(sheet.day.value)) return sheet.day.value!
  const d = target.value?.link.dayId
  return isDay(d) ? d : undefined
})

const legacyLine = computed(() => {
  const e = entry.value
  if (!isEdit.value || e?.source !== 'legacy') return ''
  return e.stopId ? 'Logged on this stop before costs had their own page.' : 'Logged for this day before costs had their own page.'
})

// ---------- claims (spec 5.13) ----------
const liveClaims = computed<Claim[]>(() => Object.values(v.progress.value.claims ?? {}).filter((c): c is Claim => !!c && !c.deleted))
/** Add mode opened from a claim (?claim=<id>&cost=new): the cost is part of it. */
const fromClaim = computed<Claim | null>(() => {
  const id = route.query.claim
  if (isEdit.value || typeof id !== 'string' || !id || id === 'new') return null
  return liveClaims.value.find(c => c.id === id) ?? null
})
/** Edit mode: the claim the cost is part of now. */
const linkedClaim = computed(() => entry.value?.expense?.claimId ?? '')
/** Edit mode: the open claims (not paid or closed), and the one it is part of whatever its state. */
const claimOptions = computed(() => liveClaims.value.filter(c => (c.status !== 'paid' && c.status !== 'closed') || c.id === linkedClaim.value).sort(claimSort))
const claimField = computed(() => isEdit.value && claimOptions.value.length > 0)
const claimPick = ref('')
const claimName = (c: Claim) => c.title?.trim() || 'A claim'

// A fresh pad for every opening, so nothing typed for one cost carries over to the next.
const opened = ref(0)
watch(show, (s) => {
  if (!s) return
  opened.value++
  unlinked.value = false
  claimPick.value = linkedClaim.value
}, { immediate: true })
const padKey = computed(() => `${opened.value}|${sheet.mode.value}|${sheet.editId.value ?? ''}|${sheet.target.value?.kind ?? ''}:${sheet.target.value?.id ?? ''}|${sheet.day.value ?? ''}`)

/** Saved: a new cost opened from a claim joins it; an edit takes the claim picked (only when it changed). */
function saved(id: string) {
  if (id && fromClaim.value) v.updateExpense(id, { claimId: fromClaim.value.id })
  else if (id && claimField.value && claimPick.value !== linkedClaim.value) v.updateExpense(id, { claimId: claimPick.value || undefined })
  done()
}

function done() {
  sheet.close()
}
</script>

<template>
  <BottomSheet :open="show" :title="isEdit ? 'Edit cost' : 'Add a cost'" @close="sheet.close()">
    <div v-if="show" class="cs cost-sheet">
      <CostPad
        :key="padKey"
        scope="sheet"
        :mode="isEdit ? 'edit' : 'add'"
        :edit-id="entry?.id"
        :link="link"
        :at-now="!isEdit && !sheet.target.value && !fromClaim"
        :amount="isEdit ? entry?.amount : target?.prefill"
        :picks="isEdit ? [] : target?.picks ?? []"
        :cat="entry?.cat"
        :day="startDay"
        :note="entry?.note"
        @unlink="unlinked = true"
        @saved="saved"
        @deleted="done"
      >
        <template v-if="legacyLine || claimField || fromClaim" #info>
          <p v-if="legacyLine" class="legacy">
            {{ legacyLine }}
          </p>
          <p v-if="fromClaim" class="claim-for">
            <AppIcon name="doc" size="sm" /><span class="ellipsis">Part of {{ claimName(fromClaim) }}</span>
          </p>
          <label v-if="claimField" class="claim-pick">
            <span class="cap">Part of a claim</span>
            <select v-model="claimPick" class="select">
              <option value="">
                None
              </option>
              <option v-for="c in claimOptions" :key="c.id" :value="c.id">
                {{ claimName(c) }}
              </option>
            </select>
          </label>
        </template>
      </CostPad>
    </div>
  </BottomSheet>
</template>

<style scoped>
/* Room above the first row, so the 44 px touch area of its × isn't cut by the sheet's scroller. */
.cs { padding: 8px 16px 4px; }
.legacy { font-size: 13.5px; color: var(--fg-2); line-height: 1.45; }
.claim-for { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 6px 12px; border-radius: 12px; background: var(--gold-soft); color: var(--gold-ink); font-weight: 620; font-size: 14px; }
.claim-for .i { flex: none; }
.claim-pick { display: flex; flex-direction: column; gap: 4px; }
.claim-pick .cap { font-size: 12.5px; font-weight: 650; color: var(--fg-2); }
</style>

<style>
/* Over any other sheet whatever order the shell mounts them in: a claim (spec 5.13) is mounted after this sheet. */
/* Stacking: BottomSheet puts the sheet opened last on top (a cost sheet over a claim sheet). */
</style>
