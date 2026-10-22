<script setup lang="ts">
import type { Meetup, MeetupGoing } from '#shared/types/social'
import { directionsUrl, searchUrl } from '#shared/utils/geo'
import { socialFirstName, socialMeetupIcs, socialMeetupPassed, socialMeetupWhen, socialPath, socialTokenValid } from '#shared/utils/social'
import { addDays, deviceTimeZone } from '#shared/utils/time'
import type { Unsub } from '~/lib/social/api'
import { meetFormFrom, meetFormProblem, meetFormStart, type MeetFormValue } from '~/components/MeetForm.vue'
import { meetErrorLine } from '~/components/MeetState.vue'

/**
 * A meetup (spec 5.10 and T8): an open invite anyone with the link can read, signed out too (it never shows the
 * device's trips). Saying "I'm in" needs an account and tells the host; who's going shows to signed-in people only.
 * The host can edit (in the trip's sheet when the trip is on this device), share the link again and cancel.
 */
const route = useRoute()
const social = useSocial()
const cloud = useCloud()
const clock = useClock()

const id = computed(() => String(route.params.id ?? ''))
const meetup = ref<Meetup | null>(null)
const state = ref<'loading' | 'ok' | 'missing' | 'error'>('loading')
let unsub: Unsub | null = null
let turn = 0

async function start() {
  unsub?.()
  unsub = null
  const my = ++turn
  meetup.value = null
  state.value = 'loading'
  if (!socialTokenValid(id.value)) {
    state.value = 'missing'
    return
  }
  try {
    const b = await social.publicApi()
    if (my !== turn) return
    unsub = b.watchMeetup(id.value, (m) => {
      meetup.value = m
      state.value = m ? 'ok' : 'missing'
    }, () => {
      state.value = 'error'
    })
  }
  catch {
    if (my === turn) state.value = 'error'
  }
}
onMounted(start)
watch(id, start)
onBeforeUnmount(() => unsub?.())

const m = meetup
const url = computed(() => social.link(socialPath('meetup', id.value)))
const when = computed(() => (m.value ? socialMeetupWhen(m.value, deviceTimeZone()) : null))
const zoneName = computed(() => m.value?.destination || (m.value?.timezone.split('/').pop() ?? '').replace(/_/g, ' '))
const passed = computed(() => !!m.value && socialMeetupPassed(m.value, clock.real.value.getTime()))
const open = computed(() => !!m.value && !m.value.cancelled && !passed.value)

/** A device with an account (signed in, or remembered): it may join; with none, only sign in. */
const hasAccount = computed(() => !!cloud.account.value || cloud.signedIn.value)
const me = computed(() => social.me.value?.uid ?? null)
const isHost = computed(() => !!m.value && !!me.value && m.value.host === me.value)
const going = ref<MeetupGoing[]>([])
const amGoing = computed(() => !!me.value && going.value.some(g => g.uid === me.value))
const busy = ref(false)
const signingIn = computed(() => cloud.status.value === 'signing-in' || cloud.status.value === 'starting')
// Firebase loads ahead of the tap, so a desktop sign-in window opens inside it (D31).
watch(() => !hasAccount.value || social.state.value === 'signed-out', (show) => {
  if (show) void cloud.prepare()
}, { immediate: true })

const directions = computed(() => {
  const p = m.value?.place
  if (!p) return ''
  return p.lat !== undefined && p.lng !== undefined ? directionsUrl({ lat: p.lat, lng: p.lng }) : searchUrl(p.query ?? p.name)
})

async function join() {
  const x = m.value
  if (!x || busy.value) return
  busy.value = true
  try {
    const b = social.api()
    await b.setGoing(x.id, true)
    toast(`You're in. ${socialFirstName(x.hostName)} will see it.`, { tone: 'ok' })
    // The host hears it in their activity (allowed for a meetup's host by the rules).
    void b.notify(x.host, { kind: 'meetup-going', text: `is in for ${x.title}`.slice(0, 200), link: socialPath('meetup', x.id), ref: x.id }).catch(() => {})
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t say you\'re in.'), { tone: 'warn' })
  }
  finally {
    busy.value = false
  }
}

async function leave() {
  const x = m.value
  if (!x || busy.value) return
  busy.value = true
  try {
    await social.api().setGoing(x.id, false)
    toast('You\'re out. Thanks for saying so.', { tone: 'ok' })
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t change that.'), { tone: 'warn' })
  }
  finally {
    busy.value = false
  }
}

function addToCalendar() {
  const x = m.value
  if (!x) return
  const name = x.title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Meetup'
  downloadFile(`${name}.ics`, socialMeetupIcs(x, url.value), 'text/calendar')
}

