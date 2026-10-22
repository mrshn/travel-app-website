<script setup lang="ts">
import type { Trip } from '#shared/types/trip'
import type { TripSummary } from '#shared/utils/plan'
import type { TripMoment } from '#shared/utils/time'

const props = defineProps<{ trip: Trip, summary: TripSummary, moment: TripMoment }>()
// A group trip shows who's in it (docs/design/2026-10-14-together.md, 5.8): you first, then the others.
const groups = useGroups()
const social = useSocial()
const members = computed(() => {
  const list = props.trip.group ? groups.membersOf(props.trip.group.id) : []
  const me = social.me.value?.uid
  return [...list.filter(m => m.uid === me), ...list.filter(m => m.uid !== me)]
})
const withLine = computed(() => {
  const me = social.me.value?.uid
  const others = members.value.filter(m => m.uid !== me).map(m => m.name.split(/\s+/)[0] || m.name)
  if (!others.length) return 'Group trip'
  if (others.length === 1) return `With ${others[0]}`
  if (others.length === 2) return `With ${others[0]} and ${others[1]}`
  return `With ${others[0]}, ${others[1]} and ${others.length - 2} more`
})
const status = computed(() => {
  const m = props.moment
  if (m.phase === 'before') return { text: m.daysToStart <= 1 ? (m.daysToStart === 1 ? 'Tomorrow' : 'Today') : `In ${m.daysToStart} days`, tone: 't-gold' }
  if (m.phase === 'during') return { text: m.dayIndex >= 0 ? `Day ${m.dayIndex + 1} of ${props.trip.days.length}` : 'On now', tone: 't-accent' }
  return { text: 'Done', tone: 't-closed' }
})
const a = computed(() => props.summary.all)
const pct = (n: number) => (a.value.total ? `${(n / a.value.total) * 100}%` : '0%')
const prep = computed(() => {
  const s = props.summary
  const total = s.bookings.total + s.packing.total
  return { total, done: s.bookings.done + s.packing.done }
})
</script>

<template>
  <NuxtLink :to="`/trips/${trip.id}/now`" class="tcard card card-link">
    <div class="pic art-frame">
      <SceneArt class="scene" :scene="trip.cover.scene" :tod="moment.phase === 'after' ? 'night' : trip.cover.tod" :label="trip.title" />
      <div class="scrim" />
      <span class="chip st" :class="status.tone"><span v-if="moment.phase === 'during'" class="live-dot" />{{ status.text }}</span>
      <div class="pic-in on-art">
        <b class="name display">{{ trip.title }}</b>
        <span class="small">{{ fmtRange(trip.start, trip.end) }}<template v-if="trip.country"> · {{ trip.country }}</template></span>
      </div>
    </div>
    <div class="body">
      <div v-if="trip.group" class="row group">
        <AvatarStack v-if="members.length" :people="members" :max="4" :size="26" label="Planned together" />
        <AppIcon v-else name="users" size="sm" class="gi" />
        <span class="small strong ellipsis">{{ withLine }}</span>
      </div>
      <div class="row between">
        <span class="small strong">Plan</span>
        <span v-if="a.total" class="num tiny muted">{{ a.done }} done · {{ a.left }} left<template v-if="a.skipped"> · {{ a.skipped }} skipped</template></span>
        <span v-else class="tiny muted">No stops yet · tap to plan</span>
      </div>
      <div v-if="a.total" class="bar">
        <i class="done" :style="{ width: pct(a.done) }" />
        <i class="skipped" :style="{ width: pct(a.skipped) }" />
        <i class="missed" :style="{ width: pct(a.missed) }" />
      </div>
      <template v-if="moment.phase === 'before' && prep.total">
        <div class="row between">
          <span class="small strong">Prep</span>
          <span class="num tiny muted">{{ summary.bookings.done }}/{{ summary.bookings.total }} booked · {{ summary.packing.done }}/{{ summary.packing.total }} packed</span>
        </div>
        <div class="bar thin">
          <i class="gold" :style="{ width: `${(prep.done / prep.total) * 100}%` }" />
        </div>
      </template>
      <div v-else class="row wrap meta">
        <span v-if="summary.avgRating" class="chip t-gold"><AppIcon name="star" />{{ summary.avgRating.toFixed(1) }}</span>
        <span v-if="summary.photos" class="chip"><AppIcon name="camera" />{{ summary.photos }}</span>
        <span v-if="summary.spent" class="chip num">{{ money(summary.spent, trip.currency) }}</span>
        <span class="chip"><AppIcon name="calendar" />{{ trip.days.length }} days</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.tcard { overflow: hidden; display: flex; flex-direction: column; }
.pic { height: 150px; display: flex; align-items: flex-end; }
.st { position: absolute; top: 10px; right: 10px; gap: 6px; }
.pic-in { padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.name { font-size: 22px; letter-spacing: .14em; text-transform: uppercase; line-height: 1.1; text-shadow: 0 2px 12px rgba(0, 0, 0, .4); }
.body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 8px; }
.meta { gap: 6px; }
.group { gap: 8px; }
.gi { color: var(--accent); }
</style>
