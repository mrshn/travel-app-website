<script setup lang="ts">
// Stop sheet: share a moment, ask people to join (spec 5.10, 5.6). Placeholder of package P4 (docs/design/2026-10-14-together.md); it renders nothing until P4 fills it.
import type { ResolvedStop } from '#shared/utils/plan'

defineProps<{ stop: ResolvedStop }>()
</script>

<template>
  <span v-if="false" />
</template>
