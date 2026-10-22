<script setup lang="ts">
import type { Invite } from '#shared/types/social'
import { socialFirstName, socialPath, socialTokenValid } from '#shared/utils/social'
import { SocialError } from '~/lib/social/api'
import { friendsError, useFriendsState } from '~/components/FriendsNotice.vue'
import { refreshPerson } from '~/components/FriendRow.vue'

/**
 * Add a friend from their link (/f/<token>, docs/design/2026-10-14-together.md 5.7). Anyone can open it: signed out it
 * shows who sent it and Sign in with Google; signed in, Add them as a friend. Also: already friends, your own link,
 * and a link that was reset. It shows nothing of this device's trips.
 */
const route = useRoute()
const social = useSocial()
const cloud = useCloud()
const state = useFriendsState()
const token = computed(() => String(route.params.token ?? ''))

type Load = 'loading' | 'ok' | 'missing' | 'offline' | 'error'
const invite = ref<Invite | null>(null)
const load = ref<Load>('loading')
const added = ref(false)
const adding = ref(false)

async function read() {
  const t = token.value
  load.value = 'loading'
  invite.value = null
  added.value = false
  if (!socialTokenValid(t)) {
    load.value = 'missing'
    return
  }
  try {
    const inv = await (await social.publicApi()).getInvite(t)
    if (t !== token.value) return
    if (inv?.kind === 'trip') {
      // A trip invite opened here: its own page.
      await navigateTo(socialPath('trip', t), { replace: true })
      return
    }
    invite.value = inv
    load.value = inv ? 'ok' : 'missing'
  }
  catch (e) {
    if (t !== token.value) return
    load.value = (e instanceof SocialError && e.code === 'offline') || (typeof navigator !== 'undefined' && !navigator.onLine) ? 'offline' : 'error'
  }
}
watch(token, () => void read(), { immediate: true })
// Back online, or signed in meanwhile: read it again.
watch(() => social.ready.value || state.value === 'off', (ok) => {
  if (ok && load.value !== 'ok' && load.value !== 'loading') void read()
})

const from = computed(() => invite.value?.from ?? '')
const profile = computed(() => (from.value ? social.people.value[from.value] ?? null : null))
// Signed in, their card says more (handle, a line about them, home city).
watch([from, social.ready], ([f, ready]) => {
  if (f && ready) void refreshPerson(social, f)
}, { immediate: true })
const person = computed(() => ({
  uid: from.value,
  name: profile.value?.name || invite.value?.fromName || 'Someone',
  photo: profile.value ? profile.value.photo ?? null : invite.value?.fromPhoto ?? null,
}))
const first = computed(() => socialFirstName(person.value.name))

type Phase = Load | 'reset' | 'sign-in' | 'own' | 'friends' | 'add'
const phase = computed<Phase>(() => {
  const inv = invite.value
  if (load.value !== 'ok' || !inv) return load.value
  if (inv.revoked) return 'reset'
  if (state.value === 'off' || state.value === 'signed-out') return 'sign-in'
  const me = social.me.value?.uid
  if (me && inv.from === me) return 'own'
  if (added.value || social.isFriend(inv.from)) return 'friends'
  return 'add'
})

const signingIn = computed(() => cloud.status.value === 'signing-in' || cloud.status.value === 'starting')
// Firebase loads ahead of the tap, so a desktop sign-in window opens inside it.
watch(() => phase.value === 'sign-in', (s) => {
  if (s) void cloud.prepare()
}, { immediate: true })

async function add() {
  const inv = invite.value
  if (!inv || adding.value) return
  adding.value = true
  try {
    await social.addFriend(token.value)
    added.value = true
  }
  catch (e) {
    if (e instanceof SocialError && e.code === 'not-found') invite.value = { ...inv, revoked: true }
    else toast(friendsError(e, `Couldn’t add ${first.value} right now.`), { tone: 'warn' })
  }
  finally {
    adding.value = false
  }
}

const ownUrl = computed(() => social.link(socialPath('friend', token.value)))
useHead({ title: 'Add a friend · Travels' })
</script>

