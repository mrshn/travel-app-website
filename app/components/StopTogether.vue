<script setup lang="ts">
// Stop sheet: who's in, for group trips (spec 5.4). Placeholder of package P2 (docs/design/2026-10-14-together.md); it renders nothing until P2 fills it.
import type { ResolvedStop } from '#shared/utils/plan'

defineProps<{ stop: ResolvedStop }>()
</script>

<template>
  <span v-if="false" />
</template>
