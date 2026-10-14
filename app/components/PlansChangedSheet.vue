<script setup lang="ts">
import { useSessionStorage } from '@vueuse/core'
import type { Stop } from '#shared/types/trip'
import {
  CHANGES_FLIGHT_CHECKLIST, CHANGES_STAYS, changesDayLabel, changesMoveTargets, changesRestOfDay, changesShift, changesStartLater,
  changesStayMessage, type ChangesMoveTarget,
} from '#shared/utils/changes'
import { CLAIM_GUIDE } from '#shared/utils/claims'
import type { DayPlan, ResolvedStop } from '#shared/utils/plan'
import { fmtClock, fmtDuration, parseClock } from '#shared/utils/time'

/**
 * Plans changed (?changed=1, with &day=<dayId> from Plan; spec 5.12), mounted once by the trip shell. Four situations
 * as cards, each opening its own step here with Back:
 * - Running late: the rest of today moves on by 15 min to 1 h 30; booked stops, flights and trains stay.
 * - Starting later: what starts before then is skipped; each must-do moves to a day it's open, or is skipped too.
 * - A cancelled or delayed flight: what to ask for at the desk (ticks kept for this visit), a message for where you
 *   stay, a claim, and re-planning tomorrow.
 * - Taking the rest of today off: what's left is skipped; booked stops and travel stay.
 * Moving stops changes the plan (useTrips), for everyone in a group trip: it asks first and says so in the chat.
 * Skips are your own (useProgress), so people who can only view a group trip get those. Every change has Undo.
 * Before the trip: the flight card and starting the first day later.
 */
const v = useTripView()
const route = useRoute()
const tg = useTripGroup()
const sheet = useQueryState('changed')
const router = useRouter()

type Step = 'list' | 'late' | 'later' | 'flight' | 'off'

const open = computed(() => !!sheet.value.value && !!v.trip.value && !!v.moment.value)
const step = ref<Step>('list')
/** The steps behind this one, for Back. */
const trail = ref<Step[]>([])
/** Set by "Re-plan tomorrow": the day Starting later is for. */
const laterDayId = ref<string | null>(null)

const m = v.moment
const phase = computed(() => m.value?.phase ?? 'before')
const canEdit = v.canEdit
const name = computed(() => tg.me.value?.name || 'Someone')

/** The day the sheet is for: &day= when it's today or ahead (any day before the trip), else today, else day one. */
const dayPlan = computed<DayPlan | undefined>(() => {
  const plans = v.plans.value
  const today = m.value?.phase === 'during' ? m.value.dayIndex : -1
  const asked = typeof route.query.day === 'string' ? plans.findIndex(p => p.view.day.id === route.query.day) : -1
  if (asked >= 0 && (phase.value === 'before' || (phase.value === 'during' && asked >= today))) return plans[asked]
  if (phase.value === 'during' && today >= 0) return plans[today]
  return phase.value === 'before' ? plans[0] : undefined
})
const isToday = computed(() => !!dayPlan.value && dayPlan.value === v.today.value)
/** The day after today during the trip, or the first day before it: "Re-plan tomorrow". */
const nextPlan = computed<DayPlan | undefined>(() => {
  const mm = m.value
  if (mm?.phase === 'during' && mm.dayIndex >= 0) return v.plans.value[mm.dayIndex + 1]
  return mm?.phase === 'before' ? v.plans.value[0] : undefined
})
const replanLabel = computed(() => (m.value?.phase === 'before' && m.value.daysToStart > 1 ? 'Re-plan the first day' : 'Re-plan tomorrow'))

const dayLabelOf = (p?: DayPlan) => (p ? changesDayLabel(p.view.day.date) : '')
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

