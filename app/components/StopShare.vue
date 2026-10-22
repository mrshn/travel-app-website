<script setup lang="ts">
import type { ResolvedStop } from '#shared/utils/plan'

/**
 * The stop sheet's sharing row (spec 5.6 and 5.10), above "Edit stop": a moment from this stop for your friends (the
 * composer with the stop's place and photos), and a meetup for it (?meetup=new&stop=<id>, over this sheet). Hidden on
 * a device with no account.
 */
const props = defineProps<{ stop: ResolvedStop }>()
const v = useTripView()
const route = useRoute()
const router = useRouter()
const social = useSocial()
const composer = usePostComposer()

const show = computed(() => social.state.value !== 'off')

function shareMoment() {
  const t = v.trip.value
  if (!t) return
  const s = props.stop
  const place = s.place ? { name: s.place.name, lat: s.place.lat, lng: s.place.lng } : { name: s.title }
  composer.open({
    draft: { kind: 'stop', text: '', place, trip: { title: t.title, destination: t.destination, start: t.start, end: t.end } },
    photoIds: [...(v.progress.value.feedback[s.id]?.photos ?? [])],
    context: `From ${s.title}`,
  })
}

function askToJoin() {
  void router.push({ query: { ...route.query, meetup: 'new', stop: props.stop.id } })
}
</script>

<template>
  <div v-if="show" class="ss row wrap">
    <button class="btn sm" type="button" @click="shareMoment">
      <AppIcon name="share" size="sm" />Share a moment
    </button>
    <button class="btn sm" type="button" @click="askToJoin">
      <AppIcon name="hand" size="sm" />Ask people to join
    </button>
  </div>
</template>

<style scoped>
.ss { gap: 8px; }
</style>
