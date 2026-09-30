<script setup lang="ts">
import type { InfoBlock } from '#shared/types/trip'

defineProps<{ blocks: InfoBlock[] }>()

/**
 * A paragraph written as a Markdown heading ("### Clubs on your nights", one to four #) is shown as a heading
 * in the app's heading style: h3 under the section (h4 for ####). Anything else is null.
 */
function heading(b: InfoBlock): { tag: 'h3' | 'h4', html: string } | null {
  if (b.t !== 'p') return null
  const m = /^(#{1,4}) +(\S.*)$/.exec(b.text.trim())
  return m ? { tag: m[1]!.length === 4 ? 'h4' : 'h3', html: inlineMd(m[2]!.trim()) } : null
}
</script>

<template>
  <div class="blocks">
    <template v-for="(b, i) in blocks" :key="i">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <component :is="heading(b)!.tag" v-if="heading(b)" class="h3 bh" v-html="heading(b)!.html" />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p v-else-if="b.t === 'p'" class="p" v-html="inlineMd(b.text)" />
      <component :is="b.ordered ? 'ol' : 'ul'" v-else-if="b.t === 'list'" class="list">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <li v-for="(it, j) in b.items" :key="j" v-html="inlineMd(it)" />
      </component>
      <div v-else-if="b.t === 'table'" class="tablewrap">
        <table>
          <thead>
            <tr>
              <th v-for="(h, j) in b.head" :key="j" scope="col">
                {{ h }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, j) in b.rows" :key="j">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <td v-for="(c, k) in r" :key="k" v-html="inlineMd(c)" />
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="b.t === 'callout'" class="callout" :class="b.tone ?? 'gold'">
        <b v-if="b.title">{{ b.title }}</b>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-html="inlineMd(b.text)" />
      </div>
      <div v-else-if="b.t === 'tags'" class="row wrap tags">
        <span v-for="(tg, j) in b.items" :key="j" class="chip long">{{ tg }}</span>
      </div>
      <InfoSpecial v-else-if="b.t === 'special'" :kind="b.kind" />
    </template>
  </div>
</template>

<style scoped>
.blocks { display: flex; flex-direction: column; gap: 12px; font-size: 15px; line-height: 1.55; }
/* A heading sits closer to what it introduces than to what comes before it. */
.bh { margin-top: 8px; line-height: 1.3; }
.list { padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
.list li::marker { color: var(--accent); }
.tablewrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
table { border-collapse: collapse; width: 100%; font-size: 14px; min-width: 420px; }
th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--fg-3); background: var(--surface-2); padding: 8px 12px; font-weight: 700; }
td { padding: 9px 12px; border-top: 1px solid var(--line); vertical-align: top; }
td:first-child { font-weight: 600; }
.blocks :deep(strong) { font-weight: 700; }
.blocks :deep(a) { font-weight: 600; }
.callout { padding: 12px 14px; border-radius: 12px; background: var(--gold-soft); display: flex; flex-direction: column; gap: 4px; border-left: 4px solid var(--gold); }
.callout.accent { background: var(--accent-soft); border-left-color: var(--accent); }
.tags { gap: 6px; }
</style>
