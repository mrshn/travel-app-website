<script setup lang="ts">
import { useStorage, watchDebounced } from '@vueuse/core'
import { dayTally } from '#shared/utils/plan'
import { fmtClock } from '#shared/utils/time'

const v = useTripView()
const route = useRoute()
const router = useRouter()
const sheet = useQueryState('stop')
const editor = useQueryState('edit')
const trip = v.trip

const dayId = computed({
  get: () => {
    const q = route.query.day
    if (typeof q === 'string' && trip.value?.days.some(d => d.id === q)) return q
    return v.today.value?.view.day.id ?? trip.value?.days[0]?.id ?? ''
  },
  set: (id: string) => {
    router.replace({ query: { ...route.query, day: id } })
  },
})
const plan = computed(() => v.plans.value.find(p => p.view.day.id === dayId.value))
const day = computed(() => plan.value?.view.day)
const tally = computed(() => (plan.value ? dayTally(plan.value) : null))
const showMinor = useStorage('travel:plan:minor', true)
const stops = computed(() => (plan.value ? (showMinor.value ? plan.value.stops : plan.value.stops.filter(s => !s.minor)) : []))
const minorCount = computed(() => plan.value?.stops.filter(s => s.minor).length ?? 0)
const markers = computed(() => (plan.value ? stopMarkers(plan.value.stops, plan.value.states) : []))
const lines = computed(() => (plan.value && trip.value ? routeLines(plan.value.stops, trip.value, plan.value.states) : []))

function toggle(id: string) {
  const st = plan.value?.states[id]
  v.mark(id, st === 'done' ? null : 'done')
}

function addStop() {
  router.push({ query: { ...route.query, edit: 'new', day: dayId.value } })
}

// Day journal
const note = ref('')
const extra = ref<number | null>(null)
watch(() => day.value?.id, () => {
  const n = day.value ? v.progress.value.dayNotes[day.value.id] : undefined
  note.value = n?.note ?? ''
  extra.value = n?.extraSpent ?? null
}, { immediate: true })
watchDebounced(note, (t) => {
  if (day.value && (v.progress.value.dayNotes[day.value.id]?.note ?? '') !== t) v.setDayNote(day.value.id, { note: t })
}, { debounce: 450 })
function saveExtra() {
  if (day.value) v.setDayNote(day.value.id, { extraSpent: extra.value && extra.value > 0 ? extra.value : undefined })
}
const dayRating = computed({
  get: () => (day.value ? v.progress.value.dayNotes[day.value.id]?.rating : undefined),
  set: (r?: number) => day.value && v.setDayNote(day.value.id, { rating: r }),
})

// Scroll to a stop when arriving with #stop-…
onMounted(() => {
  const id = route.hash?.replace('#', '')
  if (id) nextTick(() => document.getElementById(id)?.scrollIntoView({ block: 'center' }))
})
</script>

