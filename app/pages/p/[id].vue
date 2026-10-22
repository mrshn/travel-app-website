<script setup lang="ts">
import type { Share } from '#shared/types/social'
import type { Trip } from '#shared/types/trip'
import { dayViews, resolveStops, slugify } from '#shared/utils/plan'
import { socialCopyTrip, socialTokenValid } from '#shared/utils/social'
import { addDays, dateMs, diffDays, fmtClock, fmtDate, fmtRange } from '#shared/utils/time'
import { meetErrorLine } from '~/components/MeetState.vue'

/**
 * A plan link (spec 5.11 and T9): a read-only copy of someone's plan that anyone with the link can open, signed out
 * too (it never shows the device's trips). Signed in, you copy it to your own trips on your own dates.
 */
const route = useRoute()
const social = useSocial()
const cloud = useCloud()
const clock = useClock()

const id = computed(() => String(route.params.id ?? ''))
const share = ref<Share | null>(null)
const state = ref<'loading' | 'ok' | 'missing' | 'removed' | 'error'>('loading')
let turn = 0

async function load() {
  const my = ++turn
  share.value = null
  state.value = 'loading'
  if (!socialTokenValid(id.value)) {
    state.value = 'missing'
    return
  }
  try {
    const s = await (await social.publicApi()).getShare(id.value)
    if (my !== turn) return
    share.value = s
    state.value = !s ? 'missing' : s.revoked ? 'removed' : 'ok'
  }
  catch {
    if (my === turn) state.value = 'error'
  }
}
onMounted(load)
watch(id, load)

/** The plan in the link (nothing personal in it: socialShareTrip). */
const plan = computed<Trip | null>(() => {
  const s = share.value
  if (!s?.json || s.revoked) return null
  try {
    const t = JSON.parse(s.json) as Trip
    return t && Array.isArray(t.days) && typeof t.start === 'string' ? t : null
  }
  catch {
    return null
  }
})
watch([share, plan], ([s, p]) => {
  if (s && !s.revoked && !p && state.value === 'ok') state.value = 'error'
})

/** Each day's stops as the plan's owner shows them by default: the default version of the day, options as their default choice. */
const days = computed(() => {
  const t = plan.value
  if (!t) return []
  return dayViews(t, null).map((view) => {
    const stops = resolveStops(view.stops, {}, view.day.id)
    const main = stops.filter(s => !s.minor)
    return { id: view.day.id, date: view.day.date, label: view.day.label, title: view.title, stops: main, minor: stops.length - main.length }
  })
})
const stopCount = computed(() => days.value.reduce((n, d) => n + d.stops.length, 0))
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// ---------- copying it ----------
/** A device with an account (signed in, or remembered) can copy; with none, only sign in. */
const hasAccount = computed(() => !!cloud.account.value || cloud.signedIn.value)
const signingIn = computed(() => cloud.status.value === 'signing-in' || cloud.status.value === 'starting')
watch(() => !hasAccount.value, (show) => {
  if (show) void cloud.prepare()
}, { immediate: true })

/** Today on this phone (YYYY-MM-DD). */
const todayIso = computed(() => {
  const d = clock.real.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})
/** The same dates when they're still ahead, else the next date on the same weekday as the plan's first day. */
function defaultStart(planStart: string, today: string): string {
  if (planStart > today) return planStart
  const want = new Date(dateMs(planStart)).getUTCDay()
  let d = addDays(today, 1)
  while (new Date(dateMs(d)).getUTCDay() !== want) d = addDays(d, 1)
  return d
}
const start = ref('')
watch(plan, (t) => {
  if (t) start.value = defaultStart(t.start, todayIso.value)
}, { immediate: true })
const validStart = computed(() => /^\d{4}-\d{2}-\d{2}$/.test(start.value))
const newEnd = computed(() => (plan.value && validStart.value ? addDays(start.value, diffDays(plan.value.start, plan.value.end)) : ''))
const copying = ref(false)

