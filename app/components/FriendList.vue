<script setup lang="ts">
import { cardLine, tripLine } from './FriendRow.vue'
import { useFriendsState } from './FriendsNotice.vue'
import { withSheet } from './PostCard.vue'

/**
 * The Friends tab (spec 5.5): requests, friends travelling now and soon (from the cards of friends who share their
 * trips), all your friends, and adding friends.
 */
const social = useSocial()
const state = useFriendsState()
const route = useRoute()
const router = useRouter()
const { real } = useClock()
/** Today as friends' cards count it (useSocial: the device's date in UTC), moving on at midnight. */
const today = computed(() => real.value.toISOString().slice(0, 10))

// Friends' cards are read when this tab shows (and again after a while: useSocial keeps them 10 minutes).
watch([social.ready, () => social.friendIds.value.join(',')], ([ready]) => {
  if (ready) void social.loadCards()
}, { immediate: true })

const now = computed(() => social.travelling.value.now)
const soon = computed(() => social.travelling.value.soon)
const friends = computed(() => social.friends.value)

function open(uid: string) {
  void router.push({ query: withSheet(route.query, 'friend', uid) })
}
</script>

<template>
  <div class="flist">
    <FriendRequests outgoing @open="open" />

    <section v-if="now.length" aria-labelledby="fl-now">
      <h2 id="fl-now" class="gh">
        Travelling now
      </h2>
      <div class="card rows">
        <FriendRow v-for="f in now" :key="f.uid" :uid="f.uid" :line="tripLine(f.trip, today)" open no-handle @open="open" />
      </div>
    </section>

    <section v-if="soon.length" aria-labelledby="fl-soon">
      <h2 id="fl-soon" class="gh">
        Soon
      </h2>
      <div class="card rows">
        <FriendRow v-for="f in soon" :key="f.uid" :uid="f.uid" :line="tripLine(f.trip, today)" open no-handle @open="open" />
      </div>
    </section>

    <section aria-labelledby="fl-all">
      <h2 id="fl-all" class="gh">
        Your friends<span v-if="friends.length" class="n num">{{ friends.length }}</span>
      </h2>
      <div v-if="friends.length" class="card rows">
        <FriendRow v-for="f in friends" :key="f.uid" :uid="f.uid" :line="cardLine(social.cards.value[f.uid], today)" open @open="open" />
      </div>
      <p v-else-if="state === 'ready'" class="none small muted">
        No friends yet. Share your link, or find someone by their @handle.
      </p>
      <div v-else-if="state === 'loading'" class="card skel" aria-hidden="true">
        <span class="bone round" /><span class="bone" />
      </div>
    </section>

    <FriendAdd @open="open" />
  </div>
</template>

<style scoped>
.flist { display: flex; flex-direction: column; gap: 22px; }
.gh { display: flex; align-items: baseline; gap: 8px; font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 4px 8px; }
.n { font-family: var(--font-data); letter-spacing: 0; color: var(--fg-2); }
.rows { overflow: hidden; }
.none { padding: 14px 16px; border: 1px dashed var(--line); border-radius: var(--r-lg); }
.skel { display: flex; align-items: center; gap: 12px; padding: 14px; }
.bone { display: block; flex: 1 1 auto; height: 12px; border-radius: 6px; background: var(--surface-2); }
.bone.round { flex: none; width: 44px; height: 44px; border-radius: 999px; }
</style>
