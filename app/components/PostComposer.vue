<script setup lang="ts">
import type { NewPost, PostKind, PostPlace, PostTrip } from '#shared/types/social'
import { readPhoto } from '~/lib/photoStore'
import { SocialError } from '~/lib/social/api'
import { friendsError, useFriendsState, useMeFace } from './FriendsNotice.vue'
import { postLink, useSheetOnTop } from './PostCard.vue'

/**
 * A new post (?compose=1, docs/design/2026-10-14-together.md 5.6): your face and who sees it, text, one photo (from
 * the phone, or one of the stop's photos on this device), the trip and place chips, and Post. It opens with the
 * preset of usePostComposer (a moment from a stop, a day recap, a plan link, a meetup); after a reload, empty.
 */
const social = useSocial()
const state = useFriendsState()
const meFace = useMeFace()
const composer = usePostComposer()
const photos = usePhotos()

const TEXT_MAX = 2000
const show = computed(() => composer.isOpen.value && state.value !== 'off')
const { mounted, opened } = useSheetOnTop(show)
const ready = computed(() => state.value === 'ready')
const noFriends = computed(() => !social.friends.value.length)

interface Draft {
  kind: PostKind
  text: string
  trip?: PostTrip
  place?: PostPlace
  link?: string
  recap?: string
}
const draft = reactive<Draft>({ kind: 'moment', text: '' })
const context = ref('')

type Picked = { from: 'file', blob: Blob, url: string } | { from: 'device', id: string, url: string }
const picked = shallowRef<Picked | null>(null)
const offered = ref<{ id: string, url: string }[]>([])
const busy = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const textArea = ref<HTMLTextAreaElement | null>(null)

function dropPicked() {
  if (picked.value?.from === 'file') URL.revokeObjectURL(picked.value.url)
  picked.value = null
}

/** Every opening starts from its preset. */
async function fill() {
  const p = composer.preset.value
  const d = p?.draft ?? {}
  draft.kind = d.kind ?? 'moment'
  draft.text = (d.text ?? '').slice(0, TEXT_MAX)
  draft.trip = d.trip ? { ...d.trip } : undefined
  draft.place = d.place ? { ...d.place } : undefined
  draft.link = d.link
  draft.recap = d.recap
  context.value = p?.context ?? ''
  dropPicked()
  offered.value = []
  const ids = (p?.photoIds ?? []).slice(0, 12)
  const urls = await Promise.all(ids.map(id => photos.url(id).catch(() => null)))
  if (composer.preset.value === p) offered.value = ids.map((id, i) => ({ id, url: urls[i] ?? '' })).filter(x => x.url)
}
watch(show, (open) => {
  if (open) void fill()
}, { immediate: true })
// The picked photo goes once the sheet has slid away (not while it still shows).
watch(mounted, (m) => {
  if (!m && !busy.value) dropPicked()
})
// Opened again with another preset while open (a second "Share" somewhere): that preset now.
watch(() => composer.preset.value, (p) => {
  if (p && show.value) void fill()
})
onBeforeUnmount(dropPicked)

const link = computed(() => postLink({ kind: draft.kind, link: draft.link, trip: draft.trip, place: draft.place }))
const left = computed(() => TEXT_MAX - draft.text.length)
const canPost = computed(() => ready.value && !busy.value && !!(draft.text.trim() || picked.value || draft.link || draft.recap))
const placeholder = computed(() => {
  if (draft.kind === 'day') return 'How was your day?'
  if (draft.kind === 'plan') return 'Say something about the plan'
  if (draft.kind === 'meetup') return 'Who should come along?'
  return draft.place ? `What was ${draft.place.name} like?` : 'What’s happening on your trip?'
})

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  input.value = ''
  if (!f) return
  if (f.type && !f.type.startsWith('image/')) {
    toast('That file isn’t a photo.', { tone: 'warn' })
    return
  }
  dropPicked()
  picked.value = { from: 'file', blob: f, url: URL.createObjectURL(f) }
}
function pickDevice(o: { id: string, url: string }) {
  if (picked.value?.from === 'device' && picked.value.id === o.id) {
    dropPicked()
    return
  }
  dropPicked()
  picked.value = { from: 'device', id: o.id, url: o.url }
}

