import { createGlobalState, useStorage } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import type { DayNote, Feedback, StopStatus, TripProgress } from '#shared/types/trip'
import { emptyProgress } from '#shared/utils/plan'

export const useProgressStore = createGlobalState(() =>
  useStorage<Record<string, TripProgress>>('travel:progress:v1', {}),
)

/** What you did on one trip: marks, feedback, picked options, bookings and packing. */
export function useProgress(tripId: MaybeRefOrGetter<string>) {
  const store = useProgressStore()

  const progress = computed<TripProgress>(() => {
    const p = store.value[toValue(tripId)]
    return p ? { ...emptyProgress(), ...p } : emptyProgress()
  })

  function edit(fn: (p: TripProgress) => void) {
    const id = toValue(tripId)
    if (!id) return
    if (!store.value[id]) store.value[id] = emptyProgress()
    const p = store.value[id]!
    // Older saves may miss newer fields.
    p.stops ??= {}
    p.feedback ??= {}
    p.choices ??= {}
    p.bookings ??= {}
    p.packing ??= {}
    p.dayNotes ??= {}
    fn(p)
  }

  function mark(stopId: string, status: StopStatus | null) {
    edit((p) => {
      if (status) p.stops[stopId] = { status, at: new Date().toISOString() }
      else delete p.stops[stopId]
    })
  }

  function statusOf(stopId: string): StopStatus | undefined {
    return progress.value.stops[stopId]?.status
  }

  function setFeedback(stopId: string, patch: Partial<Omit<Feedback, 'updatedAt'>>) {
    edit((p) => {
      const next: Feedback = { ...p.feedback[stopId], ...patch, updatedAt: new Date().toISOString() }
      const empty = !next.rating && !next.note?.trim() && !next.tags?.length && !next.spent && !next.photos?.length
      if (empty) delete p.feedback[stopId]
      else p.feedback[stopId] = next
    })
  }

  function choose(stopId: string, choiceId: string) {
    edit((p) => {
      p.choices[stopId] = choiceId
    })
  }

  function toggleBooking(id: string, value?: boolean) {
    edit((p) => {
      const v = value ?? !p.bookings[id]
      if (v) p.bookings[id] = true
      else delete p.bookings[id]
    })
  }

  function togglePacking(item: string, value?: boolean) {
    edit((p) => {
      const v = value ?? !p.packing[item]
      if (v) p.packing[item] = true
      else delete p.packing[item]
    })
  }

  function setVariant(v: string) {
    edit((p) => {
      p.variant = v
    })
  }

  function setDayNote(dayId: string, patch: Partial<DayNote>) {
    edit((p) => {
      p.dayNotes[dayId] = { ...p.dayNotes[dayId], ...patch, updatedAt: new Date().toISOString() }
    })
  }

  function setTripNote(note: string) {
    edit((p) => {
      p.tripNote = note
    })
  }

  function clear() {
    const id = toValue(tripId)
    if (id) delete store.value[id]
  }

  return { progress, mark, statusOf, setFeedback, choose, toggleBooking, togglePacking, setVariant, setDayNote, setTripNote, clear }
}
