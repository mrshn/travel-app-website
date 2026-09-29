<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 30 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true" class="logo">
    <rect width="64" height="64" rx="15" fill="#8A1538" />
    <path d="M19 49V31a13 13 0 0 1 26 0v18" fill="none" stroke="#E3B545" stroke-width="5" stroke-linecap="round" />
    <path d="M13 49h38" fill="none" stroke="#E3B545" stroke-width="5" stroke-linecap="round" />
    <circle cx="32" cy="32" r="5.2" fill="#F5ECD5" />
  </svg>
</template>
