<script setup lang="ts">
import type { MetPerson } from '#shared/types/trip'
import { uid } from '#shared/utils/plan'
import { socialPath } from '#shared/utils/social'
import { meetErrorLine } from './MeetState.vue'

/**
 * Someone you met (spec 5.9 and T13), open while the URL has ?met=new or ?met=<id>. Mounted once by the trip shell.
 * Kept in the trip's progress (private, synced): a name, a handle, how to reach them, where and which day, a note.
 * "Send my friend link" shares your link to add you in Travels.
 */
const v = useTripView()
const sheet = useQueryState('met')
const social = useSocial()

const isNew = computed(() => sheet.value.value === 'new')
const person = computed<MetPerson | null>(() => {
  const id = sheet.value.value
  if (!id || id === 'new') return null
  const p = v.progress.value.people?.[id]
  return p && !p.deleted ? p : null
})
const show = computed(() => !!v.trip.value && (isNew.value || !!person.value))

interface Form { name: string, handle: string, contact: string, where: string, dayId: string, note: string }
const form = reactive<Form>({ name: '', handle: '', contact: '', where: '', dayId: '', note: '' })
const tried = ref(false)

/** The stop on now (the plan's guess of where you are), during the trip: the latest one whose slot holds now. */
function stopOnNow(): string {
  const today = v.today.value
  const m = v.moment.value
  if (!today || !m) return ''
  let hit = ''
  for (const s of today.stops) {
    if (s.start <= m.minutes && m.minutes < s.endMin && !s.minor) hit = s.title
  }
  return hit
}

// A fresh form for every opening (and for another person).
watch(() => [show.value, sheet.value.value] as const, ([open]) => {
  if (!open) return
  tried.value = false
  const p = person.value
  if (p) {
    Object.assign(form, { name: p.name, handle: p.handle ?? '', contact: p.contact ?? '', where: p.where ?? '', dayId: p.dayId ?? '', note: p.note ?? '' })
    return
  }
  Object.assign(form, { name: '', handle: '', contact: '', where: stopOnNow(), dayId: v.today.value?.view.day.id ?? '', note: '' })
}, { immediate: true })

const days = computed(() => (v.trip.value?.days ?? []).map(d => ({ id: d.id, label: `${fmtDate(d.date, 'short')} · ${d.label}` })))
const nameMissing = computed(() => !form.name.trim())

function save() {
  tried.value = true
  if (nameMissing.value) return
  const p = person.value
  const clean = (s: string) => s.trim() || undefined
  const saved = v.savePerson({
    id: p?.id ?? uid('met'),
    name: form.name.trim().slice(0, 80),
    handle: clean(form.handle),
    contact: clean(form.contact),
    where: clean(form.where),
    dayId: v.trip.value?.days.some(d => d.id === form.dayId) ? form.dayId : undefined,
    note: clean(form.note),
    friendUid: p?.friendUid,
    at: p?.at,
  })
  toast(p ? `Saved ${saved.name}` : `Added ${saved.name}`, { tone: 'ok' })
  sheet.close()
}

function remove() {
  const p = person.value
  if (!p) return
  const before = v.removePerson(p.id)
  sheet.close()
  if (!before) return
  toast(`Deleted ${before.name}`, {
    actions: [{ label: 'Undo', run: () => v.savePerson(before) }],
  })
}

// ---------- your friend link ----------
const sending = ref(false)
async function sendLink() {
  if (sending.value) return
  sending.value = true
  try {
    const token = await social.friendLinkToken()
    const r = await shareLink({ title: 'Travels', text: 'Add me on Travels:', url: social.link(socialPath('friend', token)) })
    if (r === 'copied') toast('Your friend link is copied', { tone: 'ok' })
    else if (r === 'failed') toast('Couldn\'t share the link. Try again.', { tone: 'warn' })
  }
  catch (e) {
    toast(meetErrorLine(e, 'Couldn\'t get your friend link.'), { tone: 'warn' })
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <BottomSheet :open="show" :title="isNew ? 'Someone you met' : (person?.name ?? 'Someone you met')" @close="sheet.close()">
    <form v-if="show" class="met" novalidate @submit.prevent="save">
      <div class="field">
        <label for="met-name" class="label">Name</label>
        <input id="met-name" v-model="form.name" class="input" type="text" maxlength="80" autocomplete="off" required :aria-invalid="tried && nameMissing ? 'true' : undefined" :aria-describedby="tried && nameMissing ? 'met-name-err' : undefined">
        <p v-if="tried && nameMissing" id="met-name-err" class="err" role="alert">
          Add their name.
        </p>
      </div>
      <label class="field">
        <span>Instagram or another handle</span>
        <input v-model="form.handle" class="input" type="text" maxlength="60" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="@ana.travels">
      </label>
      <label class="field">
        <span>How to reach them</span>
        <input v-model="form.contact" class="input" type="text" maxlength="120" autocomplete="off" placeholder="A phone number, or where to find them">
      </label>
      <div class="two">
        <label class="field">
          <span>Where you met</span>
          <input v-model="form.where" class="input" type="text" maxlength="80" autocomplete="off" placeholder="Hostel bar">
        </label>
        <div class="field">
          <label for="met-day" class="label">Day</label>
          <select id="met-day" v-model="form.dayId" class="select">
            <option value="">Not on a trip day</option>
            <option v-for="d in days" :key="d.id" :value="d.id">{{ d.label }}</option>
          </select>
        </div>
      </div>
      <label class="field">
        <span>Note</span>
        <textarea v-model="form.note" class="textarea" rows="3" maxlength="1000" placeholder="Met at breakfast, into techno, back home in Lisbon" />
      </label>

      <section class="link" aria-labelledby="met-link-h">
        <h3 id="met-link-h" class="label">
          Stay in touch
        </h3>
        <p class="small muted">
          Your friend link adds you as a friend in Travels: send it in any chat, or show it on your phone.
        </p>
        <MeetState what="your friend link" />
        <div v-if="social.ready.value">
          <button class="btn sm" type="button" :disabled="sending" @click="sendLink">
            <AppIcon name="send" size="sm" />Send my friend link
          </button>
        </div>
      </section>
    </form>
    <template #footer>
      <button v-if="person" class="btn danger" type="button" @click="remove">
        <AppIcon name="trash" size="sm" />Delete
      </button>
      <span class="grow" />
      <button class="btn primary" type="button" @click="save">
        <AppIcon name="check" size="sm" />Save
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.met { display: flex; flex-direction: column; gap: 14px; padding: 6px 16px 8px; }
.two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
@media (max-width: 420px) { .two { grid-template-columns: minmax(0, 1fr); } }
.err { font-size: 13px; font-weight: 650; color: var(--bad); }
.link { display: flex; flex-direction: column; gap: 8px; padding-top: 14px; border-top: 1px solid var(--line); }
.link .label { margin: 0; }
</style>
