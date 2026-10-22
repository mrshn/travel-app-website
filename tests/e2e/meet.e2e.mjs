// Browser checks for Meet and share (docs/design/2026-10-14-together.md, 5.9 to 5.11; T8, T9, T13), on a memory build
// of the social layer:
//
//   NUXT_PUBLIC_SOCIAL_BACKEND=memory npm run generate
//   node tests/e2e/meet.e2e.mjs --build          serves .output/public on port 4183 and checks it
//   node tests/e2e/meet.e2e.mjs                  against TRAVELS_URL (a memory build served elsewhere)
//   ONLY=M4,M6 node tests/e2e/meet.e2e.mjs       only the checks whose names start with those labels
//
// The device is the test account (ME of social-lib.mjs); Ali, Can and Deniz act through the memory backend's hooks.
// A device with no account gets a copy of the fake cloud before its first page. Every check opens its own phone
// (390 x 844, DPR 2, touch, Europe/Rome), live at Fri 9 Oct 21:00 unless it says otherwise.
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { BASE, TRIP, assert, check, go, live, loadTrip, phone, readProgress, ready, romeCopy, serveBuild, smallTargets, useBase } from './lib.mjs'
import { ALI, CAN, DENIZ, ME, act, befriend, cloudOf, profileOf, socialReady } from './social-lib.mjs'

const BUILD = process.argv.includes('--build')
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean)
const FRI = '2026-10-09T21:00'
const trip = loadTrip()
const FRIDAY = trip.days.find(d => d.id === 'fri')
const FRI_NIGHT = FRIDAY.stops.find(s => s.id === 'pick-frinight')
const FRI_NIGHT_TITLE = FRI_NIGHT.options.choices.find(c => c.id === FRI_NIGHT.options.default).title

/** Ali's meetup: the Vatican on Saturday at 8, Rome time. */
const VATICAN = {
  title: 'Vatican Museums',
  note: 'Anyone for the Vatican at 8 on Saturday? Meet at the entrance on Viale Vaticano.',
  place: { name: 'Vatican Museums', lat: 41.9066, lng: 12.4536 },
  start: '2026-10-10T08:00:00+02:00',
  timezone: 'Europe/Rome',
  destination: 'Rome',
  tripTitle: 'Rome',
}
/** A meetup of the device's own for this trip. */
const PANTHEON = { ...VATICAN, title: 'Pantheon', note: 'Anyone for the Pantheon at 17:15 on Friday?', place: { name: 'Pantheon', lat: 41.8986, lng: 12.4769 }, start: '2026-10-09T17:15:00+02:00' }
/** A trip a device with no account still holds from before accounts: none of it may show on a link's page. */
const SECRET = { ...romeCopy(trip), id: 'secret-2026-12', title: 'Hidden Getaway', subtitle: 'Nobody should read this line' }

const srv = BUILD ? await serveBuild(4183) : null
if (srv) useBase(srv.url)
const browser = await chromium.launch()

// ---------- helpers ----------

const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const sleep = ms => new Promise(res => setTimeout(res, ms))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Polls fn() until it gives something truthy; throws naming `what` after `ms`. */
async function until(fn, what, ms = 8000) {
  const end = Date.now() + ms
  let last
  while (Date.now() < end) {
    try {
      last = await fn()
      if (last) return last
    }
    catch (e) {
      last = e
    }
    await sleep(100)
  }
  throw new Error(`timed out waiting for ${what}${last instanceof Error ? ` (${last.message.split('\n')[0]})` : ''}`)
}

/** A check that runs unless ONLY names others. */
async function test(name, fn) {
  if (ONLY.length && !ONLY.some(p => name.startsWith(p))) return
  await check(name, fn)
}

/** Init script: the phone's share sheet, recorded (window.__shared) instead of shown. */
function shareStub() {
  window.__shared = []
  navigator.share = async (d) => {
    window.__shared.push(JSON.parse(JSON.stringify(d)))
  }
  navigator.canShare = () => true
}
const shared = page => page.evaluate(() => window.__shared ?? [])

/**
 * A phone (lib's phone()): live at `at` unless null, its share sheet recorded, confirm() answered yes. `cloud` (the
 * fake cloud as JSON) is put on a device before its first page: a device with no account reads links from it.
 */
async function device({ at = FRI, cloud, ...opts } = {}) {
  const d = await phone(browser, opts)
  await d.ctx.addInitScript(shareStub)
  if (cloud) {
    await d.ctx.addInitScript((c) => {
      try {
        if (!localStorage.getItem('travel:fakecloud:v1')) localStorage.setItem('travel:fakecloud:v1', c)
      }
      catch { /* storage refused */ }
    }, cloud)
  }
  if (at) await live(d.page, at)
  d.page.on('dialog', dlg => void dlg.accept())
  return d
}

/** Runs fn with a fresh device; fails on page errors; closes it after. */
async function withDevice(opts, fn) {
  const d = await device(opts)
  try {
    await fn(d)
    assert(!d.errors.length, `page error: ${d.errors.join(' / ')}`)
  }
  finally {
    await d.ctx.close()
  }
}

/** A full load: "meet", "plan?day=fri" (of the trip), or "/m/<id>" (from the app's root). */
async function open(page, path) {
  const rel = path.startsWith('/') ? path.slice(1) : `trips/${TRIP}/${path}`
  await page.goto(new URL(rel, BASE).href, { waitUntil: 'domcontentloaded' })
  await ready(page)
}

/** Opens a path signed in and waits for the social layer. */
async function openReady(page, path) {
  await open(page, path)
  await socialReady(page)
}

const fakeCloud = page => page.evaluate(() => localStorage.getItem('travel:fakecloud:v1'))
const section = (page, id) => page.locator('section', { has: page.locator(`#${id}`) })
const dialog = (page, name) => page.getByRole('dialog', { name, exact: true })
const query = (page, key) => new URL(page.url()).searchParams.get(key)
const bodyText = async page => flat(await page.locator('body').innerText())

/** The newest toast holding `text`. */
async function toastWith(page, text) {
  const t = page.locator('.toasts .toast').filter({ hasText: text }).last()
  await t.waitFor({ timeout: 6000 })
  return t
}

/** The device's own trips as stored. */
const storedTrips = page => page.evaluate(() => JSON.parse(localStorage.getItem('travel:trips:v1') || '[]'))

/** Friends: Ali shares a trip to Rome on overlapping dates (his card first, so the app reads it with the friendship). */
async function aliInRome(page) {
  await profileOf(page, ALI)
  await act(page, ALI, 'saveCard', { showTrips: true, trips: [{ title: 'Rome', destination: 'Rome', start: '2026-10-09', end: '2026-10-12' }] })
  await befriend(page, ALI, ME)
}

/** Scrolls `scroller` (the page, or a sheet's body) through and collects lib's smallTargets() at each stop (toasts left out). */
async function allSmall(page, scroller = null) {
  const found = new Map()
  const dims = await page.evaluate((sel) => {
    const el = sel ? document.querySelector(sel) : document.scrollingElement
    return { h: el.scrollHeight, step: Math.max(120, Math.round((sel ? el.clientHeight : window.innerHeight) * 0.6)) }
  }, scroller)
  for (let y = 0; y <= dims.h; y += dims.step) {
    await page.evaluate(([sel, top]) => (sel ? document.querySelector(sel) : document.scrollingElement).scrollTo(0, top), [scroller, y])
    await sleep(120)
    for (const t of await smallTargets(page)) {
      if (/\b(?:act|toast)\b/.test(t.cls)) continue
      found.set(`${t.tag}.${t.cls}|${t.text}|${t.label}`, t)
    }
  }
  await page.evaluate(sel => (sel ? document.querySelector(sel) : document.scrollingElement).scrollTo(0, 0), scroller)
  return [...found.values()]
}

