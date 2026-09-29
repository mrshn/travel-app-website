<script setup lang="ts">
import type { StopState } from '#shared/utils/plan'

const props = defineProps<{ state: StopState, onArt?: boolean }>()
const meta = computed(() => STATE_META[props.state])
</script>

<template>
  <span class="chip" :class="onArt ? 'on-art' : `t-${meta.tone}`">
    <span v-if="state === 'now'" class="live-dot" aria-hidden="true" />
    <AppIcon v-else :name="meta.icon" />
    {{ meta.label }}
  </span>
</template>
