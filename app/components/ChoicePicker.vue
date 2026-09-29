<script setup lang="ts">
import type { ResolvedStop } from '#shared/utils/plan'

const props = defineProps<{ stop: ResolvedStop }>()
const emit = defineEmits<{ choose: [id: string] }>()
const opts = computed(() => props.stop.base.options!)
const chosen = computed(() => props.stop.choice?.id ?? opts.value.default)
</script>

<template>
  <fieldset class="choices">
    <legend class="label">
      {{ opts.label }}
    </legend>
    <p v-if="opts.helper" class="helper small">
      <AppIcon name="info" size="sm" />{{ opts.helper }}
    </p>
    <label v-for="c in opts.choices" :key="c.id" class="choice" :class="{ on: c.id === chosen }">
      <input class="sr-only" type="radio" :name="`opt-${stop.id}`" :value="c.id" :checked="c.id === chosen" @change="emit('choose', c.id)">
      <span class="top">
        <span class="radio" aria-hidden="true" />
        <AppIcon :name="c.icon ?? stopIcon({ icon: undefined, kind: c.kind ?? stop.kind })" size="sm" />
        <b class="grow">{{ c.label }}</b>
        <span v-if="c.badge" class="chip t-gold">{{ c.badge }}</span>
        <span v-if="c.cost" class="chip num">{{ c.cost }}</span>
      </span>
      <span class="t">{{ c.title }}</span>
      <ul v-if="c.id === chosen && c.lines?.length" class="lines">
        <li v-for="(l, i) in c.lines" :key="i">{{ l }}</li>
      </ul>
    </label>
    <p v-if="opts.note" class="note small muted">
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
</style>
