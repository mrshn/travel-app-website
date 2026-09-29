import { describe, expect, it } from 'vitest'
import {
  addDays, datesBetween, diffDays, fmtClock, fmtCountdown, fmtDuration, fmtRange, fmtRelDay,
  parseClock, tripMoment, zoned, zonedToDate, zoneGap,
} from '../shared/utils/time'

const trip = {
  start: '2026-10-08',
  end: '2026-10-12',
  timezone: 'Europe/Rome',
  days: ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'].map(date => ({ date })),
}

describe('zoned clock', () => {
  it('reads Rome wall-clock time (CEST, UTC+2)', () => {
    expect(zoned(new Date('2026-10-09T08:30:00Z'), 'Europe/Rome')).toMatchObject({ date: '2026-10-09', minutes: 630 })
  })

  it('turns a Rome wall-clock time into an instant, past midnight too', () => {
    expect(zonedToDate('2026-10-09', 630, 'Europe/Rome').toISOString()).toBe('2026-10-09T08:30:00.000Z')
    expect(zonedToDate('2026-10-09', 1500, 'Europe/Rome').toISOString()).toBe('2026-10-09T23:00:00.000Z')
    // After the end of summer time (25 Oct 2026) Rome is UTC+1.
    expect(zonedToDate('2026-10-26', 600, 'Europe/Rome').toISOString()).toBe('2026-10-26T09:00:00.000Z')
  })

  it('measures the gap between two zones', () => {
    expect(zoneGap(new Date('2026-10-09T08:30:00Z'), 'Europe/Rome', 'Europe/Istanbul')).toBe(60)
  })
})

describe('trip moment', () => {
  it('is "before" ahead of the trip', () => {
    const m = tripMoment(trip, new Date('2026-09-29T10:00:00Z'))
    expect(m.phase).toBe('before')
    expect(m.daysToStart).toBe(9)
  })

  it('finds the day and minute during the trip', () => {
    const m = tripMoment(trip, new Date('2026-10-09T08:30:00Z'))
    expect(m).toMatchObject({ phase: 'during', dayIndex: 1, dayDate: '2026-10-09', minutes: 630 })
  })

  it('counts the small hours to the night before', () => {
    const m = tripMoment(trip, new Date('2026-10-10T00:30:00Z')) // 02:30 Saturday in Rome
    expect(m).toMatchObject({ phase: 'during', dayIndex: 1, dayDate: '2026-10-09', minutes: 1590 })
  })

  it('does not roll the first morning back to before the trip', () => {
    const m = tripMoment(trip, new Date('2026-10-08T01:00:00Z')) // 03:00 Thursday
    expect(m).toMatchObject({ phase: 'during', dayIndex: 0, minutes: 180 })
  })

  it('is "after" once the last day is over', () => {
    expect(tripMoment(trip, new Date('2026-10-13T10:00:00Z')).phase).toBe('after')
  })
})

describe('formatting', () => {
  it('formats clocks and durations', () => {
    expect(fmtClock(870)).toBe('14:30')
    expect(fmtClock(1500)).toBe('01:00')
    expect(fmtClock(-30)).toBe('23:30')
    expect(fmtDuration(45)).toBe('45 min')
    expect(fmtDuration(75)).toBe('1 h 15 min')
    expect(fmtDuration(120)).toBe('2 h')
    expect(fmtDuration(60 * 27)).toBe('1 d 3 h')
    expect(fmtCountdown(3 * 86_400_000 + 4 * 3_600_000)).toBe('3 d 4 h')
    expect(fmtCountdown(2 * 3_600_000 + 5 * 60_000)).toBe('2 h 05')
  })

  it('parses clocks', () => {
    expect(parseClock('7:05')).toBe(425)
    expect(parseClock('14.30')).toBe(870)
    expect(parseClock('1430')).toBe(870)
    expect(parseClock('25:00')).toBe(1500)
    expect(parseClock('nope')).toBeNull()
  })

  it('formats dates and ranges', () => {
    expect(fmtRange('2026-10-08', '2026-10-12')).toBe('8–12 Oct 2026')
    expect(fmtRange('2026-09-28', '2026-10-03')).toBe('28 Sep – 3 Oct 2026')
    expect(fmtRelDay('2026-10-01', '2026-09-29')).toBe('in 2 days')
    expect(fmtRelDay('2026-09-28', '2026-09-29')).toBe('yesterday')
  })

  it('does date arithmetic', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(diffDays('2026-10-08', '2026-10-12')).toBe(4)
    expect(datesBetween('2026-10-08', '2026-10-10')).toEqual(['2026-10-08', '2026-10-09', '2026-10-10'])
  })
})