<template>
  <div v-if="trip" class="page plan">
    <section v-if="trip.variant" class="card pad variant">
      <div class="row wrap between">
        <div class="stack tight grow">
          <span class="label">{{ trip.variant.question }}</span>
          <span v-if="trip.variant.hint" class="small muted">{{ trip.variant.hint }}</span>
        </div>
        <div class="seg" role="group" :aria-label="trip.variant.question">
          <button
            v-for="o in trip.variant.options"
            :key="o.id"
            type="button"
            :aria-pressed="v.variant.value === o.id"
            @click="v.setVariant(o.id)"
          >
            {{ o.label }}
          </button>
        </div>
      </div>
    </section>

    <DayStrip v-model="dayId" :plans="v.plans.value" :today-id="v.today.value?.view.day.id" />

    <template v-if="plan && day">
      <section class="dayhead card">
        <div class="dh-pic art-frame">
          <SceneArt class="scene" :scene="plan.view.cover.scene" :tod="plan.view.cover.tod" :label="plan.view.title" :lazy="false" />
          <div class="scrim" />
          <div class="dh-in on-art">
            <p class="kicker k">
              {{ day.num }} · {{ fmtDate(day.date, 'long') }}
            </p>
            <h1 class="dh-title">
              {{ plan.view.title || day.label }}
            </h1>
          </div>
        </div>
        <div class="dh-body">
          <ul v-if="day.facts.length" class="facts">
            <li v-for="(f, i) in day.facts" :key="i">
              <AppIcon :name="f.icon" size="sm" /><span>{{ f.text }}</span>
            </li>
          </ul>
          <div v-if="day.sun && !day.facts.some(f => f.icon === 'sunset')" class="row wrap sun">
            <span class="chip num"><AppIcon name="sunrise" />{{ fmtClock(day.sun.rise) }}</span>
            <span class="chip num t-gold"><AppIcon name="sunset" />{{ fmtClock(day.sun.set) }}</span>
            <span v-if="day.sun.bluePm" class="chip num"><AppIcon name="camera" />Blue hour {{ fmtClock(day.sun.bluePm[0]) }}</span>
          </div>
          <div v-if="tally" class="dh-prog">
            <ProgressRing
              :size="64"
              :stroke="8"
              :total="tally.total"
              :segments="[
                { value: tally.done, color: 'var(--ok)', label: 'Done' },
                { value: tally.skipped, color: 'var(--closed)', label: 'Skipped' },
                { value: tally.missed, color: 'var(--warn)', label: 'Not marked' },
              ]"
            >
              <b class="num small">{{ tally.done }}/{{ tally.total }}</b>
            </ProgressRing>
            <div class="grow small">
              <b>{{ tally.done }} done</b><span class="muted"> · {{ tally.left }} left<template v-if="tally.skipped"> · {{ tally.skipped }} skipped</template><template v-if="tally.missed"> · {{ tally.missed }} not marked</template></span>
            </div>
          </div>
        </div>
      </section>

      <div v-if="plan.view.banner" class="banner">
        <AppIcon name="info" size="sm" /><span>{{ plan.view.banner }}</span>
      </div>
      <div v-if="day.alerts?.length" class="alerts">
        <div v-for="(a, i) in day.alerts" :key="i" class="alert" :class="a.tone === 'warn' ? 'warn' : ''">
          <AppIcon :name="a.icon" size="sm" />
          <span><b class="num">{{ fmtClock(a.from) }}</b> {{ a.text }}</span>
        </div>
      </div>

      <div class="cols">
        <div class="main">
          <div class="row between tl-h">
            <h2 class="h3">
              Timeline
            </h2>
            <button v-if="minorCount" class="btn xs plain" type="button" @click="showMinor = !showMinor">
              <AppIcon :name="showMinor ? 'eye' : 'list'" size="xs" />{{ showMinor ? `Hide ${minorCount} small steps` : `Show ${minorCount} small steps` }}
            </button>
          </div>
          <ol v-if="stops.length" class="tl card">
            <StopRow
              v-for="(s, i) in stops"
              :key="s.id"
              :stop="s"
              :state="plan.states[s.id] ?? 'upcoming'"
              :feedback="v.progress.value.feedback[s.id]"
              :last="i === stops.length - 1"
              @open="sheet.open(s.id)"
              @toggle="toggle(s.id)"
            />
          </ol>
          <div v-else class="card empty">
            <AppIcon name="calendar" />
            <h3>No stops yet</h3>
            <p>Add what you want to do and when; the Now screen will guide you through it.</p>
          </div>
          <button class="btn ghost block add" type="button" @click="addStop">
            <AppIcon name="plus" size="sm" />Add a stop to {{ fmtDate(day.date, 'weekdayLong') }}
          </button>
        </div>

        <aside class="side">
          <section class="card mapcard">
            <ClientOnly>
              <MapView
                :markers="markers"
                :lines="lines"
                :home="trip.home"
                :fit-key="day.id"
                :zoom-control="false"
                :label="`Map of ${fmtDate(day.date, 'weekdayLong')}`"
                @select="(id) => sheet.open(id)"
              />
            </ClientOnly>
            <NuxtLink class="btn sm icon round expand" :to="{ path: `/trips/${trip.id}/map`, query: { day: day.id } }" aria-label="Open the full map">
              <AppIcon name="expand" size="sm" />
            </NuxtLink>
          </section>

          <section v-if="day.journey" class="card pad journey">
            <h2 class="h3">
              {{ day.journey.title }}
            </h2>
            <ol class="jn">
              <li v-for="(n, i) in day.journey.nodes" :key="i" :class="n.mode ? `m-${n.mode}` : ''">
                <span class="jt num">{{ n.time }}</span>
                <span class="jd" aria-hidden="true" />
                <span class="jx"><b>{{ n.name }}</b><span class="small muted">{{ n.sub }}</span><span v-if="n.label" class="chip t-gold jl">{{ n.label }}</span></span>
              </li>
            </ol>
          </section>

          <section v-for="c in day.nearby?.cards ?? []" :key="c.title" class="card pad infocard">
            <h2 class="h3 row">
              <AppIcon :name="c.icon" size="sm" />{{ c.title }}
            </h2>
            <ul>
              <li v-for="(it, i) in c.items" :key="i">
                <AppIcon :name="it.icon" size="sm" /><span>{{ it.text }}</span>
              </li>
            </ul>
          </section>

          <section class="card pad daynote">
            <h2 class="h3">
              Your day
            </h2>
            <div class="row wrap">
              <StarRating v-model="dayRating" :size="30" />
            </div>
            <label class="field">
              <span>Day journal</span>
              <textarea v-model="note" class="textarea" rows="3" placeholder="Best moment, people you met, what you'd change…" />
            </label>
            <label class="field">
              <span>Other spending today <span class="hint">(not tied to a stop)</span></span>
              <input v-model.number="extra" class="input num" type="number" inputmode="decimal" min="0" step="0.5" :placeholder="`0 ${trip.currency}`" @change="saveExtra">
            </label>
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<style scoped>
.plan { padding-top: 14px; }
.variant { margin-bottom: 14px; }
.variant .seg { flex: none; }
.dayhead { overflow: hidden; margin-top: 14px; }
.dh-pic { height: 180px; display: flex; align-items: flex-end; }
@media (min-width: 700px) { .dh-pic { height: 220px; } }
.dh-in { padding: 16px 18px; }
.dh-in .k { color: var(--on-art-2); }
.dh-title { font-size: clamp(22px, 5vw, 30px); font-weight: 700; line-height: 1.15; text-shadow: 0 2px 14px rgba(0, 0, 0, .35); margin-top: 4px; }
.dh-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.facts { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.facts li { display: flex; gap: 10px; align-items: flex-start; font-size: 14.5px; }
.facts .i { color: var(--gold-ink); margin-top: 2px; }
.sun { gap: 6px; }
.dh-prog { display: flex; align-items: center; gap: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
@media (min-width: 900px) {
  .dh-body { display: grid; grid-template-columns: minmax(0, 1fr) 260px; column-gap: 24px; align-items: start; }
  .dh-prog { grid-column: 2; grid-row: 1 / span 2; border-top: 0; padding-top: 0; padding-left: 20px; border-left: 1px solid var(--line); align-self: stretch; }
}
.banner, .alert { display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; border-radius: 14px; font-size: 14px; }
.banner { margin-top: 12px; background: var(--accent-soft); color: var(--fg); }
.banner .i { color: var(--accent); margin-top: 2px; }
.alerts { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.alert { background: var(--gold-soft); }
.alert .i { color: var(--gold-ink); margin-top: 2px; }
.alert.warn { background: var(--warn-soft); }
.cols { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); margin-top: 18px; }
.main, .side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
@media (min-width: 960px) {
  .cols { grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); align-items: start; }
  .side { position: sticky; top: calc(var(--top-h) + 16px); }
}
.tl-h { padding: 0 2px; }
.tl { padding: 6px 6px 6px 0; margin: 0; }
.add { border-style: dashed; }
.mapcard { position: relative; height: 280px; overflow: hidden; }
@media (min-width: 960px) { .mapcard { height: 340px; } }
.expand { position: absolute; right: 10px; bottom: 10px; z-index: 500; background: var(--surface); box-shadow: var(--shadow); }
.journey .jn { list-style: none; margin-top: 12px; display: flex; flex-direction: column; }
.jn li { position: relative; display: grid; grid-template-columns: 54px 18px minmax(0, 1fr); gap: 10px; padding-bottom: 14px; }
.jn li:last-child { padding-bottom: 0; }
.jn li::before { content: ""; position: absolute; left: 72px; top: 18px; bottom: -2px; width: 2px; background: var(--line); }
.jn li:last-child::before { display: none; }
.jn li.m-fly::before, .jn li.m-ride::before { background: var(--c-move); }
.jt { font-size: 13px; font-weight: 600; text-align: right; padding-top: 1px; }
.jd { width: 14px; height: 14px; border-radius: 50%; border: 3px solid var(--accent); background: var(--surface); margin-top: 3px; position: relative; z-index: 1; }
.jx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.jl { align-self: flex-start; margin-top: 4px; }
.infocard ul { list-style: none; margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.infocard li { display: flex; gap: 10px; font-size: 14px; }
.infocard li .i { color: var(--gold-ink); margin-top: 2px; }
.infocard h2 { gap: 8px; }
.daynote { display: flex; flex-direction: column; gap: 12px; }
</style>
