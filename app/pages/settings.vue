<script setup lang="ts">
import type { Trip, TripProgress } from '#shared/types/trip'

const trips = useTrips()
const store = useProgressStore()
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
      const p = data.progress?.[t.id]
      if (p) store.value[t.id] = p
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

function wipe() {
  if (!confirm('Delete all trips and everything you logged on this device?')) return
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
        Backup
      </h2>
      <p class="small muted">
        Your trips, ticks, ratings and notes are stored in this browser only. Export a backup file to keep them safe or move them to another device, then import it there. Photos stay on the device they were taken on.
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
        Add Travels to your home screen (Share → Add to Home Screen on iPhone, or the install prompt in Chrome). It then opens full screen and works offline; map areas you've looked at stay cached for when you have no signal.
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
