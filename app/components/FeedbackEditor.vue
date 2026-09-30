<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

const props = defineProps<{ stopId: string, title?: string }>()
const v = useTripView()
const photos = usePhotos()
const cloud = useCloud()

const fb = computed(() => v.progress.value.feedback[props.stopId])

const busy = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
let open = true

/**
 * The stop's note. The text in the box belongs to `noteStop`; what you type is saved to that stop shortly after you
 * stop, and at once when you move to another stop or close the sheet. Only typing is saved: a box you didn't touch
 * never writes its copy back over a newer note (from another phone through the cloud), and shows that newer note
 * instead. (A trip screen writes nothing more once this device's copy is removed: useProgress.)
 */
const note = ref('')
const noteStop = ref('')
let noteTyped = false
function saveNote() {
  const id = noteStop.value
  if (!id || !noteTyped) return
  noteTyped = false
  if ((v.progress.value.feedback[id]?.note ?? '') !== note.value) v.setFeedback(id, { note: note.value })
}
const saveNoteSoon = useDebounceFn(saveNote, 450)
function typedNote() {
  noteTyped = true
  void saveNoteSoon()
}
watch(() => props.stopId, (id) => {
  saveNote()
  noteStop.value = id
  note.value = v.progress.value.feedback[id]?.note ?? ''
  noteTyped = false
}, { immediate: true })
watch(() => (noteStop.value ? v.progress.value.feedback[noteStop.value]?.note ?? '' : ''), (saved) => {
  if (!noteTyped) note.value = saved
})
onBeforeUnmount(() => {
  open = false
  saveNote()
})

/** Where your photos are kept: backed up while signed in (unless the account can't take them), else only here. */
const photoLine = computed(() => {
  if (!cloud.user.value) return 'Photos stay on this phone until you sign in.'
  return cloud.photoBackup.value === 'on' ? 'Photos are backed up to your account.' : 'Photos stay on this device.'
})

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
    // (Closed meanwhile, say by another account signing in: that photo went with the old copy, nothing to say.)
    if (open) toast('Could not save that photo', { tone: 'warn' })
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
      <span v-if="fb?.updatedAt" class="tiny muted">Saved</span>
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
      <textarea v-model="note" class="textarea" rows="3" placeholder="What stood out? Who did you meet? A tip for next time…" @input="typedNote" @blur="saveNote" />
    </label>
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
      <p class="tiny muted photo-line">
        {{ photoLine }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.fb { display: flex; flex-direction: column; gap: 14px; }
.rate { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.word { font-weight: 650; color: var(--fg-2); }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tags .chip { min-height: 40px; padding: 4px 14px; font-size: 13.5px; border-color: var(--line); background: var(--surface); }
.photos { display: flex; flex-direction: column; gap: 8px; }
.pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 8px; }
.add { aspect-ratio: 1; border-radius: 12px; border: 2px dashed var(--line); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: var(--fg-2); font-size: 12.5px; font-weight: 600; cursor: pointer; background: var(--surface); }
.add:hover { border-color: var(--accent); color: var(--accent); }
.add.busy { opacity: .6; pointer-events: none; }
.add:has(input:focus-visible) { outline: 2.5px solid var(--accent); outline-offset: 2px; }
</style>
