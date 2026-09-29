<script setup lang="ts">
import { liveGuide } from '#shared/utils/guide'
import { planDays, summarize } from '#shared/utils/plan'
import { fmtClock, tripMoment } from '#shared/utils/time'

const { sorted } = useTrips()
const store = useProgressStore()
const { now } = useClock()
const { choice } = useTheme()
const { $pwa } = useNuxtApp()
const notesStore = useNotes()
notesStore.load()
const latestNotes = computed(() => notesStore.notes.value.slice(0, 3))
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

useHead({ title: 'Travels' })
</script>

<template>
  <div class="page home">
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
        <NuxtLink to="/settings" class="btn icon plain round" aria-label="Settings and backups">
          <AppIcon name="sliders" />
        </NuxtLink>
      </div>
    </header>

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

    <section v-if="latestNotes.length">
      <div class="sec-h">
        <h2>Notes & chats</h2>
        <NuxtLink to="/notes" class="aside">
          All {{ notesStore.notes.value.length }}
        </NuxtLink>
      </div>
      <div class="notes">
        <NoteCard v-for="n in latestNotes" :key="n.slug" :note="n" :trip-title="tripTitle(n.trip)" />
      </div>
    </section>

    <div v-if="!cards.length" class="card empty">
      <AppIcon name="globe" />
      <h3>No trips yet</h3>
      <p>Plan one, or import a backup from another device.</p>
    </div>

    <div class="actions">
      <NuxtLink to="/trips/new" class="btn primary lg">
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
.home-top { display: flex; align-items: center; justify-content: space-between; padding: calc(4px + var(--safe-t)) 0 8px; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--accent); }
.brand b { font-size: 19px; letter-spacing: .24em; text-transform: uppercase; }
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
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 28px; }
@media (max-width: 480px) {
  .stats b { font-size: 18px; }
  .stats span { font-size: 10.5px; }
  .actions .btn { flex: 1 1 100%; }
}
</style>