// ---------- the cards ----------
interface Card { key: Exclude<Step, 'list'>, icon: string, title: string, sub: string }
const cards = computed<Card[]>(() => {
  const out: Card[] = []
  const later: Card | null = dayPlan.value
    ? {
        key: 'later',
        icon: 'sunrise',
        title: 'Starting later',
        sub: isToday.value ? 'Skip what you\'ll miss, move the must-dos to another day' : `On ${dayLabelOf(dayPlan.value)}: skip what you'll miss, move the must-dos`,
      }
    : null
  const flight: Card = { key: 'flight', icon: 'plane', title: 'Flight cancelled or delayed', sub: 'What to ask for, what to keep, and a claim' }
  if (phase.value === 'before') return [flight, ...(later ? [later] : [])]
  if (phase.value === 'during' && isToday.value && canEdit.value) out.push({ key: 'late', icon: 'clock', title: 'Running late', sub: 'Push the rest of today back. Booked stops stay.' })
  if (later && phase.value === 'during') out.push(later)
  out.push(flight)
  if (phase.value === 'during' && isToday.value) out.push({ key: 'off', icon: 'bed', title: 'Taking the rest of today off', sub: 'Skip what\'s left today' })
  return out
})
const intro = computed(() => {
  if (phase.value === 'before') return 'Trouble getting there? Here is what to do, and how to re-plan.'
  if (phase.value === 'after') return 'Trouble on the way home? Here is what to do, and how to claim.'
  return 'Pick what happened. Every change can be undone.'
})
/** In a group trip you can only view, the plan isn't yours to change: skipping stays yours. */
const viewerNote = computed(() => (tg.isGroup.value && !canEdit.value ? 'You can view this plan: skipping stops is just for you.' : ''))

// ---------- moving between steps ----------
const stepHead = ref<HTMLElement | null>(null)
const listEl = ref<HTMLElement | null>(null)
let cameFrom: string | null = null

async function go(next: Exclude<Step, 'list'>, opts: { laterDay?: string | null } = {}) {
  if (next === 'later') {
    laterDayId.value = opts.laterDay ?? null
    startAt.value = defaultStart()
    picks.value = {}
  }
  if (next === 'flight') initArrival()
  if (step.value === 'list') cameFrom = next
  trail.value = [...trail.value, step.value]
  step.value = next
  await nextTick()
  stepHead.value?.focus({ preventScroll: false })
}

async function back() {
  const prev = trail.value[trail.value.length - 1] ?? 'list'
  trail.value = trail.value.slice(0, -1)
  step.value = prev
  await nextTick()
  if (prev === 'list') listEl.value?.querySelector<HTMLElement>(`[data-card="${cameFrom}"]`)?.focus()
  else stepHead.value?.focus()
}

watch(open, (o) => {
  if (!o) return
  step.value = 'list'
  trail.value = []
  laterDayId.value = null
})

function close() {
  sheet.close()
}

