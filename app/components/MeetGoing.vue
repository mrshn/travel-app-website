<script setup lang="ts">
import type { MeetupGoing } from '#shared/types/social'
import type { Unsub } from '~/lib/social/api'

/**
 * Who's going to a meetup (spec 5.10), live while it's on screen: signed in only (the rules keep it from anyone else).
 * `list`: a heading and each person; `faces`: a few faces and a count, for a row. `change` gives the list as it moves.
 */
const props = withDefaults(defineProps<{ id: string, variant?: 'list' | 'faces', heading?: string, level?: 'h2' | 'h3' }>(), { variant: 'list', heading: 'Who\'s going', level: 'h3' })
const emit = defineEmits<{ change: [list: MeetupGoing[]] }>()

const social = useSocial()
const list = ref<MeetupGoing[]>([])
const loaded = ref(false)
const failed = ref(false)
let unsub: Unsub | null = null

function start() {
  unsub?.()
  unsub = null
  failed.value = false
  loaded.value = false
  list.value = []
  emit('change', [])
  if (!social.ready.value || !props.id) return
  try {
    unsub = social.api().watchGoing(props.id, (l) => {
      list.value = l
      loaded.value = true
      emit('change', l)
    }, () => {
      failed.value = true
    })
  }
  catch {
    failed.value = true
  }
}
watch([() => props.id, () => social.ready.value], start, { immediate: true })
onBeforeUnmount(() => unsub?.())

const count = computed(() => list.value.length)
</script>

<template>
  <span v-if="variant === 'faces'" class="faces">
    <AvatarStack v-if="count" :people="list" :size="24" label="Going" />
    <span class="small muted tnum">{{ !social.ready.value ? '' : count ? `${count} going` : loaded ? 'Nobody yet' : '' }}</span>
  </span>
  <section v-else class="going" :aria-label="heading">
    <component :is="level" class="label gh">
      {{ heading }}<span v-if="count" class="tnum"> ({{ count }})</span>
    </component>
    <p v-if="failed" class="small muted">
      Couldn't load who's going right now.
    </p>
    <p v-else-if="!social.ready.value" class="small muted">
      Sign in to see who's going.
    </p>
    <p v-else-if="loaded && !count" class="small muted">
      Nobody's in yet. Share the link and see who joins.
    </p>
    <ul v-else-if="count" class="people">
      <li v-for="p in list" :key="p.uid" class="person">
        <Avatar :person="p" :size="32" />
        <span class="ellipsis">{{ p.name }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.faces { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.going { display: flex; flex-direction: column; gap: 8px; }
.gh { margin: 0; }
.people { list-style: none; display: flex; flex-wrap: wrap; gap: 8px 16px; }
.person { display: flex; align-items: center; gap: 8px; min-width: 0; max-width: 100%; font-weight: 600; font-size: 14.5px; }
</style>
