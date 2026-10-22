<script setup lang="ts">
import { useDocumentVisibility, useEventListener, useResizeObserver } from '@vueuse/core'
import type { Message } from '#shared/types/social'
import { socialFirstName } from '#shared/utils/social'
import { zoned } from '#shared/utils/time'

/**
 * Together's chat (docs/design/2026-10-14-together.md, 5.1): newest at the bottom, a divider for each day, and the
 * composer fixed above the tab bar. Open, it keeps the chat read: new messages that come in while you look stay read.
 * Offline it shows the messages it last had.
 */
const v = useTripView()
const tg = useTripGroup({ chat: true })
const groups = useGroups()
const social = useSocial()
const photoQ = useQueryState('photo')

const tz = computed(() => v.trip.value?.timezone ?? 'UTC')
const messages = computed(() => tg.live.value.messages)
const meUid = computed(() => tg.me.value?.uid ?? '')

interface Row { key: string, day?: string, m?: Message, mine?: boolean, first?: boolean }
const dayOf = (at: number) => {
  try {
    return zoned(new Date(at), tz.value).date
  }
  catch {
    return new Date(at).toISOString().slice(0, 10)
  }
}
/** Messages with a divider before each new day; a run of one person's messages shows their face once. */
const rows = computed<Row[]>(() => {
  const out: Row[] = []
  let lastDay = ''
  let lastAuthor = ''
  for (const m of messages.value) {
    const d = dayOf(m.at)
    if (d !== lastDay) {
      out.push({ key: `day-${d}`, day: fmtDate(d, 'short') })
      lastDay = d
      lastAuthor = ''
    }
    const line = m.kind === 'system' || m.kind === 'status'
    out.push({ key: m.id, m, mine: m.author === meUid.value, first: !line && m.author !== lastAuthor })
    lastAuthor = line ? '' : m.author
  }
  return out
})

// ---------- read marks ----------
const visibility = useDocumentVisibility()
function markRead() {
  const gid = tg.gid.value
  if (!gid || visibility.value !== 'visible') return
  const list = messages.value
  const newest = list.length ? list[list.length - 1]!.at : 0
  // Another phone's clock may run a little ahead: what is on screen counts as read.
  groups.markRead(gid, Math.max(Date.now(), newest))
}
onMounted(markRead)
watch([messages, visibility, () => tg.unread.value], markRead)

// ---------- staying at the newest ----------
// The chat opens at its newest message and stays there as messages come in, unless you scrolled up to read. Until
// you touch, scroll or type, it holds on to the end: the page's own scroll to the top after a navigation, and
// pictures that load late, don't move it away.
const atEnd = ref(true)
let held = true
function nearEnd(): boolean {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160
}
function toEnd() {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' })
  atEnd.value = true
}
useEventListener(window, ['touchstart', 'wheel', 'keydown', 'pointerdown'], () => {
  held = false
}, { passive: true })
useEventListener(window, 'scroll', () => {
  if (held && !nearEnd()) toEnd()
  else atEnd.value = nearEnd()
}, { passive: true })
const list = ref<HTMLElement | null>(null)
useResizeObserver(list, () => {
  if (held || atEnd.value) toEnd()
})
onMounted(() => {
  void nextTick(() => requestAnimationFrame(toEnd))
})
watch(() => messages.value.length, (n, was) => {
  const all = messages.value
  const last = all.length ? all[all.length - 1] : undefined
  if (n > (was ?? 0) && (held || atEnd.value || last?.author === meUid.value)) void nextTick(() => requestAnimationFrame(toEnd))
}, { flush: 'post' })

// ---------- photos ----------
const viewing = computed(() => (photoQ.value.value ? messages.value.find(m => m.id === photoQ.value.value && m.image) ?? null : null))
function openPhoto(m: Message) {
  photoQ.open(m.id)
}
const photoTitle = computed(() => {
  const m = viewing.value
  if (!m) return 'Photo'
  return m.author === meUid.value ? 'Your photo' : `Photo from ${socialFirstName(m.name)}`
})

/** Room under the last message for the composer (taller with its menu open): the newest stays above it. */
const composerH = ref(84)
watch(composerH, () => {
  if (held || atEnd.value) void nextTick(() => requestAnimationFrame(toEnd))
}, { flush: 'post' })
const empty = computed(() => !messages.value.length)
const offline = computed(() => social.state.value === 'offline')
</script>

<template>
  <section class="chat" aria-label="Group chat" :style="{ '--composer-h': `${composerH}px` }">
    <div v-if="empty" class="empty chat-empty">
      <AppIcon name="chat" />
      <h3>No messages yet</h3>
      <p>{{ offline ? 'Messages show here when you\'re back online.' : 'Say hello. Everyone in this trip can read the chat.' }}</p>
    </div>
    <!-- A log: screen readers hear new messages as they come in. -->
    <div v-else role="log" aria-label="Messages" aria-relevant="additions">
      <ol ref="list" class="msgs">
        <template v-for="r in rows" :key="r.key">
          <li v-if="r.day" class="day">
            <span>{{ r.day }}</span>
          </li>
          <ChatMessage v-else-if="r.m" :m="r.m" :mine="!!r.mine" :first="!!r.first" :tz="tz" @photo="openPhoto" />
        </template>
      </ol>
    </div>
    <div class="spacer" aria-hidden="true" />
    <ChatComposer @height="(h) => (composerH = h)" />

    <BottomSheet :open="!!viewing" :title="photoTitle" size="lg" @close="photoQ.close()">
      <div v-if="viewing" class="pv">
        <img :src="viewing.image" :alt="photoTitle">
        <p v-if="viewing.text" class="pv-t">
          {{ viewing.text }}
        </p>
      </div>
    </BottomSheet>
  </section>
</template>

<style scoped>
.chat { display: flex; flex-direction: column; min-width: 0; }
.msgs { list-style: none; display: flex; flex-direction: column; gap: 4px; padding: 4px 0 0; margin: 0; }
.day { list-style: none; display: flex; justify-content: center; margin: 14px 0 6px; }
.day span { font-family: var(--font-display); font-size: 11.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--gold-ink); }
.chat-empty { padding: 40px 12px; }
/* The composer is fixed over the bottom of the page: the last message stays above it. */
.spacer { height: var(--composer-h, 84px); flex: none; }
.pv { display: flex; flex-direction: column; gap: 10px; padding: 0 16px 8px; }
.pv img { width: 100%; height: auto; border-radius: 14px; background: var(--surface-2); }
.pv-t { font-size: 15px; line-height: 1.5; }
</style>
