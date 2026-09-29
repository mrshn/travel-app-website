<script setup lang="ts">
import type { TripFormValue } from '~/components/TripForm.vue'

const trips = useTrips()

function create(f: TripFormValue) {
  const t = trips.create({
    title: f.title || f.destination,
    destination: f.destination || f.title,
    country: f.country,
    subtitle: f.subtitle,
    start: f.start,
    end: f.end,
    timezone: f.timezone,
    currency: f.currency,
    cover: f.cover,
    home: f.home.lat !== null && f.home.lng !== null ? { label: f.home.label || 'Home', name: f.home.label || 'Home', address: f.home.address || undefined, lat: f.home.lat, lng: f.home.lng } : undefined,
  })
  if (f.homeCurrency && f.rate && f.homeCurrency !== f.currency) {
    trips.update(t.id, (x) => {
      x.fx = { homeCurrency: f.homeCurrency, rate: f.rate! }
    })
  }
  toast('Trip created. Add your first stops.', { tone: 'ok' })
  navigateTo(`/trips/${t.id}/plan`)
}
useHead({ title: 'New trip · Travels' })
</script>

<template>
  <div class="page newtrip">
    <header class="nh">
      <NuxtLink to="/" class="btn icon plain round" aria-label="Back to all trips">
        <AppIcon name="chevl" />
      </NuxtLink>
      <div>
        <p class="kicker">
          Plan something
        </p>
        <h1 class="h2">
          New trip
        </h1>
      </div>
    </header>
    <TripForm submit-label="Create trip" @submit="create" />
  </div>
</template>

<style scoped>
.newtrip { max-width: 760px; padding-top: calc(12px + var(--safe-t)); padding-bottom: 48px; }
.nh { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
</style>