async function shareAgain() {
  const x = m.value
  if (!x) return
  const r = await shareLink({ title: x.title, text: x.note, url: url.value })
  if (r === 'copied') toast('Link copied', { tone: 'ok' })
  else if (r === 'failed') toast('Couldn\'t share the link. Press and hold to copy it.', { tone: 'warn' })
}

async function cancelMeetup() {
  const x = m.value
  if (!x || !confirm('Cancel this meetup? Anyone with the link will see that it\'s off.')) return
  try {
    await social.api().updateMeetup(x.id, { cancelled: true })
    toast('Meetup cancelled', { tone: 'ok' })
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t cancel it.'), { tone: 'warn' })
  }
}

// ---------- the host's edit ----------
/** The trip on this device the meetup was made for (the host's only: never looked up for anyone else). */
function hostTrip(): string | null {
  const x = m.value
  if (!x || !isHost.value || !x.tripTitle) return null
  const d = socialMeetupWhen(x).date
  const t = useTrips().trips.value.find(t => t.title === x.tripTitle && d >= t.start && d <= addDays(t.end, 1))
  return t?.id ?? null
}
const editing = ref(false)
const editForm = ref<MeetFormValue>({ title: '', note: '', date: '', time: '', place: null })
const editTried = ref(false)
const saving = ref(false)
const editProblem = computed(() => meetFormProblem(editForm.value))

async function edit() {
  const x = m.value
  if (!x) return
  const tripId = hostTrip()
  if (tripId) {
    await navigateTo({ path: `/trips/${tripId}/meet`, query: { meetup: x.id, change: '1' } })
    return
  }
  editForm.value = meetFormFrom(x)
  editTried.value = false
  editing.value = true
}

