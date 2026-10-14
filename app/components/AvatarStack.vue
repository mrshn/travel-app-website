<script setup lang="ts">
/** A few faces overlapping, then "+3": who's in, who voted, who's in the trip. */
const props = withDefaults(defineProps<{
  people: { uid?: string, name: string, photo?: string | null }[]
  max?: number
  size?: number
  /** What the stack means, read by screen readers ("In: Ali, Can and 2 others"). */
  label?: string
}>(), { max: 3, size: 24, label: undefined })

const shown = computed(() => props.people.slice(0, props.max))
const more = computed(() => Math.max(0, props.people.length - props.max))
const names = computed(() => {
  const n = props.people.map(p => p.name.split(/\s+/)[0] || p.name)
  if (n.length <= 2) return n.join(' and ')
  if (n.length === 3) return `${n[0]}, ${n[1]} and ${n[2]}`
  return `${n[0]}, ${n[1]} and ${n.length - 2} others`
})
</script>

<template>
  <span v-if="people.length" class="stack" role="img" :aria-label="label ? `${label}: ${names}` : names" :style="{ '--s': `${size}px` }">
    <Avatar v-for="p in shown" :key="p.uid ?? p.name" :person="p" :size="size" ring />
    <span v-if="more" class="more num" aria-hidden="true">+{{ more }}</span>
  </span>
</template>

<style scoped>
.stack { display: inline-flex; align-items: center; flex: none; }
.stack > :deep(.av) + :deep(.av), .stack > .more { margin-left: calc(var(--s) * -.28); }
.more { display: inline-grid; place-items: center; min-width: var(--s); height: var(--s); padding: 0 5px; border-radius: 999px; background: var(--surface-2); color: var(--fg-2); font-size: calc(var(--s) * .44); font-weight: 600; box-shadow: 0 0 0 2px var(--surface); }
</style>
