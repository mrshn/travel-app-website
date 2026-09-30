import type { ComputedRef } from 'vue'
import { gameState, type GameState } from '#shared/utils/game'

/** The same content as last time: keep the old value, so screens don't redraw for nothing. */
function sameGame(a: GameState, b: GameState): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  catch {
    return false
  }
}

/**
 * The game of the trip on screen: stamps, rank, badges and sets, worked out from the trip view.
 * null until the trip and its costs are ready. Call it inside a trip page (it reads useTripView()).
 */
export function useGame(): ComputedRef<GameState | null> {
  const v = useTripView()
  return computed<GameState | null>((old) => {
    const trip = v.trip.value
    const costs = v.costs.value
    if (!trip || !costs) return null
    const next = gameState({ trip, p: v.progress.value, plans: v.plans.value, stamps: v.stamps.value, costs, sets: v.sets.value })
    return old && sameGame(old, next) ? old : next
  })
}
