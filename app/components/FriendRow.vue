<script lang="ts">
import type { CardTrip, FriendCard, Profile } from '#shared/types/social'
import { socialOverlap, socialSamePlace } from '#shared/utils/social'
import { fmtDate } from '#shared/utils/time'
import { useSocial } from '~/composables/useSocial'

/**
 * Reads someone's card again (useSocial keeps the one it read first): a screen about one person shows what they have
 * now (a new handle, a line about them). Keeps what was known when it can't be read.
 */
export async function refreshPerson(social: ReturnType<typeof useSocial>, uid: string): Promise<Profile | null> {
  try {
    const p = await social.api().getProfile(uid)
    if (p) social.people.value = { ...social.people.value, [uid]: p }
    return p
  }
  catch {
    return social.people.value[uid] ?? null
  }
}

/** Someone's request was answered: its "wants to be friends" lines in Activity are read (and the dots go). */
export function readRequestLines(social: ReturnType<typeof useSocial>, uid: string) {
  const ids = social.inbox.value.filter(i => i.kind === 'friend-request' && i.from === uid && !i.read).map(i => i.id)
  if (!ids.length) return
  try {
    void social.api().markRead(ids).catch(() => {})
  }
  catch { /* not ready: they stay unread for now */ }
}

/** Today as friends' cards count it (useSocial: the device's date in UTC). */
export function cardToday(): string {
  return new Date().toISOString().slice(0, 10)
}

/** "10 to 12 Oct", "30 Sep to 2 Oct", or "12 Oct" for one day. */
export function rangeTo(start: string, end: string): string {
  if (!start) return ''
  if (!end || end <= start) return fmtDate(start, 'dayMonth')
  if (start.slice(0, 7) === end.slice(0, 7)) return `${Number(start.slice(8, 10))} to ${fmtDate(end, 'dayMonth')}`
  return `${fmtDate(start, 'dayMonth')} to ${fmtDate(end, 'dayMonth')}`
}

/** A friend's trip in one line: "In Rome until 12 Oct" while they're there, else "Lisbon, 20 to 24 Oct". */
export function tripLine(t: CardTrip, today: string): string {
  if (t.start <= today && today <= t.end) return `In ${t.destination} until ${fmtDate(t.end, 'dayMonth')}`
  return `${t.destination}, ${rangeTo(t.start, t.end)}`
}

/** What a friend's card says about where they're going: their trip now, else the next one; '' when they don't share. */
export function cardLine(card: FriendCard | null | undefined, today: string): string {
  if (!card?.showTrips) return ''
  const trips = [...(card.trips ?? [])].sort((a, b) => a.start.localeCompare(b.start))
  const t = trips.find(x => x.start <= today && today <= x.end) ?? trips.find(x => x.start > today)
  return t ? tripLine(t, today) : ''
}

export interface BothThere {
  destination: string
  start: string
  end: string
}

/** Where you and a friend are in the same place on the same days (each of your trips against each of theirs). */
export function bothThere(mine: readonly { destination: string, start: string, end: string }[], theirs: readonly CardTrip[]): BothThere[] {
  const out: BothThere[] = []
  for (const t of theirs) {
    for (const m of mine) {
      if (!m.start || !m.end || !socialSamePlace(t.destination, m.destination) || !socialOverlap(t.start, t.end, m.start, m.end)) continue
      const hit = { destination: t.destination, start: t.start > m.start ? t.start : m.start, end: t.end < m.end ? t.end : m.end }
      if (!out.some(o => o.start === hit.start && o.end === hit.end && socialSamePlace(o.destination, hit.destination))) out.push(hit)
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start))
}
</script>

<script setup lang="ts">
/**
 * A person in a list of the friends screens: face, name, @handle and a line ("In Rome until 12 Oct"). With `open` the
 * whole row is a button that opens them (?friend=<uid>); otherwise the default slot holds the row's own buttons.
 */
const props = withDefaults(defineProps<{
  uid: string
  /** Name and photo to show until their profile is known (a request, a comment). */
  fallback?: { name?: string, photo?: string | null }
  line?: string
  open?: boolean
  /** Hide the @handle. */
  noHandle?: boolean
}>(), { fallback: undefined, line: '', open: false, noHandle: false })
const emit = defineEmits<{ open: [uid: string] }>()

const social = useSocial()
const person = computed(() => social.personRef(props.uid, props.fallback))
const handle = computed(() => (props.noHandle ? '' : social.people.value[props.uid]?.handle ?? ''))
// Someone not read yet: read their card once (a request from a stranger, a friend just added).
watch(() => [props.uid, social.ready.value] as const, ([uid, ready]) => {
  if (ready && !social.people.value[uid]) void social.person(uid)
}, { immediate: true })
</script>

<template>
  <button v-if="open" class="frow tap" type="button" @click="emit('open', uid)">
    <Avatar :person="person" :size="44" />
    <span class="fb">
      <b class="ellipsis">{{ person.name }}</b>
      <span v-if="handle" class="small muted ellipsis">@{{ handle }}</span>
      <span v-if="line" class="small line">{{ line }}</span>
    </span>
    <AppIcon name="chevr" class="chev" />
  </button>
  <div v-else class="frow top">
    <Avatar :person="person" :size="44" />
    <div class="fb">
      <b class="ellipsis">{{ person.name }}</b>
      <span v-if="handle" class="small muted ellipsis">@{{ handle }}</span>
      <span v-if="line" class="small line">{{ line }}</span>
      <div v-if="$slots.default" class="facts">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.frow { display: flex; align-items: center; gap: 12px; width: 100%; min-width: 0; min-height: 64px; padding: 10px 14px; border: 0; background: none; color: var(--fg); font: inherit; text-align: left; }
.tap { cursor: pointer; }
.tap:hover { background: var(--surface-2); }
/* Lists clip their corners, so the focus ring goes inside the row. */
.tap:focus-visible { outline-offset: -3px; }
.fb { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; line-height: 1.3; }
.fb b { font-size: 15.5px; }
.line { color: var(--fg-2); font-weight: 600; overflow-wrap: anywhere; }
.chev { color: var(--fg-3); }
.frow.top { align-items: flex-start; }
.facts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
</style>
