<script setup lang="ts">
import { fmtClock, zoned, zonedToDate } from '#shared/utils/time'

const open = defineModel<boolean>({ default: false })
const v = useTripView()
const dayId = ref('')
const time = ref('10:30')

watch(open, (o) => {
  if (!o || !v.trip.value) return
  const t = v.trip.value
  const m = v.moment.value
  dayId.value = (m?.phase === 'during' && m.dayIndex >= 0 ? t.days[m.dayIndex]?.id : t.days[1]?.id ?? t.days[0]?.id) ?? ''
  time.value = m?.phase === 'during' ? fmtClock(m.minutes) : '10:30'
})

const quick = computed(() => {
  const t = v.trip.value
  if (!t) return []
  return v.plans.value.map((p) => {
    const first = p.stops.find(s => !s.minor) ?? p.stops[0]
    const at = first ? Math.min(first.endMin - 5, first.start + 30) : 600
    return { dayId: p.view.day.id, date: p.view.day.date, label: `${fmtDate(p.view.day.date, 'weekday')} ${fmtClock(at)}`, at }
  })
})

function go(date: string, minutes: number) {
  const t = v.trip.value
  if (!t) return
  v.clock.previewAt(zonedToDate(date, minutes, t.timezone))
  open.value = false
  toast(`Previewing ${fmtDate(date, 'short')} ${fmtClock(minutes)}`)
}

function apply() {
  const t = v.trip.value
  const d = t?.days.find(x => x.id === dayId.value)
  if (!d) return
  const [h, mi] = time.value.split(':').map(Number)
  let min = (h ?? 0) * 60 + (mi ?? 0)
  if (min < 300) min += 1440
  go(d.date, min)
}

function live() {
  v.clock.live()
  open.value = false
}

const realLocal = computed(() => (v.trip.value ? zoned(v.clock.real.value, v.trip.value.timezone) : null))
</script>

<template>
  <BottomSheet :open="open" title="Preview a moment" @close="open = false">
    <div class="pv">
      <p class="muted">
        See exactly what the guide will tell you at any time of the trip. The preview clock keeps running, so countdowns move. Marks you make while previewing are real.
      </p>
      <div class="quick">
        <button v-for="q in quick" :key="q.dayId" class="btn sm" type="button" @click="go(q.date, q.at)">
          <AppIcon name="play" size="xs" />{{ q.label }}
        </button>
      </div>
      <div class="form-grid">
        <label class="field">
          <span>Day</span>
          <select v-model="dayId" class="select">
            <option v-for="d in v.trip.value?.days ?? []" :key="d.id" :value="d.id">{{ fmtDate(d.date, 'short') }} · {{ d.label }}</option>
          </select>
        </label>
        <label class="field">
          <span>Time ({{ v.trip.value?.destination }})</span>
          <input v-model="time" class="input num" type="time">
        </label>
      </div>
      <div class="row">
        <button class="btn primary grow" type="button" @click="apply">
          <AppIcon name="eye" size="sm" />Preview this moment
        </button>
        <button v-if="v.clock.previewing.value" class="btn ghost" type="button" @click="live">
          Back to live
        </button>
      </div>
      <p v-if="realLocal" class="tiny faint num">
        Real time in {{ v.trip.value?.destination }}: {{ fmtDate(realLocal.date, 'short') }} {{ fmtClock(realLocal.minutes) }}
      </p>
    </div>
  </BottomSheet>
</template>

<style scoped>
.pv { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 16px; }
.quick { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
