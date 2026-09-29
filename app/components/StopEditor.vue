<script setup lang="ts">
import type { Stop, StopKind, StopTag } from '#shared/types/trip'
import { parseLatLng } from '#shared/utils/geo'
import { editableStops, findStop, slugify, uid } from '#shared/utils/plan'
import { fmtClock } from '#shared/utils/time'

const v = useTripView()
const route = useRoute()
const editor = useQueryState('edit')
const geo = useGeo()

const isNew = computed(() => editor.value.value === 'new')
const found = computed(() => (editor.value.value && !isNew.value && v.trip.value ? findStop(v.trip.value, editor.value.value) : null))
const open = computed(() => isNew.value || !!found.value)

interface FormState {
  title: string
  dayId: string
  start: string
  end: string
  kind: StopKind
  tip: string
  cost: string
  placeName: string
  lat: number | null
  lng: number | null
  tags: StopTag[]
  minor: boolean
}

const f = reactive<FormState>({ title: '', dayId: '', start: '10:00', end: '', kind: 'sight', tip: '', cost: '', placeName: '', lat: null, lng: null, tags: [], minor: false })
const paste = ref('')
const pasteError = ref(false)
const fitKey = ref(0)

const toInput = (m?: number) => (m === undefined ? '' : fmtClock(m))
function fromInput(s: string): number | undefined {
  if (!s) return undefined
  const [h, m] = s.split(':').map(Number)
  const min = (h ?? 0) * 60 + (m ?? 0)
  // Small hours belong to the night before.
  return min < 300 ? min + 1440 : min
}

function load() {
  const t = v.trip.value
  if (!t || !open.value) return
  paste.value = ''
  pasteError.value = false
  if (found.value) {
    const s = found.value.stop
    Object.assign(f, {
      title: s.title,
      dayId: found.value.day.id,
      start: toInput(s.start),
      end: toInput(s.end),
      kind: s.kind,
      tip: s.tip ?? '',
      cost: s.cost ?? '',
      placeName: s.place?.name ?? '',
      lat: s.place?.lat ?? null,
      lng: s.place?.lng ?? null,
      tags: [...(s.tags ?? [])],
      minor: !!s.minor,
    })
  }
  else {
    const qDay = typeof route.query.day === 'string' ? route.query.day : undefined
    const dayId = t.days.find(d => d.id === qDay)?.id ?? v.today.value?.view.day.id ?? t.days[0]?.id ?? ''
    Object.assign(f, { title: '', dayId, start: '10:00', end: '', kind: 'sight', tip: '', cost: '', placeName: '', lat: null, lng: null, tags: [], minor: false })
    const from = typeof route.query.from === 'string' ? route.query.from : ''
    if (from.startsWith('place:')) {
      const p = t.places?.find(x => x.id === from.slice(6))
      if (p) {
        f.title = p.name
        f.kind = p.category === 'food' ? 'food' : 'sight'
        f.tip = [p.text, p.bestTime ? `Best: ${p.bestTime}` : ''].filter(Boolean).join(' ')
        f.cost = p.price ?? ''
        f.placeName = p.place?.name ?? p.name
        f.lat = p.place?.lat ?? null
        f.lng = p.place?.lng ?? null
      }
    }
    if (typeof route.query.at === 'string') f.start = route.query.at
  }
  fitKey.value++
}
watch(() => [editor.value.value, v.trip.value?.id], load, { immediate: true })

const dayStops = computed(() => {
  const t = v.trip.value
  const day = t?.days.find(d => d.id === f.dayId)
  return day ? editableStops(day, v.variant.value) : []
})

const markers = computed(() => {
  const ctx = dayStops.value
    .filter(s => s.place && s.id !== found.value?.stop.id)
    .map(s => ({ id: s.id, lat: s.place!.lat, lng: s.place!.lng, title: s.title, kind: s.kind, state: 'place', icon: stopIcon(s) }))
  if (f.lat !== null && f.lng !== null) ctx.push({ id: 'pick', lat: f.lat, lng: f.lng, title: f.placeName || 'Here', kind: f.kind, state: 'next', icon: 'pin' })
  return ctx
})

function onPick(p: { lat: number, lng: number }) {
  f.lat = p.lat
  f.lng = p.lng
  if (!f.placeName) f.placeName = f.title || 'Pinned place'
}

