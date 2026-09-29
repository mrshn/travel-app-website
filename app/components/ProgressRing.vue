<script setup lang="ts">
export interface RingSegment { value: number, color: string, label?: string }

const props = withDefaults(defineProps<{
  segments: RingSegment[]
  total?: number
  size?: number
  stroke?: number
  track?: string
  label?: string
}>(), { size: 120, stroke: 12, track: 'var(--surface-2)' })

const r = computed(() => (props.size - props.stroke) / 2)
const c = computed(() => 2 * Math.PI * r.value)
const tot = computed(() => props.total ?? props.segments.reduce((a, s) => a + s.value, 0))
const arcs = computed(() => {
  let off = 0
  const shown = props.segments.filter(s => s.value > 0)
  const gap = shown.length > 1 && props.size > 60 ? 2 : 0
  return shown.map((s) => {
    const len = tot.value ? (Math.min(s.value, tot.value) / tot.value) * c.value : 0
    const a = { ...s, len: Math.max(0, len - gap), off }
    off += len
    return a
  })
})
const aria = computed(() => props.label ?? props.segments.map(s => `${s.label ?? ''} ${s.value}`).join(', '))
</script>

<template>
  <div class="ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :viewBox="`0 0 ${size} ${size}`" role="img" :aria-label="aria">
      <circle :cx="size / 2" :cy="size / 2" :r="r" fill="none" :stroke="track" :stroke-width="stroke" />
      <circle
        v-for="(a, i) in arcs"
        :key="i"
        :cx="size / 2"
        :cy="size / 2"
        :r="r"
        fill="none"
        :stroke="a.color"
        :stroke-width="stroke"
        :stroke-dasharray="`${a.len} ${c}`"
        :stroke-dashoffset="-a.off"
        :transform="`rotate(-90 ${size / 2} ${size / 2})`"
        class="arc"
      />
    </svg>
    <div class="center">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ring { position: relative; flex: none; }
.ring svg { width: 100%; height: 100%; display: block; }
.arc { transition: stroke-dasharray .5s ease, stroke-dashoffset .5s ease; }
.center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.1; }
</style>
