import { describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import {
  socialAgo, socialAudience, socialCanEdit, socialCardTrips, socialCopyTrip, socialFriendsThere, socialGoing, socialGroupJson,
  socialGroupTrip, socialHandle, socialHandleValid, socialInitials, socialLeading, socialMeetupIcs, socialMeetupPassed,
  socialMeetupWhen, socialMessageLine, socialOtherOf, socialOverlap, socialPairId, socialPath, socialPublicPath,
  socialRomanDay, socialSamePlace, socialShareTrip, socialToken, socialTokenValid, socialTravelling, socialUrl, socialVotes,
  socialZonedIso,
} from '../shared/utils/social'
import type { FriendCard, Meetup } from '../shared/types/social'
import type { Trip } from '../shared/types/trip'

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T

describe('ids and links', () => {
  it('pairs two uids the same way round', () => {
    expect(socialPairId('b', 'a')).toBe('a_b')
    expect(socialPairId('a', 'b')).toBe('a_b')
    expect(socialOtherOf('a_b', 'a')).toBe('b')
    expect(socialOtherOf(['a', 'b'], 'b')).toBe('a')
    expect(socialOtherOf('a_b', 'c')).toBe('')
  })

  it('makes unguessable tokens that links accept', () => {
    const a = socialToken()
    const b = socialToken()
    expect(a).toHaveLength(22)
    expect(a).not.toBe(b)
    expect(socialTokenValid(a)).toBe(true)
    expect(socialTokenValid('short')).toBe(false)
    expect(socialTokenValid('has space in it')).toBe(false)
    expect(socialTokenValid(undefined)).toBe(false)
  })

  it('reads handles', () => {
    expect(socialHandle('  @Ana.Travels ')).toBe('ana.travels')
    expect(socialHandleValid('ana.travels')).toBe(true)
    expect(socialHandleValid('an')).toBe(false)
    expect(socialHandleValid('.ana')).toBe(false)
    expect(socialHandleValid('ana..b')).toBe(false)
    expect(socialHandleValid('ana-b')).toBe(false)
    expect(socialHandleValid('a'.repeat(21))).toBe(false)
  })

  it('builds links and knows which paths are public', () => {
    expect(socialPath('friend', 'abc')).toBe('/f/abc')
    expect(socialPath('trip', 'abc')).toBe('/j/abc')
    expect(socialPath('meetup', 'abc')).toBe('/m/abc')
    expect(socialPath('plan', 'abc')).toBe('/p/abc')
    expect(socialUrl('/m/abc', 'https://travela-emre.firebaseapp.com/')).toBe('https://travela-emre.firebaseapp.com/m/abc')
    expect(socialUrl('/m/abc', 'http://127.0.0.1:4173')).toBe('http://127.0.0.1:4173/m/abc')
    for (const p of ['/f/x', '/j/x', '/m/x', '/p/x', '/p/x/']) expect(socialPublicPath(p)).toBe(true)
    for (const p of ['/', '/friends', '/trips/x/now', '/f/', '/f/x/y', '/notes/x']) expect(socialPublicPath(p)).toBe(false)
  })
})

describe('people', () => {
  it('makes initials and audiences', () => {
    expect(socialInitials('Ayşe Çelik')).toBe('AÇ')
    expect(socialInitials('ana')).toBe('A')
    expect(socialInitials('  ')).toBe('?')
    expect(socialAudience('me', ['a', 'me', 'b', 'a', ''])).toEqual(['me', 'a', 'b'])
    expect(socialAudience('me', Array.from({ length: 600 }, (_, i) => `u${i}`))).toHaveLength(500)
  })

  it('lets owners and editors change the plan', () => {
    expect(socialCanEdit('owner')).toBe(true)
    expect(socialCanEdit('editor')).toBe(true)
    expect(socialCanEdit('viewer')).toBe(false)
    expect(socialCanEdit(undefined)).toBe(false)
  })
})

describe('votes and who is in', () => {
  const votes = [
    { stopId: 'pick-fri', uid: 'a', choiceId: 'crawl', at: 3 },
    { stopId: 'pick-fri', uid: 'b', choiceId: 'hostel', at: 1 },
    { stopId: 'pick-fri', uid: 'c', choiceId: 'crawl', at: 2 },
    { stopId: 'other', uid: 'a', choiceId: 'x', at: 1 },
  ]
  it('tallies votes in the order they came', () => {
    const t = socialVotes(votes, 'pick-fri')
    expect(t.get('crawl')).toEqual(['c', 'a'])
    expect(t.get('hostel')).toEqual(['b'])
    expect(socialLeading(t)).toBe('crawl')
    expect(socialLeading(socialVotes(votes.slice(1, 2).concat({ stopId: 'pick-fri', uid: 'z', choiceId: 'crawl', at: 9 }), 'pick-fri'))).toBeNull()
    expect(socialLeading(new Map())).toBeNull()
  })

  it('groups who is in, maybe and out', () => {
    const g = socialGoing([
      { stopId: 's', uid: 'a', going: 'in', at: 2 },
      { stopId: 's', uid: 'b', going: 'maybe', at: 1 },
      { stopId: 's', uid: 'c', going: 'in', at: 1 },
      { stopId: 't', uid: 'd', going: 'out', at: 1 },
    ], 's')
    expect(g).toEqual({ in: ['c', 'a'], maybe: ['b'], out: [] })
  })
})

describe("friends' travel", () => {
  const trip = (destination: string, start: string, end: string) => ({ ...clone(romeTrip), destination, start, end, title: destination }) as Trip
  it('shows friends the trips that are coming or just ended', () => {
    const list = socialCardTrips([trip('Lisbon', '2026-11-05', '2026-11-08'), trip('Rome', '2026-10-08', '2026-10-12'), trip('Paris', '2026-08-01', '2026-08-03')], '2026-10-20')
    expect(list.map(t => t.destination)).toEqual(['Rome', 'Lisbon'])
    expect(list[0]).toEqual({ title: 'Rome', destination: 'Rome', country: 'Italy', start: '2026-10-08', end: '2026-10-12', cover: romeTrip.cover })
  })

  it('matches places and dates', () => {
    expect(socialSamePlace('Rome', 'rome')).toBe(true)
    expect(socialSamePlace('São Paulo', 'Sao Paulo')).toBe(true)
    expect(socialSamePlace('Rome', 'Rome, Italy')).toBe(true)
    expect(socialSamePlace('Rome', 'Romania')).toBe(false)
    expect(socialSamePlace('', '')).toBe(false)
    expect(socialOverlap('2026-10-08', '2026-10-12', '2026-10-12', '2026-10-14')).toBe(true)
    expect(socialOverlap('2026-10-08', '2026-10-12', '2026-10-13', '2026-10-14')).toBe(false)
  })

  const cards: FriendCard[] = [
    { uid: 'ali', showTrips: true, updatedAt: 1, trips: [{ title: 'Rome', destination: 'Rome', start: '2026-10-10', end: '2026-10-13' }] },
    { uid: 'can', showTrips: false, updatedAt: 1, trips: [{ title: 'Rome', destination: 'Rome', start: '2026-10-08', end: '2026-10-12' }] },
    { uid: 'deniz', showTrips: true, updatedAt: 1, trips: [{ title: 'Paris', destination: 'Paris', start: '2026-10-25', end: '2026-10-28' }] },
    { uid: 'ece', showTrips: true, updatedAt: 1, trips: [{ title: 'Tokyo', destination: 'Tokyo', start: '2027-03-01', end: '2027-03-09' }] },
  ]
  it('finds friends in the same place on your dates, only those who show their trips', () => {
    expect(socialFriendsThere(cards, { destination: 'Rome', start: '2026-10-08', end: '2026-10-12' }).map(f => f.uid)).toEqual(['ali'])
  })
  it('lists friends travelling now and soon', () => {
    const r = socialTravelling(cards, '2026-10-11')
    expect(r.now.map(f => f.uid)).toEqual(['ali'])
    expect(r.soon.map(f => f.uid)).toEqual(['deniz'])
  })
})

describe('meetups', () => {
  const m: Meetup = {
    id: 'mx', host: 'a', hostName: 'Ali', hostPhoto: null, title: 'Vatican Museums', note: 'Anyone for the Vatican at 8?',
    place: { name: 'Vatican Museums', lat: 41.9065, lng: 12.4536 }, start: socialZonedIso('2026-10-09', 480, 'Europe/Rome'),
    timezone: 'Europe/Rome', createdAt: 1, updatedAt: 1,
  }
  it('writes times with their offset, after midnight too', () => {
    expect(socialZonedIso('2026-10-09', 480, 'Europe/Rome')).toBe('2026-10-09T08:00:00+02:00')
    expect(socialZonedIso('2026-10-09', 1530, 'Europe/Rome')).toBe('2026-10-10T01:30:00+02:00')
    expect(socialZonedIso('2026-12-01', 600, 'Europe/Rome')).toBe('2026-12-01T10:00:00+01:00')
    expect(socialZonedIso('2026-10-09', 480, 'America/New_York')).toBe('2026-10-09T08:00:00-04:00')
  })
  it('shows when as it is there, and for the viewer', () => {
    expect(socialMeetupWhen(m)).toEqual({ date: '2026-10-09', minutes: 480, label: 'Fri 9 Oct, 08:00', yours: '' })
    expect(socialMeetupWhen(m, 'Europe/Istanbul').yours).toBe('09:00 your time')
    expect(socialMeetupWhen(m, 'America/Los_Angeles').yours).toBe('Thu 8 Oct, 23:00 your time')
    expect(socialMeetupWhen(m, 'Europe/Rome').yours).toBe('')
  })
  it('passes a few hours after it starts', () => {
    const t = Date.parse(m.start)
    expect(socialMeetupPassed(m, t + 3_600_000)).toBe(false)
    expect(socialMeetupPassed(m, t + 5 * 3_600_000)).toBe(true)
  })
  it('makes a calendar file', () => {
    const ics = socialMeetupIcs(m, 'https://x.test/m/mx')
    expect(ics).toContain('DTSTART:20261009T060000Z')
    expect(ics).toContain('DTEND:20261009T073000Z')
    expect(ics).toContain('SUMMARY:Vatican Museums')
    expect(ics).toContain('LOCATION:Vatican Museums 41.9065\\,12.4536')
    expect(ics).toContain('DESCRIPTION:Anyone for the Vatican at 8?\\nhttps://x.test/m/mx')
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })
})

describe('plan links, copies and group trips', () => {
  const mine = { ...clone(romeTrip), id: 'rome-2026-10', seedId: 'rome-2026-10', seedVersion: 'v1', edited: true, group: { id: 'g1', role: 'owner' as const }, tombstones: { 'stop:x::y': '2026-10-01T00:00:00Z' } }
  it('leaves out what is yours from a plan link', () => {
    const s = socialShareTrip(mine)
    for (const k of ['group', 'seedId', 'seedVersion', 'edited', 'tombstones', 'home', 'driverCard'] as const) expect(s[k]).toBeUndefined()
    expect(s.days).toEqual(romeTrip.days)
    const withHome = socialShareTrip(mine, { includeHome: true })
    expect(withHome.home).toEqual(romeTrip.home)
    expect(withHome.group).toBeUndefined()
  })

  it('copies a plan to new dates', () => {
    const c = socialCopyTrip(romeTrip, { id: 'rome-2027-05', now: '2027-01-01T00:00:00.000Z', start: '2027-05-06', from: { share: 'p1', ownerName: 'Ali', title: 'Rome' } })
    expect(c.id).toBe('rome-2027-05')
    expect([c.start, c.end]).toEqual(['2027-05-06', '2027-05-10'])
    expect(c.days.map(d => d.date)).toEqual(['2027-05-06', '2027-05-07', '2027-05-08', '2027-05-09', '2027-05-10'])
    expect(c.days[0]!.num).toBe('VI')
    expect(c.days.map(d => d.id)).toEqual(romeTrip.days.map(d => d.id))
    expect(c.copiedFrom).toEqual({ share: 'p1', ownerName: 'Ali', title: 'Rome' })
    expect(c.createdAt).toBe('2027-01-01T00:00:00.000Z')
    const due = romeTrip.bookings.find(b => b.due)
    if (due) expect(c.bookings.find(b => b.id === due.id)!.due! > due.due!).toBe(true)
    expect(socialCopyTrip(romeTrip, { id: 'x', now: 'n' }).start).toBe(romeTrip.start)
    expect(socialRomanDay(9)).toBe('IX')
    expect(socialRomanDay(28)).toBe('XXVIII')
  })

  it('shares the same plan JSON whoever writes it', () => {
    const owner = socialGroupJson(mine, 'g1')
    const joiner = socialGroupTrip(owner, 'g1', 'g1', 'editor')
    expect(joiner.id).toBe('g1')
    expect(joiner.group).toEqual({ id: 'g1', role: 'editor' })
    expect(socialGroupJson(joiner, 'g1')).toBe(owner)
    const back = socialGroupTrip(owner, 'rome-2026-10', 'g1', 'owner')
    expect(back.id).toBe('rome-2026-10')
    expect(back.seedId).toBeUndefined()
    expect(JSON.parse(owner).tombstones).toEqual(mine.tombstones)
  })
})

describe('lines', () => {
  const now = Date.parse('2026-10-11T12:00:00Z')
  it('says how long ago', () => {
    expect(socialAgo(now - 20_000, now)).toBe('now')
    expect(socialAgo(now - 5 * 60_000, now)).toBe('5 min')
    expect(socialAgo(now - 3 * 3_600_000, now)).toBe('3 h')
    expect(socialAgo(now - 26 * 3_600_000, now)).toBe('yesterday')
    expect(socialAgo(Date.parse('2026-10-07T12:00:00Z'), now)).toBe('Wed')
    expect(socialAgo(Date.parse('2026-09-20T12:00:00Z'), now)).toBe('20 Sep')
  })
  it('puts a message in one line', () => {
    expect(socialMessageLine({ kind: 'text', text: 'Meet at 8?', name: 'Ali Can' })).toBe('Ali: Meet at 8?')
    expect(socialMessageLine({ kind: 'photo', text: '', name: 'Ali' })).toBe('Ali shared a photo')
    expect(socialMessageLine({ kind: 'stop', text: 'here?', name: 'Ali', stopTitle: 'Pantheon' })).toBe('Ali shared Pantheon: here?')
    expect(socialMessageLine({ kind: 'system', text: 'Ali moved Pantheon to 17:30', name: 'Ali' })).toBe('Ali moved Pantheon to 17:30')
  })
})