/** Sideways scroll on the page or inside an open sheet. */
function sideways(page) {
  return page.evaluate(() => {
    const out = []
    const d = document.documentElement
    if (d.scrollWidth > window.innerWidth) out.push(`page ${d.scrollWidth} px wide at ${window.innerWidth}`)
    for (const b of document.querySelectorAll('.sheet .body')) {
      if (b.scrollWidth > b.clientWidth + 1) out.push(`${b.closest('[role=dialog]')?.getAttribute('aria-label')}: ${b.scrollWidth} > ${b.clientWidth}`)
    }
    return out
  })
}

/**
 * Text under 4.5:1 (3:1 when large) against what is painted behind it, in `rootSel`, as tests/e2e/ui.e2e.mjs measures
 * it: colours composited over the solid backgrounds behind them; text on pictures, the tab bar, toasts and disabled
 * controls (WCAG leaves those out) not counted.
 */
function contrastIssues(page, rootSel) {
  return page.evaluate((sel) => {
    const parse = (c) => {
      let m = /rgba?\(([^)]+)\)/.exec(c)
      if (m) {
        const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
        return [r, g, b, a]
      }
      m = /color\(srgb ([^)]+)\)/.exec(c)
      if (m) {
        const [r, g, b, a = 1] = m[1].split(/[\s/]+/).filter(Boolean).map(Number)
        return [r * 255, g * 255, b * 255, a]
      }
      return null
    }
    const over = (top, bottom) => {
      const a = top[3] + bottom[3] * (1 - top[3])
      if (!a) return [0, 0, 0, 0]
      const ch = i => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a
      return [ch(0), ch(1), ch(2), a]
    }
    const lum = ([r, g, b]) => {
      const f = (v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
      return (x + 0.05) / (y + 0.05)
    }
    const pageBg = parse(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1]
    const bgOf = (el) => {
      const layers = []
      for (let p = el; p && p !== document.documentElement; p = p.parentElement) {
        const s = getComputedStyle(p)
        if (s.backgroundImage !== 'none' && !p.matches('.bar, .bar *')) return null
        const c = parse(s.backgroundColor)
        if (c && c[3] > 0) {
          layers.push(c)
          if (c[3] >= 1) break
        }
      }
      return layers.reverse().reduce((acc, c) => over(c, acc), [...pageBg.slice(0, 3), 1])
    }
    const opacityOf = (el) => {
      let o = 1
      for (let p = el; p && p !== document.documentElement; p = p.parentElement) o *= Number(getComputedStyle(p).opacity)
      return o
    }
    const r2 = x => Math.round(x * 100) / 100
    const out = []
    const scopes = [...document.querySelectorAll(sel)]
    if (!scopes.length) return [`nothing matches ${sel}`]
    for (const scope of scopes) {
      for (const el of scope.querySelectorAll('*')) {
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
        if (!own || el.closest('.art-frame, svg, .tabbar, .toasts, .sr-only, option, select, button:disabled, [aria-disabled="true"]')) continue
        const s = getComputedStyle(el)
        const r = el.getBoundingClientRect()
        if (s.visibility !== 'visible' || s.display === 'none' || r.width < 1 || r.height < 1) continue
        const bg = bgOf(el)
        const fg = parse(s.color)
        if (!bg || !fg) continue
        const shown = over([fg[0], fg[1], fg[2], fg[3] * opacityOf(el)], bg)
        const size = Number.parseFloat(s.fontSize)
        const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700)
        const got = ratio(shown, bg)
        if (got < (large ? 3 : 4.5)) out.push(`text "${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)}" ${r2(got)}:1 (${s.color} on ${bg.map(Math.round).join(',')}, opacity ${r2(opacityOf(el))})`)
      }
    }
    return out
  }, rootSel)
}

const brief = list => JSON.stringify(list.slice(0, 4))

// ---------- M1: Meet people ----------

await test('M1 Meet people, live Fri 9 Oct 21:00: tonight\'s night card, night stop and idea, then the trip\'s own ways to meet people; More is lit', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    assert(flat(await page.locator('.tabbar .tb[aria-current="page"]').innerText()) === 'More', 'More is not lit')
    const tonight = section(page, 'meet-tonight')
    await tonight.waitFor()
    const t = flat(await tonight.textContent())
    assert(t.includes('Fri 9 Oct'), `tonight's date: ${t.slice(0, 80)}`)
    const card = trip.nightCards.find(n => n.dayId === 'fri')
    assert(t.includes(card.title) && t.includes(card.text), 'the night card of Friday is missing')
    const row = tonight.locator('[data-stop="pick-frinight"]')
    assert(await row.count() === 1, 'tonight\'s night stop is missing')
    assert(flat(await row.textContent()).includes(FRI_NIGHT_TITLE), `the night stop doesn't read as its picked choice: ${flat(await row.textContent())}`)
    const fridayIdeas = trip.meet.filter(i => i.dayId === 'fri').map(i => i.id)
    assert(same(await tonight.locator('[data-idea]').evaluateAll(els => els.map(e => e.dataset.idea)), fridayIdeas), 'tonight\'s ideas')
    // Ways to meet people: the trip's own ideas (tonight's are above), each with its link and Ask who's in.
    const ways = section(page, 'meet-ways')
    const ids = await ways.locator('[data-idea]').evaluateAll(els => els.map(e => e.dataset.idea))
    assert(same(ids, trip.meet.filter(i => i.dayId !== 'fri').map(i => i.id)), `ways: ${ids.join(', ')}`)
    for (const idea of trip.meet.filter(i => i.dayId !== 'fri')) {
      const c = ways.locator(`[data-idea="${idea.id}"]`)
      assert(flat(await c.textContent()).includes(idea.when), `${idea.id}: no when`)
      assert(await c.getByRole('button', { name: 'Ask who\'s in' }).count() === 1, `${idea.id}: no Ask who's in`)
      if (idea.link) assert(await c.locator(`a[href="${idea.link.url}"][target="_blank"]`).count() === 1, `${idea.id}: no link`)
    }
    assert(!(await ways.textContent()).includes('For any city'), 'the general ideas show')
    // Nothing of yours yet.
    assert(flat(await section(page, 'meet-mine').textContent()).includes('No meetups yet'), 'your meetups: no empty line')
    assert(flat(await section(page, 'meet-people').textContent()).includes('Keep the names and handles'), 'people you met: no empty line')
    assert(flat(await section(page, 'meet-friends').textContent()).includes('No friends in Rome on your dates yet'), 'friends: no empty line')
  }))

