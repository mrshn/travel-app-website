<script lang="ts">
import { nextTick, ref, watch, type Ref } from 'vue'
import type { LocationQuery } from 'vue-router'
import type { FeedItem, Post } from '#shared/types/social'
import { socialFirstName } from '#shared/utils/social'
import { useSocial } from '~/composables/useSocial'

type Social = ReturnType<typeof useSocial>

/** The sheets of the social layer kept in the URL (spec 4.2): one shows at a time. */
const SHEETS = ['compose', 'post', 'friend', 'inbox'] as const

/** The query with one social sheet open instead of any other (they never stack). */
export function withSheet(query: LocationQuery, key: typeof SHEETS[number], value: string): LocationQuery {
  const q = { ...query }
  for (const k of SHEETS) delete q[k]
  q[key] = value
  return q
}

/**
 * The social sheets live in app.vue, so their place in the page comes before a trip screen's sheets: one opened over
 * a stop sheet ("Post to friends") would slide in under it. Each opening mounts the sheet afresh, last in the page and
 * so on top, then opens it (the slide plays); once closed and slid away it goes.
 */
export function useSheetOnTop(show: Ref<boolean>): { mounted: Ref<boolean>, opened: Ref<boolean> } {
  const mounted = ref(false)
  const opened = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(show, async (s) => {
    clearTimeout(timer)
    if (s) {
      if (!mounted.value) {
        mounted.value = true
        await nextTick()
      }
      if (show.value) opened.value = true
      return
    }
    opened.value = false
    timer = setTimeout(() => {
      if (!show.value) mounted.value = false
    }, 400)
  }, { immediate: true })
  return { mounted, opened }
}

/** Comments per post as last counted or seen, shared by the cards and the post sheet. */
const commentCounts = ref<Record<string, { n: number, at: number }>>({})
export function commentCount(id: string): number | undefined {
  return commentCounts.value[id]?.n
}
export function setCommentCount(id: string, n: number) {
  commentCounts.value = { ...commentCounts.value, [id]: { n, at: Date.now() } }
}
function countedAt(id: string): number {
  return commentCounts.value[id]?.at ?? 0
}

/** Posts this device already told their author about a like of yours (a like, unlike, like again tells once). */
const toldLike = new Set<string>()

/** Likes or unlikes a post; a new like tells its author in their activity (not when it's your own post). */
export async function likePost(social: Social, post: Pick<Post, 'id' | 'author'>, on: boolean): Promise<void> {
  const b = social.api()
  await b.setLike(post.id, on)
  const me = b.me?.uid
  if (on && me && post.author !== me && !toldLike.has(post.id)) {
    toldLike.add(post.id)
    void b.notify(post.author, { kind: 'like', text: 'liked your post', link: `/friends?post=${post.id}`, ref: post.id }).catch(() => toldLike.delete(post.id))
  }
}

/** Tells a post's author about your comment (not when it's your own post). */
export function tellComment(social: Social, post: Pick<Post, 'id' | 'author'>, text: string) {
  const b = social.backend.value
  const me = b?.me?.uid
  if (!b || !me || post.author === me) return
  const t = text.trim().replace(/\s+/g, ' ')
  const line = `commented: ${t.slice(0, 60)}${t.length > 60 ? '…' : ''}`
  void b.notify(post.author, { kind: 'comment', text: line, link: `/friends?post=${post.id}`, ref: post.id }).catch(() => {})
}

/** "Liked by Ali and 2 others" (friends first, then you); '' with no likes. */
export function likedLine(likers: readonly string[], me: string | undefined, nameOf: (uid: string) => string): string {
  const others = likers.filter(u => u !== me)
  const names = [...others.map(u => socialFirstName(nameOf(u))), ...(me && likers.includes(me) ? ['you'] : [])]
  if (!names.length) return ''
  if (names.length === 1) return `Liked by ${names[0]}`
  if (names.length === 2) return `Liked by ${names[0]} and ${names[1]}`
  const rest = names.length - 1
  return `Liked by ${names[0]} and ${rest} ${rest === 1 ? 'other' : 'others'}`
}

/** The link card of a post (a plan link or a meetup), when its link is a path of this app. */
export function postLink(p: Pick<FeedItem, 'kind' | 'link' | 'trip' | 'place'>): { to: string, icon: string, title: string, sub: string } | null {
  const to = p.link ?? ''
  if (!to.startsWith('/') || to.startsWith('//')) return null
  if (to.startsWith('/p/') || p.kind === 'plan') {
    return { to, icon: 'calendar', title: p.trip?.title ? `The plan for ${p.trip.title}` : 'A trip plan', sub: 'See the plan, and copy it to your trips' }
  }
  if (to.startsWith('/m/') || p.kind === 'meetup') {
    return { to, icon: 'hand', title: p.place?.name ? `Meet up at ${p.place.name}` : 'A meetup', sub: 'See when, where and who’s going' }
  }
  return { to, icon: 'link', title: 'Open the link', sub: to }
}

