import type { InjectionKey, MaybeRefOrGetter } from 'vue'
import type { Trip } from '#shared/types/trip'
import { costSummary, type CostSummary } from '#shared/utils/costs'
import { placesInPlan, placeSetProgress, placeStamps, type PlacePlanHit, type PlaceSetProgress, type PlaceStampInfo } from '#shared/utils/places'
import { activeVariant, planDays, summarize, type DayPlan, type ResolvedStop, type StopState } from '#shared/utils/plan'
import { tripMoment } from '#shared/utils/time'

/** Today's money on the trip's clock (it follows a preview). */
export interface CostToday {
  dayId: string
  spent: number
  planned: number
}

/** The same content as last time: keep the old value, so nothing downstream recomputes for nothing. */
function sameJson(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  catch {
    return false
  }
}
const mapJson = <V>(m: Map<string, V>) => [...m]

function createTripView(idSource: MaybeRefOrGetter<string>) {
  const id = computed(() => toValue(idSource))
  const trips = useTrips()
  const trip = computed<Trip | undefined>(() => trips.get(id.value))
  const prog = useProgress(id)
  const clock = useClock()

  // Whole minutes only, so everything downstream recomputes once a minute.
  const minute = computed(() => Math.floor(clock.now.value.getTime() / 60_000))
  const moment = computed(() => (trip.value ? tripMoment(trip.value, new Date(minute.value * 60_000)) : null))
  const variant = computed(() => (trip.value ? activeVariant(trip.value, prog.progress.value) : undefined))
  const plans = computed<DayPlan[]>(() =>
    trip.value && moment.value ? planDays(trip.value, prog.progress.value, moment.value) : [],
  )

  // Computed once per trip for every screen. The plan changes every minute (stop states), these rarely do:
  // an unchanged result keeps the previous object.
  const costs = computed<CostSummary | null>((old) => {
    if (!trip.value || !moment.value) return null
    const next = costSummary(trip.value, prog.progress.value, plans.value)
    return old && sameJson(old, next) ? old : next
  })
  const stamps = computed<Map<string, PlaceStampInfo>>((old) => {
    const next = trip.value ? placeStamps(trip.value, prog.progress.value, plans.value) : new Map<string, PlaceStampInfo>()
    return old && sameJson(mapJson(old), mapJson(next)) ? old : next
  })
  const inPlan = computed<Map<string, PlacePlanHit>>((old) => {
    const next = trip.value ? placesInPlan(trip.value, plans.value) : new Map<string, PlacePlanHit>()
    return old && sameJson(mapJson(old), mapJson(next)) ? old : next
  })
  const sets = computed<PlaceSetProgress[]>((old) => {
    const next = trip.value ? placeSetProgress(trip.value, stamps.value) : []
    return old && sameJson(old, next) ? old : next
  })

  const summary = computed(() =>
    trip.value && moment.value ? summarize(trip.value, prog.progress.value, moment.value, plans.value, costs.value ?? undefined) : null,
  )
  const today = computed<DayPlan | undefined>(() =>
    moment.value?.phase === 'during' && moment.value.dayIndex >= 0 ? plans.value[moment.value.dayIndex] : undefined,
  )
  /** During the trip: what today (by the app's clock) has cost so far, and its plan. */
  const todayCosts = computed<CostToday | null>((old) => {
    const m = moment.value
    const dayId = m?.phase === 'during' && m.dayIndex >= 0 ? trip.value?.days[m.dayIndex]?.id : undefined
    const pair = dayId ? costs.value?.byDay[dayId] : undefined
    if (!dayId || !pair) return null
    const next = { dayId, spent: pair.spent, planned: pair.planned }
    return old && sameJson(old, next) ? old : next
  })

  function locate(stopId: string): { plan: DayPlan, stop: ResolvedStop, state: StopState } | null {
    for (const plan of plans.value) {
      const stop = plan.stops.find(s => s.id === stopId)
      if (stop) return { plan, stop, state: plan.states[stopId] ?? 'upcoming' }
    }
    return null
  }

  return { id, trip, moment, variant, plans, summary, today, costs, stamps, inPlan, sets, todayCosts, locate, trips, clock, ...prog }
}

export type TripView = ReturnType<typeof createTripView>

const KEY: InjectionKey<TripView> = Symbol('trip-view')

/** Called once by the trip layout; every screen inside reads the same view. */
export function provideTripView(idSource: MaybeRefOrGetter<string>): TripView {
  const v = createTripView(idSource)
  provide(KEY, v)
  return v
}

export function useTripView(): TripView {
  const v = inject(KEY, null)
  if (!v) throw new Error('useTripView() must be used inside a trip page')
  return v
}