await test('M2 before the trip there is no Tonight; a trip without its own ideas gets ideas for any city, searched for its destination', () => {
  const lisbonDays = ['2026-11-05', '2026-11-06', '2026-11-07'].map((date, i) => ({
    id: `d${i + 1}`, date, num: ['V', 'VI', 'VII'][i], label: `Day ${i + 1}`, title: '', cover: { scene: 'alley', tod: 'day' }, facts: [], stops: [],
  }))
  const lisbon = {
    id: 'lisbon-2026-11', title: 'Lisbon', destination: 'Lisbon', country: 'Portugal', timezone: 'Europe/Lisbon', start: '2026-11-05', end: '2026-11-07',
    cover: { scene: 'alley', tod: 'golden' }, currency: 'EUR', days: lisbonDays, bookings: [], packing: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  }
  return withDevice({ at: '2026-09-30T12:00', trips: [romeCopy(trip), lisbon] }, async ({ page }) => {
    await openReady(page, 'meet')
    assert(!(await section(page, 'meet-tonight').count()), 'Tonight shows before the trip')
    // Say hi before the trip: no goal for today, no Tonight on the row, invites said by their weekday.
    const talk = section(page, 'meet-talk')
    await talk.waitFor()
    assert(!(await talk.locator('[data-goal]').count()), 'a goal for today before the trip')
    assert(!(await page.locator('nav.jump [data-jump="meet-tonight"]').count()), 'Tonight on the row before the trip')
    await talk.locator('[data-tab="invite"]').click()
    const firstInvite = flat(await talk.locator('[data-invite]').first().innerText())
    assert(/, on (Thursday|Friday) at \d\d:\d\d\. Want to come with me\?/.test(firstInvite), `the first invite before the trip: ${firstInvite}`)
    await talk.locator('[data-tab="start"]').click()
    await page.goto(new URL('trips/lisbon-2026-11/meet', BASE).href, { waitUntil: 'domcontentloaded' })
    await ready(page)
    const ways = section(page, 'meet-ways')
    await ways.waitFor()
    assert(flat(await ways.textContent()).includes('For any city'), 'no "For any city"')
    const ids = await ways.locator('[data-idea]').evaluateAll(els => els.map(e => e.dataset.idea))
    assert(same(ids, ['any-hostel', 'any-walk', 'any-crawl', 'any-language', 'any-aperitivo', 'any-food', 'any-apps']), `general ideas: ${ids.join(', ')}`)
    const hrefs = await ways.locator('a[target="_blank"]').evaluateAll(els => els.map(e => e.href))
    assert(hrefs.length === 7 && hrefs.every(h => h.startsWith('https://www.google.com/search?q=') && decodeURIComponent(h).includes('Lisbon')), `links: ${hrefs.join(' ')}`)
    assert(flat(await section(page, 'meet-friends').locator('h2').textContent()) === 'Friends in Lisbon', 'the friends heading')
    // An idea's ask makes the meetup: walking tour, its time tomorrow on the trip (the trip isn't on yet: its first day).
    await ways.locator('[data-idea="any-walk"]').getByRole('button', { name: 'Ask who\'s in' }).click()
    const sh = dialog(page, 'New meetup')
    await sh.waitFor()
    assert(await sh.getByLabel('Title', { exact: true }).inputValue() === 'A free walking tour', 'the idea\'s title')
    assert(await sh.getByLabel(/^Note/).inputValue() === 'Anyone for a free walking tour of Lisbon at 10:00?', `the idea's ask: ${await sh.getByLabel(/^Note/).inputValue()}`)
    assert(await sh.getByLabel('Day', { exact: true }).inputValue() === '2026-11-05', 'the day')
    assert(await sh.getByLabel(/^Time/).inputValue() === '10:00', 'the time from the idea')
  })
})

await test('M3 Friends in Rome on your dates come from friends\' cards, with Say hi (a meetup prefilled to say hi); others stay out', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    await aliInRome(page)
    for (const [p, dest, start, end] of [[CAN, 'Lisbon', '2026-10-08', '2026-10-12'], [DENIZ, 'Rome', '2026-11-01', '2026-11-04']]) {
      await profileOf(page, p)
      await act(page, p, 'saveCard', { showTrips: true, trips: [{ title: dest, destination: dest, start, end }] })
      await befriend(page, p, ME)
    }
    const sec = section(page, 'meet-friends')
    const row = sec.locator(`[data-friend="${ALI.uid}"]`)
    await until(async () => (await row.count()) === 1 && flat(await row.textContent()).includes('Ali Demir'), 'Ali under Friends in Rome')
    await sleep(500)
    assert(await sec.locator('[data-friend]').count() === 1, `friends shown: ${await sec.locator('[data-friend]').evaluateAll(els => els.map(e => e.dataset.friend))}`)
    assert(flat(await row.textContent()).includes('In Rome 9 to 12 Oct'), flat(await row.textContent()))
    await row.getByRole('button', { name: 'Say hi' }).click()
    const sh = dialog(page, 'New meetup')
    await sh.waitFor()
    assert(await sh.getByLabel('Title', { exact: true }).inputValue() === 'Meet up in Rome', 'title')
    assert(await sh.getByLabel(/^Note/).inputValue() === 'Fancy meeting up while we\'re both in Rome?', 'note')
    assert(await sh.getByLabel('Day', { exact: true }).inputValue() === '2026-10-09', 'day: today')
    assert(flat(await sh.textContent()).includes('To say hi to Ali'), 'who it is for')
    await page.getByRole('button', { name: 'Create the link' }).click()
    await dialog(page, 'Your meetup').waitFor()
    const id = query(page, 'meetup')
    assert(id && id !== 'new' && !query(page, 'hi'), `the URL: ${page.url()}`)
    const m = (await cloudOf(page)).meetups[id]
    assert(m?.note === 'Fancy meeting up while we\'re both in Rome?' && m.place === null && m.start === '2026-10-09T20:00:00+02:00', JSON.stringify(m))
  }))

await test('M4 a group trip: who\'s in for tonight\'s night stops, the trip\'s people under Friends, and a meetup for tonight sent to the group chat', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    await profileOf(page, ME)
    await profileOf(page, ALI)
    const gid = await page.evaluate(id => window.__travelsTest.groups.makeGroup(id), TRIP)
    const inv = await act(page, ME, 'createInvite', { kind: 'trip', trip: gid, role: 'editor', tripTitle: 'Rome' })
    await act(page, ALI, 'joinGroup', inv.token)
    await act(page, ALI, 'setRsvp', gid, 'pick-frinight', 'in')
    const row = section(page, 'meet-tonight').locator('[data-stop="pick-frinight"]')
    await until(async () => flat(await row.textContent()).includes('1 in'), 'Ali in for tonight')
    assert(await row.getByRole('img', { name: /In: Ali/ }).count() === 1, 'no face for Ali')
    const friends = section(page, 'meet-friends')
    await until(async () => flat(await friends.textContent()).includes('In this trip with you'), 'the trip\'s people')
    assert(flat(await friends.textContent()).includes('Ali'), 'Ali is not among the trip\'s people')
    assert(await friends.locator(`a[href$="/trips/${TRIP}/group"]`).count() === 1, 'no way to the group chat')
    // Ask who's in for tonight: a meetup from the night stop, over its stop sheet.
    await section(page, 'meet-tonight').locator('button.btn.primary', { hasText: 'Ask who\'s in' }).click()
    const sh = dialog(page, 'New meetup')
    await sh.waitFor()
    assert(query(page, 'stop') === 'pick-frinight', `from ${page.url()}`)
    assert(await sh.getByLabel('Title', { exact: true }).inputValue() === FRI_NIGHT_TITLE, 'the night stop\'s title')
    assert(await sh.getByLabel(/^Time/).inputValue() === '21:30', 'the night stop\'s time')
    await page.getByRole('button', { name: 'Create the link' }).click()
    const mine = dialog(page, 'Your meetup')
    await mine.waitFor()
    const id = query(page, 'meetup')
    await mine.getByRole('button', { name: 'Send to the group chat' }).click()
    await toastWith(page, 'Sent to the group chat')
    const msgs = Object.values((await cloudOf(page)).messages[gid] ?? {})
    assert(msgs.some(x => x.kind === 'text' && x.author === ME.uid && x.text.startsWith(`Anyone for ${FRI_NIGHT_TITLE} at 21:30 on Friday?`) && x.text.endsWith(`/m/${id}`)), `chat: ${JSON.stringify(msgs.map(x => x.text))}`)
  }))

// ---------- M5: a meetup from a stop ----------