/** Confirms a change to a group trip's shared plan; always yes on your own trip. */
function okForEveryone(what: string): boolean {
  if (!tg.isGroup.value) return true
  return typeof window === 'undefined' || window.confirm(`This changes the plan for everyone in this trip. ${what}`)
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

/** Remembers the marks of stops about to be skipped, and gives a function that puts them back. */
function skipAll(stops: readonly ResolvedStop[]): () => void {
  const before = stops.map(s => ({ id: s.id, mark: v.progress.value.stops[s.id] }))
  for (const s of stops) v.mark(s.id, 'skipped')
  return () => {
    for (const b of before) v.mark(b.id, b.mark?.status ?? null, b.mark?.at)
  }
}

// ---------- running late ----------
const DELAYS = [
  { min: 15, label: '15 min', aria: '15 minutes' },
  { min: 30, label: '30', aria: '30 minutes' },
  { min: 45, label: '45', aria: '45 minutes' },
  { min: 60, label: '1 h', aria: '1 hour' },
  { min: 90, label: '1 h 30', aria: '1 hour 30 minutes' },
]
const delay = ref(30)
/** From now, or from the start of the stop on now that isn't done: you're late for it too. */
const fromMinute = computed(() => {
  const p = v.today.value
  const now = m.value?.minutes ?? 0
  const started = p ? p.stops.filter(s => p.states[s.id] === 'now').map(s => s.start) : []
  return Math.min(now, ...started)
})
const shift = computed(() => {
  const p = v.today.value
  return p ? changesShift(p.stops, p.states, fromMinute.value, delay.value) : null
})

function applyLate() {
  const t = v.trip.value
  const p = v.today.value
  const s = shift.value
  if (!t || !p || !s?.moved || !canEdit.value) return
  const d = delay.value
  const n = s.moved
  const label = dayLabelOf(p)
  if (!okForEveryone(`Move ${plural(n, 'stop')} by ${fmtDuration(d)}?`)) return
  const moves = new Map(s.items.filter(i => !i.stays).map(i => [i.id, i] as const))
  const dayId = p.view.day.id
  const variant = v.variant.value
  /** The day's stops as they were, for Undo. */
  const snap: { list: Stop[] | null } = { list: null }
  v.trips.editDayStops(t.id, dayId, variant, (list) => {
    snap.list = clone(list)
    for (const st of list) {
      const it = moves.get(st.id)
      if (!it) continue
      st.start = it.to
      if (st.end !== undefined && it.end !== undefined) st.end = it.end
      st.timeLabel = it.timeLabel
    }
  })
  const was = snap.list
  if (!was) return
  tg.announce(`${name.value} moved ${plural(n, 'stop')} of ${label} by ${fmtDuration(d)}`)
  toast(`Moved ${plural(n, 'stop')} by ${fmtDuration(d)}`, {
    tone: 'ok',
    actions: [{
      label: 'Undo',
      run: () => {
        v.trips.editDayStops(t.id, dayId, variant, (list) => {
          list.splice(0, list.length, ...clone(was))
        })
        tg.announce(`${name.value} put the times of ${label} back`)
      },
    }],
  })
  close()
}

// ---------- starting later ----------
const laterPlan = computed<DayPlan | undefined>(() => (laterDayId.value ? v.plans.value.find(p => p.view.day.id === laterDayId.value) : dayPlan.value))
const laterIsToday = computed(() => !!laterPlan.value && laterPlan.value === v.today.value)
const startAt = ref('12:00')
/** Today: the next quarter hour. Another day: midday. */
function defaultStart(): string {
  const p = laterDayId.value ? v.plans.value.find(x => x.view.day.id === laterDayId.value) : dayPlan.value
  if (p && p === v.today.value && m.value) return fmtClock(Math.floor(m.value.minutes / 15) * 15 + 15)
  return '12:00'
}
/** The time typed, in minutes on the day's clock (before 05:00 is that night, after midnight). */
const untilMin = computed(() => {
  const x = parseClock(startAt.value || '')
  return x === null ? null : x < 300 ? x + 1440 : x
})
const later = computed(() => (laterPlan.value && untilMin.value !== null ? changesStartLater(laterPlan.value.stops, laterPlan.value.states, untilMin.value) : null))
/** Per must-do: the day it moves to, or 'skip'. */
const picks = ref<Record<string, string>>({})
const mustRows = computed(() => {
  const t = v.trip.value
  const p = laterPlan.value
  if (!t || !p || !later.value) return []
  return later.value.must.map((s) => {
    const targets: ChangesMoveTarget[] = canEdit.value ? changesMoveTargets(t, v.plans.value, s, p.view.day.id).slice(0, 2) : []
    const want = picks.value[s.id]
    const pick = want && (want === 'skip' || targets.some(x => x.dayId === want)) ? want : targets[0]?.dayId ?? 'skip'
    return { stop: s, targets, pick }
  })
})
const laterMoves = computed(() => mustRows.value.filter(r => r.pick !== 'skip'))
const laterSkips = computed(() => [...(later.value?.skip ?? []), ...mustRows.value.filter(r => r.pick === 'skip').map(r => r.stop)])
const laterSummary = computed(() => {
  const parts: string[] = []
  if (laterSkips.value.length) parts.push(`${plural(laterSkips.value.length, 'stop')} skipped`)
  if (laterMoves.value.length) parts.push(`${plural(laterMoves.value.length, 'stop')} moved`)
  return parts.join(', ')
})

function targetLabel(dayId: string): string {
  return dayLabelOf(v.plans.value.find(p => p.view.day.id === dayId))
}

function applyLater() {
  const t = v.trip.value
  const p = laterPlan.value
  if (!t || !p || !later.value) return
  const moves = laterMoves.value.map(r => ({ stop: r.stop, to: r.pick }))
  const skips = laterSkips.value
  if (!moves.length && !skips.length) return
  if (moves.length) {
    const what = moves.length === 1 ? `Move ${moves[0]!.stop.title} to ${targetLabel(moves[0]!.to)}?` : `Move ${plural(moves.length, 'stop')} to other days?`
    if (!okForEveryone(what)) return
  }
  const variant = v.variant.value
  const from = p.view.day.id
  const unskip = skipAll(skips)
  for (const mv of moves) v.trips.moveStop(t.id, from, mv.to, variant, clone(mv.stop.base))
  if (moves.length) {
    tg.announce(moves.length === 1
      ? `${name.value} moved ${moves[0]!.stop.title} to ${targetLabel(moves[0]!.to)}`
      : `${name.value} moved ${plural(moves.length, 'stop')} of ${dayLabelOf(p)} to other days`)
  }
  const parts: string[] = []
  if (skips.length) parts.push(`Skipped ${plural(skips.length, 'stop')}`)
  if (moves.length === 1) parts.push(`moved ${moves[0]!.stop.title} to ${targetLabel(moves[0]!.to)}`)
  else if (moves.length) parts.push(`moved ${plural(moves.length, 'stop')} to other days`)
  const text = parts.join(' · ')
  toast(text.charAt(0).toUpperCase() + text.slice(1), {
    tone: 'ok',
    actions: [{
      label: 'Undo',
      run: () => {
        unskip()
        for (const mv of moves) v.trips.moveStop(t.id, mv.to, from, variant, clone(mv.stop.base))
        if (moves.length) tg.announce(`${name.value} put ${moves.length === 1 ? moves[0]!.stop.title : plural(moves.length, 'stop')} back on ${dayLabelOf(p)}`)
      },
    }],
  })
  close()
}

// ---------- a cancelled or delayed flight ----------
/** Ticks of the checklist, per trip, for this visit only (sessionStorage). */
const ticksStore = useSessionStorage<Record<string, Record<string, boolean>>>('travel:changes:flight:v1', {})
const ticks = computed(() => ticksStore.value[v.id.value] ?? {})
function tick(id: string, on: boolean) {
  const tripId = v.id.value
  ticksStore.value = { ...ticksStore.value, [tripId]: { ...ticksStore.value[tripId], [id]: on } }
}
const ticked = computed(() => CHANGES_FLIGHT_CHECKLIST.filter(c => ticks.value[c.id]).length)

const arriveDay = ref('')
const arriveTime = ref('')
function initArrival() {
  const t = v.trip.value
  if (!t) return
  arriveDay.value = nextPlan.value?.view.day.id ?? v.today.value?.view.day.id ?? t.days[0]?.id ?? ''
}
const stayMessage = computed(() => {
  const t = v.trip.value
  const d = t?.days.find(x => x.id === arriveDay.value) ?? t?.days[0]
  if (!t || !d) return null
  const x = arriveTime.value ? parseClock(arriveTime.value) : null
  return changesStayMessage(t, { date: d.date, minutes: x })
})
/** Where you stay, as the trip names it ("Your hostel" reads "your hostel" in a sentence). */
const stayName = computed(() => {
  const label = v.trip.value?.home?.label?.trim()
  if (!label) return 'the place you stay'
  return /^your\s/i.test(label) ? `y${label.slice(1)}` : label
})

async function copy(text: string, what: string) {
  if (await copyText(text)) toast(`${what} copied`, { tone: 'ok' })
  else toast('Couldn\'t copy. Select the text and copy it.', { tone: 'warn' })
}

function startClaim() {
  const query: Record<string, string> = {}
  for (const [k, val] of Object.entries(route.query)) {
    if (k !== 'changed' && typeof val === 'string') query[k] = val
  }
  query.claim = 'new'
  query.kind = 'flight-cancelled'
  router.push({ query })
}

// ---------- the rest of today off ----------
const rest = computed(() => {
  const p = v.today.value
  return p && m.value ? changesRestOfDay(p.stops, p.states, m.value.minutes) : null
})
function applyOff() {
  const r = rest.value
  if (!r?.skip.length) return
  const n = r.skip.length
  const unskip = skipAll(r.skip)
  toast(`The rest of today is off: ${plural(n, 'stop')} skipped`, { tone: 'ok', actions: [{ label: 'Undo', run: unskip }] })
  close()
}

const stepTitle = computed(() => ({ list: '', late: 'Running late', later: 'Starting later', flight: 'Flight cancelled or delayed', off: 'Taking the rest of today off' })[step.value])
</script>

<template>
  <BottomSheet :open="open" title="Plans changed" size="lg" @close="close">
    <div v-if="open" class="pc">
      <!-- ================= the four situations ================= -->
      <div v-if="step === 'list'" ref="listEl" class="stack">
        <p class="muted intro">
          {{ intro }}
        </p>
        <p v-if="viewerNote" class="small note">
          <AppIcon name="eye" size="sm" />{{ viewerNote }}
        </p>
        <div class="cards">
          <button v-for="c in cards" :key="c.key" type="button" class="pc-card" :data-card="c.key" @click="go(c.key)">
            <span class="ic" aria-hidden="true"><AppIcon :name="c.icon" /></span>
            <span class="tx">
              <b>{{ c.title }}</b>
              <span class="small muted">{{ c.sub }}</span>
            </span>
            <AppIcon name="chevr" class="chev" />
          </button>
        </div>
      </div>

      <template v-else>
        <div class="head">
          <button type="button" class="btn sm plain back" @click="back">
            <AppIcon name="chevl" size="sm" />Back
          </button>
        </div>
        <h3 ref="stepHead" class="h3 step-h" tabindex="-1">
          {{ stepTitle }}
        </h3>

        <!-- ================= running late ================= -->
        <div v-if="step === 'late'" class="stack">
          <div class="field">
            <span id="pc-late-l">How late?</span>
            <div class="opts" role="group" aria-labelledby="pc-late-l">
              <button v-for="o in DELAYS" :key="o.min" type="button" class="chip opt" :aria-pressed="delay === o.min" :aria-label="o.aria" @click="delay = o.min">
                {{ o.label }}
              </button>
            </div>
          </div>
          <template v-if="shift && shift.items.length">
            <ol class="moves" aria-label="What moves">
              <li v-for="i in shift.items" :key="i.id" class="mv" :class="{ stays: i.stays, minor: i.minor }">
                <span class="mv-time num">
                  <template v-if="i.stays">{{ fmtClock(i.from) }}</template>
                  <template v-else>
                    <span class="old">{{ fmtClock(i.from) }}</span><span aria-hidden="true"> → </span><span class="sr-only"> moves to </span><b>{{ i.timeLabel }}</b>
                  </template>
                </span>
                <span class="mv-t">
                  <span class="mv-title">{{ i.title }}</span>
                  <span v-if="i.stays" class="chip t-gold stays-chip">{{ CHANGES_STAYS[i.stays] }}</span>
                  <span v-if="i.clash" class="clash small"><AppIcon name="alert" size="xs" />Now overlaps {{ i.clash.title }} at {{ fmtClock(i.clash.start) }}</span>
                </span>
              </li>
            </ol>
            <p v-if="!shift.moved" class="muted">
              Only booked stops and travel are left today: they stay where they are.
            </p>
            <p v-else-if="shift.clashes" class="small muted">
              {{ shift.clashes === 1
                ? 'Check the one that overlaps after the move: tap it in your plan to change its time.'
                : `Check the ${shift.clashes} that overlap after the move: tap each in your plan to change its time.` }}
            </p>
          </template>
          <p v-else class="muted">
            Nothing left to move today.
          </p>
          <p v-if="tg.isGroup.value && shift?.moved" class="small note">
            <AppIcon name="users" size="sm" />This changes the plan for everyone in this trip.
          </p>
          <button class="btn primary block" type="button" :disabled="!shift?.moved" @click="applyLate">
            {{ shift?.moved ? `Move ${plural(shift.moved, 'stop')}` : 'Nothing to move' }}
          </button>
        </div>

        <!-- ================= starting later ================= -->
        <div v-else-if="step === 'later'" class="stack">
          <p v-if="laterPlan && !laterIsToday" class="small muted">
            {{ fmtDate(laterPlan.view.day.date, 'long') }}
          </p>
          <label class="field start">
            <span>I'll start at</span>
            <input v-model="startAt" class="input num" type="time">
          </label>
          <template v-if="later">
            <section v-if="later.skip.length" class="grp" aria-labelledby="pc-skip-h">
              <h4 id="pc-skip-h" class="label">
                To skip
              </h4>
              <ul class="plain-list">
                <li v-for="s in later.skip" :key="s.id" :class="{ minor: s.minor }">
                  <span class="num tm">{{ fmtClock(s.start) }}</span><span class="grow">{{ s.title }}</span>
                </li>
              </ul>
            </section>
            <section v-if="mustRows.length" class="grp" aria-labelledby="pc-must-h">
              <h4 id="pc-must-h" class="label">
                Must-dos
              </h4>
              <ul class="musts">
                <li v-for="r in mustRows" :key="r.stop.id" class="must">
                  <div class="must-h">
                    <span class="num tm">{{ fmtClock(r.stop.start) }}</span>
                    <b class="grow">{{ r.stop.title }}</b>
                    <span v-if="r.stop.bookingId" class="chip t-gold">Booked</span>
                  </div>
                  <div class="opts" role="group" :aria-label="`${r.stop.title}: move or skip`">
                    <button v-for="x in r.targets" :key="x.dayId" type="button" class="chip opt" :aria-pressed="r.pick === x.dayId" @click="picks = { ...picks, [r.stop.id]: x.dayId }">
                      Move to {{ x.label }}
                    </button>
                    <button type="button" class="chip opt" :aria-pressed="r.pick === 'skip'" @click="picks = { ...picks, [r.stop.id]: 'skip' }">
                      Skip
                    </button>
                  </div>
                  <p v-if="!r.targets.length && canEdit" class="small muted">
                    No other day ahead has it open.
                  </p>
                </li>
              </ul>
              <p v-if="laterMoves.length" class="small muted">
                Moved stops keep their time. Booked ones: ask about another day before you go.
              </p>
              <p v-if="!canEdit" class="small muted">
                Only the people who can edit this plan can move stops.
              </p>
            </section>
            <p v-if="!later.skip.length && !mustRows.length" class="muted">
              Nothing before then to skip.
            </p>
          </template>
          <p v-else class="muted">
            Type the time you'll start.
          </p>
          <p v-if="tg.isGroup.value && laterMoves.length" class="small note">
            <AppIcon name="users" size="sm" />Moving stops changes the plan for everyone in this trip.
          </p>
          <button class="btn primary block" type="button" :disabled="!laterSkips.length && !laterMoves.length" @click="applyLater">
            Apply<span v-if="laterSummary" class="sr-only">: {{ laterSummary }}</span>
          </button>
        </div>

        <!-- ================= a cancelled or delayed flight ================= -->
        <div v-else-if="step === 'flight'" class="stack">
          <p class="muted">
            At the desk or in the app, before you accept anything:
          </p>
          <ul class="checks" :aria-label="`Checklist, ${ticked} of ${CHANGES_FLIGHT_CHECKLIST.length} done`">
            <li v-for="c in CHANGES_FLIGHT_CHECKLIST" :key="c.id">
              <label class="ck">
                <input type="checkbox" class="check" :checked="!!ticks[c.id]" @change="tick(c.id, ($event.target as HTMLInputElement).checked)">
                <span class="ck-t">
                  <span class="ck-main">{{ c.text }}</span>
                  <span v-if="c.why" class="small muted">{{ c.why }}</span>
                </span>
              </label>
            </li>
          </ul>

          <section v-if="stayMessage" class="grp stay" aria-labelledby="pc-stay-h">
            <h4 id="pc-stay-h" class="h3 sub-h">
              Tell your stay
            </h4>
            <p class="small muted">
              A message for {{ stayName }}, ready to copy into their chat or email.
            </p>
            <div class="form-grid arrive">
              <label class="field">
                <span>I'll arrive on</span>
                <select v-model="arriveDay" class="select">
                  <option v-for="d in v.trip.value?.days ?? []" :key="d.id" :value="d.id">{{ fmtDate(d.date, 'short') }}</option>
                </select>
              </label>
              <label class="field">
                <span>Around <span class="hint">(optional)</span></span>
                <input v-model="arriveTime" class="input num" type="time">
              </label>
            </div>
            <div class="msg">
              <p class="label">
                In English
              </p>
              <p class="msg-t" lang="en">
                {{ stayMessage.en }}
              </p>
              <button class="btn sm" type="button" @click="copy(stayMessage.en, 'Message in English')">
                <AppIcon name="copy" size="sm" />Copy
              </button>
            </div>
            <div v-if="stayMessage.local" class="msg">
              <p class="label">
                In {{ stayMessage.lang }}
              </p>
              <p class="msg-t" lang="it">
                {{ stayMessage.local }}
              </p>
              <button class="btn sm" type="button" :aria-label="`Copy the message in ${stayMessage.lang}`" @click="copy(stayMessage.local!, `Message in ${stayMessage.lang}`)">
                <AppIcon name="copy" size="sm" />Copy
              </button>
            </div>
          </section>

          <div class="acts">
            <button class="btn primary" type="button" @click="startClaim">
              <AppIcon name="doc" size="sm" />Start a claim
            </button>
            <button v-if="nextPlan" class="btn ghost" type="button" @click="go('later', { laterDay: nextPlan.view.day.id })">
              <AppIcon name="sunrise" size="sm" />{{ replanLabel }}
            </button>
          </div>
          <p class="small faint">
            {{ CLAIM_GUIDE }}
          </p>
        </div>

        <!-- ================= the rest of today off ================= -->
        <div v-else-if="step === 'off'" class="stack">
          <template v-if="rest && rest.skip.length">
            <p class="muted">
              These are skipped. You can undo it.
            </p>
            <ul class="plain-list">
              <li v-for="s in rest.skip" :key="s.id" :class="{ minor: s.minor }">
                <span class="num tm">{{ fmtClock(s.start) }}</span><span class="grow">{{ s.title }}</span>
              </li>
            </ul>
          </template>
          <p v-else class="muted">
            Nothing left to skip today.
          </p>
          <div v-if="rest?.keep.length" class="grp">
            <p class="label">
              Still in your plan
            </p>
            <ul class="plain-list">
              <li v-for="s in rest.keep" :key="s.id">
                <span class="num tm">{{ fmtClock(s.start) }}</span><span class="grow">{{ s.title }}</span>
              </li>
            </ul>
          </div>
          <button class="btn primary block" type="button" :disabled="!rest?.skip.length" @click="applyOff">
            {{ rest?.skip.length ? `Skip ${plural(rest.skip.length, 'stop')}` : 'Nothing to skip' }}
          </button>
        </div>
      </template>
    </div>
  </BottomSheet>
</template>

<style scoped>
.pc { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 14px; }
.intro { font-size: 15px; }
.note { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 12px; background: var(--surface-2); color: var(--fg); font-weight: 550; }
.note .i { flex: none; margin-top: 1px; color: var(--accent); }

.cards { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; background: var(--surface); }
.pc-card { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 64px; padding: 10px 14px; background: none; border: 0; text-align: left; color: var(--fg); }
.pc-card + .pc-card { border-top: 1px solid var(--line); }
@media (hover: hover) { .pc-card:hover { background: var(--surface-2); } }
.pc-card:active { background: var(--surface-2); }
.pc-card:focus-visible { outline-offset: -3px; }
.pc-card .ic { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--warn-soft); color: var(--warn); }
.pc-card .tx { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; line-height: 1.3; }
.pc-card .tx b { font-size: 15.5px; }
.chev { flex: none; color: var(--fg-3); }

