<script setup lang="ts">
import type { FriendCard, Meetup } from '#shared/types/social'
import type { MeetIdea, MetPerson } from '#shared/types/trip'
import { socialFriendsThere, socialMeetupPassed, socialMeetupWhen } from '#shared/utils/social'
import { addDays, fmtClock, fmtDate, zoned } from '#shared/utils/time'
import { meetIdeasFor } from '~/components/MeetIdea.vue'

/**
 * Meet people (spec 5.9 and 13; lights More): tonight's options (during the trip), Say hi (lines to start a chat and
 * today's goal), the people you met, your meetups for this trip, friends in the same place on your dates, and ways to
 * meet people. Meetups and friends need the social layer; the rest works offline.
 */
const v = useTripView()
const trip = v.trip
const route = useRoute()
const router = useRouter()
const social = useSocial()
const tg = useTripGroup()
const clock = useClock()
/** Bumped by the meetup sheet when a meetup of yours is made or changed. */
const changed = useState('meet:changed', () => 0)

const open = (q: Record<string, string>) => void router.push({ query: { ...route.query, ...q } })

/** "9 to 12 Oct", or "28 Sep to 3 Oct" across two months. */
function rangeWords(a: string, b: string): string {
  if (!b || a === b) return fmtDate(a, 'dayMonth')
  if (a.slice(0, 7) === b.slice(0, 7)) return `${Number(a.slice(8, 10))} to ${fmtDate(b, 'dayMonth')}`
  return `${fmtDate(a, 'dayMonth')} to ${fmtDate(b, 'dayMonth')}`
}

// ---------- 1. tonight (during the trip) ----------
const today = v.today
const tonightCard = computed(() => {
  const id = today.value?.view.day.id
  return id ? trip.value?.nightCards?.find(n => n.dayId === id) : undefined
})
const ideas = computed<MeetIdea[]>(() => (trip.value ? meetIdeasFor(trip.value) : []))
const tonightIdeas = computed(() => {
  const id = today.value?.view.day.id
  return id ? ideas.value.filter(i => i.dayId === id) : []
})
const nightStops = computed(() => (today.value?.stops ?? []).filter(s => s.kind === 'night' && !s.minor))
/** Who's in for a stop of a group trip, as faces. */
const goingIn = (stopId: string) => tg.goingFor(stopId).in.map(uid => tg.member(uid))
/** A meetup for tonight starts from the next night stop not done or skipped, else the first; or from nothing. */
function askTonight() {
  const states = today.value?.states ?? {}
  const s = nightStops.value.find(x => !['done', 'skipped', 'missed'].includes(states[x.id] ?? 'upcoming')) ?? nightStops.value[0]
  open(s ? { meetup: 'new', stop: s.id } : { meetup: 'new' })
}

// ---------- 2. your meetups for this trip ----------
const mine = ref<Meetup[]>([])
const mineState = ref<'loading' | 'ok' | 'error'>('loading')
let reading = 0
async function loadMine() {
  const t = trip.value
  if (!t || !social.ready.value) return
  const turn = ++reading
  try {
    const all = await social.api().myMeetups()
    if (turn !== reading) return
    // After midnight on the last night is the day after the trip's end.
    const last = addDays(t.end, 1)
    mine.value = all
      .filter((m) => {
        const d = socialMeetupWhen(m).date
        return m.tripTitle === t.title && d >= t.start && d <= last
      })
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
    mineState.value = 'ok'
  }
  catch {
    if (turn === reading) mineState.value = 'error'
  }
}
watch([() => social.ready.value, changed, () => trip.value?.id], () => void loadMine(), { immediate: true })
const passed = (m: Meetup) => socialMeetupPassed(m, clock.real.value.getTime())
const whenOf = (m: Meetup) => socialMeetupWhen(m)

// ---------- 3. friends here ----------
// Friends' cards are read once the friends are known (and again after ten minutes).
watch([() => social.ready.value, () => social.friendIds.value.join(',')], ([ready]) => {
  if (ready) void social.loadCards()
}, { immediate: true })
const friendsHere = computed(() => {
  const t = trip.value
  if (!t) return []
  const ids = social.friendIds.value
  const cards = Object.values(social.cards.value).filter((c): c is FriendCard => !!c && ids.includes(c.uid))
  return socialFriendsThere(cards, t).map(f => ({ ...f, person: social.personRef(f.uid) }))
})
const members = computed(() => tg.members.value.filter(m => m.uid !== social.me.value?.uid))
const memberNames = computed(() => members.value.map(m => m.name.split(/\s+/)[0]).join(', '))

