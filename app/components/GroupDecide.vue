<script setup lang="ts">
import type { ResolvedStop } from '#shared/utils/plan'
import { socialFirstName } from '#shared/utils/social'

/**
 * Together's Decide (docs/design/2026-10-14-together.md, 5.1 and 13): the plan's option stops still ahead with their
 * votes and the group's pick (picking one here votes, as in the stop sheet), the ones already past folded away under
 * Earlier, then the next stops with who's in.
 */
const v = useTripView()
const tg = useTripGroup()
const stopSheet = useQueryState('stop')

interface Item { stop: ResolvedStop, when: string }
const when = (date: string, s: ResolvedStop) => `${fmtDate(date, 'short')} · ${fmtClock(s.start)}`
const AHEAD = new Set(['now', 'next', 'upcoming'])

/** Every option stop of the plan, in order, and whether it is still ahead (not done, skipped or gone by). */
const all = computed<(Item & { ahead: boolean })[]>(() => v.plans.value.flatMap(p => p.stops
  .filter(s => !!s.base.options?.choices.length)
  .map(s => ({ stop: s, when: when(p.view.day.date, s), ahead: AHEAD.has(p.states[s.id] ?? 'upcoming') }))))
/** What there is still to decide; once nothing is ahead (after the trip), everything, so the votes stay readable. */
const options = computed<Item[]>(() => {
  const ahead = all.value.filter(o => o.ahead)
  return ahead.length ? ahead : all.value
})
/** Options already past while others are still ahead: folded under Earlier. */
const earlier = computed<Item[]>(() => (all.value.some(o => o.ahead) ? all.value.filter(o => !o.ahead) : []))

/** "Pub crawl 3, Hostel party 1": the votes so far, most first. */
function tallyLine(s: ResolvedStop): string {
  const t = tg.votesFor(s.id)
  return [...t.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([id, uids]) => `${s.base.options!.choices.find(c => c.id === id)?.label ?? 'Another choice'} ${uids.length}`)
    .join(', ')
}

/** What's coming up (not done or skipped), with who's in: at most eight. */
const next = computed(() => {
  const out: (Item & { going: ReturnType<typeof tg.goingFor> })[] = []
  for (const p of v.plans.value) {
    for (const s of p.stops) {
      const st = p.states[s.id]
      if (s.minor || (st !== 'now' && st !== 'next' && st !== 'upcoming')) continue
      out.push({ stop: s, when: when(p.view.day.date, s), going: tg.goingFor(s.id) })
      if (out.length >= 8) return out
    }
  }
  return out
})
const people = (uids: string[]) => uids.map(u => tg.member(u))
const names = (uids: string[]) => people(uids).map(p => socialFirstName(p.name)).join(', ')
</script>

<template>
  <div class="decide">
    <section aria-labelledby="dc-opts">
      <h2 id="dc-opts" class="gh">
        Options to vote on
      </h2>
      <p class="small muted lede">
        Your pick is your vote. The group pick is what the plan shows for everyone who hasn't picked.
      </p>
      <div v-if="options.length" class="opts">
        <article v-for="o in options" :key="o.stop.id" class="card pad opt">
          <div class="o-h">
            <span class="kicker tnum">{{ o.when }}</span>
            <button class="btn sm plain" type="button" :aria-label="`Open ${o.stop.base.options!.label}`" @click="stopSheet.open(o.stop.id)">
              Open<AppIcon name="chevr" size="sm" />
            </button>
          </div>
          <ChoicePicker :stop="o.stop" compact @choose="(c) => v.choose(o.stop.id, c)" />
          <p v-if="tallyLine(o.stop)" class="small muted tally">
            Votes: {{ tallyLine(o.stop) }}
          </p>
        </article>
      </div>
      <p v-else class="card pad small muted">
        This plan has no options to vote on. When it does, they show here.
      </p>
      <details v-if="earlier.length" class="earlier">
        <summary class="btn sm ghost">
          <AppIcon name="chev" size="sm" class="ec" />Earlier · {{ earlier.length }}
        </summary>
        <div class="opts">
          <article v-for="o in earlier" :key="o.stop.id" class="card pad opt past">
            <div class="o-h">
              <span class="kicker tnum">{{ o.when }}</span>
              <button class="btn sm plain" type="button" :aria-label="`Open ${o.stop.base.options!.label}`" @click="stopSheet.open(o.stop.id)">
                Open<AppIcon name="chevr" size="sm" />
              </button>
            </div>
            <ChoicePicker :stop="o.stop" compact @choose="(c) => v.choose(o.stop.id, c)" />
            <p v-if="tallyLine(o.stop)" class="small muted tally">
              Votes: {{ tallyLine(o.stop) }}
            </p>
          </article>
        </div>
      </details>
    </section>

    <section aria-labelledby="dc-next">
      <h2 id="dc-next" class="gh">
        Who's in next
      </h2>
      <ul v-if="next.length" class="card rows nx">
        <li v-for="n in next" :key="n.stop.id">
          <button class="row-item nrow" type="button" @click="stopSheet.open(n.stop.id)">
            <span class="grow n-t">
              <span class="small muted tnum">{{ n.when }}</span>
              <b>{{ n.stop.title }}</b>
              <span v-if="n.going.in.length || n.going.maybe.length" class="n-who">
                <template v-if="n.going.in.length">
                  <AvatarStack :people="people(n.going.in)" :max="4" :size="22" label="In" />
                  <span class="small">In: {{ names(n.going.in) }}</span>
                </template>
                <span v-if="n.going.maybe.length" class="small muted">Maybe: {{ names(n.going.maybe) }}</span>
              </span>
              <span v-else class="small muted">Nobody has said yet</span>
            </span>
            <AppIcon name="chevr" size="sm" class="n-go" />
          </button>
        </li>
      </ul>
      <p v-else class="card pad small muted">
        Nothing left to plan on this trip.
      </p>
    </section>
  </div>
</template>

<style scoped>
.decide { display: flex; flex-direction: column; gap: 22px; }
.gh { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 4px 8px; }
.lede { margin: -2px 4px 10px; }
.opts { display: flex; flex-direction: column; gap: 12px; }
.opt { display: flex; flex-direction: column; gap: 8px; }
.o-h { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: -6px; }
.tally { padding: 0 2px; }
.earlier { margin-top: 12px; }
.earlier > summary { list-style: none; cursor: pointer; width: fit-content; }
.earlier > summary::-webkit-details-marker { display: none; }
.earlier .ec { transition: transform .15s ease; }
.earlier[open] .ec { transform: rotate(180deg); }
.earlier[open] > summary { margin-bottom: 12px; }
.rows { list-style: none; overflow: hidden; }
.nrow { align-items: center; min-height: 56px; padding: 10px 14px; }
.nrow:focus-visible { outline-offset: -3px; }
.n-t { display: flex; flex-direction: column; gap: 3px; min-width: 0; line-height: 1.3; }
.n-t b { font-size: 15px; }
.n-who { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; }
.n-go { flex: none; color: var(--fg-3); }
</style>
