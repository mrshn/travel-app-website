<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'

const props = withDefaults(defineProps<{
  scene?: string
  tod?: string
  label?: string
  /** Draw only when on screen (pictures are detailed SVG). */
  lazy?: boolean
}>(), { lazy: true })

const el = ref<HTMLElement | null>(null)
const seen = ref(!props.lazy)
if (props.lazy) {
  const { stop } = useIntersectionObserver(el, (entries) => {
    if (entries.some(e => e.isIntersecting)) {
      seen.value = true
      stop()
    }
  }, { rootMargin: '240px' })
}
const svg = computed(() => (seen.value && props.scene ? drawScene(props.scene, props.tod || 'day', props.label || '') : ''))
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div ref="el" class="scene" :class="`tod-${tod || 'day'}`" v-html="svg" />
</template>

<style scoped>
.scene { width: 100%; height: 100%; background: linear-gradient(180deg, #3C8AD0, #D8EEF9); }
.scene.tod-dawn { background: linear-gradient(180deg, #56609F, #F6CDA3); }
.scene.tod-golden { background: linear-gradient(180deg, #E38B57, #FBE2A9); }
.scene.tod-sunset { background: linear-gradient(180deg, #4B3B7A, #F29A5F); }
.scene.tod-blue { background: linear-gradient(180deg, #1B2A5C, #5A6FA8); }
.scene.tod-night { background: linear-gradient(180deg, #0B1026, #27305A); }
</style>
