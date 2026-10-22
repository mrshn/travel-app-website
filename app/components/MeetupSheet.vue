<script setup lang="ts">
import type { Meetup } from '#shared/types/social'
import type { Place } from '#shared/types/trip'
import { findStop, resolveStop } from '#shared/utils/plan'
import { socialFirstName, socialFriendsThere, socialMeetupPassed, socialMeetupWhen, socialPath } from '#shared/utils/social'
import { addDays, deviceTimeZone, fmtClock, fmtDate, zoned } from '#shared/utils/time'
import type { Unsub } from '~/lib/social/api'
import { meetFormFrom, meetFormProblem, meetFormStart, type MeetFormValue } from './MeetForm.vue'
import { meetClockIn, meetIdeasFor } from './MeetIdea.vue'
import { meetErrorLine } from './MeetState.vue'

/**
 * A meetup (spec 5.10 and T8), mounted once by the trip shell and open while the URL has ?meetup=…:
 *   ?meetup=new              a new one: from a stop (&stop=<id>: its title, day, time and place), an idea (&idea=<id>:
 *                            its title and its ask), a friend in the same place (&hi=<uid>), or blank;
 *   ?meetup=<id>             yours: the link to share, who's going, edit, cancel.
 * Making one turns the sheet into yours (?meetup=<id>), so the link stays after a reload.
 */
const v = useTripView()
const route = useRoute()
const router = useRouter()
const sheet = useQueryState('meetup')
const social = useSocial()
const tg = useTripGroup()
const composer = usePostComposer()
const clock = useClock()
/** Bumped when a meetup of yours is made or changed, so Meet people lists them again. */
const changed = useState('meet:changed', () => 0)

const isNew = computed(() => sheet.value.value === 'new')
const mineId = computed(() => (sheet.value.value && sheet.value.value !== 'new' ? sheet.value.value : null))
const show = computed(() => !!v.trip.value && (isNew.value || !!mineId.value))
const query = (k: string) => {
  const x = route.query[k]
  return typeof x === 'string' && x ? x : null
}

// ---------- a new meetup ----------
const BLANK: MeetFormValue = { title: '', note: '', date: '', time: '20:00', place: null }
const form = ref<MeetFormValue>({ ...BLANK })
const intro = ref('')
const tried = ref(false)
const creating = ref(false)

/** Today on the trip's clock (the trip's day during it), else its first day before it, else the date there now. */
function baseDate(): string {
  const t = v.trip.value!
  const m = v.moment.value
  if (m?.phase === 'during') return m.dayDate
  if (m?.phase === 'before') return t.start
  return zoned(clock.now.value, t.timezone).date
}
/** The day for a time with no day of its own: today, or tomorrow on the trip once that time has gone today. */
function dayFor(minutes: number | null): string {
  const t = v.trip.value!
  const m = v.moment.value
  const d = baseDate()
  if (m?.phase === 'during' && minutes !== null && minutes <= m.minutes && addDays(d, 1) <= t.end) return addDays(d, 1)
  return d
}

/** A stop by id with its picked option: the plan's day first, else any version of the trip. */
function stopFor(id: string): { title: string, start: number, date: string, place?: Place | null } | null {
  const hit = v.locate(id)
  if (hit) return { title: hit.stop.title, start: hit.stop.start, date: hit.plan.view.day.date, place: hit.stop.place }
  const t = v.trip.value
  const f = t ? findStop(t, id) : null
  if (!f) return null
  const s = resolveStop(f.stop, v.progress.value.choices ?? {})
  return { title: s.title, start: s.start, date: f.day.date, place: s.place }
}

