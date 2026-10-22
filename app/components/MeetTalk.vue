<script setup lang="ts">
import type { TalkGroup, TalkStop } from '#shared/utils/talk'
import { useStorage } from '@vueuse/core'
import { socialFirstName, socialPath } from '#shared/utils/social'
import { TALK_ADVICE_GROUPS, TALK_GOAL, TALK_RULES, langName, talkCount, talkFollowUp, talkInvites, talkKeepGoing, talkPhrases, talkStart, talkWrapUp, tripLang } from '#shared/utils/talk'
import { meetErrorLine } from './MeetState.vue'

/**
 * Say hi (Meet people; docs/design/2026-10-14-together.md, section 13): today's goal (say hi to five people, counted
 * by hand), three rules, and lines to copy or say: openers by situation, questions that keep a chat going, invites
 * made from the plan's next stops (each one a meetup link in a tap), swapping friend links, ways to wrap up kindly,
 * and the trip's phrases in the local language, read aloud. Works offline but for the friend link.
 */
const v = useTripView()
const route = useRoute()
const router = useRouter()
const social = useSocial()
const cloud = useCloud()

type Tab = 'start' | 'more' | 'invite' | 'leave' | 'local'
const remembered = useStorage<string>('travel:talk:tab:v1', 'start')

const name = computed(() => {
  const n = social.me.value?.name || cloud.account.value?.name || ''
  return n.trim() ? socialFirstName(n) : ''
})
const ctx = computed(() => ({ name: name.value, city: v.trip.value?.destination ?? '' }))

// ---------- today's goal ----------
const dayId = computed(() => v.today.value?.view.day.id)
const count = computed(() => talkCount(dayId.value ? v.progress.value.talks?.[dayId.value]?.n : 0))
const goalLine = computed(() => {
  const left = TALK_GOAL - count.value
  if (left <= 0) return count.value > TALK_GOAL ? `${count.value} people so far. Well done.` : 'Goal reached. Well done.'
  return count.value ? `${count.value} so far, ${left} to go` : 'Tap + each time you say hi to someone new.'
})
function bump(d: number) {
  const id = dayId.value
  if (!id) return
  const n = talkCount(count.value + d)
  if (n === count.value) return
  v.setTalk(id, n)
  if (d > 0 && n === TALK_GOAL) toast(`${TALK_GOAL} people today. Well done.`, { tone: 'ok' })
}

// ---------- lines ----------
const lang = computed(() => (v.trip.value ? tripLang(v.trip.value) : undefined))
const phrases = computed(() => (v.trip.value ? talkPhrases(v.trip.value) : []))
const tabs = computed<{ key: Tab, label: string }[]>(() => [
  { key: 'start', label: 'Start' },
  { key: 'more', label: 'Keep going' },
  { key: 'invite', label: 'Invite' },
  { key: 'leave', label: 'Wrap up' },
  ...(phrases.value.length ? [{ key: 'local' as const, label: langName(lang.value) ?? 'Local words' }] : []),
])
const tab = computed<Tab>(() => (tabs.value.some(t => t.key === remembered.value) ? remembered.value as Tab : 'start'))

const groups = computed<TalkGroup[]>(() => {
  if (tab.value === 'start') return talkStart(ctx.value)
  if (tab.value === 'more') return talkKeepGoing(ctx.value)
  if (tab.value === 'leave') return talkWrapUp()
  return []
})
const isAdvice = (g: TalkGroup) => TALK_ADVICE_GROUPS.includes(g.id)

/** The plan's next sights, meals and nights out (not done, skipped or on now), in order. */
const inviteStops = computed<TalkStop[]>(() => {
  const out: TalkStop[] = []
  for (const p of v.plans.value) {
    for (const s of p.stops) {
      const st = p.states[s.id]
      if (s.minor || (st !== 'next' && st !== 'upcoming')) continue
      if (s.kind !== 'sight' && s.kind !== 'food' && s.kind !== 'night') continue
      out.push({ id: s.id, title: s.title, start: s.start, date: p.view.day.date })
    }
  }
  return out
})
const invites = computed(() => talkInvites(inviteStops.value, v.today.value?.view.day.date ?? ''))
const followUp = computed(() => talkFollowUp(ctx.value))

async function copy(text: string) {
  if (await copyText(text)) toast('Copied', { tone: 'ok' })
  else toast('Couldn’t copy. Press and hold the line to select it.', { tone: 'warn' })
}
const open = (q: Record<string, string>) => void router.push({ query: { ...route.query, ...q } })

// ---------- your friend link, as a QR code to show ----------
const qrUrl = ref('')
const qrBusy = ref(false)
async function toggleQr() {
  if (qrUrl.value) {
    qrUrl.value = ''
    return
  }
  if (!social.ready.value) {
    toast('Your friend link needs you signed in and online.', { tone: 'warn' })
    return
  }
  qrBusy.value = true
  try {
    qrUrl.value = social.link(socialPath('friend', await social.friendLinkToken()))
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t get your friend link.'), { tone: 'warn' })
  }
  finally {
    qrBusy.value = false
  }
}
</script>

