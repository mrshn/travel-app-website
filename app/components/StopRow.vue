<script setup lang="ts">
import type { Feedback } from '#shared/types/trip'
import type { ResolvedStop, StopState } from '#shared/utils/plan'

const props = defineProps<{
  stop: ResolvedStop
  state: StopState
  feedback?: Feedback
  last?: boolean
}>()
const emit = defineEmits<{ open: [], toggle: [] }>()
const done = computed(() => props.state === 'done')
const tags = computed(() => props.stop.tags ?? [])
</script>

<template>
  <li :id="`stop-${stop.id}`" class="srow" :class="[`s-${state}`, `k-${stop.kind}`, { minor: stop.minor, last }]">
    <div class="time num">
      <span>{{ fmtClock(stop.start) }}</span>
      <small v-if="stop.end && !stop.minor">{{ fmtClock(stop.end) }}</small>
    </div>
    <div class="rail" aria-hidden="true">
      <span class="node"><AppIcon :name="state === 'done' ? 'check' : stopIcon(stop)" :size="stop.minor ? 'xs' : 'sm'" /></span>
    </div>
    <button type="button" class="body" @click="emit('open')">
      <span v-if="stop.base.options" class="opt">{{ stop.base.title }}</span>
      <span class="title">{{ stop.title }}</span>
      <span v-if="!stop.minor || state !== 'upcoming'" class="meta">
        <StateBadge v-if="state !== 'upcoming'" :state="state" />
        <span v-if="tags.includes('must')" class="chip t-accent-soft">Must</span>
        <span v-if="tags.includes('optional')" class="chip t-plain">Optional</span>
        <span v-if="tags.includes('skipIfTired')" class="chip t-plain">Skip if tired</span>
        <span v-if="stop.cost && !stop.minor" class="chip num">{{ stop.cost }}</span>
        <span v-if="feedback?.rating" class="chip t-gold"><AppIcon name="star" />{{ feedback.rating }}</span>
        <span v-if="feedback?.photos?.length" class="chip"><AppIcon name="camera" />{{ feedback.photos.length }}</span>
        <span v-if="feedback?.note" class="chip" title="Has a note"><AppIcon name="chat" /></span>
        <span v-if="stop.custom" class="chip t-plain">Added by you</span>
      </span>
    </button>
    <button
      type="button"
      class="tick"
      :class="{ on: done }"
      :aria-pressed="done"
      :aria-label="done ? `Mark “${stop.title}” as not done` : `Mark “${stop.title}” as done`"
      @click="emit('toggle')"
    >
      <AppIcon name="check" />
    </button>
  </li>
</template>

<style scoped>
.srow {
  --kc: var(--c-sight);
  position: relative;
  display: grid;
  grid-template-columns: 46px 30px minmax(0, 1fr) 46px;
  align-items: start;
  column-gap: 8px;
  list-style: none;
}
.srow.k-food { --kc: var(--c-food); }
.srow.k-night { --kc: var(--c-night); }
.srow.k-move { --kc: var(--c-move); }
.srow.k-rest { --kc: var(--c-rest); }
.srow.k-task { --kc: var(--c-task); }
.time { padding-top: 14px; text-align: right; font-size: 13.5px; font-weight: 600; line-height: 1.15; color: var(--fg); }
.time small { display: block; font-size: 11.5px; font-weight: 500; color: var(--fg-3); margin-top: 2px; }
.rail { position: relative; align-self: stretch; display: flex; justify-content: center; }
.rail::before { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; margin-left: -1px; background: var(--line); }
.srow:first-child .rail::before { top: 18px; }
.srow.last .rail::before { bottom: calc(100% - 18px); }
.node {
  position: relative;
  margin-top: 10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--surface);
  color: var(--kc);
  border: 2px solid color-mix(in srgb, var(--kc) 55%, var(--line));
}
.body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  margin: 4px 0;
  padding: 9px 10px;
  border-radius: 12px;
  border: 0;
  background: none;
  text-align: left;
  color: inherit;
}
.body:hover { background: var(--surface-2); }
.opt { font-size: 11.5px; font-weight: 650; letter-spacing: .04em; text-transform: uppercase; color: var(--fg-3); }
.title { font-weight: 650; font-size: 15.5px; line-height: 1.3; }
.meta { display: flex; flex-wrap: wrap; gap: 5px; }
.tick {
  margin-top: 8px;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 2px solid var(--line);
  background: var(--surface);
  color: transparent;
  display: grid;
  place-items: center;
  justify-self: center;
  transition: all .15s ease;
}
.tick:hover { border-color: var(--ok); color: var(--ok); }
.tick.on { background: var(--ok); border-color: var(--ok); color: var(--ok-ink); }
.tick .i { stroke-width: 2.6; }

/* states */
.s-now .node { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); box-shadow: 0 0 0 5px var(--accent-soft); }
.s-now .body { background: var(--accent-soft); }
.s-next .node { border-color: var(--gold); color: var(--gold-ink); background: var(--gold-soft); }
.s-done .node { background: var(--ok); border-color: var(--ok); color: var(--ok-ink); }
.s-done .title { color: var(--fg-2); }
.s-skipped .title { color: var(--fg-3); text-decoration: line-through; text-decoration-thickness: 1.5px; }
.s-skipped .node, .s-missed .node { opacity: .6; }
.s-skipped .time, .s-done .time { color: var(--fg-3); }

/* small logistics steps */
.minor .time { padding-top: 9px; font-size: 12.5px; color: var(--fg-2); }
.minor .node { width: 22px; height: 22px; margin-top: 7px; border-width: 1.5px; }
.minor .body { padding: 6px 10px; margin: 1px 0; }
.minor .title { font-size: 14px; font-weight: 550; color: var(--fg-2); }
.minor .tick { width: 30px; height: 30px; margin-top: 4px; border-radius: 9px; }
.minor .tick .i { width: 16px; height: 16px; }
.minor.s-now .body { background: var(--accent-soft); }
</style>
