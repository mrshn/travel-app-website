<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import type { Day, PlaceCard, PlaceSet } from '#shared/types/trip'
import { haversine } from '#shared/utils/geo'
import { PLACE_SET_ORDER, placeIsCollectable, placeIsFree, placeNorm, placeOpenOn, placeSetOf } from '#shared/utils/places'

/**
 * Places as a collection (spec 4.3): the trip's places in sets, as small cards you stamp.
 * Filters narrow the sets; searching or "Near me" shows one flat grid instead.
 */
const v = useTripView()
const geo = useGeo()
const trip = v.trip

type Cat = 'all' | 'sight' | 'food' | 'photo'
const CATS: { id: Cat, label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sight', label: 'Sights' },
  { id: 'food', label: 'Food' },
  { id: 'photo', label: 'Photo' },
]
const cat = useStorage<Cat>('travel:places:cat', 'all')
const catNow = computed<Cat>(() => (CATS.some(c => c.id === cat.value) ? cat.value : 'all'))

// Filters are not remembered: each visit starts with everything.
const q = ref('')
const searchOpen = ref(false)
const near = ref(false)
const openToday = ref(false)
const free = ref(false)
const notStamped = ref(false)
const topOnly = ref(false)
/** Before the trip: the day picked in "Open on…". The place sheet also offers it as the day to add a place to. */
const openDay = useState<string>('places:open-day', () => '')
openDay.value = ''
onBeforeUnmount(() => {
  openDay.value = ''
})

const places = computed<PlaceCard[]>(() => trip.value?.places ?? [])
const phase = computed(() => v.moment.value?.phase ?? 'before')
const todayId = computed(() => v.today.value?.view.day.id)

const counts = computed<Record<Cat, number>>(() => {
  const c: Record<Cat, number> = { all: 0, sight: 0, food: 0, photo: 0 }
  for (const p of places.value) {
    c.all++
    if (p.category in c) c[p.category]++
  }
  return c
})

// ---------- header: the collection so far ----------
const collectable = computed(() => places.value.filter(placeIsCollectable).length)
const stamped = computed(() => places.value.filter(p => v.stamps.value.has(p.id)).length)
const tops = computed(() => {
  const list = places.value.filter(p => p.top && placeIsCollectable(p))
  return { total: list.length, stamped: list.filter(p => v.stamps.value.has(p.id)).length }
})
const pct = computed(() => `${collectable.value ? Math.round((stamped.value / collectable.value) * 1000) / 10 : 0}%`)
const mapTo = computed(() => ({ path: `/trips/${trip.value?.id}/map`, query: { day: 'all', places: '1', from: 'places' } }))

// ---------- search ----------
const searchEl = ref<HTMLInputElement | null>(null)
const searchBtn = ref<HTMLButtonElement | null>(null)
async function openSearch() {
  searchOpen.value = true
  await nextTick()
  searchEl.value?.focus()
}
async function cancelSearch() {
  q.value = ''
  searchOpen.value = false
  await nextTick()
  searchBtn.value?.focus()
}
/** Words of the search, each must appear in the name, area or text (accents and apostrophes ignored). */
const words = computed(() => placeNorm(q.value).trim().split(' ').filter(Boolean))

// ---------- filters ----------
/** The days "Open on…" offers: the days the places' opening data is about. */
const openDays = computed<Day[]>(() => {
  const t = trip.value
  if (!t) return []
  const ids = t.openDays ?? t.days.map(d => d.id)
  return ids.map(id => t.days.find(d => d.id === id)).filter((d): d is Day => !!d)
})
/** What the "Open on…" chip says: its choice. */
const openDayLabel = computed(() => {
  const d = openDays.value.find(x => x.id === openDay.value)
  return d ? `Open ${fmtDate(d.date, 'short')}` : 'Open on…'
})
/** The day whose closed places are hidden: today while "Open today" is on, the picked day before the trip. */
const closedOn = computed(() => {
  if (phase.value === 'during') return openToday.value ? todayId.value : undefined
  if (phase.value === 'before') return openDay.value || undefined
  return undefined
})

const LOCATION_OFF = 'Location is off. Allow it in your browser settings to sort by distance.'
function toggleNear() {
  if (near.value) {
    near.value = false
    return
  }
  if (!geo.supported) {
    toast(LOCATION_OFF, { tone: 'warn' })
    return
  }
  near.value = true
  if (!geo.active.value) geo.start()
}
// Blocked, or no position at all: Near me can't sort, so it goes off. A position that is only unavailable for a
// moment (indoors, underground) keeps the last fix, and Near me stays on.
watch(() => geo.error.value, (e) => {
  if (near.value && (e === 'denied' || (e === 'unavailable' && !geo.fix.value))) {
    near.value = false
    toast(LOCATION_OFF, { tone: 'warn' })
  }
})

