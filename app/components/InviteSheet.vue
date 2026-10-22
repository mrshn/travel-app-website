<script setup lang="ts">
import type { Invite, Role } from '#shared/types/social'
import { ROLE_LABEL, socialFirstName, socialPath } from '#shared/utils/social'
import { groupErrorLine } from './GroupNotice.vue'

/**
 * Invite people (?invite=1, with &role=viewer to let people follow along): docs/design/2026-10-14-together.md, 5.2.
 * Mounted once by the trip shell. On a solo trip the first link makes it a group trip; a group trip reuses the
 * working link of the role picked, which Reset replaces. Friends can be invited from here too (an inbox item).
 */
type InviteRole = Exclude<Role, 'owner'>

const v = useTripView()
const route = useRoute()
const router = useRouter()
const sheet = useQueryState('invite')
const social = useSocial()
const groups = useGroups()
const tg = useTripGroup()

const open = computed(() => !!sheet.value.value && !!v.trip.value)
const role = computed<InviteRole>(() => (route.query.role === 'viewer' ? 'viewer' : 'editor'))
function setRole(r: InviteRole) {
  const query = { ...route.query }
  if (r === 'viewer') query.role = 'viewer'
  else delete query.role
  void router.replace({ query })
}
function close() {
  sheet.close()
}

const trip = v.trip
const title = computed(() => trip.value?.title ?? 'this trip')
/** Viewers follow along: only the organiser and editors hand out links. */
const mayInvite = computed(() => !tg.isGroup.value || tg.canEdit.value)
const ready = social.ready

// ---------- the links ----------
const links = ref<Invite[]>([])
const loading = ref(false)
const busy = ref(false)
/** The working link of the role picked. */
const current = computed(() => links.value.find(i => i.role === role.value) ?? null)
const url = computed(() => (current.value ? social.link(socialPath('trip', current.value.token)) : ''))
const shareText = computed(() => (role.value === 'viewer' ? `Follow ${title.value} with me on Travels` : `Plan ${title.value} with me on Travels`))

function inviteFor(gid: string, r: InviteRole): Omit<Invite, 'token' | 'createdAt' | 'from' | 'fromName' | 'fromPhoto' | 'revoked'> {
  const t = trip.value!
  return {
    kind: 'trip',
    trip: gid,
    role: r,
    tripTitle: t.title,
    tripDestination: t.destination,
    tripStart: t.start,
    tripEnd: t.end,
    tripCover: { scene: t.cover.scene, tod: t.cover.tod },
  }
}

