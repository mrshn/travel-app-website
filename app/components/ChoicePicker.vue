<script setup lang="ts">
import type { ResolvedStop } from '#shared/utils/plan'
import { groupErrorLine } from './GroupNotice.vue'

const props = defineProps<{
  stop: ResolvedStop
  /** Just the choices (Together's Decide): no helper, note or detail lines. */
  compact?: boolean
}>()
const emit = defineEmits<{ choose: [id: string] }>()
const opts = computed(() => props.stop.base.options!)
const chosen = computed(() => props.stop.choice?.id ?? opts.value.default)
// Radios of one stop shown twice (Decide, and the stop sheet over it) stay two groups.
const name = `opt-${props.stop.id}-${useId()}`

// ---------- a group trip (docs/design/2026-10-14-together.md, T5 and 5.4): your pick is your vote ----------
const v = useTripView()
const tg = useTripGroup()
const group = computed(() => tg.isGroup.value)
/** Who voted for each choice. */
const votes = computed(() => (group.value ? tg.votesFor(props.stop.id) : new Map<string, string[]>()))
const votersOf = (id: string) => (votes.value.get(id) ?? []).map(uid => tg.member(uid))
const leading = computed(() => (group.value ? tg.leadingFor(props.stop.id) : null))
/** The group's pick: the option's default in the shared plan. */
const groupPick = computed(() => opts.value.default)
/** Your own pick, when you made one. */
const myPick = computed(() => v.progress.value.choices?.[props.stop.id] ?? null)
const labelOf = (id: string | null) => opts.value.choices.find(c => c.id === id)?.label ?? ''
const differs = computed(() => group.value && !!myPick.value && myPick.value !== groupPick.value && !!labelOf(myPick.value))
/** Editors may make the leading choice the group's pick, when it isn't already. */
const canPick = computed(() => group.value && tg.canEdit.value && !!leading.value && leading.value !== groupPick.value)

function pick(id: string) {
  emit('choose', id)
  if (group.value && tg.myVote(props.stop.id) !== id) {
    tg.vote(props.stop.id, id).catch(e => toast(groupErrorLine(e, 'Your vote didn\'t go through. Try again in a moment.'), { tone: 'warn' }))
  }
}
/**
 * A tap on the choice already showing (the group's pick, say) fires no change: in a group trip it still picks it,
 * and so votes for it.
 */
function again(id: string) {
  if (group.value && id === chosen.value && (myPick.value !== id || tg.myVote(props.stop.id) !== id)) pick(id)
}
function follow() {
  v.unchoose(props.stop.id)
  toast(`You follow the group: ${labelOf(groupPick.value)}`, { tone: 'ok' })
}
function makeGroupPick(id: string) {
  tg.makeGroupPick(props.stop.id, id)
  toast(`${labelOf(id)} is the group pick`, { tone: 'ok' })
}
const count = (n: number) => `${n} ${n === 1 ? 'vote' : 'votes'}`
</script>

<template>
  <fieldset class="choices" :class="{ group }">
    <legend class="label">
      {{ opts.label }}
    </legend>
    <p v-if="opts.helper && !compact" class="helper small">
      <AppIcon name="info" size="sm" />{{ opts.helper }}
    </p>
    <template v-for="c in opts.choices" :key="c.id">
      <label class="choice" :class="{ on: c.id === chosen }">
        <input class="sr-only" type="radio" :name="name" :value="c.id" :checked="c.id === chosen" @change="pick(c.id)" @click="again(c.id)">
        <span class="top">
          <span class="radio" aria-hidden="true" />
          <AppIcon :name="c.icon ?? stopIcon({ icon: undefined, kind: c.kind ?? stop.kind })" size="sm" />
          <b class="grow">{{ c.label }}</b>
          <span v-if="group && c.id === groupPick" class="chip t-gold gpick"><AppIcon name="users" />Group pick</span>
          <span v-if="c.badge" class="chip t-gold">{{ c.badge }}</span>
          <span v-if="c.cost" class="chip num">{{ c.cost }}</span>
        </span>
        <span class="t">{{ c.title }}</span>
        <span v-if="group && votersOf(c.id).length" class="votes">
          <GroupFaces :people="votersOf(c.id)" :max="4" :size="22" label="Voted for it" />
          <span class="small vn tnum">{{ count(votersOf(c.id).length) }}</span>
        </span>
        <ul v-if="c.id === chosen && c.lines?.length && !compact" class="lines">
          <li v-for="(l, i) in c.lines" :key="i">{{ l }}</li>
        </ul>
      </label>
      <div v-if="canPick && c.id === leading" class="lead">
        <span class="small muted">Most votes</span>
        <button class="btn sm gold" type="button" @click="makeGroupPick(c.id)">
          <AppIcon name="check" size="sm" />Make it the group pick
        </button>
      </div>
    </template>
    <div v-if="differs" class="mine">
      <p class="small">
        You picked {{ labelOf(myPick) }}. The group picked {{ labelOf(groupPick) }}.
      </p>
      <button class="btn sm" type="button" @click="follow">
        <AppIcon name="users" size="sm" />Follow the group
      </button>
    </div>
    <p v-if="opts.note && !compact" class="note small muted">
      {{ opts.note }}
    </p>
  </fieldset>
</template>

<style scoped>
.choices { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.choices legend { margin-bottom: 8px; padding: 0; }
.helper { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: var(--gold-soft); color: var(--fg); }
.helper .i { color: var(--gold-ink); margin-top: 1px; }
.choice { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 14px; border: 1.5px solid var(--line); background: var(--surface); cursor: pointer; transition: border-color .15s ease, background .15s ease; }
.choice:hover { border-color: color-mix(in srgb, var(--accent) 50%, var(--line)); }
.choice.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent-soft) 55%, var(--surface)); }
.choice:has(input:focus-visible) { outline: 2.5px solid var(--accent); outline-offset: 2px; }
.top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.top b { font-size: 15px; }
.radio { width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--line); flex: none; display: grid; place-items: center; }
.on .radio { border-color: var(--accent); }
.on .radio::after { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.t { font-size: 14px; color: var(--fg-2); padding-left: 26px; }
.lines { margin: 6px 0 0 26px; padding-left: 16px; display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
.note { padding: 2px 4px; }
/* A group trip: the chips wrap under the label when the row is narrow. */
.group .top { flex-wrap: wrap; row-gap: 4px; }
.votes { display: flex; align-items: center; gap: 8px; padding-left: 26px; margin-top: 2px; }
.votes :deep(.av.ring) { box-shadow: 0 0 0 2px var(--surface); }
.on .votes :deep(.av.ring) { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-soft) 55%, var(--surface)); }
.vn { color: var(--fg-2); font-weight: 650; }
.lead { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 6px 10px; margin: -2px 2px 4px; }
.mine { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); }
.mine p { flex: 1 1 180px; color: var(--fg); font-weight: 550; }
</style>
