<script setup lang="ts">
import { liveGuide } from '#shared/utils/guide'
import { planDays, summarize } from '#shared/utils/plan'
import { fmtClock, tripMoment } from '#shared/utils/time'

const cloud = useCloud()
/** A device with no account and nobody signed in gets the landing page, and nothing from the device (D33, D38). */
const landing = computed(() => !cloud.account.value && !cloud.signedIn.value)
/** Who this device belongs to: the account signed in now, else the one it remembers (D34). */
const me = computed(() => cloud.user.value ?? cloud.account.value)
/** A remembered account whose session is gone: the app stays usable and asks to sign in again (D34). */
const signInAgain = computed(() => !!cloud.account.value && !cloud.signedIn.value && cloud.status.value === 'signed-out')
const busy = computed(() => cloud.status.value === 'signing-in' || cloud.status.value === 'starting')
// Firebase loads ahead of the tap, so a desktop sign-in window opens inside it (D31).
watch(signInAgain, (again) => {
  if (again) void cloud.prepare()
}, { immediate: true })

const trips = useTrips()
const { sorted } = trips
const store = useProgressStore()
const { now } = useClock()
const { choice } = useTheme()
const { $pwa } = useNuxtApp()
const syncDot = computed(() => ({ 'synced': 'ok', 'syncing': 'busy', 'offline': 'warn', 'error': 'bad', 'signed-out': 'warn' } as Record<string, string>)[cloud.status.value] ?? '')
const accountLabel = computed(() => {
  const s = ({ 'synced': 'synced', 'syncing': 'syncing', 'offline': 'offline', 'error': 'not syncing', 'starting': 'connecting', 'signed-out': 'signed out' } as Record<string, string>)[cloud.status.value]
  return s ? `Account: ${s}` : 'Account'
})
const notesStore = useNotes()
// The notes load for the signed-in home only (the landing page needs none of them), and list only those of the
// account's trips and of no trip (D43).
watch(landing, (l) => {
  if (!l) void notesStore.load()
}, { immediate: true })
const latestNotes = computed(() => notesStore.visible.value.slice(0, 3))
const tripTitle = (id?: string) => (id ? sorted.value.find(t => t.id === id)?.title : undefined)

const cards = computed(() => sorted.value.map((trip) => {
  const p = { ...emptyProgress(), ...store.value[trip.id] }
  const moment = tripMoment(trip, now.value)
  const plans = planDays(trip, p, moment)
  const summary = summarize(trip, p, moment, plans)
  let line = ''
  if (moment.phase === 'during' && moment.dayIndex >= 0) {
    const d = plans[moment.dayIndex]!
    const g = liveGuide(d.stops, d.states, moment.minutes, { home: trip.home })
    if (g.mode === 'at' && g.focus) line = `Now: ${g.focus.title}`
    else if (g.focus) line = `Next at ${fmtClock(g.focus.start)}: ${g.focus.title}`
    else line = 'Nothing left today'
  }
  return { trip, moment, summary, line }
}))
const live = computed(() => cards.value.filter(c => c.moment.phase === 'during'))
const upcoming = computed(() => cards.value.filter(c => c.moment.phase === 'before'))
const past = computed(() => cards.value.filter(c => c.moment.phase === 'after').reverse())

const totals = computed(() => {
  let days = 0
  let done = 0
  let photos = 0
  let rated = 0
  let ratingSum = 0
  for (const c of cards.value) {
    days += c.trip.days.length
    done += c.summary.all.done
    photos += c.summary.photos
    rated += c.summary.rated
    ratingSum += c.summary.avgRating * c.summary.rated
  }
  return { trips: cards.value.length, days, done, photos, avg: rated ? ratingSum / rated : 0 }
})

const minutesNow = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
const headline = computed(() => {
  if (live.value[0]) return `You're in ${live.value[0].trip.destination}`
  const u = upcoming.value[0]
  if (u) return u.moment.daysToStart <= 1 ? `${u.trip.destination} ${u.moment.daysToStart === 1 ? 'tomorrow' : 'today'}` : `${u.trip.destination} in ${u.moment.daysToStart} days`
  return 'Where next?'
})
const themeIcon = computed(() => (choice.value === 'dark' ? 'moon' : choice.value === 'light' ? 'sun' : 'sunset'))
function cycleTheme() {
  choice.value = choice.value === 'auto' ? 'light' : choice.value === 'light' ? 'dark' : 'auto'
  toast(`Theme: ${choice.value === 'auto' ? 'follow the phone' : choice.value}`)
}

/**
 * Adds a copy of the sample trip (it keeps receiving updates to the plan) and opens it on Now (D37): on its own dates,
 * live; otherwise as a preview of its second day at 16:40, the moment the landing page shows, so the live guide is
 * what you see first (a countdown before the trip, a finished trip after it).
 */
