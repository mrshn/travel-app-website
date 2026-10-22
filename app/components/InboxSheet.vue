<script setup lang="ts">
import type { InboxItem, InboxKind } from '#shared/types/social'
import { socialAgo } from '#shared/utils/social'
import { friendsError, useFriendsState } from './FriendsNotice.vue'
import { useSheetOnTop, withSheet } from './PostCard.vue'

/**
 * Activity (?inbox=1, docs/design/2026-10-14-together.md 5.6): friend requests to answer, then what happened for you,
 * newest first. Each line opens what it is about (a group trip on this device opens there); unread lines are marked
 * until you open them or mark all read.
 */
const social = useSocial()
const state = useFriendsState()
const groups = useGroups()
const sheet = useQueryState('inbox')
const route = useRoute()
const router = useRouter()
const { real } = useClock()

const show = computed(() => !!sheet.value.value && state.value !== 'off')
const { mounted, opened } = useSheetOnTop(show)
const items = computed(() => [...social.inbox.value].sort((a, b) => b.at - a.at))
const unreadIds = computed(() => items.value.filter(i => !i.read).map(i => i.id))

const ICON: Record<InboxKind, string> = {
  'friend-request': 'userplus',
  'friend-accepted': 'users',
  'trip-invite': 'userplus',
  'joined-trip': 'users',
  'like': 'heart',
  'comment': 'chat',
  'meetup-going': 'hand',
  'home-safe': 'home',
}

/** Where a line goes: a group trip on this device opens there; otherwise its link (a path of this app). */
function target(i: InboxItem): string | null {
  if ((i.kind === 'joined-trip' || i.kind === 'trip-invite') && i.ref) {
    const local = groups.localIdOf(i.ref)
    if (local) return `/trips/${encodeURIComponent(local)}/group`
  }
  const l = i.link ?? ''
  return l.startsWith('/') && !l.startsWith('//') ? l : null
}

function markRead(ids: string[]) {
  if (!ids.length) return
  try {
    void social.api().markRead(ids).catch(() => {})
  }
  catch { /* not ready: they stay unread for now */ }
}

function openItem(i: InboxItem) {
  if (!i.read) markRead([i.id])
  const to = target(i)
  if (to) void router.push(to)
}

const marking = ref(false)
async function markAll() {
  if (marking.value || !unreadIds.value.length) return
  marking.value = true
  try {
    await social.api().markRead(unreadIds.value)
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t mark them read.'), { tone: 'warn' })
  }
  finally {
    marking.value = false
  }
}

function openFriend(uid: string) {
  void router.push({ query: withSheet(route.query, 'friend', uid) })
}
</script>

<template>
  <BottomSheet v-if="mounted" :open="opened" title="Activity" @close="sheet.close()">
    <div class="ib">
      <FriendsNotice :offline="'You’re offline. New activity shows when you’re back.'" quiet-loading />

      <FriendRequests heading="Friend requests" @open="openFriend" />

      <div v-if="items.length" class="ibar">
        <h3 class="gh">
          Recent
        </h3>
        <button v-if="unreadIds.length" class="btn sm ghost" type="button" :disabled="marking || state !== 'ready'" @click="markAll">
          <AppIcon name="check" size="sm" />Mark all read
        </button>
      </div>
      <ol v-if="items.length" class="card rows list">
        <li v-for="i in items" :key="i.id">
          <button class="item" :class="{ unread: !i.read }" type="button" @click="openItem(i)">
            <span class="face">
              <Avatar :person="{ uid: i.from, name: i.fromName, photo: i.fromPhoto }" :size="40" />
              <span class="kind" aria-hidden="true"><AppIcon :name="ICON[i.kind] ?? 'bell'" size="xs" /></span>
            </span>
            <span class="grow tx">
              <span class="line"><b>{{ i.fromName }}</b> {{ i.text }}</span>
              <span class="tiny muted"><time :datetime="new Date(i.at).toISOString()">{{ socialAgo(i.at, real.getTime()) }}</time></span>
            </span>
            <span v-if="!i.read" class="udot"><span class="sr-only">New</span></span>
          </button>
        </li>
      </ol>
      <div v-else-if="!social.incoming.value.length && state === 'ready'" class="empty">
        <AppIcon name="bell" />
        <h3>Nothing yet</h3>
        <p>Likes, comments and friend requests show up here.</p>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.ib { display: flex; flex-direction: column; gap: 16px; padding: 6px 16px 8px; }
.ibar { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 44px; margin-bottom: -8px; }
.gh { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 4px; }
.list { list-style: none; overflow: hidden; }
.item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 64px; padding: 10px 14px; border: 0; background: none; color: var(--fg); font: inherit; text-align: left; cursor: pointer; }
.item:hover { background: var(--surface-2); }
.item:focus-visible { outline-offset: -3px; }
.item.unread { background: color-mix(in srgb, var(--accent-soft) 55%, var(--surface)); }
.item.unread:hover { background: var(--accent-soft); }
.face { position: relative; flex: none; }
.kind { position: absolute; right: -4px; bottom: -4px; width: 20px; height: 20px; border-radius: 999px; display: grid; place-items: center; background: var(--surface); color: var(--accent); box-shadow: 0 0 0 1.5px var(--line); }
.tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; line-height: 1.35; }
.line { font-size: 14.5px; overflow-wrap: anywhere; }
.unread .line b { font-weight: 700; }
.udot { flex: none; width: 10px; height: 10px; border-radius: 999px; background: var(--accent); }
</style>