async function copyToMine() {
  const t = plan.value
  const s = share.value
  if (!t || !s || !validStart.value || copying.value) return
  copying.value = true
  try {
    const trips = useTrips()
    const base = `${slugify(t.destination || t.title)}-${start.value.slice(0, 7)}`
    const copy = socialCopyTrip(t, { id: base, now: new Date().toISOString(), start: start.value, from: { share: s.id, ownerName: s.ownerName, title: s.title } })
    const saved = trips.addTrip(copy)
    toast(`${saved.title} is in your trips: ${fmtRange(saved.start, saved.end)}`, { tone: 'ok' })
    await navigateTo(`/trips/${saved.id}/plan`)
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t copy the plan.'), { tone: 'warn' })
  }
  finally {
    copying.value = false
  }
}

// ---------- your own link ----------
const isOwner = computed(() => !!share.value && share.value.owner === social.me.value?.uid)
async function removeLink() {
  const s = share.value
  if (!s || !confirm('Remove this link? It stops working for everyone who has it.')) return
  try {
    await social.api().revokeShare(s.id)
    toast('Link removed', { tone: 'ok' })
    await load()
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t remove the link.'), { tone: 'warn' })
  }
}

useHead({ title: computed(() => (state.value === 'ok' && share.value ? `${share.value.title} · Travels` : 'A shared plan · Travels')) })
</script>

<template>
  <div class="page pub plan">
    <header class="pub-top">
      <NuxtLink to="/" class="brand" aria-label="Travels home">
        <AppLogo :size="30" />
        <b class="display">Travels</b>
      </NuxtLink>
    </header>

    <div v-if="state === 'loading'" class="card pad center muted" role="status">
      Opening the plan…
    </div>
    <div v-else-if="state === 'removed'" class="card empty">
      <AppIcon name="link" />
      <h1 class="h3">
        This plan link was removed.
      </h1>
      <p>Whoever shared it took it down. Ask them for a new one.</p>
    </div>
    <div v-else-if="state === 'missing'" class="card empty">
      <AppIcon name="link" />
      <h1 class="h3">
        This plan link doesn't work
      </h1>
      <p>Check that you have the whole link, or ask for a new one.</p>
    </div>
    <div v-else-if="state === 'error'" class="card empty">
      <AppIcon name="cloudoff" />
      <h1 class="h3">
        Couldn't open this plan
      </h1>
      <p>Check your connection and try again.</p>
      <p class="again">
        <button class="btn primary" type="button" @click="load">
          <AppIcon name="refresh" size="sm" />Try again
        </button>
      </p>
    </div>

    <template v-else-if="share && plan">
      <section class="cover card art-frame" aria-labelledby="plan-title">
        <SceneArt class="scene" :scene="share.cover?.scene ?? plan.cover.scene" :tod="share.cover?.tod ?? plan.cover.tod" :label="share.title" :lazy="false" />
        <div class="scrim" />
        <div class="cover-in on-art">
          <p class="ck">
            {{ fmtRange(plan.start, plan.end) }}
          </p>
          <h1 id="plan-title" class="ct display">
            {{ share.title }}
          </h1>
          <p class="by">
            <Avatar :person="{ uid: share.owner, name: share.ownerName, photo: share.ownerPhoto }" :size="28" />
            <span>Shared by {{ isOwner ? 'you' : share.ownerName }}</span>
          </p>
        </div>
      </section>

      <div class="counts row wrap">
        <span class="chip"><AppIcon name="calendar" />{{ plural(plan.days.length, 'day', 'days') }}</span>
        <span class="chip"><AppIcon name="pin" />{{ plural(stopCount, 'stop', 'stops') }}</span>
        <span class="chip"><AppIcon name="ticket" />{{ plural(plan.bookings?.length ?? 0, 'booking', 'bookings') }}</span>
        <span class="chip"><AppIcon name="bag" />{{ plural(plan.packing?.length ?? 0, 'packing item', 'packing items') }}</span>
      </div>

      <section class="copy card pad" aria-labelledby="copy-h">
        <h2 id="copy-h" class="h3">
          Make it your trip
        </h2>
        <template v-if="hasAccount">
          <p class="small muted">
            A copy goes into your trips on the dates you pick: every stop, booking and packing item, ready to change. Nothing you do shows to {{ isOwner ? 'anyone' : share.ownerName }}.
          </p>
          <label class="field">
            <span>Start on</span>
            <input v-model="start" class="input" type="date" :min="todayIso" required>
          </label>
          <p v-if="newEnd" class="small tnum dates">
            {{ fmtDate(start, 'short') }} to {{ fmtDate(newEnd, 'short') }}
          </p>
          <button class="btn primary lg" type="button" :disabled="!validStart || copying" @click="copyToMine">
            <AppIcon name="plus" size="sm" />Copy to my trips
          </button>
        </template>
        <template v-else>
          <p class="small muted">
            Sign in to copy this plan to your own trips, on your own dates. It's free, with your Google account.
          </p>
          <button class="btn primary lg" type="button" :disabled="signingIn" @click="cloud.signIn()">
            <AppIcon name="person" size="sm" />{{ signingIn ? 'Signing in…' : 'Sign in with Google to copy this plan' }}
          </button>
        </template>
      </section>

      <section class="days" aria-label="The plan, day by day">
        <article v-for="d in days" :key="d.id" class="day card">
          <header class="dh">
            <p class="kicker">
              {{ fmtDate(d.date, 'short') }} · {{ d.label }}
            </p>
            <h2 v-if="d.title" class="h3">
              {{ d.title }}
            </h2>
          </header>
          <ol class="stops">
            <li v-for="s in d.stops" :key="s.id" class="st">
              <span class="num small tm">{{ fmtClock(s.start) }}</span>
              <span class="ki" :style="{ color: KIND_META[s.kind]?.color }" aria-hidden="true"><AppIcon :name="stopIcon(s)" size="sm" /></span>
              <span class="grow sn">{{ s.title }}<span class="sr-only"> ({{ KIND_META[s.kind]?.label }})</span></span>
            </li>
          </ol>
          <p v-if="d.minor" class="small muted more">
            + {{ plural(d.minor, 'small step', 'small steps') }} on the way
          </p>
        </article>
      </section>

      <section v-if="isOwner" class="mine card pad">
        <p class="small">
          <b>This is your plan link.</b> Anyone with it can see this copy of the plan. Your ticks, notes, costs and photos aren't in it.
        </p>
        <div>
          <button class="btn sm ghost" type="button" @click="removeLink">
            <AppIcon name="trash" size="sm" />Remove this link
          </button>
        </div>
      </section>

      <p class="small muted foot">
        Made with Travels, a trip companion. Anyone with this link can see this plan.
      </p>
    </template>
  </div>
