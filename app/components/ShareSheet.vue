<script setup lang="ts">
import { socialPath, socialShareTrip } from '#shared/utils/social'
import { meetErrorLine } from './MeetState.vue'

/**
 * Share this plan (spec 5.11 and T9), open while the URL has ?share=1. Mounted once by the trip shell. Four ways:
 * plan it together and let people follow along (both open Invite people, ?invite=1), a copy anyone with the link can
 * open and copy (a plan link, /p/<id>: nothing of yours in it, where you stay only if you say so), and a post to your
 * friends with that link.
 */
const v = useTripView()
const route = useRoute()
const router = useRouter()
const sheet = useQueryState('share')
const social = useSocial()
const composer = usePostComposer()

const show = computed(() => !!sheet.value.value && !!v.trip.value)
const hasHome = computed(() => !!v.trip.value?.home)

/** The invite sheet takes this one's place (no stacked sheets). */
function invite(role?: 'viewer') {
  const { share: _share, role: _role, ...rest } = route.query
  void router.replace({ query: { ...rest, invite: '1', ...(role ? { role } : {}) } })
}

// ---------- a plan link ----------
const copyOpen = ref(false)
const includeHome = ref(false)
interface Made { id: string, url: string }
/** The links made while the sheet is open, without and with where you stay, until it closes. */
const made = ref<{ off?: Made, on?: Made }>({})
const making = ref(false)
watch(show, (s) => {
  if (s) return
  copyOpen.value = false
  includeHome.value = false
  made.value = {}
})
const withHome = computed(() => includeHome.value && hasHome.value)
const current = computed(() => made.value[withHome.value ? 'on' : 'off'] ?? null)

async function makeLink(): Promise<Made | null> {
  const t = v.trip.value
  if (!t || making.value) return null
  if (current.value) return current.value
  making.value = true
  const key = withHome.value ? 'on' : 'off'
  try {
    const plan = socialShareTrip(t, { includeHome: withHome.value })
    const s = await social.api().createShare({
      title: t.title,
      destination: t.destination,
      start: t.start,
      end: t.end,
      cover: { scene: t.cover.scene, tod: t.cover.tod },
      days: t.days.length,
      json: JSON.stringify(plan),
    })
    const link = { id: s.id, url: social.link(socialPath('plan', s.id)) }
    made.value = { ...made.value, [key]: link }
    return link
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t make the link.'), { tone: 'warn' })
    return null
  }
  finally {
    making.value = false
  }
}

async function removeLink() {
  const m = current.value
  if (!m || !confirm('Remove this link? It stops working for everyone who has it.')) return
  try {
    await social.api().revokeShare(m.id)
    const key = withHome.value ? 'on' : 'off'
    const { [key]: _gone, ...rest } = made.value
    made.value = rest
    toast('Link removed: it doesn\'t open any more', { tone: 'ok' })
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t remove the link.'), { tone: 'warn' })
  }
}

/** Stops in the plan as shared (its picked version of each day, minor steps left out). */
const stopCount = computed(() => {
  const t = v.trip.value
  if (!t) return 0
  return t.days.reduce((n, d) => n + (d.variants?.[t.variant?.default ?? ''] ?? d).stops.filter(s => !s.minor).length, 0)
})

/** Posts the plan link to your friends (the composer, another package's sheet), making the link first. */
async function post() {
  const t = v.trip.value
  const link = await makeLink()
  if (!t || !link) return
  composer.open({
    draft: {
      kind: 'plan',
      link: socialPath('plan', link.id),
      text: '',
      trip: { title: t.title, destination: t.destination, start: t.start, end: t.end },
      recap: `${t.days.length} ${t.days.length === 1 ? 'day' : 'days'} · ${stopCount.value} ${stopCount.value === 1 ? 'stop' : 'stops'}`,
    },
    context: `The plan for ${t.title}`,
  })
}
</script>

