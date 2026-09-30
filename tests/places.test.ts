import { afterEach, describe, expect, it } from 'vitest'
import { romeTrip } from '../app/data/rome'
import {
  PLACE_SET_ORDER, placeCoreName, placeIsCollectable, placeIsFree, placeLinksForStop, placeNeedsBooking, placeNorm,
  placeOpenOn, placeSetCategory, placeSetOf, placeSetProgress, placeStampDate, placeStamps, placesInPlan,
} from '../shared/utils/places'
import { emptyProgress, planDays, sortStops, type DayPlan } from '../shared/utils/plan'
import { fmtClock, parseClock, tripMoment, zonedToDate } from '../shared/utils/time'
import type { PlaceCard, PlaceSet, Stop, Trip, TripProgress } from '../shared/types/trip'

const trip = romeTrip as Trip
const places = trip.places!
const rome = (date: string, clock: string) => zonedToDate(date, parseClock(clock)!, trip.timezone).toISOString()
const liveFri = tripMoment(trip, new Date(rome('2026-10-09', '16:40')))
const place = (id: string) => places.find(p => p.id === id)!
const plansOf = (p: TripProgress): DayPlan[] => planDays(trip, p, liveFri)
const label = (id: string) => `${place(id).name} (${place(id).category})`

/** Seed S of the spec (section 9): the state of the screenshots, Friday 16:40. */
function seedS(): TripProgress {
  const p = emptyProgress()
  for (const s of trip.days[0]!.stops) p.stops[s.id] = { status: 'done', at: rome('2026-10-08', '23:30') }
  const fri = sortStops(trip.days[1]!.stops).filter(s => s.start < 16 * 60)
  fri.forEach((s, i) => {
    p.stops[s.id] = { status: i === 3 ? 'skipped' : 'done', at: rome('2026-10-09', `${9 + i}:10`) }
  })
  const ratings = [5, 4, 5]
  const spent = [25, 12]
  fri.slice(0, 3).forEach((s, i) => {
    p.feedback[s.id] = { rating: ratings[i], ...(spent[i] ? { spent: spent[i] } : {}), updatedAt: rome('2026-10-09', '15:00') }
  })
  p.dayNotes.thu = { note: 'Landed late, pizza by the hostel.', extraSpent: 9, updatedAt: rome('2026-10-08', '23:59') }
  for (const b of trip.bookings.slice(0, 4)) p.bookings[b.id] = true
  for (const x of trip.packing.slice(0, 12)) p.packing[x] = true
  return p
}

const stamped = (p: TripProgress) => [...placeStamps(trip, p, plansOf(p)).keys()]

