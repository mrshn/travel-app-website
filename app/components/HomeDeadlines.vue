<script setup lang="ts">
import { CLAIM_KINDS, claimDays, claimDeadlineLine, claimUnsent } from '#shared/utils/claims'
import { zoned } from '#shared/utils/time'

/**
 * Home's deadlines (spec 5.8, T12): every claim on this device still to send whose deadline is 60 days away or less,
 * or has passed, soonest first: "Wizz Air claim: send by 8 Dec · 55 days left", amber from 14 days, red once late.
 * Each opens its claim. Nothing shows while there are none.
 */
const store = useProgressStore()
const trips = useTrips()
const { now } = useClock()

/** Days ahead from which a deadline shows here. */
const AHEAD = 60

const rows = computed(() => {
  const out: { key: string, to: { path: string, query: { claim: string } }, title: string, text: string, tone: string, trip: string, days: number }[] = []
  for (const t of trips.sorted.value) {
    const claims = store.value[t.id]?.claims
    if (!claims) continue
    const today = zoned(now.value, t.timezone).date
    for (const c of Object.values(claims)) {
      if (!c || !claimUnsent(c)) continue
      const days = claimDays(c, today)
      const line = claimDeadlineLine(c, today)
      if (days === null || days > AHEAD || !line) continue
      out.push({
        key: `${t.id}:${c.id}`,
        to: { path: `/trips/${t.id}/claims`, query: { claim: c.id } },
        title: c.title?.trim() || CLAIM_KINDS[c.kind]?.label || 'Claim',
        // "Send by 8 Dec · 55 days left" reads "send by …" after the title.
        text: line.text.charAt(0).toLowerCase() + line.text.slice(1),
        tone: line.tone,
        trip: t.title,
        days,
      })
    }
  }
  return out.sort((a, b) => a.days - b.days || a.key.localeCompare(b.key))
})
</script>

<template>
  <section v-if="rows.length" class="card deadlines" aria-labelledby="home-deadlines-h">
    <h2 id="home-deadlines-h" class="kicker hd-h">
      Deadlines
    </h2>
    <div class="rows">
      <NuxtLink v-for="r in rows" :key="r.key" :to="r.to" class="row-item hd">
        <span class="hd-ic" :class="`tone-${r.tone}`" aria-hidden="true"><AppIcon :name="r.tone === 'overdue' ? 'alert' : 'doc'" /></span>
        <span class="grow hd-tx">
          <span class="hd-l1"><b>{{ r.title }}:</b> <span :class="`tone-${r.tone}`">{{ r.text }}</span></span>
          <span class="small muted">{{ r.trip }}</span>
        </span>
        <AppIcon name="chevr" class="chev" />
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.deadlines { overflow: hidden; margin-bottom: 12px; }
.hd-h { padding: 12px 16px 0; }
.hd { min-height: 60px; gap: 12px; padding: 10px 14px; }
.hd:focus-visible { outline-offset: -3px; }
.hd-ic { flex: none; width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; background: var(--gold-soft); color: var(--gold-ink); }
.hd-ic.tone-soon { background: var(--warn-soft); color: var(--warn); }
.hd-ic.tone-overdue { background: var(--bad-soft); color: var(--bad); }
.hd-tx { display: flex; flex-direction: column; gap: 2px; line-height: 1.35; }
.hd-l1 { overflow-wrap: anywhere; }
.hd-l1 .tone-soon { color: var(--warn); font-weight: 650; }
.hd-l1 .tone-overdue { color: var(--bad); font-weight: 650; }
.chev { flex: none; color: var(--fg-3); }
</style>
