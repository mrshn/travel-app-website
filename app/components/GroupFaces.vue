<script setup lang="ts">
/**
 * A few faces in a row, then "+3" (AvatarStack), as the group trip screens show them. It keeps AvatarStack in a row
 * with its faces overlapping: AvatarStack's root class (.stack) also gets main.css's .stack (a column with a 12 px
 * gap), and its own overlap rule (two :deep() in one selector) doesn't compile. Once AvatarStack is fixed, these
 * rules change nothing and this can go.
 */
defineProps<{
  people: { uid?: string, name: string, photo?: string | null }[]
  max?: number
  size?: number
  /** What the faces mean, for screen readers ("In: Ali and Can"). */
  label?: string
}>()
</script>

<template>
  <AvatarStack class="gf" :people="people" :max="max" :size="size" :label="label" />
</template>

<style scoped>
.gf { flex-direction: row; gap: 0; }
.gf :deep(.av + .av) { margin-left: calc(var(--s) * -.28); }
</style>
