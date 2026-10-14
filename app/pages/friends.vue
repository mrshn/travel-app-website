<script setup lang="ts">
/**
 * Friends (docs/design/2026-10-14-together.md, 5.5): the feed, your friends and you, in a segment kept in the URL
 * (?tab=feed|friends|you), with Activity (the bell, ?inbox=1) and Add friends in the header.
 */
const social = useSocial()
const route = useRoute()
const router = useRouter()
const inbox = useQueryState('inbox')

type Tab = 'feed' | 'friends' | 'you'
const TABS: { key: Tab, label: string }[] = [
  { key: 'feed', label: 'Feed' },
  { key: 'friends', label: 'Friends' },
  { key: 'you', label: 'You' },
]
const tab = computed<Tab>(() => {
  const t = route.query.tab
  return t === 'friends' || t === 'you' ? t : 'feed'
})
function setTab(t: Tab) {
  if (t !== tab.value) void router.replace({ query: { ...route.query, tab: t }, hash: '' })
}

const unread = computed(() => social.unread.value)
const bellLabel = computed(() => (unread.value ? `Activity, ${unread.value} new` : 'Activity'))
const requests = computed(() => social.incoming.value.length)
const OFFLINE: Record<Tab, string> = {
  feed: 'You’re offline. New posts load when you’re back.',
  friends: 'You’re offline. Requests and friends’ trips update when you’re back.',
  you: 'You’re offline. Changes to your profile and links wait until you’re back.',
}

/** To "Add friends" on the Friends tab, its heading focused. */
async function toAdd() {
  if (tab.value !== 'friends') await router.replace({ query: { ...route.query, tab: 'friends' }, hash: '' })
  await nextTick()
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('add-friends')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  document.getElementById('add-h')?.focus({ preventScroll: true })
}
// Opened as /friends?tab=friends#add-friends (Home's "Add friends", the composer's "Add friends first"): straight there
// once the tab shows.
onMounted(() => {
  if (route.hash === '#add-friends') void toAdd()
})
watch(() => route.hash, (h) => {
  if (h === '#add-friends') void toAdd()
})

useHead({ title: 'Friends · Travels' })
</script>

<template>
  <div class="page friends">
    <header class="fh">
      <NuxtLink to="/" class="btn icon plain round" aria-label="Back to all trips">
        <AppIcon name="chevl" />
      </NuxtLink>
      <h1 class="h2 grow">
        Friends
      </h1>
      <button class="btn icon plain round bell" type="button" :aria-label="bellLabel" @click="inbox.open('1')">
        <AppIcon name="bell" />
        <i v-if="unread" class="badge-dot" aria-hidden="true" />
      </button>
      <button class="btn primary addbtn" type="button" @click="toAdd">
        <AppIcon name="userplus" size="sm" /><span class="lbl">Add friends</span>
      </button>
    </header>

    <div class="seg block tabs" role="group" aria-label="Show">
      <button v-for="t in TABS" :key="t.key" type="button" :aria-pressed="tab === t.key" @click="setTab(t.key)">
        {{ t.label }}<span v-if="t.key === 'friends' && requests" class="cnt num"><span class="sr-only">, new requests:</span>{{ requests }}</span>
      </button>
    </div>

    <FriendsNotice :offline="OFFLINE[tab]" :quiet-loading="tab !== 'you'" />

    <FeedList v-if="tab === 'feed'" @add="toAdd" />
    <FriendList v-else-if="tab === 'friends'" />
    <div v-else class="you">
      <ProfileCard />
      <ProfileTrips />
      <ProfileLinks />
    </div>
  </div>
</template>

<style scoped>
.friends { max-width: 680px; padding-top: calc(12px + var(--safe-t)); padding-bottom: 56px; display: flex; flex-direction: column; gap: 16px; }
.fh { display: flex; align-items: center; gap: 8px; min-width: 0; }
.fh > .btn { flex: none; }
.bell { position: relative; }
.badge-dot { position: absolute; top: 9px; right: 10px; width: 10px; height: 10px; border-radius: 999px; background: var(--accent); border: 2px solid var(--bg); }
.addbtn { padding: 0 14px; }
/* Under 360 px the button keeps its icon (and its name for screen readers), 44 x 44. */
@media (max-width: 359px) {
  .addbtn { width: 44px; padding: 0; }
  .addbtn .lbl { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
}
.tabs button { min-height: 44px; }
.cnt { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; margin-left: 2px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font-size: 12px; font-weight: 600; }
.you { display: flex; flex-direction: column; gap: 22px; }
</style>
