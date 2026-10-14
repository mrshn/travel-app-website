<script setup lang="ts">
import type { Comment, FeedItem, Post } from '#shared/types/social'
import { socialAgo, socialFirstName } from '#shared/utils/social'
import { SocialError, type Unsub } from '~/lib/social/api'
import { friendsError, useFriendsState } from './FriendsNotice.vue'
import { setCommentCount, tellComment, useSheetOnTop, withSheet } from './PostCard.vue'

/**
 * A post and its comments (?post=<id>, docs/design/2026-10-14-together.md 5.6): the post with who liked it, the
 * comments oldest first (live), and a field to comment. You can delete your own comments, and any on your post.
 * A like or a comment tells the post's author in their activity.
 */
const social = useSocial()
const state = useFriendsState()
const sheet = useQueryState('post')
const route = useRoute()
const router = useRouter()
const { real } = useClock()

const id = computed(() => sheet.value.value)
const show = computed(() => !!id.value && state.value !== 'off')
const { mounted, opened } = useSheetOnTop(show)
const me = computed(() => social.me.value?.uid)

/** The post as the cloud has it (undefined while it loads, null when it's gone). */
const live = shallowRef<Post | null | undefined>(undefined)
const denied = ref(false)
const comments = ref<Comment[]>([])
const commentsLoaded = ref(false)
/** Your feed's copy shows at once, before the live post arrives (and offline). */
const copy = computed<FeedItem | undefined>(() => (id.value ? social.feed.value.find(p => p.id === id.value) : undefined))
const post = computed<FeedItem | undefined>(() => live.value ?? copy.value)
// Keeps the last post on screen while the sheet slides away.
const last = shallowRef<FeedItem>()
watch(post, (p) => {
  if (p) last.value = p
})
const shown = computed(() => post.value ?? (show.value ? undefined : last.value))
const mine = computed(() => !!shown.value && shown.value.author === me.value)
const title = computed(() => {
  const p = shown.value
  if (!p) return 'Post'
  return p.author === me.value ? 'Your post' : `${socialFirstName(social.personRef(p.author, { name: p.authorName }).name)}’s post`
})

let subs: Unsub[] = []
function stop() {
  for (const u of subs) u()
  subs = []
}
watch([id, show, social.ready, social.backend], ([pid, open, ready]) => {
  stop()
  if (!pid || !open) {
    live.value = undefined
    denied.value = false
    comments.value = []
    commentsLoaded.value = false
    return
  }
  if (!ready) return
  try {
    const b = social.api()
    subs.push(b.watchPost(pid, (p) => {
      live.value = p
    }, (e) => {
      if (e.code === 'denied') denied.value = true
    }))
    subs.push(b.watchComments(pid, (list) => {
      comments.value = [...list].sort((a, c) => a.at - c.at)
      commentsLoaded.value = true
      setCommentCount(pid, list.length)
    }, () => {}))
  }
  catch { /* not ready after all: the watcher runs again when it is */ }
}, { immediate: true })
onBeforeUnmount(stop)

const gone = computed(() => show.value && live.value === null && !copy.value)
const missing = computed(() => show.value && (denied.value || gone.value) && !post.value)

// ---------- comments ----------
const COMMENT_MAX = 1000
const text = ref('')
const sending = ref(false)
const field = ref<HTMLTextAreaElement | null>(null)
watch(id, () => {
  text.value = ''
})

async function send() {
  const p = shown.value
  const t = text.value.trim()
  if (!p || !t || sending.value) return
  sending.value = true
  try {
    await social.api().addComment(p.id, t)
    text.value = ''
    tellComment(social, p, t)
  }
  catch (e) {
    toast(e instanceof SocialError && e.code === 'not-found' ? 'This post was deleted.' : friendsError(e, 'Couldn’t send your comment.'), { tone: 'warn' })
  }
  finally {
    sending.value = false
  }
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    void send()
  }
}

const canDelete = (c: Comment) => c.author === me.value || mine.value
const deleting = ref<Record<string, boolean>>({})
async function removeComment(c: Comment) {
  const p = shown.value
  if (!p || deleting.value[c.id] || !confirm(c.author === me.value ? 'Delete your comment?' : `Delete ${socialFirstName(c.name)}’s comment?`)) return
  deleting.value = { ...deleting.value, [c.id]: true }
  try {
    await social.api().deleteComment(p.id, c.id)
    toast('Comment deleted', { tone: 'ok' })
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t delete the comment.'), { tone: 'warn' })
  }
  finally {
    const next = { ...deleting.value }
    delete next[c.id]
    deleting.value = next
  }
}