async function trySample() {
  const t = trips.addSample()
  if (!t) {
    toast('The sample trip isn’t available right now', { tone: 'warn' })
    return
  }
  const day = t.days[1] ?? t.days[0]
  const live = tripMoment(t, now.value).phase === 'during'
  await navigateTo({ path: `/trips/${t.id}/now`, query: !live && day ? { at: `${day.date}T16:40` } : undefined })
}

useHead({ title: 'Travels' })
</script>

<template>
  <LandingPage v-if="landing" />
  <div v-else class="page home">
    <header class="home-top">
      <NuxtLink to="/" class="brand" aria-label="Travels home">
        <AppLogo :size="30" />
        <b class="display">Travels</b>
      </NuxtLink>
      <div class="row">
        <NuxtLink to="/notes" class="btn icon plain round" aria-label="Notes and chats">
          <AppIcon name="book" />
        </NuxtLink>
        <button class="btn icon plain round" type="button" :aria-label="`Theme: ${choice}`" @click="cycleTheme">
          <AppIcon :name="themeIcon" />
        </button>
        <NuxtLink v-if="me" to="/settings#account" class="btn icon plain round acct" :aria-label="accountLabel">
          <img v-if="me.photo" :src="me.photo" alt="" referrerpolicy="no-referrer">
          <AppIcon v-else name="person" />
          <i v-if="syncDot" class="dot" :class="syncDot" />
        </NuxtLink>
        <NuxtLink to="/settings" class="btn icon plain round" aria-label="Settings and backups">
          <AppIcon name="sliders" />
        </NuxtLink>
      </div>
    </header>

    <section v-if="signInAgain" class="card pad again" aria-labelledby="again-t">
      <AppIcon name="cloudoff" class="again-i" />
      <div class="stack tight grow1">
        <p id="again-t" class="strong">
          Sign in again to keep saving to your account.
        </p>
        <p class="small muted again-who">
          Your changes stay on this device until then.<template v-if="me?.email">
            Account: <b>{{ me.email }}</b>
          </template>
        </p>
        <div>
          <button class="btn primary sm" type="button" :disabled="busy" @click="cloud.signIn()">
            <AppIcon name="person" size="sm" />{{ busy ? 'Signing in…' : 'Sign in with Google' }}
          </button>
        </div>
        <p class="msg small" role="status">{{ cloud.message.value }}</p>
      </div>
    </section>

    <div class="hello">
      <p class="kicker">
        {{ greeting(minutesNow) }}
      </p>
      <h1 class="h1">
        {{ headline }}
      </h1>
    </div>

    <NuxtLink v-for="c in live" :key="c.trip.id" :to="`/trips/${c.trip.id}/now`" class="livecard card card-link art-frame">
      <SceneArt class="scene" :scene="c.trip.cover.scene" :tod="todFor(c.moment.minutes)" :lazy="false" />
      <div class="scrim" />
      <div class="live-in on-art">
        <span class="chip on-art"><span class="live-dot" />Live · Day {{ c.moment.dayIndex + 1 }} of {{ c.trip.days.length }}</span>
        <b class="lname display">{{ c.trip.title }}</b>
        <span v-if="c.line" class="lline">{{ c.line }}</span>
        <span class="btn gold sm go">Open the live guide<AppIcon name="arrow" size="sm" /></span>
      </div>
    </NuxtLink>

    <div v-if="totals.trips" class="stats card">
      <div><b class="num">{{ totals.trips }}</b><span>{{ totals.trips === 1 ? 'trip' : 'trips' }}</span></div>
      <div><b class="num">{{ totals.days }}</b><span>days</span></div>
      <div><b class="num">{{ totals.done }}</b><span>stops done</span></div>
      <div><b class="num">{{ totals.avg ? totals.avg.toFixed(1) : '–' }}</b><span>avg rating</span></div>
      <div><b class="num">{{ totals.photos }}</b><span>photos</span></div>
    </div>

    <section v-if="upcoming.length">
      <div class="sec-h">
        <h2>Upcoming</h2>
        <span class="aside">{{ upcoming.length }}</span>
      </div>
      <div class="grid">
        <TripCard v-for="c in upcoming" :key="c.trip.id" :trip="c.trip" :summary="c.summary" :moment="c.moment" />
      </div>
    </section>

    <section v-if="live.length">
      <div class="sec-h">
        <h2>On now</h2>
      </div>
      <div class="grid">
        <TripCard v-for="c in live" :key="c.trip.id" :trip="c.trip" :summary="c.summary" :moment="c.moment" />
      </div>
    </section>

    <section v-if="past.length">
      <div class="sec-h">
        <h2>Past trips</h2>
        <span class="aside">{{ past.length }}</span>
      </div>
      <div class="grid">
        <TripCard v-for="c in past" :key="c.trip.id" :trip="c.trip" :summary="c.summary" :moment="c.moment" />
      </div>
    </section>

    <section v-if="!cards.length" class="card firsttrip" aria-labelledby="first-t">
      <div class="ft-art art-frame">
        <SceneArt class="scene" scene="plane" tod="golden" label="A plane at golden hour" :lazy="false" />
      </div>
      <div class="ft-body">
        <h2 id="first-t" class="h3">
          No trips yet
        </h2>
        <p class="muted">
          Plan your own, or look around the sample trip to Rome first.
        </p>
        <div class="ft-acts">
          <NuxtLink to="/trips/new" class="btn primary">
            <AppIcon name="plus" />Plan a trip
          </NuxtLink>
          <button class="btn ghost" type="button" @click="trySample">
            <AppIcon name="sparkle" />Try the sample trip
          </button>
        </div>
      </div>
    </section>

    <section v-if="latestNotes.length">
      <div class="sec-h">
        <h2>Notes & chats</h2>
        <NuxtLink to="/notes" class="aside">
          All {{ notesStore.visible.value.length }}
        </NuxtLink>
      </div>
      <div class="notes">
        <NoteCard v-for="n in latestNotes" :key="n.slug" :note="n" :trip-title="tripTitle(n.trip)" />
      </div>
    </section>

    <div class="actions">
      <NuxtLink v-if="cards.length" to="/trips/new" class="btn primary lg">
        <AppIcon name="plus" />New trip
      </NuxtLink>
      <NuxtLink to="/settings" class="btn ghost lg">
        <AppIcon name="upload" />Import or back up
      </NuxtLink>
      <button v-if="$pwa?.showInstallPrompt && !$pwa?.isPWAInstalled" class="btn gold lg" type="button" @click="$pwa?.install()">
        <AppIcon name="download" />Install the app
      </button>
    </div>
  </div>
