<script setup lang="ts">
import { useStorage } from '@vueuse/core'

/**
 * Together (/trips/<id>/group, docs/design/2026-10-14-together.md, 5.1; it lights More). A solo trip: what planning
 * with friends means, and the ways to start. A group trip: the people in it, and Chat · People · Decide, kept in
 * the URL (?tab=) and remembered on this device.
 */
const v = useTripView()
const tg = useTripGroup()
const route = useRoute()
const router = useRouter()

const TABS = [
  { key: 'chat', label: 'Chat', icon: 'chat' },
  { key: 'people', label: 'People', icon: 'users' },
  { key: 'decide', label: 'Decide', icon: 'check' },
] as const
type Tab = typeof TABS[number]['key']
const isTab = (x: unknown): x is Tab => TABS.some(t => t.key === x)
const remembered = useStorage<string>('travel:together:tab:v1', 'chat')
const tab = computed<Tab>(() => {
  const q = route.query.tab
  if (isTab(q)) return q
  return isTab(remembered.value) ? remembered.value : 'chat'
})
watch(tab, (t) => {
  remembered.value = t
}, { immediate: true })
function setTab(t: Tab) {
  if (t !== tab.value) void router.replace({ query: { ...route.query, tab: t } })
}

const people = computed(() => tg.members.value)
const unread = computed(() => tg.unread.value)
const title = computed(() => v.trip.value?.title ?? '')

useHead({ title: computed(() => (title.value ? `Together · ${title.value} · Travels` : 'Together · Travels')) })
</script>

<template>
  <div v-if="v.trip.value" class="page together" :class="{ chatting: tg.isGroup.value && tab === 'chat' }">
    <!-- ================= A SOLO TRIP ================= -->
    <section v-if="!tg.isGroup.value" class="solo" aria-labelledby="tg-solo">
      <div class="card solo-card">
        <div class="solo-art art-frame">
          <SceneArt class="scene" :scene="v.trip.value.cover.scene" :tod="v.trip.value.cover.tod" :label="title" :lazy="false" />
          <div class="scrim" />
        </div>
        <div class="solo-in">
          <p class="kicker">
            Together
          </p>
          <h1 id="tg-solo" class="h2">
            Plan this trip with friends
          </h1>
          <p class="lede">
            Invite people to see the plan, change it with you, vote on options and chat.
          </p>
          <p class="small muted">
            Your ticks, costs, notes and photos stay yours.
          </p>
          <GroupNotice />
          <div class="solo-acts">
            <NuxtLink :to="{ query: { invite: '1' } }" class="btn primary lg">
              <AppIcon name="userplus" />Invite people
            </NuxtLink>
            <NuxtLink :to="{ query: { invite: '1', role: 'viewer' } }" class="btn ghost lg">
              <AppIcon name="eye" />Let people follow along
            </NuxtLink>
            <NuxtLink :to="{ query: { share: '1' } }" class="btn ghost lg">
              <AppIcon name="share" />Share a copy of the plan
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= A GROUP TRIP ================= -->
    <template v-else>
      <header class="g-head">
        <div class="g-t">
          <p class="kicker">
            {{ title }}
          </p>
          <h1 class="h2">
            Together
          </h1>
        </div>
        <AvatarStack v-if="people.length" :people="people" :max="4" :size="32" label="In this trip" />
        <NuxtLink v-if="tg.canEdit.value" :to="{ query: { ...route.query, invite: '1' } }" class="btn sm primary inv">
          <AppIcon name="userplus" size="sm" />Invite
        </NuxtLink>
      </header>

      <GroupNotice :quiet-offline="tab === 'chat'" />

      <div class="seg block tabs" role="group" aria-label="Together">
        <button v-for="t in TABS" :key="t.key" type="button" :aria-pressed="tab === t.key" @click="setTab(t.key)">
          <AppIcon :name="t.icon" size="sm" />{{ t.label }}
          <template v-if="t.key === 'chat' && unread && tab !== 'chat'">
            <span class="badge num" aria-hidden="true">{{ unread }}</span><span class="sr-only">, {{ unread }} new</span>
          </template>
        </button>
      </div>

      <GroupChat v-if="tab === 'chat'" />
      <GroupPeople v-else-if="tab === 'people'" />
      <GroupDecide v-else />
    </template>
  </div>
</template>

<style scoped>
.together { padding-top: 14px; max-width: 760px; }
/* The chat's composer is fixed above the tab bar; the chat makes room for it itself. */
.together.chatting { padding-bottom: calc(var(--tab-h) + var(--safe-b) + 12px); }

.solo-card { overflow: hidden; }
.solo-art { height: 150px; }
.solo-in { display: flex; flex-direction: column; gap: 10px; padding: 16px; }
.lede { font-size: 16px; line-height: 1.5; }
.solo-acts { display: flex; flex-direction: column; gap: 10px; margin-top: 6px; }
.solo-acts .btn { white-space: normal; text-align: center; }

.g-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.g-t { flex: 1 1 auto; min-width: 0; }
.g-t .kicker { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g-head :deep(.stack) { flex: none; }
.inv { flex: none; }
.tabs { margin: 10px 0 14px; }
.tabs button { min-height: 44px; position: relative; }
.badge { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: var(--bad); color: var(--bg); font-size: 11.5px; font-weight: 700; }
@media (min-width: 900px) {
  .together.chatting { padding-bottom: 24px; }
}
</style>
