<script setup lang="ts">
import { gameNumeral, type GameRank } from '#shared/utils/game'

/** Your Roman rank, like a passport cover (spec 4.5): the rank, its gloss and line, stamps to the next, badges. */
const props = defineProps<{
  rank: GameRank
  /** Badges earned, of `total` the trip offers. */
  earned: number
  total: number
}>()

const id = useId()
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const stamps = computed(() => plural(props.rank.stamps, 'stamp', 'stamps'))
const progress = computed(() => (props.rank.next ? `${stamps.value} · ${props.rank.toNext} more to ${props.rank.next.name}` : stamps.value))
const line = computed(() => (props.rank.next ? props.rank.line : 'The top rank. Veni, vidi, vici.'))
/** How far the stamps are towards the next rank's count (full at the top). */
const fill = computed(() => {
  const r = props.rank
  if (!r.next) return 100
  return Math.max(0, Math.min(100, Math.round((r.stamps / r.next.min) * 100)))
})
</script>

<template>
  <section class="rank" :aria-labelledby="`${id}-name`">
    <div class="in">
      <div class="head">
        <p class="num-r">
          Rank {{ gameNumeral(rank.n) }}
        </p>
        <AppIcon name="laurel" class="laurel" />
      </div>
      <h2 :id="`${id}-name`" class="name">
        {{ rank.name }}
      </h2>
      <p class="gloss">
        {{ rank.gloss }}
      </p>
      <p class="line">
        {{ line }}
      </p>
      <span class="bar" aria-hidden="true"><i :style="{ width: `${fill}%` }" /></span>
      <p class="meta">
        {{ progress }}
      </p>
      <p class="meta">
        {{ earned }} of {{ plural(total, 'badge', 'badges') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.rank { background: var(--rank-bg); color: var(--rank-ink); border-radius: var(--r-lg); padding: 6px; box-shadow: var(--shadow); }
.in { border: 1px solid color-mix(in srgb, var(--rank-ink) 40%, transparent); border-radius: 13px; padding: 14px 16px 15px; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.num-r { font-family: var(--font-display); font-weight: 700; font-size: 12.5px; letter-spacing: .2em; text-transform: uppercase; }
.laurel { width: 34px; height: 34px; stroke-width: 1.5; flex: none; }
.name { font-family: var(--font-display); font-weight: 700; font-size: clamp(23px, 7.4vw, 30px); letter-spacing: .12em; text-transform: uppercase; line-height: 1.1; margin-top: 2px; overflow-wrap: anywhere; }
/* Upright: only the upright Instrument Sans is loaded, and a slanted copy of it is a fake italic. */
.gloss { font-size: 15px; letter-spacing: .02em; margin-top: 2px; }
.line { font-size: 14px; margin-top: 10px; }
.bar { display: block; height: 6px; border-radius: 999px; background: color-mix(in srgb, var(--rank-ink) 24%, transparent); margin: 14px 0 9px; overflow: hidden; }
.bar > i { display: block; height: 100%; border-radius: inherit; background: var(--rank-ink); transition: width .4s ease; }
.meta { font-size: 13.5px; font-weight: 600; }
.meta + .meta { margin-top: 2px; }
</style>
