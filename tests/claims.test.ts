import { describe, expect, it } from 'vitest'
import { ICONS, ICON_ALIAS } from '../app/utils/icons'
import {
  CLAIM_GUIDE, CLAIM_KINDS, CLAIM_ODDS, CLAIM_STATUSES, claimAddMonths, claimCurrency, claimDays, claimDeadlineLine, claimEscalateDue,
  claimEu261, claimSent, claimSettled, claimSort, claimStepsDone, claimTemplate, claimTone, claimTotals, claimUnsent,
} from '../shared/utils/claims'
import type { Claim, ClaimKind, ClaimLine, Expense } from '../shared/types/trip'

const AT = '2026-10-09T10:00:00.000Z'

function claim(over: Partial<Claim> = {}): Claim {
  return { id: 'cl-1', kind: 'flight-cancelled', title: 'Wizz Air claim', status: 'draft', lines: [], steps: [], at: AT, updatedAt: AT, ...over }
}
function ln(amount: number, odds?: ClaimLine['odds'], over: Partial<ClaimLine> = {}): ClaimLine {
  return { id: `l-${amount}-${odds}`, label: 'x', amount, currency: 'EUR', ...(odds ? { odds } : {}), ...over }
}
function cost(id: string, amount: number, over: Partial<Expense> = {}): Expense {
  return { id, amount, currency: 'EUR', cat: 'transport', at: AT, updatedAt: AT, ...over }
}

describe('kinds and statuses', () => {
  it('has the five templates of spec 5.13, each with a label and a known icon', () => {
    expect(Object.keys(CLAIM_KINDS)).toEqual(['flight-cancelled', 'flight-delayed', 'bag', 'booking', 'other'])
    expect(Object.values(CLAIM_KINDS).map(k => k.label)).toEqual(['Flight cancelled', 'Flight delayed', 'Lost or late bag', 'Booking refund', 'Other'])
    for (const k of Object.values(CLAIM_KINDS)) {
      expect(ICONS[k.icon] ?? ICONS[ICON_ALIAS[k.icon] ?? '']).toBeTruthy()
      expect(k.hint.length).toBeGreaterThan(0)
    }
  })

  it('names every status and how likely a line is', () => {
    expect(Object.keys(CLAIM_STATUSES)).toEqual(['draft', 'sent', 'waiting', 'escalated', 'paid', 'partly', 'rejected', 'closed'])
    expect(CLAIM_STATUSES.partly.label).toBe('Partly paid')
    expect(CLAIM_ODDS).toEqual({ sure: 'Sure', likely: 'Likely', unsure: 'Unsure' })
    expect(CLAIM_GUIDE).toBe('This is a guide, not legal advice.')
  })
})

