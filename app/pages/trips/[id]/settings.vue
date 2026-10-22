<script setup lang="ts">
import type { TripFormValue } from '~/components/TripForm.vue'

const v = useTripView()
const trip = v.trip
const seed = computed(() => v.trips.seedOf(trip.value))
const cloud = useCloud()
/** Signed in with Google: the data is in your account in the cloud too. */
const signedIn = computed(() => !!cloud.user.value)

function save(f: TripFormValue) {
  const t = trip.value
  if (!t) return
  if (f.start !== t.start || f.end !== t.end) {
    const lost = t.days.slice(Math.max(0, Math.round((Date.parse(f.end) - Date.parse(f.start)) / 86_400_000) + 1)).reduce((n, d) => n + d.stops.length, 0)
    if (lost && !confirm(`The new dates are shorter: ${lost} planned stops on the last days will be removed. Continue?`)) return
    v.trips.setDates(t.id, f.start, f.end)
  }
  v.trips.update(t.id, (x) => {
    x.title = f.title || f.destination
    x.destination = f.destination || f.title
    x.country = f.country || undefined
    x.subtitle = f.subtitle || undefined
    x.timezone = f.timezone
    x.currency = f.currency
    x.cover = f.cover
    x.fx = f.homeCurrency && f.rate && f.homeCurrency !== f.currency ? { ...x.fx, homeCurrency: f.homeCurrency, rate: f.rate } : undefined
    x.home = f.home.lat !== null && f.home.lng !== null
      ? { ...x.home, label: f.home.label || 'Home', name: x.home?.name ?? (f.home.label || 'Home'), address: f.home.address || undefined, lat: f.home.lat, lng: f.home.lng }
      : undefined
  })
  toast('Trip saved', { tone: 'ok' })
}

function exportTrip() {
  const t = trip.value
  if (!t) return
  const data = { app: 'travels', version: 1, exportedAt: new Date().toISOString(), trips: [t], progress: { [t.id]: v.progress.value } }
  downloadFile(`${t.id}.travels.json`, JSON.stringify(data, null, 1))
}

function resetPlan() {
  const t = trip.value
  if (!t || !confirm('Put the plan back to the original? Stops you added or edited are lost; what you ticked off, ratings and notes stay.')) return
  v.trips.resetToSeed(t.id)
  toast('Plan reset to the original', { tone: 'ok' })
}

function clearProgress() {
  if (!confirm('Clear everything you ticked, rated, wrote, logged and stamped for this trip? This can\'t be undone.')) return
  v.clear()
  toast('Progress cleared')
}

function removeTrip() {
  const t = trip.value
  if (!t || !confirm(`Delete “${t.title}” and everything you logged for it from this device?`)) return
  v.clear()
  v.trips.remove(t.id)
  toast('Trip deleted')
  navigateTo('/')
}
</script>

<template>
  <div v-if="trip" class="page tsettings">
    <p class="kicker">
      {{ trip.title }}
    </p>
    <h1 class="h2 ttl">
      Trip settings
    </h1>

    <section v-if="trip.variant" class="card pad stack variant">
      <h2 class="h3">
        {{ trip.variant.question }}
      </h2>
      <p v-if="trip.variant.hint" class="small muted">
        {{ trip.variant.hint }}
      </p>
      <div class="seg">
        <button v-for="o in trip.variant.options" :key="o.id" type="button" :aria-pressed="v.variant.value === o.id" @click="v.setVariant(o.id)">
          {{ o.label }}
        </button>
      </div>
    </section>

    <TripForm v-if="v.canEdit.value" :trip="trip" submit-label="Save changes" @submit="save" />
    <section v-else class="card pad stack">
      <h2 class="h3">
        {{ trip.title }} · {{ fmtRange(trip.start, trip.end) }}
      </h2>
      <p class="small muted">
        You can view this trip. Its name, dates and where everyone stays are the organiser's to change.
      </p>
    </section>
    <section v-if="trip.group" class="card pad stack together">
      <h2 class="h3">
        A group trip
      </h2>
      <p class="small muted">
        Everyone in it sees this plan. Your ticks, ratings, notes, photos, costs and stamps stay yours.
      </p>
      <div class="row wrap">
        <NuxtLink class="btn" :to="`/trips/${trip.id}/group?tab=people`">
          <AppIcon name="users" size="sm" />People and roles
        </NuxtLink>
      </div>
    </section>

    <section class="card pad stack data">
      <h2 class="h3">
        Your data
      </h2>
      <p v-if="signedIn" class="small muted">
        Everything is kept on this device and in your account in the cloud. Export a backup if you want a file of your own.
      </p>
      <p v-else class="small muted">
        Everything lives in this browser on this device. Export a backup to move it to another phone or keep it safe (photos stay on this device).
      </p>
      <div class="row wrap">
        <button class="btn" type="button" @click="exportTrip">
          <AppIcon name="download" size="sm" />Export this trip
        </button>
        <button v-if="seed" class="btn ghost" type="button" @click="resetPlan">
          <AppIcon name="refresh" size="sm" />Reset plan to original
        </button>
      </div>
      <hr class="divider">
      <div class="row wrap">
        <button class="btn danger" type="button" @click="clearProgress">
          <AppIcon name="undo" size="sm" />Clear my progress
        </button>
        <button v-if="!trip.group" class="btn danger" type="button" @click="removeTrip">
          <AppIcon name="trash" size="sm" />Delete trip
        </button>
        <NuxtLink v-else class="btn danger" :to="`/trips/${trip.id}/group?tab=people`">
          <AppIcon name="logout" size="sm" />{{ trip.group.role === 'owner' ? 'Stop sharing' : 'Leave this trip' }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tsettings { padding-top: 18px; max-width: 760px; }
.ttl { margin-bottom: 14px; }
.variant { margin-bottom: 14px; }
.data { margin-top: 14px; }
.together { margin-top: 14px; }
</style>
