<script setup lang="ts">
import { useWakeLock } from '@vueuse/core'
import { liveGuide } from '#shared/utils/guide'
import { directionsUrl, fmtDistance, type LatLng } from '#shared/utils/geo'
import { dayTally, type ResolvedStop } from '#shared/utils/plan'
import { deviceTimeZone, fmtClock, fmtCountdown, fmtDuration, parseClock, zoned, zonedToDate, zoneGap } from '#shared/utils/time'

const v = useTripView()
const route = useRoute()
const geo = useGeo()
const sheet = useQueryState('stop')
const editor = useQueryState('edit')
const trip = v.trip
const m = v.moment
const previewOpen = ref(false)
const follow = ref(true)
const wake = useWakeLock()
const alertsCtl = useAlertSettings()

// ?at=2026-10-09T10:30 opens a preview of that moment (trip time).
onMounted(() => {
  const at = route.query.at
  const t = trip.value
  if (typeof at === 'string' && t) {
    const [d, hm] = at.split('T')
    const mins = hm ? parseClock(hm) : null
    if (d && mins !== null) v.clock.previewAt(zonedToDate(d, mins < 300 ? mins + 1440 : mins, t.timezone))
  }
})

const today = v.today
const day = computed(() => today.value?.view.day)
const minutes = computed(() => m.value?.minutes ?? 0)
const you = computed<LatLng | null>(() => (geo.fix.value ? { lat: geo.fix.value.lat, lng: geo.fix.value.lng } : null))
const guide = computed(() =>
  today.value ? liveGuide(today.value.stops, today.value.states, minutes.value, { you: you.value, home: trip.value?.home }) : null,
)
const focus = computed(() => guide.value?.focus)
const next = computed(() => guide.value?.next)
const tally = computed(() => (today.value ? dayTally(today.value) : null))
const tod = computed(() => todFor(minutes.value))

const alerts = computed(() => (day.value?.alerts ?? []).filter(a => a.from <= minutes.value && minutes.value < a.to))
const sunLine = computed(() => {
  const s = day.value?.sun
  if (!s) return null
  const mm = minutes.value
  if (mm < s.rise) return { icon: 'sunrise', text: `Sunrise ${fmtClock(s.rise)}` }
  if (mm < s.set) return { icon: 'sunset', text: `Sunset ${fmtClock(s.set)} · in ${fmtDuration(s.set - mm)}` }
  return { icon: 'moon', text: `Sun set at ${fmtClock(s.set)}` }
})
const clockText = computed(() => (m.value ? fmtClock(m.value.local.minutes) : ''))
const gap = computed(() => (trip.value ? zoneGap(v.clock.now.value, trip.value.timezone, deviceTimeZone()) : 0))
const phoneTime = computed(() => {
  if (!gap.value) return ''
  const z = zoned(v.clock.now.value, deviceTimeZone())
  return fmtClock(z.minutes)
})
const tripCity = computed(() => trip.value?.destination ?? '')

function mapsMode(meters?: number) {
  return meters !== undefined && meters > 2800 ? 'transit' : 'walking'
}
function directionsTo(s: ResolvedStop) {
  const legM = guide.value?.focusLeg?.meters ?? guide.value?.leg?.meters
  return directionsUrl(s.place!, mapsMode(legM), you.value)
}

function mark(s: ResolvedStop, status: 'done' | 'skipped') {
  const before = v.statusOf(s.id) ?? null
  v.mark(s.id, status)
  toast(status === 'done' ? `Done: ${s.title}` : `Skipped: ${s.title}`, {
    tone: status === 'done' ? 'ok' : 'info',
    action: { label: 'Undo', run: () => v.mark(s.id, before) },
  })
}

const legText = computed(() => {
  const g = guide.value
  const n = next.value
  if (!g || !n) return ''
  if (n.kind === 'move' && n.via && typeof n.via === 'object') return `Metro ${n.via.line} · ${n.via.from} → ${n.via.to}`
  if (!g.leg) return ''
  const from = g.leg.from === 'you' ? 'from you' : g.leg.from === 'home' ? `from ${trip.value?.home?.label ?? 'home'}` : 'from here'
  return `${fmtDistance(g.leg.meters)} · ~${g.leg.est.minutes} min ${g.leg.est.mode === 'walk' ? 'walk' : 'by transit'} ${from}`
})