await test('M5 Ask people to join in the stop sheet: a meetup with the stop\'s title, day, time and place; Create the link; it lists under Your meetups with who\'s going', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'plan?day=fri&stop=pantheon')
    const stopSheet = dialog(page, 'Pantheon')
    await stopSheet.waitFor()
    const order = await stopSheet.evaluate(el => [...el.querySelectorAll('button')].map(b => b.textContent.trim()))
    const [a, b, e] = [order.indexOf('Share a moment'), order.indexOf('Ask people to join'), order.findIndex(t => t.includes('Edit stop'))]
    assert(a >= 0 && b === a + 1 && e > b, `the stop sheet's buttons: ${order.slice(-6).join(' | ')}`)
    // Share a moment opens the composer.
    await stopSheet.getByRole('button', { name: 'Share a moment' }).click()
    await until(() => query(page, 'compose') === '1', 'the composer (?compose=1)')
    await page.goBack()
    await until(() => !query(page, 'compose'), 'the composer to close')
    await stopSheet.getByRole('button', { name: 'Ask people to join' }).click()
    const sh = dialog(page, 'New meetup')
    await sh.waitFor()
    assert(query(page, 'meetup') === 'new' && query(page, 'stop') === 'pantheon', page.url())
    assert(await sh.getByLabel('Title', { exact: true }).inputValue() === 'Pantheon', 'title')
    assert(await sh.getByLabel(/^Note/).inputValue() === 'Anyone for Pantheon at 17:15 on Friday?', `note: ${await sh.getByLabel(/^Note/).inputValue()}`)
    assert(await sh.getByLabel('Day', { exact: true }).inputValue() === '2026-10-09', 'day')
    assert(await sh.getByLabel(/^Time/).inputValue() === '17:15', 'time')
    assert(flat(await sh.locator('.place').textContent()) === 'Pantheon', 'place')
    await sh.getByLabel(/^Note/).fill('Anyone for the Pantheon at 17:15? I\'ll be by the obelisk.')
    await page.getByRole('button', { name: 'Create the link' }).click()
    const mine = dialog(page, 'Your meetup')
    await mine.waitFor()
    const id = query(page, 'meetup')
    assert(query(page, 'stop') === 'pantheon', 'the stop sheet underneath went away')
    const m = (await cloudOf(page)).meetups[id]
    assert(m && m.host === ME.uid && m.title === 'Pantheon' && m.start === '2026-10-09T17:15:00+02:00' && m.timezone === 'Europe/Rome'
      && m.destination === 'Rome' && m.tripTitle === 'Rome' && m.place?.name === 'Pantheon' && m.place.lat === 41.8986 && m.place.lng === 12.4769
      && m.note === 'Anyone for the Pantheon at 17:15? I\'ll be by the obelisk.', JSON.stringify(m))
    assert(flat(await mine.locator('.sl .u').textContent()).endsWith(`/m/${id}`), 'the link on the sheet')
    await toastWith(page, 'Your meetup link is ready')
    // Share… hands the link to the phone's share sheet, with the note.
    await mine.getByRole('button', { name: 'Share…' }).click()
    await until(async () => (await shared(page)).some(s => s.url.endsWith(`/m/${id}`) && s.text === m.note), 'the share sheet')
    // Post to friends opens the composer over it.
    await mine.getByRole('button', { name: 'Post to friends' }).click()
    await until(() => query(page, 'compose') === '1', 'the composer')
    await page.goBack()
    await until(() => !query(page, 'compose'), 'the composer to close')
    // Closing goes back to the stop. (A tap, as on a phone: the sheet's drag strip holds the × and takes a mouse's
    // pointer, so a mouse click below 900 px doesn't reach it; see BottomSheet.vue.)
    await mine.getByRole('button', { name: 'Close' }).tap()
    await until(() => !query(page, 'meetup') && query(page, 'stop') === 'pantheon', 'back on the stop sheet')
    // Your meetups for this trip: this one (not one for another trip), with who's going.
    await act(page, ME, 'createMeetup', { ...VATICAN, title: 'Lisbon thing', tripTitle: 'Lisbon', start: '2026-11-05T20:00:00+00:00', timezone: 'Europe/Lisbon' })
    await go(page, 'meet')
    const list = section(page, 'meet-mine')
    const row = list.locator(`[data-meetup="${id}"]`)
    await row.waitFor()
    assert(await list.locator('[data-meetup]').count() === 1, 'a meetup of another trip shows')
    assert(flat(await row.textContent()).includes('Fri 9 Oct, 17:15 · Pantheon'), flat(await row.textContent()))
    await profileOf(page, CAN)
    await act(page, CAN, 'setGoing', id, true)
    await until(async () => flat(await row.textContent()).includes('1 going'), 'Can going, on the row')
    await row.click()
    const again = dialog(page, 'Your meetup')
    await again.waitFor()
    await until(async () => flat(await again.locator('.going').textContent()).includes('Can Yildiz'), 'Can under Who\'s going in the sheet')
  }))

// ---------- M6 to M11: the meetup page ----------

await test('M6 /m/<id> signed in: the host, when, where with Directions, the note and who\'s going; I\'m in tells the host; I can\'t make it takes it back', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    await profileOf(page, ALI)
    await profileOf(page, CAN)
    const m = await act(page, ALI, 'createMeetup', VATICAN)
    await act(page, CAN, 'setGoing', m.id, true)
    await openReady(page, `/m/${m.id}`)
    await page.getByRole('heading', { name: 'Vatican Museums' }).waitFor()
    const text = await bodyText(page)
    for (const s of ['Ali Demir is asking who\'s in', 'Sat 10 Oct, 08:00 Rome time', 'Vatican Museums', VATICAN.note]) assert(text.includes(s), `missing "${s}"`)
    assert(!text.includes('your time'), 'a "your time" line in the same zone')
    const dir = await page.getByRole('link', { name: 'Directions' }).getAttribute('href')
    assert(dir === 'https://www.google.com/maps/dir/?api=1&destination=41.9066%2C12.4536&travelmode=walking', dir)
    const going = page.locator('.going')
    await until(async () => flat(await going.textContent()).includes('Can Yildiz'), 'Can under Who\'s going')
    await page.getByRole('button', { name: 'I\'m in' }).click()
    await until(async () => flat(await going.textContent()).includes('Test Traveller'), 'you under Who\'s going')
    await page.getByText('You\'re going.').waitFor()
    const told = await until(async () => Object.values((await cloudOf(page)).inbox[ALI.uid] ?? {}).find(i => i.kind === 'meetup-going'), 'the host to be told')
    assert(told.from === ME.uid && told.ref === m.id && told.link === `/m/${m.id}` && told.text === 'is in for Vatican Museums', JSON.stringify(told))
    await page.getByRole('button', { name: 'I can\'t make it' }).click()
    await until(async () => !flat(await going.textContent()).includes('Test Traveller'), 'you to leave Who\'s going')
    assert(!(await cloudOf(page)).going[m.id]?.[ME.uid], 'still going in the cloud')
    await page.getByRole('button', { name: 'I\'m in' }).waitFor()
  }))

await test('M7 /m/<id> in another time zone says when it is there and for you ("09:00 your time")', () =>
  withDevice({ timezoneId: 'Europe/Istanbul' }, async ({ page }) => {
    await openReady(page, 'meet')
    const m = await act(page, ALI, 'createMeetup', VATICAN)
    await openReady(page, `/m/${m.id}`)
    await page.getByRole('heading', { name: 'Vatican Museums' }).waitFor()
    const text = await bodyText(page)
    assert(text.includes('Sat 10 Oct, 08:00 Rome time') && text.includes('09:00 your time'), text.slice(0, 300))
  }))

await test('M8 Add to calendar downloads "<title>.ics" for the meetup', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    const m = await act(page, ALI, 'createMeetup', VATICAN)
    await openReady(page, `/m/${m.id}`)
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add to calendar' }).click()])
    assert(dl.suggestedFilename() === 'Vatican Museums.ics', dl.suggestedFilename())
    const ics = readFileSync(await dl.path(), 'utf8')
    for (const s of ['BEGIN:VCALENDAR', 'SUMMARY:Vatican Museums', 'DTSTART:20261010T060000Z', 'DTEND:20261010T073000Z', `/m/${m.id}`, 'LOCATION:Vatican Museums 41.9066\\,12.4536']) {
      assert(ics.includes(s), `the .ics misses ${s}`)
    }
  }))

