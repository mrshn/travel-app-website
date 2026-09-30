<script setup lang="ts">
import { useDebounceFn, useStorage } from '@vueuse/core'
import { dayTally, type ResolvedStop } from '#shared/utils/plan'
import { fmtClock } from '#shared/utils/time'

const v = useTripView()
const route = useRoute()
const router = useRouter()
const sheet = useQueryState('stop')
const actions = useTripActions()
const costSheet = useCostSheet()
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

/** A tick on the timeline: through markStop(), so it toasts with Undo like every other tick. */
function toggle(s: ResolvedStop) {
  actions.markStop(s, plan.value?.states[s.id] === 'done' ? null : 'done')
}

function addStop() {
  router.push({ query: { ...route.query, edit: 'new', day: dayId.value } })
}

// ---------- the Colosseum question ----------
/** Folded to one row once you picked a day, or once the trip has started; "Change" opens it again. */
const variantOpen = ref(false)
const variantLabel = computed(() => trip.value?.variant?.options.find(o => o.id === v.variant.value)?.label ?? '')
const variantFolded = computed(() =>
  !!trip.value?.variant && !variantOpen.value && (!!v.progress.value.variant || v.moment.value?.phase !== 'before'),
)
const variantBox = ref<HTMLElement | null>(null)
const changeBtn = ref<HTMLButtonElement | null>(null)
async function openVariant() {
  variantOpen.value = true
  await nextTick()
  variantBox.value?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus()
}
async function pickVariant(id: string) {
  const wasOpen = variantOpen.value
  v.setVariant(id)
  variantOpen.value = false
  if (!wasOpen) return
  await nextTick()
  changeBtn.value?.focus()
}

// ---------- the day's facts and alerts ----------
/**
 * The day's facts, and each of its sun times that the facts don't already give (Monday has a sunrise fact but
 * no sunset): one chip row on phones, a list on wider screens.
 */
const facts = computed(() => {
  const d = day.value
  if (!d) return []
  const out = (d.facts ?? []).map(f => ({ icon: f.icon, text: f.text }))
  const told = (re: RegExp) => out.some(f => re.test(f.text))
  if (d.sun) {
    const sun: { icon: string, text: string }[] = []
    if (!told(/\bsunrise\b/i)) sun.push({ icon: 'sunrise', text: `Sunrise ${fmtClock(d.sun.rise)}` })
    if (!told(/\bsunset\b/i)) sun.push({ icon: 'sunset', text: `Sunset ${fmtClock(d.sun.set)}` })
    if (d.sun.bluePm && !told(/\bblue hour\b/i)) sun.push({ icon: 'camera', text: `Blue hour ${fmtClock(d.sun.bluePm[0])}` })
    out.push(...sun)
  }
  return out
})
const alertsOpen = ref(false)
const alerts = computed(() => {
  const all = day.value?.alerts ?? []
  return alertsOpen.value ? all : all.slice(0, 1)
})
const moreAlerts = computed(() => Math.max(0, (day.value?.alerts?.length ?? 0) - 1))
const alertsId = useId()

// ---------- your day: rating, journal, money ----------
const dayRating = computed({
  get: () => (day.value ? v.progress.value.dayNotes[day.value.id]?.rating : undefined),
  set: (r?: number) => day.value && v.setDayNote(day.value.id, { rating: r }),
})

/**
 * The day journal. The text in the box belongs to `noteDay`; what you type is saved to that day shortly after
 * you stop, and at once when you switch day or leave the page, so nothing lands on the wrong day or gets lost.
 * Only typing is saved: a box you didn't touch never writes its copy back over a newer note (from another tab,
 * or another phone through the cloud), and it shows that newer note instead.
 */
const note = ref('')
const noteDay = ref('')
let noteTyped = false
function saveNote() {
  const id = noteDay.value
  if (!id || !noteTyped) return
  noteTyped = false
  if ((v.progress.value.dayNotes[id]?.note ?? '') !== note.value) v.setDayNote(id, { note: note.value })
}
const saveNoteSoon = useDebounceFn(saveNote, 450)
function typedNote() {
  noteTyped = true
  saveNoteSoon()
}
watch(() => day.value?.id, (id) => {
  saveNote()
  noteDay.value = id ?? ''
  note.value = id ? v.progress.value.dayNotes[id]?.note ?? '' : ''
  noteTyped = false
  alertsOpen.value = false
}, { immediate: true })
watch(() => (noteDay.value ? v.progress.value.dayNotes[noteDay.value]?.note ?? '' : ''), (saved) => {
  if (!noteTyped) note.value = saved
})
onBeforeUnmount(saveNote)