/** A post in one line, for compact lists. */
export function postSummary(p: Pick<FeedItem, 'kind' | 'text' | 'recap' | 'photo' | 'link'>): string {
  const t = (p.text ?? '').trim().replace(/\s+/g, ' ')
  if (t) return t
  if (p.recap) return p.recap
  if (p.kind === 'plan') return 'Shared a plan'
  if (p.kind === 'meetup') return 'Shared a meetup'
  return p.photo ? 'Shared a photo' : 'Shared a moment'
}

/** Long posts show their start in the feed; the post sheet shows all of them. */
const FEED_TEXT_MAX = 480
</script>

<script setup lang="ts">
import { onClickOutside, useElementVisibility } from '@vueuse/core'
import { socialAgo } from '#shared/utils/social'
import type { Unsub } from '~/lib/social/api'
import { friendsError } from './FriendsNotice.vue'

/**
 * A post (docs/design/2026-10-14-together.md, 5.5 and 5.6): face, name, time, the trip and place chips, text, photo,
 * the recap line, a link card, likes and comments. In the feed it keeps its likes live while it is on screen
 * (watchPost) and counts its comments; in the post sheet the sheet hands it the live post; `mini` is one tap-able row.
 */
const props = withDefaults(defineProps<{
  post: FeedItem
  mode?: 'feed' | 'sheet' | 'mini'
  /** The post sheet's live copy of the post (with its likes); undefined while it loads. */
  live?: Post | null
}>(), { mode: 'feed', live: undefined })
const emit = defineEmits<{ deleted: [] }>()

const social = useSocial()
const route = useRoute()
const router = useRouter()
const { real } = useClock()

const me = computed(() => social.me.value?.uid)
const mine = computed(() => !!me.value && props.post.author === me.value)
const author = computed(() => social.personRef(props.post.author, { name: props.post.authorName, photo: props.post.authorPhoto }))
const authorName = computed(() => (mine.value ? 'You' : author.value.name))
const ago = computed(() => socialAgo(props.post.at, real.value.getTime()))
const iso = computed(() => new Date(props.post.at).toISOString())
const full = computed(() => new Date(props.post.at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))
const link = computed(() => postLink(props.post))
const longText = computed(() => props.mode === 'feed' && (props.post.text ?? '').length > FEED_TEXT_MAX)
const text = computed(() => {
  const t = props.post.text ?? ''
  return longText.value ? `${t.slice(0, FEED_TEXT_MAX - 40).trimEnd()}…` : t
})
const photoAlt = computed(() => {
  const who = mine.value ? 'you' : socialFirstName(author.value.name)
  return props.post.place?.name ? `Photo from ${props.post.place.name}, shared by ${who}` : `Photo shared by ${who}`
})

// ---------- live likes and the comment count, while the card is on screen ----------
const el = ref<HTMLElement | null>(null)
const shown = useElementVisibility(el, { rootMargin: '160px' })
const watched = shallowRef<Post | null | undefined>(undefined)
let unsub: Unsub | null = null
function stopWatching() {
  unsub?.()
  unsub = null
}
watch([() => props.mode === 'feed' && shown.value, social.ready, social.backend, () => props.post.id], ([on, ready]) => {
  stopWatching()
  if (!on || !ready) return
  try {
    unsub = social.api().watchPost(props.post.id, (p) => {
      watched.value = p
    }, () => {
      unsub = null
    })
  }
  catch { /* not ready after all */ }
}, { immediate: true })
onBeforeUnmount(stopWatching)

watch([() => props.mode !== 'mini' && shown.value, social.ready, () => props.post.id], async ([on, ready, id]) => {
  if (!on || !ready || Date.now() - countedAt(id) < 60_000) return
  try {
    setCommentCount(id, await social.api().countComments(id))
  }
  catch { /* the count waits for the next time */ }
}, { immediate: true })

