<script setup lang="ts">
import type { MemberStatus, Role, StatusKind } from '#shared/types/social'
import { directionsUrl } from '#shared/utils/geo'
import { ROLE_LABEL, socialAgo, socialFirstName } from '#shared/utils/social'
import { fmtClock, zoned } from '#shared/utils/time'
import { groupErrorLine } from './GroupNotice.vue'

/**
 * Together's people (docs/design/2026-10-14-together.md, 5.1): you on top with quick statuses and "Share where I
 * am", then everyone else with their role and status. The organiser changes roles and removes people; anyone else
 * can leave. The organiser can stop sharing the trip: everyone keeps their own copy.
 */
const v = useTripView()
const tg = useTripGroup()
const groups = useGroups()
const social = useSocial()
const { real } = useClock()
const ready = social.ready

const meUid = computed(() => tg.me.value?.uid ?? '')
const others = computed(() => tg.members.value.filter(m => m.uid !== meUid.value))
const myStatus = computed(() => (meUid.value ? tg.statusOf(meUid.value) : null))
const tz = computed(() => v.trip.value?.timezone ?? 'UTC')
const title = computed(() => v.trip.value?.title ?? 'this trip')

/** "At Pantheon · 5 min ago"; "Home safe · 01:45" (on the trip's clock). */
function statusLine(s: MemberStatus | null): string {
  if (!s) return ''
  if (s.kind === 'home') {
    try {
      return `${s.text} · ${fmtClock(zoned(new Date(s.at), tz.value).minutes)}`
    }
    catch {
      return s.text
    }
  }
  const ago = socialAgo(s.at, real.value.getTime())
  return `${s.text} · ${ago === 'now' ? 'just now' : /\b(?:min|h)$/.test(ago) ? `${ago} ago` : ago}`
}

