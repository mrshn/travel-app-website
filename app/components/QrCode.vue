<script setup lang="ts">
import { encode } from 'uqr'

/** A QR code of a link, dark on white whatever the theme (phones' cameras read it best), with its quiet zone. */
const props = withDefaults(defineProps<{ value: string, size?: number, label?: string }>(), { size: 200, label: 'QR code of this link' })

const qr = computed(() => {
  try {
    return encode(props.value, { ecc: 'M', border: 2 })
  }
  catch {
    return null
  }
})
/** One path of every dark module. */
const path = computed(() => {
  const q = qr.value
  if (!q) return ''
  let d = ''
  q.data.forEach((row, y) => row.forEach((on, x) => {
    if (on) d += `M${x} ${y}h1v1h-1z`
  }))
  return d
})
</script>

<template>
  <svg v-if="qr" class="qr" :width="size" :height="size" :viewBox="`0 0 ${qr.size} ${qr.size}`" role="img" :aria-label="label" shape-rendering="crispEdges">
    <rect :width="qr.size" :height="qr.size" fill="#fff" />
    <path :d="path" fill="#111" />
  </svg>
</template>

<style scoped>
.qr { display: block; border-radius: 12px; max-width: 100%; height: auto; }
</style>
