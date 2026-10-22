import type { Trip } from '../types/trip'
import { addDays, fmtClock, fmtDate } from './time'

/**
 * Say hi (Meet people, docs/design/2026-10-14-together.md section 13): lines to start a chat, keep it going, make a
 * plan and wrap up, after the "meeting people" sheet a solo traveller used on the Rome trip (9 Oct 2026). Plain
 * English for any city, the trip's own phrases in the local language, and invites made from the plan's next stops.
 * Pure: the page passes in your first name and the stops.
 */

export interface TalkLine {
  id: string
  text: string
}

export interface TalkGroup {
  id: string
  title: string
  /** One line under the title ("Start with facts, then ask how it felt"). */
  hint?: string
  lines: TalkLine[]
}

export interface TalkContext {
  /** Your first name; '' when the app doesn't know it. */
  name: string
  /** Where the trip goes ("Rome"). */
  city: string
}

/** How many people to say hi to in a day: the goal on Meet people. */
export const TALK_GOAL = 5

/** Three rules, shown above the lines. */
export const TALK_RULES: readonly { id: string, title: string, text: string }[] = Object.freeze([
  { id: 'three-seconds', title: 'Go within three seconds', text: 'If you think of saying hi, say it now. Waiting only makes it harder.' },
  { id: 'ask-two', title: 'Ask two, share one', text: 'Two questions, then one thing about you. Listen for the next question.' },
  { id: 'invite', title: 'End with an invite', text: 'A good chat ends with a plan: say the place and the time.' },
])

const city = (c: TalkContext) => c.city.trim() || 'town'

/** Openers by situation. */
export function talkStart(c: TalkContext): TalkGroup[] {
  const me = c.name ? `Hey, I'm ${c.name}.` : 'Hey there.'
  return [
    {
      id: 'hostel',
      title: 'Where you\'re staying',
      lines: [
        { id: 'hostel-in', text: `${me} Just got in. How long are you staying?` },
        { id: 'hostel-from', text: 'Where are you coming from?' },
        { id: 'hostel-best', text: `What's the best thing you've done in ${city(c)} so far?` },
      ],
    },
    {
      id: 'bar',
      title: 'At the bar',
      lines: [
        { id: 'bar-seat', text: 'Is this seat taken?' },
        { id: 'bar-drink', text: 'What are you drinking? Is it any good?' },
      ],
    },
    {
      id: 'group',
      title: 'A group or an event',
      lines: [
        { id: 'group-crawl', text: c.name ? `Is this the pub crawl group? I'm ${c.name}.` : 'Is this the pub crawl group?' },
        { id: 'group-join', text: 'Mind if I join you? I\'m on my own tonight.' },
      ],
    },
    {
      id: 'anywhere',
      title: 'Anywhere',
      lines: [
        { id: 'any-arrived', text: 'I just got here. What did I miss?' },
        { id: 'any-first', text: `First time in ${city(c)}. What shouldn't I miss?` },
      ],
    },
  ]
}

/** Questions and replies that keep a chat going. */
export function talkKeepGoing(c: TalkContext): TalkGroup[] {
  return [
    {
      id: 'ask',
      title: 'Ask',
      hint: 'Start with facts, then ask how it felt.',
      lines: [
        { id: 'ask-why', text: `What brought you to ${city(c)}?` },
        { id: 'ask-food', text: 'What\'s the best thing you\'ve eaten here?' },
        { id: 'ask-next', text: 'Where are you going after this?' },
        { id: 'ask-best', text: 'What was the best part of your day?' },
      ],
    },
    {
      id: 'more',
      title: 'Keep them talking',
      lines: [
        { id: 'more-tell', text: 'No way. Tell me more.' },
        { id: 'more-how', text: 'How did that happen?' },
        { id: 'more-same', text: 'Same here. What did you think of it?' },
      ],
    },
    {
      id: 'locals',
      title: 'With people who live here',
      lines: [
        { id: 'local-eat', text: 'Where do people from here really eat?' },
        { id: 'local-word', text: 'What\'s one word I should learn?' },
        { id: 'local-tonight', text: 'Where would you go tonight?' },
      ],
    },
  ]
}

/** A stop an invite can be made from: the plan's own, as the page resolves it. */
export interface TalkStop {
  id: string
  title: string
  /** Minutes after midnight of its day (after 1440 on a night out). */
  start: number
  /** Its day, YYYY-MM-DD. */
  date: string
}

export interface TalkInvite extends TalkLine {
  stopId: string
}

/**
 * "tonight at 21:30", "today at 17:15", "tomorrow at 08:30", "on Sunday at 18:10": when a stop is, said from `today`
 * (the trip's date now, or '' before the trip). A night out after midnight is still tonight.
 */
export function talkWhen(s: Pick<TalkStop, 'start' | 'date'>, today: string): string {
  const at = `at ${fmtClock(s.start)}`
  if (today && s.date === today) return `${s.start >= 18 * 60 ? 'tonight' : 'today'} ${at}`
  if (today && s.date === addDays(today, 1)) return `tomorrow ${at}`
  return `on ${fmtDate(s.date, 'weekdayLong')} ${at}`
}

