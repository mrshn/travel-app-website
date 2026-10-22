<script setup lang="ts">
import { counts } from '#shared/utils/plan'
import { placeStampDate } from '#shared/utils/places'
import { fmtDate } from '#shared/utils/time'
import { useFriendsState } from './FriendsNotice.vue'

/**
 * Plan's "Your day" card: Share your day (docs/design/2026-10-14-together.md, 5.6). Opens the composer as a day recap:
 * the trip, a line from the day ("11 stops · 4 stamps · ★★★★") and the day's photos on this device to pick from.
 * Hidden on a device with no account.
 */
const props = defineProps<{ dayId: string }>()
const v = useTripView()
const state = useFriendsState()
const composer = usePostComposer()

const plan = computed(() => v.plans.value.find(p => p.view.day.id === props.dayId))

/** "11 stops · 4 stamps · ★★★★": what you did that day (stops done, places stamped, your rating of the day). */
const recap = computed(() => {
  const t = v.trip.value
  const p = plan.value
  if (!t || !p) return ''
  const stops = p.stops.filter(s => counts(s))
  const done = stops.filter(s => p.states[s.id] === 'done').length
  let stamps = 0
  for (const info of v.stamps.value.values()) {
    if (placeStampDate(t, info) === p.view.day.date) stamps++
  }
  const rating = Math.round(v.progress.value.dayNotes[props.dayId]?.rating ?? 0)
  const parts: string[] = []
  if (done) parts.push(`${done} ${done === 1 ? 'stop' : 'stops'}`)
  else if (stops.length) parts.push(`${stops.length} ${stops.length === 1 ? 'stop' : 'stops'} planned`)
  if (stamps) parts.push(`${stamps} ${stamps === 1 ? 'stamp' : 'stamps'}`)
  if (rating > 0) parts.push('★'.repeat(Math.min(5, rating)))
  return parts.join(' · ')
})

/** The day's photos on this device (its stops' photos), to pick one from. */
const photoIds = computed(() => [...new Set((plan.value?.stops ?? []).flatMap(s => v.progress.value.feedback[s.id]?.photos ?? []))])

function share() {
  const t = v.trip.value
  const p = plan.value
  if (!t || !p) return
  composer.open({
    draft: {
      kind: 'day',
      trip: { title: t.title, destination: t.destination, start: t.start, end: t.end },
      ...(recap.value ? { recap: recap.value } : {}),
    },
    photoIds: photoIds.value,
    context: `${fmtDate(p.view.day.date, 'long')} · Day ${p.view.index + 1} of ${t.days.length}`,
  })
}
</script>

<template>
  <div v-if="state !== 'off' && plan" class="dshare">
    <button class="btn sm ghost" type="button" @click="share">
      <AppIcon name="share" size="sm" />Share your day
    </button>
    <span v-if="recap" class="tiny muted tnum">{{ recap }}</span>
  </div>
</template>

<style scoped>
.dshare { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; padding-top: 12px; border-top: 1px solid var(--line); }
</style>