// ---------- 4. ways to meet people ----------
const ways = computed(() => ideas.value.filter(i => !tonightIdeas.value.includes(i)))
const dayOf = (id?: string) => (id ? trip.value?.days.find(d => d.id === id) : undefined)

// ---------- 5. people you met ----------
const people = computed<MetPerson[]>(() => Object.values(v.progress.value.people ?? {})
  .filter(p => !p.deleted)
  .sort((a, b) => b.at.localeCompare(a.at)))
function personLine(p: MetPerson): string {
  const day = dayOf(p.dayId)
  const date = day?.date ?? (trip.value && p.at ? zoned(new Date(p.at), trip.value.timezone).date : '')
  return [p.where, date ? fmtDate(date, 'short') : ''].filter(Boolean).join(' · ')
}

// ---------- on this page ----------
const jumps = computed(() => [
  ...(today.value ? [{ id: 'meet-tonight', label: 'Tonight' }] : []),
  { id: 'meet-talk', label: 'Say hi' },
  { id: 'meet-people', label: 'People you met' },
  { id: 'meet-mine', label: 'Meetups' },
  { id: 'meet-friends', label: 'Friends here' },
  { id: 'meet-ways', label: 'Ideas' },
])
/**
 * Scrolls to a section (its heading clears the trip's header: html's scroll-padding-top) and moves focus to its
 * heading, so a keyboard or a screen reader carries on from there.
 */
function jump(id: string) {
  const heading = document.getElementById(id)
  const el = heading?.closest('section')
  if (!heading || !el) return
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' })
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
  heading.focus({ preventScroll: true })
}

useHead({ title: computed(() => (trip.value ? `Meet people · ${trip.value.title} · Travels` : 'Meet people · Travels')) })
</script>

