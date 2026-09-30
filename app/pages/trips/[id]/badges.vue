<script setup lang="ts">
import type { PlaceCard } from '#shared/types/trip'
import { gameNumeral, type GameBadge } from '#shared/utils/game'
import { placeStampDate } from '#shared/utils/places'

/** Your collection: the rank card, the badges and every stamp by the day it counts to (spec 4.5). */
const v = useTripView()
const trip = v.trip
const game = useGame()
const sheet = useQueryState('place')

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const fill = (b: GameBadge) => `${b.goal ? Math.min(100, Math.round((b.value / b.goal) * 100)) : 0}%`

/** "Friday · IX": the weekday and the day of the month in Roman numerals. */
function dayTitle(date: string): string {
  return date ? `${fmtDate(date, 'weekdayLong')} · ${gameNumeral(Number(date.slice(8, 10)))}` : 'Another day'
}

/** Stamps grouped by the day they count to (the 05:00 rule), days in order, stamps in the order you got them. */
const days = computed(() => {
  const t = trip.value
  if (!t) return []
  const places = new Map((t.places ?? []).map(p => [p.id, p]))
  const groups = new Map<string, { place: PlaceCard, date: string }[]>()
  for (const info of v.stamps.value.values()) {
    const place = places.get(info.placeId)
    if (!place) continue
    const date = placeStampDate(t, info)
    const list = groups.get(date) ?? []
    list.push({ place, date })
    groups.set(date, list)
  }
  // Undated stamps (an unreadable time) go last.
  const order = (d: string) => d || '9999'
  return [...groups.entries()]
    .sort((a, b) => (order(a[0]) < order(b[0]) ? -1 : order(a[0]) > order(b[0]) ? 1 : 0))
    .map(([date, stamps]) => ({ date, title: dayTitle(date), stamps }))
})
</script>

<template>
  <div v-if="trip && game" class="page badges">
    <p class="kicker">
      Your collection
    </p>
    <h1 class="h2 ttl">
      Badges
    </h1>

    <RankCard :rank="game.rank" :earned="game.earned" :total="game.badges.length" />

    <ul class="grid" aria-label="Badges">
      <li v-for="b in game.badges" :key="b.id" class="cell card" :class="{ on: b.earned }">
        <BadgeSeal :badge="b" :size="56" />
        <b class="lbl">{{ b.label }}</b>
        <span v-if="b.earned" class="st got"><AppIcon name="check" size="xs" />Earned</span>
        <template v-else>
          <span class="st">{{ b.value }} of {{ b.goal }}</span>
          <span class="bar thin meter" aria-hidden="true"><i class="gold" :style="{ width: fill(b) }" /></span>
          <span class="rule">{{ b.rule }}</span>
        </template>
      </li>
    </ul>

    <div class="sec-h">
      <h2>Stamps by day</h2>
    </div>
    <p v-if="!days.length" class="card pad none-yet">
      No stamps yet. Tick a stop you visit, or stamp a place in Places.
    </p>
    <section v-for="d in days" :key="d.date" class="day" :aria-label="d.title">
      <div class="dh">
        <h3>{{ d.title }}</h3>
        <span class="n">{{ plural(d.stamps.length, 'stamp', 'stamps') }}</span>
      </div>
      <div class="stamps">
        <button v-for="s in d.stamps" :key="s.place.id" type="button" class="stamp-btn" @click="sheet.open(s.place.id)">
          <StampMark :place="s.place" :date="s.date" :size="72" />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.badges { padding-top: 18px; }
.ttl { margin: 2px 0 14px; }
.grid { list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
.cell { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 12px 8px 12px; box-shadow: none; }
.cell.on { border-color: color-mix(in srgb, var(--gold-rim) 45%, var(--line)); }
.lbl { font-size: 13.5px; line-height: 1.25; margin-top: 4px; }
.st { font-size: 12.5px; font-weight: 650; color: var(--fg-2); }
.st.got { display: inline-flex; align-items: center; gap: 3px; color: var(--gold-ink); }
.meter { width: 100%; max-width: 72px; }
.rule { font-size: 12px; line-height: 1.3; color: var(--fg-2); margin-top: 2px; }
.none-yet { color: var(--fg-2); }
.day + .day { margin-top: 18px; }
.dh { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.dh h3 { font-family: var(--font-display); font-size: 12.5px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); }
.dh .n { font-size: 13px; color: var(--fg-2); }
.stamps { display: flex; flex-wrap: wrap; gap: 8px 10px; }
.stamp-btn { display: grid; place-items: center; padding: 2px; border: 0; border-radius: 50%; background: none; color: inherit; }
@media (min-width: 700px) {
  .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (min-width: 1000px) {
  .grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}
</style>
