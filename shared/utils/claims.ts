/**
 * Claims (docs/design/2026-10-14-together.md, T12 and 5.13): money back for a cancelled or delayed flight, a lost or
 * late bag, a booking or anything else, with its amounts, steps and deadline. Pure; the Claims page, the claim sheet,
 * the cost sheet and Home read it. Every amount is summed in whole cents. Everything here is a guide, not legal advice.
 */
import type { Claim, ClaimKind, ClaimLine, ClaimOdds, ClaimStatus, ClaimStep, Expense } from '../types/trip'
import { addDays, diffDays, fmtDate, pad2 } from './time'

/** Said wherever a claim's amounts or steps are shown. */
export const CLAIM_GUIDE = 'This is a guide, not legal advice.'

/** How each kind of claim looks: its name, an icon, and a line for the template picker. */
export interface ClaimKindMeta {
  label: string
  icon: string
  hint: string
}

/** The kinds of claim, in the template picker's order. */
export const CLAIM_KINDS: Readonly<Record<ClaimKind, ClaimKindMeta>> = Object.freeze({
  'flight-cancelled': { label: 'Flight cancelled', icon: 'plane', hint: 'The fare, a new ticket, meals while you wait and compensation' },
  'flight-delayed': { label: 'Flight delayed', icon: 'clock', hint: 'Three hours or more late on arrival' },
  'bag': { label: 'Lost or late bag', icon: 'bag', hint: 'Report it at the airport before you leave' },
  'booking': { label: 'Booking refund', icon: 'ticket', hint: 'A stay, a tour or a ticket you couldn\'t use' },
  'other': { label: 'Other', icon: 'doc', hint: 'Anything else you want money back for' },
})

/** How a status looks: its name and the tone of its chip. */
export interface ClaimStatusMeta {
  label: string
  tone: 'plain' | 'accent' | 'gold' | 'warn' | 'ok' | 'bad' | 'closed'
}

export const CLAIM_STATUSES: Readonly<Record<ClaimStatus, ClaimStatusMeta>> = Object.freeze({
  draft: { label: 'Not sent yet', tone: 'plain' },
  sent: { label: 'Sent', tone: 'accent' },
  waiting: { label: 'Waiting for an answer', tone: 'gold' },
  escalated: { label: 'Escalated', tone: 'warn' },
  paid: { label: 'Paid', tone: 'ok' },
  partly: { label: 'Partly paid', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'bad' },
  closed: { label: 'Closed', tone: 'closed' },
})

/** How likely a line is to be paid, as the sheet names it. */
export const CLAIM_ODDS: Readonly<Record<ClaimOdds, string>> = Object.freeze({ sure: 'Sure', likely: 'Likely', unsure: 'Unsure' })

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

