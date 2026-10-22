<script setup lang="ts">
// Apply the saved theme early.
useTheme()
</script>

<template>
  <NuxtPwaManifest />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- The social layer's sheets work on every screen (docs/design/2026-10-14-together.md, 4.2). -->
  <PostComposer />
  <PostSheet />
  <FriendSheet />
  <InboxSheet />
  <ToastHost />
</template>