const leaveText = computed(() => {
  const g = guide.value
  if (!g?.next || g.leaveBy === undefined || g.leaveIn === undefined) return ''
  if (g.next.kind === 'move') return g.leaveIn <= 0 ? 'Go now' : nb(`Starts in ${fmtDuration(g.leaveIn)}`)
  if (g.leaveIn < 0) return nb(`Leave now · ${fmtDuration(-g.leaveIn)} late`)
  if (g.leaveIn === 0) return 'Leave now'
  return nb(`Leave by ${fmtClock(g.leaveBy)} · in ${fmtDuration(g.leaveIn)}`)
})

// Map
const markers = computed(() => (today.value ? stopMarkers(today.value.stops, today.value.states) : []))
const lines = computed(() => (today.value && trip.value ? routeLines(today.value.stops, trip.value, today.value.states) : []))
function showMe() {
  if (!geo.active.value) geo.start(true)
  follow.value = true
}

// Later today
const laterList = computed(() => (guide.value ? guide.value.later.slice(0, 6) : []))
const moreLater = computed(() => Math.max(0, (guide.value?.later.length ?? 0) - laterList.value.length))

// Tomorrow
const tomorrow = computed(() => {
  const i = m.value?.dayIndex ?? -1
  const p = i >= 0 ? v.plans.value[i + 1] : undefined
  if (!p) return null
  return { plan: p, first: p.stops.find(s => !s.minor) ?? p.stops[0] }
})

// Day rating
const dayNote = computed(() => (day.value ? v.progress.value.dayNotes[day.value.id] : undefined))
const dayRating = computed({
  get: () => dayNote.value?.rating,
  set: (r?: number) => day.value && v.setDayNote(day.value.id, { rating: r }),
})

// ---------- before the trip ----------
const firstStop = computed(() => {
  const p = v.plans.value[0]
  if (!p) return null
  return p.stops.find(s => !s.minor) ?? p.stops[0] ?? null
})
const countdownTarget = computed(() => {
  const t = trip.value
  const p = v.plans.value[0]
  if (!t || !p) return null
  return zonedToDate(p.view.day.date, firstStop.value?.start ?? 0, t.timezone)
})
const countdown = computed(() => (countdownTarget.value ? fmtCountdown(countdownTarget.value.getTime() - v.clock.now.value.getTime()) : ''))
const openBookings = computed(() => {
  const t = trip.value
  if (!t) return []
  return t.bookings
    .filter(b => !v.progress.value.bookings[b.id])
    .sort((a, b) => Number(!!b.asap) - Number(!!a.asap) || (a.due ?? '9999').localeCompare(b.due ?? '9999'))
})
const todayDate = computed(() => m.value?.local.date ?? '')
function dueChip(due: string | null, asap?: boolean, label = '') {
  return dueInfo({ due, asap, dueLabel: label }, todayDate.value)
}
const packed = computed(() => v.summary.value?.packing ?? { total: 0, done: 0 })
const booked = computed(() => v.summary.value?.bookings ?? { total: 0, done: 0 })

// ---------- after ----------
const s = v.summary
</script>