/** A date `n` months on (YYYY-MM-DD), kept to the month's last day (31 Jan + 1 month is 28 or 29 Feb); '' for no date. */
export function claimAddMonths(date: string, n: number): string {
  if (!isDate(date) || !Number.isInteger(n)) return ''
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const months = y * 12 + (m - 1) + n
  const ny = Math.floor(months / 12)
  const nm = months - ny * 12
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${pad2(nm + 1)}-${pad2(Math.min(d, last))}`
}

/**
 * The fixed compensation of EU261 by flight distance: €250 up to 1,500 km, €400 up to 3,500 km, €600 beyond. For a
 * delay (`delayHours` given) only at 3 hours or more late on arrival. 0 when the distance isn't known.
 */
export function claimEu261(km: number, delayHours?: number): number {
  if (typeof km !== 'number' || !Number.isFinite(km) || km <= 0) return 0
  if (delayHours !== undefined && !(delayHours >= 3)) return 0
  return km <= 1500 ? 250 : km <= 3500 ? 400 : 600
}

/** What a template starts from. */
export interface ClaimTemplateInput {
  /** YYYY-MM-DD it happened. */
  incident?: string
  /** Who you claim from ("Wizz Air"). */
  company?: string
  /** The currency of the amounts (the trip's). */
  currency: string
  /** Your booking reference with them. */
  reference?: string
  /** Flights: the distance, for the EU261 amount (claimEu261). */
  km?: number
  /** A delayed flight: how late it arrived, in hours. */
  delayHours?: number
}

/** A claim as a template makes it: everything but its id and times. */
export type ClaimDraft = Omit<Claim, 'id' | 'at' | 'updatedAt'>

const ESCALATE = 'No answer within a month? Complain to the national enforcement body'

function line(id: string, label: string, currency: string, odds: ClaimOdds, amount = 0): ClaimLine {
  return { id, label, amount, currency, odds }
}

function step(id: string, text: string, due?: string): ClaimStep {
  return isDate(due) ? { id, text, due } : { id, text }
}

/**
 * A new claim of a kind, as a guide to fill in (spec 5.13): its title ("Wizz Air claim", else the kind's name), the
 * lines to claim and the steps, with dates from the incident.
 * - A cancelled or delayed flight: the fare back, the extra cost of a new ticket, meals and transport while waiting,
 *   the fixed compensation (claimEu261; a delay under 3 hours has none) and the accommodation you lost. Deadline: two
 *   months after the incident (check their own). Steps: collect receipts; send it through the airline's form (by the
 *   deadline); no answer within a month, complain to the national enforcement body (its date once it's sent).
 * - A lost or late bag: report it at the airport (that day), then claim in writing within 7 days for damage, 21 days
 *   for a delay (deadline: 7 days on, the safer of the two).
 * - A booking refund, or anything else: no deadline.
 */
export function claimTemplate(kind: ClaimKind, input: ClaimTemplateInput): ClaimDraft {
  const currency = input.currency || 'EUR'
  const incident = isDate(input.incident) ? input.incident : undefined
  const company = input.company?.trim() || undefined
  const reference = input.reference?.trim() || undefined
  let title = company ? `${company} claim` : CLAIM_KINDS[kind].label
  let deadline: string | undefined
  let lines: ClaimLine[]
  let steps: ClaimStep[]

  if (kind === 'flight-cancelled' || kind === 'flight-delayed') {
    deadline = incident ? claimAddMonths(incident, 2) : undefined
    const fixed = claimEu261(input.km ?? 0, kind === 'flight-delayed' ? input.delayHours : undefined)
    const late = kind === 'flight-delayed' && input.delayHours !== undefined && !(input.delayHours >= 3)
    lines = [
      line('refund', 'Refund of the ticket', currency, 'sure'),
      line('new-ticket', 'Extra cost of the new ticket', currency, 'likely'),
      line('care', 'Meals and transport while waiting', currency, 'likely'),
      ...(late ? [] : [line('eu261', 'Fixed compensation (EU261)', currency, 'unsure', fixed)]),
      line('stay', 'Unused accommodation', currency, 'unsure'),
    ]
    steps = [
      step('collect', 'Collect receipts and screenshots'),
      step('send', 'Send the claim through the airline\'s form and save its reference', deadline),
      step('escalate', ESCALATE),
    ]
  }
  else if (kind === 'bag') {
    if (company) title = `${company} bag claim`
    deadline = incident ? addDays(incident, 7) : undefined
    lines = [
      line('essentials', 'Things you had to buy while you waited', currency, 'likely'),
      line('repair', 'Repair or replacement', currency, 'unsure'),
    ]
    steps = [
      step('report', 'Report it at the airport\'s baggage desk and keep the report', incident),
      step('collect', 'Collect receipts and screenshots'),
      step('send', 'Claim in writing: within 7 days for damage, 21 days for a late bag', deadline),
      step('escalate', ESCALATE),
    ]
  }
  else if (kind === 'booking') {
    if (company) title = `${company} refund`
    lines = [line('refund', 'Refund of the booking', currency, 'likely')]
    steps = [
      step('terms', 'Check the booking\'s cancellation terms'),
      step('send', 'Ask for the refund in writing and save the reference'),
      step('bank', 'No answer? Ask your bank about a chargeback'),
    ]
  }
  else {
    lines = [line('amount', 'What you paid', currency, 'likely')]
    steps = [
      step('collect', 'Collect receipts and screenshots'),
      step('send', 'Send the claim and save its reference'),
    ]
  }

  const out: ClaimDraft = { kind, title, status: 'draft', lines, steps }
  if (company) out.company = company
  if (reference) out.reference = reference
  if (incident) out.incident = incident
  if (deadline) out.deadline = deadline
  return out
}

/** The date a template step gets once the claim is sent: a month on, for the step that escalates. */
export function claimEscalateDue(sentOn: string): string {
  return claimAddMonths(sentOn, 1)
}

/** Sent, or past sending: sent, waiting, escalated, paid, partly paid or rejected, or with a date it was sent. */
export function claimSent(c: Pick<Claim, 'status' | 'sentOn'>): boolean {
  return !!c.sentOn || (c.status !== 'draft' && c.status !== 'closed')
}

/** Paid, partly paid, rejected or closed: nothing more to do. */
export function claimSettled(c: Pick<Claim, 'status'>): boolean {
  return c.status === 'paid' || c.status === 'partly' || c.status === 'rejected' || c.status === 'closed'
}

/** Still to send: not deleted, a draft with no date it was sent. Home lists these by their deadline. */
export function claimUnsent(c: Pick<Claim, 'status' | 'sentOn' | 'deleted'>): boolean {
  return !c.deleted && c.status === 'draft' && !c.sentOn
}

/** Days from `today` (YYYY-MM-DD) to the claim's deadline: 0 on the day, below 0 once it has passed; null with none. */
export function claimDays(c: Pick<Claim, 'deadline'>, today: string): number | null {
  return isDate(c.deadline) && isDate(today) ? diffDays(today, c.deadline) : null
}

export type ClaimTone = 'ok' | 'soon' | 'overdue'

/**
 * How the deadline stands: 'overdue' once it has passed, 'soon' within 14 days, else 'ok'. A claim already sent or
 * settled, or with no deadline, is 'ok'.
 */
export function claimTone(c: Pick<Claim, 'deadline' | 'status' | 'sentOn'>, today: string): ClaimTone {
  if (claimSent(c) || claimSettled(c)) return 'ok'
  const n = claimDays(c, today)
  if (n === null) return 'ok'
  if (n < 0) return 'overdue'
  return n <= 14 ? 'soon' : 'ok'
}

/**
 * The line under a claim's title: "Send by 8 Dec · 55 days left" (1 day left, today, 3 days late) while it isn't
 * sent; "Sent 12 Oct · answer due by 12 Nov", then "Sent 12 Oct · no answer after a month: escalate"; null when it is
 * settled or there is nothing to say. The tone as claimTone; a sent claim past its month is 'soon'.
 */
export function claimDeadlineLine(c: Pick<Claim, 'deadline' | 'status' | 'sentOn'>, today: string): { text: string, tone: ClaimTone } | null {
  if (claimSettled(c)) return null
  if (!claimSent(c)) {
    const n = claimDays(c, today)
    if (n === null) return null
    const when = n > 1 ? `${n} days left` : n === 1 ? '1 day left' : n === 0 ? 'today' : n === -1 ? '1 day late' : `${-n} days late`
    return { text: `Send by ${fmtDate(c.deadline!, 'dayMonth')} · ${when}`, tone: claimTone(c, today) }
  }
  if (!isDate(c.sentOn)) return null
  const sent = `Sent ${fmtDate(c.sentOn, 'dayMonth')}`
  if (c.status === 'escalated') return { text: `${sent} · escalated`, tone: 'ok' }
  const due = claimEscalateDue(c.sentOn)
  if (isDate(today) && diffDays(today, due) < 0) return { text: `${sent} · no answer after a month: escalate`, tone: 'soon' }
  return { text: `${sent} · answer due by ${fmtDate(due, 'dayMonth')}`, tone: 'ok' }
}

/** The claim's currency: its first line's, else `fallback`. */
export function claimCurrency(c: Pick<Claim, 'lines'>, fallback = 'EUR'): string {
  return c.lines?.find(l => l?.currency)?.currency || fallback
}

/** An amount as whole cents, 0 when it isn't a usable amount (missing, text, negative). */
function cents(x: unknown): number {
  return typeof x === 'number' && Number.isFinite(x) && x > 0 ? Math.round(x * 100) : 0
}

export interface ClaimTotals {
  currency: string
  /** Every line. */
  total: number
  /** Lines that are sure or likely to be paid. */
  likely: number
  /** What was paid back so far. */
  paid: number
  /** Costs from the Costs ledger linked to the claim (Expense.claimId). */
  linked: number
  /** How many costs are linked. */
  linkedCount: number
}

/**
 * A claim's sums in its currency (claimCurrency), made in whole cents: every line, the sure and likely ones, what was
 * paid, and the live costs linked to it. Lines and costs in another currency are left out rather than counted at the
 * wrong value.
 */
export function claimTotals(c: Pick<Claim, 'id' | 'lines'>, expenses?: Readonly<Record<string, Expense>> | readonly Expense[] | null, fallback = 'EUR'): ClaimTotals {
  const currency = claimCurrency(c, fallback)
  let total = 0
  let likely = 0
  let paid = 0
  for (const l of c.lines ?? []) {
    if (!l || (l.currency && l.currency !== currency)) continue
    const a = cents(l.amount)
    total += a
    if (l.odds === 'sure' || l.odds === 'likely') likely += a
    paid += cents(l.paid)
  }
  let linked = 0
  let linkedCount = 0
  const list = Array.isArray(expenses) ? expenses : Object.values(expenses ?? {})
  for (const e of list as Expense[]) {
    if (!e || e.deleted || e.claimId !== c.id || (e.currency && e.currency !== currency)) continue
    linked += cents(e.amount)
    linkedCount++
  }
  return { currency, total: total / 100, likely: likely / 100, paid: paid / 100, linked: linked / 100, linkedCount }
}

/** Steps done and all of them ("2 of 6"). */
export function claimStepsDone(c: Pick<Claim, 'steps'>): { done: number, total: number } {
  const steps = c.steps ?? []
  return { done: steps.filter(s => s?.done).length, total: steps.length }
}

/** The order claims are listed in: to send (by deadline), then sent, then settled; newest first within each. */
export function claimSort(a: Claim, b: Claim): number {
  const rank = (c: Claim) => (claimSettled(c) ? 2 : claimSent(c) ? 1 : 0)
  const ra = rank(a)
  const rb = rank(b)
  if (ra !== rb) return ra - rb
  if (ra === 0) {
    const da = a.deadline ?? '9999-12-31'
    const db = b.deadline ?? '9999-12-31'
    if (da !== db) return da < db ? -1 : 1
  }
  return (b.at ?? '').localeCompare(a.at ?? '')
}
