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

    <DriverCard v-model:open="driver" :lines="trip.driverCard" />
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
</style>
