<script setup lang="ts">
import { socialFirstName } from '#shared/utils/social'

/**
 * Now, during a group trip (docs/design/2026-10-14-together.md, 5.4): one line of the group's faces and statuses
 * ("Ali: At Pantheon · Can: Home safe") and the unread messages; a tap opens the chat.
 */
const v = useTripView()
const tg = useTripGroup()

const others = computed(() => tg.members.value.filter(m => m.uid !== tg.me.value?.uid))
/** The others' statuses, newest first. */
const line = computed(() => others.value
  .map(m => ({ m, s: tg.statusOf(m.uid) }))
  .filter(x => !!x.s)
  .sort((a, b) => b.s!.at - a.s!.at)
  .map(x => `${socialFirstName(x.m.name)}: ${x.s!.text}`)
  .join(' · '))
const show = computed(() => tg.isGroup.value && v.moment.value?.phase === 'during')
const unread = computed(() => tg.unread.value)
</script>

<template>
  <NuxtLink v-if="show" :to="{ path: `/trips/${v.id.value}/group`, query: { tab: 'chat' } }" class="card gstrip">
    <AvatarStack v-if="others.length" :people="others" :max="3" :size="28" label="In this trip" />
    <span v-else class="gs-ic" aria-hidden="true"><AppIcon name="users" size="sm" /></span>
    <span class="gs-t">
      <span class="gs-line">{{ line || 'Group chat' }}</span>
      <span v-if="!line" class="small muted">Nobody has said where they are yet</span>
    </span>
    <span v-if="unread" class="chip t-accent num gs-new">{{ unread }} new</span>
    <AppIcon name="chevr" size="sm" class="gs-go" />
  </NuxtLink>
</template>

<style scoped>
.gstrip { display: flex; align-items: center; gap: 10px; min-height: 52px; padding: 8px 12px; color: var(--fg); text-decoration: none; }
.gstrip:hover { background: var(--surface-2); }
.gs-ic { width: 32px; height: 32px; flex: none; display: grid; place-items: center; border-radius: 50%; background: var(--accent-soft); color: var(--accent); }
.gs-t { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.gs-line { font-size: 14.5px; font-weight: 620; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gs-new { flex: none; }
.gs-go { flex: none; color: var(--fg-3); }
</style>
