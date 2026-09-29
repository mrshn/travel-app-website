<script setup lang="ts">
import { watchDebounced } from '@vueuse/core'

const props = defineProps<{ stopId: string, title?: string }>()
const v = useTripView()
const photos = usePhotos()

const fb = computed(() => v.progress.value.feedback[props.stopId])
const currency = computed(() => v.trip.value?.currency ?? 'EUR')
const fx = computed(() => v.trip.value?.fx)

const note = ref(fb.value?.note ?? '')
const spent = ref<number | null>(fb.value?.spent ?? null)
const busy = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

function flushNote(id: string) {
  const saved = v.progress.value.feedback[id]?.note ?? ''
  if (saved !== note.value) v.setFeedback(id, { note: note.value })
}

watch(() => props.stopId, (_id, old) => {
  if (old) flushNote(old)
  note.value = fb.value?.note ?? ''
  spent.value = fb.value?.spent ?? null
})
onBeforeUnmount(() => flushNote(props.stopId))

watchDebounced(note, (n) => {
  if ((fb.value?.note ?? '') !== n) v.setFeedback(props.stopId, { note: n })
}, { debounce: 450 })

function saveSpent() {
  const n = spent.value === null || Number.isNaN(Number(spent.value)) ? undefined : Math.max(0, Number(spent.value))
  v.setFeedback(props.stopId, { spent: n || undefined })
}

const rating = computed({
  get: () => fb.value?.rating,
  set: (r?: number) => v.setFeedback(props.stopId, { rating: r }),
})

function toggleTag(t: string) {
  const cur = new Set(fb.value?.tags ?? [])
  if (cur.has(t)) cur.delete(t)
  else cur.add(t)
  v.setFeedback(props.stopId, { tags: [...cur] })
}

async function addPhotos(e: Event) {
  const files = [...((e.target as HTMLInputElement).files ?? [])]
  if (!files.length) return
  busy.value = true
  try {
    const ids: string[] = []
    for (const f of files.slice(0, 12)) ids.push(await photos.add(f))
    v.setFeedback(props.stopId, { photos: [...(fb.value?.photos ?? []), ...ids] })
    toast(ids.length > 1 ? `${ids.length} photos saved` : 'Photo saved', { tone: 'ok' })
  }
  catch {
    toast('Could not save that photo', { tone: 'warn' })
  }
  finally {
    busy.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function removePhoto(id: string) {
  await photos.remove(id)
  v.setFeedback(props.stopId, { photos: (fb.value?.photos ?? []).filter(p => p !== id) })
}

const ratingWords = ['', 'Not for me', 'Meh', 'Good', 'Great', 'Unforgettable']
</script>

<template>
  <section class="fb" aria-label="Your feedback">
    <div class="row between">
      <h3 class="h3">
        How was it?
      </h3>
      <span v-if="fb?.updatedAt" class="tiny faint">Saved</span>
    </div>
    <div class="rate">
      <StarRating v-model="rating" />
      <span class="word">{{ rating ? ratingWords[rating] : 'Tap to rate' }}</span>
    </div>
    <div class="tags" role="group" aria-label="Tags">
      <button
        v-for="t in FEEDBACK_TAGS"
        :key="t"
        type="button"
        class="chip"
        :aria-pressed="fb?.tags?.includes(t) ?? false"
        @click="toggleTag(t)"
      >
        {{ t }}
      </button>
    </div>
    <label class="field">
      <span>Notes</span>
      <textarea v-model="note" class="textarea" rows="3" placeholder="What stood out? Who did you meet? A tip for next time…" />
    </label>
    <div class="money">
      <label class="field grow">
        <span>Spent here</span>
        <div class="cur">
          <input v-model.number="spent" class="input num" type="number" inputmode="decimal" min="0" step="0.5" placeholder="0" @change="saveSpent" @blur="saveSpent">
          <span class="unit">{{ currency }}</span>
        </div>
      </label>
      <p v-if="fx && spent" class="conv small muted num">
        ≈ {{ money(spent * fx.rate, fx.homeCurrency) }}
      </p>
    </div>
    <div class="photos">
      <span class="label">Photos</span>
      <div class="pgrid">
        <PhotoThumb v-for="p in fb?.photos ?? []" :key="p" :id="p" removable @remove="removePhoto(p)" />
        <label class="add" :class="{ busy }">
          <input ref="fileInput" class="sr-only" type="file" accept="image/*" multiple @change="addPhotos">
          <AppIcon :name="busy ? 'hourglass' : 'camera'" />
          <span>{{ busy ? 'Saving…' : 'Add' }}</span>
        </label>
      </div>
      <p class="tiny faint">
        Photos stay on this device.
      </p>
    </div>
  </section>
</template>

<style scoped>
.fb { display: flex; flex-direction: column; gap: 14px; }
.rate { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.word { font-weight: 650; color: var(--fg-2); }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tags .chip { min-height: 32px; padding: 4px 12px; font-size: 13px; border-color: var(--line); background: var(--surface); }
.money { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.cur { position: relative; max-width: 220px; }
.cur .input { padding-right: 56px; }
.unit { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font: 600 13px var(--font-data); color: var(--fg-3); }
.conv { padding-bottom: 12px; }
.photos { display: flex; flex-direction: column; gap: 8px; }
.pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 8px; }
.add { aspect-ratio: 1; border-radius: 12px; border: 2px dashed var(--line); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: var(--fg-2); font-size: 12.5px; font-weight: 600; cursor: pointer; background: var(--surface); }
.add:hover { border-color: var(--accent); color: var(--accent); }
.add.busy { opacity: .6; pointer-events: none; }
.add:has(input:focus-visible) { outline: 2.5px solid var(--accent); outline-offset: 2px; }
</style>