await test('M9 /m/<id> signed out: the meetup and a sign-in button, never who\'s going nor anything of the device\'s trips', async () => {
  let cloud = ''
  let id = ''
  await withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    await profileOf(page, ALI)
    await profileOf(page, CAN)
    id = (await act(page, ALI, 'createMeetup', VATICAN)).id
    await act(page, CAN, 'setGoing', id, true)
    cloud = await fakeCloud(page)
  })
  await withDevice({ signedOut: true, trips: [SECRET], cloud }, async ({ page }) => {
    await open(page, `/m/${id}`)
    await page.getByRole('heading', { name: 'Vatican Museums' }).waitFor()
    assert(new URL(page.url()).pathname.endsWith(`/m/${id}`), `moved to ${page.url()}`)
    const text = await bodyText(page)
    for (const s of ['Ali Demir', 'Sat 10 Oct, 08:00 Rome time', VATICAN.note, 'Sign in to see who\'s going']) assert(text.includes(s), `missing "${s}"`)
    assert(!text.includes('Can Yildiz'), 'who\'s going shows signed out')
    assert(await page.getByRole('button', { name: 'Sign in with Google to join' }).count() === 1, 'no sign-in button')
    assert(!(await page.getByRole('button', { name: 'I\'m in' }).count()), 'I\'m in shows signed out')
    assert(!text.includes(SECRET.title) && !text.includes(SECRET.subtitle), 'the device\'s trip shows')
    assert(!(await page.locator('.shell').count()), 'a trip screen shows')
    assert(await page.getByRole('button', { name: 'Add to calendar' }).count() === 1, 'no Add to calendar')
  })
})

await test('M10 your meetup\'s page: Share again, Edit (in the trip\'s sheet when the trip is here, else on the page) and Cancel meetup', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    const m = await act(page, ME, 'createMeetup', PANTHEON)
    await openReady(page, `/m/${m.id}`)
    await page.getByRole('heading', { name: 'Pantheon' }).waitFor()
    assert((await bodyText(page)).includes('You made this meetup'), 'not shown as yours')
    assert(!(await page.getByRole('button', { name: 'I\'m in' }).count()), 'I\'m in on your own meetup')
    await page.getByRole('button', { name: 'Share again' }).click()
    await until(async () => (await shared(page)).some(s => s.url.endsWith(`/m/${m.id}`)), 'the share sheet')
    // Edit: the trip is on this device, so its sheet opens on the form.
    await page.getByRole('button', { name: 'Edit' }).click()
    await until(() => new URL(page.url()).pathname.endsWith(`/trips/${TRIP}/meet`), 'the trip\'s Meet people')
    const sh = dialog(page, 'Your meetup')
    await sh.waitFor()
    const title = sh.getByLabel('Title', { exact: true })
    await title.waitFor()
    assert(await title.inputValue() === 'Pantheon' && await sh.getByLabel(/^Time/).inputValue() === '17:15', 'the form isn\'t the meetup\'s')
    await title.fill('Pantheon, then gelato')
    await sh.getByLabel(/^Time/).fill('17:30')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await toastWith(page, 'Meetup updated')
    const after = (await cloudOf(page)).meetups[m.id]
    assert(after.title === 'Pantheon, then gelato' && after.start === '2026-10-09T17:30:00+02:00', JSON.stringify(after))
    // Cancel on the page.
    await openReady(page, `/m/${m.id}`)
    await page.getByRole('button', { name: 'Cancel meetup' }).click()
    await page.getByText('You cancelled this meetup.').waitFor()
    assert((await cloudOf(page)).meetups[m.id].cancelled === true, 'not cancelled in the cloud')
    assert(!(await page.getByRole('button', { name: 'Add to calendar' }).count()), 'Add to calendar on a cancelled meetup')
    // Your meetups mark it.
    await openReady(page, 'meet')
    const row = section(page, 'meet-mine').locator(`[data-meetup="${m.id}"]`)
    await row.waitFor()
    assert(flat(await row.textContent()).includes('Cancelled'), 'the row isn\'t marked cancelled')
    // A meetup of a trip that isn't on this device: Edit is on the page itself.
    const other = await act(page, ME, 'createMeetup', { ...VATICAN, tripTitle: 'Somewhere else' })
    await openReady(page, `/m/${other.id}`)
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel(/^Note/).fill('Meet by the ticket office instead.')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await toastWith(page, 'Meetup updated')
    assert((await cloudOf(page)).meetups[other.id].note === 'Meet by the ticket office instead.', 'the page\'s edit wasn\'t saved')
    await page.getByText('Meet by the ticket office instead.').waitFor()
    // Someone else's cancelled meetup names them.
    const ali = await act(page, ALI, 'createMeetup', VATICAN)
    await act(page, ALI, 'updateMeetup', ali.id, { cancelled: true })
    await openReady(page, `/m/${ali.id}`)
    await page.getByText('Ali cancelled this meetup.').waitFor()
    assert(!(await page.getByRole('button', { name: 'I\'m in' }).count()), 'I\'m in on a cancelled meetup')
  }))

await test('M11 a meetup a day later says it has passed (no I\'m in, no calendar)', () =>
  withDevice({ at: '2026-10-11T12:00' }, async ({ page }) => {
    await openReady(page, 'meet')
    const m = await act(page, ALI, 'createMeetup', VATICAN)
    await openReady(page, `/m/${m.id}`)
    await page.getByText('This meetup has passed.').waitFor()
    assert(!(await page.getByRole('button', { name: 'I\'m in' }).count()), 'I\'m in on a past meetup')
    assert(!(await page.getByRole('button', { name: 'Add to calendar' }).count()), 'Add to calendar on a past meetup')
  }))

// ---------- M12 to M15: plan links ----------

await test('M12 Share this plan: four ways; a copy of the plan without where you stay (then with it, when ticked); remove a link; post it', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'more')
    await page.locator('a.mrow', { hasText: 'Share this plan' }).click()
    const sh = dialog(page, 'Share this plan')
    await sh.waitFor()
    for (const name of ['Plan it together', 'Let people follow along', 'Share a copy of the plan', 'Post to your friends']) {
      assert(await sh.getByRole('button', { name: new RegExp(`^${name}`) }).count() === 1, `no "${name}"`)
    }
    await sh.getByRole('button', { name: /^Share a copy of the plan/ }).click()
    const sw = sh.getByRole('switch', { name: /Include where I stay/ })
    assert(await sw.getAttribute('aria-checked') === 'false', 'where you stay is in by default')
    await sh.getByRole('button', { name: 'Make the link' }).click()
    await sh.locator('.sl .u').waitFor()
    const id1 = flat(await sh.locator('.sl .u').textContent()).split('/p/')[1]
    const s1 = (await cloudOf(page)).shares[id1]
    const p1 = JSON.parse(s1.json)
    assert(s1.owner === ME.uid && s1.title === 'Rome' && s1.days === 5 && s1.start === trip.start && s1.cover.scene === trip.cover.scene, JSON.stringify({ ...s1, json: undefined }))
    assert(!('home' in p1) && !('driverCard' in p1) && !JSON.stringify(p1).includes(trip.home.address), 'where you stay is in the plan link')
    assert(!('seedId' in p1) && p1.days.length === 5 && p1.meet?.length === trip.meet.length, 'the plan in the link')
    // Ticked: a new link, with where you stay.
    await sw.click()
    assert(await sw.getAttribute('aria-checked') === 'true', 'the switch didn\'t turn on')
    await sh.getByRole('button', { name: 'Make the link' }).click()
    await until(async () => !flat(await sh.locator('.sl .u').textContent()).endsWith(id1), 'a second link')
    const id2 = flat(await sh.locator('.sl .u').textContent()).split('/p/')[1]
    const p2 = JSON.parse((await cloudOf(page)).shares[id2].json)
    assert(p2.home?.label === trip.home.label && same(p2.driverCard, trip.driverCard), 'where you stay isn\'t in the ticked link')
    // Remove it.
    await sh.getByRole('button', { name: 'Remove this link' }).click()
    await toastWith(page, 'Link removed')
    assert((await cloudOf(page)).shares[id2].revoked === true, 'the link wasn\'t removed')
    // Off again: the first link is back, and Post to your friends uses it with the composer.
    await sw.click()
    await until(async () => flat(await sh.locator('.sl .u').textContent()).endsWith(id1), 'the first link again')
    await sh.getByRole('button', { name: /^Post to your friends/ }).click()
    await until(() => query(page, 'compose') === '1', 'the composer')
    assert(Object.keys((await cloudOf(page)).shares).length === 2, 'Post to your friends made another link instead of the one made')
    await page.goBack()
    await until(() => !query(page, 'compose'), 'the composer to close')
    // The first two open Invite people instead (another package's sheet), as plan-together or follow-along.
    await sh.getByRole('button', { name: /^Plan it together/ }).click()
    await until(() => query(page, 'invite') === '1' && !query(page, 'share') && !query(page, 'role'), 'Invite people (?invite=1)')
    await openReady(page, 'more?share=1')
    await dialog(page, 'Share this plan').getByRole('button', { name: /^Let people follow along/ }).click()
    await until(() => query(page, 'invite') === '1' && query(page, 'role') === 'viewer' && !query(page, 'share'), 'Invite people as viewers')
  }))

