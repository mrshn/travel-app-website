import { useStorage } from '@vueuse/core'
import { liveGuide } from '#shared/utils/guide'
import { fmtClock } from '#shared/utils/time'
import type { TripView } from './useTripView'

const supportsNotifications = () => typeof window !== 'undefined' && 'Notification' in window

/** The on/off switch for leave reminders (shared by every screen). */
export function useAlertSettings() {
  const enabled = useStorage('travel:alerts:on', false)
  const supported = supportsNotifications()

  async function enable() {
    if (supported && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      }
      catch { /* ignore */ }
    }
    enabled.value = true
    toast(supported && Notification.permission === 'granted' ? 'Leave reminders on' : 'Reminders on (shown in the app)', { tone: 'ok' })
  }

  function disable() {
    enabled.value = false
  }

  return { enabled, supported, enable, disable }
}

/**
 * Nudges while the app is open: "time to leave" for the next stop and the day's
 * timed alerts (sunset, last metro…), as a notification when allowed, else a toast.
 * Call once per trip screen tree.
 */
export function useLiveAlerts(v: TripView) {
  const { enabled } = useAlertSettings()
  const icon = `${useRuntimeConfig().app.baseURL}pwa-192x192.png`
  const sent = new Set<string>()
  const geo = useGeo()
  const gmaps = useGoogleMaps()
  const supported = supportsNotifications()

  async function notify(title: string, body: string, tag: string) {
    if (sent.has(tag)) return
    sent.add(tag)
    toast(`${title}: ${body}`, { tone: 'warn', ms: 8000 })
    try {
      navigator.vibrate?.([180, 90, 180])
    }
    catch { /* no vibration */ }
    if (!supported || Notification.permission !== 'granted' || document.visibilityState === 'visible') return
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (reg) await reg.showNotification(title, { body, tag, icon })
      else new Notification(title, { body, tag })
    }
    catch { /* ignore */ }
  }

  watch(() => [v.today.value, v.moment.value?.minutes] as const, () => {
    if (!enabled.value || v.clock.previewing.value) return
    const t = v.today.value
    const m = v.moment.value
    if (!t || !m) return
    const trip = v.trip.value
    const travel = trip ? gmaps.lookupFor(trip.timezone, t.view.day.date) : undefined
    const g = liveGuide(t.stops, t.states, m.minutes, { you: geo.fix.value, home: trip?.home, travel })
    if (g.next && g.leaveIn !== undefined && g.leaveIn <= 2 && g.leaveIn > -10) {
      const where = g.next.place?.name ?? g.next.title
      notify(`Time to go: ${g.next.title}`, g.leg ? `Starts ${fmtClock(g.next.start)} · ${g.leg.est.source === 'google' ? '' : '~'}${g.leg.est.minutes} min ${g.leg.est.mode === 'walk' ? 'walk' : 'by transit'} to ${where}${g.leg.est.ride ? ` · ${g.leg.est.ride}` : ''}` : `Starts ${fmtClock(g.next.start)}`, `leave:${t.view.day.id}:${g.next.id}`)
    }
    for (const a of t.view.day.alerts ?? []) {
      if (a.from <= m.minutes && m.minutes < Math.min(a.to, a.from + 20)) notify(fmtClock(a.from), a.text, `alert:${t.view.day.id}:${a.from}`)
    }
  })

  return { enabled }
}