/** The form a new meetup opens with, from what opened it. */
function prefill(): { form: MeetFormValue, intro: string } {
  const t = v.trip.value!
  const stopId = query('stop')
  const s = stopId ? stopFor(stopId) : null
  if (s) {
    // After midnight (a start past 24:00) is the next calendar day.
    const date = addDays(s.date, Math.floor(s.start / 1440))
    const minutes = s.start % 1440
    const title = s.title.slice(0, 80)
    const place = s.place ? { name: s.place.name, lat: s.place.lat, lng: s.place.lng, ...(s.place.query ? { query: s.place.query } : {}) } : null
    return {
      form: { title, note: `Anyone for ${title} at ${fmtClock(minutes)} on ${fmtDate(date, 'weekdayLong')}?`.slice(0, 280), date, time: fmtClock(minutes), place },
      intro: 'From your plan.',
    }
  }
  const ideaId = query('idea')
  const idea = ideaId ? meetIdeasFor(t).find(i => i.id === ideaId) : undefined
  if (idea) {
    // Its time: from when it is, else from the line it asks with ("…at 10:00?").
    const at = meetClockIn(idea.when) ?? meetClockIn(idea.ask)
    const day = idea.dayId ? t.days.find(d => d.id === idea.dayId)?.date : undefined
    return {
      form: { title: idea.title.slice(0, 80), note: (idea.ask ?? `Anyone for ${idea.title}?`).slice(0, 280), date: day ?? dayFor(at), time: fmtClock(at ?? 1200), place: null },
      intro: 'From Ways to meet people.',
    }
  }
  const hi = query('hi')
  if (hi) {
    const card = social.cards.value[hi]
    const there = card ? socialFriendsThere([card], t)[0]?.trip : undefined
    const from = [t.start, there?.start ?? t.start, baseDate()].sort().pop()!
    const until = [t.end, there?.end ?? t.end].sort()[0]!
    return {
      form: { title: `Meet up in ${t.destination}`.slice(0, 80), note: `Fancy meeting up while we're both in ${t.destination}?`, date: from <= until ? from : baseDate(), time: '20:00', place: null },
      intro: `To say hi to ${socialFirstName(social.personRef(hi).name)}: make the link, then send it.`,
    }
  }
  return { form: { ...BLANK, date: baseDate() }, intro: '' }
}

// A fresh form each time a new meetup opens (not as the clock moves while you type).
watch(() => (show.value && isNew.value ? `${query('stop')}|${query('idea')}|${query('hi')}` : null), (key) => {
  if (key === null) return
  const p = prefill()
  form.value = p.form
  intro.value = p.intro
  tried.value = false
}, { immediate: true })

const problem = computed(() => meetFormProblem(form.value))
/** The meetup just made, shown at once while the sheet starts watching it. */
let justMade: Meetup | null = null

async function create() {
  tried.value = true
  const t = v.trip.value
  if (!t || problem.value || creating.value) return
  creating.value = true
  try {
    const f = form.value
    const m = await social.api().createMeetup({
      title: f.title.trim(),
      note: f.note.trim(),
      place: f.place,
      start: meetFormStart(f, t.timezone),
      timezone: t.timezone,
      destination: t.destination,
      tripTitle: t.title,
    })
    justMade = m
    changed.value++
    // The stop stays in the URL: its sheet, under this one, comes back when this one closes.
    const { idea: _idea, hi: _hi, ...rest } = route.query
    await router.replace({ query: { ...rest, meetup: m.id } })
    toast('Your meetup link is ready. Share it in any chat.', { tone: 'ok' })
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t make the link.'), { tone: 'warn' })
  }
  finally {
    creating.value = false
  }
}

// ---------- yours ----------
const meetup = ref<Meetup | null>(null)
const mineState = ref<'loading' | 'ok' | 'missing' | 'error'>('loading')
const editing = ref(false)
const editForm = ref<MeetFormValue>({ ...BLANK })
const editTried = ref(false)
const saving = ref(false)
let unsub: Unsub | null = null

watch([mineId, () => social.ready.value], ([id, ready]) => {
  unsub?.()
  unsub = null
  editing.value = false
  const seed = justMade && justMade.id === id ? justMade : null
  meetup.value = seed
  mineState.value = seed ? 'ok' : 'loading'
  if (!id || !ready) return
  try {
    unsub = social.api().watchMeetup(id, (m) => {
      meetup.value = m
      mineState.value = m ? 'ok' : 'missing'
    }, () => {
      mineState.value = 'error'
    })
  }
  catch {
    mineState.value = 'error'
  }
}, { immediate: true })
onBeforeUnmount(() => unsub?.())