describe('dates', () => {
  it('adds months, kept to the end of a shorter month', () => {
    expect(claimAddMonths('2026-10-08', 2)).toBe('2026-12-08')
    expect(claimAddMonths('2026-12-31', 2)).toBe('2027-02-28')
    expect(claimAddMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(claimAddMonths('2026-11-30', 3)).toBe('2027-02-28')
    expect(claimAddMonths('2026-10-12', 1)).toBe('2026-11-12')
    expect(claimAddMonths('2026-03-15', -2)).toBe('2026-01-15')
    expect(claimAddMonths('', 1)).toBe('')
    expect(claimAddMonths('8 Oct', 1)).toBe('')
    expect(claimEscalateDue('2026-10-12')).toBe('2026-11-12')
  })
})

describe('EU261 compensation by distance', () => {
  it('is 250 up to 1,500 km, 400 up to 3,500 km, 600 beyond', () => {
    expect(claimEu261(860)).toBe(250)
    expect(claimEu261(1500)).toBe(250)
    expect(claimEu261(1500.5)).toBe(400)
    expect(claimEu261(3500)).toBe(400)
    expect(claimEu261(3501)).toBe(600)
    expect(claimEu261(9000)).toBe(600)
  })

  it('is nothing without a distance, and for a delay only at 3 hours or more on arrival', () => {
    expect(claimEu261(0)).toBe(0)
    expect(claimEu261(-5)).toBe(0)
    expect(claimEu261(Number.NaN)).toBe(0)
    expect(claimEu261(800, 2.9)).toBe(0)
    expect(claimEu261(800, 3)).toBe(250)
    expect(claimEu261(2000, 4)).toBe(400)
    expect(claimEu261(2000, Number.NaN)).toBe(0)
  })
})

describe('templates', () => {
  it('a cancelled flight: the five lines, three steps and a deadline two months on', () => {
    const c = claimTemplate('flight-cancelled', { incident: '2026-10-08', company: ' Wizz Air ', currency: 'EUR', reference: 'TMICKP', km: 860 })
    expect(c.title).toBe('Wizz Air claim')
    expect(c).toMatchObject({ kind: 'flight-cancelled', status: 'draft', company: 'Wizz Air', reference: 'TMICKP', incident: '2026-10-08', deadline: '2026-12-08' })
    expect(c.lines.map(l => l.label)).toEqual([
      'Refund of the ticket', 'Extra cost of the new ticket', 'Meals and transport while waiting', 'Fixed compensation (EU261)', 'Unused accommodation',
    ])
    expect(c.lines.map(l => l.amount)).toEqual([0, 0, 0, 250, 0])
    expect(c.lines.every(l => l.currency === 'EUR' && !!l.odds)).toBe(true)
    expect(c.steps).toEqual([
      { id: 'collect', text: 'Collect receipts and screenshots' },
      { id: 'send', text: 'Send the claim through the airline\'s form and save its reference', due: '2026-12-08' },
      { id: 'escalate', text: 'No answer within a month? Complain to the national enforcement body' },
    ])
    expect(new Set(c.lines.map(l => l.id)).size).toBe(c.lines.length)
    expect('id' in c || 'at' in c || 'updatedAt' in c).toBe(false)
  })

  it('without a company, distance or date: named after its kind, no compensation amount, no deadline', () => {
    const c = claimTemplate('flight-cancelled', { currency: 'TRY' })
    expect(c.title).toBe('Flight cancelled')
    expect(c.deadline).toBeUndefined()
    expect(c.incident).toBeUndefined()
    expect(c.lines.find(l => l.id === 'eu261')?.amount).toBe(0)
    expect(c.lines.every(l => l.currency === 'TRY')).toBe(true)
    expect(c.steps.find(s => s.id === 'send')?.due).toBeUndefined()
    expect(Object.values(c).some(v => v === undefined)).toBe(false)
  })

  it('a delayed flight: compensation only when 3 hours or more late', () => {
    const short = claimTemplate('flight-delayed', { incident: '2026-10-08', currency: 'EUR', km: 860, delayHours: 2 })
    expect(short.lines.some(l => l.id === 'eu261')).toBe(false)
    expect(short.title).toBe('Flight delayed')
    const long = claimTemplate('flight-delayed', { incident: '2026-10-08', currency: 'EUR', km: 2000, delayHours: 3.5 })
    expect(long.lines.find(l => l.id === 'eu261')?.amount).toBe(400)
    expect(long.deadline).toBe('2026-12-08')
  })

  it('a lost or late bag: report it that day, claim in writing within 7 days', () => {
    const c = claimTemplate('bag', { incident: '2026-10-12', company: 'Pegasus', currency: 'EUR' })
    expect(c.title).toBe('Pegasus bag claim')
    expect(c.deadline).toBe('2026-10-19')
    expect(c.steps[0]).toMatchObject({ id: 'report', due: '2026-10-12' })
    expect(c.steps.find(s => s.id === 'send')).toMatchObject({ text: 'Claim in writing: within 7 days for damage, 21 days for a late bag', due: '2026-10-19' })
  })

  it('a booking refund and anything else have no deadline', () => {
    const b = claimTemplate('booking', { incident: '2026-10-08', company: 'Yellowsquare', currency: 'EUR' })
    expect(b.title).toBe('Yellowsquare refund')
    expect(b.deadline).toBeUndefined()
    expect(b.lines.map(l => l.label)).toEqual(['Refund of the booking'])
    const o = claimTemplate('other', { currency: 'EUR' })
    expect(o.title).toBe('Other')
    expect(o.deadline).toBeUndefined()
    expect(o.lines).toHaveLength(1)
  })

  it('writes no em dash', () => {
    const dash = String.fromCharCode(0x2014)
    const kinds = Object.keys(CLAIM_KINDS) as ClaimKind[]
    const texts = kinds.flatMap((k) => {
      const c = claimTemplate(k, { incident: '2026-10-08', company: 'X', currency: 'EUR', km: 900 })
      return [c.title, ...c.lines.map(l => l.label), ...c.steps.map(s => s.text), CLAIM_KINDS[k].label, CLAIM_KINDS[k].hint]
    })
    texts.push(...Object.values(CLAIM_STATUSES).map(s => s.label))
    expect(texts.filter(t => t.includes(dash))).toEqual([])
  })
})

describe('deadlines and tones', () => {
  const wizz = claim({ deadline: '2026-12-08' })

  it('counts the days left to the deadline', () => {
    expect(claimDays(wizz, '2026-10-14')).toBe(55)
    expect(claimDays(wizz, '2026-12-08')).toBe(0)
    expect(claimDays(wizz, '2026-12-10')).toBe(-2)
    expect(claimDays(claim(), '2026-10-14')).toBeNull()
  })

  it('is soon within 14 days, overdue once passed, else ok', () => {
    expect(claimTone(wizz, '2026-10-14')).toBe('ok')
    expect(claimTone(wizz, '2026-11-23')).toBe('ok')
    expect(claimTone(wizz, '2026-11-24')).toBe('soon')
    expect(claimTone(wizz, '2026-12-08')).toBe('soon')
    expect(claimTone(wizz, '2026-12-09')).toBe('overdue')
    expect(claimTone(claim(), '2026-12-09')).toBe('ok')
  })

  it('a claim sent or settled is ok whatever its deadline', () => {
    expect(claimTone({ ...wizz, sentOn: '2026-10-12' }, '2026-12-20')).toBe('ok')
    expect(claimTone({ ...wizz, status: 'sent' }, '2026-12-20')).toBe('ok')
    expect(claimTone({ ...wizz, status: 'closed' }, '2026-12-20')).toBe('ok')
  })

  it('says how the deadline stands, in the copy of spec 5.8', () => {
    expect(claimDeadlineLine(wizz, '2026-10-14')).toEqual({ text: 'Send by 8 Dec · 55 days left', tone: 'ok' })
    expect(claimDeadlineLine(wizz, '2026-12-07')).toEqual({ text: 'Send by 8 Dec · 1 day left', tone: 'soon' })
    expect(claimDeadlineLine(wizz, '2026-12-08')).toEqual({ text: 'Send by 8 Dec · today', tone: 'soon' })
    expect(claimDeadlineLine(wizz, '2026-12-09')).toEqual({ text: 'Send by 8 Dec · 1 day late', tone: 'overdue' })
    expect(claimDeadlineLine(wizz, '2026-12-11')).toEqual({ text: 'Send by 8 Dec · 3 days late', tone: 'overdue' })
    expect(claimDeadlineLine(claim(), '2026-10-14')).toBeNull()
  })

  it('once sent, when an answer is due, then to escalate; nothing once settled', () => {
    const sent = { ...wizz, status: 'sent' as const, sentOn: '2026-10-12' }
    expect(claimDeadlineLine(sent, '2026-10-14')).toEqual({ text: 'Sent 12 Oct · answer due by 12 Nov', tone: 'ok' })
    expect(claimDeadlineLine(sent, '2026-11-12')).toEqual({ text: 'Sent 12 Oct · answer due by 12 Nov', tone: 'ok' })
    expect(claimDeadlineLine(sent, '2026-11-13')).toEqual({ text: 'Sent 12 Oct · no answer after a month: escalate', tone: 'soon' })
    expect(claimDeadlineLine({ ...sent, status: 'escalated' }, '2026-11-20')).toEqual({ text: 'Sent 12 Oct · escalated', tone: 'ok' })
    expect(claimDeadlineLine({ ...sent, status: 'paid' }, '2026-11-20')).toBeNull()
    expect(claimDeadlineLine({ ...wizz, status: 'waiting' }, '2026-11-20')).toBeNull()
  })

  it('knows a claim to send, a sent one and a settled one', () => {
    expect(claimUnsent(wizz)).toBe(true)
    expect(claimUnsent({ ...wizz, sentOn: '2026-10-12' })).toBe(false)
    expect(claimUnsent({ ...wizz, status: 'sent' })).toBe(false)
    expect(claimUnsent({ ...wizz, deleted: true })).toBe(false)
    expect(claimSent({ ...wizz, status: 'waiting' })).toBe(true)
    expect(claimSent({ ...wizz, status: 'closed' })).toBe(false)
    expect(claimSent({ ...wizz, status: 'closed', sentOn: '2026-10-12' })).toBe(true)
    expect(claimSettled({ ...wizz, status: 'partly' })).toBe(true)
    expect(claimSettled({ ...wizz, status: 'escalated' })).toBe(false)
  })
})

describe('totals', () => {
  it('sums every line, the sure and likely ones, what was paid and the linked costs, in cents', () => {
    const c = claim({
      lines: [
        ln(74.4, 'sure', { paid: 74.4 }),
        ln(254.99, 'likely'),
        ln(250, 'unsure'),
        ln(0, 'likely'),
        ln(12.5),
      ],
    })
    const t = claimTotals(c, {
      a: cost('a', 254.99, { claimId: 'cl-1' }),
      b: cost('b', 18.3, { claimId: 'cl-1' }),
      c: cost('c', 99, { claimId: 'cl-1', deleted: true }),
      d: cost('d', 40, { claimId: 'cl-2' }),
      e: cost('e', 7, { claimId: 'cl-1', currency: 'TRY' }),
      f: cost('f', 3.5),
    })
    expect(t).toEqual({ currency: 'EUR', total: 591.89, likely: 329.39, paid: 74.4, linked: 273.29, linkedCount: 2 })
  })

  it('adds in whole cents: no float error', () => {
    const t = claimTotals(claim({ lines: [ln(0.1, 'sure'), ln(0.2, 'likely'), ln(0.7, 'unsure', { paid: 0.1 }), ln(0.2, 'unsure', { paid: 0.2 })] }), [cost('x', 0.1, { claimId: 'cl-1' }), cost('y', 0.2, { claimId: 'cl-1' })])
    expect(t.total).toBe(1.2)
    expect(t.likely).toBe(0.3)
    expect(t.paid).toBe(0.3)
    expect(t.linked).toBe(0.3)
  })

  it('leaves out lines in another currency and amounts that are not amounts', () => {
    const c = claim({ lines: [ln(10, 'sure'), ln(20, 'sure', { currency: 'TRY' }), ln(-5, 'sure'), { ...ln(1, 'sure'), amount: Number.NaN }] })
    expect(claimCurrency(c)).toBe('EUR')
    expect(claimTotals(c, null).total).toBe(10)
    expect(claimTotals(claim(), undefined, 'GBP')).toEqual({ currency: 'GBP', total: 0, likely: 0, paid: 0, linked: 0, linkedCount: 0 })
  })

  it('counts steps done', () => {
    const c = claim({ steps: [{ id: 'a', text: 'a', done: true }, { id: 'b', text: 'b' }, { id: 'c', text: 'c', done: true }] })
    expect(claimStepsDone(c)).toEqual({ done: 2, total: 3 })
  })
})

describe('order', () => {
  it('lists claims to send by deadline, then sent ones, then settled ones', () => {
    const list = [
      claim({ id: 'paid', status: 'paid', at: '2026-10-20T00:00:00Z' }),
      claim({ id: 'sent', status: 'sent', sentOn: '2026-10-12' }),
      claim({ id: 'late', deadline: '2026-12-08' }),
      claim({ id: 'soon', deadline: '2026-10-19' }),
      claim({ id: 'none' }),
    ]
    expect([...list].sort(claimSort).map(c => c.id)).toEqual(['soon', 'late', 'none', 'sent', 'paid'])
  })
})