/** Asked again while loading (another role picked meanwhile): load once more after. */
let again = false
/** Your working links for this group trip, and one of the role picked (made when there is none). */
async function load() {
  const gid = tg.gid.value
  if (!open.value || !gid || !mayInvite.value || !ready.value || busy.value) return
  if (loading.value) {
    again = true
    return
  }
  loading.value = true
  try {
    const b = social.api()
    const mine = (await b.myInvites()).filter(i => i.kind === 'trip' && i.trip === gid && !i.revoked)
    const want = role.value
    links.value = mine
    if (!mine.some(i => i.role === want)) links.value = [await b.createInvite(inviteFor(gid, want)), ...mine]
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
  finally {
    loading.value = false
    if (again) {
      again = false
      void load()
    }
  }
}
// Another trip on the same shell: its own links.
watch(() => tg.gid.value, () => {
  links.value = []
})
watch(() => [open.value, tg.gid.value, role.value, ready.value] as const, () => void load(), { immediate: true })
watch(open, (o) => {
  if (!o) invited.value = new Set()
})

/** A solo trip's first link: the trip becomes a group trip, then the link is made. */
async function start() {
  const t = trip.value
  if (!t || busy.value) return
  busy.value = true
  try {
    const gid = await groups.makeGroup(t.id)
    const inv = await social.api().createInvite(inviteFor(gid, role.value))
    links.value = [inv]
    toast(`${t.title} is a group trip now`, { tone: 'ok' })
  }
  catch (e) {
    toast(groupErrorLine(e, 'Couldn\'t make the link. Try again in a moment.'), { tone: 'warn' })
  }
  finally {
    busy.value = false
  }
}

/** The old link stops working, and a new one of the same role takes its place. */
async function reset(inv: Invite) {
  const gid = tg.gid.value
  if (!gid || busy.value) return
  busy.value = true
  try {
    const b = social.api()
    await b.revokeInvite(inv.token)
    const next = await b.createInvite(inviteFor(gid, inv.role ?? 'editor'))
    links.value = [next, ...links.value.filter(i => i.token !== inv.token)]
    toast('Link reset. The old one doesn\'t work any more.', { tone: 'ok' })
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
  finally {
    busy.value = false
  }
}

// ---------- friends ----------
const members = computed(() => new Set(tg.members.value.map(m => m.uid)))
const friends = computed(() => social.friends.value.map(f => ({ uid: f.uid, name: f.profile?.name ?? 'A friend', photo: f.profile?.photo ?? null })))
const invited = ref(new Set<string>())
async function inviteFriend(uid: string, name: string) {
  const inv = current.value
  const gid = tg.gid.value
  if (!inv || !gid) return
  try {
    await social.api().notify(uid, { kind: 'trip-invite', text: `invited you to ${title.value}`, link: socialPath('trip', inv.token), ref: gid })
    invited.value = new Set([...invited.value, uid])
    toast(`${socialFirstName(name)} has your invite`, { tone: 'ok' })
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
}

const shortLink = (inv: Invite) => social.link(socialPath('trip', inv.token)).replace(/^https?:\/\//, '')
</script>

<template>
  <BottomSheet :open="open" title="Invite people" @close="close">
    <div v-if="trip" class="inv">
      <GroupNotice />

      <p v-if="!mayInvite" class="note">
        <AppIcon name="info" size="sm" /><span>You can view this trip. The organiser and people who can edit invite others.</span>
      </p>

      <template v-else>
        <div class="seg block roles" role="group" aria-label="What they can do">
          <button type="button" :aria-pressed="role === 'editor'" @click="setRole('editor')">
            <AppIcon name="edit" size="sm" />Can edit
          </button>
          <button type="button" :aria-pressed="role === 'viewer'" @click="setRole('viewer')">
            <AppIcon name="eye" size="sm" />Can view
          </button>
        </div>
        <p class="small muted">
          <template v-if="role === 'editor'">
            They see the plan, change it with you, vote on options and chat.
          </template>
          <template v-else>
            They follow the plan as it changes and chat. Only you and editors change it.
          </template>
        </p>

        <!-- A solo trip: the first link makes it a group trip. -->
        <template v-if="!tg.isGroup.value">
          <p class="note">
            <AppIcon name="users" size="sm" /><span>This makes {{ title }} a group trip: people you invite see the plan. Your ticks, costs, notes and photos stay yours.</span>
          </p>
          <button class="btn primary block" type="button" :disabled="busy || !ready" @click="start">
            <AppIcon name="link" size="sm" />{{ busy ? 'Making the link…' : 'Create the invite link' }}
          </button>
        </template>

        <template v-else>
          <section class="part" aria-labelledby="inv-link-h">
            <h3 id="inv-link-h" class="kicker">
              Your link
            </h3>
            <ShareLink v-if="url" :url="url" :title="title" :text="shareText" />
            <p v-else class="small muted">
              {{ loading ? 'Getting your link…' : 'Your link shows here when you\'re online.' }}
            </p>
            <p class="small muted">
              Anyone with the link can join as {{ ROLE_LABEL[role] }} until you reset it.
            </p>
          </section>

          <section v-if="url" class="part" aria-labelledby="inv-friends-h">
            <h3 id="inv-friends-h" class="kicker">
              Send to friends
            </h3>
            <ul v-if="friends.length" class="card flat rows people">
              <li v-for="f in friends" :key="f.uid" class="row-item">
                <Avatar :person="f" :size="36" />
                <span class="grow ellipsis strong">{{ f.name }}</span>
                <span v-if="members.has(f.uid)" class="small muted">In this trip</span>
                <span v-else-if="invited.has(f.uid)" class="chip t-ok"><AppIcon name="check" />Invited</span>
                <button v-else class="btn sm" type="button" @click="inviteFriend(f.uid, f.name)">
                  <AppIcon name="send" size="sm" />Invite
                </button>
              </li>
            </ul>
            <p v-else class="small muted">
              Friends on Travels show here, so you can invite them in one tap.
            </p>
          </section>

          <section v-if="links.length" class="part" aria-labelledby="inv-links-h">
            <h3 id="inv-links-h" class="kicker">
              Links
            </h3>
            <ul class="card flat rows">
              <li v-for="l in links" :key="l.token" class="row-item">
                <span class="grow lk">
                  <b>{{ ROLE_LABEL[l.role ?? 'editor'] }}</b>
                  <span class="small muted ellipsis num">{{ shortLink(l) }}</span>
                </span>
                <button class="btn sm ghost" type="button" :disabled="busy" @click="reset(l)">
                  <AppIcon name="refresh" size="sm" />Reset
                </button>
              </li>
            </ul>
          </section>
        </template>
      </template>
    </div>
  </BottomSheet>
</template>

<style scoped>
.inv { display: flex; flex-direction: column; gap: 14px; padding: 4px 16px 8px; }
.roles button { min-height: 44px; }
.note { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 12px; background: var(--gold-soft); color: var(--fg); font-size: 14px; line-height: 1.45; }
.note .i { flex: none; margin-top: 2px; color: var(--gold-ink); }
.part { display: flex; flex-direction: column; gap: 10px; }
.people { overflow: hidden; background: var(--surface); }
.people .row-item, .rows .row-item { padding: 8px 12px; min-height: 52px; }
.rows { overflow: hidden; background: var(--surface); }
.lk { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
</style>