const dayMoney = computed(() => {
  const t = trip.value
  const d = day.value
  const pair = d ? v.costs.value?.byDay[d.id] : undefined
  if (!t || !d) return null
  const spent = pair?.spent ?? 0
  return {
    spent: moneyExact(spent, t.currency),
    planned: pair && pair.planned > 0 ? moneyExact(pair.planned, t.currency) : '',
    home: spent > 0 ? moneyHome(spent, t) : '',
  }
})

// Scroll to a stop when arriving with #stop-…
onMounted(() => {
  const id = route.hash?.replace('#', '')
  if (id) nextTick(() => document.getElementById(id)?.scrollIntoView({ block: 'center' }))
})
</script>

<template>
  <div v-if="trip" class="page plan">
    <section v-if="trip.variant && variantFolded" class="card variant-row" :aria-label="trip.variant.question">
      <AppIcon name="ticket" size="sm" class="vr-ic" />
      <p class="grow vr-q">
        {{ trip.variant.question }} <span class="chip t-gold vr-chip">{{ variantLabel }}</span>
      </p>
      <button ref="changeBtn" class="btn xs ghost" type="button" :aria-label="`Change: ${trip.variant.question}`" @click="openVariant">
        Change
      </button>
    </section>
    <section v-else-if="trip.variant" ref="variantBox" class="card pad variant">
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
            @click="pickVariant(o.id)"
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
          <span v-if="tally && tally.total" class="chip on-art tnum dh-chip">{{ tally.done }}/{{ tally.total }} done</span>
          <div class="dh-in on-art">
            <p class="kicker k">
              {{ day.num }} · {{ fmtDate(day.date, 'long') }}
            </p>
            <h1 class="dh-title">
              {{ plan.view.title || day.label }}
            </h1>
          </div>
        </div>
        <div v-if="facts.length || tally" class="dh-body">
          <ul v-if="facts.length" class="facts" tabindex="0" :aria-label="`About ${fmtDate(day.date, 'weekdayLong')}`">
            <li v-for="(f, i) in facts" :key="i">
              <AppIcon :name="f.icon" size="sm" /><span>{{ f.text }}</span>
            </li>
          </ul>
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
      <div v-if="day.alerts?.length" :id="alertsId" class="alerts">
        <div v-for="(a, i) in alerts" :key="i" class="alert" :class="a.tone === 'warn' ? 'warn' : ''">
          <AppIcon :name="a.icon" size="sm" />
          <span><b class="num">{{ fmtClock(a.from) }}</b> {{ a.text }}</span>
        </div>
        <button v-if="moreAlerts" class="btn sm plain more-alerts" type="button" :aria-expanded="alertsOpen" :aria-controls="alertsId" @click="alertsOpen = !alertsOpen">
          <AppIcon :name="alertsOpen ? 'chevu' : 'chev'" size="sm" />{{ alertsOpen ? 'Hide' : moreAlerts === 1 ? '1 more heads-up' : `${moreAlerts} more heads-ups` }}
        </button>
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
              @toggle="toggle(s)"
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
              <textarea v-model="note" class="textarea" rows="3" placeholder="Best moment, people you met, what you'd change…" @input="typedNote" @blur="saveNote" />
            </label>
            <div v-if="dayMoney" class="spent">
              <p class="tnum parts">
                <span class="part">Spent this day: <b>{{ dayMoney.spent }}</b><template v-if="dayMoney.planned">
                  of {{ dayMoney.planned }}
                </template></span>
                <span v-if="dayMoney.home" class="part"><span class="part-sep">&nbsp;·&nbsp;</span><span class="muted">{{ dayMoney.home }}</span></span>
              </p>
              <div class="row wrap spent-acts">
                <button class="btn sm" type="button" @click="costSheet.open({ dayId: day.id })">
                  <AppIcon name="plus" size="sm" />Add a cost
                </button>
                <NuxtLink class="btn sm plain" :to="`/trips/${trip.id}/costs`">
                  See costs<AppIcon name="chevr" size="sm" />
                </NuxtLink>
              </div>
            </div>
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
/* The expanded question: 44 px day buttons (A1). */
.variant .seg button { min-height: 44px; }
.variant-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; padding: 6px 8px 6px 14px; min-height: 56px; }
.vr-ic { color: var(--gold-ink); }
.vr-q { font-size: 13.5px; font-weight: 650; color: var(--fg-2); line-height: 1.5; }
.vr-chip { vertical-align: 1px; margin-left: 2px; }
@media (max-width: 379px) {
  .vr-ic { display: none; }
}
.dayhead { overflow: hidden; margin-top: 14px; }
.dh-pic { height: 180px; display: flex; align-items: flex-end; }
@media (min-width: 700px) { .dh-pic { height: 220px; } }
.dh-chip { position: absolute; right: 12px; top: 12px; }
.dh-in { padding: 16px 18px; }
.dh-in .k { color: var(--on-art-2); }
.dh-title { font-size: clamp(22px, 5vw, 30px); font-weight: 700; line-height: 1.15; text-shadow: 0 2px 14px rgba(0, 0, 0, .35); margin-top: 4px; }
.dh-body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.facts { list-style: none; display: flex; flex-direction: column; gap: 6px; }
.facts li { display: flex; gap: 10px; align-items: flex-start; font-size: 14.5px; }
.facts .i { color: var(--gold-ink); margin-top: 2px; }
.dh-prog { display: flex; align-items: center; gap: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
@media (min-width: 700px) {
  .dh-chip { display: none; }
}
@media (min-width: 900px) {
  .dh-body { display: grid; grid-template-columns: minmax(0, 1fr) 260px; column-gap: 24px; align-items: start; }
  .dh-prog { grid-column: 2; grid-row: 1 / span 2; border-top: 0; padding-top: 0; padding-left: 20px; border-left: 1px solid var(--line); align-self: stretch; }
}
/* Phones: a shorter picture with the done count on it, the facts as one row of chips that scrolls sideways, no ring. */
@media (max-width: 699px) {
  .dh-pic { height: 132px; }
  /* The kicker sits higher on the shorter picture: a darker scrim behind it and full white (4.5:1 or more). */
  .dh-pic .scrim { background: linear-gradient(180deg, rgba(6, 8, 20, 0) 0%, rgba(6, 8, 20, .5) 42%, rgba(6, 8, 20, .82) 100%); }
  .dh-in .k { color: var(--on-art); text-shadow: 0 1px 3px rgba(0, 0, 0, .6); }
  .dh-in { padding: 12px 16px 14px; }
  .dh-body { padding: 12px 0; }
  .dh-body:not(:has(.facts)) { display: none; }
  .facts {
    flex-direction: row;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    padding: 0 16px;
    scroll-padding-inline: 16px;
  }
  .facts::-webkit-scrollbar { display: none; }
  .facts li { flex: none; align-items: center; gap: 6px; min-height: 30px; padding: 4px 12px; border-radius: 999px; background: var(--surface-2); color: var(--fg-2); font-size: 13px; font-weight: 600; white-space: nowrap; }
  .facts .i { margin-top: 0; width: 14px; height: 14px; }
  .dh-prog { display: none; }
}
/* The narrowest phones wrap the title to two lines, which lifts the kicker further up the picture. */
@media (max-width: 359px) {
  .dh-pic .scrim { background: linear-gradient(180deg, rgba(6, 8, 20, .3) 0%, rgba(6, 8, 20, .62) 40%, rgba(6, 8, 20, .85) 100%); }
}
.banner, .alert { display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; border-radius: 14px; font-size: 14px; }
.banner { margin-top: 12px; background: var(--accent-soft); color: var(--fg); }
.banner .i { color: var(--accent); margin-top: 2px; }
.alerts { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.alert { background: var(--gold-soft); }
.alert .i { color: var(--gold-ink); margin-top: 2px; }
.alert.warn { background: var(--warn-soft); }
.more-alerts { align-self: flex-start; color: var(--fg-2); }
.cols { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); margin-top: 18px; }
.main, .side { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
@media (min-width: 960px) {
  .cols { grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); align-items: start; }
  .side { position: sticky; top: calc(var(--top-h) + 16px); }
}
.tl-h { padding: 0 2px; }
.tl { padding: 6px 6px 6px 0; margin: 0; }
.add { border-style: dashed; }
/* Its own layer: the expand button (z-index 500) stays inside the card, under the header and the tab bar. */
.mapcard { position: relative; height: 280px; overflow: hidden; isolation: isolate; }
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
.spent { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--line); }
.spent-acts { gap: 8px; }
/* Phrases joined by a dot that wrap as wholes; a phrase that starts a line drops its dot (clipped on the left). */
.parts { display: flex; flex-wrap: wrap; margin-left: -.8em; clip-path: inset(-4px -4px -4px .8em); }
.part { min-width: 0; padding-left: .8em; }
.part-sep { display: inline-block; width: .8em; margin-left: -.8em; text-align: center; }
</style>