/** Ali shares a copy of the Rome plan (nothing personal in it), as the app does. */
async function aliShares(page) {
  await profileOf(page, ALI)
  const { home: _h, driverCard: _d, seedId: _s, seedVersion: _v, edited: _e, ...plan } = trip
  return act(page, ALI, 'createShare', { title: 'Rome', destination: 'Rome', start: trip.start, end: trip.end, cover: trip.cover, days: trip.days.length, json: JSON.stringify(plan) })
}

await test('M13 /p/<id> signed out: the cover, title, dates, who shared it, each day\'s stops (options as their default), counts, and a sign-in button; nothing of the device', async () => {
  let cloud = ''
  let id = ''
  await withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    id = (await aliShares(page)).id
    cloud = await fakeCloud(page)
  })
  await withDevice({ signedOut: true, trips: [SECRET], cloud }, async ({ page }) => {
    await open(page, `/p/${id}`)
    await page.locator('#plan-title').waitFor()
    assert(new URL(page.url()).pathname.endsWith(`/p/${id}`), `moved to ${page.url()}`)
    const text = flat(await page.locator('.page').textContent())
    for (const s of ['Rome', '8–12 Oct 2026', 'Shared by Ali Demir', '5 days', `${trip.bookings.length} bookings`, `${trip.packing.length} packing items`, 'Vatican Museums + Sistine Chapel', FRI_NIGHT_TITLE]) {
      assert(text.includes(s), `missing "${s}"`)
    }
    assert(!text.includes('Pick your Friday night'), 'an option shows as its question, not its default choice')
    assert(await page.locator('.art-frame .scene svg').count() > 0, 'no cover art')
    const fri = page.locator('article.day').nth(1)
    assert(flat(await fri.locator('.kicker').textContent()) === 'Fri 9 Oct · Vatican', flat(await fri.locator('.kicker').textContent()))
    const first = flat(await fri.locator('li.st').first().textContent())
    assert(first.startsWith('08:00') && first.includes('Vatican Museums + Sistine Chapel'), first)
    assert(await page.getByRole('button', { name: 'Sign in with Google to copy this plan' }).count() === 1, 'no sign-in button')
    assert(!(await page.getByRole('button', { name: 'Copy to my trips' }).count()), 'Copy shows signed out')
    assert(!text.includes(SECRET.title) && !text.includes(SECRET.subtitle), 'the device\'s trip shows')
    assert(!(await page.locator('.shell').count()), 'a trip screen shows')
  })
})

await test('M14 /p/<id> signed in: Copy to my trips on new dates (the same dates if ahead, else the next same weekday, by default)', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    const s = await aliShares(page)
    await openReady(page, `/p/${s.id}`)
    const start = page.getByLabel('Start on')
    await start.waitFor()
    // The plan starts on Thu 8 Oct, gone by Fri 9 Oct: the next Thursday.
    assert(await start.inputValue() === '2026-10-15', `default start ${await start.inputValue()}`)
    assert(flat(await page.locator('.dates').textContent()) === 'Thu 15 Oct to Mon 19 Oct', flat(await page.locator('.dates').textContent()))
    await start.fill('2026-11-05')
    await page.getByText('Thu 5 Nov to Mon 9 Nov').waitFor()
    await page.getByRole('button', { name: 'Copy to my trips' }).click()
    await until(() => new URL(page.url()).pathname.endsWith('/trips/rome-2026-11/plan'), 'the copy\'s Plan')
    await ready(page)
    await toastWith(page, 'Rome is in your trips')
    const copy = (await storedTrips(page)).find(t => t.id === 'rome-2026-11')
    assert(copy, 'no copy stored')
    assert(copy.start === '2026-11-05' && copy.end === '2026-11-09', `${copy.start} ${copy.end}`)
    assert(same(copy.days.map(d => d.date), ['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09']), copy.days.map(d => d.date).join())
    assert(same(copy.days.map(d => d.num), ['V', 'VI', 'VII', 'VIII', 'IX']), copy.days.map(d => d.num).join())
    assert(same(copy.days.map(d => d.id), trip.days.map(d => d.id)), 'day ids changed')
    assert(same(copy.copiedFrom, { share: s.id, ownerName: 'Ali Demir', title: 'Rome' }), JSON.stringify(copy.copiedFrom))
    assert(!copy.seedId && !copy.group && !copy.home, 'the copy holds what it shouldn\'t')
    const due = trip.bookings.find(b => b.due)
    assert(copy.bookings.find(b => b.id === due.id).due === '2026-10-26', `a booking's due date: ${copy.bookings.find(b => b.id === due.id).due}`)
    assert((await bodyText(page)).includes('ROME') || (await bodyText(page)).includes('Rome'), 'the copy\'s Plan doesn\'t show')
    // The same plan again in that month gets an id of its own.
    await openReady(page, `/p/${s.id}`)
    await page.getByLabel('Start on').fill('2026-11-12')
    await page.getByRole('button', { name: 'Copy to my trips' }).click()
    await until(async () => (await storedTrips(page)).filter(t => t.id.startsWith('rome-2026-11')).length === 2, 'a second copy')
    assert(!(await storedTrips(page)).some(t => t.id === 'rome-sample' && t.copiedFrom), 'the sample was overwritten')
  }))

await test('M15 a removed plan link says so; a made-up one doesn\'t work', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    const s = await aliShares(page)
    await act(page, ALI, 'revokeShare', s.id)
    await openReady(page, `/p/${s.id}`)
    await page.getByText('This plan link was removed.').waitFor()
    assert(!(await page.getByRole('button', { name: 'Copy to my trips' }).count()), 'Copy on a removed link')
    await openReady(page, '/p/NoSuchPlanLink12345678')
    await page.getByText('This plan link doesn\'t work').waitFor()
  }))

// ---------- M16: people you met ----------