</template>

<style scoped>
.pub { max-width: 720px; padding-bottom: 48px; }
.pub-top { display: flex; align-items: center; padding: calc(4px + var(--safe-t)) 0 12px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 44px; min-height: 44px; text-decoration: none; color: var(--accent); }
.brand b { font-size: 19px; letter-spacing: .24em; text-transform: uppercase; }
.again { margin-top: 14px; }
.cover { min-height: 250px; display: flex; align-items: flex-end; overflow: hidden; }
.cover-in { padding: 20px 18px; display: flex; flex-direction: column; gap: 6px; width: 100%; }
.ck { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--on-art-2); }
.ct { font-size: clamp(34px, 10vw, 56px); letter-spacing: .14em; line-height: 1.05; text-transform: uppercase; text-shadow: 0 2px 20px var(--art-scrim); overflow-wrap: anywhere; }
.by { display: flex; align-items: center; gap: 8px; font-size: 14.5px; font-weight: 600; margin-top: 4px; }
.counts { gap: 6px; margin: 14px 0; }
.copy { display: flex; flex-direction: column; gap: 12px; }
.copy .field { max-width: 260px; }
.dates { font-weight: 650; }
.days { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
.day { padding: 14px 16px; }
.dh { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.stops { list-style: none; display: flex; flex-direction: column; }
.st { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0; font-size: 14.5px; line-height: 1.35; }
.st + .st { border-top: 1px solid var(--line); }
.tm { width: 44px; flex: none; color: var(--fg-2); padding-top: 1px; }
.ki { flex: none; display: grid; place-items: center; margin-top: 1px; }
.sn { overflow-wrap: anywhere; }
.more { margin-top: 6px; }
.mine { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.foot { margin-top: 18px; text-align: center; }
</style>
