<script setup lang="ts">
import { dayTally, type DayPlan } from '#shared/utils/plan'

const props = defineProps<{ plans: DayPlan[], todayId?: string }>()
const model = defineModel<string>({ required: true })
const items = computed(() => props.plans.map((p) => {
  const t = dayTally(p)
  return { p, t, pct: t.total ? (t.done / t.total) * 100 : 0, handled: t.total ? ((t.done + t.skipped) / t.total) * 100 : 0 }
}))
const root = ref<HTMLElement | null>(null)
watch(model, async () => {
  await nextTick()
  root.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
}, { immediate: false })
</script>

<template>
  <div ref="root" class="hscroll days" role="tablist" aria-label="Days">
    <button
      v-for="{ p, t, pct } in items"
      :key="p.view.day.id"
      type="button"
      role="tab"
      class="day"
      :aria-selected="p.view.day.id === model"
      @click="model = p.view.day.id"
    >
      <div class="pic art-frame">
        <SceneArt class="scene" :scene="p.view.cover.scene" :tod="p.view.cover.tod" />
        <div class="scrim" />
        <span class="rn">{{ p.view.day.num }}</span>
        <span v-if="p.view.day.id === todayId" class="chip t-accent today">Today</span>
        <span v-else-if="t.total && t.done === t.total" class="chip t-ok today"><AppIcon name="check" />All done</span>
      </div>
      <div class="meta">
        <div class="row between">
          <b>{{ fmtDate(p.view.day.date, 'weekday') }} {{ Number(p.view.day.date.slice(8)) }}</b>
          <span v-if="t.total" class="num tiny faint">{{ t.done }}/{{ t.total }}</span>
        </div>
        <span class="lbl ellipsis">{{ p.view.day.label }}</span>
        <div class="bar thin">
          <i class="done" :style="{ width: `${pct}%` }" />
        </div>
      </div>
    </button>
  </div>
</template>

<style scoped>
.days { gap: 10px; }
.day { width: 138px; padding: 0; border: 0; background: var(--surface); border-radius: 16px; overflow: hidden; text-align: left; box-shadow: var(--shadow); outline: 1px solid var(--line); outline-offset: -1px; transition: transform .15s ease, box-shadow .15s ease; }
.day[aria-selected="true"] { outline: 3px solid var(--accent); outline-offset: -3px; }
.day:active { transform: scale(.98); }
.pic { height: 76px; }
.rn { position: absolute; left: 8px; top: 8px; font-family: var(--font-display); font-weight: 700; font-size: 15px; letter-spacing: .06em; color: var(--on-art); background: rgba(8, 10, 24, .5); padding: 1px 8px; border-radius: 8px; }
.today { position: absolute; right: 7px; bottom: 7px; min-height: 22px; font-size: 11px; padding: 1px 8px; }
.meta { padding: 8px 10px 10px; display: flex; flex-direction: column; gap: 3px; }
.meta b { font-size: 14px; }
.lbl { font-size: 12.5px; color: var(--fg-2); }
.meta .bar { margin-top: 4px; }
</style>