await test('M16 people you met: add (where prefilled with the stop on now), edit, delete with Undo, and send your friend link', () =>
  withDevice({}, async ({ page }) => {
    await openReady(page, 'meet')
    const sec = section(page, 'meet-people')
    await sec.getByRole('button', { name: 'Add someone' }).click()
    const sh = dialog(page, 'Someone you met')
    await sh.waitFor()
    // At Fri 21:00 the plan has you at dinner.
    assert(await sh.getByLabel('Where you met').inputValue() === 'Dinner at Armando al Pantheon', `where: ${await sh.getByLabel('Where you met').inputValue()}`)
    assert(await sh.getByLabel('Day', { exact: true }).inputValue() === 'fri', 'day')
    // A name is needed.
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.getByText('Add their name.').waitFor()
    assert(!Object.keys((await readProgress(page))?.people ?? {}).length, 'saved without a name')
    await sh.getByLabel('Name', { exact: true }).fill('Ana')
    await sh.getByLabel('Instagram or another handle').fill('@ana.travels')
    await sh.getByLabel('How to reach them').fill('WhatsApp via the hostel group')
    await sh.getByLabel('Note', { exact: true }).fill('From Lisbon, loves techno')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await toastWith(page, 'Added Ana')
    const people = Object.values((await readProgress(page)).people)
    assert(people.length === 1, `${people.length} people`)
    const ana = people[0]
    assert(ana.name === 'Ana' && ana.handle === '@ana.travels' && ana.contact === 'WhatsApp via the hostel group' && ana.where === 'Dinner at Armando al Pantheon'
      && ana.dayId === 'fri' && ana.note === 'From Lisbon, loves techno' && ana.at && ana.updatedAt, JSON.stringify(ana))
    const row = sec.locator(`[data-met="${ana.id}"]`)
    await row.waitFor()
    const line = flat(await row.innerText())
    assert(line.includes('Ana') && line.includes('@ana.travels') && line.includes('Dinner at Armando al Pantheon · Fri 9 Oct'), line)
    // Edit.
    await row.click()
    const ed = dialog(page, 'Ana')
    await ed.waitFor()
    assert(await ed.getByLabel('Instagram or another handle').inputValue() === '@ana.travels', 'the form isn\'t Ana\'s')
    await ed.getByLabel('Where you met').fill('Pub crawl')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await toastWith(page, 'Saved Ana')
    const edited = (await readProgress(page)).people[ana.id]
    assert(edited.where === 'Pub crawl' && edited.at === ana.at && edited.handle === '@ana.travels', JSON.stringify(edited))
    await until(async () => flat(await row.innerText()).includes('Pub crawl'), 'the row to change')
    // Send my friend link: your friend invite, through the share sheet.
    await row.click()
    await dialog(page, 'Ana').waitFor()
    await page.getByRole('button', { name: 'Send my friend link' }).click()
    const got = await until(async () => (await shared(page)).find(s => s.text === 'Add me on Travels:'), 'the share sheet')
    const token = got.url.split('/f/')[1]
    const inv = (await cloudOf(page)).invites[token]
    assert(inv?.kind === 'friend' && inv.from === ME.uid && !inv.revoked, `the link ${got.url}: ${JSON.stringify(inv)}`)
    // Delete, then Undo.
    await page.getByRole('button', { name: 'Delete' }).click()
    const t = await toastWith(page, 'Deleted Ana')
    await until(async () => !(await row.count()), 'the row to go')
    assert((await readProgress(page)).people[ana.id].deleted === true, 'no tombstone')
    await t.getByRole('button', { name: 'Undo' }).click()
    await row.waitFor()
    const back = (await readProgress(page)).people[ana.id]
    assert(!back.deleted && back.name === 'Ana' && back.where === 'Pub crawl', JSON.stringify(back))
  }))

// ---------- M18: Say hi ----------

/** Init script: the phone's speech, recorded (window.__spoken) instead of spoken. */
function speechStub() {
  window.__spoken = []
  try {
    window.speechSynthesis.speak = u => void window.__spoken.push([u.text, u.lang])
    window.speechSynthesis.cancel = () => {}
  }
  catch { /* no speech here */ }
}

await test('M18 Say hi, live Fri 9 Oct 21:00: the row to each part of the page, today\'s goal (kept in the day\'s note), lines with your first name to copy, invites from the plan that make a meetup, your friend QR, and Italian read aloud', () =>
  withDevice({ permissions: ['clipboard-read', 'clipboard-write'] }, async ({ page, ctx }) => {
    await ctx.addInitScript(speechStub)
    await openReady(page, 'meet')
    // The row: each part of the page, in its order; a tap scrolls to it.
    const jumps = await page.locator('nav.jump [data-jump]').evaluateAll(els => els.map(e => e.textContent.trim()))
    assert(same(jumps, ['Tonight', 'Say hi', 'People you met', 'Meetups', 'Friends here', 'Ideas']), `the row: ${jumps.join(', ')}`)
    const order = await page.locator('.meet section h2').evaluateAll(els => els.map(e => e.id))
    assert(same(order, ['meet-tonight', 'meet-talk', 'meet-people', 'meet-mine', 'meet-friends', 'meet-ways']), `the sections: ${order.join(', ')}`)
    await page.locator('nav.jump [data-jump="meet-ways"]').click()
    await until(async () => {
      const box = await page.locator('#meet-ways').boundingBox()
      return box && box.y >= 0 && box.y < 260
    }, 'Ideas scrolled into view')
    await page.evaluate(() => window.scrollTo(0, 0))
    // Today's goal: + and -, kept in Friday's note.
    const talk = section(page, 'meet-talk')
    const goal = talk.locator('[data-goal]')
    await goal.waitFor()
    assert(flat(await goal.innerText()).includes('Say hi to 5 people'), flat(await goal.innerText()))
    const minus = goal.getByRole('button', { name: 'One fewer' })
    const plus = goal.getByRole('button', { name: 'I said hi to someone' })
    assert(await minus.isDisabled(), '- is on at 0')
    for (let i = 0; i < 4; i++) await plus.click()
    await until(async () => flat(await goal.innerText()).includes('4 so far, 1 to go'), '4 so far')
    await plus.click()
    await toastWith(page, '5 people today. Well done.')
    assert(flat(await goal.innerText()).includes('Goal reached. Well done.'), 'no goal reached line')
    assert(await goal.locator('.g-seg.on').count() === 5, 'the bar is not full')
    await until(async () => (await readProgress(page))?.dayNotes?.fri?.talked === 5, 'talked: 5 in Friday\'s note')
    await minus.click()
    await until(async () => (await readProgress(page))?.dayNotes?.fri?.talked === 4, 'talked: 4 after -')
    // Start: openers with your first name; Copy puts the line on the clipboard.
    assert(await talk.locator('[data-tab="start"]').getAttribute('aria-pressed') === 'true', 'Start is not the first tab')
    const hostel = talk.locator('[data-group="hostel"] .line').first()
    assert(flat(await hostel.innerText()) === '“Hey, I\'m Test. Just got in. How long are you staying?”', flat(await hostel.innerText()))
    await hostel.getByRole('button', { name: /^Copy: / }).click()
    await toastWith(page, 'Copied')
    assert(await page.evaluate(() => navigator.clipboard.readText()) === 'Hey, I\'m Test. Just got in. How long are you staying?', 'the clipboard')
    // Wrap up: the advice reads as advice (no quotes, no copy), the lines to leave on can be copied.
    await talk.locator('[data-tab="leave"]').click()
    const respect = talk.locator('[data-group="respect"]')
    await respect.waitFor()
    assert(!(await respect.getByRole('button').count()), 'advice has copy buttons')
    assert(flat(await respect.innerText()).includes('Ask before a kiss: “Can I kiss you?” Only a clear yes is a yes.'), 'no consent line')
    assert(await talk.locator('[data-group="exits"]').getByRole('button', { name: /^Copy: / }).count() === 3, 'the exits can\'t be copied')
    // Invite: the plan's next stops; Make a meetup opens the meetup sheet for that stop.
    await talk.locator('[data-tab="invite"]').click()
    const crawl = talk.locator('[data-invite="pick-frinight"]')
    await crawl.waitFor()
    assert(flat(await crawl.innerText()).includes(`“${FRI_NIGHT_TITLE}, tonight at 21:30. Want to come with me?”`), flat(await crawl.innerText()))
    const invites = await talk.locator('[data-invite]').evaluateAll(els => els.map(e => e.dataset.invite))
    assert(invites.length === 4 && invites[0] === 'pick-frinight', `invites: ${invites.join(', ')}`)
    await crawl.getByRole('button', { name: 'Make a meetup' }).click()
    const sh = dialog(page, 'New meetup')
    await sh.waitFor()
    assert(query(page, 'meetup') === 'new' && query(page, 'stop') === 'pick-frinight', page.url())
    assert(await sh.getByLabel(/^Time/).inputValue() === '21:30', 'the meetup\'s time')
    await page.goBack()
    await until(() => !query(page, 'meetup'), 'the meetup sheet to close')
    // Your friend QR: your friend link, as a QR code.
    await talk.locator('[data-tab="invite"]').click()
    await talk.getByRole('button', { name: 'Show my friend QR' }).click()
    await talk.locator('.qr-box svg').waitFor()
    const invs = Object.values((await cloudOf(page)).invites ?? {})
    assert(invs.some(i => i.kind === 'friend' && i.from === ME.uid && !i.revoked), 'no friend link made')
    await talk.getByRole('button', { name: 'Hide my QR code' }).click()
    await until(async () => !(await talk.locator('.qr-box').count()), 'the QR code to hide')
    // Italian: the trip's lines for meeting people, read aloud in Italian; the tab is remembered.
    const local = talk.locator('[data-tab="local"]')
    assert(flat(await local.innerText()) === 'Italian', `the language tab: ${flat(await local.innerText())}`)
    await local.click()
    const ph = talk.locator('[data-group="local"] .ph')
    assert(await ph.count() === trip.meetPhrases.length, `${await ph.count()} phrases`)
    assert(flat(await ph.nth(1).innerText()).includes('Sei di Roma?'), flat(await ph.nth(1).innerText()))
    await ph.first().getByRole('button', { name: /^Hear / }).click()
    await until(async () => same((await page.evaluate(() => window.__spoken ?? []))[0], [trip.meetPhrases[0][0], 'it-IT']), 'the phrase read aloud in Italian')
    await openReady(page, 'meet')
    await until(async () => await section(page, 'meet-talk').locator('[data-tab="local"]').getAttribute('aria-pressed') === 'true', 'the tab remembered')
  }))

