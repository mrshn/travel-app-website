<script setup lang="ts">
const props = defineProps<{ id: string, removable?: boolean }>()
const emit = defineEmits<{ remove: [] }>()
const { url } = usePhotos()
const src = ref<string | null>(null)
const big = ref(false)
watch(() => props.id, async (id) => {
  src.value = await url(id)
}, { immediate: true })
</script>

<template>
  <button type="button" class="thumb" :aria-label="removable ? 'Open photo' : 'Photo'" @click="big = true">
    <img v-if="src" :src="src" alt="" loading="lazy" decoding="async">
    <span v-else class="ph"><AppIcon name="image" /></span>
  </button>
  <Teleport to="body">
    <div v-if="big && src" class="lightbox" role="dialog" aria-modal="true" aria-label="Photo" @click.self="big = false" @keydown.esc="big = false">
      <img :src="src" alt="">
      <div class="bar">
        <button v-if="removable" type="button" class="btn danger sm" @click="emit('remove'); big = false">
          <AppIcon name="trash" size="sm" />Delete photo
        </button>
        <button type="button" class="btn sm" @click="big = false">
          <AppIcon name="x" size="sm" />Close
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.thumb { position: relative; display: block; width: 100%; aspect-ratio: 1; border-radius: 12px; overflow: hidden; border: 0; padding: 0; background: var(--surface-2); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ph { display: grid; place-items: center; width: 100%; height: 100%; color: var(--fg-3); }
.lightbox { position: fixed; inset: 0; z-index: 4000; background: rgba(0, 0, 0, .92); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 16px; }
.lightbox img { max-width: 100%; max-height: calc(100dvh - 110px); object-fit: contain; border-radius: 8px; }
.lightbox .bar { display: flex; gap: 10px; }
</style>
