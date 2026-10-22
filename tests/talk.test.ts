import { describe, expect, it } from 'vitest'
import { SEED_TRIPS } from '../app/data/trips'
import { TALK_ADVICE_GROUPS, TALK_GOAL, TALK_RULES, langName, talkCount, talkFollowUp, talkInvites, talkKeepGoing, talkPhrases, talkStart, talkWhen, talkWrapUp, tripLang } from '../shared/utils/talk'

const EM_DASH = String.fromCharCode(0x2014)
const all = (groups: { lines: { text: string }[] }[]) => groups.flatMap(g => g.lines.map(l => l.text))

describe('Say hi lines', () => {
  it('fill in your first name and the city, and read well without a name', () => {
    const named = all(talkStart({ name: 'Ada', city: 'Lisbon' }))
    expect(named).toContain('Hey, I\'m Ada. Just got in. How long are you staying?')
    expect(named).toContain('Is this the pub crawl group? I\'m Ada.')
    expect(named).toContain('First time in Lisbon. What shouldn\'t I miss?')
    const anon = all(talkStart({ name: '', city: '' }))
    expect(anon).toContain('Hey there. Just got in. How long are you staying?')
    expect(anon).toContain('Is this the pub crawl group?')
    expect(anon.join(' ')).not.toMatch(/I'm \.|in \.|undefined|null/)
    expect(anon).toContain('First time in town. What shouldn\'t I miss?')
  })

  it('give every line a unique id, and keep advice apart from lines to say', () => {
    const c = { name: 'Ada', city: 'Rome' }
    const groups = [...talkStart(c), ...talkKeepGoing(c), ...talkFollowUp(c), ...talkWrapUp()]
    const ids = groups.flatMap(g => g.lines.map(l => l.id))
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(groups.map(g => g.id)).size).toBe(groups.length)
    expect(talkWrapUp().map(g => g.id)).toEqual(['respect', 'exits'])
    expect(TALK_ADVICE_GROUPS).toEqual(['respect'])
    expect(TALK_RULES.map(r => r.title)).toEqual(['Go within three seconds', 'Ask two, share one', 'End with an invite'])
    expect(TALK_GOAL).toBe(5)
  })

  it('write the follow-up with or without a name', () => {
    expect(all(talkFollowUp({ name: 'Ada', city: 'Rome' }))).toContain('Hey, it\'s Ada from last night. Up for a drink today at 19:00?')
    expect(all(talkFollowUp({ name: '', city: 'Rome' }))).toContain('Hey, great to meet you last night. Up for a drink today at 19:00?')
  })

  it('never use an em dash', () => {
    const c = { name: 'Ada', city: 'Rome' }
    const text = [...all(talkStart(c)), ...all(talkKeepGoing(c)), ...all(talkFollowUp(c)), ...all(talkWrapUp()), ...TALK_RULES.flatMap(r => [r.title, r.text])].join('\n')
    expect(text).not.toContain(EM_DASH)
  })
})

