<script setup lang="ts">
import type { Going } from '#shared/types/social'
import type { ResolvedStop } from '#shared/utils/plan'
import { socialFirstName } from '#shared/utils/social'
import { groupErrorLine } from './GroupNotice.vue'

/**
 * The stop sheet in a group trip (docs/design/2026-10-14-together.md, 5.4): "Who's in?" with I'm in, Maybe and
 * Not me, the faces of each, and Send to chat. Not for small logistics steps.
 */
const props = defineProps<{ stop: ResolvedStop }>()
const v = useTripView()
const tg = useTripGroup()
const titleId = useId()

const show = computed(() => tg.isGroup.value && !props.stop.minor)
const mine = computed(() => tg.myGoing(props.stop.id))
const CHOICES: { going: Going, label: string, icon: string }[] = [
  { going: 'in', label: 'I\'m in', icon: 'check' },
  { going: 'maybe', label: 'Maybe', icon: 'circle' },
  { going: 'out', label: 'Not me', icon: 'x' },
]
const LABEL: Record<Going, string> = { in: 'In', maybe: 'Maybe', out: 'Not me' }
const rows = computed(() => {
  const g = tg.goingFor(props.stop.id)
  return (['in', 'maybe', 'out'] as const)
    .map(k => ({ going: k, label: LABEL[k], people: g[k].map(uid => tg.member(uid)) }))
    .filter(r => r.people.length)
})
const names = (people: { name: string }[]) => people.map(p => socialFirstName(p.name)).join(', ')

const busy = ref(false)
async function set(g: Going) {
  if (busy.value) return
  busy.value = true
  try {
    await tg.rsvp(props.stop.id, mine.value === g ? null : g)
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
  finally {
    busy.value = false
  }
}

/** "Fri 9 Oct · 17:15": when the stop is, as it reads in the chat. */
const when = computed(() => {
  const d = v.trip.value?.days.find(x => x.id === props.stop.dayId)
  return [d ? fmtDate(d.date, 'short') : '', fmtClock(props.stop.start)].filter(Boolean).join(' · ')
})
const sending = ref(false)
async function sendToChat() {
  if (sending.value) return
  sending.value = true
  try {
    await tg.send({ kind: 'stop', text: '', stopId: props.stop.id, stopTitle: props.stop.title, stopWhen: when.value })
    const id = v.id.value
    toast('Sent to the group chat', { tone: 'ok', action: { label: 'Open chat', run: () => void navigateTo({ path: `/trips/${id}/group`, query: { tab: 'chat' } }) } })
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <section v-if="show" class="st-tog" :aria-labelledby="titleId">
    <div class="st-h">
      <h3 :id="titleId" class="h3">
        Who's in?
      </h3>
      <button class="btn sm ghost" type="button" @click="sendToChat">
        <AppIcon name="send" size="sm" />Send to chat
      </button>
    </div>
    <div class="seg block going" role="group" aria-label="Are you in?">
      <button v-for="c in CHOICES" :key="c.going" type="button" :aria-pressed="mine === c.going" @click="set(c.going)">
        <AppIcon :name="c.icon" size="sm" />{{ c.label }}
      </button>
    </div>
    <ul v-if="rows.length" class="who">
      <li v-for="r in rows" :key="r.going">
        <b class="w-l">{{ r.label }}</b>
        <GroupFaces :people="r.people" :max="5" :size="26" :label="r.label" />
        <span class="small muted w-n">{{ names(r.people) }}</span>
      </li>
    </ul>
    <p v-else class="small muted">
      Nobody has said yet.
    </p>
  </section>
</template>

<style scoped>
.st-tog { display: flex; flex-direction: column; gap: 10px; padding: 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.st-h { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.going button { min-height: 44px; }
/* Pressed: the app's accent, so "I'm in" reads at a glance. */
.going button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); }
.who { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.who li { display: flex; align-items: center; gap: 10px; min-width: 0; }
.w-l { flex: none; width: 52px; font-size: 13.5px; }
.w-n { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