function clearFilters() {
  q.value = ''
  searchOpen.value = false
  near.value = false
  openToday.value = false
  openDay.value = ''
  free.value = false
  notStamped.value = false
  topOnly.value = false
  cat.value = 'all'
}

function shows(p: PlaceCard): boolean {
  const t = trip.value
  if (!t) return false
  if (catNow.value !== 'all' && p.category !== catNow.value) return false
  if (free.value && !placeIsFree(p)) return false
  if (topOnly.value && !p.top) return false
  if (notStamped.value && (!placeIsCollectable(p) || v.stamps.value.has(p.id))) return false
  if (closedOn.value && placeOpenOn(p, t, closedOn.value) === 'closed') return false
  if (words.value.length) {
    const hay = placeNorm(`${p.name} ${p.area ?? ''} ${p.text}`)
    if (!words.value.every(w => hay.includes(w))) return false
  }
  return true
}

// ---------- order ----------
/**
 * Places in set order; inside a set top picks first, then places in your plan (by day and time), then the
 * rest as the trip lists them, and places outside the collection last. Stamps never move a card.
 */
const ordered = computed(() => {
  const setIndex = new Map(PLACE_SET_ORDER.map((s, i) => [s, i]))
  const rows = places.value.map((p, i) => {
    const hit = v.inPlan.value.get(p.id)
    const rank = !placeIsCollectable(p) ? 3 : p.top ? 0 : hit ? 1 : 2
    return { p, i, set: placeSetOf(p), rank, when: rank === 1 && hit ? `${hit.date} ${String(hit.start).padStart(4, '0')}` : '' }
  })
  rows.sort((a, b) =>
    (setIndex.get(a.set) ?? 99) - (setIndex.get(b.set) ?? 99)
    || a.rank - b.rank
    || (a.when < b.when ? -1 : a.when > b.when ? 1 : 0)
    || a.i - b.i)
  return rows
})

const fix = computed(() => geo.fix.value)
function dist(p: PlaceCard): number | null {
  return fix.value && p.place ? haversine(fix.value, p.place) : null
}

/**
 * Where Near me sorts from. It moves on only once you are 50 m away, so the cards don't swap places under your
 * thumb each time the fix jitters or you take a few steps; the distances on them stay live.
 */
const RESORT_M = 50
const sortFrom = shallowRef<{ lat: number, lng: number } | null>(null)
watch([near, fix], ([on, f]) => {
  if (!on) sortFrom.value = null
  else if (f && (!sortFrom.value || haversine(sortFrom.value, f) > RESORT_M)) sortFrom.value = { lat: f.lat, lng: f.lng }
}, { immediate: true })

