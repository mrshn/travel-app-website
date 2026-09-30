<script setup lang="ts">
import type { PlaceCard } from '#shared/types/trip'
import { costHints } from '#shared/utils/costs'
import { directionsUrl, fmtDistance, haversine, photosUrl, searchUrl, walkMinutes } from '#shared/utils/geo'
import { placeIsCollectable, placeOpenOn, placeSetOf, placeStampDate } from '#shared/utils/places'

/**
 * The place sheet (spec 4.4), open while the URL has ?place=<placeId>. Mounted once by the trip shell.
 * What the place is, when it's open, where it sits in your plan, how to get there, and its stamp.
 */
const v = useTripView()
const route = useRoute()
const router = useRouter()
const geo = useGeo()
const sheet = useQueryState('place')
const actions = useTripActions()
/** The day picked in Places' "Open on…" (before the trip): the day "Add to plan" suggests. */
const openDay = useState<string>('places:open-day', () => '')

const place = computed<PlaceCard | undefined>(() => {
  const id = sheet.value.value
  return id ? v.trip.value?.places?.find(p => p.id === id) : undefined
})
// Keeps the last place while the sheet slides away.
const last = shallowRef<PlaceCard>()
watch(place, (p) => {
  if (p) last.value = p
}, { immediate: true })
const p = computed(() => place.value ?? last.value)

const VERDICT: Record<NonNullable<PlaceCard['verdict']>, string> = { worth: 'Worth it', split: 'Mixed reviews', over: 'Overrated', trap: 'Tourist trap', closed: 'Closed' }
const STAMP_LABEL: Record<PlaceCard['category'], string> = { sight: 'I was here', food: 'I ate here', photo: 'Got the shot' }

const meta = computed(() => (p.value ? PLACE_SET_META[placeSetOf(p.value)] : undefined))
const collectable = computed(() => !!p.value && placeIsCollectable(p.value))
const verdict = computed(() => (p.value?.verdict ? VERDICT[p.value.verdict] ?? '' : ''))

// ---------- the stamp ----------
const stamp = computed(() => (p.value ? v.stamps.value.get(p.value.id) : undefined))
const stampDate = computed(() => (stamp.value && v.trip.value ? placeStampDate(v.trip.value, stamp.value) : ''))
const stampLine = computed(() => {
  if (!stamp.value) return ''
  const when = stampDate.value ? ` · ${fmtDate(stampDate.value, 'short')}` : ''
  return `Stamped${when}${stamp.value.via === 'stop' ? ' · from your plan' : ''}`
})
// The big stamp presses on only when it appears while the sheet is open.
const press = ref(false)
watch(() => [place.value?.id, !!stamp.value] as const, ([id, got], [wasId, had]) => {
  press.value = id === wasId && got && !had
})
const before = computed(() => v.moment.value?.phase === 'before')
const startsOn = computed(() => (v.trip.value ? fmtDate(v.trip.value.start, 'short') : ''))

// The stamp button and "Remove stamp" take turns in the same footer: a second tap there soon after (a double tap,
// or one about half a second later) would land on the other one and undo the first, so it is ignored. Keyboard
// presses always count, and so does the first tap on another place.
let tapOk = tapGuard(700)
watch(() => p.value?.id, () => {
  tapOk = tapGuard(700)
})
function stampIt(e?: MouseEvent) {
  if (p.value && tapOk(e)) actions.stampPlace(p.value, true)
}
function unstamp(e?: MouseEvent) {
  if (p.value && tapOk(e)) actions.stampPlace(p.value, false)
}

// ---------- what it is ----------
/** "≈ ₺391" next to a price with exactly one amount. */
const priceHome = computed(() => {
  const h = costHints(p.value?.price)
  return h.exact && h.exact > 0 ? moneyHome(h.exact, v.trip.value) : ''
})
/** A hyphen, an en dash or an em dash: a placeholder in the data, not advice. */
const DASHES = new Set(['-', String.fromCharCode(8211), String.fromCharCode(8212)])
/** The booking advice, unless it says there's nothing to book ("No", empty or a dash). */
const booking = computed(() => {
  const b = (p.value?.booking ?? '').trim()
  return !b || /^no\.?$/i.test(b) || [...b].every(c => DASHES.has(c)) ? '' : b
})

