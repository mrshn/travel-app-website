import type { InjectionKey, MaybeRefOrGetter } from 'vue'
import type { Trip } from '#shared/types/trip'
import { activeVariant, planDays, summarize, type DayPlan, type ResolvedStop, type StopState } from '#shared/utils/plan'
import { tripMoment } from '#shared/utils/time'

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
  const summary = computed(() =>
    trip.value && moment.value ? summarize(trip.value, prog.progress.value, moment.value, plans.value) : null,
  )
  const today = computed<DayPlan | undefined>(() =>
    moment.value?.phase === 'during' && moment.value.dayIndex >= 0 ? plans.value[moment.value.dayIndex] : undefined,
  )

  function locate(stopId: string): { plan: DayPlan, stop: ResolvedStop, state: StopState } | null {
    for (const plan of plans.value) {
      const stop = plan.stops.find(s => s.id === stopId)
      if (stop) return { plan, stop, state: plan.states[stopId] ?? 'upcoming' }
    }
    return null
  }

  return { id, trip, moment, variant, plans, summary, today, locate, trips, clock, ...prog }
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