const flat = computed(() => words.value.length > 0 || near.value)
const flatList = computed<PlaceCard[]>(() => {
  const list = ordered.value.filter(r => shows(r.p)).map(r => r.p)
  const from = sortFrom.value
  if (!near.value || !from) return list
  // Nearest first; places with no coordinates go last, in their usual order.
  return list
    .map((p, i) => ({ p, i, d: p.place ? haversine(from, p.place) : Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .map(x => x.p)
})

const SHOWN = 4
const expanded = ref<Partial<Record<PlaceSet, boolean>>>({})
const groups = computed(() => {
  const bySet = new Map<PlaceSet, PlaceCard[]>()
  for (const r of ordered.value) {
    if (!shows(r.p)) continue
    const list = bySet.get(r.set) ?? []
    list.push(r.p)
    bySet.set(r.set, list)
  }
  return PLACE_SET_ORDER.filter(set => bySet.has(set)).map((set) => {
    const cards = bySet.get(set)!
    const open = !!expanded.value[set]
    return {
      set,
      meta: PLACE_SET_META[set],
      progress: v.sets.value.find(s => s.set === set),
      cards: open ? cards : cards.slice(0, SHOWN),
      total: cards.length,
      open,
    }
  })
})

const sectionEls = new Map<string, HTMLElement>()
function setRef(set: string, el: unknown) {
  if (el instanceof HTMLElement) sectionEls.set(set, el)
  else sectionEls.delete(set)
}
async function toggleSet(set: PlaceSet) {
  const closing = !!expanded.value[set]
  expanded.value = { ...expanded.value, [set]: !closing }
  if (!closing) return
  // "Show fewer" from far down: bring the set's header back into view (the page's scroll padding clears the sticky header).
  await nextTick()
  const el = sectionEls.get(set)
  const clear = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0
  if (el && el.getBoundingClientRect().top < clear) el.scrollIntoView({ block: 'start' })
}

const nothing = computed(() => places.value.length > 0 && (flat.value ? !flatList.value.length : !groups.value.length))
</script>

<template>
  <div v-if="trip" class="page places">
    <header class="phead">
      <div class="titles">
        <p class="kicker">
          Your collection
        </p>
        <h1 class="h2">
          Places
        </h1>
      </div>
      <button
        ref="searchBtn"
        class="btn icon sm plain round"
        type="button"
        aria-label="Search places"
        :aria-expanded="searchOpen"
        aria-controls="places-search"
        @click="openSearch"
      >
        <AppIcon name="search" />
      </button>
      <NuxtLink :to="mapTo" class="btn sm ghost">
        <AppIcon name="map" size="sm" />Map
      </NuxtLink>
    </header>

    <div v-if="searchOpen" id="places-search" class="search" role="search">
      <label class="sfield">
        <AppIcon name="search" size="sm" />
        <input
          ref="searchEl"
          v-model="q"
          type="search"
          placeholder="Search places"
          aria-label="Search places"
          enterkeyhint="search"
          autocomplete="off"
          @keydown.esc.prevent="cancelSearch"
          @keydown.enter.prevent="searchEl?.blur()"
        >
      </label>
      <button class="btn plain" type="button" @click="cancelSearch">
        Cancel
      </button>
    </div>

    <div v-if="collectable" class="tally">
      <div class="row between">
        <span class="strong tnum">{{ stamped }} of {{ collectable }} stamped</span>
        <NuxtLink v-if="tops.total" :to="`/trips/${trip.id}/badges`" class="chip t-gold tnum">
          <AppIcon name="star" />Top picks {{ tops.stamped }}/{{ tops.total }}<AppIcon name="chevr" class="go" />
        </NuxtLink>
      </div>
      <div class="bar thin" role="progressbar" aria-label="Places stamped" aria-valuemin="0" :aria-valuemax="collectable" :aria-valuenow="stamped">
        <i class="gold" :style="{ width: pct }" />
      </div>
    </div>

    <div class="seg block cats" role="group" aria-label="Kind of place">
      <button v-for="c in CATS" :key="c.id" type="button" :aria-pressed="catNow === c.id" @click="cat = c.id">
        {{ c.label }} <span class="n num">{{ counts[c.id] }}</span>
      </button>
    </div>

    <div class="hscroll filters" role="group" aria-label="Filters">
      <button type="button" class="chip" :aria-pressed="near" @click="toggleNear">
        <AppIcon name="locate" />Near me
      </button>
      <button v-if="phase === 'during'" type="button" class="chip" :aria-pressed="openToday" @click="openToday = !openToday">
        <AppIcon name="clock" />Open today
      </button>
      <label v-else-if="phase === 'before' && openDays.length" class="chip daysel" :class="{ on: !!openDay }">
        <AppIcon name="calendar" /><span aria-hidden="true">{{ openDayLabel }}</span><AppIcon name="chev" class="chev" />
        <select v-model="openDay" aria-label="Open on">
          <option value="">
            Open on…
          </option>
          <option v-for="d in openDays" :key="d.id" :value="d.id">
            Open {{ fmtDate(d.date, 'short') }}
          </option>
        </select>
      </label>
      <button type="button" class="chip" :aria-pressed="free" @click="free = !free">
        <AppIcon name="tag" />Free
      </button>
      <button type="button" class="chip" :aria-pressed="notStamped" @click="notStamped = !notStamped">
        <AppIcon name="stamp" />Not stamped
      </button>
      <button type="button" class="chip" :aria-pressed="topOnly" @click="topOnly = !topOnly">
        <AppIcon name="star" />Top picks
      </button>
      <NuxtLink :to="mapTo" class="chip">
        <AppIcon name="map" />Map
      </NuxtLink>
    </div>

    <div v-if="flat && flatList.length" class="grid flat">
      <PlaceTile v-for="p in flatList" :key="p.id" :place="p" :distance="dist(p)" show-set />
    </div>

    <template v-else-if="!flat">
      <section
        v-for="g in groups"
        :key="g.set"
        :ref="(el) => setRef(g.set, el)"
        class="set"
        :data-set="g.set"
        :aria-labelledby="`set-${g.set}`"
      >
        <header class="set-h" :class="{ done: g.progress?.complete }">
          <span class="set-ic" :style="g.progress?.complete ? undefined : { color: g.meta.color }" aria-hidden="true">
            <AppIcon :name="g.progress?.complete ? 'check' : g.meta.icon" />
          </span>
          <div class="set-tx">
            <div class="set-top">
              <h2 :id="`set-${g.set}`" class="set-t">
                {{ g.meta.label }}
              </h2>
              <span v-if="g.progress" class="set-n tnum">{{ g.progress.complete ? 'Complete' : `${g.progress.stamped}/${g.progress.total}` }}</span>
            </div>
            <p class="set-b">
              {{ g.meta.blurb }}
            </p>
          </div>
        </header>
        <div class="grid">
          <PlaceTile v-for="p in g.cards" :key="p.id" :place="p" :distance="dist(p)" />
        </div>
        <button v-if="g.total > SHOWN" class="btn sm ghost more" type="button" :aria-expanded="g.open" @click="toggleSet(g.set)">
          {{ g.open ? 'Show fewer' : `Show all ${g.total}` }}
        </button>
      </section>
    </template>

    <div v-if="nothing" class="card empty none">
      <p>Nothing here with these filters.</p>
      <button class="btn sm ghost" type="button" @click="clearFilters">
        Clear filters
      </button>
    </div>
    <p v-else-if="!places.length" class="card empty">
      No places saved for this trip.
    </p>
  </div>
</template>

<style scoped>
.places { padding-top: 14px; }
.phead { display: flex; align-items: flex-end; gap: 6px; }
.titles { flex: 1 1 auto; min-width: 0; }
.search { display: flex; align-items: center; gap: 6px; margin-top: 10px; }
.sfield { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); color: var(--fg-2); }
.sfield input { flex: 1 1 auto; min-width: 0; min-height: 44px; border: 0; background: none; outline: none; font-size: 16px; color: var(--fg); }
.sfield:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.tally { display: flex; flex-direction: column; gap: 7px; margin-top: 10px; }
.tally .row { gap: 8px; }
/* The chip's 44 px touch area reaches over the thin bar below it: keep it on top. */
.tally .chip { z-index: 1; }
/* It goes to Badges, another tab: the chevron says it is a link, not the Top picks filter below. */
.tally .chip .go { margin: 0 -3px 0 -1px; }
.cats { margin-top: 12px; }
/* Width by label, so "Sights 35" still fits at 320 px. */
.seg.cats button { flex: 1 1 auto; padding: 0 6px; gap: 5px; }
.cats .n { font-size: 12.5px; font-weight: 600; color: var(--fg-2); }
@media (pointer: coarse) {
  .seg.cats button { min-height: 44px; }
}
/* 5 px above and below: the chips' 44 px touch areas fit inside the scrolling row. */
.filters { margin-top: 6px; padding-top: 5px; padding-bottom: 5px; gap: 6px; }
.filters .chip { min-height: 34px; padding: 4px 12px; border-color: var(--line); background: var(--surface); font-size: 13px; }
/* "Open on…" before the trip: a chip showing the choice, with the phone's own picker laid over it. The select is
   44 px tall (the touch area, inside the row's padding) and 16 px, so an iPhone doesn't zoom the page into it. */
.daysel { position: relative; cursor: pointer; }
.daysel .chev { width: 12px; height: 12px; margin-left: -1px; }
.daysel select {
  position: absolute;
  left: -1px;
  top: 50%;
  width: calc(100% + 2px);
  height: 44px;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  font-size: 16px;
  cursor: pointer;
  transform: translateY(-50%);
  appearance: none;
  -webkit-appearance: none;
}
.daysel:has(select:focus-visible) { outline: 2.5px solid var(--accent); outline-offset: 2px; }
.filters .daysel.on { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.set { margin-top: 20px; }
.set-h { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
.set-h.done { margin-inline: -10px; padding: 8px 10px; border-radius: 12px; background: var(--gold-soft); }
.set-ic { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; background: var(--surface); border: 1px solid var(--line); }
.done .set-ic { color: var(--gold-ink); border-color: var(--gold-rim); }
.set-tx { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.set-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.set-t { font-family: var(--font-display); font-size: 14px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; line-height: 1.3; }
.set-n { flex: none; font-size: 13.5px; font-weight: 700; color: var(--fg-2); }
.done .set-t, .done .set-n { color: var(--gold-ink); }
.set-b { font-size: 13px; line-height: 1.35; color: var(--fg-2); }
.grid { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 600px) {
  .grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
}
.flat { margin-top: 16px; }
.more { display: flex; margin: 10px auto 0; }
.none { margin-top: 18px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
</style>