<template>
  <section id="talk" class="sec talk" aria-labelledby="meet-talk">
    <div class="sec-h">
      <h2 id="meet-talk">
        Say hi
      </h2>
    </div>
    <p class="small muted lede">
      Lines to start a chat, keep it going and turn it into a plan. Copy one, or just say it.
    </p>

    <!-- Today's goal (during the trip) -->
    <div v-if="dayId" class="card pad goal" data-goal>
      <div class="g-top">
        <div class="g-t">
          <span class="g-k">Today's goal</span>
          <b>Say hi to {{ TALK_GOAL }} people</b>
          <span class="small muted" aria-live="polite">{{ goalLine }}</span>
        </div>
        <div class="g-c">
          <button class="btn icon round" type="button" :disabled="!count" aria-label="One fewer" @click="bump(-1)">
            <AppIcon name="minus" />
          </button>
          <span class="g-n num" aria-hidden="true">{{ count }}</span>
          <button class="btn icon round primary" type="button" aria-label="I said hi to someone" @click="bump(1)">
            <AppIcon name="plus" />
          </button>
        </div>
      </div>
      <div class="g-bar" role="progressbar" aria-label="Today's goal" aria-valuemin="0" :aria-valuemax="TALK_GOAL" :aria-valuenow="Math.min(count, TALK_GOAL)">
        <span v-for="i in TALK_GOAL" :key="i" class="g-seg" :class="{ on: i <= count }" />
      </div>
    </div>

    <ol class="rules">
      <li v-for="(r, i) in TALK_RULES" :key="r.id" class="rule">
        <span class="r-n num" aria-hidden="true">{{ i + 1 }}</span>
        <span class="r-t">
          <b>{{ r.title }}</b>
          <span class="small muted">{{ r.text }}</span>
        </span>
      </li>
    </ol>

    <div class="seg tabs" role="group" aria-label="Lines for">
      <button v-for="t in tabs" :key="t.key" type="button" :aria-pressed="tab === t.key" :data-tab="t.key" @click="remembered = t.key">
        {{ t.label }}
      </button>
    </div>

    <div class="card talk-card">
      <!-- Start, Keep going, Wrap up -->
      <template v-if="groups.length">
        <div v-for="g in groups" :key="g.id" class="tg" :data-group="g.id">
          <h3 class="tg-h">
            {{ g.title }}
          </h3>
          <p v-if="g.hint" class="small muted tg-hint">
            {{ g.hint }}
          </p>
          <ul class="lines" :class="{ advice: isAdvice(g) }">
            <li v-for="l in g.lines" :key="l.id" class="line">
              <span class="lt">{{ isAdvice(g) ? l.text : `“${l.text}”` }}</span>
              <button v-if="!isAdvice(g)" class="btn icon sm plain cp" type="button" :aria-label="`Copy: ${l.text}`" @click="copy(l.text)">
                <AppIcon name="copy" size="sm" />
              </button>
            </li>
          </ul>
        </div>
      </template>

      <!-- Invite -->
      <template v-else-if="tab === 'invite'">
        <div class="tg" data-group="plan">
          <h3 class="tg-h">
            From your plan
          </h3>
          <p class="small muted tg-hint">
            Say the place and the time. A meetup link lets anyone say they're in.
          </p>
          <ul v-if="invites.length" class="lines">
            <li v-for="l in invites" :key="l.id" class="line inv" :data-invite="l.stopId">
              <span class="lt">“{{ l.text }}”</span>
              <span class="l-acts">
                <button class="btn icon sm plain cp" type="button" :aria-label="`Copy: ${l.text}`" @click="copy(l.text)">
                  <AppIcon name="copy" size="sm" />
                </button>
                <button class="btn sm" type="button" @click="open({ meetup: 'new', stop: l.stopId })">
                  <AppIcon name="hand" size="sm" />Make a meetup
                </button>
              </span>
            </li>
          </ul>
          <div v-else class="none">
            <p class="small muted">
              Nothing left in the plan to invite people to. A meetup works for anything else.
            </p>
            <button class="btn sm" type="button" @click="open({ meetup: 'new' })">
              <AppIcon name="plus" size="sm" />New meetup
            </button>
          </div>
        </div>
        <div v-for="g in followUp" :key="g.id" class="tg" :data-group="g.id">
          <h3 class="tg-h">
            {{ g.title }}
          </h3>
          <ul class="lines">
            <li v-for="l in g.lines" :key="l.id" class="line">
              <span class="lt">“{{ l.text }}”</span>
              <button class="btn icon sm plain cp" type="button" :aria-label="`Copy: ${l.text}`" @click="copy(l.text)">
                <AppIcon name="copy" size="sm" />
              </button>
            </li>
          </ul>
          <template v-if="g.id === 'swap'">
            <div class="swap">
              <button class="btn sm" type="button" :disabled="qrBusy" @click="toggleQr">
                <AppIcon name="qr" size="sm" />{{ qrUrl ? 'Hide my QR code' : 'Show my friend QR' }}
              </button>
              <button class="btn sm ghost" type="button" @click="open({ met: 'new' })">
                <AppIcon name="userplus" size="sm" />Add to people you met
              </button>
            </div>
            <div v-if="qrUrl" class="qr-box">
              <QrCode :value="qrUrl" :size="168" label="QR code of your friend link" />
              <span class="small muted">They scan it with their camera to add you as a friend in Travels.</span>
            </div>
          </template>
        </div>
      </template>

      <!-- The local language -->
      <div v-else-if="tab === 'local'" class="tg" data-group="local">
        <p class="small muted tg-hint">
          Tap the speaker to hear it. People love it when you try.
        </p>
        <ul class="lines phr">
          <li v-for="(p, i) in phrases" :key="i" class="line ph">
            <button class="btn icon sm round" type="button" :aria-label="`Hear “${p[0]}”`" @click="speak(p[0], lang ?? 'it-IT')">
              <AppIcon name="speaker" size="sm" />
            </button>
            <span class="lt ph-t">
              <b>{{ p[0] }}</b>
              <span class="small faint">{{ p[1] }}</span>
              <span class="small muted">{{ p[2] }}</span>
            </span>
            <button class="btn icon sm plain cp" type="button" :aria-label="`Copy: ${p[0]}`" @click="copy(p[0])">
              <AppIcon name="copy" size="sm" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.lede { margin: -4px 0 12px; max-width: 62ch; }

