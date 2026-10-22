<script lang="ts">
import { ref, toast, useGeo, useTripGroup, useTripView, watch } from '#imports'
import type { GeoFix } from '~/composables/useGeo'
import { groupErrorLine } from './GroupNotice.vue'

/**
 * "Share where I am" in a group trip (docs/design/2026-10-14-together.md, T7): one fix of the phone's position, sent
 * to the chat as a pin, and your status says so. Nothing follows you after: if the map wasn't following you
 * already, the phone stops being asked. Call in setup.
 */
export function useShareWhere() {
  const v = useTripView()
  const tg = useTripGroup()
  const geo = useGeo()
  const busy = ref(false)

  /** One fix: a fresh one the map already has, else the phone is asked once. */
  function oneFix(timeout = 20000): Promise<GeoFix | null> {
    const f = geo.fix.value
    if (f && geo.active.value && Date.now() - f.at < 60_000) return Promise.resolve(f)
    const was = geo.active.value
    const since = f?.at ?? 0
    geo.start()
    return new Promise((resolve) => {
      let stop: (() => void) | undefined
      let finished = false
      const done = (x: GeoFix | null) => {
        if (finished) return
        finished = true
        clearTimeout(timer)
        stop?.()
        if (!was) geo.stop()
        resolve(x)
      }
      const timer = setTimeout(() => done(null), timeout)
      stop = watch([geo.fix, geo.error], ([fix, err]) => {
        if (fix && fix.at !== since) done(fix)
        else if (err === 'denied' || err === 'unavailable') done(null)
      }, { immediate: true })
      // It may have finished while the watch was being set up.
      if (finished) stop()
    })
  }

  async function share(): Promise<boolean> {
    if (busy.value) return false
    busy.value = true
    try {
      const fix = await oneFix()
      if (!fix) {
        toast(geo.error.value === 'denied'
          ? 'Location is blocked for this site. Allow it in your browser settings to share where you are.'
          : 'Couldn\'t find where you are. Try again in a moment.', { tone: 'warn' })
        return false
      }
      const place = { lat: +fix.lat.toFixed(6), lng: +fix.lng.toFixed(6), acc: Math.round(fix.accuracy) }
      await tg.send({ kind: 'location', text: '', place })
      // Your status says it too (the chat already has the pin).
      const today = v.today.value
      const here = today?.stops.find(s => !s.minor && today.states[s.id] === 'now')
      await tg.setStatus(here
        ? { kind: 'at', text: `At ${here.title}`.slice(0, 80), stopId: here.id, place }
        : { kind: 'custom', text: 'Shared my location', place }, { tell: false }).catch(() => {})
      toast('Sent where you are to the group chat', { tone: 'ok' })
      return true
    }
    catch (e) {
      toast(groupErrorLine(e), { tone: 'warn' })
      return false
    }
    finally {
      busy.value = false
    }
  }

  return { share, busy }
}
</script>

<script setup lang="ts">
/** The button: "Share where I am". */
withDefaults(defineProps<{ small?: boolean }>(), { small: false })
const social = useSocial()
const where = useShareWhere()
</script>

<template>
  <button class="btn" :class="{ sm: small }" type="button" :disabled="!social.ready.value || where.busy.value" @click="where.share()">
    <AppIcon name="locate" size="sm" />{{ where.busy.value ? 'Finding you…' : 'Share where I am' }}
  </button>
</template>
