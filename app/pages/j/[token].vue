<script setup lang="ts">
import { until } from '@vueuse/core'
import type { Invite } from '#shared/types/social'
import { socialFirstName, socialTokenValid } from '#shared/utils/social'
import { fmtRange, tripMoment } from '#shared/utils/time'
import { groupErrorLine } from '~/components/GroupNotice.vue'

/**
 * Join a trip from a link (/j/<token>, docs/design/2026-10-14-together.md, 5.3). Anyone can open it, signed in or
 * not: it shows the trip the link is for (its picture, title and dates, read from the invite) and nothing of this
 * device's trips. Signed in, Join adds you and opens the trip once its plan is here.
 */
const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))
const social = useSocial()
const cloud = useCloud()
const groups = useGroups()
const trips = useTrips()

const inv = ref<Invite | null>(null)
const phase = ref<'loading' | 'ok' | 'missing' | 'error'>('loading')
async function load() {
  if (!socialTokenValid(token.value)) {
    phase.value = 'missing'
    return
  }
  try {
    const b = await social.publicApi()
    inv.value = await b.getInvite(token.value)
    phase.value = inv.value ? 'ok' : 'missing'
  }
  catch {
    phase.value = 'error'
  }
}
onMounted(load)
watch(token, () => {
  phase.value = 'loading'
  inv.value = null
  void load()
})

const trip = computed(() => (inv.value?.kind === 'trip' && inv.value.trip ? inv.value : null))
const title = computed(() => trip.value?.tripTitle || trip.value?.tripDestination || 'this trip')
const from = computed(() => (inv.value ? { uid: inv.value.from, name: inv.value.fromName, photo: inv.value.fromPhoto } : null))
const fromFirst = computed(() => socialFirstName(inv.value?.fromName ?? ''))
const viewer = computed(() => trip.value?.role === 'viewer')
const dates = computed(() => (trip.value?.tripStart ? fmtRange(trip.value.tripStart, trip.value.tripEnd || trip.value.tripStart) : ''))

// ---------- who you are ----------
/** Signed in (the social layer knows who you are). */
const signedIn = computed(() => !!social.me.value)
/** Firebase is still picking up a session, or a sign-in is under way. */
const busy = computed(() => cloud.status.value === 'signing-in' || cloud.status.value === 'starting')
const showSignIn = computed(() => !signedIn.value && phase.value === 'ok' && !!trip.value && !trip.value.revoked)
// Firebase loads ahead of the tap, so a desktop sign-in window opens inside it.
watch(showSignIn, (s) => {
  if (s) void cloud.prepare()
}, { immediate: true })

const own = computed(() => !!trip.value && trip.value.from === social.me.value?.uid)
/** The trip's id on this device, when you're already in it (or made it). */
const localId = computed(() => (signedIn.value && trip.value?.trip ? groups.localIdOf(trip.value.trip) : undefined))
const here = computed(() => (localId.value ? trips.get(localId.value) : undefined))

/** Where a trip opens: Now while it's on, else its plan. */
function openPath(id: string): string {
  const t = trips.get(id)
  return `/trips/${id}/${t && tripMoment(t, new Date()).phase === 'during' ? 'now' : 'plan'}`
}

// ---------- joining ----------
const joining = ref(false)
const failed = ref('')
async function join() {
  const gid = trip.value?.trip
  if (!gid || joining.value) return
  joining.value = true
  failed.value = ''
  try {
    const r = await groups.join(token.value)
    // The plan arrives with the group: wait until it's on this device.
    await until(() => groups.localOf(r.gid) ?? trips.get(r.localId)).toBeTruthy({ timeout: 20000, throwOnTimeout: true })
    const t = groups.localOf(r.gid) ?? trips.get(r.localId)!
    await navigateTo(openPath(t.id))
  }
  catch (e) {
    joining.value = false
    const code = (e as { code?: string } | null)?.code
    if (code === 'not-found') {
      await load()
      failed.value = trip.value?.revoked ? '' : 'This trip isn\'t shared any more.'
    }
    else {
      failed.value = groupErrorLine(e, 'Couldn\'t join just now. Try again in a moment.')
    }
  }
}

useHead({ title: computed(() => (trip.value ? `Join ${title.value} · Travels` : 'Join a trip · Travels')) })
</script>