/* today's goal */
.goal { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
.g-top { display: flex; align-items: center; gap: 12px; }
.g-t { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; line-height: 1.35; }
.g-k { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); }
.g-t b { font-size: 17px; font-weight: 700; }
.g-c { flex: none; display: flex; align-items: center; gap: 8px; }
.g-n { min-width: 2ch; text-align: center; font-size: 24px; font-weight: 700; }
.g-bar { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
.g-seg { height: 6px; border-radius: 999px; background: var(--surface-3); transition: background .2s ease; }
.g-seg.on { background: var(--ok); }

/* three rules */
.rules { list-style: none; display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; margin: 0 2px 14px; padding: 0; }
@media (min-width: 720px) { .rules { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.rule { display: flex; gap: 10px; align-items: flex-start; }
.r-n { flex: none; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 13px; font-weight: 700; }
.r-t { display: flex; flex-direction: column; gap: 1px; min-width: 0; line-height: 1.35; }
.r-t b { font-weight: 650; }

/* tabs: on a phone three and two to a row (nothing hides off the side); one row once they fit */
.tabs { display: flex; flex-wrap: wrap; width: 100%; overflow: visible; margin-bottom: 12px; }
.tabs button { min-height: 44px; flex: 1 1 30%; }
@media (min-width: 600px) { .tabs button { flex: 1 1 auto; } }

/* lines */
.talk-card { display: flex; flex-direction: column; padding: 4px 0; }
.tg { padding: 12px 14px 4px; }
.tg + .tg { border-top: 1px solid var(--line); }
.tg-h { font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: var(--fg-2); }
.tg-hint { margin-top: 2px; }
.lines { list-style: none; margin: 6px 0 0; padding: 0; display: flex; flex-direction: column; }
.line { display: flex; align-items: center; gap: 10px; padding: 8px 0; min-height: 52px; }
.line + .line { border-top: 1px dashed var(--line); }
.lt { flex: 1; min-width: 0; font-size: 15.5px; line-height: 1.45; overflow-wrap: anywhere; user-select: text; }
.advice .line { min-height: 0; }
.advice .lt { font-size: 15px; color: var(--fg-2); padding-left: 16px; position: relative; }
.advice .lt::before { content: ""; position: absolute; left: 2px; top: .62em; width: 6px; height: 6px; border-radius: 999px; background: var(--gold-ink); }
.cp { flex: none; color: var(--fg-2); }
.inv { flex-wrap: wrap; }
.inv .lt { flex-basis: 100%; }
.l-acts { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.swap { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 0 10px; }
.none { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding: 6px 0 12px; }
.qr-box { display: flex; align-items: center; gap: 14px; padding: 4px 0 14px; }
.qr-box :deep(.qr) { flex: none; border-radius: 10px; }
.ph { align-items: flex-start; }
.ph > .btn { margin-top: 2px; }
.ph-t { display: flex; flex-direction: column; gap: 2px; }
.ph-t b { font-weight: 650; }
@media (max-width: 380px) {
  .qr-box { flex-direction: column; align-items: flex-start; }
}
</style>