describe('invites from the plan', () => {
  const stops = [
    { id: 'pantheon', title: 'Pantheon', start: 17 * 60 + 15, date: '2026-10-09' },
    { id: 'crawl', title: 'Rome\'s Ultimate Party pub crawl', start: 21 * 60 + 30, date: '2026-10-09' },
    { id: 'club', title: 'Visionnaire', start: 25 * 60, date: '2026-10-09' },
    { id: 'colosseum', title: 'Colosseum', start: 8 * 60 + 30, date: '2026-10-10' },
    { id: 'pincio', title: 'Terrazza del Pincio ', start: 18 * 60 + 10, date: '2026-10-11' },
  ]

  it('say when, from the trip\'s day: today, tonight (after midnight too), tomorrow, or the weekday', () => {
    expect(talkWhen(stops[0]!, '2026-10-09')).toBe('today at 17:15')
    expect(talkWhen(stops[1]!, '2026-10-09')).toBe('tonight at 21:30')
    expect(talkWhen(stops[2]!, '2026-10-09')).toBe('tonight at 01:00')
    expect(talkWhen(stops[3]!, '2026-10-09')).toBe('tomorrow at 08:30')
    expect(talkWhen(stops[4]!, '2026-10-09')).toBe('on Sunday at 18:10')
    // Before the trip there is no today: every stop gets its weekday.
    expect(talkWhen(stops[1]!, '')).toBe('on Friday at 21:30')
    // A club after midnight on another day's plan is that day's night, not the morning.
    const satClub = { id: 'sat-club', title: 'Club', start: 25 * 60, date: '2026-10-10' }
    expect(talkWhen(satClub, '2026-10-09')).toBe('tomorrow night at 01:00')
    expect(talkWhen(satClub, '')).toBe('on Saturday night at 01:00')
    expect(talkWhen(satClub, '2026-10-10')).toBe('tonight at 01:00')
  })

  it('make at most four lines in plan order, each pointing at its stop', () => {
    const inv = talkInvites(stops, '2026-10-09')
    expect(inv.map(i => i.stopId)).toEqual(['pantheon', 'crawl', 'club', 'colosseum'])
    expect(inv[1]).toEqual({ id: 'invite-crawl', stopId: 'crawl', text: 'Rome\'s Ultimate Party pub crawl, tonight at 21:30. Want to come with me?' })
    expect(talkInvites(stops, '2026-10-09', 5)[4]!.text).toBe('Terrazza del Pincio, on Sunday at 18:10. Want to come with me?')
    expect(talkInvites([], '2026-10-09')).toEqual([])
  })
})

describe('the local language', () => {
  it('comes from the trip, else from its country, else nowhere', () => {
    expect(tripLang({ lang: 'pt-BR', country: 'Portugal' })).toBe('pt-BR')
    expect(tripLang({ country: 'Italy' })).toBe('it-IT')
    expect(tripLang({ country: ' Türkiye ' })).toBe('tr-TR')
    expect(tripLang({ country: 'Atlantis' })).toBeUndefined()
    expect(tripLang({})).toBeUndefined()
  })

  it('has a name in English when the browser knows it', () => {
    expect(langName('it-IT')).toBe('Italian')
    expect(langName('pt-PT')).toBe('Portuguese')
    expect(langName(undefined)).toBeUndefined()
  })

  it('shows the trip\'s lines for meeting people first, then its useful phrases', () => {
    const p: [string, string, string] = ['Ciao', 'chow', 'Hi']
    const q: [string, string, string] = ['Grazie', 'GRAH-tsee-eh', 'Thanks']
    expect(talkPhrases({ meetPhrases: [p], phrases: [q] })).toEqual([p])
    expect(talkPhrases({ meetPhrases: [], phrases: [q] })).toEqual([q])
    expect(talkPhrases({})).toEqual([])
  })
})

describe('the day\'s count', () => {
  it('is a whole number from 0 to 99', () => {
    expect(talkCount(3)).toBe(3)
    expect(talkCount(2.7)).toBe(2)
    expect(talkCount(-1)).toBe(0)
    expect(talkCount(500)).toBe(99)
    expect(talkCount(undefined)).toBe(0)
    expect(talkCount('x')).toBe(0)
  })
})

describe('the Rome sample', () => {
  const rome = SEED_TRIPS.find(t => t.id === 'rome-sample')!
  it('speaks Italian and has lines for meeting people, each with how to say it and what it means', () => {
    expect(tripLang(rome)).toBe('it-IT')
    expect(rome.meetPhrases?.length).toBeGreaterThanOrEqual(10)
    for (const [say, like, means] of rome.meetPhrases!) {
      expect(say.trim(), 'say').not.toBe('')
      expect(like.trim(), `say it like: ${say}`).not.toBe('')
      expect(means.trim(), `means: ${say}`).not.toBe('')
      expect(`${say}${like}${means}`).not.toContain(EM_DASH)
    }
  })
})
