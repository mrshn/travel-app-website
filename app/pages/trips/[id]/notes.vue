<script setup lang="ts">
const v = useTripView()
const { ready, load, notes } = useNotes()
await load()
const mine = computed(() => notes.value.filter(n => n.trip === v.id.value))
</script>

<template>
  <div v-if="v.trip.value" class="page tnotes">
    <p class="kicker">
      {{ v.trip.value.title }}
    </p>
    <h1 class="h2 ttl">
      Notes & chats
    </h1>
    <p class="small muted intro">
      Research and chats saved for this trip. <NuxtLink to="/notes">
        All notes
      </NuxtLink>
    </p>
    <NoteList v-if="ready && mine.length" :notes="mine" :from="`/trips/${v.id.value}/notes`" />
    <div v-else-if="ready" class="card empty">
      <AppIcon name="book" />
      <h3>Nothing saved for this trip yet</h3>
      <p>In a chat about {{ v.trip.value.destination }}, ask Claude to “save this chat to Travels”.</p>
    </div>
  </div>
</template>

<style scoped>
.tnotes { padding-top: 18px; max-width: 820px; }
.ttl { margin-top: 2px; }
.intro { margin: 6px 0 16px; }
</style>