describe('sets (Appendix A)', () => {
  it('has 81 cards, 79 of them collectable, in 11 sets', () => {
    expect(places).toHaveLength(81)
    expect(places.filter(placeIsCollectable)).toHaveLength(79)
    const cards: Record<string, number> = {}
    const collectable: Record<string, number> = {}
    for (const p of places) {
      const set = placeSetOf(p)
      cards[set] = (cards[set] ?? 0) + 1
      if (placeIsCollectable(p)) collectable[set] = (collectable[set] ?? 0) + 1
    }
    expect(cards).toEqual({ ancient: 10, art: 7, church: 4, underground: 6, views: 8, pasta: 12, street: 9, sweet: 7, morning: 10, golden: 5, anytime: 3 })
    expect(collectable).toEqual({ ancient: 10, art: 7, church: 4, underground: 6, views: 8, pasta: 11, street: 9, sweet: 6, morning: 10, golden: 5, anytime: 3 })
    expect(places.filter(p => !placeIsCollectable(p)).map(p => p.name)).toEqual(['Tonnarello', 'Antico Caffè Greco'])
  })

  it('puts each place in the set of Appendix A', () => {
    const names = (set: PlaceSet) => places.filter(p => placeSetOf(p) === set).map(p => p.name)
    expect(names('ancient')).toEqual(['Colosseum + Forum + Palatine (24h)', 'Colosseum Full Experience', 'Forum Pass SUPER (no Colosseum)', 'Colosseum night tour', 'Pantheon', 'Largo Argentina walkway', 'Domus Aurea', 'Baths of Caracalla', 'Ostia Antica', 'Appian Way'])
    expect(names('art')).toEqual(['Vatican Museums', 'Borghese Gallery', 'Castel Sant\'Angelo', 'Capitoline Museums', 'Galleria Sciarra', 'Galleria Doria Pamphilj', 'Galleria Spada'])
    expect(names('church')).toEqual(['St Peter\'s Basilica', 'Santa Maria Maggiore', 'St John Lateran', 'Tempietto del Bramante'])
    expect(names('underground')).toEqual(['San Callisto catacombs', 'Domitilla catacombs', 'San Sebastiano catacombs', 'Priscilla catacombs', 'San Clemente (underground levels)', 'Vatican Necropolis (Scavi)'])
    expect(names('views')).toEqual(['St Peter\'s dome', 'Trevi Fountain', 'Spanish Steps', 'Vittoriano + terrace (VIVE)', 'Aventine Keyhole', 'Giardino degli Aranci', 'Villa Borghese park + Pincio', 'Porta Portese flea market'])
    expect(names('street')).toEqual(['L\'Arcangelo', 'Bonci Pizzarium', 'Mercato di Testaccio', 'Mercato Centrale', 'Antico Forno Roscioli', 'Supplì Roma', 'Supplizio', 'Trapizzino', 'Seu Pizza'])
    expect(names('sweet')).toEqual(['Two Sizes', 'Sant\'Eustachio il Caffè', 'Giolitti', 'Pompi', 'Antico Caffè Greco', 'Gelato: Otaleg, Fatamorgana, Gracchi, Fassi', 'Pasticceria Regoli'])
    expect(names('morning')).toEqual(['Trevi Fountain', 'Largo Gaetana Agnesi / Via Nicola Salvi wall', 'Spanish Steps', 'Piazza Navona', 'Pantheon', 'Via della Conciliazione', 'Ponte Sant\'Angelo + river steps', 'Trastevere lanes', 'Aventine Keyhole', 'Giardino degli Aranci'])
    expect(names('golden')).toEqual(['Vittoriano terrace', 'Capitoline terrace', 'Ponte Umberto I', 'Pincio terrace', 'Gianicolo terrace'])
    expect(names('anytime')).toEqual(['Momo staircase', 'Galleria Sciarra', 'Galleria Spada'])
  })

  it('lets an explicit set of the place\'s own category win', () => {
    const regoli = place('food-pasticceria-regoli')
    expect(placeSetOf(regoli)).toBe('sweet')
    expect(placeSetOf({ ...regoli, set: 'street' })).toBe('street')
    expect(placeSetOf({ ...regoli, set: 'food-other' })).toBe('food-other')
    // Not a set, or a set of another category: worked out as usual.
    expect(placeSetOf({ ...regoli, set: 'ancient' })).toBe('sweet')
    expect(placeSetOf({ ...regoli, set: 'bakeries' as PlaceSet })).toBe('sweet')
    expect(placeSetOf({ ...place('photo-momo-staircase'), set: 'golden' })).toBe('golden')
  })

  it('works out sets for places with no known scene or time', () => {
    const base: PlaceCard = { id: 'x', category: 'sight', name: 'Somewhere', text: '', scene: 'nowhere' }
    expect(placeSetOf(base)).toBe('sight-other')
    expect(placeSetOf({ ...base, name: 'The Crypt of the Capuchins (underground)' })).toBe('underground')
    expect(placeSetOf({ ...base, category: 'food' })).toBe('food-other')
    expect(placeSetOf({ ...base, category: 'food', scene: 'colosseum' })).toBe('food-other')
    expect(placeSetOf({ ...base, category: 'sight', scene: 'gelato' })).toBe('sight-other')
    expect(placeSetOf({ ...base, category: 'photo' })).toBe('anytime')
    expect(placeSetOf({ ...base, category: 'photo', bestTime: 'Sunrise, about 7:20' })).toBe('morning')
    expect(placeSetOf({ ...base, category: 'photo', bestTime: '11:59' })).toBe('morning')
    expect(placeSetOf({ ...base, category: 'photo', bestTime: 'From 12:00' })).toBe('golden')
    expect(placeSetOf({ ...base, category: 'photo', bestTime: 'Costs €7.45; best 19:10' })).toBe('golden')
  })

  it('knows the category of each set, in display order', () => {
    expect(PLACE_SET_ORDER).toEqual(['ancient', 'art', 'church', 'underground', 'views', 'sight-other', 'pasta', 'street', 'sweet', 'food-other', 'morning', 'golden', 'anytime'])
    expect(PLACE_SET_ORDER.map(placeSetCategory)).toEqual(['sight', 'sight', 'sight', 'sight', 'sight', 'sight', 'food', 'food', 'food', 'food', 'photo', 'photo', 'photo'])
  })
})