/** The picked photo as a file: the phone's, or a photo kept on this device (fetched first if it came from another). */
async function photoBlob(p: Picked): Promise<Blob> {
  if (p.from === 'file') return p.blob
  const url = await photos.url(p.id)
  const kept = await readPhoto(p.id)
  if (kept) return kept
  if (!url) throw new Error('photo not here')
  return await (await fetch(url)).blob()
}

async function post() {
  if (!canPost.value) return
  busy.value = true
  try {
    const p: NewPost = { kind: draft.kind, text: draft.text.trim() }
    if (draft.trip) p.trip = draft.trip
    if (draft.place) p.place = draft.place
    if (draft.link) p.link = draft.link
    if (draft.recap) p.recap = draft.recap
    if (picked.value) {
      let small: Blob
      try {
        small = await downscaleImage(await photoBlob(picked.value))
      }
      catch {
        throw new SocialError('invalid', 'That photo couldn’t be read. Try another one.')
      }
      p.photo = await social.api().uploadPublicPhoto(small)
    }
    await social.post(p)
    toast(noFriends.value ? 'Posted. Only you can see it until you add friends.' : 'Posted to your friends', { tone: 'ok' })
    composer.close()
  }
  catch (e) {
    const msg = e instanceof SocialError && e.code === 'invalid' && e.message !== 'invalid' ? e.message : friendsError(e, 'Couldn’t post. Try again in a moment.')
    toast(msg, { tone: 'warn' })
  }
  finally {
    busy.value = false
  }
}

/** To Add friends on the Friends tab, in place of this sheet (one navigation, so nothing races a Back). */
function toAdd() {
  composer.preset.value = null
  void navigateTo({ path: '/friends', query: { tab: 'friends' }, hash: '#add-friends' }, { replace: true })
}
</script>