interface OpenDay { id: string, short: string, long: string, state: 'open' | 'closed' | 'unknown', note: string, today: boolean }
/** One pill per day the opening data covers, today outlined; none when nothing is known. */
const days = computed<OpenDay[]>(() => {
  const t = v.trip.value
  const pl = p.value
  if (!t || !pl) return []
  const today = v.today.value?.view.day.id
  const ids = t.openDays ?? t.days.map(d => d.id)
  const out: OpenDay[] = []
  ids.forEach((id, i) => {
    const d = t.days.find(x => x.id === id)
    if (!d) return
    const note = pl.openNotes?.[i]?.trim() ?? ''
    out.push({ id, short: fmtDate(d.date, 'weekday').slice(0, 2), long: fmtDate(d.date, 'weekdayLong'), state: placeOpenOn(pl, t, id), note, today: id === today })
  })
  return out.some(d => d.state !== 'unknown') ? out : []
})
const todayNote = computed(() => days.value.find(d => d.today)?.note ?? '')
const OPEN_WORD = { open: 'open', closed: 'closed', unknown: 'not known' } as const

// ---------- your plan ----------
const hit = computed(() => (p.value ? v.inPlan.value.get(p.value.id) : undefined))
/** To the stop: the stop sheet takes this sheet's place (no stacked sheets). */
function toStop() {
  if (!hit.value) return
  const next = { ...route.query }
  delete next.place
  next.stop = hit.value.stopId
  router.replace({ query: next })
}
function addToPlan() {
  const t = v.trip.value
  const pl = p.value
  if (!t || !pl) return
  const isDay = (id: unknown): id is string => typeof id === 'string' && t.days.some(d => d.id === id)
  const picked = isDay(openDay.value) ? openDay.value : ''
  // The day you are looking at (Plan's or the map's ?day=) comes next: the editor shares ?day= with the page
  // behind it, so any other day would switch that page while the editor is open.
  const viewed = isDay(route.query.day) ? route.query.day : ''
  const day = picked || viewed || v.today.value?.view.day.id || t.days[1]?.id || t.days[0]?.id
  router.push({ query: { ...route.query, edit: 'new', from: `place:${pl.id}`, ...(day ? { day } : {}) } })
}

// ---------- getting there ----------
const fromYou = computed(() => {
  const f = geo.fix.value
  const at = p.value?.place
  if (!f || !at) return ''
  const m = haversine(f, at)
  const min = walkMinutes(m)
  // A walk of more than an hour isn't advice.
  return min <= 60 ? `${fmtDistance(m)} from you · about ${min} min on foot` : `${fmtDistance(m)} from you`
})
const query = computed(() => (p.value ? p.value.searchQuery ?? p.value.query ?? p.value.name : ''))
const goUrl = computed(() => (p.value?.place ? directionsUrl(p.value.place, 'walking', geo.fix.value) : searchUrl(query.value)))
const site = computed(() => p.value?.links?.[0])
</script>