describe('names', () => {
  it('normalises text for whole-word matching', () => {
    expect(placeNorm('Castel Sant\'Angelo + the Angel\'s Terrace')).toBe(' castel santangelo the angels terrace ')
    expect(placeNorm('St Peter’s dome')).toBe(' st peters dome ')
    expect(placeNorm('Supplì Roma')).toBe(' suppli roma ')
    expect(placeNorm('Sant\'Ignazio\'s painted “false dome”')).toBe(' santignazios painted false dome ')
    expect(placeNorm('Top of the Spanish Steps for sunset (18:38)')).toBe(' top of the spanish steps for sunset 18 38 ')
    expect(placeNorm('  Trastevere lanes → Piazza  ')).toBe(' trastevere lanes piazza ')
    expect(placeNorm('')).toBe('')
    expect(placeNorm(' · ')).toBe('')
  })

  it('matches on the core name', () => {
    expect(placeCoreName('Colosseum + Forum + Palatine (24h)')).toBe(' colosseum ')
    expect(placeCoreName('Vittoriano + terrace (VIVE)')).toBe(' vittoriano ')
    expect(placeCoreName('Vatican Necropolis (Scavi)')).toBe(' vatican necropolis ')
    expect(placeCoreName('Gelato: Otaleg, Fatamorgana, Gracchi, Fassi')).toBe(' gelato ')
    expect(placeCoreName('La Tavernaccia da Bruno')).toBe(' tavernaccia da bruno ')
    expect(placeCoreName('La Taverna dei Fori Imperiali')).toBe(' taverna dei fori imperiali ')
    expect(placeCoreName('The Pantheon · inside')).toBe(' pantheon ')
    expect(placeCoreName('Il Sorpasso')).toBe(' sorpasso ')
    expect(placeCoreName('L\'Arcangelo')).toBe(' larcangelo ')
    expect(placeCoreName('La')).toBe(' la ')
  })
})