const current = computed(() => (props.mode === 'sheet' ? props.live : watched.value))
const likers = computed(() => Object.keys(current.value?.likes ?? {}))
const pendingLike = ref<boolean | null>(null)
const liked = computed(() => pendingLike.value ?? (!!me.value && likers.value.includes(me.value)))
const likeCount = computed(() => {
  const n = likers.value.length
  const had = !!me.value && likers.value.includes(me.value)
  if (pendingLike.value === null || pendingLike.value === had) return n
  return n + (pendingLike.value ? 1 : -1)
})
const comments = computed(() => commentCount(props.post.id) ?? 0)
const likedBy = computed(() => {
  const m = me.value
  let list = likers.value
  if (m && pendingLike.value === true && !list.includes(m)) list = [...list, m]
  if (m && pendingLike.value === false) list = list.filter(u => u !== m)
  return likedLine(list, m, uid => social.personRef(uid).name)
})
const likeLabel = computed(() => `Like${likeCount.value ? ` (${likeCount.value} ${likeCount.value === 1 ? 'like' : 'likes'})` : ''}`)
const commentLabel = computed(() => `Comment${comments.value ? ` (${comments.value} ${comments.value === 1 ? 'comment' : 'comments'})` : ''}`)

async function like() {
  if (pendingLike.value !== null) return
  const next = !liked.value
  pendingLike.value = next
  try {
    await likePost(social, props.post, next)
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t save your like.'), { tone: 'warn' })
  }
  finally {
    pendingLike.value = null
  }
}

function openPost() {
  void router.push({ query: withSheet(route.query, 'post', props.post.id) })
}
function openAuthor() {
  if (mine.value) void router.push({ path: '/friends', query: { tab: 'you' } })
  else void router.push({ query: withSheet(route.query, 'friend', props.post.author) })
}

