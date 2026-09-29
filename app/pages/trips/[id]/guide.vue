<script setup lang="ts">
const v = useTripView()
const route = useRoute()
const router = useRouter()
const trip = v.trip
const openId = computed(() => (typeof route.query.s === 'string' ? route.query.s : null))

function toggle(id: string) {
  router.replace({ query: { ...route.query, s: openId.value === id ? undefined : id } })
}
watch(openId, async (id) => {
  if (!id) return
  await nextTick()
  document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
</script>

<template>
  <div v-if="trip" class="page guide">
    <p class="kicker">
      Know before you go
    </p>
    <h1 class="h2">
      Guide
    </h1>

    <div v-if="!trip.info?.length" class="card empty">
      <AppIcon name="book" />
      <h3>No guide for this trip</h3>
    </div>

    <nav v-else class="hscroll toc" aria-label="Guide sections">
      <button v-for="sec in trip.info" :key="sec.id" type="button" class="chip" :aria-pressed="openId === sec.id" @click="toggle(sec.id)">
        <AppIcon :name="sec.icon" />{{ sec.title }}
      </button>
    </nav>

    <div class="secs">
      <section v-for="sec in trip.info" :id="`sec-${sec.id}`" :key="sec.id" class="card sec" :class="{ open: openId === sec.id }">
        <button type="button" class="sh" :aria-expanded="openId === sec.id" @click="toggle(sec.id)">
          <span class="ic"><AppIcon :name="sec.icon" /></span>
          <span class="grow">
            <b>{{ sec.title }}</b>
            <span v-if="sec.subtitle" class="small muted">{{ sec.subtitle }}</span>
          </span>
          <AppIcon name="chev" class="chev" />
        </button>
        <div v-if="openId === sec.id" class="sb">
          <InfoBlocks :blocks="sec.blocks" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.guide { padding-top: 18px; max-width: 860px; }
.toc { margin: 14px -16px 12px; }
.toc .chip { min-height: 34px; background: var(--surface); border-color: var(--line); color: var(--fg); }
.secs { display: flex; flex-direction: column; gap: 10px; }
.sec { overflow: hidden; scroll-margin-top: calc(var(--top-h) + 16px); }
.sh { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; border: 0; background: none; text-align: left; color: var(--fg); }
.sh .grow { display: flex; flex-direction: column; gap: 1px; }
.sh b { font-size: 16px; }
.ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); flex: none; }
.chev { color: var(--fg-3); transition: transform .2s ease; }
.open .chev { transform: rotate(180deg); }
.sb { padding: 2px 16px 18px; }
@media (min-width: 900px) { .toc { margin: 14px -24px 12px; } }
</style>