const isHost = computed(() => !!meetup.value && meetup.value.host === social.me.value?.uid)
const url = computed(() => (mineId.value ? social.link(socialPath('meetup', mineId.value)) : ''))
const when = computed(() => (meetup.value ? socialMeetupWhen(meetup.value, deviceTimeZone()) : null))
const passed = computed(() => !!meetup.value && socialMeetupPassed(meetup.value, clock.real.value.getTime()))
const editProblem = computed(() => meetFormProblem(editForm.value))

function startEdit() {
  if (!meetup.value) return
  editForm.value = meetFormFrom(meetup.value)
  editTried.value = false
  editing.value = true
}
// Opened to change it (Edit on the meetup's page, &change=1): straight to the form, once.
watch([meetup, isHost], ([m, host]) => {
  if (!m || !host || route.query.change !== '1') return
  startEdit()
  const { change: _change, ...rest } = route.query
  void router.replace({ query: rest })
})

async function saveEdit() {
  const m = meetup.value
  editTried.value = true
  if (!m || editProblem.value || saving.value) return
  saving.value = true
  try {
    const f = editForm.value
    await social.api().updateMeetup(m.id, { title: f.title.trim(), note: f.note.trim(), start: meetFormStart(f, m.timezone), place: f.place })
    changed.value++
    editing.value = false
    toast('Meetup updated', { tone: 'ok' })
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t save the changes.'), { tone: 'warn' })
  }
  finally {
    saving.value = false
  }
}

async function cancelMeetup() {
  const m = meetup.value
  if (!m || !confirm('Cancel this meetup? Anyone with the link will see that it\'s off.')) return
  try {
    await social.api().updateMeetup(m.id, { cancelled: true })
    changed.value++
    toast('Meetup cancelled', { tone: 'ok' })
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t cancel it.'), { tone: 'warn' })
  }
}

/** The composer (another package's sheet), opened over this one with the meetup's link. */
function post() {
  const m = meetup.value
  const t = v.trip.value
  if (!m || !t) return
  const place = m.place ? { name: m.place.name, ...(m.place.lat !== undefined && m.place.lng !== undefined ? { lat: m.place.lat, lng: m.place.lng } : {}) } : undefined
  composer.open({
    draft: { kind: 'meetup', link: socialPath('meetup', m.id), text: m.note, trip: { title: t.title, destination: t.destination, start: t.start, end: t.end }, ...(place ? { place } : {}) },
    context: m.title,
  })
}

const sending = ref(false)
async function toChat() {
  const m = meetup.value
  if (!m || sending.value) return
  sending.value = true
  try {
    await tg.send({ kind: 'text', text: `${m.note || m.title} ${url.value}`.trim().slice(0, 1000) })
    toast('Sent to the group chat', { tone: 'ok' })
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t send it to the group chat.'), { tone: 'warn' })
  }
  finally {
    sending.value = false
  }
}

const title = computed(() => (isNew.value ? 'New meetup' : meetup.value && !isHost.value ? 'A meetup' : 'Your meetup'))
</script>