<template>
  <BottomSheet v-if="mounted" :open="opened" title="New post" @close="composer.close()">
    <form id="composer" class="cmp" @submit.prevent="post">
      <div class="who">
        <Avatar :person="meFace" :size="40" />
        <div class="grow wtx">
          <b class="ellipsis">{{ meFace?.name }}</b>
          <span v-if="!noFriends" class="small muted"><AppIcon name="users" size="xs" />Posting to your friends</span>
          <span v-else class="small nofr">No friends yet: only you will see this. <button class="lnk" type="button" @click="toAdd">Add friends first.</button></span>
        </div>
      </div>
      <p v-if="context" class="ctx small">
        {{ context }}
      </p>

      <FriendsNotice :offline="'You’re offline. You can post when you’re back.'" signed-out="Sign in again to post to your friends." />

      <label class="field">
        <span class="sr-only">What to say</span>
        <textarea
          ref="textArea"
          v-model="draft.text"
          class="textarea"
          rows="4"
          :maxlength="TEXT_MAX"
          :placeholder="placeholder"
          :disabled="busy"
        />
        <span v-if="left <= 200" class="count tnum" :class="{ low: left <= 40 }" aria-live="polite">{{ left }} {{ left === 1 ? 'character' : 'characters' }} left</span>
      </label>

      <div v-if="picked" class="pic">
        <img :src="picked.url" alt="The photo you picked">
        <button class="btn sm ghost rm" type="button" :disabled="busy" @click="dropPicked">
          <AppIcon name="x" size="sm" />Remove the photo
        </button>
      </div>
      <div v-else class="addpic">
        <label class="btn ghost filebtn" :class="{ off: busy }">
          <input ref="fileInput" class="sr-only" type="file" accept="image/*" :disabled="busy" @change="onFile">
          <AppIcon name="camera" size="sm" />Add a photo
        </label>
      </div>
      <div v-if="offered.length" class="offered">
        <p class="small strong">
          Or one of yours from here
        </p>
        <div class="grid" role="group" aria-label="Your photos">
          <button
            v-for="(o, i) in offered"
            :key="o.id"
            class="opt"
            type="button"
            :aria-pressed="picked?.from === 'device' && picked.id === o.id"
            :aria-label="`Photo ${i + 1}`"
            :disabled="busy"
            @click="pickDevice(o)"
          >
            <img :src="o.url" alt="" loading="lazy">
          </button>
        </div>
      </div>

      <div v-if="draft.trip || draft.place" class="chips" role="group" aria-label="Tagged">
        <span v-if="draft.trip" class="chip tag">
          <AppIcon name="plane" />{{ draft.trip.title }}
          <button class="x" type="button" :aria-label="`Remove the trip ${draft.trip.title}`" @click="draft.trip = undefined"><AppIcon name="x" size="xs" /></button>
        </span>
        <span v-if="draft.place" class="chip tag">
          <AppIcon name="pin" />{{ draft.place.name }}
          <button class="x" type="button" :aria-label="`Remove the place ${draft.place.name}`" @click="draft.place = undefined"><AppIcon name="x" size="xs" /></button>
        </span>
      </div>

      <p v-if="draft.recap" class="recap tnum">
        <AppIcon name="sparkle" size="sm" /><span>{{ draft.recap }}</span>
      </p>
      <div v-if="link" class="linkcard">
        <span class="lic"><AppIcon :name="link.icon" /></span>
        <span class="grow ltx"><b>{{ link.title }}</b><span class="small muted">{{ link.sub }}</span></span>
      </div>
    </form>

    <template #footer>
      <span class="grow" />
      <button class="btn ghost" type="button" :disabled="busy" @click="composer.close()">
        Cancel
      </button>
      <button class="btn primary" type="submit" form="composer" :disabled="!canPost">
        <AppIcon :name="busy ? 'hourglass' : 'send'" size="sm" />{{ busy ? 'Posting…' : 'Post' }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.cmp { display: flex; flex-direction: column; gap: 12px; padding: 6px 16px 8px; }
.who { display: flex; align-items: center; gap: 12px; min-width: 0; }
.wtx { display: flex; flex-direction: column; line-height: 1.3; }
.wtx .small { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.nofr { color: var(--warn); font-weight: 600; }
.lnk { display: inline-flex; align-items: center; min-height: 44px; margin: -12px 0; padding: 0; border: 0; background: none; color: var(--accent); font: inherit; font-weight: 650; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
.ctx { color: var(--fg-2); font-weight: 600; }
.field { position: relative; }
.count { align-self: flex-end; font-size: 12.5px; color: var(--fg-2); font-weight: 600; }
.count.low { color: var(--bad); }
.pic { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.pic img { display: block; width: 100%; max-height: 360px; object-fit: contain; border-radius: var(--r-md); background: var(--surface-2); }
.addpic { display: flex; }
.filebtn { cursor: pointer; }
.filebtn.off { opacity: .5; pointer-events: none; }
.filebtn:has(input:focus-visible) { outline: 2.5px solid var(--accent); outline-offset: 2px; }
.offered { display: flex; flex-direction: column; gap: 6px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 8px; }
.opt { position: relative; aspect-ratio: 1; min-height: 44px; padding: 0; border: 2px solid transparent; border-radius: 12px; overflow: hidden; background: var(--surface-2); }
.opt img { display: block; width: 100%; height: 100%; object-fit: cover; }
.opt[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
.opt:focus-visible { outline-offset: 2px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { min-height: 32px; padding-right: 2px; gap: 6px; max-width: 100%; }
.x { position: relative; display: grid; place-items: center; width: 26px; height: 26px; border: 0; border-radius: 999px; background: none; color: inherit; padding: 0; }
.x:hover { background: var(--surface-3); }
/* A 44 px touch area for the small × (the chip's own row has room for it). */
.x::after { content: ""; position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; transform: translate(-50%, -50%); }
.recap { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-radius: var(--r-md); background: var(--gold-soft); color: var(--gold-ink); font-weight: 650; font-size: 14.5px; }
.recap .i { margin-top: 2px; }
.linkcard { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--surface-2); }
.lic { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex: none; background: var(--surface); color: var(--accent); }
.ltx { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
</style>