describe('which stops are which place (Appendix B)', () => {
  function table(p: TripProgress): string[] {
    const rows: string[] = []
    for (const plan of plansOf(p)) {
      for (const s of plan.stops) {
        const ids = placeLinksForStop(s, places)
        if (ids.length) rows.push(`${plan.view.day.id} ${fmtClock(s.start)} | ${s.title} | ${ids.map(label).join(', ')}`)
      }
    }
    return rows
  }

  it('links the default plan (Colosseum on Saturday)', () => {
    expect(table(emptyProgress())).toMatchInlineSnapshot(`
      [
        "fri 08:00 | Vatican Museums + Sistine Chapel | Vatican Museums (sight)",
        "fri 11:15 | Early lunch at Bonci Pizzarium | Bonci Pizzarium (food)",
        "fri 12:15 | St Peter's Basilica + the free Grottoes | St Peter's Basilica (sight)",
        "fri 15:00 | Castel Sant'Angelo + the Angel's Terrace | Castel Sant'Angelo (sight)",
        "fri 17:15 | Pantheon | Pantheon (sight)",
        "fri 17:55 | Galleria Sciarra | Galleria Sciarra (sight)",
        "fri 18:05 | Trevi Fountain | Trevi Fountain (sight)",
        "fri 18:20 | Top of the Spanish Steps for sunset (18:38) | Spanish Steps (sight), Spanish Steps (photo)",
        "fri 19:30 | Dinner at Armando al Pantheon | Armando al Pantheon (food)",
        "sat 08:30 | Colosseum | Colosseum + Forum + Palatine (24h) (sight)",
        "sat 17:45 | Vittoriano: Terrazza delle Quadrighe for sunset (18:37) | Vittoriano + terrace (VIVE) (sight)",
        "sat 19:15 | Via dei Fori Imperiali past the floodlit Colosseum | Colosseum + Forum + Palatine (24h) (sight)",
        "sun 10:00 | Porta Portese flea market | Porta Portese flea market (sight)",
        "sun 10:45 | Trastevere lanes → Piazza di Santa Maria in Trastevere | Trastevere lanes (photo)",
        "sun 11:30 | Tempietto del Bramante (San Pietro in Montorio) | Tempietto del Bramante (sight)",
        "sun 13:00 | Sunday lunch: La Tavernaccia da Bruno | La Tavernaccia da Bruno (food)",
        "sun 14:15 | Borghese Gallery, 15:00–17:00 | Borghese Gallery (sight)",
        "sun 17:00 | Villa Borghese park and its small lake | Villa Borghese park + Pincio (sight)",
        "sun 19:15 | Via Margutta → the Spanish Steps lit up | Spanish Steps (sight), Spanish Steps (photo)",
        "mon 07:00 | Spanish Steps, nearly empty (sunrise 07:19) | Spanish Steps (sight), Spanish Steps (photo)",
        "mon 07:25 | Trevi Fountain from the piazza | Trevi Fountain (sight), Trevi Fountain (photo)",
        "mon 08:30 | Piazza Navona, almost empty | Piazza Navona (photo)",
        "mon 09:00 | Pantheon, first entry at 09:00 | Pantheon (sight)",
      ]
    `)
  })

  it('links the plan with the Colosseum on Sunday', () => {
    const p = emptyProgress()
    p.variant = 'sun'
    expect(table(p)).toMatchInlineSnapshot(`
      [
        "fri 08:00 | Vatican Museums + Sistine Chapel | Vatican Museums (sight)",
        "fri 11:15 | Early lunch at Bonci Pizzarium | Bonci Pizzarium (food)",
        "fri 12:15 | St Peter's Basilica + the free Grottoes | St Peter's Basilica (sight)",
        "fri 15:00 | Castel Sant'Angelo + the Angel's Terrace | Castel Sant'Angelo (sight)",
        "fri 17:15 | Pantheon | Pantheon (sight)",
        "fri 17:55 | Galleria Sciarra | Galleria Sciarra (sight)",
        "fri 18:05 | Trevi Fountain | Trevi Fountain (sight)",
        "fri 18:20 | Top of the Spanish Steps for sunset (18:38) | Spanish Steps (sight), Spanish Steps (photo)",
        "fri 19:30 | Dinner at Armando al Pantheon | Armando al Pantheon (food)",
        "sat 09:45 | Trastevere lanes → Piazza di Santa Maria in Trastevere | Trastevere lanes (photo)",
        "sat 10:45 | Tempietto del Bramante (San Pietro in Montorio) | Tempietto del Bramante (sight)",
        "sat 11:15 | Queue for Da Enzo al 29, then the Gianicolo view | Da Enzo al 29 (food)",
        "sat 17:45 | Vittoriano: Terrazza delle Quadrighe for sunset (18:37) | Vittoriano + terrace (VIVE) (sight)",
        "sat 19:15 | Via dei Fori Imperiali past the floodlit Colosseum | Colosseum + Forum + Palatine (24h) (sight)",
        "sun 08:30 | Colosseum | Colosseum + Forum + Palatine (24h) (sight)",
        "sun 13:15 | Lunch in Monti: Taverna dei Fori Imperiali | La Taverna dei Fori Imperiali (food)",
        "sun 14:15 | Borghese Gallery, 15:00–17:00 | Borghese Gallery (sight)",
        "sun 17:00 | Villa Borghese park and its small lake | Villa Borghese park + Pincio (sight)",
        "sun 19:15 | Via Margutta → the Spanish Steps lit up | Spanish Steps (sight), Spanish Steps (photo)",
        "mon 07:00 | Spanish Steps, nearly empty (sunrise 07:19) | Spanish Steps (sight), Spanish Steps (photo)",
        "mon 07:25 | Trevi Fountain from the piazza | Trevi Fountain (sight), Trevi Fountain (photo)",
        "mon 08:30 | Piazza Navona, almost empty | Piazza Navona (photo)",
        "mon 09:00 | Pantheon, first entry at 09:00 | Pantheon (sight)",
      ]
    `)
  })

  it('links 20 places in the default plan, all 8 top picks among them', () => {
    const linked = new Set(plansOf(emptyProgress()).flatMap(d => d.stops.flatMap(s => placeLinksForStop(s, places))))
    expect([...linked].sort()).toEqual([
      'food-armando-al-pantheon', 'food-bonci-pizzarium', 'food-la-tavernaccia-da-bruno',
      'photo-piazza-navona', 'photo-spanish-steps', 'photo-trastevere-lanes', 'photo-trevi-fountain',
      'sight-borghese-gallery', 'sight-castel-sant-angelo', 'sight-colosseum-forum-palatine-24h', 'sight-galleria-sciarra',
      'sight-pantheon', 'sight-porta-portese-flea-market', 'sight-spanish-steps', 'sight-st-peter-s-basilica',
      'sight-tempietto-del-bramante', 'sight-trevi-fountain', 'sight-vatican-museums', 'sight-villa-borghese-park-pincio',
      'sight-vittoriano-terrace-vive',
    ])
    const top = places.filter(p => p.top).map(p => p.id)
    expect(top).toHaveLength(8)
    for (const id of top) expect(linked.has(id), id).toBe(true)
    for (const id of ['food-tonnarello', 'sight-capitoline-museums', 'photo-pantheon']) expect(linked.has(id), id).toBe(false)
  })

  it('links an explicit place first, and only one that exists', () => {
    const stop: Stop = { id: 'my-lunch', start: 780, timeLabel: '13:00', kind: 'food', title: 'Lunch near the Pantheon', placeId: 'food-supplizio' }
    expect(placeLinksForStop(stop, places)).toEqual(['food-supplizio'])
    expect(placeLinksForStop({ ...stop, choice: { placeId: 'food-trapizzino' } }, places)).toEqual(['food-trapizzino'])
    expect(placeLinksForStop({ ...stop, choice: {} }, places)).toEqual(['food-supplizio'])
    expect(placeLinksForStop({ ...stop, placeId: 'food-gone' }, places)).toEqual([])
    // An explicit link may name a place that isn't collectable (placeStamps ignores it).
    expect(placeLinksForStop({ ...stop, placeId: 'food-tonnarello' }, places)).toEqual(['food-tonnarello'])
    expect(placeLinksForStop({ ...stop, placeId: undefined }, places)).toEqual([])
  })

  it('needs whole words, a fitting kind and a collectable place', () => {
    const s = (title: string, kind: Stop['kind'], icon?: string) => placeLinksForStop({ title, kind, icon }, places)
    expect(s('Pantheon', 'sight')).toEqual(['sight-pantheon'])
    expect(s('Pantheon at dawn', 'sight', 'photo')).toEqual(['sight-pantheon', 'photo-pantheon'])
    expect(s('Dinner at Armando al Pantheon', 'food')).toEqual(['food-armando-al-pantheon'])
    expect(s('Pantheonic views', 'sight')).toEqual([])
    expect(s('Walk past the Pantheon', 'move')).toEqual([])
    expect(s('Pizza at Tonnarello', 'food')).toEqual([])
    expect(s('Trastevere bars', 'night')).toEqual([])
    expect(s('Coffee at Antico Caffè Greco', 'food')).toEqual([])
    expect(s('Gianicolo terrace: the noon cannon', 'sight')).toEqual([])
    expect(s('Sunset from the Gianicolo terrace', 'sight', 'photo')).toEqual(['photo-gianicolo-terrace'])
    expect(s('', 'sight')).toEqual([])
    expect(placeLinksForStop({ title: 'Pantheon', kind: 'sight' })).toEqual([])
  })
})

