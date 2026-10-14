<script setup lang="ts">
/**
 * The trip header's Together button (docs/design/2026-10-14-together.md, T14 and 5.1): a person-plus on a solo trip
 * ("Plan with friends"), the members' faces on a group trip with a red dot for unread messages. Both open Together.
 */
const v = useTripView()
const tg = useTripGroup()

const to = computed(() => `/trips/${v.id.value}/group`)
const people = computed(() => tg.members.value)
const unread = computed(() => tg.unread.value)
/** "Together: 4 people, 2 new messages". */
const label = computed(() => {
  const n = people.value.length
  const u = unread.value
  const parts = [n ? `${n} ${n === 1 ? 'person' : 'people'}` : '', u ? `${u} new ${u === 1 ? 'message' : 'messages'}` : ''].filter(Boolean)
  return parts.length ? `Together: ${parts.join(', ')}` : 'Together'
})
</script>

<template>
  <NuxtLink v-if="!tg.isGroup.value" :to="to" class="btn icon plain round tgb" aria-label="Plan with friends" title="Plan with friends">
    <AppIcon name="userplus" />
  </NuxtLink>
  <NuxtLink v-else :to="to" class="tgb faces" :aria-label="label" :title="label">
    <GroupFaces v-if="people.length" :people="people" :max="3" :size="24" />
    <AppIcon v-else name="users" />
    <span v-if="unread" class="unread-dot" aria-hidden="true" />
  </NuxtLink>
</template>

<style scoped>
.tgb { flex: none; }
.faces {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0 6px;
  border-radius: 999px;
  color: var(--fg-2);
  text-decoration: none;
}
.faces:hover { background: var(--surface-2); }
/* The faces sit on the header's colour, so their rings take it too. */
.faces :deep(.av.ring) { box-shadow: 0 0 0 2px var(--bg); }
.unread-dot { position: absolute; top: 6px; right: 3px; width: 10px; height: 10px; border-radius: 50%; background: var(--bad); border: 2px solid var(--bg); }
</style>
