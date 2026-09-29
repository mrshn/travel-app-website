<script setup lang="ts">
const route = useRoute()
await navigateTo({ path: `/trips/${route.params.id}/now`, query: route.query }, { replace: true })
</script>

<template>
  <div />
</template>
