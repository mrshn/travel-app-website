<script lang="ts">
import type { Meetup } from '#shared/types/social'
import { socialMeetupWhen, socialZonedIso } from '#shared/utils/social'
import { fmtClock, parseClock } from '#shared/utils/time'

/** A meetup as its form holds it: the day and time as typed (in the meetup's own time zone). */
export interface MeetFormValue {
  title: string
  note: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM */
  time: string
  place: Meetup['place']
}

/** At most this many characters (the rules' limits). */
export const MEET_TITLE_MAX = 80
export const MEET_NOTE_MAX = 280

/** What keeps the form from being sent, in words, or '' when it can go. */
export function meetFormProblem(v: MeetFormValue): string {
  if (!v.title.trim()) return 'Give it a title.'
  if (v.title.trim().length > MEET_TITLE_MAX) return `The title can be at most ${MEET_TITLE_MAX} characters.`
  if (v.note.length > MEET_NOTE_MAX) return `The note can be at most ${MEET_NOTE_MAX} characters.`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return 'Pick a day.'
  if (parseClock(v.time) === null) return 'Pick a time.'
  return ''
}

/** When the form says, as an ISO time with its offset in `timeZone` ("2026-10-09T21:30:00+02:00"). */
export function meetFormStart(v: MeetFormValue, timeZone: string): string {
  return socialZonedIso(v.date, parseClock(v.time) ?? 0, timeZone)
}

/** A meetup's fields as the form shows them. */
export function meetFormFrom(m: Pick<Meetup, 'title' | 'note' | 'start' | 'timezone' | 'place'>): MeetFormValue {
  const w = socialMeetupWhen(m)
  return { title: m.title, note: m.note, date: w.date, time: w.date ? fmtClock(w.minutes) : '', place: m.place ? { ...m.place } : null }
}
</script>

<script setup lang="ts">
/**
 * The fields of a meetup (spec 5.10): a title, a note, the day and the time, and the place it came with (a stop's),
 * which can be taken off. Used by the meetup sheet (new and yours) and by the meetup page's own edit.
 */
const props = withDefaults(defineProps<{ uid: string, notePlaceholder?: string, timeZone?: string }>(), { notePlaceholder: 'Anyone for…?', timeZone: '' })
const model = defineModel<MeetFormValue>({ required: true })

const zoneCity = computed(() => (props.timeZone.split('/').pop() ?? '').replace(/_/g, ' '))
</script>

<template>
  <div class="mf">
    <label class="field">
      <span>Title</span>
      <input :id="`${uid}-title`" v-model="model.title" class="input" type="text" :maxlength="MEET_TITLE_MAX" autocomplete="off" required>
    </label>
    <label class="field">
      <span>Note <span class="hint tnum">{{ model.note.length }}/{{ MEET_NOTE_MAX }}</span></span>
      <textarea :id="`${uid}-note`" v-model="model.note" class="textarea" rows="3" :maxlength="MEET_NOTE_MAX" :placeholder="notePlaceholder" />
    </label>
    <div class="when">
      <label class="field">
        <span>Day</span>
        <input :id="`${uid}-date`" v-model="model.date" class="input" type="date" required>
      </label>
      <label class="field">
        <span>{{ zoneCity ? 'Time ' : 'Time' }}<span v-if="zoneCity" class="hint">({{ zoneCity }})</span></span>
        <input :id="`${uid}-time`" v-model="model.time" class="input" type="time" required>
      </label>
    </div>
    <div class="field">
      <span>Place</span>
      <div v-if="model.place" class="place">
        <AppIcon name="pin" size="sm" class="pin" />
        <span class="grow pn">{{ model.place.name }}</span>
        <button class="btn icon sm plain round" type="button" :aria-label="`Take off the place: ${model.place.name}`" @click="model.place = null">
          <AppIcon name="x" size="sm" />
        </button>
      </div>
      <p v-else class="small muted noplace">
        No place: say where in the note.
      </p>
    </div>
  </div>
</template>

<style scoped>
.mf { display: flex; flex-direction: column; gap: 14px; }
.when { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
@media (max-width: 340px) { .when { grid-template-columns: minmax(0, 1fr); } }
.when .input { min-width: 0; }
.place { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 2px 4px 2px 12px; border-radius: var(--r-md); border: 1px solid var(--line); background: var(--surface); }
.pin { color: var(--accent); flex: none; }
.pn { font-weight: 600; overflow-wrap: anywhere; line-height: 1.3; }
.noplace { min-height: 24px; }
</style>