<template>
  <div v-if="trip" class="page meet">
    <p class="kicker">
      Together
    </p>
    <h1 class="h2">
      Meet people
    </h1>
    <p class="muted intro">
      What's on tonight, lines to say hi, open invites you can send to any chat, and the people you meet.
    </p>
    <MeetState class="state" what="meetups and friends" />
    <nav class="jump" aria-label="On this page">
      <button v-for="j in jumps" :key="j.id" type="button" class="chip" :data-jump="j.id" @click="jump(j.id)">
        {{ j.label }}
      </button>
    </nav>

    <!-- 1. Tonight -->
    <section v-if="today" class="sec" aria-labelledby="meet-tonight">
      <div class="sec-h">
        <h2 id="meet-tonight">
          Tonight
        </h2>
        <span class="aside">{{ fmtDate(today.view.day.date, 'short') }}</span>
      </div>
      <div class="stack">
        <div v-if="tonightCard" class="night card art-frame">
          <SceneArt class="scene" :scene="tonightCard.scene" tod="night" :label="tonightCard.title" />
          <div class="scrim" />
          <div class="night-in on-art">
            <p class="nk">
              {{ tonightCard.num }} · {{ tonightCard.day }}
            </p>
            <h3 class="nt">
              {{ tonightCard.title }}
            </h3>
            <p class="nx">
              {{ tonightCard.text }}
            </p>
          </div>
        </div>
        <div v-if="nightStops.length" class="card rows">
          <button v-for="s in nightStops" :key="s.id" class="row-item nrow" type="button" :data-stop="s.id" @click="open({ stop: s.id })">
            <span class="num small tm">{{ fmtClock(s.start) }}</span>
            <span class="grow ntx">
              <b>{{ s.title }}</b>
              <span v-if="s.base.options" class="small muted">{{ s.base.title }}</span>
              <span v-if="tg.isGroup.value" class="who small muted">
                <AvatarStack v-if="goingIn(s.id).length" :people="goingIn(s.id)" :size="22" label="In" />
                {{ goingIn(s.id).length ? `${goingIn(s.id).length} in` : 'Nobody in yet' }}
              </span>
            </span>
            <AppIcon name="chevr" class="chev" />
          </button>
        </div>
        <MeetIdea v-for="i in tonightIdeas" :key="i.id" :idea="i" />
        <p v-if="!tonightCard && !nightStops.length && !tonightIdeas.length" class="small muted">
          Nothing planned for tonight. Ask who's in, and send the link to the people you've met.
        </p>
        <div>
          <button class="btn primary" type="button" @click="askTonight">
            <AppIcon name="hand" size="sm" />Ask who's in
          </button>
        </div>
      </div>
    </section>

    <!-- 2. Say hi: lines, today's goal and your friend link -->
    <MeetTalk />

    <!-- 3. People you met -->
    <section class="sec" aria-labelledby="meet-people">
      <div class="sec-h">
        <h2 id="meet-people">
          People you met
        </h2>
        <button class="btn sm ghost" type="button" @click="open({ met: 'new' })">
          <AppIcon name="userplus" size="sm" />Add someone
        </button>
      </div>
      <div v-if="people.length" class="card rows">
        <button v-for="p in people" :key="p.id" class="row-item prow" type="button" :data-met="p.id" @click="open({ met: p.id })">
          <Avatar :person="{ uid: p.id, name: p.name }" :size="40" />
          <span class="grow ptx">
            <b>{{ p.name }}</b>
            <span v-if="p.handle" class="small muted">{{ p.handle }}</span>
            <span v-if="personLine(p)" class="small muted">{{ personLine(p) }}</span>
          </span>
          <AppIcon name="chevr" class="chev" />
        </button>
      </div>
      <p v-else class="small muted">
        Keep the names and handles of people you meet, and send them your friend link. Only you see this list.
      </p>
    </section>

    <!-- 4. Your meetups -->
    <section class="sec" aria-labelledby="meet-mine">
      <div class="sec-h">
        <h2 id="meet-mine">
          Your meetups
        </h2>
        <button class="btn sm ghost" type="button" @click="open({ meetup: 'new' })">
          <AppIcon name="plus" size="sm" />New meetup
        </button>
      </div>
      <template v-if="social.ready.value">
        <p v-if="mineState === 'error'" class="small muted">
          Couldn't load your meetups right now.
        </p>
        <div v-else-if="mine.length" class="card rows">
          <button v-for="m in mine" :key="m.id" class="row-item mrow" type="button" :data-meetup="m.id" @click="open({ meetup: m.id })">
            <span class="date" aria-hidden="true">
              <b class="num">{{ Number(whenOf(m).date.slice(8, 10)) }}</b>
              <span>{{ fmtDate(whenOf(m).date, 'weekday') }}</span>
            </span>
            <span class="grow mtx">
              <b>{{ m.title }}</b>
              <span class="small muted tnum">{{ whenOf(m).label }}<template v-if="m.place"> · {{ m.place.name }}</template></span>
              <span v-if="m.cancelled" class="chip t-bad">Cancelled</span>
              <span v-else-if="passed(m)" class="chip t-closed">Passed</span>
              <MeetGoing v-else :id="m.id" variant="faces" />
            </span>
            <AppIcon name="chevr" class="chev" />
          </button>
        </div>
        <p v-else-if="mineState === 'ok'" class="small muted">
          No meetups yet. Ask who's in for a stop, a night out or anything else, and send the link to any chat.
        </p>
      </template>
      <p v-else class="small muted">
        Your meetups show here when you're signed in and online.
      </p>
    </section>

    <!-- 5. Friends here -->
    <section class="sec" aria-labelledby="meet-friends">
      <div class="sec-h">
        <h2 id="meet-friends">
          Friends in {{ trip.destination }}
        </h2>
      </div>
      <div v-if="friendsHere.length || members.length" class="card rows">
        <div v-for="f in friendsHere" :key="f.uid" class="row-item frow" :data-friend="f.uid">
          <Avatar :person="f.person" :size="40" />
          <span class="grow ftx">
            <b>{{ f.person.name }}</b>
            <span class="small muted">In {{ f.trip.destination }} {{ rangeWords(f.trip.start, f.trip.end) }}</span>
          </span>
          <button class="btn sm" type="button" @click="open({ meetup: 'new', hi: f.uid })">
            <AppIcon name="hand" size="sm" />Say hi
          </button>
        </div>
        <div v-if="members.length" class="row-item frow">
          <AvatarStack :people="members" :size="32" :max="3" label="In this trip" />
          <span class="grow ftx">
            <b>In this trip with you</b>
            <span class="small muted">{{ memberNames }}</span>
          </span>
          <NuxtLink class="btn sm" :to="`/trips/${trip.id}/group`">
            <AppIcon name="chat" size="sm" />Say hi
          </NuxtLink>
        </div>
      </div>
      <template v-else-if="social.ready.value">
        <p class="small muted">
          No friends in {{ trip.destination }} on your dates yet. Friends show up here when they let friends see where they're going.
        </p>
        <div>
          <NuxtLink class="btn sm ghost" to="/friends?tab=friends">
            <AppIcon name="userplus" size="sm" />Add friends
          </NuxtLink>
        </div>
      </template>
      <p v-else class="small muted">
        Friends on your dates show here when you're signed in and online.
      </p>
    </section>

    <!-- 6. Ways to meet people -->
    <section class="sec" aria-labelledby="meet-ways">
      <div class="sec-h">
        <h2 id="meet-ways">
          Ways to meet people
        </h2>
        <span v-if="!trip.meet?.length" class="aside">For any city</span>
      </div>
      <div class="ideas">
        <MeetIdea v-for="i in ways" :key="i.id" :idea="i" :day="!i.when && dayOf(i.dayId) ? fmtDate(dayOf(i.dayId)!.date, 'short') : undefined" />
      </div>
    </section>

  </div>