describe('stamps', () => {
  it('gives Seed S three stamps from done stops', () => {
    const p = seedS()
    const st = placeStamps(trip, p, plansOf(p))
    expect([...st.values()]).toEqual([
      { placeId: 'sight-vatican-museums', at: rome('2026-10-09', '10:10'), via: 'stop', stopId: 'vatican-museums-sistine-chapel' },
      { placeId: 'food-bonci-pizzarium', at: rome('2026-10-09', '11:10'), via: 'stop', stopId: 'early-lunch-at-bonci-pizzarium' },
      { placeId: 'sight-castel-sant-angelo', at: rome('2026-10-09', '14:10'), via: 'stop', stopId: 'castel-sant-angelo-the-angel-s-terrace' },
    ])
    // St Peter's Basilica was skipped: no stamp.
    expect(st.has('sight-st-peter-s-basilica')).toBe(false)
  })

  it('stamps by ticking and unstamps by unticking, with no record (S2)', () => {
    const p = seedS()
    p.stops.pantheon = { status: 'done', at: rome('2026-10-09', '17:20') }
    expect(stamped(p)).toContain('sight-pantheon')
    expect(stamped(p)).not.toContain('photo-pantheon')
    expect(p.stamps).toEqual({})
    delete p.stops.pantheon
    expect(stamped(p)).not.toContain('sight-pantheon')
  })

  it('stamps only the restaurant for a dinner there, and nothing for a night out (S4)', () => {
    const p = seedS()
    p.stops['dinner-at-armando-al-pantheon'] = { status: 'done', at: rome('2026-10-09', '20:00') }
    p.stops['trastevere-bars'] = { status: 'done', at: rome('2026-10-10', '23:10') }
    const st = stamped(p)
    expect(st).toContain('food-armando-al-pantheon')
    expect(st).not.toContain('sight-pantheon')
    expect(st).not.toContain('photo-pantheon')
    expect(st).toHaveLength(4)
  })

  it('stamps by hand with on: true, at the time of the tap (S1)', () => {
    const p = seedS()
    p.stamps!['sight-galleria-doria-pamphilj'] = { on: true, at: rome('2026-10-09', '16:45'), updatedAt: rome('2026-10-09', '16:45') }
    const st = placeStamps(trip, p, plansOf(p))
    expect(st.get('sight-galleria-doria-pamphilj')).toEqual({ placeId: 'sight-galleria-doria-pamphilj', at: rome('2026-10-09', '16:45'), via: 'tap' })
    expect(placeSetProgress(trip, st).find(x => x.set === 'art')).toEqual({ set: 'art', total: 7, stamped: 3, complete: false })
  })

  it('takes a stamp back with on: false, even one a done stop gives, and keeps it off after a new tick (S5)', () => {
    const p = seedS()
    p.stamps!['sight-vatican-museums'] = { on: false, at: rome('2026-10-09', '17:00'), updatedAt: rome('2026-10-09', '17:00') }
    expect(stamped(p)).not.toContain('sight-vatican-museums')
    delete p.stops['vatican-museums-sistine-chapel']
    p.stops['vatican-museums-sistine-chapel'] = { status: 'done', at: rome('2026-10-09', '18:00') }
    expect(stamped(p)).not.toContain('sight-vatican-museums')
  })

  it('treats on: null as no choice: a later tick still stamps', () => {
    const p = seedS()
    p.stamps!['sight-pantheon'] = { on: null, at: rome('2026-10-09', '16:45'), updatedAt: rome('2026-10-09', '16:46') }
    expect(stamped(p)).not.toContain('sight-pantheon')
    p.stops.pantheon = { status: 'done', at: rome('2026-10-09', '17:20') }
    expect(placeStamps(trip, p, plansOf(p)).get('sight-pantheon')).toMatchObject({ via: 'stop', at: rome('2026-10-09', '17:20') })
    // And null leaves a derived stamp alone.
    p.stamps!['sight-vatican-museums'] = { on: null, at: rome('2026-10-09', '16:45'), updatedAt: rome('2026-10-09', '16:46') }
    expect(stamped(p)).toContain('sight-vatican-museums')
  })

  it('keeps the earlier of a hand stamp and a tick, and the earliest tick', () => {
    const p = emptyProgress()
    p.stamps!['sight-castel-sant-angelo'] = { on: true, at: rome('2026-10-09', '14:00'), updatedAt: rome('2026-10-09', '14:00') }
    p.stops['castel-sant-angelo-the-angel-s-terrace'] = { status: 'done', at: rome('2026-10-09', '16:00') }
    expect(placeStamps(trip, p, plansOf(p)).get('sight-castel-sant-angelo')).toMatchObject({ via: 'tap', at: rome('2026-10-09', '14:00') })
    p.stops['castel-sant-angelo-the-angel-s-terrace'] = { status: 'done', at: rome('2026-10-09', '13:00') }
    expect(placeStamps(trip, p, plansOf(p)).get('sight-castel-sant-angelo')).toMatchObject({ via: 'stop', at: rome('2026-10-09', '13:00') })

    const q = emptyProgress()
    q.stops['spanish-steps-nearly-empty-sunrise-07-19'] = { status: 'done', at: rome('2026-10-12', '07:10') }
    q.stops['top-of-the-spanish-steps-for-sunset-18-38'] = { status: 'done', at: rome('2026-10-09', '18:40') }
    const st = placeStamps(trip, q, plansOf(q))
    expect(st.get('sight-spanish-steps')).toMatchObject({ stopId: 'top-of-the-spanish-steps-for-sunset-18-38', at: rome('2026-10-09', '18:40') })
    expect(st.get('photo-spanish-steps')).toMatchObject({ stopId: 'top-of-the-spanish-steps-for-sunset-18-38' })
    // Ordered by stamp time.
    expect([...st.keys()]).toEqual(['sight-spanish-steps', 'photo-spanish-steps'])
  })

  it('keeps the photo spot and the sight apart (S7)', () => {
    const p = seedS()
    p.stamps!['photo-pantheon'] = { on: true, at: rome('2026-10-09', '16:45'), updatedAt: rome('2026-10-09', '16:45') }
    expect(stamped(p)).toContain('photo-pantheon')
    expect(stamped(p)).not.toContain('sight-pantheon')
  })

  it('ignores unknown ids and places that are not collectable', () => {
    const p = emptyProgress()
    const rec = { on: true, at: rome('2026-10-09', '16:45'), updatedAt: rome('2026-10-09', '16:45') }
    p.stamps = { 'food-tonnarello': rec, 'food-antico-caffe-greco': rec, 'sight-nowhere': rec }
    expect(stamped(p)).toEqual([])
  })

  it('stamps the place an added stop names, when done', () => {
    const p = emptyProgress()
    const custom: Stop = { id: 'c-supplizio', start: 1230, timeLabel: '20:30', kind: 'food', title: 'Quick bite', placeId: 'food-supplizio', custom: true }
    const t: Trip = { ...trip, days: trip.days.map(d => (d.id === 'fri' ? { ...d, stops: [...d.stops, custom] } : d)) }
    p.stops['c-supplizio'] = { status: 'done', at: rome('2026-10-09', '20:40') }
    expect([...placeStamps(t, p, planDays(t, p, liveFri)).keys()]).toEqual(['food-supplizio'])
    const trap: Trip = { ...trip, days: trip.days.map(d => (d.id === 'fri' ? { ...d, stops: [...d.stops, { ...custom, placeId: 'food-tonnarello' }] } : d)) }
    expect([...placeStamps(trap, p, planDays(trap, p, liveFri)).keys()]).toEqual([])
  })

  it('works on saves from before stamps (no stamps key)', () => {
    const p = seedS()
    delete p.stamps
    delete p.expenses
    expect(stamped(p)).toHaveLength(3)
  })
})

