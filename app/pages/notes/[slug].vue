<script setup lang="ts">
import { renderMarkdown } from '#shared/utils/markdown'

const route = useRoute()
const router = useRouter()
const { load, get } = useNotes()
const { trips } = useTrips()
await load()

const note = computed(() => get(String(route.params.slug)))
const rendered = computed(() => (note.value ? renderMarkdown(note.value.body) : { html: '', toc: [] }))
const toc = computed(() => rendered.value.toc.filter(t => t.depth === 2))
const trip = computed(() => (note.value?.trip ? trips.value.find(t => t.id === note.value!.trip) : undefined))
const back = computed(() => (typeof route.query.from === 'string' && route.query.from.startsWith('/') ? route.query.from : trip.value ? `/trips/${trip.value.id}/notes` : '/notes'))
const base = useRuntimeConfig().app.baseURL
const pageHref = computed(() => {
  const l = note.value?.link
  if (!l) return ''
  return /^https?:\/\//.test(l) ? l : `${base}${l.replace(/^\//, '')}`
})

function onClick(e: MouseEvent) {
  const a = (e.target as HTMLElement).closest('a')
  const to = a?.getAttribute('data-to')
  if (to) {
    e.preventDefault()
    router.push(to)
  }
}

async function share() {
  const url = window.location.href.split('?')[0]!
  try {
    if (navigator.share) {
      await navigator.share({ title: note.value?.title, url })
      return
    }
  }
  catch { /* cancelled */ }
  const ok = await copyText(url)
  toast(ok ? 'Link copied' : 'Could not copy the link', { tone: ok ? 'ok' : 'warn' })
}

onMounted(() => {
  const h = route.hash?.slice(1)
  if (h) nextTick(() => document.getElementById(h)?.scrollIntoView())
})
useHead({ title: computed(() => (note.value ? `${note.value.title} · Travels` : 'Note · Travels')) })
</script>

<template>
  <div class="page note-page">
    <header class="nh">
      <NuxtLink :to="back" class="btn icon plain round" aria-label="Back">
        <AppIcon name="chevl" />
      </NuxtLink>
      <span class="kicker grow">{{ note ? NOTE_META[note.kind].label : 'Note' }}</span>
      <button v-if="note" class="btn icon plain round" type="button" aria-label="Share this note" @click="share">
        <AppIcon name="ext" />
      </button>
    </header>

    <article v-if="note" class="card sheetlike">
      <div class="head">
        <p class="meta small faint num">
          {{ note.date ? fmtDate(note.date, 'full') : '' }}
        </p>
        <h1 class="h1 ttl">
          {{ note.title }}
        </h1>
        <p v-if="note.summary" class="summary">
          {{ note.summary }}
        </p>
        <div class="row wrap chips">
          <NuxtLink v-if="trip" :to="`/trips/${trip.id}/now`" class="chip t-accent-soft"><AppIcon name="pin" />{{ trip.title }} trip</NuxtLink>
          <span v-for="t in note.tags" :key="t" class="chip">#{{ t }}</span>
        </div>
        <div class="row wrap acts">
          <a v-if="pageHref" class="btn primary sm" :href="pageHref" target="_blank" rel="noopener">
            <AppIcon name="image" size="sm" />Open the page
          </a>
          <a class="btn ghost sm" :href="githubEditUrl(note.file)" target="_blank" rel="noopener">
            <AppIcon name="edit" size="sm" />Edit on GitHub
          </a>
        </div>
      </div>

      <details v-if="toc.length >= 4" class="toc">
        <summary><AppIcon name="list" size="sm" />Contents <span class="faint num">{{ toc.length }}</span></summary>
        <ol>
          <li v-for="t in toc" :key="t.id">
            <a :href="`#${t.id}`">{{ t.text }}</a>
          </li>
        </ol>
      </details>

      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="prose" @click="onClick" v-html="rendered.html" />
    </article>

    <div v-else class="card empty">
      <AppIcon name="doc" />
      <h3>Note not found</h3>
      <p>
        <NuxtLink to="/notes">
          All notes
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.note-page { max-width: 860px; padding-top: calc(10px + var(--safe-t)); padding-bottom: 56px; }
.nh { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.sheetlike { padding: 22px 20px 26px; }
@media (min-width: 700px) { .sheetlike { padding: 32px 40px 40px; } }
.head { display: flex; flex-direction: column; gap: 8px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
.ttl { line-height: 1.15; }
.summary { font-size: 16.5px; color: var(--fg-2); }
.chips { gap: 6px; }
.acts { gap: 8px; margin-top: 4px; }
.toc { margin: 16px 0 4px; border: 1px solid var(--line); border-radius: 14px; background: var(--bg); }
.toc summary { cursor: pointer; padding: 10px 14px; font-weight: 650; display: flex; align-items: center; gap: 8px; list-style: none; }
.toc summary::-webkit-details-marker { display: none; }
.toc ol { margin: 0; padding: 0 16px 12px 36px; display: flex; flex-direction: column; gap: 4px; font-size: 14.5px; }
.toc a { text-decoration: none; }

.prose { margin-top: 18px; font-size: 16px; line-height: 1.65; overflow-wrap: anywhere; }
.prose :deep(h2) { font-size: 22px; margin: 34px 0 10px; line-height: 1.25; scroll-margin-top: 20px; }
.prose :deep(h3) { font-size: 18px; margin: 24px 0 8px; scroll-margin-top: 20px; }
.prose :deep(h4) { font-size: 16px; margin: 18px 0 6px; }
.prose :deep(p) { margin: 0 0 12px; }
.prose :deep(ul), .prose :deep(ol) { margin: 0 0 14px; padding-left: 22px; display: flex; flex-direction: column; gap: 5px; }
.prose :deep(li::marker) { color: var(--accent); }
.prose :deep(blockquote) { margin: 0 0 14px; padding: 10px 16px; border-left: 4px solid var(--gold); background: var(--gold-soft); border-radius: 0 12px 12px 0; }
.prose :deep(blockquote p:last-child) { margin-bottom: 0; }
.prose :deep(hr) { border: 0; height: 1px; background: var(--line); margin: 26px 0; }
.prose :deep(code) { font-family: var(--font-data); font-size: .9em; background: var(--surface-2); padding: 1px 5px; border-radius: 6px; }
.prose :deep(pre) { background: var(--surface-2); padding: 12px 14px; border-radius: 12px; overflow-x: auto; }
.prose :deep(pre code) { background: none; padding: 0; }
.prose :deep(table) { display: block; overflow-x: auto; border-collapse: collapse; margin: 0 0 16px; font-size: 14px; max-width: 100%; }
.prose :deep(th), .prose :deep(td) { border: 1px solid var(--line); padding: 7px 10px; text-align: left; vertical-align: top; min-width: 7.5em; }
.prose :deep(th) { background: var(--surface-2); font-size: 12.5px; text-transform: uppercase; letter-spacing: .04em; color: var(--fg-2); }
.prose :deep(img) { max-width: 100%; border-radius: 12px; }
.prose :deep(a) { font-weight: 550; }
</style>
