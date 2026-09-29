import { createGlobalState } from '@vueuse/core'

/**
 * The app's clock, ticking every few seconds. "Preview" shifts it so you can see
 * what the guide will say at any moment of the trip; the shifted clock keeps running.
 */
export const useClock = createGlobalState(() => {
  const real = shallowRef(new Date())
  const offsetMs = ref(0)
  if (typeof window !== 'undefined') {
    const tick = () => {
      real.value = new Date()
    }
    setInterval(tick, 5000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') tick()
    })
  }
  const now = computed(() => new Date(real.value.getTime() + offsetMs.value))
  const previewing = computed(() => offsetMs.value !== 0)

  function previewAt(at: Date) {
    real.value = new Date()
    offsetMs.value = at.getTime() - real.value.getTime()
  }

  function live() {
    offsetMs.value = 0
    real.value = new Date()
  }

  return { now, real, previewing, previewAt, live }
})