// ---------- M17: every new screen at 390 and 320 px, light and dark ----------

/** A person met, as progress holds it (the device's Seed). */
const MET = { 'met-ana': { id: 'met-ana', name: 'Ana Costa', handle: '@ana.travels', where: 'Hostel bar', dayId: 'thu', at: '2026-10-08T22:30:00.000Z', updatedAt: '2026-10-08T22:30:00.000Z' } }
const PROGRESS = { stops: {}, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {}, expenses: {}, stamps: {}, people: MET }

for (const width of [390, 320]) {
  for (const dark of [false, true]) {
    const tag = `${width} px, ${dark ? 'dark' : 'light'}`
    await test(`M17 every new screen at ${tag}: no sideways scroll, 44 px targets, text at 4.5:1, no page error`, async () => {
      const bad = []
      let cloud = ''
      let ids = {}
      const look = async (page, what, { sheet = '' } = {}) => {
        // The pointer stays where the last tap was: away from the controls, so none is measured mid-hover.
        await page.mouse.move(1, 1)
        await sleep(400)
        for (const x of await sideways(page)) bad.push(`${what}: ${x}`)
        const scroller = sheet ? `[role="dialog"][aria-label="${sheet}"] .body` : null
        for (const x of await allSmall(page, scroller)) bad.push(`${what}: small ${x.tag}.${x.cls} "${x.text || x.label}" ${x.w}x${x.h}${x.clip ? ` (${x.clip})` : ''}`)
        await page.mouse.move(1, 1)
        await sleep(250)
        for (const x of await contrastIssues(page, sheet ? `[role="dialog"][aria-label="${sheet}"]` : '.page')) bad.push(`${what}: ${x}`)
      }
      await withDevice({ width, dark, progress: PROGRESS }, async ({ page }) => {
        await openReady(page, 'meet')
        await aliInRome(page)
        await profileOf(page, CAN)
        const mine = await act(page, ME, 'createMeetup', PANTHEON)
        await act(page, CAN, 'setGoing', mine.id, true)
        const alis = await act(page, ALI, 'createMeetup', VATICAN)
        await act(page, CAN, 'setGoing', alis.id, true)
        const share = await aliShares(page)
        ids = { mine: mine.id, alis: alis.id, share: share.id }
        await openReady(page, 'meet')
        await section(page, 'meet-friends').locator('[data-friend]').waitFor()
        await section(page, 'meet-mine').locator('[data-meetup]').waitFor()
        await look(page, 'Meet people')
        const talk = section(page, 'meet-talk')
        await talk.getByRole('button', { name: 'I said hi to someone' }).click()
        for (const t of ['more', 'invite', 'leave', 'local', 'start']) {
          await talk.locator(`[data-tab="${t}"]`).click()
          if (t === 'invite') {
            await talk.getByRole('button', { name: 'Show my friend QR' }).click()
            await talk.locator('.qr-box svg').waitFor()
          }
          await look(page, `Say hi, ${t}`)
        }
        await openReady(page, 'meet?meetup=new&idea=crawl-ultimate-party')
        await dialog(page, 'New meetup').waitFor()
        await look(page, 'New meetup', { sheet: 'New meetup' })
        await openReady(page, `meet?meetup=${mine.id}`)
        await dialog(page, 'Your meetup').locator('.going').getByText('Can Yildiz').waitFor()
        await look(page, 'Your meetup', { sheet: 'Your meetup' })
        await dialog(page, 'Your meetup').getByRole('button', { name: 'Edit' }).click()
        await look(page, 'Your meetup, edit', { sheet: 'Your meetup' })
        await openReady(page, 'meet?share=1')
        const sh = dialog(page, 'Share this plan')
        await sh.getByRole('button', { name: /^Share a copy of the plan/ }).click()
        await sh.getByRole('button', { name: 'Make the link' }).click()
        await sh.locator('.sl .u').waitFor()
        await sh.getByRole('button', { name: 'QR code' }).click()
        await look(page, 'Share this plan', { sheet: 'Share this plan' })
        await openReady(page, 'meet?met=new')
        await dialog(page, 'Someone you met').waitFor()
        await look(page, 'Someone you met', { sheet: 'Someone you met' })
        await openReady(page, 'meet?met=met-ana')
        await dialog(page, 'Ana Costa').waitFor()
        await look(page, 'Ana Costa', { sheet: 'Ana Costa' })
        await openReady(page, 'plan?day=fri&stop=pantheon')
        await dialog(page, 'Pantheon').getByRole('button', { name: 'Ask people to join' }).waitFor()
        await look(page, 'Stop sheet', { sheet: 'Pantheon' })
        await openReady(page, `/m/${alis.id}`)
        await page.locator('.going').getByText('Can Yildiz').waitFor()
        await look(page, '/m/ signed in')
        await openReady(page, `/m/${mine.id}`)
        await page.getByRole('button', { name: 'Cancel meetup' }).waitFor()
        await look(page, '/m/ yours')
        await openReady(page, `/p/${share.id}`)
        await page.getByRole('button', { name: 'Copy to my trips' }).waitFor()
        await look(page, '/p/ signed in')
        cloud = await fakeCloud(page)
      })
      await withDevice({ width, dark, signedOut: true, cloud }, async ({ page }) => {
        await open(page, `/m/${ids.alis}`)
        await page.getByRole('button', { name: 'Sign in with Google to join' }).waitFor()
        await look(page, '/m/ signed out')
        await open(page, `/p/${ids.share}`)
        await page.getByRole('button', { name: 'Sign in with Google to copy this plan' }).waitFor()
        await look(page, '/p/ signed out')
      })
      assert(!bad.length, brief(bad))
    })
  }
}

await browser.close()
await srv?.close()
