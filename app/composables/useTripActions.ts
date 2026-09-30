/**
 * What a tap does, the same on every screen: tick a stop, tick a booking, log, edit or delete a cost,
 * stamp a place. Each writes through useProgress and says what happened in a toast with Undo.
 * Call useTripActions() and useCostSheet() in setup; the functions they return keep working later,
 * from a toast's button for example.
 */
import type { Booking, CostCat, Expense, PlaceCard, StopStatus, Trip } from '#shared/types/trip'
import { COST_CATS, COST_MAX, costCatForKind, costDayFor, costHints, costLoggedFor, costOfferFor, costParseAmount, costToCents } from '#shared/utils/costs'
import { placeIsCollectable, placeLinksForStop, placeSetOf } from '#shared/utils/places'
import { findStop, resolveStop, type ResolvedStop } from '#shared/utils/plan'
import { fmtDate, tripMoment } from '#shared/utils/time'
import type { ToastAction } from './useToast'

/** A cost as the pad and the one-tap buttons give it. */
export interface CostInput {
  amount: number
  cat: CostCat
  /**
   * The trip day it counts to. Leave the key out for the day on the app's clock (it follows a preview);
   * give it as undefined or '' for a cost before or after the trip.
   */
  dayId?: string
  /** With no trip day: whether it counts before or after the trip (the pad's "Counts for"). */
  when?: 'before' | 'after'
  note?: string
  stopId?: string
  placeId?: string
  bookingId?: string
}

/** What the cost sheet was opened for (?for=stop:<id> or ?for=booking:<id>). */
export interface CostSheetTarget {
  kind: 'stop' | 'booking'
  id: string
}

const has = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key)
const text = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim() : undefined)

/** An amount rounded to cents, or null when it can't be logged (0, negative, above COST_MAX, not a number). Typed text ("3,50") works too. */
function costAmount(n: unknown): number | null {
  if (typeof n === 'string') return costParseAmount(n)
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  const cents = costToCents(n)
  return cents > 0 && cents <= costToCents(COST_MAX) ? cents / 100 : null
}

/** A trip day id, or undefined for anything else (before or after the trip). */
function costDayOf(trip: Trip, dayId: unknown): string | undefined {
  return typeof dayId === 'string' && trip.days.some(d => d.id === dayId) ? dayId : undefined
}

const catOf = (c: unknown): CostCat => ((COST_CATS as readonly unknown[]).includes(c) ? c as CostCat : 'other')
const whenOf = (w: unknown): 'before' | 'after' | undefined => (w === 'before' || w === 'after' ? w : undefined)
const isoOf = (ms: number) => (Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : undefined)

const SHEET_KEYS = ['cost', 'for', 'cday'] as const

/**
 * A close of the cost sheet under way (the URL it closes), shared by every caller: two closes at once must not
 * go back twice. It ends when the router finishes or fails its next navigation, not after a time on the clock,
 * so a sheet reopened at the same URL closes again even when the page's date stands still (the e2e tests'
 * live() freezes it). The timer only forgets a close whose navigation never reached the router.
 */
let sheetClosing: { path: string, timer: ReturnType<typeof setTimeout> } | null = null
const sheetRouters = new WeakSet<object>()

function sheetCloseDone() {
  if (!sheetClosing) return
  clearTimeout(sheetClosing.timer)
  sheetClosing = null
}

