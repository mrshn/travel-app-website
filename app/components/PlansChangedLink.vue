<script setup lang="ts">
// Now: the way into Plans changed (spec 5.12). Placeholder of package P5 (docs/design/2026-10-14-together.md); it renders nothing until P5 fills it.
defineProps<{ phase: 'before' | 'during' }>()
</script>

<template>
  <span v-if="false" />
</template>
