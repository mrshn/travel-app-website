<script lang="ts">
/** Radius the laurel's leaves grow on, their outward tilt, and one leaf (base at 0,0, pointing along x). */
const R = 24.5
const TILT = 28
const LEAF = 'M0 0Q4.5-2.7 9.2 0Q4.5 2.7 0 0Z'
/** Six leaves a side, in degrees clockwise from the top: from the bottom up, leaving the top open. */
const SIDE = [150, 126, 102, 78, 54, 30]

const round = (n: number) => Math.round(n * 100) / 100
function at(deg: number): string {
  const r = (deg * Math.PI) / 180
  return `${round(32 + R * Math.sin(r))} ${round(32 - R * Math.cos(r))}`
}

/** Each leaf sits on the circle and points up its branch, tilted outwards: 12 in all. */
const LEAVES = [
  ...SIDE.map(t => `translate(${at(t)}) rotate(${round(t + 180 + TILT)})`),
  ...SIDE.map(t => `translate(${at(360 - t)}) rotate(${round(360 - t - TILT)})`),
]
/** The two branches the leaves grow from. */
const STEMS = `M${at(160)}A${R} ${R} 0 0 0 ${at(22)}M${at(200)}A${R} ${R} 0 0 1 ${at(338)}`
</script>

<script setup lang="ts">
import type { GameBadge } from '#shared/utils/game'

/**
 * A badge's seal (spec 4.5). Earned: a laurel of 12 leaves around a gold disc with the badge's icon.
 * Locked: a dashed ring with the icon in grey. The two read apart by shape, not only by colour, and the
 * page always shows "Earned" or "2 of 8" next to it.
 */
const props = withDefaults(defineProps<{
  badge: Pick<GameBadge, 'label' | 'icon' | 'earned'> & Partial<Pick<GameBadge, 'value' | 'goal'>>
  size?: number
}>(), { size: 64 })

const name = computed(() => {
  const b = props.badge
  const state = b.earned ? 'earned' : b.goal ? `${b.value ?? 0} of ${b.goal}` : 'not earned yet'
  return `${b.label} badge, ${state}`
})
const icon = computed(() => iconSvg(props.badge.icon))
</script>

<template>
  <svg class="seal" :class="{ on: badge.earned }" :width="size" :height="size" viewBox="0 0 64 64" role="img" :aria-label="name">
    <template v-if="badge.earned">
      <path class="stem" :d="STEMS" />
      <path v-for="(t, i) in LEAVES" :key="i" class="leaf" :d="LEAF" :transform="t" />
      <circle class="disc" cx="32" cy="32" r="17.5" />
    </template>
    <circle v-else class="ring" cx="32" cy="32" r="21" />
    <!-- eslint-disable-next-line vue/no-v-html -->
    <svg class="icon" x="21" y="21" width="22" height="22" viewBox="0 0 24 24" v-html="icon" />
  </svg>
</template>

<style scoped>
.seal { display: block; flex: none; overflow: visible; }
/* Earned: the laurel and the disc's rim in the darker gold of stamp rims (3:1 on a light card), the disc gold. */
.leaf { fill: var(--gold-rim); }
.stem { fill: none; stroke: var(--gold-rim); stroke-width: 1.3; stroke-linecap: round; }
.disc { fill: var(--gold); stroke: var(--gold-rim); stroke-width: 1.5; }
.ring { fill: none; stroke: var(--line); stroke-width: 2; stroke-dasharray: 4 3.2; }
.icon { color: var(--fg-3); fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; overflow: visible; }
/* Dark ink on the gold disc, as on the gold buttons. */
.on .icon { color: #231A04; }
</style>