// ---------- your status ----------
interface Quick { kind: StatusKind, text: string, stopId?: string }
/** The stop on now during the trip ("At Pantheon"). */
const stopNow = computed(() => {
  const t = v.today.value
  return t?.stops.find(s => !s.minor && t.states[s.id] === 'now') ?? null
})
const quick = computed<Quick[]>(() => [
  { kind: 'onway', text: 'On my way' },
  { kind: 'late', text: 'Running late' },
  ...(stopNow.value ? [{ kind: 'at' as const, text: `At ${stopNow.value.title}`.slice(0, 80), stopId: stopNow.value.id }] : []),
  { kind: 'free', text: 'Free now' },
  { kind: 'home', text: 'Home safe' },
])
const isMine = (q: Quick) => myStatus.value?.kind === q.kind && myStatus.value.text === q.text
const otherOpen = ref(false)
const otherText = ref('')
const saving = ref(false)
async function setStatus(s: Omit<MemberStatus, 'uid' | 'at'> | null) {
  if (saving.value) return
  saving.value = true
  try {
    await tg.setStatus(s)
    if (s) toast(`Your status: ${s.text}`, { tone: 'ok' })
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
  finally {
    saving.value = false
  }
}
function tapQuick(q: Quick) {
  otherOpen.value = false
  void setStatus(isMine(q) ? null : { kind: q.kind, text: q.text, ...(q.stopId ? { stopId: q.stopId } : {}) })
}
function toggleOther() {
  otherOpen.value = !otherOpen.value
  if (otherOpen.value) otherText.value = myStatus.value?.kind === 'custom' ? myStatus.value.text : ''
}
async function saveOther() {
  const t = otherText.value.trim().slice(0, 80)
  if (!t) return
  await setStatus({ kind: 'custom', text: t })
  otherOpen.value = false
}

// ---------- the organiser ----------
async function changeRole(uid: string, role: Exclude<Role, 'owner'>, name: string) {
  const gid = tg.gid.value
  if (!gid) return
  try {
    await groups.setRole(gid, uid, role)
    toast(`${socialFirstName(name)} ${role === 'editor' ? 'can edit the plan now' : 'can view the plan now'}`, { tone: 'ok' })
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
}
async function removePerson(uid: string, name: string) {
  const gid = tg.gid.value
  if (!gid) return
  if (!confirm(`Remove ${name} from ${title.value}? They keep their own copy of the plan.`)) return
  try {
    await groups.setRole(gid, uid, null)
    toast(`${socialFirstName(name)} isn't in this trip any more`, { tone: 'ok' })
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
}

// ---------- leaving, or ending it ----------
const leaveOpen = ref(false)
const leaving = ref(false)
async function leave(keep: boolean) {
  const gid = tg.gid.value
  const id = v.id.value
  const name = title.value
  if (!gid || leaving.value) return
  leaving.value = true
  try {
    await groups.leave(gid, { keep })
    leaveOpen.value = false
    if (keep) {
      toast(`You left ${name}. Your copy stays on this phone.`, { tone: 'ok' })
      await navigateTo(`/trips/${id}/plan`, { replace: true })
    }
    else {
      toast(`You left ${name}, and it's gone from this phone.`, { tone: 'ok' })
      await navigateTo('/', { replace: true })
    }
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
  finally {
    leaving.value = false
  }
}
async function stopSharing() {
  const gid = tg.gid.value
  if (!gid) return
  if (!confirm(`Stop sharing ${title.value}? Everyone keeps their own copy, but it stops being shared.`)) return
  const name = title.value
  try {
    await groups.stopSharing(gid)
    toast(`${name} isn't shared any more. Everyone keeps their own copy.`, { tone: 'ok' })
  }
  catch (e) {
    toast(groupErrorLine(e), { tone: 'warn' })
  }
}
</script>

<template>
  <div class="people">
    <section v-if="tg.me.value" class="card pad you" aria-labelledby="ppl-you">
      <div class="who">
        <Avatar :person="tg.me.value" :size="44" />
        <div class="grow w-t">
          <h2 id="ppl-you" class="h3">
            {{ tg.me.value.name }}
          </h2>
          <span class="small muted">You<template v-if="tg.role.value"> · {{ ROLE_LABEL[tg.role.value] }}</template></span>
        </div>
      </div>
      <p class="mine small" :class="{ unset: !myStatus }">
        <AppIcon name="pin" size="sm" /><span>{{ myStatus ? statusLine(myStatus) : 'No status yet. Tap one so the group knows.' }}</span>
      </p>
      <div class="quick" role="group" aria-label="Your status">
        <button v-for="q in quick" :key="q.text" class="chip q" type="button" :aria-pressed="isMine(q)" :disabled="!ready" @click="tapQuick(q)">
          {{ q.text }}
        </button>
        <button class="chip q" type="button" :aria-pressed="myStatus?.kind === 'custom' || otherOpen" :aria-expanded="otherOpen" :disabled="!ready" @click="toggleOther">
          Other
        </button>
        <button v-if="myStatus" class="chip q t-plain" type="button" :disabled="!ready" @click="setStatus(null)">
          <AppIcon name="x" />Clear
        </button>
      </div>
      <form v-if="otherOpen" class="row other" @submit.prevent="saveOther">
        <input v-model="otherText" class="input grow" maxlength="80" placeholder="e.g. Getting gelato, back at 8" aria-label="Your status">
        <button class="btn primary" type="submit" :disabled="!otherText.trim() || !ready">
          Save
        </button>
      </form>
      <div>
        <GroupWhereButton />
      </div>
    </section>

    <section class="list" aria-labelledby="ppl-all">
      <h2 id="ppl-all" class="gh">
        In this trip
      </h2>
      <ul v-if="others.length" class="card rows">
        <li v-for="p in others" :key="p.uid" class="person">
          <div class="who">
            <Avatar :person="p" :size="40" />
            <div class="grow w-t">
              <b class="ellipsis">{{ p.name }}</b>
              <span class="small muted">{{ ROLE_LABEL[p.role] }}</span>
            </div>
          </div>
          <p v-if="tg.statusOf(p.uid)" class="st small">
            <AppIcon name="pin" size="sm" /><span>{{ statusLine(tg.statusOf(p.uid)) }}</span>
            <a v-if="tg.statusOf(p.uid)?.place" class="btn sm plain maps" :href="directionsUrl(tg.statusOf(p.uid)!.place!, 'walking')" target="_blank" rel="noopener">
              <AppIcon name="map" size="sm" />Open in Maps
            </a>
          </p>
          <div v-if="tg.isOwner.value && p.role !== 'owner'" class="org">
            <label class="sr-only" :for="`role-${p.uid}`">What {{ p.name }} can do</label>
            <select :id="`role-${p.uid}`" class="select role" :value="p.role" :disabled="!ready" @change="changeRole(p.uid, ($event.target as HTMLSelectElement).value as 'editor' | 'viewer', p.name)">
              <option value="editor">
                Can edit
              </option>
              <option value="viewer">
                Can view
              </option>
            </select>
            <button class="btn ghost" type="button" :disabled="!ready" @click="removePerson(p.uid, p.name)">
              <AppIcon name="logout" size="sm" />Remove
            </button>
          </div>
        </li>
      </ul>
      <p v-else-if="!ready" class="small muted">
        People show here when you're online.
      </p>
      <div v-else class="card pad lonely">
        <p class="small muted">
          Nobody else yet. Invite people and they show here.
        </p>
        <NuxtLink v-if="tg.canEdit.value" :to="{ query: { invite: '1' } }" class="btn primary">
          <AppIcon name="userplus" size="sm" />Invite people
        </NuxtLink>
      </div>
    </section>

    <section class="end" aria-label="This group">
      <button v-if="tg.isOwner.value" class="btn danger" type="button" :disabled="!ready" @click="stopSharing">
        <AppIcon name="x" size="sm" />Stop sharing this trip
      </button>
      <button v-else class="btn danger" type="button" :disabled="!ready" @click="leaveOpen = true">
        <AppIcon name="logout" size="sm" />Leave this trip
      </button>
      <p class="small muted">
        <template v-if="tg.isOwner.value">
          Everyone keeps their own copy, but it stops being shared.
        </template>
        <template v-else>
          You can keep your copy of the plan, or remove it from this phone.
        </template>
      </p>
    </section>

    <BottomSheet :open="leaveOpen" title="Leave this trip?" @close="leaveOpen = false">
      <div class="lv">
        <p>
          You stop seeing the group's changes and chat. Your ticks, costs, notes and photos stay yours.
        </p>
        <button class="btn primary block" type="button" :disabled="leaving" @click="leave(true)">
          Leave and keep my copy
        </button>
        <button class="btn danger block" type="button" :disabled="leaving" @click="leave(false)">
          Leave and remove it from this phone
        </button>
        <button class="btn ghost block" type="button" @click="leaveOpen = false">
          Stay in the trip
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.people { display: flex; flex-direction: column; gap: 18px; }
.you { display: flex; flex-direction: column; gap: 12px; }
.who { display: flex; align-items: center; gap: 12px; min-width: 0; }
.w-t { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.mine { display: flex; align-items: flex-start; gap: 8px; font-weight: 600; color: var(--fg); }
.mine .i { flex: none; margin-top: 1px; color: var(--accent); }
.mine.unset { font-weight: 500; color: var(--fg-2); }
.quick { display: flex; flex-wrap: wrap; gap: 8px; }
.q { min-height: 36px; max-width: 100%; padding: 4px 12px; font-size: 13.5px; white-space: normal; text-align: left; border-color: var(--line); background: var(--surface); color: var(--fg); }
.q:disabled { opacity: .55; }
.other { gap: 8px; }
.gh { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 4px 8px; }
.rows { list-style: none; overflow: hidden; }
.person { display: flex; flex-direction: column; gap: 8px; padding: 12px 14px; }
.st { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; color: var(--fg); font-weight: 550; }
.st .i { flex: none; color: var(--accent); }
.maps { margin-left: auto; }
.org { display: flex; flex-wrap: wrap; gap: 8px; }
.role { flex: 1 1 140px; width: auto; }
.lonely { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
.end { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.lv { display: flex; flex-direction: column; gap: 10px; padding: 4px 16px 8px; }
.lv p { line-height: 1.5; }
</style>