async function saveEdit() {
  const x = m.value
  editTried.value = true
  if (!x || editProblem.value || saving.value) return
  saving.value = true
  try {
    const f = editForm.value
    await social.api().updateMeetup(x.id, { title: f.title.trim(), note: f.note.trim(), start: meetFormStart(f, x.timezone), place: f.place })
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

useHead({ title: computed(() => (m.value ? `${m.value.title} · Travels` : 'Meetup · Travels')) })
</script>

<template>
  <div class="page pub meetup">
    <header class="pub-top">
      <NuxtLink to="/" class="brand" aria-label="Travels home">
        <AppLogo :size="30" />
        <b class="display">Travels</b>
      </NuxtLink>
    </header>

    <div v-if="state === 'loading'" class="card pad center muted" role="status">
      Opening the meetup…
    </div>
    <div v-else-if="state === 'missing'" class="card empty">
      <AppIcon name="hand" />
      <h1 class="h3">
        This meetup isn't there any more
      </h1>
      <p>The link may be wrong, or the meetup was removed. Ask whoever sent it for a new one.</p>
    </div>
    <div v-else-if="state === 'error'" class="card empty">
      <AppIcon name="cloudoff" />
      <h1 class="h3">
        Couldn't open this meetup
      </h1>
      <p>Check your connection and try again.</p>
      <p class="again">
        <button class="btn primary" type="button" @click="start">
          <AppIcon name="refresh" size="sm" />Try again
        </button>
      </p>
    </div>

    <article v-else-if="m && when" class="mu card">
      <div class="host">
        <Avatar :person="{ uid: m.host, name: m.hostName, photo: m.hostPhoto }" :size="44" />
        <p class="small">
          <b>{{ isHost ? 'You' : m.hostName }}</b>
          <span class="muted">{{ isHost ? ' made this meetup' : ' is asking who\'s in' }}<template v-if="m.tripTitle"> · {{ m.tripTitle }}</template></span>
        </p>
      </div>

      <p v-if="m.cancelled" class="banner bad" role="status">
        <AppIcon name="x" size="sm" />{{ isHost ? 'You cancelled this meetup.' : `${socialFirstName(m.hostName)} cancelled this meetup.` }}
      </p>
      <p v-else-if="passed" class="banner" role="status">
        <AppIcon name="clock" size="sm" />This meetup has passed.
      </p>

      <template v-if="editing">
        <MeetForm v-model="editForm" uid="m-edit" :time-zone="m.timezone" />
        <p v-if="editTried && editProblem" class="err" role="alert">
          {{ editProblem }}
        </p>
        <div class="acts">
          <button class="btn ghost" type="button" @click="editing = false">
            Back
          </button>
          <button class="btn primary" type="button" :disabled="saving" @click="saveEdit">
            <AppIcon name="check" size="sm" />Save changes
          </button>
        </div>
      </template>
      <template v-else>
        <h1 class="ttl">
          {{ m.title }}
        </h1>
        <div class="facts">
          <p class="fact tnum">
            <AppIcon name="calendar" size="sm" />
            <span><b>{{ when.label }}</b> {{ zoneName }} time<template v-if="when.yours"><br><span class="muted">{{ when.yours }}</span></template></span>
          </p>
          <div v-if="m.place" class="fact where">
            <AppIcon name="pin" size="sm" />
            <span class="grow">{{ m.place.name }}</span>
            <a class="btn sm" :href="directions" target="_blank" rel="noopener">
              <AppIcon name="navigate" size="sm" />Directions
            </a>
          </div>
        </div>
        <p v-if="m.note" class="note">
          {{ m.note }}
        </p>

        <!-- Who's going: signed-in people only -->
        <MeetGoing v-if="social.ready.value" :id="m.id" level="h2" @change="(l) => (going = l)" />
        <p v-else class="small muted signin-line">
          <AppIcon name="lock" size="xs" />Sign in to see who's going.
        </p>

        <!-- Joining -->
        <div v-if="open && !isHost" class="join">
          <template v-if="!hasAccount">
            <button class="btn primary lg" type="button" :disabled="signingIn" @click="cloud.signIn()">
              <AppIcon name="person" size="sm" />{{ signingIn ? 'Signing in…' : 'Sign in with Google to join' }}
            </button>
            <p class="small muted">
              Free, with your Google account. Travels is a trip companion: your own plans stay private.
            </p>
          </template>
          <MeetState v-else-if="!social.ready.value" what="meetups" />
          <template v-else-if="amGoing">
            <p class="in">
              <AppIcon name="check" size="sm" />You're going.
            </p>
            <button class="btn ghost" type="button" :disabled="busy" @click="leave">
              I can't make it
            </button>
          </template>
          <button v-else class="btn primary lg" type="button" :disabled="busy" @click="join">
            <AppIcon name="hand" size="sm" />I'm in
          </button>
        </div>

        <div class="acts">
          <button v-if="!m.cancelled && !passed" class="btn" type="button" @click="addToCalendar">
            <AppIcon name="calendar" size="sm" />Add to calendar
          </button>
          <template v-if="isHost && !m.cancelled">
            <button class="btn" type="button" @click="edit">
              <AppIcon name="edit" size="sm" />Edit
            </button>
            <button class="btn" type="button" @click="shareAgain">
              <AppIcon name="share" size="sm" />Share again
            </button>
            <button v-if="!passed" class="btn danger" type="button" @click="cancelMeetup">
              <AppIcon name="x" size="sm" />Cancel meetup
            </button>
          </template>
        </div>
      </template>
    </article>

    <p v-if="state === 'ok'" class="small muted foot">
      Made with Travels, a trip companion. Anyone with this link can see this meetup.
    </p>
  </div>
</template>

<style scoped>
.pub { max-width: 640px; padding-bottom: 48px; }
.pub-top { display: flex; align-items: center; padding: calc(4px + var(--safe-t)) 0 12px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 44px; min-height: 44px; text-decoration: none; color: var(--accent); }
.brand b { font-size: 19px; letter-spacing: .24em; text-transform: uppercase; }
.again { margin-top: 14px; }
.mu { padding: 18px 16px; display: flex; flex-direction: column; gap: 14px; }
.host { display: flex; align-items: center; gap: 12px; }
.host p { line-height: 1.4; }
.banner { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: var(--r-md); background: var(--surface-2); font-weight: 650; }
.banner.bad { background: var(--bad-soft); color: var(--bad); }
.ttl { font-size: clamp(24px, 6.5vw, 30px); font-weight: 700; line-height: 1.15; letter-spacing: -.01em; overflow-wrap: anywhere; }
.facts { display: flex; flex-direction: column; gap: 10px; }
.fact { display: flex; align-items: flex-start; gap: 10px; font-size: 15px; line-height: 1.45; }
.fact > .i { flex: none; margin-top: 3px; color: var(--accent); }
.where { align-items: center; flex-wrap: wrap; }
.where > .i { margin-top: 0; }
.where .grow { min-width: 0; overflow-wrap: anywhere; }
.note { font-size: 16px; line-height: 1.55; padding: 12px 14px; border-radius: var(--r-md); background: var(--surface-2); overflow-wrap: anywhere; }
.signin-line { display: flex; align-items: center; gap: 6px; }
.join { display: flex; flex-direction: column; align-items: stretch; gap: 10px; padding-top: 4px; }
.in { display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--ok); }
.acts { display: flex; flex-wrap: wrap; gap: 8px; }
.acts .btn { flex: 1 1 auto; }
.err { font-size: 13.5px; font-weight: 650; color: var(--bad); }
.foot { margin-top: 16px; text-align: center; }
</style>
