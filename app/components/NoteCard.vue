<script setup lang="ts">
import type { Note } from '#shared/utils/notes'

const props = defineProps<{ note: Note, tripTitle?: string, from?: string }>()
const meta = computed(() => NOTE_META[props.note.kind])
</script>

<template>
  <NuxtLink :to="{ path: `/notes/${note.slug}`, query: from ? { from } : undefined }" class="ncard card card-link">
    <span class="ic" :class="`k-${note.kind}`"><AppIcon :name="meta.icon" /></span>
    <span class="grow body">
      <span class="top">
        <span class="kind">{{ meta.label }}</span>
        <span v-if="note.date" class="num tiny faint">{{ fmtDate(note.date, 'full') }}</span>
      </span>
      <b class="ttl">{{ note.title }}</b>
      <span v-if="note.summary" class="small muted clamp-2">{{ note.summary }}</span>
      <span v-if="tripTitle || note.tags.length" class="row wrap chips">
        <span v-if="tripTitle" class="chip t-accent-soft"><AppIcon name="pin" />{{ tripTitle }}</span>
        <span v-for="t in note.tags.slice(0, 4)" :key="t" class="chip">#{{ t }}</span>
      </span>
    </span>
    <AppIcon name="chevr" class="chev" />
  </NuxtLink>
</template>

<style scoped>
.ncard { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; }
.ic { width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--surface-2); color: var(--fg-2); }
.ic.k-chat { background: var(--accent-soft); color: var(--accent); }
.ic.k-research { background: color-mix(in srgb, var(--c-move) 16%, var(--surface)); color: var(--c-move); }
.ic.k-tips { background: var(--gold-soft); color: var(--gold-ink); }
.ic.k-page { background: color-mix(in srgb, var(--c-night) 16%, var(--surface)); color: var(--c-night); }
.body { display: flex; flex-direction: column; gap: 3px; }
.top { display: flex; align-items: baseline; gap: 8px; }
.kind { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--fg-3); }
.ttl { font-size: 16px; line-height: 1.3; }
.chips { gap: 6px; margin-top: 4px; }
.chev { color: var(--fg-3); margin-top: 10px; }
</style>