describe('placeStampDate', () => {
  const saved = process.env.TZ
  afterEach(() => {
    process.env.TZ = saved
  })

  it.each(['Europe/Rome', 'America/New_York', 'Asia/Tokyo'])('dates a stamp by the trip clock (phone in %s)', (zone) => {
    process.env.TZ = zone
    const d = (iso: string) => placeStampDate(trip, { at: iso })
    expect(d(rome('2026-10-09', '16:45'))).toBe('2026-10-09')
    expect(d('2026-10-09T23:30:00.000Z')).toBe('2026-10-09') // Sat 01:30 in Rome counts to Friday
    expect(d('2026-10-10T03:00:00.000Z')).toBe('2026-10-10') // Sat 05:00
    expect(d('2026-10-12T23:30:00.000Z')).toBe('2026-10-12') // the last night counts to Monday
    expect(d('2026-09-30T10:00:00.000Z')).toBe('2026-09-30') // before the trip: the calendar date in Rome
    expect(d('2026-10-20T22:30:00.000Z')).toBe('2026-10-21') // after the trip, 00:30 in Rome
    expect(d('not a time')).toBe('')
  })
})

describe('placesInPlan (P4)', () => {
  it('finds the first stop of each place in the plan', () => {
    const hits = placesInPlan(trip, plansOf(emptyProgress()))
    expect(hits.size).toBe(20)
    expect(hits.get('sight-borghese-gallery')).toEqual({ stopId: 'pick-sunafternoon', dayId: 'sun', date: '2026-10-11', start: 14 * 60 + 15, title: 'Borghese Gallery, 15:00–17:00' })
    expect(hits.get('sight-pantheon')).toMatchObject({ stopId: 'pantheon', dayId: 'fri', start: 17 * 60 + 15 })
    expect(hits.get('sight-spanish-steps')).toMatchObject({ dayId: 'fri', start: 18 * 60 + 20 })
    expect(hits.get('sight-colosseum-forum-palatine-24h')).toMatchObject({ stopId: 'colosseum', dayId: 'sat', start: 8 * 60 + 30 })
    for (const id of ['food-tonnarello', 'sight-capitoline-museums', 'photo-pantheon']) expect(hits.has(id), id).toBe(false)
  })

  it('follows the Colosseum day and picked options', () => {
    const p = emptyProgress()
    p.variant = 'sun'
    const hits = placesInPlan(trip, plansOf(p))
    expect(hits.get('food-da-enzo-al-29')).toMatchObject({ dayId: 'sat', start: 11 * 60 + 15 })
    expect(hits.get('food-la-taverna-dei-fori-imperiali')).toMatchObject({ dayId: 'sun', start: 13 * 60 + 15 })
    expect(hits.has('sight-porta-portese-flea-market')).toBe(false)
    // The first linked stop wins: Saturday evening's walk past the floodlit Colosseum comes before Sunday's visit.
    expect(hits.get('sight-colosseum-forum-palatine-24h')).toMatchObject({ dayId: 'sat', start: 19 * 60 + 15 })
    p.choices['pick-sunafternoon'] = 'football'
    expect(placesInPlan(trip, plansOf(p)).has('sight-borghese-gallery')).toBe(false)
  })

  it('counts stops in any state', () => {
    const p = seedS()
    expect(placesInPlan(trip, plansOf(p)).get('sight-st-peter-s-basilica')).toMatchObject({ stopId: 'st-peter-s-basilica-the-free-grottoes' })
  })
})