function useMine() {
  const fx = geo.fix.value
  if (fx) {
    onPick({ lat: +fx.lat.toFixed(6), lng: +fx.lng.toFixed(6) })
    fitKey.value++
  }
  else {
    geo.start()
    toast('Finding you… tap again in a moment')
  }
}

function applyPaste() {
  const p = parseLatLng(paste.value)
  pasteError.value = !p
  if (p) {
    onPick(p)
    fitKey.value++
    paste.value = ''
  }
}

function clearPlace() {
  f.lat = null
  f.lng = null
  f.placeName = ''
}

function toggleTag(t: StopTag) {
  f.tags = f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t]
}

const startMin = computed(() => fromInput(f.start))
const endMin = computed(() => fromInput(f.end))
const valid = computed(() => f.title.trim().length > 0 && startMin.value !== undefined && !!f.dayId)
const endBeforeStart = computed(() => endMin.value !== undefined && startMin.value !== undefined && endMin.value <= startMin.value)

function save() {
  const t = v.trip.value
  if (!t || !valid.value || endBeforeStart.value) return
  const base: Stop = found.value ? { ...found.value.stop } : { id: `${slugify(f.title)}-${uid('s').slice(-5)}`, start: 0, timeLabel: '', kind: f.kind, title: '', custom: true }
  const next: Stop = {
    ...base,
    title: f.title.trim(),
    start: startMin.value!,
    end: endMin.value,
    timeLabel: fmtClock(startMin.value!),
    kind: f.kind,
    tip: f.tip.trim() || undefined,
    cost: f.cost.trim() || undefined,
    tags: f.tags.length ? f.tags : undefined,
    minor: f.minor || undefined,
    place: f.lat !== null && f.lng !== null ? { name: f.placeName.trim() || f.title.trim(), lat: f.lat, lng: f.lng, query: base.place?.query } : null,
  }
  if (next.end === undefined) delete next.end
  const variant = v.variant.value
  if (found.value && found.value.day.id !== f.dayId) {
    v.trips.moveStop(t.id, found.value.day.id, f.dayId, found.value.variant ?? variant, next)
  }
  else {
    v.trips.upsertStop(t.id, f.dayId, found.value?.variant ?? variant, next)
  }
  toast(found.value ? 'Stop updated' : 'Stop added to your plan', { tone: 'ok' })
  editor.close()
}

function remove() {
  const t = v.trip.value
  if (!t || !found.value) return
  if (!confirm(`Delete “${found.value.stop.title}” from your plan?`)) return
  v.trips.removeStop(t.id, found.value.day.id, found.value.variant ?? v.variant.value, found.value.stop.id)
  toast('Stop deleted')
  const q = { ...route.query }
  delete q.edit
  delete q.stop
  navigateTo({ query: q }, { replace: true })
}
</script>

