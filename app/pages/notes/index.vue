<script setup lang="ts">
const { notes, ready, load } = useNotes()
const { repo, branch } = useAppConfig()
await load()
useHead({ title: 'Notes & chats · Travels' })
</script>

<template>
  <div class="page notes-page">
    <header class="nh">
      <NuxtLink to="/" class="btn icon plain round" aria-label="Back to all trips">
        <AppIcon name="chevl" />
      </NuxtLink>
      <div>
        <p class="kicker">
          Saved from chats
        </p>
        <h1 class="h2">
          Notes & chats
        </h1>
      </div>
    </header>
    <p class="muted intro">
      Research, tips and chat logs saved from conversations with Claude. They live in
      <a :href="`https://github.com/${repo}/tree/${branch}/content/notes`" target="_blank" rel="noopener">content/notes</a>
      in your GitHub project, so every save shows up here after the site redeploys.
    </p>
    <NoteList v-if="ready && notes.length" :notes="notes" show-trips />
    <div v-else-if="ready" class="card empty">
      <AppIcon name="book" />
      <h3>No notes yet</h3>
      <p>In a chat, ask Claude to “save this chat to Travels”.</p>
    </div>
  </div>
</template>

<style scoped>
.notes-page { max-width: 820px; padding-top: calc(12px + var(--safe-t)); padding-bottom: 48px; }
.nh { display: flex; align-items: center; gap: 8px; }
.intro { margin: 12px 0 16px; font-size: 14.5px; }
</style>
