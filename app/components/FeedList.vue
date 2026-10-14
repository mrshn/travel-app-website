<script setup lang="ts">
import { tripMoment } from '#shared/utils/time'
import { useFriendsState, useMeFace } from './FriendsNotice.vue'

/**
 * The Feed tab (spec 5.5, T3): a prompt to share a moment, then your posts and your friends', newest first, live
 * while it shows. What it last had stays on screen offline.
 */
const emit = defineEmits<{ add: [] }>()
const social = useSocial()
const state = useFriendsState()
const meFace = useMeFace()
const composer = usePostComposer()
const trips = useTrips()
const { real } = useClock()
const { feed, more, limit } = social.useFeed()

const posts = computed(() => [...feed.value].sort((a, b) => b.at - a.at))
const hasMore = computed(() => feed.value.length >= limit.value)

/** The trip you're on now: a moment shared from the feed is tagged with it (the chip can be removed). */
const liveTrip = computed(() => trips.sorted.value.find(t => tripMoment(t, real.value).phase === 'during'))
function compose() {
  const t = liveTrip.value
  composer.open({ draft: { kind: 'moment', ...(t ? { trip: { title: t.title, destination: t.destination, start: t.start, end: t.end } } : {}) } })
}
</script>

<template>
  <div class="feed">
    <button class="prompt card" type="button" @click="compose">
      <Avatar :person="meFace" :size="42" />
      <span class="grow ptx">
        <b>Share a moment from your trip</b>
        <span class="small muted">A photo, a place, a line. Only your friends see it.</span>
      </span>
      <span class="pic" aria-hidden="true"><AppIcon name="camera" /></span>
    </button>

    <template v-if="posts.length">
      <PostCard v-for="p in posts" :key="p.id" :post="p" />
      <button v-if="hasMore" class="btn ghost block" type="button" @click="more">
        Show more
      </button>
    </template>
    <div v-else-if="state === 'loading'" class="skel card" aria-hidden="true">
      <span class="bone round" />
      <span class="bones"><span class="bone" /><span class="bone short" /></span>
    </div>
    <div v-else-if="state === 'ready'" class="empty card">
      <AppIcon name="users" />
      <h3>No posts yet</h3>
      <p>When friends share moments from their trips, they show up here.</p>
      <button class="btn primary" type="button" @click="emit('add')">
        <AppIcon name="userplus" size="sm" />Add friends
      </button>
    </div>
  </div>
</template>

<style scoped>
.feed { display: flex; flex-direction: column; gap: 14px; }
.prompt { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 72px; padding: 12px 14px; color: var(--fg); font: inherit; text-align: left; cursor: pointer; }
.prompt:hover { background: var(--surface-2); }
.ptx { display: flex; flex-direction: column; gap: 2px; line-height: 1.3; }
.ptx b { font-size: 15.5px; }
.pic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--accent-soft); color: var(--accent); }
.empty { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.empty p { max-width: 30em; margin-bottom: 12px; }
.skel { display: flex; gap: 12px; align-items: center; padding: 16px; }
.bones { display: flex; flex-direction: column; gap: 8px; flex: 1 1 auto; }
.bone { display: block; height: 12px; border-radius: 6px; background: var(--surface-2); }
.bone.round { width: 42px; height: 42px; border-radius: 999px; flex: none; }
.bone.short { width: 55%; }
</style>
