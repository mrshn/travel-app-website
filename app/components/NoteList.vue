<script setup lang="ts">
import type { Note, NoteKind } from '#shared/utils/notes'

const props = defineProps<{ notes: Note[], from?: string, showTrips?: boolean }>()
const { trips } = useTrips()
const kind = ref<NoteKind | 'all'>('all')
const q = ref('')

const kinds = computed(() => (Object.keys(NOTE_META) as NoteKind[]).filter(k => props.notes.some(n => n.kind === k)))
const shown = computed(() => {
  const needle = q.value.trim().toLowerCase()
  return props.notes.filter(n =>
    (kind.value === 'all' || n.kind === kind.value)
    && (!needle || `${n.title} ${n.summary ?? ''} ${n.tags.join(' ')} ${n.body}`.toLowerCase().includes(needle)),
  )
})
const tripTitle = (id?: string) => (id ? trips.value.find(t => t.id === id)?.title ?? id : undefined)
</script>

<template>
  <div class="nlist">
    <div v-if="notes.length > 3" class="filters">
      <div v-if="kinds.length > 1" class="seg" role="group" aria-label="Kind">
        <button type="button" :aria-pressed="kind === 'all'" @click="kind = 'all'">
          All <span class="num faint">{{ notes.length }}</span>
        </button>
        <button v-for="k in kinds" :key="k" type="button" :aria-pressed="kind === k" @click="kind = k">
          <AppIcon :name="NOTE_META[k].icon" size="sm" />{{ NOTE_META[k].plural }}
        </button>
      </div>
      <label class="search">
        <AppIcon name="search" size="sm" />
        <input v-model="q" type="search" placeholder="Search notes" aria-label="Search notes">
      </label>
    </div>
    <div class="cards">
      <NoteCard v-for="n in shown" :key="n.slug" :note="n" :from="from" :trip-title="showTrips ? tripTitle(n.trip) : undefined" />
    </div>
    <p v-if="notes.length && !shown.length" class="card empty">
      Nothing matches.
    </p>
  </div>
</template>

<style scoped>
.nlist { display: flex; flex-direction: column; gap: 12px; }
.filters { display: flex; flex-direction: column; gap: 10px; }
.search { display: flex; align-items: center; gap: 8px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--fg-3); }
.search input { flex: 1; border: 0; background: none; min-height: 44px; font-size: 16px; color: var(--fg); outline: none; }
.search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.cards { display: flex; flex-direction: column; gap: 10px; }
</style>
