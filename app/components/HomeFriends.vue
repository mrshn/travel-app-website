<script setup lang="ts">
import { socialFirstName } from '#shared/utils/social'
import { useFriendsState } from './FriendsNotice.vue'
import { withSheet } from './PostCard.vue'

/**
 * Home's Friends section (docs/design/2026-10-14-together.md, 5.8): with no friends yet, why and how to add them;
 * otherwise the friends travelling now (faces and places), the two newest posts and Open the feed. Signed out it shows
 * nothing (Home's "Sign in again" card covers that).
 */
const social = useSocial()
const state = useFriendsState()
const route = useRoute()
const router = useRouter()
const { feed } = social.useFeed()

const visible = computed(() => state.value !== 'off' && state.value !== 'signed-out')
// Friends' cards (who's travelling) are read while Home shows, and again after a while.
watch([social.ready, () => social.friendIds.value.join(',')], ([ready]) => {
  if (ready) void social.loadCards()
}, { immediate: true })

const hasFriends = computed(() => social.friends.value.length > 0)
const now = computed(() => social.travelling.value.now)
const newest = computed(() => [...feed.value].sort((a, b) => b.at - a.at).slice(0, 2))
const nameOf = (uid: string) => socialFirstName(social.personRef(uid).name)

function openFriend(uid: string) {
  void router.push({ query: withSheet(route.query, 'friend', uid) })
}
</script>

<template>
  <section v-if="visible && (hasFriends || state === 'ready')" class="hf" aria-labelledby="hf-h">
    <div class="sec-h">
      <h2 id="hf-h">
        Friends
      </h2>
    </div>

    <div v-if="!hasFriends" class="card pad invite">
      <span class="ic" aria-hidden="true"><AppIcon name="users" /></span>
      <div class="grow stack tight">
        <p class="strong">
          Travel is better with friends.
        </p>
        <p class="small muted">
          Add friends to share moments and plan trips together.
        </p>
        <div class="go">
          <NuxtLink :to="{ path: '/friends', query: { tab: 'friends' }, hash: '#add-friends' }" class="btn primary sm">
            <AppIcon name="userplus" size="sm" />Add friends
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-else class="body">
      <FriendsNotice :offline="'You’re offline. New posts load when you’re back.'" quiet-loading />
      <div v-if="now.length" class="trav">
        <h3 class="tlabel">
          Travelling now
        </h3>
        <ul class="faces">
          <li v-for="f in now" :key="f.uid">
            <button class="face" type="button" :aria-label="`${nameOf(f.uid)}, in ${f.trip.destination}`" @click="openFriend(f.uid)">
              <Avatar :person="social.personRef(f.uid)" :size="52" />
              <span class="fn ellipsis">{{ nameOf(f.uid) }}</span>
              <span class="fp"><AppIcon name="pin" size="xs" /><span class="ellipsis">{{ f.trip.destination }}</span></span>
            </button>
          </li>
        </ul>
      </div>
      <div v-if="newest.length" class="posts">
        <PostCard v-for="p in newest" :key="p.id" :post="p" mode="mini" />
      </div>
      <p v-else class="small muted quiet">
        No posts yet. When friends share moments from their trips, they show up here.
      </p>
      <NuxtLink to="/friends" class="btn ghost block">
        <AppIcon name="users" size="sm" />Open the feed
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.hf { margin-top: 8px; }
.invite { display: flex; align-items: flex-start; gap: 14px; }
.ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; flex: none; background: var(--accent-soft); color: var(--accent); }
.go { margin-top: 6px; }
.body { display: flex; flex-direction: column; gap: 12px; }
.trav { display: flex; flex-direction: column; gap: 8px; }
.tlabel { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 2px; }
.faces { list-style: none; display: flex; gap: 8px; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px 4px; }
.faces::-webkit-scrollbar { display: none; }
.faces li { flex: none; }
.face { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 84px; min-height: 44px; padding: 8px 4px; border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--surface); color: var(--fg); font: inherit; cursor: pointer; }
.face:hover { background: var(--surface-2); }
.fn { max-width: 100%; font-weight: 650; font-size: 14px; }
.fp { display: flex; align-items: center; gap: 3px; max-width: 100%; font-size: 12.5px; color: var(--fg-2); font-weight: 600; }
.posts { display: flex; flex-direction: column; gap: 8px; }
.quiet { padding: 2px 2px 0; }
@media (min-width: 900px) {
  .faces { margin: 0 -24px; padding: 2px 24px 4px; }
}
</style>