<template>
  <BottomSheet :open="show" title="Share this plan" @close="sheet.close()">
    <div v-if="show" class="sh">
      <MeetState what="plan links and posts" />
      <div class="rows card flat opts">
        <button class="row-item opt" type="button" @click="invite()">
          <span class="ic" aria-hidden="true"><AppIcon name="userplus" /></span>
          <span class="grow tx"><b>Plan it together</b><span class="small muted">Invite people to change the plan with you, vote on options and chat.</span></span>
          <AppIcon name="chevr" class="chev" />
        </button>
        <button class="row-item opt" type="button" @click="invite('viewer')">
          <span class="ic" aria-hidden="true"><AppIcon name="eye" /></span>
          <span class="grow tx"><b>Let people follow along</b><span class="small muted">They see the plan as it changes and can chat, but can't change it.</span></span>
          <AppIcon name="chevr" class="chev" />
        </button>
        <div class="copy">
          <button class="row-item opt" type="button" :aria-expanded="copyOpen" aria-controls="share-copy" @click="copyOpen = !copyOpen">
            <span class="ic" aria-hidden="true"><AppIcon name="link" /></span>
            <span class="grow tx"><b>Share a copy of the plan</b><span class="small muted">A link anyone can open and copy to their own trips. Nothing of yours is in it.</span></span>
            <AppIcon name="chev" class="chev" :class="{ up: copyOpen }" />
          </button>
          <div v-if="copyOpen" id="share-copy" class="copy-in">
            <button v-if="hasHome" class="switch" type="button" role="switch" :aria-checked="includeHome" @click="includeHome = !includeHome">
              <span class="grow tx"><b>Include where I stay</b><span class="small muted">{{ includeHome ? `${v.trip.value?.home?.label ?? 'Where you stay'} is in the copy.` : 'Left out of the copy.' }}</span></span>
              <span class="track" aria-hidden="true"><span class="knob" /></span>
            </button>
            <template v-if="current">
              <ShareLink :url="current.url" :title="v.trip.value?.title" :text="`The plan for ${v.trip.value?.title}:`" />
              <div class="acts">
                <button class="btn sm" type="button" @click="post">
                  <AppIcon name="users" size="sm" />Post to friends
                </button>
                <button class="btn sm ghost" type="button" @click="removeLink">
                  <AppIcon name="trash" size="sm" />Remove this link
                </button>
              </div>
            </template>
            <div v-else-if="social.ready.value">
              <button class="btn primary" type="button" :aria-disabled="making ? 'true' : undefined" @click="makeLink">
                <AppIcon name="link" size="sm" />{{ making ? 'Making the link…' : 'Make the link' }}
              </button>
            </div>
            <p v-else class="small muted">
              Making a link needs you signed in and online.
            </p>
          </div>
        </div>
        <button class="row-item opt" type="button" @click="post">
          <span class="ic" aria-hidden="true"><AppIcon name="users" /></span>
          <span class="grow tx"><b>Post to your friends</b><span class="small muted">A post with a link to the plan, for your friends' feed.</span></span>
          <AppIcon name="chevr" class="chev" />
        </button>
      </div>
    </div>
  </BottomSheet>
</template>

<style scoped>
.sh { display: flex; flex-direction: column; gap: 14px; padding: 6px 16px 8px; }
.opts { overflow: hidden; background: var(--surface); }
.opt { min-height: 64px; padding: 12px 14px; color: var(--fg); cursor: pointer; }
/* The card clips its corners, so the focus ring goes inside the row. */
.opt:focus-visible { outline-offset: -3px; }
.ic { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); }
.tx { display: flex; flex-direction: column; gap: 2px; line-height: 1.35; }
.tx b { font-weight: 650; }
.chev { flex: none; color: var(--fg-3); transition: transform .2s ease; }
.chev.up { transform: rotate(180deg); }
.copy-in { display: flex; flex-direction: column; gap: 12px; padding: 4px 14px 16px; }
.switch { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; padding: 8px 12px; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--bg); color: var(--fg); text-align: left; }
.track { flex: none; position: relative; width: 46px; height: 28px; border-radius: 999px; background: var(--surface-2); border: 2px solid var(--fg-3); transition: background .15s ease, border-color .15s ease; }
.knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: var(--fg-3); transition: transform .15s ease, background .15s ease; }
.switch[aria-checked="true"] .track { background: var(--accent); border-color: var(--accent); }
.switch[aria-checked="true"] .knob { transform: translateX(18px); background: var(--accent-ink); }
.acts { display: flex; flex-wrap: wrap; gap: 8px; }
.acts .btn { flex: 1 1 auto; }
</style>
