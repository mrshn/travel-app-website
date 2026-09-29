<script setup lang="ts">
const props = defineProps<{ name?: string, size?: 'xs' | 'sm' | 'lg' | 'xl' }>()
const html = computed(() => iconSvg(props.name))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <svg class="i" :class="size" viewBox="0 0 24 24" aria-hidden="true" focusable="false" v-html="html" />
</template>