<template>
  <BottomSheet :open="show" :title="title" @close="sheet.close()">
    <div v-if="show" class="mu">
      <!-- ================= new ================= -->
      <template v-if="isNew">
        <p class="small muted lead">
          <template v-if="intro">
            {{ intro }}
          </template>
          Anyone with the link can see it; saying "I'm in" needs a Travels account.
        </p>
        <MeetState />
        <MeetForm v-model="form" uid="mu-new" :time-zone="v.trip.value?.timezone" />
        <p v-if="tried && problem" class="err" role="alert">
          {{ problem }}
        </p>
      </template>

      <!-- ================= yours ================= -->
      <template v-else>
        <MeetState />
        <p v-if="social.ready.value && mineState === 'loading'" class="muted">
          Loading the meetup…
        </p>
        <p v-else-if="mineState === 'missing'" class="muted">
          This meetup isn't there any more.
        </p>
        <p v-else-if="mineState === 'error'" class="muted">
          Couldn't load this meetup right now. Try again in a moment.
        </p>
        <template v-else-if="meetup && when">
          <template v-if="!isHost">
            <p>This is {{ socialFirstName(meetup.hostName) }}'s meetup.</p>
            <div>
              <NuxtLink class="btn sm" :to="socialPath('meetup', meetup.id)">
                <AppIcon name="ext" size="sm" />Open the meetup
              </NuxtLink>
            </div>
          </template>
          <template v-else-if="editing">
            <MeetForm v-model="editForm" uid="mu-edit" :time-zone="meetup.timezone" />
            <p v-if="editTried && editProblem" class="err" role="alert">
              {{ editProblem }}
            </p>
          </template>
          <template v-else>
            <div class="sum">
              <p v-if="meetup.cancelled" class="state t-bad">
                <AppIcon name="x" size="sm" />You cancelled this meetup.
              </p>
              <p v-else-if="passed" class="state">
                <AppIcon name="clock" size="sm" />This meetup has passed.
              </p>
              <h3 class="mt">
                {{ meetup.title }}
              </h3>
              <p class="fact tnum">
                <AppIcon name="calendar" size="sm" /><span>{{ when.label }}<template v-if="when.yours"> · {{ when.yours }}</template></span>
              </p>
              <p v-if="meetup.place" class="fact">
                <AppIcon name="pin" size="sm" /><span>{{ meetup.place.name }}</span>
              </p>
              <p v-if="meetup.note" class="note">
                {{ meetup.note }}
              </p>
            </div>
            <section v-if="!meetup.cancelled" class="share" aria-labelledby="mu-link-h">
              <h3 id="mu-link-h" class="label">
                Your link
              </h3>
              <ShareLink :url="url" :title="meetup.title" :text="meetup.note" />
              <div class="acts">
                <button class="btn sm" type="button" @click="post">
                  <AppIcon name="users" size="sm" />Post to friends
                </button>
                <button v-if="tg.isGroup.value" class="btn sm" type="button" :disabled="sending" @click="toChat">
                  <AppIcon name="chat" size="sm" />Send to the group chat
                </button>
              </div>
            </section>
            <MeetGoing :id="meetup.id" />
            <div class="acts end">
              <button v-if="!meetup.cancelled" class="btn sm ghost" type="button" @click="startEdit">
                <AppIcon name="edit" size="sm" />Edit
              </button>
              <NuxtLink class="btn sm ghost" :to="socialPath('meetup', meetup.id)">
                <AppIcon name="eye" size="sm" />See the page
              </NuxtLink>
              <button v-if="!meetup.cancelled" class="btn sm danger" type="button" @click="cancelMeetup">
                <AppIcon name="x" size="sm" />Cancel this meetup
              </button>
            </div>
          </template>
        </template>
      </template>
    </div>
    <template v-if="isNew" #footer>
      <button class="btn primary grow" type="button" :disabled="creating || !social.ready.value" @click="create">
        <AppIcon name="link" size="sm" />{{ creating ? 'Making the link…' : 'Create the link' }}
      </button>
    </template>
    <template v-else-if="editing && isHost" #footer>
      <button class="btn ghost" type="button" @click="editing = false">
        Back
      </button>
      <button class="btn primary grow" type="button" :disabled="saving" @click="saveEdit">
        <AppIcon name="check" size="sm" />Save changes
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.mu { display: flex; flex-direction: column; gap: 16px; padding: 6px 16px 8px; }
.lead { line-height: 1.45; }
.err { font-size: 13.5px; font-weight: 650; color: var(--bad); }
.sum { display: flex; flex-direction: column; gap: 6px; padding: 14px; border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--surface); }
.state { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 650; color: var(--fg-2); }
.state.t-bad { color: var(--bad); }
.mt { font-size: 18px; font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
.fact { display: flex; align-items: flex-start; gap: 8px; font-size: 14.5px; color: var(--fg-2); line-height: 1.4; }
.fact .i { margin-top: 2px; color: var(--accent); }
.note { font-size: 15px; line-height: 1.5; margin-top: 4px; overflow-wrap: anywhere; }
.share { display: flex; flex-direction: column; gap: 10px; }
.share .label { margin: 0; }
.acts { display: flex; flex-wrap: wrap; gap: 8px; }
.acts .btn { flex: 1 1 auto; }
.acts.end { padding-top: 12px; border-top: 1px solid var(--line); }
</style>
