<script setup lang="ts">
import { socialCardTrips } from '#shared/utils/social'
import { friendsError, useFriendsState } from './FriendsNotice.vue'
import { rangeTo } from './FriendRow.vue'

/**
 * "Let friends see where I'm going" (spec 5.5, T10): off until you turn it on; then friends see the place and dates of
 * your trips, nothing else (your card follows your trips by itself while it's on).
 */
const social = useSocial()
const state = useFriendsState()
const trips = useTrips()
const { real } = useClock()
const on = computed(() => !!social.myCard.value?.showTrips)
const busy = ref(false)
const labelId = useId()
const descId = useId()

/** What friends see, or would see. */
const seen = computed(() => socialCardTrips(trips.trips.value, real.value.toISOString().slice(0, 10)))

async function toggle() {
  if (busy.value) return
  const next = !on.value
  busy.value = true
  try {
    await social.setShowTrips(next)
    toast(next ? 'Friends can see where you’re going' : 'Friends no longer see your trips', { tone: 'ok' })
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t change that right now.'), { tone: 'warn' })
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="card pad ptrips">
    <div class="srow">
      <span class="grow stx">
        <b :id="labelId">Let friends see where I’m going</b>
        <span :id="descId" class="small muted">Friends see the places and dates of your trips, nothing else. Off until you turn it on.</span>
      </span>
      <button
        class="switch"
        type="button"
        role="switch"
        :aria-checked="on"
        :aria-labelledby="labelId"
        :aria-describedby="descId"
        :disabled="busy || state !== 'ready'"
        @click="toggle"
      >
        <span class="track" aria-hidden="true"><span class="knob" /></span>
      </button>
    </div>
    <div v-if="on" class="seen">
      <p class="small strong">
        {{ seen.length ? 'Friends see:' : 'No trips to show yet: friends see your next one when you add it.' }}
      </p>
      <ul v-if="seen.length" class="trips">
        <li v-for="t in seen" :key="`${t.destination}-${t.start}`" class="small">
          <AppIcon name="plane" size="sm" /><span><b>{{ t.destination }}</b> · {{ rangeTo(t.start, t.end) }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.ptrips { display: flex; flex-direction: column; gap: 12px; }
.srow { display: flex; align-items: center; gap: 12px; }
.stx { display: flex; flex-direction: column; gap: 2px; line-height: 1.35; }
.stx b { font-size: 15.5px; }
.switch { flex: none; display: grid; place-items: center; width: 60px; height: 44px; padding: 0; border: 0; border-radius: 999px; background: none; cursor: pointer; }
.switch:disabled { cursor: default; opacity: .55; }
/* Off: an outlined track and a grey knob (3:1 against the card); on: the knob slides over a green track. */
.track { position: relative; width: 50px; height: 30px; border-radius: 999px; background: var(--surface-2); border: 2px solid var(--fg-3); transition: background .15s ease, border-color .15s ease; }
.knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 999px; background: var(--fg-3); transition: transform .15s ease, background .15s ease; }
.switch[aria-checked="true"] .track { background: var(--ok); border-color: var(--ok); }
.switch[aria-checked="true"] .knob { transform: translateX(20px); background: var(--ok-ink); }
.switch:focus-visible { outline-offset: 0; }
.seen { display: flex; flex-direction: column; gap: 6px; padding-top: 10px; border-top: 1px solid var(--line); }
.trips { list-style: none; display: flex; flex-direction: column; gap: 4px; }
.trips li { display: flex; align-items: center; gap: 8px; }
.trips .i { color: var(--accent); }
</style>
