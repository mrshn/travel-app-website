<script setup lang="ts">
import type { LinkRef } from '#shared/types/trip'

/**
 * A claim's links (spec 5.13): the airline's claim form, the email thread, the enforcement body's page. Each change
 * hands the claim sheet a new list; the sheet saves it.
 */
const links = defineModel<LinkRef[]>({ required: true })

const label = ref('')
const url = ref('')
const bad = ref(false)

/** A web address as typed ("wizzair.com/claims" works too), or null. */
function webUrl(text: string): string | null {
  const t = text.trim()
  if (!t || /\s/.test(t)) return null
  try {
    const u = new URL(/^[a-z][a-z\d+.-]*:/i.test(t) ? t : `https://${t}`)
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') ? u.href : null
  }
  catch {
    return null
  }
}

function add() {
  const href = webUrl(url.value)
  bad.value = !href
  if (!href) return
  links.value = [...links.value, { label: label.value.trim().slice(0, 80) || new URL(href).hostname.replace(/^www\./, ''), url: href }]
  label.value = ''
  url.value = ''
}

function remove(i: number) {
  const gone = links.value[i]
  if (!gone) return
  links.value = links.value.filter((_, j) => j !== i)
  toast(`Removed: ${gone.label}`, {
    actions: [{
      label: 'Undo',
      run: () => {
        const list = [...links.value]
        list.splice(Math.min(i, list.length), 0, gone)
        links.value = list
      },
    }],
  })
}
</script>

<template>
  <div class="links">
    <ul v-if="links.length" class="list">
      <li v-for="(l, i) in links" :key="`${i}:${l.url}`" class="lk">
        <a :href="l.url" target="_blank" rel="noopener" class="lk-a">
          <AppIcon name="ext" size="sm" /><span class="grow">{{ l.label }}</span>
        </a>
        <button class="btn icon sm plain" type="button" :aria-label="`Remove link: ${l.label}`" @click="remove(i)">
          <AppIcon name="x" size="sm" />
        </button>
      </li>
    </ul>
    <form class="new" @submit.prevent="add">
      <input v-model="label" class="input" type="text" maxlength="80" placeholder="Name (optional)" aria-label="Link name">
      <div class="row-in">
        <input v-model="url" class="input" type="url" inputmode="url" autocomplete="off" placeholder="Web address" aria-label="Web address" @input="bad = false">
        <button class="btn" type="submit">
          Add
        </button>
      </div>
      <p v-if="bad" class="small bad" role="alert">
        That doesn't look like a web address.
      </p>
    </form>
  </div>
</template>

<style scoped>
.links { display: flex; flex-direction: column; gap: 10px; }
.list { list-style: none; display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
.lk { display: flex; align-items: center; gap: 4px; padding-right: 4px; }
.lk + .lk { border-top: 1px solid var(--line); }
.lk-a { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 8px 12px; color: var(--fg); text-decoration: none; font-weight: 600; overflow-wrap: anywhere; }
.lk-a .i { color: var(--accent); flex: none; }
.lk-a:focus-visible { outline-offset: -3px; }
.lk .btn { flex: none; }
.new { display: flex; flex-direction: column; gap: 8px; }
.row-in { display: flex; gap: 8px; }
.row-in .input { flex: 1 1 auto; min-width: 0; }
.row-in .btn { flex: none; }
.bad { color: var(--bad); font-weight: 600; }
</style>
