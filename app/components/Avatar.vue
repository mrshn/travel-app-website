<script setup lang="ts">
import { socialInitials } from '#shared/utils/social'

/**
 * A person's face: their photo, or their initials on a colour of their own. Decorative by default (the name is
 * usually next to it); give `label` when it stands alone.
 */
const props = withDefaults(defineProps<{
  person: { uid?: string, name: string, photo?: string | null } | null | undefined
  size?: number
  label?: string
  /** A ring in the page's colour, for faces that overlap. */
  ring?: boolean
}>(), { size: 32, label: undefined, ring: false })

const TONES = ['var(--c-sight)', 'var(--c-food)', 'var(--c-night)', 'var(--c-move)', 'var(--accent)', 'var(--gold-ink)', 'var(--ok)']
const tone = computed(() => {
  const key = props.person?.uid || props.person?.name || '?'
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]!
})
const failed = ref(false)
watch(() => props.person?.photo, () => (failed.value = false))
const showPhoto = computed(() => !!props.person?.photo && !failed.value)
</script>

<template>
  <span
    class="av"
    :class="{ ring }"
    :style="{ '--s': `${size}px`, '--t': tone }"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <img v-if="showPhoto" :src="person!.photo!" alt="" referrerpolicy="no-referrer" loading="lazy" @error="failed = true">
    <span v-else class="in">{{ socialInitials(person?.name ?? '') }}</span>
  </span>
</template>

<style scoped>
.av { position: relative; flex: none; display: inline-grid; place-items: center; width: var(--s); height: var(--s); border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--t) 22%, var(--surface)); color: color-mix(in srgb, var(--t) 70%, var(--fg)); }
.av.ring { box-shadow: 0 0 0 2px var(--surface); }
.av img { width: 100%; height: 100%; object-fit: cover; }
.in { font-weight: 700; font-size: calc(var(--s) * .38); letter-spacing: .02em; line-height: 1; }
</style>
