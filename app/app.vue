<script setup lang="ts">
// Apply the saved theme early.
useTheme()
</script>

<template>
  <NuxtPwaManifest />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ToastHost />
</template>