<template>
  <main class="page join">
    <header class="j-top">
      <NuxtLink to="/" class="brand" aria-label="Travels home">
        <AppLogo :size="30" />
        <b class="display">Travels</b>
      </NuxtLink>
    </header>

    <section v-if="phase === 'loading'" class="card pad j-msg" aria-busy="true">
      <p class="muted">
        Opening the invite…
      </p>
    </section>

    <section v-else-if="phase === 'error'" class="card pad j-msg">
      <AppIcon name="signal-off" />
      <h1 class="h3">
        Couldn't open this invite
      </h1>
      <p class="muted">
        Check your connection and try again.
      </p>
      <button class="btn primary" type="button" @click="load">
        <AppIcon name="refresh" size="sm" />Try again
      </button>
    </section>

    <section v-else-if="phase === 'missing' || !inv" class="card pad j-msg">
      <AppIcon name="link" />
      <h1 class="h3">
        This link doesn't work
      </h1>
      <p class="muted">
        Ask the person who sent it for a new one.
      </p>
    </section>

    <section v-else-if="!trip" class="card pad j-msg">
      <AppIcon name="users" />
      <h1 class="h3">
        This is a friend link
      </h1>
      <p class="muted">
        It adds {{ fromFirst }} as a friend, rather than a trip.
      </p>
      <NuxtLink :to="`/f/${token}`" class="btn primary">
        Open the friend link
      </NuxtLink>
    </section>

    <article v-else class="card j-card">
      <div class="j-art art-frame">
        <SceneArt class="scene" :scene="trip.tripCover?.scene ?? 'skyline'" :tod="trip.tripCover?.tod ?? 'golden'" :label="title" :lazy="false" />
        <div class="scrim" />
        <div class="j-in on-art">
          <p v-if="dates" class="j-k">
            {{ dates }}
          </p>
          <h1 class="j-title display">
            {{ title }}
          </h1>
          <p v-if="trip.tripDestination && trip.tripDestination !== title" class="j-sub">
            {{ trip.tripDestination }}
          </p>
        </div>
      </div>

      <div class="j-body">
        <p class="j-who">
          <Avatar :person="from" :size="40" />
          <span>
            <template v-if="viewer"><b>{{ fromFirst }}</b> invited you to follow this trip</template>
            <template v-else><b>{{ fromFirst }}</b> invited you to plan this trip together</template>
          </span>
        </p>

        <template v-if="trip.revoked">
          <p class="j-note">
            <AppIcon name="alert" size="sm" /><span>This link was reset. Ask {{ fromFirst }} for a new one.</span>
          </p>
        </template>

        <template v-else>
          <p class="muted j-what">
            <template v-if="viewer">
              You'll see the plan as it changes and can chat. Your own ticks, costs and notes stay yours.
            </template>
            <template v-else>
              You'll see the plan, chat and vote. Your own ticks, costs and notes stay yours.
            </template>
          </p>

          <!-- Signed out: sign in first (nothing of this device shows here). -->
          <div v-if="!signedIn" class="j-acts">
            <p v-if="busy && cloud.status.value === 'starting'" class="muted small">
              Checking your account…
            </p>
            <button v-else class="btn primary lg" type="button" :disabled="busy" @click="cloud.signIn()">
              <AppIcon name="person" />{{ busy ? 'Signing in…' : 'Sign in with Google to join' }}
            </button>
            <p class="msg small" role="status">{{ cloud.message.value }}</p>
          </div>

          <div v-else-if="own" class="j-acts">
            <p class="j-note">
              <AppIcon name="info" size="sm" /><span>This is your invite link. Share it with the people you want to join.</span>
            </p>
            <NuxtLink v-if="here" :to="openPath(here.id)" class="btn primary lg">
              Open {{ title }}<AppIcon name="arrow" size="sm" />
            </NuxtLink>
          </div>

          <div v-else-if="here" class="j-acts">
            <p class="small muted">
              You're already in this trip.
            </p>
            <NuxtLink :to="openPath(here.id)" class="btn primary lg">
              Open {{ title }}<AppIcon name="arrow" size="sm" />
            </NuxtLink>
          </div>

          <div v-else class="j-acts">
            <GroupNotice />
            <button class="btn primary lg" type="button" :disabled="joining || !social.ready.value" @click="join">
              <AppIcon name="userplus" />{{ joining ? 'Joining…' : `Join ${title}` }}
            </button>
            <p v-if="failed" class="j-note" role="alert">
              <AppIcon name="alert" size="sm" /><span>{{ failed }}</span>
            </p>
          </div>
        </template>
      </div>
    </article>
  </main>
</template>

<style scoped>
.join { max-width: 560px; padding-top: calc(8px + var(--safe-t)); padding-bottom: 48px; }
.j-top { display: flex; align-items: center; padding: 4px 0 12px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 44px; min-height: 44px; text-decoration: none; color: var(--accent); }
.brand b { font-size: 19px; letter-spacing: .24em; text-transform: uppercase; }
.j-msg { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.j-msg > .i { color: var(--fg-3); width: 30px; height: 30px; }
.j-card { overflow: hidden; }
.j-art { height: 220px; display: flex; align-items: flex-end; }
.j-in { padding: 18px; display: flex; flex-direction: column; gap: 4px; width: 100%; }
.j-k { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--on-art-2); }
.j-title { font-size: clamp(30px, 9vw, 44px); letter-spacing: .14em; text-transform: uppercase; line-height: 1.05; overflow-wrap: anywhere; text-shadow: 0 2px 16px rgba(0, 0, 0, .4); }
.j-sub { color: var(--on-art-2); font-weight: 600; }
.j-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.j-who { display: flex; align-items: center; gap: 12px; font-size: 16px; line-height: 1.4; }
.j-what { line-height: 1.5; }
.j-acts { display: flex; flex-direction: column; align-items: stretch; gap: 10px; }
.j-acts .btn { white-space: normal; text-align: center; }
.j-note { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 12px; background: var(--warn-soft); color: var(--fg); font-size: 14.5px; font-weight: 550; }
.j-note .i { flex: none; margin-top: 2px; color: var(--warn); }
.msg { padding: 8px 10px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); font-weight: 600; }
.msg:empty { display: none; }
</style>