/** "Pub crawl, tonight at 21:30. Want to come with me?" for the next stops (at most `max`), in plan order. */
export function talkInvites(stops: readonly TalkStop[], today: string, max = 4): TalkInvite[] {
  return stops.slice(0, max).map(s => ({
    id: `invite-${s.id}`,
    stopId: s.id,
    text: `${s.title.trim()}, ${talkWhen(s, today)}. Want to come with me?`,
  }))
}

/** Swapping contacts, and the message for the next day. */
export function talkFollowUp(c: TalkContext): TalkGroup[] {
  return [
    {
      id: 'swap',
      title: 'Swap contacts',
      lines: [{ id: 'swap-links', text: 'Let\'s swap, so we can find each other later.' }],
    },
    {
      id: 'next-day',
      title: 'The next day',
      lines: [{ id: 'next-aperitivo', text: `${c.name ? `Hey, it's ${c.name} from last night.` : 'Hey, great to meet you last night.'} Aperitivo today at 19:00?` }],
    },
  ]
}

/** Reading the moment, consent and safety; then lines to leave on. */
export function talkWrapUp(): TalkGroup[] {
  return [
    {
      id: 'respect',
      title: 'Read the moment',
      lines: [
        { id: 'respect-no', text: 'One no is enough. Smile, say “no worries” and move on.' },
        { id: 'respect-signs', text: 'Short answers, eyes on the phone or a step back mean it\'s time to wrap up.' },
        { id: 'respect-kiss', text: 'Ask before a kiss: “Can I kiss you?” Only a clear yes is a yes.' },
        { id: 'respect-bar', text: 'Choose the bar yourself, and say no to anyone who brings you to one.' },
      ],
    },
    {
      id: 'exits',
      title: 'Lines to leave on',
      lines: [
        { id: 'exit-great', text: 'Great to meet you. Enjoy the rest of your trip.' },
        { id: 'exit-friends', text: 'I\'m going to find my friends. See you around.' },
        { id: 'exit-swap', text: 'I\'m heading off. Let\'s swap if you want to meet up again.' },
      ],
    },
  ]
}

/** The respect group's lines are advice, not things to say: the page shows them without quotes and copy buttons. */
export const TALK_ADVICE_GROUPS: readonly string[] = Object.freeze(['respect'])

const COUNTRY_LANGS: Record<string, string> = {
  'italy': 'it-IT',
  'spain': 'es-ES',
  'france': 'fr-FR',
  'germany': 'de-DE',
  'austria': 'de-AT',
  'portugal': 'pt-PT',
  'brazil': 'pt-BR',
  'mexico': 'es-MX',
  'argentina': 'es-AR',
  'greece': 'el-GR',
  'netherlands': 'nl-NL',
  'belgium': 'nl-BE',
  'turkey': 'tr-TR',
  'türkiye': 'tr-TR',
  'turkiye': 'tr-TR',
  'czechia': 'cs-CZ',
  'czech republic': 'cs-CZ',
  'poland': 'pl-PL',
  'hungary': 'hu-HU',
  'croatia': 'hr-HR',
  'japan': 'ja-JP',
  'south korea': 'ko-KR',
  'korea': 'ko-KR',
  'china': 'zh-CN',
  'denmark': 'da-DK',
  'sweden': 'sv-SE',
  'norway': 'nb-NO',
  'finland': 'fi-FI',
}

/** The trip's language for speech ("it-IT"): Trip.lang, else the country's main language; undefined when unknown. */
export function tripLang(trip: Pick<Trip, 'lang' | 'country'>): string | undefined {
  if (trip.lang?.trim()) return trip.lang.trim()
  return COUNTRY_LANGS[(trip.country ?? '').trim().toLowerCase()]
}

/** "Italian" for "it-IT"; undefined when the browser can't name it. */
export function langName(lang: string | undefined): string | undefined {
  if (!lang) return undefined
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(lang.split('-')[0]!)
    return name && name.toLowerCase() !== lang.split('-')[0]!.toLowerCase() ? name : undefined
  }
  catch {
    return undefined
  }
}

/**
 * The local-language lines Say hi shows: the trip's own for meeting people (Trip.meetPhrases), else its useful
 * phrases (Trip.phrases), else none. Each is [what to say, say it like, what it means].
 */
export function talkPhrases(trip: Pick<Trip, 'meetPhrases' | 'phrases'>): [string, string, string][] {
  if (trip.meetPhrases?.length) return trip.meetPhrases
  return trip.phrases ?? []
}

/** A day's count for the goal: whole, 0 to 99. */
export function talkCount(n: unknown): number {
  const x = Math.floor(Number(n))
  return Number.isFinite(x) ? Math.min(99, Math.max(0, x)) : 0
}