<template>
  <BottomSheet :open="open" :title="isNew ? 'Add a stop' : 'Edit stop'" size="lg" @close="editor.close()">
    <form class="form" @submit.prevent="save">
      <label class="field">
        <span>What</span>
        <input v-model="f.title" class="input" required placeholder="e.g. Aperitivo at a rooftop bar" autocomplete="off">
      </label>

      <div class="form-grid">
        <label class="field full">
          <span>Day</span>
          <select v-model="f.dayId" class="select">
            <option v-for="d in v.trip.value?.days ?? []" :key="d.id" :value="d.id">{{ fmtDate(d.date, 'short') }} · {{ d.label }}</option>
          </select>
        </label>
        <label class="field">
          <span>Starts</span>
          <input v-model="f.start" class="input num" type="time" required>
        </label>
        <label class="field">
          <span>Ends <span class="hint">(optional)</span></span>
          <input v-model="f.end" class="input num" type="time">
        </label>
        <p class="hint full small faint">
          Times before 05:00 count as that night (after midnight).
          <span v-if="endBeforeStart" class="bad">The end is before the start.</span>
        </p>
      </div>

      <div class="field">
        <span>Type</span>
        <div class="seg block kinds" role="group" aria-label="Type">
          <button v-for="k in KINDS" :key="k" type="button" :aria-pressed="f.kind === k" @click="f.kind = k">
            <AppIcon :name="KIND_META[k].icon" size="sm" /><span>{{ KIND_META[k].short }}</span>
          </button>
        </div>
      </div>

      <div class="field">
        <span>Where</span>
        <div class="mapbox">
          <ClientOnly>
            <MapView
              :markers="markers"
              :home="v.trip.value?.home"
              :you="geo.fix.value"
              :fit-key="fitKey"
              pick
              label="Pick a place"
              @pick="onPick"
            />
          </ClientOnly>
          <span class="maphint small">Tap the map to drop the pin</span>
        </div>
        <div class="row wrap">
          <button class="btn sm" type="button" @click="useMine">
            <AppIcon name="locate" size="sm" />Where I am
          </button>
          <button v-if="f.lat !== null" class="btn sm plain" type="button" @click="clearPlace">
            <AppIcon name="x" size="sm" />No place
          </button>
          <span v-if="f.lat !== null" class="small faint num">{{ f.lat.toFixed(4) }}, {{ f.lng?.toFixed(4) }}</span>
        </div>
        <div class="row">
          <input v-model="paste" class="input grow" placeholder="…or paste a Google Maps link / “41.90, 12.49”" @keydown.enter.prevent="applyPaste">
          <button class="btn" type="button" :disabled="!paste" @click="applyPaste">
            Use
          </button>
        </div>
        <p v-if="pasteError" class="small bad">
          No coordinates in that. In Google Maps, long-press the spot and copy the numbers.
        </p>
        <input v-if="f.lat !== null" v-model="f.placeName" class="input" placeholder="Place name">
      </div>

      <label class="field">
        <span>Notes & tips</span>
        <textarea v-model="f.tip" class="textarea" rows="3" placeholder="Opening hours, what to order, how to get in…" />
      </label>

      <div class="form-grid">
        <label class="field">
          <span>Cost</span>
          <input v-model="f.cost" class="input" placeholder="e.g. €12 or Free">
        </label>
        <div class="field">
          <span>Tags</span>
          <div class="row wrap tags">
            <button type="button" class="chip" :aria-pressed="f.tags.includes('must')" @click="toggleTag('must')">
              Must
            </button>
            <button type="button" class="chip" :aria-pressed="f.tags.includes('optional')" @click="toggleTag('optional')">
              Optional
            </button>
            <button type="button" class="chip" :aria-pressed="f.tags.includes('skipIfTired')" @click="toggleTag('skipIfTired')">
              Skip if tired
            </button>
          </div>
        </div>
      </div>

      <label class="row minor">
        <input v-model="f.minor" type="checkbox" class="check">
        <span><b>Small logistics step</b><br><span class="small muted">Shown compact and not counted in your progress.</span></span>
      </label>
    </form>
    <template #footer>
      <button v-if="!isNew" class="btn danger" type="button" @click="remove">
        <AppIcon name="trash" size="sm" /><span class="hide-xs">Delete</span>
      </button>
      <span class="grow" />
      <button class="btn ghost" type="button" @click="editor.close()">
        Cancel
      </button>
      <button class="btn primary" type="button" :disabled="!valid || endBeforeStart" @click="save">
        <AppIcon name="check" size="sm" />{{ isNew ? 'Add stop' : 'Save' }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.form { padding: 4px 16px 20px; display: flex; flex-direction: column; gap: 16px; }
.kinds { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); }
.kinds button { flex-direction: column; gap: 2px; min-height: 52px; padding: 4px 2px; font-size: 12px; }
@media (max-width: 480px) { .kinds { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.mapbox { position: relative; height: 230px; border-radius: 14px; overflow: hidden; border: 1px solid var(--line); }
.maphint { position: absolute; left: 10px; top: 10px; z-index: 500; padding: 4px 10px; border-radius: 999px; background: var(--surface); box-shadow: var(--shadow); pointer-events: none; font-weight: 600; }
.tags { gap: 6px; }
.tags .chip { min-height: 34px; border-color: var(--line); background: var(--surface); }
.minor { align-items: flex-start; gap: 12px; cursor: pointer; }
.bad { color: var(--bad); font-weight: 600; }
@media (max-width: 380px) { .hide-xs { display: none; } }
</style>
