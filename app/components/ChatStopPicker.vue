<script setup lang="ts">
import type { ResolvedStop } from '#shared/utils/plan'

/**
 * "Send a stop" for the group chat (?send=stop): the plan's days and their stops, today's first during the trip.
 * Picking one hands it to the chat, with when it is ("Fri 9 Oct · 17:15").
 */
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [], pick: [stop: ResolvedStop, when: string] }>()
const v = useTripView()

const days = computed(() => {
  if (!props.open) return []
  const todayId = v.today.value?.view.day.id
  const list = v.plans.value.map(p => ({
    id: p.view.day.id,
    label: `${fmtDate(p.view.day.date, 'short')} · ${p.view.day.label}`,
    date: p.view.day.date,
    today: p.view.day.id === todayId,
    stops: p.stops.filter(s => !s.minor),
  })).filter(d => d.stops.length)
  // During the trip, today comes first.
  return [...list.filter(d => d.today), ...list.filter(d => !d.today)]
})
function pick(s: ResolvedStop, date: string) {
  emit('pick', s, `${fmtDate(date, 'short')} · ${fmtClock(s.start)}`)
}
</script>

<template>
  <BottomSheet :open="open" title="Send a stop" @close="emit('close')">
    <div class="sp">
      <section v-for="d in days" :key="d.id" class="sp-day" :aria-label="d.label">
        <h3 class="kicker">
          {{ d.today ? `Today · ${d.label}` : d.label }}
        </h3>
        <div class="card flat rows">
          <button v-for="s in d.stops" :key="s.id" class="row-item sp-row" type="button" @click="pick(s, d.date)">
            <span class="num small sp-tm">{{ fmtClock(s.start) }}</span>
            <AppIcon :name="stopIcon(s)" size="sm" :style="{ color: KIND_META[s.kind].color }" />
            <span class="grow sp-t">{{ s.title }}</span>
            <AppIcon name="send" size="sm" class="sp-go" />
          </button>
        </div>
      </section>
      <p v-if="!days.length" class="small muted">
        The plan has no stops yet.
      </p>
    </div>
  </BottomSheet>
</template>

<style scoped>
.sp { display: flex; flex-direction: column; gap: 16px; padding: 4px 16px 8px; }
.sp-day { display: flex; flex-direction: column; gap: 8px; }
.rows { overflow: hidden; background: var(--surface); }
.sp-row { min-height: 52px; padding: 8px 12px; color: var(--fg); }
.sp-row:focus-visible { outline-offset: -3px; }
.sp-tm { width: 42px; flex: none; color: var(--fg-2); }
.sp-t { font-weight: 600; line-height: 1.3; }
.sp-go { flex: none; color: var(--fg-3); }
</style>