/** Drives the cost sheet through the URL: ?cost=new (&for=stop:<id> or booking:<id>, &cday=<dayId>), or ?cost=<id> to edit. */
export function useCostSheet() {
  const route = useRoute()
  const router = useRouter()
  if (!sheetRouters.has(router)) {
    sheetRouters.add(router)
    router.afterEach(sheetCloseDone)
    router.onError(sheetCloseDone)
  }

  const q = (key: string) => {
    const v = route.query[key]
    return typeof v === 'string' && v ? v : null
  }
  const mode = computed<'new' | 'edit' | null>(() => {
    const c = q('cost')
    return c ? (c === 'new' ? 'new' : 'edit') : null
  })
  const editId = computed(() => (mode.value === 'edit' ? q('cost') : null))
  const target = computed<CostSheetTarget | null>(() => {
    const m = /^(stop|booking):(.+)$/.exec(q('for') ?? '')
    return m ? { kind: m[1] as CostSheetTarget['kind'], id: m[2]! } : null
  })
  const day = computed(() => q('cday'))

  // Read the router at call time, not the route of the component that set this up (it may be gone).
  const now = () => router.currentRoute.value
  const isOpen = () => typeof now().query.cost === 'string' && !!now().query.cost

  function write(query: Record<string, string>) {
    const next = { ...now().query }
    for (const k of SHEET_KEYS) delete next[k]
    Object.assign(next, query)
    return isOpen() ? router.replace({ query: next }) : router.push({ query: next })
  }

  /** Opens the sheet to add a cost, linked to a stop or a booking, counting to a day. */
  function open(opts: { stopId?: string, bookingId?: string, dayId?: string } = {}) {
    const query: Record<string, string> = { cost: 'new' }
    if (opts.stopId) query.for = `stop:${opts.stopId}`
    else if (opts.bookingId) query.for = `booking:${opts.bookingId}`
    if (opts.dayId) query.cday = opts.dayId
    return write(query)
  }

  /** Opens the sheet to edit a cost (an expense id or a legacy id). */
  function openEdit(id: string) {
    if (!id) return
    return write({ cost: id })
  }

  /** Closes the sheet: back when the page behind has no sheet (the phone's back gesture does the same), else the keys go. */
  function close() {
    const cur = now()
    if (!SHEET_KEYS.some(k => cur.query[k] !== undefined)) return
    if (sheetClosing?.path === cur.fullPath) return
    sheetCloseDone()
    sheetClosing = { path: cur.fullPath, timer: setTimeout(sheetCloseDone, 2000) }
    const back = typeof window !== 'undefined' ? (window.history.state as { back?: string } | null)?.back : undefined
    if (back && isOpen()) {
      const r = router.resolve(back)
      if (r.path === cur.path && !r.query.cost) {
        router.back()
        return
      }
    }
    const next = { ...cur.query }
    for (const k of SHEET_KEYS) delete next[k]
    return router.replace({ query: next })
  }

  return { mode, editId, target, day, open, openEdit, close }
}