// ---------- your post's menu ----------
const menu = ref(false)
const menuBtn = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)
const deleting = ref(false)
onClickOutside(menuEl, () => {
  menu.value = false
}, { ignore: [menuBtn] })
watch(menu, async (open) => {
  if (!open) return
  await nextTick()
  menuEl.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
})
function closeMenu(e?: KeyboardEvent) {
  e?.preventDefault()
  e?.stopPropagation()
  menu.value = false
  menuBtn.value?.focus()
}
async function remove() {
  menu.value = false
  if (deleting.value || !confirm('Delete this post? It goes from your friends’ feeds too.')) return
  deleting.value = true
  try {
    await social.api().deletePost(props.post.id)
    toast('Post deleted', { tone: 'ok' })
    emit('deleted')
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t delete the post.'), { tone: 'warn' })
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <button v-if="mode === 'mini'" class="post mini" type="button" :aria-label="`${authorName}, ${ago}: ${postSummary(post)}`" @click="openPost">
    <Avatar :person="author" :size="36" />
    <span class="mbody">
      <span class="mtop"><b class="ellipsis">{{ authorName }}</b><span class="tiny muted nowrap">{{ ago }}</span></span>
      <span class="mline clamp-2">{{ postSummary(post) }}</span>
      <span v-if="post.trip || post.place" class="tiny muted ellipsis mwhere">
        <AppIcon name="pin" size="xs" />{{ post.place?.name || post.trip?.title }}
      </span>
    </span>
    <img v-if="post.photo" class="mthumb" :src="post.photo" alt="" loading="lazy" decoding="async">
  </button>

  <article v-else ref="el" class="post" :class="[`m-${mode}`, { card: mode === 'feed', gone: deleting }]" :aria-label="`Post by ${authorName}`">
    <header class="ph">
      <button v-if="!mine" class="who" type="button" @click="openAuthor">
        <Avatar :person="author" :size="42" />
        <span class="byline">
          <b class="name ellipsis">{{ authorName }}</b>
          <span class="small muted"><time :datetime="iso" :title="full">{{ ago }}</time></span>
        </span>
      </button>
      <div v-else class="who">
        <Avatar :person="author" :size="42" />
        <span class="byline">
          <b class="name ellipsis">{{ authorName }}</b>
          <span class="small muted"><time :datetime="iso" :title="full">{{ ago }}</time></span>
        </span>
      </div>
      <div v-if="mine" class="more">
        <button ref="menuBtn" class="btn icon plain round" type="button" aria-label="Post options" aria-haspopup="menu" :aria-expanded="menu" @click="menu = !menu">
          <AppIcon name="dots" />
        </button>
        <div v-if="menu" ref="menuEl" class="menu card" role="menu" aria-label="Post options" @keydown.esc="closeMenu">
          <button class="mi" type="button" role="menuitem" @click="remove">
            <AppIcon name="trash" size="sm" />Delete post
          </button>
        </div>
      </div>
    </header>

    <div v-if="post.trip || post.place" class="chips">
      <span v-if="post.trip" class="chip"><AppIcon name="plane" />{{ post.trip.title }}</span>
      <span v-if="post.place" class="chip"><AppIcon name="pin" />{{ post.place.name }}</span>
    </div>

    <p v-if="text" class="text">
      {{ text }}
    </p>
    <button v-if="longText" class="btn xs plain readmore" type="button" @click="openPost">
      Read more
    </button>

    <img v-if="post.photo" class="photo" :src="post.photo" :alt="photoAlt" loading="lazy" decoding="async">

    <p v-if="post.recap" class="recap tnum">
      <AppIcon name="sparkle" size="sm" /><span>{{ post.recap }}</span>
    </p>

    <NuxtLink v-if="link" :to="link.to" class="linkcard">
      <span class="lic"><AppIcon :name="link.icon" /></span>
      <span class="grow ltx">
        <b>{{ link.title }}</b>
        <span class="small muted">{{ link.sub }}</span>
      </span>
      <AppIcon name="chevr" class="chev" />
    </NuxtLink>

    <p v-if="mode === 'sheet' && likedBy" class="likedby small">
      {{ likedBy }}
    </p>

    <footer class="acts">
      <button class="btn sm plain like" :class="{ on: liked }" type="button" :aria-pressed="liked" :aria-label="likeLabel" @click="like">
        <AppIcon name="heart" size="sm" /><span v-if="likeCount" class="num">{{ likeCount }}</span>
      </button>
      <button v-if="mode === 'feed'" class="btn sm plain" type="button" :aria-label="commentLabel" @click="openPost">
        <AppIcon name="chat" size="sm" />Comment<span v-if="comments" class="num">{{ comments }}</span>
      </button>
      <span v-else-if="comments" class="small muted ccount">{{ comments }} {{ comments === 1 ? 'comment' : 'comments' }}</span>
    </footer>
  </article>
</template>

<style scoped>
.post { position: relative; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.post.card { padding: 14px 14px 8px; }
.post.gone { opacity: .55; }
.ph { display: flex; align-items: center; gap: 6px; min-width: 0; }
.who { flex: 1 1 auto; display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 48px; margin: -2px 0; padding: 2px 6px 2px 0; border: 0; border-radius: 12px; background: none; color: var(--fg); font: inherit; text-align: left; }
button.who { cursor: pointer; }
button.who:hover .name { text-decoration: underline; text-underline-offset: 2px; }
.byline { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
.name { display: block; max-width: 100%; font-weight: 650; font-size: 15px; }
.more { position: relative; flex: none; margin: -6px -8px -6px 0; }
.menu { position: absolute; right: 0; top: calc(100% + 4px); z-index: 5; min-width: 180px; padding: 6px; display: flex; flex-direction: column; box-shadow: var(--shadow-lg); }
.mi { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 12px; border: 0; border-radius: 10px; background: none; color: var(--bad); font-weight: 650; text-align: left; }
.mi:hover, .mi:focus-visible { background: var(--bad-soft); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips .chip { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.text { font-size: 15.5px; line-height: 1.5; white-space: pre-line; overflow-wrap: anywhere; }
.readmore { align-self: flex-start; margin: -6px 0 0 -10px; color: var(--accent); }
.photo { display: block; width: 100%; max-height: 520px; object-fit: cover; border-radius: var(--r-md); background: var(--surface-2); }
.m-sheet .photo { max-height: none; object-fit: contain; }
.recap { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-radius: var(--r-md); background: var(--gold-soft); color: var(--gold-ink); font-weight: 650; font-size: 14.5px; line-height: 1.4; }
.recap .i { margin-top: 2px; }
.linkcard { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--surface-2); color: var(--fg); text-decoration: none; }
.linkcard:hover { background: var(--surface-3); }
.lic { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex: none; background: var(--surface); color: var(--accent); }
.ltx { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.ltx b { font-size: 14.5px; }
.chev { color: var(--fg-3); }
.likedby { color: var(--fg-2); font-weight: 600; }
.acts { display: flex; align-items: center; gap: 4px; margin: 0 -8px; padding-top: 2px; }
.acts .btn { color: var(--fg-2); }
.like.on { color: var(--accent); }
.like.on :deep(.i) { fill: currentColor; }
.acts .num { font-family: var(--font-data); font-size: 13px; }
.ccount { padding: 0 8px; }

/* mini: one row that opens the post */
.post.mini { display: flex; flex-direction: row; align-items: center; gap: 12px; width: 100%; min-height: 64px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--surface); color: var(--fg); text-align: left; font: inherit; }
.post.mini:hover { background: var(--surface-2); }
.mbody { display: flex; flex-direction: column; gap: 2px; flex: 1 1 auto; min-width: 0; }
.mtop { display: flex; align-items: baseline; gap: 8px; min-width: 0; font-size: 14.5px; }
.mline { font-size: 14px; line-height: 1.4; color: var(--fg); overflow-wrap: anywhere; }
.mwhere { display: flex; align-items: center; gap: 4px; }
.mthumb { width: 56px; height: 56px; flex: none; border-radius: 10px; object-fit: cover; background: var(--surface-2); }
</style>
