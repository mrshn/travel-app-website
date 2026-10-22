<script setup lang="ts">
import { socialFirstName } from '#shared/utils/social'
import { fmtDate } from '#shared/utils/time'
import { friendsError, useFriendsState } from './FriendsNotice.vue'
import { bothThere, rangeTo, readRequestLines, refreshPerson } from './FriendRow.vue'
import { useSheetOnTop } from './PostCard.vue'

/**
 * A friend (?friend=<uid>, docs/design/2026-10-14-together.md 5.6): face, name, handle, a line about them, home city;
 * their trips when they share them (with "You're both in Rome on 10 to 12 Oct" when one meets yours); their recent
 * posts from your feed; Unfriend. Someone who isn't a friend yet (a request, a comment) can be added from here.
 */
const social = useSocial()
const state = useFriendsState()
const sheet = useQueryState('friend')
const trips = useTrips()
const { real } = useClock()

const uid = computed(() => sheet.value.value)
const show = computed(() => !!uid.value && state.value !== 'off')
const { mounted, opened } = useSheetOnTop(show)
// Keeps the last person on screen while the sheet slides away.
const last = ref<string | null>(null)
watch(uid, (u) => {
  if (u) last.value = u
}, { immediate: true })
const who = computed(() => uid.value ?? last.value)

/** A name and photo to show before their card is read: from a post of theirs, or their request. */
const fallback = computed(() => {
  const id = who.value
  if (!id) return undefined
  const p = social.feed.value.find(x => x.author === id)
  if (p) return { name: p.authorName, photo: p.authorPhoto }
  const r = social.incoming.value.find(x => x.from === id)
  return r ? { name: r.fromName, photo: r.fromPhoto } : undefined
})
const person = computed(() => (who.value ? social.personRef(who.value, fallback.value) : null))
const profile = computed(() => (who.value ? social.people.value[who.value] ?? null : null))
const first = computed(() => socialFirstName(person.value?.name ?? ''))
const isMe = computed(() => !!who.value && who.value === social.me.value?.uid)
const friendView = computed(() => social.friends.value.find(f => f.uid === who.value))
const friend = computed(() => !!friendView.value)
const asked = computed(() => social.incoming.value.find(r => r.from === who.value))
const sent = computed(() => social.outgoing.value.find(r => r.to === who.value))

// Opened: their card as it is now, and (for a friend) where they're going.
watch([uid, social.ready], ([id, ready]) => {
  if (!id || !ready) return
  void refreshPerson(social, id)
  if (social.isFriend(id)) void social.loadCards()
}, { immediate: true })

// ---------- their trips ----------
const today = computed(() => real.value.toISOString().slice(0, 10))
const card = computed(() => (who.value ? social.cards.value[who.value] ?? null : null))
/** Their card was read (it may be empty: null). */
const cardKnown = computed(() => !!who.value && who.value in social.cards.value)
const theirTrips = computed(() => (card.value?.showTrips ? [...(card.value.trips ?? [])].sort((a, b) => a.start.localeCompare(b.start)) : []))
const both = computed(() => bothThere(trips.trips.value, theirTrips.value).map(b => ({
  ...b,
  line: `${b.end < today.value ? 'You were' : 'You’re'} both in ${b.destination} on ${rangeTo(b.start, b.end)}`,
})))
const tripTag = (t: { start: string, end: string }) => (t.start <= today.value && today.value <= t.end ? 'Now' : t.end < today.value ? 'Back' : '')

// ---------- what you can do ----------
const busy = ref(false)
async function act(what: () => Promise<unknown>, done: string, failed: string, after?: () => void) {
  if (busy.value) return
  busy.value = true
  try {
    await what()
    toast(done, { tone: 'ok' })
    after?.()
  }
  catch (e) {
    toast(friendsError(e, failed), { tone: 'warn' })
  }
  finally {
    busy.value = false
  }
}
function unfriend() {
  const p = person.value
  if (!p || !confirm(`Unfriend ${p.name}? Your posts leave each other’s feeds. You can add each other again later.`)) return
  void act(() => social.api().unfriend(p.uid), `You’re no longer friends with ${first.value}`, 'Couldn’t unfriend right now.', () => sheet.close())
}
function addFriend() {
  const p = person.value
  if (p) void act(() => social.api().sendRequest(p), `Request sent to ${first.value}`, 'Couldn’t send the request.')
}
function accept() {
  const r = asked.value
  if (r) void act(() => social.acceptRequest(r), `You and ${first.value} are friends`, 'Couldn’t accept the request.', () => readRequestLines(social, r.from))
}
function decline() {
  const r = asked.value
  if (r) void act(() => social.api().dropRequest(r), 'Request declined', 'Couldn’t decline the request.', () => readRequestLines(social, r.from))
}
function cancelRequest() {
  const r = sent.value
  if (r) void act(() => social.api().dropRequest(r), 'Request cancelled', 'Couldn’t cancel the request.')
}
</script>

