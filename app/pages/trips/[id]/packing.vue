<script setup lang="ts">
const v = useTripView()
const trip = v.trip
const item = ref('')
const s = computed(() => v.summary.value?.packing ?? { total: 0, done: 0 })

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
  <div v-if="trip" class="page packing">
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

    <ul class="card list">
      <li v-for="x in trip.packing" :key="x" class="row-item" :class="{ on: v.progress.value.packing[x] }">
        <label class="grow row lbl">
          <input type="checkbox" class="check" :checked="!!v.progress.value.packing[x]" @change="v.togglePacking(x)">
          <span class="grow">{{ x }}</span>
        </label>
        <button v-if="editing" class="btn icon xs plain" type="button" :aria-label="`Remove ${x}`" @click="remove(x)">
          <AppIcon name="trash" size="xs" />
        </button>
      </li>
    </ul>

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
.lbl { cursor: pointer; gap: 12px; }
.row-item.on .grow span, .row-item.on .lbl > span { color: var(--fg-3); text-decoration: line-through; }
.add { margin-top: 14px; }
.tools { margin-top: 12px; }
</style>