export function useTripActions() {
  const v = useTripView()
  const sheet = useCostSheet()
  const clock = useClock()

  const catLabel = (c: CostCat) => COST_META[c]?.label ?? 'Other'
  /** A trip day as the pad's "Counts for" names it ("Thu 8"), or '@before' and '@after' as "Before the trip", "After the trip". */
  const dayName = (trip: Trip, day: string) => {
    if (day === '@before') return 'Before the trip'
    if (day === '@after') return 'After the trip'
    const d = trip.days.find(x => x.id === day)
    return d ? `${fmtDate(d.date, 'weekday')} ${Number(d.date.slice(8, 10))}` : day
  }

  /** The title a cost linked to this stop or booking keeps (the stop's resolved title first). */
  function titleFor(trip: Trip, stopId?: string, bookingId?: string): string | undefined {
    if (stopId) {
      const hit = v.locate(stopId)?.stop.title
      if (hit) return hit
      const found = findStop(trip, stopId)
      if (found) return resolveStop(found.stop, v.progress.value.choices ?? {}).title
    }
    if (bookingId) return trip.bookings.find(b => b.id === bookingId)?.title
    return undefined
  }

  /** The first stop of the plan (in day and time order) that uses a booking. */
  function stopForBooking(bookingId: string): ResolvedStop | undefined {
    for (const plan of v.plans.value) {
      const s = plan.stops.find(x => x.bookingId === bookingId)
      if (s) return s
    }
    return undefined
  }

  /** Marks a stop done, skipped or not (null), with the tick toast: new stamps, "Log €7" or "Add cost", Undo. */
  function markStop(stop: ResolvedStop, status: StopStatus | null) {
    const trip = v.trip.value
    if (!trip || !stop?.id) return
    const prev = v.progress.value.stops[stop.id]
    const before = prev ? { status: prev.status, at: prev.at } : undefined
    if ((before?.status ?? null) === (status ?? null)) return
    const had = new Set(v.stamps.value.keys())
    v.mark(stop.id, status)

    const undo = {
      label: 'Undo',
      run: () => (before ? v.mark(stop.id, before.status, before.at) : v.mark(stop.id, null)),
    }
    if (status === 'skipped') {
      toast(`Skipped: ${stop.title}`, { tone: 'info', actions: [undo] })
      return
    }
    if (!status) {
      toast(`Unticked: ${stop.title}`, { tone: 'info', actions: [undo] })
      return
    }
    const stamped = v.stamps.value
    const fresh = placeLinksForStop(stop, trip.places ?? []).filter(id => stamped.has(id) && !had.has(id)).length
    const suffix = fresh === 1 ? ' · Stamped' : fresh > 1 ? ` · ${fresh} stamps` : ''
    const offer = v.costs.value ? costOfferFor(stop, v.costs.value) : null
    const actions: ToastAction[] = []
    const exact = offer?.exact ?? 0
    if (exact > 0) actions.push({ label: `Log ${money(exact, trip.currency)}`, run: () => logStopCost(stop, exact) })
    else if (offer?.options.length) actions.push({ label: 'Add cost', run: () => sheet.open({ stopId: stop.id, dayId: stop.dayId }) })
    actions.push(undo)
    toast(`Done: ${stop.title}${suffix}`, { tone: 'ok', actions })
  }

  /** Ticks or unticks a booking; a tick says "Booked. One less thing." with "Log €25" when it has one price, and Undo. */
  function tickBooking(b: Booking, value?: boolean) {
    const trip = v.trip.value
    if (!b?.id) return
    const was = !!v.progress.value.bookings[b.id]
    const next = value ?? !was
    if (next === was) return
    v.toggleBooking(b.id, next)
    if (!next) return
    const actions: ToastAction[] = []
    const exact = costHints(b.cost).exact ?? 0
    const stop = stopForBooking(b.id)
    const costs = v.costs.value
    const logged = !!costs && (costs.entries.some(e => e.bookingId === b.id) || (!!stop && costLoggedFor(stop, costs)))
    if (trip && exact > 0 && !logged) {
      actions.push({
        label: `Log ${money(exact, trip.currency)}`,
        run: () => {
          const input: CostInput = { amount: exact, cat: stop ? costCatForKind(stop.kind) : 'sights', bookingId: b.id }
          if (stop) Object.assign(input, { dayId: stop.dayId, stopId: stop.id })
          addCost(input)
        },
      })
    }
    actions.push({ label: 'Undo', run: () => v.toggleBooking(b.id, false) })
    toast('Booked. One less thing.', { tone: 'ok', actions })
  }

  /** Logs a cost; returns its id ('' when the amount can't be logged). Toast "Added €3.50 · Food" with Undo. */
  function addCost(input: CostInput): string {
    const trip = v.trip.value
    const amount = costAmount(input?.amount)
    if (!trip || amount === null) return ''
    const cat = catOf(input.cat)
    const dayId = has(input, 'dayId') ? costDayOf(trip, input.dayId) : costDayFor(trip, clock.now.value)
    const when = dayId ? undefined : whenOf(input.when)
    const stopId = text(input.stopId)
    const bookingId = text(input.bookingId)
    const title = titleFor(trip, stopId, bookingId)
    const id = v.addExpense({
      amount,
      currency: trip.currency,
      cat,
      dayId,
      when,
      note: text(input.note),
      stopId,
      placeId: text(input.placeId),
      bookingId,
      title,
      preview: clock.previewing.value ? true : undefined,
    })

    let line = `Added ${moneyExact(amount, trip.currency)} · ${catLabel(cat)}`
    if (stopId && title) line += ` · ${title}`
    // The pad keeps its day after a save: a cost that doesn't count for today (or, outside the trip, for its
    // usual before or after) says where it went, so the next one isn't logged to that day unnoticed.
    const side = tripMoment(trip, clock.now.value).phase === 'after' ? 'after' : 'before'
    const usual = costDayFor(trip, clock.now.value) ?? `@${side}`
    const went = dayId ?? `@${when ?? side}`
    if (went !== usual) line += ` · ${dayName(trip, went)}`
    const today = v.todayCosts.value
    if (today && dayId === today.dayId && cat !== 'stay' && today.planned > 0) {
      const over = costToCents(today.spent) - costToCents(today.planned)
      if (over > 0) line += ` · ${moneyExact(over / 100, trip.currency)} over today's plan`
    }
    toast(line, { tone: 'ok', actions: [{ label: 'Undo', run: () => v.removeExpense(id) }] })
    return id
  }

  /**
   * Saves an edit. Keys left out of `input` (other than amount and cat) stay as they are; a key given as
   * undefined or '' is cleared. An old "Logged earlier" value becomes a record under its legacy id.
   */
  function saveCost(id: string, input: CostInput) {
    const trip = v.trip.value
    const amount = costAmount(input?.amount)
    if (!trip || !id || amount === null) return
    const cat = catOf(input.cat)
    const rec = v.progress.value.expenses?.[id]

    if (rec) {
      if (rec.deleted) return
      const patch: Parameters<typeof v.updateExpense>[1] = { amount, cat }
      if (has(input, 'dayId')) {
        patch.dayId = costDayOf(trip, input.dayId)
        patch.when = patch.dayId ? undefined : whenOf(input.when)
      }
      if (has(input, 'note')) patch.note = text(input.note)
      if (has(input, 'placeId')) patch.placeId = text(input.placeId)
      const stopId = has(input, 'stopId') ? text(input.stopId) : rec.stopId
      const bookingId = has(input, 'bookingId') ? text(input.bookingId) : rec.bookingId
      if (stopId !== rec.stopId || bookingId !== rec.bookingId) {
        patch.stopId = stopId
        patch.bookingId = bookingId
        patch.title = titleFor(trip, stopId, bookingId)
      }
      v.updateExpense(id, patch)
    }
    else {
      const entry = v.costs.value?.entries.find(e => e.id === id && e.source === 'legacy')
      if (!entry) return
      const stopId = has(input, 'stopId') ? text(input.stopId) : entry.stopId
      const dayId = has(input, 'dayId') ? costDayOf(trip, input.dayId) : entry.dayId
      v.addExpense({
        id,
        amount,
        currency: trip.currency,
        cat,
        dayId,
        when: dayId ? undefined : whenOf(input.when),
        note: text(input.note),
        stopId,
        placeId: text(input.placeId),
        bookingId: text(input.bookingId),
        title: stopId === entry.stopId ? entry.title : titleFor(trip, stopId, text(input.bookingId)),
        // Keeps its place in the list (an old value has no time of its own).
        at: isoOf(entry.sortAt),
      })
    }
    toast('Cost updated', { tone: 'ok' })
  }

  /** Deletes a cost (a tombstone; an old value's legacy id gets one too). Toast "Deleted €3.50" with Undo. */
  function deleteCost(id: string) {
    const trip = v.trip.value
    if (!trip || !id) return
    const rec = v.progress.value.expenses?.[id]
    if (rec) {
      const before = v.removeExpense(id)
      if (!before) return
      toast(`Deleted ${moneyExact(before.amount, before.currency || trip.currency)}`, {
        actions: [{ label: 'Undo', run: () => v.restoreExpense(before) }],
      })
      return
    }
    const entry = v.costs.value?.entries.find(e => e.id === id && e.source === 'legacy')
    if (!entry) return
    const fallback = {
      id,
      amount: entry.amount,
      currency: trip.currency,
      cat: entry.cat,
      dayId: entry.dayId,
      stopId: entry.stopId,
      title: entry.title,
      at: isoOf(entry.sortAt) ?? new Date().toISOString(),
    }
    v.removeExpense(id, fallback)
    toast(`Deleted ${moneyExact(entry.amount, trip.currency)}`, {
      // Back as a live record under the same id: the old value stays hidden, so it can't count twice.
      actions: [{ label: 'Undo', run: () => v.restoreExpense({ ...fallback, updatedAt: '' }) }],
    })
  }

  /** One tap from a tick toast: the stop's price, in the stop's category, on its day. */
  function logStopCost(stop: ResolvedStop, amount: number): string {
    return addCost({ amount, cat: costCatForKind(stop.kind), dayId: stop.dayId, stopId: stop.id })
  }

  /** Deletes every cost logged while previewing; returns how many. Toast "Removed 2 costs" with Undo. */
  function removePreviewCosts(): number {
    const list = (v.costs.value?.entries ?? []).filter(e => e.source === 'expense' && e.preview)
    const removed: Expense[] = []
    for (const e of list) {
      const before = v.removeExpense(e.id)
      if (before) removed.push(before)
    }
    if (!removed.length) return 0
    toast(removed.length === 1 ? 'Removed 1 cost' : `Removed ${removed.length} costs`, {
      actions: [{ label: 'Undo', run: () => removed.forEach(e => v.restoreExpense(e)) }],
    })
    return removed.length
  }

  /** Stamps a place by hand, or takes the stamp back. Undo puts back the record there was (or none). */
  function stampPlace(place: PlaceCard, on: boolean) {
    if (!v.trip.value || !place?.id || !placeIsCollectable(place)) return
    const prev = v.progress.value.stamps?.[place.id]
    const before = prev ? { on: prev.on, at: prev.at } : undefined
    v.setStamp(place.id, on)
    const undo = {
      label: 'Undo',
      run: () => (before ? v.setStamp(place.id, before.on, before.at) : v.setStamp(place.id, null)),
    }
    if (on) {
      const set = placeSetOf(place)
      const progress = v.sets.value.find(s => s.set === set)
      const where = progress ? ` · ${PLACE_SET_META[set].label} ${progress.stamped}/${progress.total}` : ''
      toast(`Stamped: ${place.name}${where}`, { tone: 'ok', actions: [undo] })
    }
    else {
      toast(`Stamp removed: ${place.name}`, { tone: 'info', actions: [undo] })
    }
  }

  return { markStop, tickBooking, addCost, saveCost, deleteCost, logStopCost, removePreviewCosts, stampPlace }
}
