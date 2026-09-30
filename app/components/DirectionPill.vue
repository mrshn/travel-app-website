<script setup lang="ts">
import { bearing, compass, fmtDistance, haversine, travelEstimate, type LatLng, type TravelEstimate } from '#shared/utils/geo'

const props = defineProps<{ from: LatLng, to: LatLng, heading?: number | null, name?: string, onArt?: boolean, est?: TravelEstimate }>()
const meters = computed(() => haversine(props.from, props.to))
const est = computed(() => props.est ?? travelEstimate(meters.value))
const b = computed(() => bearing(props.from, props.to))
const rot = computed(() => (props.heading === null || props.heading === undefined ? b.value : b.value - props.heading))
const here = computed(() => meters.value < ARRIVED_M)
</script>

<template>
  <div class="dir" :class="{ 'on-art': onArt, here }">
    <span class="arrow" :style="{ transform: `rotate(${Math.round(rot)}deg)` }" aria-hidden="true">
      <AppIcon :name="here ? 'check' : 'up'" />
    </span>
    <span class="txt">
      <template v-if="here"><b>You're here</b><span class="sub">{{ name ? `at ${name}` : 'within a few steps' }}</span></template>
      <template v-else>
        <b class="num">{{ fmtDistance(meters) }} <span class="cmp">{{ heading === null || heading === undefined ? compass(b) : '' }}</span></b>
        <span class="sub">{{ est.source === 'google' ? '' : '~' }}{{ est.minutes }} min {{ est.mode === 'walk' ? 'walk' : 'by transit' }}{{ name ? ` to ${name}` : '' }}</span>
      </template>
    </span>
  </div>
</template>

<style scoped>
.dir { display: flex; align-items: center; gap: 12px; min-width: 0; }
.arrow { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--you-soft); color: var(--you); flex: none; transition: transform .3s ease; }
.arrow .i { width: 24px; height: 24px; stroke-width: 2.4; }
.here .arrow { background: var(--ok-soft); color: var(--ok); transform: none !important; }
.txt { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.txt b { font-size: 16px; }
.cmp { font-size: 12px; color: var(--fg-3); font-weight: 600; margin-left: 2px; }
.sub { font-size: 13px; color: var(--fg-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.on-art .arrow { background: var(--glass); color: var(--on-art); border: 1px solid var(--glass-line); }
.on-art .sub, .on-art .cmp { color: var(--on-art-2); }
</style>