.head { display: flex; margin: 0 0 -6px -10px; }
/* The first row of the sheet's scroller: 44 px of its own, as the scroller would cut a touch area reaching above it. */
.back { min-height: 44px; }
.step-h { outline: none; }
.step-h:focus-visible { outline: 2.5px solid var(--accent); outline-offset: 3px; }
.sub-h { font-size: 16px; }

/* Choices: chips that wrap, 40 px tall (44 px to the touch). */
.opts { display: flex; flex-wrap: wrap; gap: 8px; }
.chip.opt { min-height: 40px; padding: 0 14px; font-size: 14.5px; border-color: var(--line); background: var(--surface); color: var(--fg); }

.moves { list-style: none; display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.mv { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; align-items: start; padding: 10px 12px; }
.mv + .mv { border-top: 1px solid var(--line); }
.mv-time { font-size: 13.5px; line-height: 1.5; white-space: nowrap; }
.mv-time .old { color: var(--fg-2); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--fg-2) 60%, transparent); }
.mv-time b { font-weight: 600; color: var(--fg); }
.mv-t { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
.mv-title { font-weight: 600; line-height: 1.35; overflow-wrap: anywhere; }
.mv.minor .mv-title { font-weight: 500; color: var(--fg-2); }
.mv.stays .mv-time { color: var(--fg); }
.stays-chip { white-space: normal; }
.clash { display: inline-flex; align-items: flex-start; gap: 5px; color: var(--warn); font-weight: 600; line-height: 1.35; }
.clash .i { flex: none; margin-top: 2px; }
@media (max-width: 359px) {
  .mv { grid-template-columns: minmax(0, 1fr); gap: 2px; }
}

.start { max-width: 220px; }
.grp { display: flex; flex-direction: column; gap: 8px; }
.plain-list { list-style: none; display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.plain-list li { display: flex; gap: 10px; align-items: baseline; padding: 9px 12px; line-height: 1.35; }
.plain-list li + li { border-top: 1px solid var(--line); }
.plain-list li.minor { font-size: 13.5px; color: var(--fg-2); }
.tm { flex: none; width: 46px; font-size: 13px; color: var(--fg-2); }
.musts { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.must { display: flex; flex-direction: column; gap: 10px; padding: 12px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.must-h { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.must-h b { line-height: 1.35; overflow-wrap: anywhere; }

.checks { list-style: none; display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.checks li + li { border-top: 1px solid var(--line); }
.ck { display: flex; align-items: flex-start; gap: 12px; min-height: 44px; padding: 10px 12px; cursor: pointer; }
.ck .check { margin-top: 1px; }
.ck-t { display: flex; flex-direction: column; gap: 2px; min-width: 0; line-height: 1.4; }
.ck-main { font-weight: 600; }
.ck:has(.check:checked) .ck-main { color: var(--fg-2); }

.stay { padding-top: 4px; }
.arrive { gap: 10px; }
.msg { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px; border-radius: 14px; background: var(--surface-2); }
.msg-t { font-size: 15px; line-height: 1.5; user-select: text; -webkit-user-select: text; }
.msg .btn { background: var(--surface); border-color: var(--line); }
@media (hover: hover) { .msg .btn:hover { background: var(--surface-3); } }
.acts { display: flex; flex-wrap: wrap; gap: 10px; }
.acts .btn { flex: 1 1 auto; }
</style>
