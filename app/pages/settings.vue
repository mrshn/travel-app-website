<script setup lang="ts">
import type { Trip, TripProgress } from '#shared/types/trip'
import { emptyProgress } from '#shared/utils/plan'
import { mergeProgress } from '#shared/utils/sync'

const trips = useTrips()
const store = useProgressStore()
const cloud = useCloud()
const gmaps = useGoogleMaps()
const mapNote = computed(() => {
  if (!gmaps.key) return 'Google Maps isn’t set up in this copy of the app.'
  if (gmaps.provider.value === 'osm') return 'A clean map that’s saved for offline use as you look around. Leave-by times still come from Google when you’re online.'
  if (gmaps.tilesWork.value === false) return 'Google Maps isn’t answering yet (the key needs the Map Tiles API and billing), so the OpenStreetMap map shows instead.'
  return 'Shops, restaurants and transit from Google, with real walking and transit times for “leave by”. Offline, the map shows the areas you looked at with OpenStreetMap on.'
})
const { choice } = useTheme()
const fileInput = ref<HTMLInputElement | null>(null)

function exportAll() {
  const data = { app: 'travels', version: 1, exportedAt: new Date().toISOString(), trips: trips.trips.value, progress: store.value }
  downloadFile(`travels-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 1))
}

function isTrip(x: unknown): x is Trip {
  const t = x as Trip
  return !!t && typeof t.id === 'string' && typeof t.start === 'string' && typeof t.end === 'string' && Array.isArray(t.days) && typeof t.timezone === 'string'
}

async function importFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const data = JSON.parse(await file.text()) as { app?: string, trips?: unknown[], progress?: Record<string, TripProgress> }
    const incoming = (data.trips ?? []).filter(isTrip)
    if (!incoming.length) throw new Error('no trips')
    let added = 0
    let replaced = 0
    const list = [...trips.trips.value]
    for (const t of incoming) {
      const i = list.findIndex(x => x.id === t.id)
      if (i >= 0) {
        list[i] = { ...t, bookings: t.bookings ?? [], packing: t.packing ?? [] }
        replaced++
      }
      else {
        list.push({ ...t, bookings: t.bookings ?? [], packing: t.packing ?? [] })
        added++
      }
      // What you did merges with what the backup holds (costs and stamps record by record, the newer copy
      // winning), so an older backup never takes away newer ticks, costs or stamps made on this device.
      const p = data.progress?.[t.id]
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        // With nothing here yet, merged into an empty one all the same: a hand-edited backup whose costs or stamps
        // are lists (not records by id) would otherwise swallow every cost and stamp added after it.
        store.value[t.id] = mergeProgress(store.value[t.id] ?? emptyProgress(), p)
      }
    }
    trips.replaceAll(list)
    toast(`Imported: ${added} new, ${replaced} updated`, { tone: 'ok' })
  }
  catch {
    toast('That file is not a Travels backup', { tone: 'warn' })
  }
  finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}

const missingSeeds = computed(() => SEED_TRIPS.filter(s => !trips.get(s.id)))
function restore(id: string) {
  const t = trips.restoreSeed(id)
  if (t) toast(`${t.title} is back`, { tone: 'ok' })
}

async function wipe() {
  const signedIn = !!cloud.user.value
  if (!confirm(signedIn
    ? 'Delete all trips and everything you logged on this device? You\'ll be signed out; your Google account keeps its copy.'
    : 'Delete all trips and everything you logged on this device?')) return
  if (signedIn) await cloud.forget()
  trips.replaceAll([])
  store.value = {}
  toast('All data deleted')
}
useHead({ title: 'Settings · Travels' })
</script>

<template>
  <div class="page appsettings">
    <header class="nh">
      <NuxtLink to="/" class="btn icon plain round" aria-label="Back to all trips">
        <AppIcon name="chevl" />
      </NuxtLink>
      <h1 class="h2">
        Settings
      </h1>
    </header>

    <AccountCard />

    <section class="card pad stack">
      <h2 class="h3">
        Look
      </h2>
      <div class="seg">
        <button type="button" :aria-pressed="choice === 'auto'" @click="choice = 'auto'">
          <AppIcon name="screen" size="sm" />Like my phone
        </button>
        <button type="button" :aria-pressed="choice === 'light'" @click="choice = 'light'">
          <AppIcon name="sun" size="sm" />Light
        </button>
        <button type="button" :aria-pressed="choice === 'dark'" @click="choice = 'dark'">
          <AppIcon name="moon" size="sm" />Dark
        </button>
      </div>
    </section>

    <section class="card pad stack">
      <h2 class="h3">
        Map
      </h2>
      <div class="seg">
        <button type="button" :aria-pressed="gmaps.provider.value === 'google'" @click="gmaps.provider.value = 'google'">
          <AppIcon name="map" size="sm" />Google Maps
        </button>
        <button type="button" :aria-pressed="gmaps.provider.value === 'osm'" @click="gmaps.provider.value = 'osm'">
          <AppIcon name="layers" size="sm" />OpenStreetMap
        </button>
      </div>
      <p class="small muted">
        {{ mapNote }}
      </p>
    </section>

    <section class="card pad stack">
      <h2 class="h3">
        Backup
      </h2>
      <p v-if="cloud.user.value" class="small muted">
        Everything is also kept in your Google account (above). A backup file is still handy as an extra copy you keep yourself.
      </p>
      <p v-else class="small muted">
        Your trips, ticks, ratings and notes are stored in this browser only. Sign in above to keep them in your account, or export a backup file and import it on another device. Photos stay on the device they were taken on.
      </p>
      <div class="row wrap">
        <button class="btn primary" type="button" @click="exportAll">
          <AppIcon name="download" size="sm" />Export everything
        </button>
        <label class="btn ghost">
          <input ref="fileInput" class="sr-only" type="file" accept="application/json,.json" @change="importFile">
          <AppIcon name="upload" size="sm" />Import a backup
        </label>
      </div>
    </section>

    <section v-if="missingSeeds.length" class="card pad stack">
      <h2 class="h3">
        Sample trips
      </h2>
      <div v-for="s in missingSeeds" :key="s.id" class="row between">
        <span>{{ s.title }} · {{ fmtRange(s.start, s.end) }}</span>
        <button class="btn sm" type="button" @click="restore(s.seedId ?? s.id)">
          <AppIcon name="refresh" size="sm" />Bring back
        </button>
      </div>
    </section>

    <section class="card pad stack">
      <h2 class="h3">
        Use it like an app
      </h2>
      <p class="small muted">
        Add Travels to your home screen (Share → Add to Home Screen on iPhone, or the install prompt in Chrome). It then opens full screen and works offline; OpenStreetMap areas you've looked at stay saved for when you have no signal.
      </p>
    </section>

    <section class="card pad stack">
      <h2 class="h3">
        Start over
      </h2>
      <button class="btn danger" type="button" @click="wipe">
        <AppIcon name="trash" size="sm" />Delete all data on this device
      </button>
    </section>
  </div>
</template>

<style scoped>
.appsettings { max-width: 760px; padding-top: calc(12px + var(--safe-t)); padding-bottom: 48px; display: flex; flex-direction: column; gap: 14px; }
.nh { display: flex; align-items: center; gap: 8px; }
</style>
