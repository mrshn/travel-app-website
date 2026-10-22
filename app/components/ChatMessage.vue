<script setup lang="ts">
import type { Message } from '#shared/types/social'
import { directionsUrl } from '#shared/utils/geo'
import { socialFirstName } from '#shared/utils/social'
import { fmtClock, zoned } from '#shared/utils/time'

/**
 * One line of a group trip's chat (docs/design/2026-10-14-together.md, 5.1): yours on the right, others' on the left
 * with their face and first name; what the plan or a status says, centred and small; a stop as a card that opens
 * it, a place as a card with Open in Maps, a photo across the column.
 */
const props = defineProps<{
  m: Message
  mine: boolean
  /** The first of a run of messages by one person: their face and name show. */
  first: boolean
  /** The trip's time zone, for the time under it. */
  tz: string
}>()
const emit = defineEmits<{ photo: [m: Message] }>()

const v = useTripView()
const stopSheet = useQueryState('stop')
const who = computed(() => ({ uid: props.m.author, name: props.m.name, photo: props.m.photo }))
const firstName = computed(() => socialFirstName(props.m.name))
const time = computed(() => {
  try {
    return fmtClock(zoned(new Date(props.m.at), props.tz).minutes)
  }
  catch {
    return ''
  }
})
const centred = computed(() => props.m.kind === 'system' || props.m.kind === 'status')
/** A stop card opens the stop while the plan still has it. */
const known = computed(() => (props.m.kind === 'stop' && props.m.stopId ? !!v.locate(props.m.stopId) : false))
const mapsUrl = computed(() => (props.m.place ? directionsUrl(props.m.place, 'walking') : ''))
</script>

<template>
  <li v-if="centred" class="cm line" :class="`k-${m.kind}`">
    <span class="line-t"><AppIcon v-if="m.kind === 'status'" name="pin" size="xs" />{{ m.text }}</span>
    <span class="tm num">{{ time }}</span>
  </li>
  <li v-else class="cm" :class="[mine ? 'mine' : 'theirs', { first }]">
    <span v-if="!mine" class="face">
      <Avatar v-if="first" :person="who" :size="30" />
    </span>
    <div class="col">
      <span v-if="!mine && first" class="who">{{ firstName }}</span>
      <span class="sr-only">{{ mine ? 'You' : m.name }}:</span>

      <p v-if="m.kind === 'text'" class="bubble">
        {{ m.text }}
      </p>

      <template v-else-if="m.kind === 'photo'">
        <button v-if="m.image" class="photo" type="button" :aria-label="mine ? 'Your photo: view it' : `Photo from ${firstName}: view it`" @click="emit('photo', m)">
          <img :src="m.image" alt="" loading="lazy">
        </button>
        <p v-if="m.text" class="bubble">
          {{ m.text }}
        </p>
      </template>

      <template v-else-if="m.kind === 'stop'">
        <button v-if="known" class="card flat attach stopcard" type="button" @click="stopSheet.open(m.stopId!)">
          <span class="a-ic" aria-hidden="true"><AppIcon name="calendar" size="sm" /></span>
          <span class="a-t">
            <b>{{ m.stopTitle || 'A stop' }}</b>
            <span v-if="m.stopWhen" class="small muted tnum">{{ m.stopWhen }}</span>
          </span>
          <AppIcon name="chevr" size="sm" class="a-go" />
        </button>
        <div v-else class="card flat attach stopcard gone">
          <span class="a-ic" aria-hidden="true"><AppIcon name="calendar" size="sm" /></span>
          <span class="a-t">
            <b>{{ m.stopTitle || 'A stop' }}</b>
            <span class="small muted">Not in the plan any more</span>
          </span>
        </div>
        <p v-if="m.text" class="bubble">
          {{ m.text }}
        </p>
      </template>

      <div v-else-if="m.kind === 'location' && m.place" class="card flat attach loccard">
        <span class="a-ic" aria-hidden="true"><AppIcon name="pin" size="sm" /></span>
        <span class="a-t">
          <b>{{ mine ? 'Where you were' : `Where ${firstName} was` }}</b>
          <span class="small muted tnum">{{ m.place.name || (m.place.acc ? `Within about ${Math.round(m.place.acc)} m` : 'A pin on the map') }}</span>
        </span>
        <a class="btn sm" :href="mapsUrl" target="_blank" rel="noopener">
          <AppIcon name="navigate" size="sm" />Open in Maps
        </a>
      </div>

      <p v-else class="bubble">
        {{ m.text }}
      </p>
      <span class="tm num">{{ time }}</span>
    </div>
  </li>
</template>

<style scoped>
.cm { list-style: none; display: flex; align-items: flex-end; gap: 8px; min-width: 0; }
.cm.first { margin-top: 8px; }
.mine { justify-content: flex-end; }
.face { flex: none; width: 30px; align-self: flex-start; margin-top: 20px; }
.col { display: flex; flex-direction: column; gap: 4px; min-width: 0; max-width: min(82%, 520px); }
.mine .col { align-items: flex-end; }
.theirs .col { align-items: flex-start; }
.who { font-size: 12.5px; font-weight: 650; color: var(--fg-2); padding: 0 4px; }
.bubble { padding: 9px 13px; border-radius: 18px; font-size: 15px; line-height: 1.4; overflow-wrap: anywhere; white-space: pre-wrap; }
.theirs .bubble { background: var(--surface); border: 1px solid var(--line); border-bottom-left-radius: 6px; color: var(--fg); }
.mine .bubble { background: var(--accent-soft); color: var(--fg); border-bottom-right-radius: 6px; }
.tm { font-size: 11.5px; color: var(--fg-3); padding: 0 4px; }

/* Photos take the whole column. */
.photo { display: block; width: 100%; min-width: min(240px, 100%); padding: 0; border: 0; border-radius: 16px; overflow: hidden; background: var(--surface-2); }
.photo img { display: block; width: 100%; height: auto; max-height: 420px; object-fit: cover; }
.mine .col:has(.photo), .theirs .col:has(.photo) { width: min(82%, 520px); }

.attach { display: flex; align-items: center; gap: 10px; width: 100%; min-width: min(240px, 100%); min-height: 56px; padding: 8px 10px 8px 8px; background: var(--surface); color: var(--fg); text-align: left; font: inherit; border-radius: 14px; }
.attach.loccard { flex-wrap: wrap; }
button.attach:hover { background: var(--surface-2); }
.a-ic { width: 36px; height: 36px; flex: none; display: grid; place-items: center; border-radius: 10px; background: var(--accent-soft); color: var(--accent); }
.a-t { flex: 1 1 120px; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.a-t b { font-size: 14.5px; overflow-wrap: anywhere; }
.a-go { flex: none; color: var(--fg-3); }
.gone { border-style: dashed; }
.loccard .btn { margin-left: auto; }

/* What the plan or a status says: centred and small. */
.line { flex-direction: column; align-items: center; gap: 2px; margin: 8px 0; text-align: center; }
.line-t { display: inline-flex; align-items: center; gap: 5px; max-width: 92%; padding: 4px 12px; border-radius: 999px; background: var(--surface-2); color: var(--fg-2); font-size: 13px; font-weight: 550; line-height: 1.35; overflow-wrap: anywhere; }
.line-t .i { flex: none; color: var(--accent); }
.line .tm { font-size: 11px; }
</style>