function openPerson(uid: string) {
  if (uid === me.value) void router.push({ path: '/friends', query: { tab: 'you' } })
  else void router.push({ query: withSheet(route.query, 'friend', uid) })
}
const who = (c: Comment) => social.personRef(c.author, { name: c.name, photo: c.photo })
</script>

<template>
  <BottomSheet v-if="mounted" :open="opened" :title="title" size="lg" @close="sheet.close()">
    <div class="ps">
      <FriendsNotice :offline="'You’re offline. New comments load when you’re back.'" quiet-loading />
      <p v-if="missing" class="gone">
        <AppIcon name="info" size="sm" />
        <span>{{ denied ? 'You can’t see this post. It’s only for its author’s friends.' : 'This post was deleted.' }}</span>
      </p>
      <template v-else-if="shown">
        <PostCard :post="shown" mode="sheet" :live="live ?? null" @deleted="sheet.close()" />

        <section class="cmts" aria-label="Comments">
          <h3 class="h3 ch">
            Comments<span v-if="comments.length" class="n num">{{ comments.length }}</span>
          </h3>
          <ol v-if="comments.length" class="list">
            <li v-for="c in comments" :key="c.id" class="cm">
              <button class="face" type="button" :aria-label="c.author === me ? 'You' : `See ${who(c).name}`" @click="openPerson(c.author)">
                <Avatar :person="who(c)" :size="34" />
              </button>
              <div class="grow cbody">
                <p class="ctop">
                  <b>{{ c.author === me ? 'You' : who(c).name }}</b>
                  <span class="tiny muted"><time :datetime="new Date(c.at).toISOString()">{{ socialAgo(c.at, real.getTime()) }}</time></span>
                </p>
                <p class="ctext">
                  {{ c.text }}
                </p>
              </div>
              <button
                v-if="canDelete(c)"
                class="btn icon sm plain round del"
                type="button"
                :disabled="deleting[c.id]"
                :aria-label="c.author === me ? 'Delete your comment' : `Delete ${socialFirstName(c.name)}’s comment`"
                @click="removeComment(c)"
              >
                <AppIcon name="trash" size="sm" />
              </button>
            </li>
          </ol>
          <p v-else-if="commentsLoaded" class="small muted none">
            No comments yet. Say something nice.
          </p>
        </section>
      </template>
      <div v-else class="loading" aria-busy="true">
        <span class="sr-only" role="status">Loading the post…</span>
      </div>
    </div>

    <template v-if="shown && !missing" #footer>
      <form class="say" @submit.prevent="send">
        <label class="grow">
          <span class="sr-only">Write a comment</span>
          <textarea
            ref="field"
            v-model="text"
            class="textarea"
            rows="1"
            :maxlength="COMMENT_MAX"
            placeholder="Write a comment"
            :disabled="state !== 'ready' || sending"
            @keydown="onKey"
          />
        </label>
        <button class="btn primary" type="submit" :disabled="state !== 'ready' || sending || !text.trim()">
          <AppIcon name="send" size="sm" />{{ sending ? 'Sending…' : 'Send' }}
        </button>
      </form>
    </template>
  </BottomSheet>
</template>

<style scoped>
.ps { display: flex; flex-direction: column; gap: 14px; padding: 6px 16px 8px; }
.gone { display: flex; align-items: flex-start; gap: 8px; padding: 12px 14px; border-radius: var(--r-md); background: var(--surface-2); color: var(--fg); font-weight: 600; }
.gone .i { margin-top: 3px; color: var(--fg-2); }
.cmts { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; border-top: 1px solid var(--line); }
.ch { display: flex; align-items: baseline; gap: 8px; font-size: 16px; }
.n { font-size: 13px; color: var(--fg-2); }
.list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.cm { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.face { flex: none; display: grid; place-items: center; width: 44px; height: 44px; margin: -4px 0 0 -5px; padding: 0; border: 0; border-radius: 999px; background: none; }
.cbody { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); }
.ctop { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; font-size: 14px; }
.ctext { font-size: 15px; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; }
.del { flex: none; color: var(--fg-2); margin-top: 2px; }
.none { padding: 4px 0; }
.loading { min-height: 120px; }
.say { display: flex; align-items: flex-end; gap: 10px; width: 100%; min-width: 0; }
.say .textarea { min-height: 44px; max-height: 140px; resize: none; padding-top: 11px; padding-bottom: 11px; field-sizing: content; }
.say .btn { flex: none; }
</style>
