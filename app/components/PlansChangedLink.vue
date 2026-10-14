<script setup lang="ts">
/**
 * Now's way into Plans changed (spec 5.12): a quiet row that opens ?changed=1. During the trip it sits under the Next
 * card; before the trip, under the countdown from the day before it starts (when a flight can still go wrong).
 */
const props = defineProps<{ phase: 'before' | 'during' }>()
const v = useTripView()
const route = useRoute()
const router = useRouter()

const show = computed(() => {
  const m = v.moment.value
  if (!m || m.phase !== props.phase) return false
  return props.phase === 'during' || m.daysToStart <= 1
})
const title = computed(() => (props.phase === 'during' ? 'Plans changed?' : 'Flight trouble?'))
const sub = computed(() => (props.phase === 'during' ? 'Running late, starting later or a cancelled flight' : 'What to do, and how to re-plan'))

function open() {
  router.push({ query: { ...route.query, changed: '1' } })
}
</script>

<template>
  <button v-if="show" type="button" class="pcl card" :class="`ph-${phase}`" @click="open">
    <span class="ic" aria-hidden="true"><AppIcon name="lifebuoy" /></span>
    <span class="tx">
      <b>{{ title }}</b>
      <span class="small muted">{{ sub }}</span>
    </span>
    <AppIcon name="chevr" class="chev" />
  </button>
</template>

<style scoped>
.pcl { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; padding: 8px 14px 8px 10px; text-align: left; color: var(--fg); box-shadow: none; }
@media (hover: hover) { .pcl:hover { background: var(--surface-2); } }
.pcl:active { background: var(--surface-2); }
.ph-before { margin-bottom: 16px; }
.ic { flex: none; width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; background: var(--warn-soft); color: var(--warn); }
.tx { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; line-height: 1.3; }
.tx b { font-size: 15px; font-weight: 650; }
.chev { flex: none; color: var(--fg-3); }
</style>