<template>
  <BottomSheet v-if="mounted" :open="opened" :title="person?.name ?? 'Friend'" @close="sheet.close()">
    <div v-if="person" class="fs">
      <FriendsNotice :offline="'You’re offline. What you see may be out of date.'" quiet-loading />

      <div class="head">
        <Avatar :person="person" :size="72" />
        <div class="grow htx">
          <p v-if="profile?.handle" class="handle">
            @{{ profile.handle }}
          </p>
          <p v-if="profile?.homeCity" class="city small">
            <AppIcon name="home" size="sm" /><span>{{ profile.homeCity }}</span>
          </p>
          <p v-if="isMe" class="small muted">
            This is you.
          </p>
          <p v-else-if="friendView" class="small muted">
            Friends since {{ fmtDate(new Date(friendView.since).toISOString().slice(0, 10), 'dayMonth') }}
          </p>
          <p v-else-if="asked" class="small strong">
            Wants to be friends
          </p>
          <p v-else-if="sent" class="small muted">
            Request sent. Waiting for an answer.
          </p>
          <p v-else class="small muted">
            Not friends yet
          </p>
        </div>
      </div>
      <p v-if="profile?.bio" class="bio">
        {{ profile.bio }}
      </p>

      <div v-if="!isMe && !friend" class="row wrap acts">
        <template v-if="asked">
          <button class="btn primary" type="button" :disabled="busy || state !== 'ready'" @click="accept">
            <AppIcon name="check" size="sm" />Accept
          </button>
          <button class="btn ghost" type="button" :disabled="busy || state !== 'ready'" @click="decline">
            Decline
          </button>
        </template>
        <button v-else-if="sent" class="btn ghost" type="button" :disabled="busy || state !== 'ready'" @click="cancelRequest">
          Cancel request
        </button>
        <button v-else class="btn primary" type="button" :disabled="busy || state !== 'ready'" @click="addFriend">
          <AppIcon name="userplus" size="sm" />Add friend
        </button>
      </div>

      <section v-if="friend" class="sec" aria-labelledby="fs-trips">
        <h3 id="fs-trips" class="gh">
          Trips
        </h3>
        <p v-for="b in both" :key="`${b.destination}-${b.start}`" class="both">
          <AppIcon name="users" size="sm" /><span>{{ b.line }}</span>
        </p>
        <ul v-if="theirTrips.length" class="card rows trips">
          <li v-for="t in theirTrips" :key="`${t.destination}-${t.start}`" class="trow">
            <span class="ic" aria-hidden="true"><AppIcon name="plane" /></span>
            <span class="grow ttx">
              <b class="ellipsis">{{ t.title || t.destination }}</b>
              <span class="small muted">{{ [t.title && t.title !== t.destination ? t.destination : '', t.country ?? '', rangeTo(t.start, t.end)].filter(Boolean).join(' · ') }}</span>
            </span>
            <span v-if="tripTag(t)" class="chip" :class="tripTag(t) === 'Now' ? 't-accent-soft' : ''">{{ tripTag(t) }}</span>
          </li>
        </ul>
        <p v-else-if="!cardKnown" class="small muted">
          {{ state === 'ready' ? 'Looking for their trips…' : 'Their trips show when you’re back online.' }}
        </p>
        <p v-else-if="!card?.showTrips" class="small muted">
          {{ first }} doesn’t share where they’re going.
        </p>
        <p v-else class="small muted">
          No trips coming up.
        </p>
      </section>

      <section v-if="friend && show" class="sec" aria-labelledby="fs-posts">
        <h3 id="fs-posts" class="gh">
          Recent posts
        </h3>
        <FriendPosts :uid="person.uid" />
      </section>

      <div v-if="friend" class="unf">
        <button class="btn ghost danger-text" type="button" :disabled="busy || state !== 'ready'" @click="unfriend">
          Unfriend
        </button>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.fs { display: flex; flex-direction: column; gap: 16px; padding: 6px 16px 8px; }
.head { display: flex; align-items: center; gap: 14px; min-width: 0; }
.htx { display: flex; flex-direction: column; gap: 3px; }
.handle { font-weight: 650; color: var(--fg-2); overflow-wrap: anywhere; }
.city { display: flex; align-items: center; gap: 6px; color: var(--fg-2); font-weight: 600; }
.bio { font-size: 15.5px; line-height: 1.5; overflow-wrap: anywhere; }
.acts { gap: 10px; }
.sec { display: flex; flex-direction: column; gap: 8px; }
.gh { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 4px; }
.both { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: var(--r-md); background: var(--accent-soft); color: var(--fg); font-weight: 650; font-size: 14.5px; }
.both .i { margin-top: 2px; color: var(--accent); }
.trips { list-style: none; overflow: hidden; }
.trow { display: flex; align-items: center; gap: 12px; padding: 10px 14px; min-height: 56px; }
.ic { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex: none; background: var(--surface-2); color: var(--accent); }
.ttx { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.unf { padding-top: 12px; border-top: 1px solid var(--line); }
.danger-text { color: var(--bad); }
</style>
