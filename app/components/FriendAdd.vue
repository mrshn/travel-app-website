<script setup lang="ts">
import type { Profile } from '#shared/types/social'
import { socialFirstName, socialHandle, socialHandleValid, socialPath } from '#shared/utils/social'
import { readRequestLines } from './FriendRow.vue'
import { friendsError } from './FriendsNotice.vue'

/**
 * Add friends (spec 5.5, T2): your friend link to send in any chat or show as a QR code, and finding someone by their
 * @handle (a friend request they answer).
 */
const emit = defineEmits<{ open: [uid: string] }>()
const social = useSocial()

// ---------- your link ----------
const url = ref('')
const reveal = ref(false)
const qrOpen = ref(false)
const qrKey = ref(0)
const making = ref(false)

async function ensureLink(): Promise<string> {
  if (url.value) return url.value
  const token = await social.friendLinkToken()
  url.value = social.link(socialPath('friend', token))
  return url.value
}
// Made ahead of the tap while ready, so Share opens the phone's share sheet straight from it.
watch(social.ready, (r) => {
  if (r) void ensureLink().catch(() => {})
}, { immediate: true })

const shareText = computed(() => `Add ${socialFirstName(social.me.value?.name ?? '')} as a friend on Travels`)

async function shareMine() {
  if (making.value) return
  making.value = true
  try {
    const u = await ensureLink()
    reveal.value = true
    const r = await shareLink({ title: 'Travels', text: shareText.value, url: u })
    if (r === 'copied') toast('Link copied', { tone: 'ok' })
    else if (r === 'failed') toast('Couldn’t share it from here. Copy the link below.', { tone: 'warn' })
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t make your friend link.'), { tone: 'warn' })
  }
  finally {
    making.value = false
  }
}

async function showQr() {
  if (making.value) return
  making.value = true
  try {
    await ensureLink()
    reveal.value = true
    qrOpen.value = true
    qrKey.value++
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t make your friend link.'), { tone: 'warn' })
  }
  finally {
    making.value = false
  }
}

// ---------- find by @handle ----------
const q = ref('')
const finding = ref(false)
const found = ref<Profile | null>(null)
const findMsg = ref('')
const sending = ref(false)

const relation = computed<'you' | 'friend' | 'sent' | 'asked' | 'none'>(() => {
  const p = found.value
  if (!p) return 'none'
  if (p.uid === social.me.value?.uid) return 'you'
  if (social.isFriend(p.uid)) return 'friend'
  if (social.outgoing.value.some(r => r.to === p.uid)) return 'sent'
  if (social.incoming.value.some(r => r.from === p.uid)) return 'asked'
  return 'none'
})
const foundLine = computed(() => ({
  you: 'That’s you.',
  friend: 'You’re friends.',
  sent: 'Request sent. Waiting for an answer.',
  asked: 'Wants to be friends with you.',
  none: '',
})[relation.value])

async function find() {
  const h = socialHandle(q.value)
  found.value = null
  findMsg.value = ''
  if (!h) return
  if (!socialHandleValid(h)) {
    findMsg.value = 'Handles are 3 to 20 lower-case letters, numbers, dots or underscores.'
    return
  }
  finding.value = true
  try {
    const p = await social.api().findHandle(h)
    if (p) found.value = p
    else findMsg.value = `No one has the handle @${h}.`
  }
  catch (e) {
    findMsg.value = friendsError(e, 'Couldn’t search right now.')
  }
  finally {
    finding.value = false
  }
}

async function addFound() {
  const p = found.value
  if (!p || sending.value) return
  sending.value = true
  try {
    await social.api().sendRequest({ uid: p.uid, name: p.name, photo: p.photo ?? null })
    toast(`Request sent to ${socialFirstName(p.name)}`, { tone: 'ok' })
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t send the request.'), { tone: 'warn' })
  }
  finally {
    sending.value = false
  }
}

async function acceptFound() {
  const p = found.value
  const r = p ? social.incoming.value.find(x => x.from === p.uid) : undefined
  if (!p || !r || sending.value) return
  sending.value = true
  try {
    await social.acceptRequest(r)
    readRequestLines(social, p.uid)
    toast(`You and ${socialFirstName(p.name)} are friends`, { tone: 'ok' })
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t accept the request.'), { tone: 'warn' })
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <section id="add-friends" class="add" aria-labelledby="add-h">
    <h2 id="add-h" class="gh" tabindex="-1">
      Add friends
    </h2>
    <div class="card pad stack">
      <p class="small muted">
        Friends are people you both add. Send your link in any chat, or show your QR code to someone next to you.
      </p>
      <div class="acts">
        <button class="btn primary" type="button" :disabled="making" @click="shareMine">
          <AppIcon name="share" size="sm" />Share my link
        </button>
        <button class="btn ghost" type="button" :disabled="making" @click="showQr">
          <AppIcon name="qr" size="sm" />Show my QR
        </button>
      </div>
      <ShareLink v-if="reveal && url" :key="qrKey" :url="url" title="Travels" :text="shareText" :qr-open="qrOpen" />

      <hr class="divider">

      <form class="find" role="search" aria-label="Find by @handle" @submit.prevent="find">
        <label class="field grow">
          <span>Find by @handle</span>
          <span class="at">
            <span class="sign" aria-hidden="true">@</span>
            <input
              v-model="q"
              class="input"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="search"
              maxlength="40"
              placeholder="their.handle"
            >
          </span>
        </label>
        <button class="btn" type="submit" :disabled="finding || !q.trim()">
          <AppIcon name="search" size="sm" />{{ finding ? 'Finding…' : 'Find' }}
        </button>
      </form>
      <p v-if="findMsg" class="small muted" role="status">
        {{ findMsg }}
      </p>
      <div v-if="found" class="card flat rows result">
        <FriendRow :uid="found.uid" :fallback="{ name: found.name, photo: found.photo }" :line="foundLine">
          <button v-if="relation === 'none'" class="btn sm primary" type="button" :disabled="sending" @click="addFound">
            <AppIcon name="userplus" size="sm" />Add friend
          </button>
          <button v-else-if="relation === 'asked'" class="btn sm primary" type="button" :disabled="sending" @click="acceptFound">
            <AppIcon name="check" size="sm" />Accept
          </button>
          <button v-else-if="relation === 'friend'" class="btn sm ghost" type="button" @click="emit('open', found.uid)">
            Open
          </button>
        </FriendRow>
      </div>
    </div>
  </section>
</template>

<style scoped>
.add { display: flex; flex-direction: column; scroll-margin-top: 16px; }
.gh { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 4px 8px; }
.gh:focus-visible { outline-offset: 4px; }
.acts { display: flex; flex-wrap: wrap; gap: 10px; }
.acts .btn { flex: 1 1 auto; }
.divider { margin: 4px 0; }
.find { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
.find .field { flex: 1 1 180px; }
.find .btn { flex: 0 0 auto; }
.at { position: relative; display: block; font-size: 16px; font-weight: 400; color: var(--fg); }
.sign { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-2); font-weight: 650; pointer-events: none; }
.at .input { padding-left: 28px; }
.result { overflow: hidden; }
</style>