<template>
  <div v-if="trip && m" class="page now">
    <!-- ================= DURING ================= -->
    <template v-if="m.phase === 'during'">
      <div class="statusline">
        <div class="grow">
          <p class="kicker">
            {{ fmtDate(m.dayDate, 'long') }}<template v-if="day">
              · {{ day.label }}
            </template>
          </p>
          <div class="row wrap clockrow">
            <span class="clock num">{{ clockText }}</span>
            <span class="small muted">in {{ tripCity }}<template v-if="phoneTime">
              · your phone {{ phoneTime }}
            </template></span>
          </div>
        </div>
        <button class="btn sm ghost" type="button" @click="previewOpen = true">
          <AppIcon name="eye" size="sm" />Preview
        </button>
      </div>

      <div v-if="alerts.length || sunLine" class="alerts">
        <div v-for="(a, i) in alerts" :key="i" class="alert" :class="a.tone === 'warn' ? 'warn' : ''">
          <AppIcon :name="a.icon" size="sm" /><span>{{ a.text }}</span>
        </div>
        <div v-if="sunLine && !alerts.length" class="alert sun">
          <AppIcon :name="sunLine.icon" size="sm" /><span class="num">{{ sunLine.text }}</span>
        </div>
      </div>

      <div class="cols">
        <div class="main">
          <!-- The one thing to do now -->
          <section v-if="guide && (guide.mode === 'at' || guide.mode === 'go' || guide.mode === 'free') && focus" class="hero card" :class="`mode-${guide.mode} u-${guide.urgency ?? 'relaxed'}`">
            <div class="pic art-frame">
              <SceneArt class="scene" :scene="guide.mode === 'free' ? day?.cover.scene : sceneFor(focus)" :tod="tod" :label="focus.title" :lazy="false" />
              <div class="scrim" />
              <div class="pic-top on-art">
                <span v-if="guide.mode === 'at'" class="chip on-art"><span class="live-dot" aria-hidden="true" />Now</span>
                <span v-else-if="guide.mode === 'go'" class="chip on-art"><AppIcon name="walk" />Time to go</span>
                <span v-else class="chip on-art"><AppIcon name="coffee" />Free time</span>
                <span class="chip on-art num">{{ fmtClock(focus.start) }}–{{ fmtClock(focus.endMin) }}</span>
              </div>
              <div class="pic-in on-art">
                <p v-if="guide.mode === 'free'" class="lead">
                  Until {{ fmtClock(guide.leaveBy ?? focus.start) }}, then
                </p>
                <p v-else-if="guide.mode === 'go'" class="lead">
                  Head to
                </p>
                <p v-else-if="focus.base.options" class="lead">
                  {{ focus.base.title }}
                </p>
                <h1 class="ttl">
                  {{ focus.title }}
                </h1>
                <div v-if="guide.mode === 'at' && guide.currentProgress !== undefined" class="prog">
                  <div class="bar thin glassbar">
                    <i class="gold" :style="{ width: `${Math.round(guide.currentProgress * 100)}%` }" />
                  </div>
                  <span class="num small">{{ fmtDuration(guide.minutesLeftInCurrent ?? 0) }} left</span>
                </div>
                <div v-else-if="guide.leaveIn !== undefined" class="big-count num" :class="`u-${guide.urgency}`">
                  {{ leaveText }}
                </div>
              </div>
            </div>
            <div class="hero-body">
              <p v-if="focus.tip" class="tip clamp-3">
                {{ focus.tip }}
              </p>
              <DirectionPill
                v-if="you && focus.place"
                :from="you"
                :to="focus.place"
                :heading="geo.heading.value"
                :name="focus.place.name"
              />
              <p v-else-if="guide.mode !== 'at' && legText" class="small muted leg">
                <AppIcon name="route" size="sm" />{{ legText }}
              </p>
              <div class="acts">
                <button v-if="guide.mode === 'at'" class="btn ok lg grow" type="button" @click="mark(focus, 'done')">
                  <AppIcon name="check" />Done
                </button>
                <a v-if="focus.place" class="btn lg" :class="guide.mode === 'at' ? '' : 'primary grow'" :href="directionsTo(focus)" target="_blank" rel="noopener">
                  <AppIcon name="navigate" />{{ guide.mode === 'at' ? 'Go' : 'Directions' }}
                </a>
                <button class="btn lg icon" type="button" :aria-label="`Skip ${focus.title}`" title="Skip" @click="mark(focus, 'skipped')">
                  <AppIcon name="skip" />
                </button>
                <button class="btn lg icon" type="button" aria-label="Details and feedback" title="Details and feedback" @click="sheet.open(focus.id)">
                  <AppIcon name="dots" />
                </button>
              </div>
            </div>
          </section>

          <!-- Day over -->
          <section v-else-if="guide && guide.mode === 'done'" class="hero card mode-done">
            <div class="pic art-frame">
              <SceneArt class="scene" :scene="day?.cover.scene ?? 'skyline'" tod="night" :lazy="false" />
              <div class="scrim" />
              <div class="pic-in on-art">
                <p class="lead">
                  {{ fmtDate(m.dayDate, 'weekdayLong') }}
                </p>
                <h1 class="ttl">
                  That's today done
                </h1>
                <p v-if="tally" class="num small">
                  {{ tally.done }} done · {{ tally.skipped }} skipped<template v-if="tally.missed">
                    · {{ tally.missed }} not marked
                  </template>
                </p>
              </div>
            </div>
            <div class="hero-body">
              <div class="row wrap">
                <span class="strong">Rate today</span>
                <StarRating v-model="dayRating" :size="30" />
              </div>
              <p v-if="tomorrow?.first" class="small muted">
                Tomorrow starts {{ fmtClock(tomorrow.first.start) }}: {{ tomorrow.first.title }}.
              </p>
            </div>
          </section>

          <section v-else-if="guide && guide.mode === 'empty'" class="card pad empty">
            <AppIcon name="calendar" />
            <h3>Nothing planned today</h3>
            <p>Add a few stops and the guide will walk you through them.</p>
            <p style="margin-top: 12px">
              <button class="btn primary" type="button" @click="editor.open('new')">
                <AppIcon name="plus" size="sm" />Add a stop
              </button>
            </p>
          </section>

          <!-- Next up -->
          <section v-if="next && guide?.mode === 'at'" class="card next" :class="`u-${guide.urgency}`">
            <button type="button" class="thumb art-frame" :aria-label="`Open ${next.title}`" @click="sheet.open(next.id)">
              <SceneArt class="scene" :scene="sceneFor(next)" :tod="todFor(next.start, next.tod)" />
            </button>
            <div class="grow nx">
              <span class="kicker">Next · {{ fmtClock(next.start) }}</span>
              <button type="button" class="nx-title" @click="sheet.open(next.id)">
                {{ next.title }}
              </button>
              <span class="leave num"><AppIcon name="clock" size="xs" />{{ leaveText }}</span>
              <span v-if="legText" class="small muted ellipsis">{{ legText }}</span>
            </div>
            <a v-if="next.place" class="btn icon round" :href="directionsUrl(next.place, mapsMode(guide.leg?.meters), you)" target="_blank" rel="noopener" :aria-label="`Directions to ${next.title}`">
              <AppIcon name="navigate" />
            </a>
          </section>

          <!-- Catch up -->
          <section v-if="guide?.behind.length" class="card catch">
            <div class="row between catch-h">
              <h2 class="h3">
                Did you do these?
              </h2>
              <span class="chip t-warn">{{ guide.behind.length }} not marked</span>
            </div>
            <div class="rows">
              <div v-for="b in guide.behind.slice(0, 4)" :key="b.id" class="row-item">
                <span class="num small faint tm">{{ fmtClock(b.start) }}</span>
                <button type="button" class="grow ellipsis link-like" @click="sheet.open(b.id)">
                  {{ b.title }}
                </button>
                <button class="btn xs ok" type="button" @click="mark(b, 'done')">
                  <AppIcon name="check" size="xs" />Yes
                </button>
                <button class="btn xs" type="button" @click="mark(b, 'skipped')">
                  No
                </button>
              </div>
            </div>
          </section>

          <!-- Later -->
          <section v-if="laterList.length" class="later">
            <div class="sec-h">
              <h2>Later today</h2>
              <NuxtLink class="aside" :to="{ path: `/trips/${trip.id}/plan`, query: { day: day?.id } }">
                Full day
              </NuxtLink>
            </div>
            <ol class="tl card">
              <StopRow
                v-for="(st, i) in laterList"
                :key="st.id"
                :stop="st"
                :state="today!.states[st.id] ?? 'upcoming'"
                :feedback="v.progress.value.feedback[st.id]"
                :last="i === laterList.length - 1"
                @open="sheet.open(st.id)"
                @toggle="v.mark(st.id, today!.states[st.id] === 'done' ? null : 'done')"
              />
            </ol>
            <p v-if="moreLater" class="small faint more">
              + {{ moreLater }} more
            </p>
          </section>
        </div>

        <aside class="side">
          <section class="card mapcard">
            <ClientOnly>
              <MapView
                v-model:follow="follow"
                :markers="markers"
                :lines="lines"
                :home="trip.home"
                :you="geo.fix.value"
                :heading="geo.heading.value"
                :selected="focus?.id"
                :fit-key="day?.id"
                :zoom-control="false"
                label="Today's map"
                @select="(id) => sheet.open(id)"
              />
            </ClientOnly>
            <div class="map-ctl">
              <button class="btn sm round" :class="geo.active.value && follow ? 'primary' : ''" type="button" @click="showMe">
                <AppIcon name="locate" size="sm" />{{ geo.active.value ? (follow ? 'Following you' : 'Follow me') : 'Show me' }}
              </button>
              <NuxtLink class="btn sm icon round" :to="{ path: `/trips/${trip.id}/map`, query: { day: day?.id } }" aria-label="Open the full map">
                <AppIcon name="expand" size="sm" />
              </NuxtLink>
            </div>
            <p v-if="geo.error.value === 'denied'" class="geo-err small">
              Location is blocked for this site. Allow it in your browser settings to see yourself on the map.
            </p>
          </section>

          <section v-if="tally" class="card pad daycard">
            <ProgressRing
              :size="92"
              :stroke="10"
              :total="tally.total"
              :segments="[
                { value: tally.done, color: 'var(--ok)', label: 'Done' },
                { value: tally.skipped, color: 'var(--closed)', label: 'Skipped' },
                { value: tally.missed, color: 'var(--warn)', label: 'Not marked' },
              ]"
            >
              <b class="num ringnum">{{ tally.done }}<small>/{{ tally.total }}</small></b>
            </ProgressRing>
            <div class="grow stack tight">
              <b>Today so far</b>
              <span class="small muted">{{ tally.done }} done · {{ tally.left }} to go<template v-if="tally.skipped">
                · {{ tally.skipped }} skipped
              </template></span>
              <div class="row wrap">
                <button class="btn xs" :class="alertsCtl.enabled.value ? 'gold' : 'ghost'" type="button" @click="alertsCtl.enabled.value ? alertsCtl.disable() : alertsCtl.enable()">
                  <AppIcon name="bolt" size="xs" />{{ alertsCtl.enabled.value ? 'Leave reminders on' : 'Remind me when to leave' }}
                </button>
                <button v-if="wake.isSupported.value" class="btn xs" :class="wake.isActive.value ? 'gold' : 'ghost'" type="button" @click="wake.isActive.value ? wake.release() : wake.request('screen')">
                  <AppIcon name="screen" size="xs" />{{ wake.isActive.value ? 'Screen stays on' : 'Keep screen on' }}
                </button>
              </div>
            </div>
          </section>

          <section v-if="day?.nearby?.food?.length" class="card pad nearby">
            <h2 class="h3">
              Hungry around here?
            </h2>
            <div class="nb-list">
              <a v-for="f in day.nearby.food" :key="f.name" class="nb" :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.query)}`" target="_blank" rel="noopener">
                <span class="nb-pic art-frame"><SceneArt class="scene" :scene="f.scene" tod="day" /></span>
                <span class="grow"><b>{{ f.name }}</b><span class="small muted">{{ f.sub }}</span></span>
                <AppIcon name="ext" size="sm" />
              </a>
            </div>
            <template v-if="day.nearby.photos?.length">
              <h3 class="label photos-h">
                Photo spots today
              </h3>
              <div class="row wrap">
                <span v-for="p in day.nearby.photos" :key="p" class="chip long"><AppIcon name="camera" />{{ p }}</span>
              </div>
            </template>
          </section>
        </aside>
      </div>
    </template>

    <!-- ================= BEFORE ================= -->
    <template v-else-if="m.phase === 'before'">
      <section class="countdown art-frame card">
        <SceneArt class="scene" :scene="trip.cover.scene" :tod="trip.cover.tod" :lazy="false" />
        <div class="scrim" />
        <div class="cd-in on-art">
          <p class="kicker on-art-k">
            {{ fmtRange(trip.start, trip.end) }}
          </p>
          <h1 class="cd-title display">
            {{ trip.title }}
          </h1>
          <div class="cd-num num">
            {{ countdown }}
          </div>
          <p class="cd-sub">
            until {{ firstStop ? `${firstStop.title} (${fmtDate(trip.days[0]!.date, 'short')} ${fmtClock(firstStop.start)})` : 'day one' }}
          </p>
          <div class="row wrap">
            <button class="btn on-art sm" type="button" @click="previewOpen = true">
              <AppIcon name="eye" size="sm" />Preview the live guide
            </button>
          </div>
        </div>
      </section>

      <div class="cols">
        <div class="main">
          <section class="card pad">
            <div class="row between">
              <div>
                <p class="kicker">
                  Do now
                </p>
                <h2 class="h2">
                  Get ready
                </h2>
              </div>
              <div class="row">
                <ProgressRing :size="58" :stroke="7" :total="booked.total" :segments="[{ value: booked.done, color: 'var(--ok)' }]" :label="`${booked.done} of ${booked.total} booked`">
                  <b class="num tiny">{{ booked.done }}/{{ booked.total }}</b>
                </ProgressRing>
              </div>
            </div>
            <div v-if="openBookings.length" class="rows book-rows">
              <label v-for="b in openBookings.slice(0, 6)" :key="b.id" class="row-item bk">
                <input type="checkbox" class="check" :checked="false" @change="v.toggleBooking(b.id, true); toast('Nice, one less thing', { tone: 'ok', action: { label: 'Undo', run: () => v.toggleBooking(b.id, false) } })">
                <span class="grow">
                  <span class="bk-t">{{ b.title }}</span>
                  <span class="row wrap bk-m">
                    <span class="chip" :class="dueChip(b.due, b.asap, b.dueLabel).tone">{{ dueChip(b.due, b.asap, b.dueLabel).text }}</span>
                    <span v-if="b.cost" class="small muted num">{{ b.cost }}</span>
                  </span>
                </span>
              </label>
            </div>
            <p v-else class="muted">
              Everything's booked.
            </p>
            <NuxtLink :to="`/trips/${trip.id}/bookings`" class="btn ghost block see-all">
              All bookings<AppIcon name="arrow" size="sm" />
            </NuxtLink>
          </section>
        </div>
        <aside class="side">
          <NuxtLink :to="`/trips/${trip.id}/packing`" class="card pad card-link packcard">
            <ProgressRing :size="72" :stroke="8" :total="packed.total" :segments="[{ value: packed.done, color: 'var(--gold)' }]">
              <AppIcon name="bag" />
            </ProgressRing>
            <div class="grow">
              <b>Packing</b>
              <p class="small muted">
                {{ packed.done }} of {{ packed.total }} packed
              </p>
            </div>
            <AppIcon name="chevr" />
          </NuxtLink>

          <section class="card pad">
            <p class="kicker">
              Day one
            </p>
            <h2 class="h3">
              {{ v.plans.value[0]?.view.title || trip.days[0]?.label }}
            </h2>
            <ol class="mini-tl">
              <li v-for="st in (v.plans.value[0]?.stops ?? []).slice(0, 7)" :key="st.id" :class="{ minor: st.minor }">
                <span class="num">{{ fmtClock(st.start) }}</span>
                <button type="button" class="link-like ellipsis" @click="sheet.open(st.id)">
                  {{ st.title }}
                </button>
              </li>
            </ol>
            <NuxtLink :to="`/trips/${trip.id}/plan`" class="btn ghost block see-all">
              Whole plan<AppIcon name="arrow" size="sm" />
            </NuxtLink>
          </section>
        </aside>
      </div>
    </template>

    <!-- ================= AFTER ================= -->
    <template v-else>
      <section class="countdown art-frame card">
        <SceneArt class="scene" :scene="trip.cover.scene" tod="night" :lazy="false" />
        <div class="scrim" />
        <div class="cd-in on-art">
          <p class="kicker on-art-k">
            {{ fmtRange(trip.start, trip.end) }}
          </p>
          <h1 class="cd-title display">
            {{ trip.title }}, done.
          </h1>
          <p v-if="s" class="cd-sub num">
            {{ s.all.done }} done · {{ s.all.skipped }} skipped<template v-if="s.avgRating">
              · ★ {{ s.avgRating.toFixed(1) }}
            </template><template v-if="s.spent">
              · {{ money(s.spent, trip.currency) }} spent
            </template>
          </p>
          <div class="row wrap">
            <NuxtLink :to="`/trips/${trip.id}/progress`" class="btn gold sm">
              <AppIcon name="book" size="sm" />Open your journal
            </NuxtLink>
          </div>
        </div>
      </section>
      <section v-if="s && s.all.missed" class="card pad after-miss">
        <AppIcon name="alert" />
        <div class="grow">
          <b>{{ s.all.missed }} stops aren't marked yet</b>
          <p class="small muted">
            Mark what you did so your journal tells the real story.
          </p>
        </div>
        <NuxtLink :to="{ path: `/trips/${trip.id}/progress`, query: { view: 'left' } }" class="btn sm">
          Review
        </NuxtLink>
      </section>
    </template>

    <PreviewSheet v-model="previewOpen" />
  </div>
</template>

<style scoped>
.now { padding-top: 12px; }
.statusline { display: flex; align-items: flex-end; gap: 12px; margin-bottom: 10px; }
.clockrow { gap: 4px 10px; align-items: baseline; }
.clock { font-size: 30px; font-weight: 600; line-height: 1.1; }
.alerts { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.alert { display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; border-radius: 14px; background: var(--gold-soft); color: var(--fg); font-size: 14px; font-weight: 550; }
.alert .i { color: var(--gold-ink); margin-top: 2px; }
.alert.warn { background: var(--warn-soft); }
.alert.warn .i { color: var(--warn); }
.alert.sun { background: var(--surface); border: 1px solid var(--line); color: var(--fg-2); }

.cols { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
.main, .side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
@media (min-width: 960px) {
  .cols { grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); align-items: start; }
  .side { position: sticky; top: calc(var(--top-h) + 16px); }
}

/* hero */
.hero { overflow: hidden; }
.pic { height: 250px; display: flex; flex-direction: column; justify-content: space-between; }
@media (min-width: 600px) { .pic { height: 290px; } }
.pic-top { display: flex; justify-content: space-between; gap: 8px; padding: 14px; }
.pic-in { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 6px; }
.lead { font-size: 13px; font-weight: 650; letter-spacing: .06em; text-transform: uppercase; color: var(--on-art-2); }
.ttl { font-size: clamp(24px, 6.4vw, 32px); font-weight: 700; line-height: 1.12; letter-spacing: -.01em; text-shadow: 0 2px 16px rgba(0, 0, 0, .4); }
.prog { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
.prog .bar { flex: 1; }
.glassbar { background: rgba(255, 255, 255, .25); }
.big-count { font-size: 20px; font-weight: 600; margin-top: 2px; }
.big-count.u-late, .big-count.u-now { color: #FFD0C9; }
.big-count.u-soon { color: #FFE3A3; }
.hero-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.tip { font-size: 15px; line-height: 1.5; color: var(--fg); }
.leg { display: flex; align-items: center; gap: 8px; }
.acts { display: flex; gap: 8px; }
.acts .btn.lg { min-height: 54px; }
.mode-go.u-late .hero-body, .mode-go.u-now .hero-body { background: color-mix(in srgb, var(--bad-soft) 60%, var(--surface)); }

/* next */
.next { display: flex; align-items: center; gap: 12px; padding: 12px; }
.thumb { width: 78px; height: 78px; border-radius: 14px; border: 0; padding: 0; flex: none; }
.nx { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.nx-title { font-weight: 700; font-size: 16px; line-height: 1.25; text-align: left; background: none; border: 0; padding: 0; color: var(--fg); }
.leave { display: inline-flex; align-items: center; gap: 5px; font-size: 13.5px; font-weight: 600; color: var(--fg-2); }
.u-soon .leave { color: var(--warn); }
.u-now .leave, .u-late .leave { color: var(--bad); }

/* catch-up */
.catch { overflow: hidden; }
.catch-h { padding: 14px 16px 10px; }
.catch .row-item { padding: 10px 14px; gap: 8px; }
.tm { width: 42px; flex: none; }
.link-like { background: none; border: 0; padding: 0; text-align: left; color: var(--fg); font-weight: 600; }
.link-like:hover { color: var(--accent); }

.later .tl { padding: 6px 6px 6px 0; margin: 0; }
.more { margin: 8px 4px 0; }

/* map */
.mapcard { position: relative; overflow: hidden; height: 300px; }
@media (min-width: 960px) { .mapcard { height: 380px; } }
.map-ctl { position: absolute; right: 10px; bottom: 10px; z-index: 500; display: flex; gap: 8px; }
.map-ctl .btn { box-shadow: var(--shadow); background: var(--surface); }
.map-ctl .btn.primary { background: var(--accent); }
.geo-err { position: absolute; left: 10px; right: 10px; top: 10px; z-index: 500; padding: 8px 12px; border-radius: 12px; background: var(--surface); box-shadow: var(--shadow); }

.daycard { display: flex; align-items: center; gap: 16px; }
.ringnum { font-size: 22px; }
.ringnum small { font-size: 13px; color: var(--fg-3); }

.nearby { display: flex; flex-direction: column; gap: 12px; }
.nb-list { display: flex; flex-direction: column; gap: 8px; }
.nb { display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--fg); padding: 6px; margin: -6px; border-radius: 12px; }
.nb:hover { background: var(--surface-2); }
.nb .grow { display: flex; flex-direction: column; }
.nb-pic { width: 48px; height: 48px; border-radius: 12px; flex: none; }
.nb .i { color: var(--fg-3); }
.photos-h { margin-top: 4px; }

/* before / after */
.countdown { min-height: 330px; display: flex; align-items: flex-end; overflow: hidden; margin-bottom: 16px; }
.cd-in { padding: 22px; display: flex; flex-direction: column; gap: 8px; width: 100%; }
.on-art-k { color: var(--on-art-2); }
.cd-title { font-size: clamp(40px, 11vw, 76px); letter-spacing: .16em; line-height: 1; text-transform: uppercase; text-shadow: 0 2px 24px rgba(0, 0, 0, .35); }
.cd-num { font-size: clamp(30px, 8vw, 44px); font-weight: 600; line-height: 1.1; margin-top: 6px; }
.cd-sub { color: var(--on-art-2); font-size: 14.5px; }
.book-rows { margin: 14px -16px 0; border-top: 1px solid var(--line); }
.bk { align-items: flex-start; cursor: pointer; }
.bk-t { display: block; font-weight: 600; line-height: 1.35; }
.bk-m { gap: 6px; margin-top: 5px; }
.see-all { margin-top: 12px; }
.packcard { display: flex; align-items: center; gap: 14px; }
.mini-tl { list-style: none; margin: 10px 0 0; display: flex; flex-direction: column; gap: 6px; }
.mini-tl li { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 8px; align-items: baseline; font-size: 14.5px; }
.mini-tl li.minor { font-size: 13px; color: var(--fg-2); }
.mini-tl li.minor .link-like { font-weight: 500; color: var(--fg-2); }
.after-miss { display: flex; align-items: center; gap: 14px; }
.after-miss > .i { color: var(--warn); }
</style>
