import { createGlobalState, useStorage } from '@vueuse/core'

export interface GeoFix {
  lat: number
  lng: number
  accuracy: number
  /** Direction of travel from GPS, degrees (only while moving). */
  heading: number | null
  speed: number | null
  at: number
}

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number }
type OrientationPermission = { requestPermission?: () => Promise<'granted' | 'denied'> }

/** Your live position (and compass heading when the phone has one). Shared by every screen. */
export const useGeo = createGlobalState(() => {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator
  const wanted = useStorage('travel:geo:on', false)
  const active = ref(false)
  const fix = ref<GeoFix | null>(null)
  const error = ref<'denied' | 'unavailable' | 'timeout' | null>(null)
  const compass = ref<number | null>(null)
  let watchId: number | null = null
  let orientationOn = false
  let raf = 0
  let pendingHeading: number | null = null

  function onOrientation(e: Event) {
    const ev = e as OrientationEventWithCompass
    let h: number | null = null
    if (typeof ev.webkitCompassHeading === 'number') h = ev.webkitCompassHeading
    else if (ev.absolute && typeof ev.alpha === 'number') h = (360 - ev.alpha) % 360
    if (h === null) return
    pendingHeading = h
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0
        compass.value = pendingHeading
      })
    }
  }

  async function startCompass() {
    if (orientationOn || typeof window === 'undefined') return
    const Ctor = (window as unknown as { DeviceOrientationEvent?: OrientationPermission }).DeviceOrientationEvent
    try {
      if (Ctor?.requestPermission) {
        const r = await Ctor.requestPermission()
        if (r !== 'granted') return
      }
    }
    catch {
      return
    }
    orientationOn = true
    const w: Window = window
    const absolute = 'ondeviceorientationabsolute' in w
    w.addEventListener(absolute ? 'deviceorientationabsolute' : 'deviceorientation', onOrientation)
  }

  function stopCompass() {
    if (!orientationOn) return
    window.removeEventListener('deviceorientationabsolute', onOrientation)
    window.removeEventListener('deviceorientation', onOrientation)
    orientationOn = false
    compass.value = null
  }

  function start(withCompass = false) {
    if (!supported) {
      error.value = 'unavailable'
      return
    }
    if (withCompass) void startCompass()
    if (watchId !== null) return
    error.value = null
    active.value = true
    wanted.value = true
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        error.value = null
        fix.value = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
          speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
          at: pos.timestamp,
        }
      },
      (err) => {
        error.value = err.code === 1 ? 'denied' : err.code === 2 ? 'unavailable' : 'timeout'
        if (err.code === 1) stop()
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    )
  }

  function stop() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    watchId = null
    active.value = false
    wanted.value = false
    stopCompass()
  }

  function toggle() {
    if (active.value) stop()
    else start(true)
  }

  // Pick up where you left off, but only if the browser already allows it (no surprise prompts).
  if (supported && wanted.value && typeof navigator.permissions?.query === 'function') {
    navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((s) => {
      if (s.state === 'granted') start(false)
    }).catch(() => {})
  }

  /** Fix is fresh enough to steer by. */
  const live = computed(() => !!fix.value && active.value)
  const heading = computed(() => compass.value ?? fix.value?.heading ?? null)

  return { supported, active, live, fix, error, heading, compass, start, stop, toggle, startCompass }
})
