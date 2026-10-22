<script setup lang="ts">
import type { Meetup, Share } from '#shared/types/social'
import { socialMeetupPassed, socialMeetupWhen, socialPath } from '#shared/utils/social'
import { deviceTimeZone, fmtDate, fmtRange } from '#shared/utils/time'
import { friendsError } from './FriendsNotice.vue'

/**
 * Your links (spec 5.5, You): your friend link (QR, Copy, Share, Reset), the plan links you made (Copy, Remove) and
 * your meetups (each opens /m/<id>).
 */
const social = useSocial()
const { real } = useClock()

// ---------- your friend link ----------
const friendUrl = ref('')
const linkMsg = ref('')
const resetting = ref(false)
async function loadFriendLink() {
  linkMsg.value = ''
  try {
    friendUrl.value = social.link(socialPath('friend', await social.friendLinkToken()))
  }
  catch (e) {
    linkMsg.value = friendsError(e, 'Your friend link couldn’t load right now.')
  }
}
async function resetLink() {
  if (resetting.value || !confirm('Reset your friend link? The old link and QR code stop working. Friends you have stay friends.')) return
  resetting.value = true
  try {
    friendUrl.value = social.link(socialPath('friend', await social.resetFriendLink()))
    toast('Your friend link is new. The old one no longer works.', { tone: 'ok' })
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t reset your link.'), { tone: 'warn' })
  }
  finally {
    resetting.value = false
  }
}

// ---------- plan links and meetups ----------
const shares = ref<Share[] | null>(null)
const meetups = ref<Meetup[] | null>(null)
const listMsg = ref('')
async function loadLists() {
  listMsg.value = ''
  try {
    const b = social.api()
    const [s, m] = await Promise.all([b.myShares(), b.myMeetups()])
    shares.value = s
    meetups.value = m
  }
  catch (e) {
    listMsg.value = friendsError(e, 'Your links couldn’t load right now.')
  }
}
watch(social.ready, (r) => {
  if (!r) return
  void loadFriendLink()
  void loadLists()
}, { immediate: true })

async function copyShare(s: Share) {
  if (await copyText(social.link(socialPath('plan', s.id)))) toast('Link copied', { tone: 'ok' })
  else toast('Couldn’t copy the link.', { tone: 'warn' })
}
const removing = ref<Record<string, boolean>>({})
async function removeShare(s: Share) {
  if (removing.value[s.id] || !confirm(`Remove the plan link for ${s.title}? Anyone who opens it will see that it was removed.`)) return
  removing.value = { ...removing.value, [s.id]: true }
  try {
    await social.api().revokeShare(s.id)
    shares.value = (shares.value ?? []).filter(x => x.id !== s.id)
    toast('Plan link removed', { tone: 'ok' })
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t remove the link.'), { tone: 'warn' })
  }
  finally {
    const next = { ...removing.value }
    delete next[s.id]
    removing.value = next
  }
}

/** "14 Oct": the day a link was made. */
const madeOn = (at: number) => fmtDate(new Date(at).toISOString().slice(0, 10), 'dayMonth')

const zone = deviceTimeZone()
function meetupLine(m: Meetup): string {
  const when = socialMeetupWhen(m, zone)
  const parts = [when.label, m.place?.name ?? m.destination ?? '']
  if (m.cancelled) parts.push('Cancelled')
  else if (socialMeetupPassed(m, real.value.getTime())) parts.push('Passed')
  return parts.filter(Boolean).join(' · ')
}
</script>

<template>
  <section class="plinks" aria-labelledby="pl-friend">
    <h2 id="pl-friend" class="gh">
      Your friend link
    </h2>
    <div class="card pad stack">
      <p class="small muted">
        Anyone with this link or QR code can add you as a friend, until you reset it.
      </p>
      <ShareLink v-if="friendUrl" :url="friendUrl" title="Travels" text="Add me as a friend on Travels" />
      <p v-else-if="linkMsg" class="small muted" role="status">
        {{ linkMsg }}
      </p>
      <div v-if="friendUrl">
        <button class="btn sm plain danger-text" type="button" :disabled="resetting" @click="resetLink">
          <AppIcon name="refresh" size="sm" />{{ resetting ? 'Resetting…' : 'Reset link' }}
        </button>
      </div>
    </div>
  </section>

  <section class="plinks" aria-labelledby="pl-plans">
    <h2 id="pl-plans" class="gh">
      Your plan links
    </h2>
    <div v-if="shares?.length" class="card rows">
      <div v-for="s in shares" :key="s.id" class="lrow">
        <span class="ic" aria-hidden="true"><AppIcon name="calendar" /></span>
        <span class="grow ltx">
          <b class="ellipsis">{{ s.title }}</b>
          <span class="small muted">{{ fmtRange(s.start, s.end) }} · made {{ madeOn(s.createdAt) }}</span>
          <span class="lacts">
            <button class="btn sm" type="button" :aria-label="`Copy the plan link for ${s.title}`" @click="copyShare(s)">
              <AppIcon name="copy" size="sm" />Copy
            </button>
            <button class="btn sm ghost" type="button" :disabled="removing[s.id]" :aria-label="`Remove the plan link for ${s.title}`" @click="removeShare(s)">
              <AppIcon name="trash" size="sm" />Remove
            </button>
          </span>
        </span>
      </div>
    </div>
    <p v-else-if="shares" class="none small muted">
      No plan links. Make one from a trip: More, then Share this plan.
    </p>
  </section>

  <section class="plinks" aria-labelledby="pl-meet">
    <h2 id="pl-meet" class="gh">
      Your meetups
    </h2>
    <div v-if="meetups?.length" class="card rows">
      <NuxtLink v-for="m in meetups" :key="m.id" :to="socialPath('meetup', m.id)" class="lrow tap">
        <span class="ic" aria-hidden="true"><AppIcon name="hand" /></span>
        <span class="grow ltx">
          <b class="ellipsis">{{ m.title }}</b>
          <span class="small muted">{{ meetupLine(m) }}</span>
        </span>
        <AppIcon name="chevr" class="chev" />
      </NuxtLink>
    </div>
    <p v-else-if="meetups" class="none small muted">
      No meetups yet. Ask who’s in from a trip’s Meet people page.
    </p>
    <p v-if="listMsg" class="small muted" role="status">
      {{ listMsg }}
    </p>
  </section>
</template>

<style scoped>
.plinks { display: flex; flex-direction: column; }
.gh { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 4px 8px; }
.rows { overflow: hidden; }
.lrow { display: flex; align-items: flex-start; gap: 12px; min-height: 60px; padding: 12px 14px; color: var(--fg); text-decoration: none; }
.lrow.tap { align-items: center; }
.lrow.tap:hover { background: var(--surface-2); }
.lrow.tap:focus-visible { outline-offset: -3px; }
.ic { width: 38px; height: 38px; border-radius: 11px; display: grid; place-items: center; flex: none; background: var(--surface-2); color: var(--accent); }
.ltx { display: flex; flex-direction: column; min-width: 0; line-height: 1.35; }
.ltx b { font-size: 15px; }
.lacts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.chev { color: var(--fg-3); }
.none { padding: 14px 16px; border: 1px dashed var(--line); border-radius: var(--r-lg); }
.danger-text { color: var(--bad); margin-left: -8px; }
</style>
