<script setup lang="ts">
const v = useTripView()
const trip = v.trip
const item = ref('')
const s = computed(() => v.summary.value?.packing ?? { total: 0, done: 0 })

const isPacked = (x: string) => !!v.progress.value.packing[x]
/** What is still to pack comes first, in the list's order; what is packed goes under the divider. */
const toPack = computed(() => (trip.value?.packing ?? []).filter(x => !isPacked(x)))
const packed = computed(() => (trip.value?.packing ?? []).filter(isPacked))

const root = ref<HTMLElement | null>(null)
const allPacked = ref<HTMLElement | null>(null)
const boxOf = (x: string) => [...root.value?.querySelectorAll<HTMLInputElement>('input[data-pack]') ?? []].find(el => el.dataset.pack === x)

async function tick(x: string, e: Event) {
  const list = trip.value?.packing ?? []
  const was = isPacked(x)
  // A ticked item moves to the other list, where its box is made anew. When the box had focus (a keyboard or a
  // screen reader), focus stays in the list you are going through: on the item that took its place, else the
  // last one; with that list empty, on "All packed" or on the item where it went.
  const hadFocus = typeof document !== 'undefined' && document.activeElement === e.target
  const at = (was ? packed.value : toPack.value).indexOf(x)
  v.togglePacking(x)
  if (!was && list.length && list.every(isPacked)) toast('All packed. Buon viaggio!', { tone: 'ok' })
  if (!hadFocus) return
  await nextTick()
  const rest = was ? packed.value : toPack.value
  const next = rest.length ? rest[Math.min(Math.max(at, 0), rest.length - 1)] : undefined
  const target = next !== undefined ? boxOf(next) : (!was && allPacked.value) || boxOf(x)
  target?.focus({ preventScroll: true })
}
/** The next item slides into a ticked one's place: the second tap of a double tap leaves it as it is. */
const tapOk = tapGuard()
function guard(e: MouseEvent) {
  if (!tapOk(e)) e.preventDefault()
}

function add() {
  const t = item.value.trim()
  const tr = trip.value
  if (!t || !tr) return
  if (tr.packing.includes(t)) {
    toast('Already on the list')
    return
  }
  v.trips.update(tr.id, (x) => {
    x.packing.push(t)
  })
  item.value = ''
}
function remove(x: string) {
  const tr = trip.value
  if (!tr) return
  v.trips.update(tr.id, (t) => {
    t.packing = t.packing.filter(p => p !== x)
  })
  v.togglePacking(x, false)
}
function unpackAll() {
  if (!confirm('Untick everything on the list?')) return
  for (const x of trip.value?.packing ?? []) v.togglePacking(x, false)
}
const editing = ref(false)
</script>

<template>
  <div v-if="trip" ref="root" class="page packing">
    <header class="head">
      <div class="grow">
        <p class="kicker">
          Before you go
        </p>
        <h1 class="h2">
          Packing
        </h1>
        <p class="small muted">
          {{ s.done }} of {{ s.total }} packed
        </p>
      </div>
      <ProgressRing :size="64" :stroke="8" :total="s.total" :segments="[{ value: s.done, color: 'var(--gold)' }]">
        <AppIcon name="bag" />
      </ProgressRing>
    </header>
    <div class="bar thick gbar">
      <i class="gold" :style="{ width: s.total ? `${(s.done / s.total) * 100}%` : '0%' }" />
    </div>

    <ul v-if="toPack.length" class="card list" aria-label="To pack">
      <li v-for="x in toPack" :key="x" class="pk">
        <label class="lbl">
          <input type="checkbox" class="check" :checked="false" :data-pack="x" @click="guard" @change="tick(x, $event)">
          <span class="grow">{{ x }}</span>
        </label>
        <button v-if="editing" class="btn icon xs plain rm" type="button" :aria-label="`Remove ${x}`" @click="remove(x)">
          <AppIcon name="trash" size="xs" />
        </button>
      </li>
    </ul>
    <p v-else-if="packed.length" ref="allPacked" class="card pad all" tabindex="-1">
      <AppIcon name="check" />All packed. Buon viaggio!
    </p>

    <template v-if="packed.length">
      <h2 class="pk-div">
        Packed · {{ packed.length }}
      </h2>
      <ul class="card list done" aria-label="Packed">
        <li v-for="x in packed" :key="x" class="pk on">
          <label class="lbl">
            <input type="checkbox" class="check" :checked="true" :data-pack="x" @click="guard" @change="tick(x, $event)">
            <span class="grow">{{ x }}</span>
          </label>
          <button v-if="editing" class="btn icon xs plain rm" type="button" :aria-label="`Remove ${x}`" @click="remove(x)">
            <AppIcon name="trash" size="xs" />
          </button>
        </li>
      </ul>
    </template>

    <form class="row add" @submit.prevent="add">
      <input v-model="item" class="input grow" placeholder="Add something to pack" aria-label="New packing item">
      <button class="btn primary" type="submit" :disabled="!item.trim()">
        <AppIcon name="plus" size="sm" />Add
      </button>
    </form>
    <div class="row wrap tools">
      <button class="btn sm ghost" type="button" @click="editing = !editing">
        <AppIcon :name="editing ? 'check' : 'edit'" size="sm" />{{ editing ? 'Done editing' : 'Edit list' }}
      </button>
      <button class="btn sm plain" type="button" @click="unpackAll">
        <AppIcon name="refresh" size="sm" />Untick all
      </button>
    </div>
  </div>
</template>

<style scoped>
.packing { padding-top: 18px; max-width: 760px; }
.head { display: flex; align-items: center; gap: 12px; }
.gbar { margin: 14px 0 16px; }
.list { list-style: none; overflow: hidden; }
.list li + li { border-top: 1px solid var(--line); }
.pk { display: flex; align-items: center; min-width: 0; }
/* The whole row is the tap target (at least 48 px tall). */
.lbl { flex: 1 1 auto; min-width: 0; min-height: 48px; display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer; }
.rm { margin-right: 10px; flex: none; }
.pk.on .lbl > span { color: var(--fg-3); text-decoration: line-through; }
.all { display: flex; align-items: center; gap: 10px; font-weight: 650; color: var(--ok); }
.pk-div { display: flex; align-items: center; gap: 10px; margin: 20px 2px 10px; font-size: 13px; font-weight: 650; letter-spacing: .02em; color: var(--fg-2); }
.pk-div::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.add { margin-top: 14px; }
.tools { margin-top: 12px; }
</style>
