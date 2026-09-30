import { createGlobalState, useStorage } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import type { DayNote, Expense, Feedback, PlaceStamp, StopStatus, TripProgress } from '#shared/types/trip'
import { emptyProgress, uid } from '#shared/utils/plan'

export const useProgressStore = createGlobalState(() =>
  useStorage<Record<string, TripProgress>>('travel:progress:v1', {}),
)

/**
 * Counts the times this device's copy was removed: another account's copy is about to arrive, or it was removed from
 * this device (useCloud, spec D35 and D44). A change begun on one copy never lands in the next one: a trip screen
 * opened on the old copy writes nothing more, and a photo being saved or fetched for it is dropped.
 */
export const useCopyEpoch = createGlobalState(() => shallowRef(0))

/** A cost to log: everything but the bookkeeping. `id` only for fixed ids (legacy-stop-…, legacy-day-…). */
export type NewExpense = Omit<Expense, 'id' | 'at' | 'updatedAt' | 'deleted'> & { id?: string, at?: string }

/** The fields of a cost you can change. A field set to undefined is removed. */
type ExpensePatch = Partial<Omit<Expense, 'id' | 'at' | 'updatedAt' | 'deleted'>>

const own = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key)

/** A plain copy without the given keys and without keys whose value is undefined (they'd linger in memory). */
function defined<T extends object>(o: T, ...drop: string[]): T {
  const out = {} as T
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && !drop.includes(k)) (out as Record<string, unknown>)[k] = v
  }
  return out
}

/** What you did on one trip: marks, feedback, picked options, bookings, packing, costs and stamps. */
export function useProgress(tripId: MaybeRefOrGetter<string>) {
  const store = useProgressStore()
  const trips = useTrips()
  const copy = useCopyEpoch()
  /** The device copy this was opened on: once that copy is removed, nothing more is written through it. */
  const opened = copy.value

  const progress = computed<TripProgress>(() => {
    const p = store.value[toValue(tripId)]
    return p ? { ...emptyProgress(), ...p } : emptyProgress()
  })

  function edit(fn: (p: TripProgress) => void) {
    const id = toValue(tripId)
    if (!id || copy.value !== opened) return
    // Only for a trip on this device: a screen still open on a trip that just went never brings its progress back.
    if (!store.value[id] && !trips.get(id)) return
    if (!store.value[id]) store.value[id] = emptyProgress()
    const p = store.value[id]!
    // Older saves may miss newer fields.
    p.stops ??= {}
    p.feedback ??= {}
    p.choices ??= {}
    p.bookings ??= {}
    p.packing ??= {}
    p.dayNotes ??= {}
    p.expenses ??= {}
    p.stamps ??= {}
    fn(p)
  }

  /** Marks a stop done or skipped (null clears it). `at` restores an earlier mark's time (Undo). */
  function mark(stopId: string, status: StopStatus | null, at?: string) {
    edit((p) => {
      if (status) p.stops[stopId] = { status, at: at || new Date().toISOString() }
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

  /** Logs a cost and returns its id (uid('c') unless one is given, as for legacy ids). A record under that id is replaced. */
  function addExpense(e: NewExpense): string {
    const now = new Date().toISOString()
    const id = e.id || uid('c')
    const record = { ...defined(e, 'id', 'at', 'updatedAt', 'deleted', 'preview'), id, at: e.at || now, updatedAt: now } as Expense
    if (e.preview === true) record.preview = true
    edit((p) => {
      p.expenses![id] = record
    })
    return id
  }

  /** Changes a cost (a field set to undefined is removed). Nothing happens when there is no such record. */
  function updateExpense(id: string, patch: ExpensePatch) {
    edit((p) => {
      const cur = own(p.expenses!, id) ? p.expenses![id] : undefined
      if (!cur) return
      const next = { ...cur } as Record<string, unknown>
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'id' || k === 'at' || k === 'updatedAt' || k === 'deleted') continue
        if (v === undefined || (k === 'preview' && v !== true)) delete next[k]
        else next[k] = v
      }
      next.updatedAt = new Date().toISOString()
      p.expenses![id] = next as unknown as Expense
    })
  }

  /**
   * Deletes a cost: writes a tombstone (the record stays, marked deleted, so a merge can't bring it back).
   * With no record under that id, writes `fallback` as the tombstone (an old value's legacy id).
   * Returns the record as it was before, when there was a live one (a record already deleted is left alone).
   */
  function removeExpense(id: string, fallback?: Omit<Expense, 'updatedAt' | 'deleted'>): Expense | undefined {
    let before: Expense | undefined
    edit((p) => {
      const cur = own(p.expenses!, id) ? p.expenses![id] : undefined
      const now = new Date().toISOString()
      if (cur) {
        if (cur.deleted) return
        before = { ...cur }
        p.expenses![id] = { ...cur, deleted: true, updatedAt: now }
      }
      else if (fallback) {
        p.expenses![id] = { ...defined(fallback), id, deleted: true, updatedAt: now }
      }
    })
    return before
  }

  /** Brings a cost back as it is given (live, with a new updatedAt). */
  function restoreExpense(e: Expense) {
    if (!e?.id) return
    edit((p) => {
      p.expenses![e.id] = { ...defined(e, 'deleted'), updatedAt: new Date().toISOString() }
    })
  }

  /**
   * Stamps a place by hand (true), takes a stamp back (false, which also hides a stamp a done stop gives),
   * or leaves it to your ticks (null). `at` restores an earlier record's time (Undo).
   */
  function setStamp(placeId: string, on: boolean | null, at?: string) {
    const now = new Date().toISOString()
    const record: PlaceStamp = { on, at: at || now, updatedAt: now }
    edit((p) => {
      p.stamps![placeId] = record
    })
  }

  function clear() {
    const id = toValue(tripId)
    if (id && copy.value === opened) delete store.value[id]
  }

  return {
    progress, mark, statusOf, setFeedback, choose, toggleBooking, togglePacking, setVariant, setDayNote, setTripNote,
    addExpense, updateExpense, removeExpense, restoreExpense, setStamp, clear,
  }
}
