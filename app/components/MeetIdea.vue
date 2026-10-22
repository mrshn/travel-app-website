<script lang="ts">
import type { MeetIdea, Trip } from '#shared/types/trip'

const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`

/**
 * Ways to meet people in any city (Meet people, spec 5.9), for a trip without its own ideas (Trip.meet): each with a
 * search for the destination. Their ids start "any-", which a trip's own ideas never use (tests/seeds.test.ts).
 */
export function meetGeneralIdeas(destination: string): MeetIdea[] {
  const at = destination.trim() || 'town'
  return [
    {
      id: 'any-hostel',
      kind: 'event',
      icon: 'bed',
      title: 'Hostel events',
      text: 'Social hostels run free walks, quiz nights, pub crawls and parties, and many welcome travellers staying elsewhere. Ask at the desk, or sit at the bar and say hi.',
      when: 'Most evenings',
      link: { label: 'Find events', url: google(`${at} hostel events this week`) },
      ask: 'Anyone up for the hostel bar tonight?',
    },
    {
      id: 'any-walk',
      kind: 'tour',
      icon: 'walk',
      title: 'A free walking tour',
      text: 'You tip what it was worth at the end. Small, friendly groups, and the guide knows where to eat afterwards.',
      when: 'Most mornings and afternoons',
      link: { label: 'Find a tour', url: google(`free walking tour ${at} GuruWalk`) },
      ask: `Anyone for a free walking tour of ${at} at 10:00?`,
    },
    {
      id: 'any-crawl',
      kind: 'event',
      icon: 'glass',
      title: 'A pub crawl',
      text: 'A guide, a few bars and a ready-made group for the night. Keep the noise down in the street, and get home with a friend.',
      when: 'Most nights, from about 21:00',
      link: { label: 'Find a crawl', url: google(`${at} pub crawl`) },
      ask: 'Anyone for a pub crawl tonight?',
    },
    {
      id: 'any-language',
      kind: 'event',
      icon: 'chat',
      title: 'A language exchange',
      text: 'Locals practising English and travellers practising the local language, usually in a bar: easy conversations with people who live there.',
      when: 'Often early in the week',
      link: { label: 'Find one', url: google(`${at} language exchange this week`) },
      ask: `Anyone going to a language exchange in ${at}?`,
    },
    {
      id: 'any-aperitivo',
      kind: 'place',
      icon: 'glass',
      title: 'Aperitivo or happy hour',
      text: 'Early evening drinks at a busy bar: easy to start a chat at the counter, and a good first place to meet someone from an app.',
      when: 'Early evening, from about 19:00',
      link: { label: 'Find a bar', url: google(`aperitivo happy hour bars ${at}`) },
      ask: 'Anyone for a drink at 19:00?',
    },
    {
      id: 'any-food',
      kind: 'tour',
      icon: 'food',
      title: 'A food tour',
      text: 'Dinner with a small group and a guide who knows the food: you finish with full plates and people to go out with.',
      when: 'Evenings: book a day ahead',
      link: { label: 'Find a tour', url: google(`${at} evening food tour`) },
      ask: `Anyone booked on a food tour in ${at}?`,
    },
    {
      id: 'any-apps',
      kind: 'app',
      icon: 'users',
      title: 'Meetup apps',
      text: 'Hostelworld\'s City Chat (if you stay in a hostel), Meetup groups and Bumble BFF: post a plan with a time and a place, and see who joins.',
      when: 'Any time',
      link: { label: 'Find groups', url: google(`${at} meetup events for travellers`) },
      ask: `Anyone in ${at} fancy meeting up?`,
    },
  ]
}

/** The trip's own ways to meet people, else the general ones for its destination. */
export function meetIdeasFor(trip: Pick<Trip, 'meet' | 'destination' | 'title'>): MeetIdea[] {
  return trip.meet?.length ? trip.meet : meetGeneralIdeas(trip.destination || trip.title)
}

/** The first clock time in a line ("Fri 9 Oct, 21:30 (it runs nightly)" is 1290), or null. */
export function meetClockIn(text?: string): number | null {
  const m = /(?:^|[^\d])([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)/.exec(text ?? '')
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** How each kind of idea looks: a word and a colour token. */
export const MEET_KIND: Record<MeetIdea['kind'], { label: string, color: string, icon: string }> = {
  event: { label: 'Event', color: 'var(--c-night)', icon: 'glass' },
  tour: { label: 'Tour', color: 'var(--c-sight)', icon: 'walk' },
  app: { label: 'App', color: 'var(--c-move)', icon: 'phone' },
  place: { label: 'Place', color: 'var(--c-food)', icon: 'pin' },
  tip: { label: 'Tip', color: 'var(--gold-ink)', icon: 'info' },
}
</script>

<script setup lang="ts">
/**
 * One way to meet people (Meet people, spec 5.9): what it is, when, its link, and "Ask who's in", which opens a
 * meetup made from the idea (?meetup=new&idea=<id>).
 */
const props = defineProps<{ idea: MeetIdea, day?: string }>()
const route = useRoute()
const router = useRouter()
const meta = computed(() => MEET_KIND[props.idea.kind] ?? MEET_KIND.tip)

function ask() {
  void router.push({ query: { ...route.query, meetup: 'new', idea: props.idea.id } })
}
</script>

<template>
  <article class="idea card" :data-idea="idea.id">
    <div class="ih">
      <span class="ic" :style="{ color: meta.color }" aria-hidden="true"><AppIcon :name="idea.icon || meta.icon" /></span>
      <div class="ih-t">
        <h3 class="it">
          {{ idea.title }}
        </h3>
        <p v-if="idea.when || day" class="small when tnum">
          <AppIcon name="clock" size="xs" /><span>{{ [day, idea.when].filter(Boolean).join(' · ') }}</span>
        </p>
      </div>
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p class="tx" v-html="inlineMd(idea.text)" />
    <div class="acts">
      <a v-if="idea.link" class="btn sm ghost" :href="idea.link.url" target="_blank" rel="noopener">
        <AppIcon name="ext" size="sm" />{{ idea.link.label }}
      </a>
      <button class="btn sm" type="button" @click="ask">
        <AppIcon name="hand" size="sm" />Ask who's in
      </button>
    </div>
  </article>
</template>

<style scoped>
.idea { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.ih { display: flex; align-items: flex-start; gap: 12px; }
.ic { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, currentColor 12%, var(--surface)); }
.ih-t { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding-top: 1px; }
.it { font-size: 16px; font-weight: 650; line-height: 1.3; overflow-wrap: anywhere; }
.when { display: flex; align-items: flex-start; gap: 5px; color: var(--fg-2); line-height: 1.35; }
.when .i { margin-top: 2px; }
.tx { font-size: 14.5px; line-height: 1.5; overflow-wrap: anywhere; }
.tx :deep(strong) { font-weight: 700; }
.tx :deep(a) { font-weight: 600; }
.acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
</style>