</template>

<style scoped>
.home { padding-bottom: 48px; }
.acct { position: relative; }
.acct img { width: 28px; height: 28px; border-radius: 999px; object-fit: cover; }
.acct .dot { position: absolute; right: 7px; bottom: 7px; width: 10px; height: 10px; border-radius: 999px; border: 2px solid var(--bg); background: var(--fg-3); }
.acct .dot.ok { background: var(--ok); }
.acct .dot.warn { background: var(--warn); }
.acct .dot.bad { background: var(--bad); }
.acct .dot.busy { background: var(--gold); }
.again { display: flex; gap: 12px; align-items: flex-start; margin: 8px 0 4px; border-color: color-mix(in srgb, var(--warn) 40%, var(--line)); }
.again-i { color: var(--warn); flex: none; margin-top: 2px; }
.again-who b { overflow-wrap: anywhere; }
.msg { padding: 8px 10px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); font-weight: 600; }
.msg:empty { display: none; }
.grow1 { flex: 1; min-width: 0; }
/* Four buttons on every signed-in phone: they keep 44 px, the logo stays whole, and the word gives way first. */
.home-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: calc(4px + var(--safe-t)) 0 8px; }
.home-top .row { flex: none; gap: 4px; }
.home-top .row > * { flex: none; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 44px; min-height: 44px; text-decoration: none; color: var(--accent); }
.brand :deep(.logo) { flex: none; }
.brand b { font-size: 19px; letter-spacing: .24em; text-transform: uppercase; }
@media (max-width: 389px) { .brand b { letter-spacing: .14em; } }
@media (max-width: 374px) { .brand b { display: none; } }
.hello { margin: 18px 0 16px; }
.hello .h1 { margin-top: 4px; }
.livecard { display: flex; align-items: flex-end; min-height: 260px; overflow: hidden; margin-bottom: 16px; }
.live-in { padding: 18px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.lname { font-size: clamp(34px, 9vw, 56px); letter-spacing: .16em; text-transform: uppercase; line-height: 1; text-shadow: 0 2px 20px rgba(0, 0, 0, .4); }
.lline { font-size: 15.5px; font-weight: 600; }
.go { margin-top: 6px; }
.stats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); padding: 14px 4px; text-align: center; margin-bottom: 8px; }
.stats div { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 0 4px; }
.stats div + div { border-left: 1px solid var(--line); }
.stats b { font-size: 21px; font-weight: 600; }
.stats span { font-size: 11.5px; color: var(--fg-3); font-weight: 600; line-height: 1.2; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
.notes { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
@media (max-width: 480px) { .notes { grid-template-columns: minmax(0, 1fr); } }
.firsttrip { overflow: hidden; display: flex; flex-direction: column; margin-bottom: 8px; }
.ft-art { height: 150px; }
.ft-body { padding: 16px; display: flex; flex-direction: column; gap: 6px; }
.ft-acts { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
.ft-acts .btn { flex: 1 1 auto; }
@media (min-width: 720px) {
  .firsttrip { flex-direction: row; }
  .ft-art { width: 42%; height: auto; min-height: 210px; flex: none; }
  .ft-body { justify-content: center; padding: 24px; }
  .ft-acts .btn { flex: 0 1 auto; }
}
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
@media (max-width: 480px) {
  .stats b { font-size: 18px; }
  .stats span { font-size: 10.5px; }
  .actions .btn { flex: 1 1 100%; }
}
</style>
