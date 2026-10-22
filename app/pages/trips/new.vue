<script setup lang="ts">
import type { TripFormValue } from '~/components/TripForm.vue'

const trips = useTrips()
/** Who's coming: with friends, the new trip opens on Together with Invite people, so planning starts together. */
const who = ref<'solo' | 'friends'>('solo')

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
  if (who.value === 'friends') {
    toast('Trip created. Invite your friends to plan it with you.', { tone: 'ok' })
    navigateTo(`/trips/${t.id}/group?invite=1`)
    return
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
    <section class="card pad who" aria-labelledby="nt-who">
      <h2 id="nt-who" class="h3">
        Who's coming?
      </h2>
      <div class="seg block" role="group" aria-labelledby="nt-who">
        <button type="button" :aria-pressed="who === 'solo'" @click="who = 'solo'">
          <AppIcon name="person" size="sm" />Just me
        </button>
        <button type="button" :aria-pressed="who === 'friends'" @click="who = 'friends'">
          <AppIcon name="friends" size="sm" />With friends
        </button>
      </div>
      <p class="small muted">
        {{ who === 'friends'
          ? 'Next you get a link to invite them. Everyone sees one plan, votes on options and chats; your ticks, costs and notes stay yours.'
          : 'You can invite people any time from the trip.' }}
      </p>
    </section>
    <TripForm submit-label="Create trip" @submit="create" />
  </div>
</template>

<style scoped>
.newtrip { max-width: 760px; padding-top: calc(12px + var(--safe-t)); padding-bottom: 48px; }
.nh { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.who { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.who .seg button { min-height: 44px; }
</style>
