<script setup lang="ts">
import type { PlaceCard } from '#shared/types/trip'
import { fmtDistance } from '#shared/utils/geo'
import { placeIsCollectable, placeNeedsBooking, placeOpenOn, placeSetOf, placeStampDate } from '#shared/utils/places'

/**
 * A place in the collection (spec 4.3): one button that opens its sheet (?place=<id>), at most 200 px tall.
 * Scene art (with "Top", or why the place isn't collectable), the name, one key fact and one status line.
 * Used inside a trip page: stamps, the plan and today come from the trip view.
 */
const props = defineProps<{
  place: PlaceCard
  /** Metres from you, when your location is on: added to the status line. */
  distance?: number | null
  /**
   * Its set on the art ("Piazzas & views", "Morning light"): in the flat view (search, Near me), where no set
   * header tells a sight from the photo spot of the same name.
   */
  showSet?: boolean
}>()

const v = useTripView()
const sheet = useQueryState('place')

const VERDICT: Partial<Record<NonNullable<PlaceCard['verdict']>, string>> = { worth: 'Worth it', split: 'Mixed reviews', over: 'Overrated' }

const collectable = computed(() => placeIsCollectable(props.place))
const stamp = computed(() => v.stamps.value.get(props.place.id))
const stampDate = computed(() => (stamp.value && v.trip.value ? placeStampDate(v.trip.value, stamp.value) : ''))
const verdict = computed(() => (props.place.verdict ? VERDICT[props.place.verdict] ?? '' : ''))
const setMeta = computed(() => (props.showSet ? PLACE_SET_META[placeSetOf(props.place)] : null))

/** The one key fact: a sight's price, a food place's price (else its verdict), a photo spot's best time. */
const fact = computed(() => {
  const p = props.place
  if (p.category === 'photo') return p.bestTime ?? ''
  if (p.category === 'food') return p.price || verdict.value
  return p.price ?? ''
})

interface Status { text: string, tone: string, icon?: string }

/** The status line, first match wins. Places outside the collection show their chip instead. */
const status = computed<Status | null>(() => {
  const p = props.place
  const t = v.trip.value
  if (!collectable.value || !t) return null
  if (stamp.value) return { text: 'Stamped', tone: 'got', icon: 'stamp' }
  const today = v.today.value?.view.day.id
  if (today && placeOpenOn(p, t, today) === 'closed') return { text: 'Closed today', tone: 'bad', icon: 'x' }
  const hit = v.inPlan.value.get(p.id)
  if (hit) return { text: `In your plan · ${fmtDate(hit.date, 'weekday')} ${fmtClock(hit.start)}`, tone: 'plan', icon: 'calendar' }
  if (placeNeedsBooking(p)) return { text: 'Book ahead', tone: 'warn', icon: 'ticket' }
  // A photo spot's best time is already its key fact, and a verdict may be too.
  if (p.bestTime && p.category !== 'photo') return { text: `Best ${p.bestTime}`, tone: 'plain', icon: 'clock' }
  if (p.category === 'food' && verdict.value && fact.value !== verdict.value) return { text: verdict.value, tone: `v-${p.verdict}` }
  return null
})

const away = computed(() => (typeof props.distance === 'number' && Number.isFinite(props.distance) ? fmtDistance(props.distance) : ''))

// The stamp presses onto the card only when it appears while the card is on screen, not when the card first shows.
const press = ref(false)
watch(() => !!stamp.value, (got, had) => {
  press.value = got && !had
})
</script>

<template>
  <button
    type="button"
    class="tile"
    :class="{ top: place.top, dim: !collectable, got: !!stamp }"
    :data-place="place.id"
    @click="sheet.open(place.id)"
  >
    <span class="pic art-frame" aria-hidden="true">
      <SceneArt class="scene" :scene="place.scene" :tod="place.tod ?? 'day'" />
    </span>
    <span v-if="place.top || !collectable || setMeta" class="flags">
      <span v-if="setMeta" class="chip set"><AppIcon :name="setMeta.icon" />{{ setMeta.label }}</span>
      <span v-if="!collectable" class="chip" :class="place.verdict === 'trap' ? 't-bad' : 'shut'">{{ place.verdict === 'trap' ? 'Tourist trap' : 'Closed' }}</span>
      <span v-if="place.top" class="chip t-gold"><AppIcon name="star" />Top</span>
    </span>
    <span v-if="stamp" class="mark" aria-hidden="true">
      <StampMark :place="place" :date="stampDate" :size="58" :press="press" />
    </span>
    <span class="body">
      <span class="name">{{ place.name }}</span>
      <span v-if="fact" class="fact tnum">{{ fact }}</span>
      <span v-if="status" class="status tnum" :class="`s-${status.tone}`">
        <AppIcon v-if="status.icon" :name="status.icon" size="xs" />{{ status.text }}<span v-if="away" class="away"> · {{ away }}</span>
      </span>
      <span v-else-if="away" class="status tnum s-plain">{{ away }}</span>
    </span>
  </button>
</template>

<style scoped>
.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-height: 200px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  text-align: left;
  font: inherit;
  color: var(--fg);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform .12s ease, box-shadow .15s ease;
}
.tile:active { transform: scale(.985); }
/* Top picks: a 2 px gold rim (the border plus a ring), drawn the same in every browser. */
.tile.top { border-color: var(--gold-rim); box-shadow: 0 0 0 1px var(--gold-rim), var(--shadow); }
.pic { display: block; flex: none; height: 88px; }
.flags { position: absolute; left: 7px; top: 7px; right: 7px; display: flex; flex-wrap: wrap; gap: 4px; pointer-events: none; }
.flags .chip { min-height: 22px; padding: 1px 8px; font-size: 11.5px; }
.flags .chip .i { width: 12px; height: 12px; }
.flags .chip.set { background: var(--surface); color: var(--fg); }
/* "Closed" in readable grey (the t-closed chip is under 4.5:1). */
.chip.shut { background: var(--surface-2); color: var(--fg-2); }
/* The stamp over the art's corner, on a round patch of card so its ink always reads. */
.mark {
  position: absolute;
  right: 1px;
  top: 28px;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(closest-side, var(--surface) 82%, transparent);
  pointer-events: none;
}
.body { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 8px 10px 10px; }
.name {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 14.5px;
  font-weight: 650;
  line-height: 1.22;
}
.fact { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 12.5px; line-height: 1.35; color: var(--fg-2); }
.status {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.3;
}
.status .i { width: 12px; height: 12px; margin-right: 3px; vertical-align: -2px; stroke-width: 2.2; }
.away { font-weight: 600; color: var(--fg-2); }
.s-got { color: var(--gold-ink); }
.s-bad { color: var(--bad); }
.s-plan { color: var(--accent); }
.s-warn { color: var(--warn); }
.s-plain { color: var(--fg-2); }
.s-v-worth { color: var(--ok); }
.s-v-split { color: var(--gold-ink); }
.s-v-over { color: var(--warn); }
/* Not in the collection (a tourist trap, a closed place): grey art and a quieter card, text still readable. */
.dim { box-shadow: none; }
.dim .pic { filter: grayscale(.75); }
.dim .name { color: var(--fg-2); }
</style>