</template>

<style scoped>
.meet { padding-top: 18px; max-width: 860px; }
.intro { margin-top: 6px; font-size: 15px; line-height: 1.5; }
.state { margin-top: 14px; }
.jump { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.jump .chip { min-height: 32px; padding: 4px 12px; font-size: 13.5px; color: var(--fg); }
/* A heading the row moved focus to: no ring for a tap, the usual one for a keyboard. */
.meet :deep(h2[tabindex="-1"]:focus:not(:focus-visible)) { outline: none; }
.sec .sec-h { align-items: center; }
.sec .sec-h .btn { flex: none; }
.stack { gap: 12px; }
.rows { overflow: hidden; }
/* The card clips its corners, so the focus ring goes inside the row. */
.nrow:focus-visible, .mrow:focus-visible, .prow:focus-visible { outline-offset: -3px; }

/* tonight */
.night { min-height: 250px; display: flex; align-items: flex-end; overflow: hidden; }
/* The words sit on the full scrim sooner than on other pictures (three lines over a busy bar scene). */
.night .scrim { background: linear-gradient(180deg, transparent 10%, color-mix(in srgb, var(--art-scrim) 85%, transparent) 42%, var(--art-scrim) 70%); }
.night-in { padding: 18px; display: flex; flex-direction: column; gap: 6px; }
.nk { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--on-art-2); }
.nt { font-size: 22px; font-weight: 700; line-height: 1.2; text-shadow: 0 1px 12px var(--art-scrim); }
.nx { font-size: 15px; line-height: 1.45; color: var(--on-art-2); }
.nrow { color: var(--fg); }
.tm { width: 48px; flex: none; align-self: flex-start; padding-top: 2px; color: var(--fg-2); }
.ntx, .mtx, .ftx, .ptx { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; line-height: 1.35; }
.ntx b, .mtx b, .ftx b, .ptx b { font-weight: 650; overflow-wrap: anywhere; }
.who { display: inline-flex; align-items: center; gap: 6px; }
.chev { flex: none; color: var(--fg-3); }

/* your meetups */
.mrow { align-items: flex-start; color: var(--fg); }
.date { flex: none; width: 46px; display: flex; flex-direction: column; align-items: center; padding: 6px 0; border-radius: 12px; background: var(--accent-soft); color: var(--accent); line-height: 1.1; }
.date b { font-size: 19px; }
.date span { font-size: 11.5px; font-weight: 650; text-transform: uppercase; letter-spacing: .06em; }
.mtx .chip { margin-top: 3px; }
.mrow .chev { align-self: center; }

/* friends here */
.frow { color: var(--fg); }

/* ways */
.ideas { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
@media (min-width: 720px) { .ideas { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; } }

/* people you met */
.prow { color: var(--fg); }
</style>
