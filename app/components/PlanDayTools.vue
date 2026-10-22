<script setup lang="ts">
/**
 * Plan's day tools (spec 5.12): "Plans changed?" for the day on screen (?changed=1&day=<id>). During the trip for today
 * and the days ahead; before it, from the day before it starts. Not after the trip.
 */
const props = defineProps<{ dayId: string }>()
const v = useTripView()
const route = useRoute()
const router = useRouter()

const show = computed(() => {
  const m = v.moment.value
  const i = v.trip.value?.days.findIndex(d => d.id === props.dayId) ?? -1
  if (!m || i < 0) return false
  if (m.phase === 'during') return i >= m.dayIndex
  return m.phase === 'before' && m.daysToStart <= 1
})

function open() {
  router.push({ query: { ...route.query, day: props.dayId, changed: '1' } })
}
</script>

<template>
  <div v-if="show" class="pdt">
    <button class="btn sm ghost" type="button" @click="open">
      <AppIcon name="lifebuoy" size="sm" />Plans changed?
    </button>
  </div>
</template>

<style scoped>
.pdt { display: flex; margin-top: 12px; }
.pdt .btn { color: var(--fg); }
.pdt .i { color: var(--warn); }
</style>