describe('opening days', () => {
  it('knows what is closed on Sunday (P3)', () => {
    const closed = places.filter(p => placeOpenOn(p, trip, 'sun') === 'closed').map(p => label(p.id))
    expect(closed).toEqual([
      'Vatican Museums (sight)', 'Galleria Sciarra (sight)', 'San Sebastiano catacombs (sight)', 'Vatican Necropolis (Scavi) (sight)',
      'Armando al Pantheon (food)', 'Da Enzo al 29 (food)', 'L\'Arcangelo (food)', 'Mercato di Testaccio (food)', 'Antico Caffè Greco (food)',
    ])
    expect(places.length - closed.length).toBe(72)
  })

  it('reads the open days, then Sundays for food, else does not know', () => {
    expect(placeOpenOn(place('sight-borghese-gallery'), trip, 'mon')).toBe('closed')
    expect(placeOpenOn(place('sight-borghese-gallery'), trip, 'sun')).toBe('open')
    expect(placeOpenOn(place('sight-porta-portese-flea-market'), trip, 'sat')).toBe('closed')
    expect(placeOpenOn(place('sight-porta-portese-flea-market'), trip, 'sun')).toBe('open')
    expect(placeOpenOn(place('sight-colosseum-night-tour'), trip, 'fri')).toBe('unknown')
    expect(placeOpenOn(place('sight-vatican-museums'), trip, 'thu')).toBe('unknown') // Thursday isn't in openDays
    expect(placeOpenOn(place('food-armando-al-pantheon'), trip, 'sat')).toBe('unknown')
    expect(placeOpenOn(place('food-antico-caffe-greco'), trip, 'fri')).toBe('closed')
    expect(placeOpenOn(place('food-la-tavernaccia-da-bruno'), trip, 'sun')).toBe('unknown')
    // Without openDays, open[] follows the trip's days.
    const plain = { ...trip, openDays: undefined }
    expect(placeOpenOn(place('sight-vatican-museums'), plain, 'sat')).toBe('closed')
  })
})

