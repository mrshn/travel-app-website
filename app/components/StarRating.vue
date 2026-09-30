<script setup lang="ts">
const model = defineModel<number | undefined>()
withDefaults(defineProps<{ size?: number, readonly?: boolean }>(), { size: 34 })
/** The star a mouse is over (0: none). Touch never sets it, so a tap shows the rating as it is. */
const hover = ref(0)
function over(e: PointerEvent, n: number) {
  if (e.pointerType === 'mouse') hover.value = n
}
function out(e: PointerEvent) {
  if (e.pointerType === 'mouse') hover.value = 0
}
/** Tapping the star of the rating you gave clears it; any other star sets it. */
function pick(n: number) {
  hover.value = 0
  model.value = model.value === n ? undefined : n
}
</script>

<template>
  <div v-if="readonly" class="stars ro" role="img" :aria-label="`${model ?? 0} out of 5`">
    <svg v-for="n in 5" :key="n" viewBox="0 0 24 24" :width="size" :height="size" :class="{ on: (model ?? 0) >= n }" aria-hidden="true">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />
    </svg>
  </div>
  <div v-else class="stars" role="radiogroup" aria-label="Rating" @pointerleave="out">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      :aria-checked="model === n"
      :aria-label="`${n} star${n > 1 ? 's' : ''}`"
      @pointerenter="over($event, n)"
      @click="pick(n)"
    >
      <svg viewBox="0 0 24 24" :width="size" :height="size" :class="{ on: (hover || model || 0) >= n }" aria-hidden="true">
        <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.stars { display: inline-flex; gap: 0; }
/* Each star is its own 44 px target, so neighbouring stars never take each other's taps. */
.stars button { background: none; border: 0; padding: 2px; border-radius: 8px; line-height: 0; min-width: 44px; min-height: 44px; display: inline-grid; place-items: center; }
/* An unlit star keeps a visible outline (3:1 or more in both themes): it is a control. */
.stars svg { fill: var(--surface-2); stroke: var(--fg-3); stroke-width: 1.3; stroke-linejoin: round; transition: fill .12s ease, stroke .12s ease, transform .12s ease; }
.stars svg.on { fill: var(--gold); stroke: var(--gold); }
.stars button:active svg { transform: scale(.88); }
.stars.ro { gap: 2px; }
/* Read-only stars are small (14 to 16 px): lit ones need no outline, unlit ones keep a thicker one (3:1 or more). */
.stars.ro svg.on { stroke-width: 0; }
.stars.ro svg:not(.on) { stroke-width: 2; }
</style>