<template>
  <BottomSheet :open="!!place" bare size="lg" :title="p?.name" @close="sheet.close()">
    <template v-if="p">
      <div class="top">
        <div class="hero art-frame">
          <SceneArt class="scene" :scene="p.scene" :tod="p.tod ?? 'day'" :label="p.name" :lazy="false" />
          <div class="scrim" />
          <div class="flags">
            <span v-if="meta" class="chip on-art"><AppIcon :name="meta.icon" />{{ meta.label }}</span>
            <span v-if="p.top" class="chip t-gold"><AppIcon name="star" />Top pick</span>
            <span v-if="verdict" class="chip on-art">{{ verdict }}</span>
          </div>
        </div>
        <button class="btn icon sm on-art round close" type="button" aria-label="Close" @click="sheet.close()">
          <AppIcon name="x" />
        </button>
      </div>

      <div class="content">
        <div class="namerow">
          <div class="grow namecol">
            <h2 class="ttl">
              {{ p.name }}
            </h2>
            <p v-if="p.area || p.where" class="small muted">
              {{ p.area || p.where }}
            </p>
            <p v-if="stampLine" class="stamped tnum">
              <AppIcon name="stamp" size="sm" /><span>{{ stampLine }}</span>
            </p>
          </div>
          <StampMark v-if="stamp" class="bigmark" :place="p" :date="stampDate" :size="96" :press="press" />
        </div>

        <p v-if="p.text" class="txt">
          {{ p.text }}
        </p>

        <ul v-if="p.price || booking || p.bestTime || days.length" class="facts">
          <li v-if="p.price">
            <AppIcon name="euro" size="sm" /><span class="tnum">{{ p.price }}<span v-if="priceHome" class="home">{{ ` ${priceHome}` }}</span></span>
          </li>
          <li v-if="booking">
            <AppIcon name="ticket" size="sm" /><span>Book ahead: {{ booking }}</span>
          </li>
          <li v-if="p.bestTime">
            <AppIcon name="clock" size="sm" /><span class="tnum">Best: {{ p.bestTime }}</span>
          </li>
          <li v-if="days.length" class="open">
            <AppIcon name="calendar" size="sm" />
            <span class="grow row wrap days">
              <span>Open</span>
              <span v-for="d in days" :key="d.id" class="dd" :class="[`o-${d.state}`, { today: d.today }]" :title="d.note ? `${d.long}: ${d.note}` : d.long">
                <span aria-hidden="true">{{ d.short }}</span>
                <span class="sr-only">{{ d.long }}{{ d.today ? ' (today)' : '' }}: {{ OPEN_WORD[d.state] }}{{ d.note ? `, ${d.note}` : '' }}</span>
              </span>
              <span v-if="todayNote" class="small muted tnum" aria-hidden="true">{{ todayNote }}</span>
            </span>
          </li>
        </ul>

        <button v-if="hit" class="planrow" type="button" @click="toStop">
          <AppIcon name="calendar" size="sm" />
          <span class="grow tnum">In your plan: {{ fmtDate(hit.date, 'short') }} · {{ fmtClock(hit.start) }}</span>
          <AppIcon name="chevr" size="sm" />
        </button>

        <p v-if="fromYou" class="away tnum">
          <AppIcon name="navigate" size="sm" />{{ fromYou }}
        </p>

        <div class="row wrap acts">
          <a class="btn sm primary" :href="goUrl" target="_blank" rel="noopener">
            <AppIcon :name="p.place ? 'navigate' : 'map'" size="sm" />{{ p.place ? 'Go' : 'Maps' }}
          </a>
          <a class="btn sm" :href="photosUrl(query)" target="_blank" rel="noopener">
            <AppIcon name="image" size="sm" />Photos
          </a>
          <a v-if="site" class="btn sm" :href="site.url" target="_blank" rel="noopener">
            <AppIcon name="ext" size="sm" />Site
          </a>
        </div>

        <button v-if="!hit" class="btn sm ghost add" type="button" @click="addToPlan">
          <AppIcon name="plus" size="sm" />Add to plan
        </button>
      </div>
    </template>

    <template #footer>
      <template v-if="p">
        <p v-if="!collectable" class="note">
          Not in your collection: {{ p.verdict === 'trap' ? 'tourist trap' : 'closed' }}.
        </p>
        <template v-else-if="stamp">
          <span class="grow" />
          <button class="btn plain" type="button" @click="unstamp">
            Remove stamp
          </button>
        </template>
        <p v-else-if="before" class="note">
          You can stamp places from {{ startsOn }}.
        </p>
        <button v-else class="btn primary lg grow stampbtn" type="button" @click="stampIt">
          <AppIcon name="stamp" />{{ STAMP_LABEL[p.category] }}
        </button>
      </template>
    </template>
  </BottomSheet>
</template>

<style scoped>
/* The close button sits beside the art (not in it), so it can rise above the sheet's drag strip. */
.top { position: relative; }
.hero { height: 180px; }
.flags { position: absolute; left: 14px; right: 14px; bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px; }
.close { position: absolute; top: 12px; right: 12px; z-index: 4; }
.content { display: flex; flex-direction: column; gap: 12px; padding: 14px 16px 16px; }
.namerow { display: flex; align-items: flex-start; gap: 12px; }
.namecol { display: flex; flex-direction: column; gap: 4px; }
.ttl { font-size: 22px; font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
.bigmark { margin: -4px -2px -6px 0; }
.stamped { display: flex; align-items: flex-start; gap: 6px; margin-top: 2px; font-size: 14px; font-weight: 650; line-height: 1.35; color: var(--gold-ink); }
.stamped .i { flex: none; margin-top: 1px; }
.txt { font-size: 15.5px; line-height: 1.55; }
.facts { list-style: none; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.facts li { display: flex; align-items: flex-start; gap: 10px; font-size: 14.5px; line-height: 1.4; }
.facts li > .i { flex: none; margin-top: 1px; color: var(--accent); }
.home { color: var(--fg-2); font-weight: 600; }
.days { gap: 5px; }
.dd { display: inline-grid; place-items: center; min-width: 30px; height: 24px; padding: 0 5px; border-radius: 7px; font-size: 11.5px; font-weight: 700; }
.dd.o-open { background: var(--ok-soft); color: var(--ok); }
.dd.o-closed { background: var(--bad-soft); color: var(--bad); text-decoration: line-through; }
.dd.o-unknown { background: var(--surface-2); color: var(--fg-2); }
.dd.today { outline: 2px solid var(--fg); outline-offset: 1px; }
.planrow {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface);
  color: var(--fg);
  font: inherit;
  font-size: 14.5px;
  font-weight: 620;
  text-align: left;
  cursor: pointer;
}
.planrow:hover { background: var(--surface-2); }
.planrow > .i { flex: none; color: var(--accent); }
.away { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--fg-2); }
.away > .i { flex: none; color: var(--you); }
.acts { gap: 8px; }
.add { align-self: flex-start; }
.note { flex: 1 1 auto; align-self: center; font-size: 14.5px; font-weight: 600; color: var(--fg-2); }
.stampbtn .i { width: 20px; height: 20px; }
</style>
