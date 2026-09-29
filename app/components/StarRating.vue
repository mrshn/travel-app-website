<script setup lang="ts">
const model = defineModel<number | undefined>()
withDefaults(defineProps<{ size?: number, readonly?: boolean }>(), { size: 34 })
const hover = ref(0)
function pick(n: number) {
  model.value = model.value === n ? undefined : n
}
</script>

<template>
  <div v-if="readonly" class="stars ro" :aria-label="`${model ?? 0} out of 5`">
    <svg v-for="n in 5" :key="n" viewBox="0 0 24 24" :width="size" :height="size" :class="{ on: (model ?? 0) >= n }" aria-hidden="true">
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />
    </svg>
  </div>
  <div v-else class="stars" role="radiogroup" aria-label="Rating" @mouseleave="hover = 0">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      :aria-checked="model === n"
      :aria-label="`${n} star${n > 1 ? 's' : ''}`"
      @mouseenter="hover = n"
      @click="pick(n)"
    >
      <svg viewBox="0 0 24 24" :width="size" :height="size" :class="{ on: (hover || model || 0) >= n }" aria-hidden="true">
        <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.stars { display: inline-flex; gap: 2px; }
.stars button { background: none; border: 0; padding: 2px; border-radius: 8px; line-height: 0; }
.stars svg { fill: var(--surface-2); stroke: var(--line); stroke-width: 1.2; stroke-linejoin: round; transition: fill .12s ease, transform .12s ease; }
.stars svg.on { fill: var(--gold); stroke: var(--gold); }
.stars button:active svg { transform: scale(.88); }
.stars.ro svg { stroke-width: 0; }
</style>