describe('filters', () => {
  it('finds 26 free places', () => {
    expect(places.filter(placeIsFree)).toHaveLength(26)
  })

  it('finds the places to book ahead', () => {
    const book = places.filter(placeNeedsBooking)
    expect(book).toHaveLength(13)
    expect(book.every(p => ['Yes', 'Recommended', 'Timed slot', 'Online', 'Guided', 'Request form'].includes(p.booking!))).toBe(true)
    expect(placeNeedsBooking({ ...place('sight-pantheon'), booking: 'Optional' })).toBe(false)
    expect(placeNeedsBooking({ ...place('sight-pantheon'), booking: undefined })).toBe(false)
  })
})

describe('set progress', () => {
  it('reads the P2 numbers for Seed S', () => {
    const p = seedS()
    const sets = placeSetProgress(trip, placeStamps(trip, p, plansOf(p)))
    expect(sets.map(s => `${s.set} ${s.stamped}/${s.total}`)).toEqual([
      'ancient 0/10', 'art 2/7', 'church 0/4', 'underground 0/6', 'views 0/8', 'pasta 0/11', 'street 1/9', 'sweet 0/6',
      'morning 0/10', 'golden 0/5', 'anytime 0/3',
    ])
    expect(sets.some(s => s.complete)).toBe(false)
  })

  it('completes a set when every collectable place in it is stamped (G4)', () => {
    const p = seedS()
    const at = rome('2026-10-09', '16:50')
    for (const id of ['sight-st-peter-s-basilica', 'sight-santa-maria-maggiore', 'sight-st-john-lateran', 'sight-tempietto-del-bramante']) {
      p.stamps![id] = { on: true, at, updatedAt: at }
    }
    const church = placeSetProgress(trip, placeStamps(trip, p, plansOf(p))).find(s => s.set === 'church')
    expect(church).toEqual({ set: 'church', total: 4, stamped: 4, complete: true })
    // Takes a Set of ids too.
    expect(placeSetProgress(trip, new Set(['food-tonnarello'])).find(s => s.set === 'pasta')).toEqual({ set: 'pasta', total: 11, stamped: 0, complete: false })
  })
})
