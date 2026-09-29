<script setup lang="ts">
import { directionsUrl } from '#shared/utils/geo'

const v = useTripView()
const trip = v.trip
const driver = ref(false)
const calls = computed(() => (trip.value?.sos ?? []).filter(s => s.tel))
const notes = computed(() => (trip.value?.sos ?? []).filter(s => !s.tel))

async function copyAddress() {
  const h = trip.value?.home
  if (!h) return
  const ok = await copyText([h.name, h.address].filter(Boolean).join(', '))
  toast(ok ? 'Address copied' : 'Could not copy', { tone: ok ? 'ok' : 'warn' })
}
</script>

<template>
  <div v-if="trip" class="page sos-page">
    <p class="kicker k">
      Emergency
    </p>
    <h1 class="h2">
      SOS
    </h1>

    <div class="calls">
      <a v-for="c in calls" :key="c.value" :href="`tel:${c.tel}`" class="call card" :class="{ big: c.big }">
        <span class="ic"><AppIcon name="phone" :size="c.big ? 'xl' : 'lg'" /></span>
        <span class="grow">
          <b class="num nm">{{ c.value }}</b>
          <span class="small">{{ c.label }}</span>
        </span>
      </a>
    </div>

    <div v-if="notes.length" class="card pad notes">
      <div v-for="n in notes" :key="n.label" class="note">
        <b>{{ n.label }}</b>
        <span class="small muted">{{ n.value }}</span>
      </div>
    </div>

    <section v-if="trip.sosSteps?.length" class="card pad">
      <h2 class="h3">
        If something goes wrong
      </h2>
      <ol class="steps">
        <li v-for="(s, i) in trip.sosSteps" :key="i">
          {{ s }}
        </li>
      </ol>
    </section>

    <section v-if="trip.home" class="card pad home">
      <div class="row top">
        <AppIcon name="bed" class="hi" />
        <div class="grow">
          <b>{{ trip.home.label }}</b>
          <p v-if="trip.home.address" class="small muted">
            {{ trip.home.address }}
          </p>
        </div>
      </div>
      <div class="row wrap">
        <a class="btn primary sm" :href="directionsUrl(trip.home, 'walking')" target="_blank" rel="noopener"><AppIcon name="navigate" size="sm" />Take me home</a>
        <button class="btn sm" type="button" @click="copyAddress">
          <AppIcon name="copy" size="sm" />Copy address
        </button>
        <button v-if="trip.driverCard?.length" class="btn sm gold" type="button" @click="driver = true">
          <AppIcon name="taxi" size="sm" />Show the driver
        </button>
      </div>
    </section>

    <Teleport to="body">
      <div v-if="driver && trip.driverCard" class="driver" role="dialog" aria-modal="true" aria-label="Card for the taxi driver" @click="driver = false">
        <div class="dc">
          <p v-for="(l, i) in trip.driverCard" :key="i" :class="{ first: i === 0 }">
            {{ l }}
          </p>
        </div>
        <span class="small tap">Tap anywhere to close</span>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.sos-page { padding-top: 18px; max-width: 760px; }
.k { color: var(--bad); }
.calls { display: flex; flex-direction: column; gap: 10px; margin: 16px 0; }
.call { display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-decoration: none; color: var(--fg); }
.call .grow { display: flex; flex-direction: column; gap: 2px; }
.nm { font-size: 20px; }
.ic { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; background: var(--bad-soft); color: var(--bad); flex: none; }
.call.big { background: var(--bad); color: #fff; border-color: var(--bad); }
.call.big .ic { background: rgba(255, 255, 255, .18); color: #fff; width: 64px; height: 64px; }
.call.big .nm { font-size: 34px; }
.notes { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.note { display: flex; flex-direction: column; }
.steps { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.home { display: flex; flex-direction: column; gap: 12px; margin-top: 14px; }
.hi { color: var(--accent); }
.driver { position: fixed; inset: 0; z-index: 5000; background: #fff; color: #111; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; gap: 20px; }
.dc { text-align: center; }
.dc p { font-size: clamp(26px, 7vw, 44px); font-weight: 700; line-height: 1.25; }
.dc p.first { font-size: clamp(18px, 4.5vw, 26px); font-weight: 600; color: #555; margin-bottom: 10px; }
.tap { color: #777; }
</style>
