<script setup lang="ts">
import type { Booking } from '#shared/types/trip'

const v = useTripView()
const trip = v.trip
const today = computed(() => v.moment.value?.local.date ?? '')
const open = ref<string | null>(null)

const groups = computed(() => {
  const t = trip.value
  if (!t) return []
  const done = (b: Booking) => !!v.progress.value.bookings[b.id]
  const byDue = (a: Booking, b: Booking) => (a.due ?? '9999').localeCompare(b.due ?? '9999')
  const now = t.bookings.filter(b => !done(b) && (b.asap || (b.due && b.due <= today.value))).sort(byDue)
  const later = t.bookings.filter(b => !done(b) && !now.includes(b)).sort(byDue)
  const finished = t.bookings.filter(done)
  return [
    { key: 'now', title: 'Do now', items: now },
    { key: 'later', title: 'Coming up', items: later },
    { key: 'done', title: 'Done', items: finished },
  ].filter(g => g.items.length)
})
const s = computed(() => v.summary.value?.bookings ?? { total: 0, done: 0 })

function toggle(b: Booking) {
  const was = !!v.progress.value.bookings[b.id]
  v.toggleBooking(b.id)
  if (!was) toast('Booked. One less thing.', { tone: 'ok', action: { label: 'Undo', run: () => v.toggleBooking(b.id, false) } })
}
</script>

<template>
  <div v-if="trip" class="page bookings">
    <header class="head">
      <div class="grow">
        <p class="kicker">
          Before you go
        </p>
        <h1 class="h2">
          Bookings
        </h1>
      </div>
      <ProgressRing :size="64" :stroke="8" :total="s.total" :segments="[{ value: s.done, color: 'var(--ok)' }]" :label="`${s.done} of ${s.total} done`">
        <b class="num small">{{ s.done }}/{{ s.total }}</b>
      </ProgressRing>
    </header>

    <div v-if="!trip.bookings.length" class="card empty">
      <AppIcon name="ticket" />
      <h3>No bookings</h3>
      <p>Tickets and reservations you need to make show up here.</p>
    </div>

    <section v-for="g in groups" :key="g.key">
      <div class="sec-h">
        <h2>{{ g.title }}</h2>
        <span class="aside">{{ g.items.length }}</span>
      </div>
      <div class="list">
        <article v-for="b in g.items" :key="b.id" class="card bk" :class="{ done: g.key === 'done' }">
          <div class="bk-main">
            <input type="checkbox" class="check" :checked="g.key === 'done'" :aria-label="`${b.title}: done`" @change="toggle(b)">
            <button type="button" class="bk-txt" :aria-expanded="open === b.id" @click="open = open === b.id ? null : b.id">
              <span class="row wrap chips">
                <span v-if="g.key !== 'done'" class="chip" :class="dueInfo(b, today).tone">{{ dueInfo(b, today).text }}</span>
                <span v-else class="chip t-ok"><AppIcon name="check" />Done</span>
                <span v-if="b.key" class="chip t-plain">{{ b.key }}</span>
              </span>
              <b class="bk-t">{{ b.title }}</b>
              <span v-if="b.cost" class="small muted num">{{ b.cost }}</span>
            </button>
            <div v-if="b.scene" class="bk-pic art-frame">
              <SceneArt class="scene" :scene="b.scene.scene" :tod="b.scene.tod" />
            </div>
          </div>
          <div v-if="open === b.id || g.key === 'now'" class="bk-more">
            <p v-if="b.detail" class="small">
              {{ b.detail }}
            </p>
            <div v-if="b.links?.length" class="row wrap">
              <a v-for="l in b.links" :key="l.url" class="btn xs ghost" :href="l.url" target="_blank" rel="noopener">
                <AppIcon name="ext" size="xs" />{{ l.label }}
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-if="trip.bookingTips?.length">
      <div class="sec-h">
        <h2>If something goes wrong</h2>
      </div>
      <div class="tips">
        <div v-for="c in trip.bookingTips" :key="c.title" class="card pad tip">
          <h3 class="h3 row">
            <AppIcon :name="c.icon" size="sm" />{{ c.title }}
          </h3>
          <ul>
            <li v-for="(it, i) in c.items" :key="i">
              <AppIcon :name="it.icon" size="sm" /><span>{{ it.text }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.bookings { padding-top: 18px; }
.head { display: flex; align-items: center; gap: 12px; }
.list { display: flex; flex-direction: column; gap: 10px; }
.bk { overflow: hidden; }
.bk-main { display: flex; align-items: flex-start; gap: 12px; padding: 14px; }
.bk-main .check { margin-top: 2px; }
.bk-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; text-align: left; background: none; border: 0; padding: 0; color: var(--fg); }
.chips { gap: 6px; }
.bk-t { font-size: 15.5px; line-height: 1.35; }
.bk-pic { width: 64px; height: 64px; border-radius: 12px; flex: none; }
.bk-more { padding: 0 14px 14px 50px; display: flex; flex-direction: column; gap: 10px; }
.bk.done .bk-t { color: var(--fg-3); }
.tips { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.tip h3 { gap: 8px; }
.tip ul { list-style: none; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.tip li { display: flex; gap: 10px; font-size: 14px; }
.tip li .i { color: var(--gold-ink); margin-top: 2px; }
</style>