<template>
  <main class="page addf">
    <header class="top">
      <NuxtLink to="/" class="brand" aria-label="Travels">
        <AppLogo :size="28" />
        <b class="display">Travels</b>
      </NuxtLink>
    </header>

    <section class="card who" aria-live="polite">
      <div v-if="phase === 'loading'" class="skel" aria-busy="true">
        <span class="sr-only" role="status">Opening the link…</span>
        <span class="bone round" aria-hidden="true" />
        <span class="bone" aria-hidden="true" />
        <span class="bone short" aria-hidden="true" />
      </div>

      <template v-else-if="phase === 'missing' || phase === 'offline' || phase === 'error'">
        <span class="big-ic" aria-hidden="true"><AppIcon :name="phase === 'offline' ? 'signal-off' : 'link'" size="xl" /></span>
        <h1 class="h2">
          {{ phase === 'missing' ? 'This link doesn’t work' : phase === 'offline' ? 'You’re offline' : 'Couldn’t open the link' }}
        </h1>
        <p class="muted">
          {{ phase === 'missing' ? 'Check that you have all of it, or ask for a new one.' : phase === 'offline' ? 'Open the link again when you’re back online.' : 'Try again in a moment.' }}
        </p>
        <button v-if="phase !== 'missing'" class="btn primary" type="button" @click="read">
          <AppIcon name="refresh" size="sm" />Try again
        </button>
      </template>

      <template v-else>
        <Avatar :person="person" :size="96" />
        <p class="kicker">
          {{ phase === 'own' ? 'Your friend link' : 'Friend link' }}
        </p>
        <h1 class="h2 name">
          {{ person.name }}
        </h1>
        <p v-if="profile?.handle" class="handle">
          @{{ profile.handle }}
        </p>
        <p v-if="profile?.bio" class="bio">
          {{ profile.bio }}
        </p>
        <p v-if="profile?.homeCity" class="city small">
          <AppIcon name="home" size="sm" /><span>{{ profile.homeCity }}</span>
        </p>

        <div class="act">
          <template v-if="phase === 'reset'">
            <p class="note warn" role="status">
              This link was reset. Ask for a new one.
            </p>
          </template>

          <template v-else-if="phase === 'sign-in'">
            <p class="muted">
              {{ first }} wants to be friends on Travels: you'd see each other's trip moments and could plan trips together.
            </p>
            <button class="btn primary lg" type="button" :disabled="signingIn" @click="cloud.signIn()">
              <AppIcon name="person" />{{ signingIn ? 'Signing in…' : `Sign in with Google to add ${first}` }}
            </button>
            <p class="msg" role="status">{{ cloud.message.value }}</p>
          </template>

          <template v-else-if="phase === 'own'">
            <p class="muted">
              This is your friend link. Share it with the people you want to add.
            </p>
            <ShareLink :url="ownUrl" title="Travels" text="Add me as a friend on Travels" />
          </template>

          <template v-else-if="phase === 'friends'">
            <p class="note ok" role="status">
              <AppIcon name="check" size="sm" /><span>You and {{ first }} are friends</span>
            </p>
            <NuxtLink :to="{ path: '/friends', query: { tab: 'friends' } }" class="btn primary lg">
              <AppIcon name="users" />Open Friends
            </NuxtLink>
          </template>

          <template v-else>
            <p class="muted">
              Friends on Travels see each other's trip moments and can plan trips together.
            </p>
            <FriendsNotice :offline="`You’re offline. You can add ${first} when you’re back.`" quiet-loading />
            <button class="btn primary lg" type="button" :disabled="adding || state !== 'ready'" @click="add">
              <AppIcon name="userplus" />{{ adding ? 'Adding…' : state === 'loading' ? 'Getting ready…' : `Add ${first} as a friend` }}
            </button>
          </template>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.addf { max-width: 520px; min-height: 100dvh; padding-top: calc(12px + var(--safe-t)); padding-bottom: calc(40px + var(--safe-b)); display: flex; flex-direction: column; gap: 18px; }
.top { display: flex; align-items: center; }
.brand { display: flex; align-items: center; gap: 10px; min-height: 44px; color: var(--accent); text-decoration: none; }
.brand b { font-size: 17px; letter-spacing: .22em; text-transform: uppercase; }
.who { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 18px 22px; text-align: center; }
.big-ic { width: 64px; height: 64px; border-radius: 20px; display: grid; place-items: center; background: var(--surface-2); color: var(--fg-2); margin-bottom: 4px; }
.kicker { margin-top: 6px; }
.name { overflow-wrap: anywhere; }
.handle { font-weight: 650; color: var(--fg-2); overflow-wrap: anywhere; }
.bio { font-size: 15.5px; line-height: 1.5; max-width: 30em; overflow-wrap: anywhere; }
.city { display: flex; align-items: center; gap: 6px; color: var(--fg-2); font-weight: 600; }
.act { display: flex; flex-direction: column; align-items: stretch; gap: 12px; width: 100%; max-width: 400px; margin-top: 10px; }
.act .btn { white-space: normal; text-align: center; line-height: 1.25; }
.note { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 12px; border-radius: var(--r-md); font-weight: 650; }
.note.ok { background: var(--ok-soft); color: var(--ok); }
.note.warn { background: var(--warn-soft); color: var(--warn); }
.msg { padding: 10px 12px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); font-weight: 600; font-size: 14px; }
.msg:empty { display: none; }
.skel { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; padding: 6px 0; }
.bone { display: block; width: 60%; height: 14px; border-radius: 7px; background: var(--surface-2); }
.bone.round { width: 96px; height: 96px; border-radius: 999px; }
.bone.short { width: 40%; }
</style>
