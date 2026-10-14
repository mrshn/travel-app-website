// Browser checks for Plans changed and Claims (package P5 of docs/design/2026-10-14-together.md: T11, T12, 5.8, 5.12,
// 5.13 and section 9): running late, starting later, a cancelled flight, the rest of today off, group trips and people
// who can only view one, claims with their amounts, linked costs and steps, the deadline on Home, the cost sheet's
// "Part of a claim", and every new screen at 390 and 320 px, light and dark (no sideways scroll, 44 px touch targets,
// 4.5:1 text, no page error). Each check opens its own phone (390 x 844, touch, Europe/Rome) with Seed S of lib.mjs,
// live Fri 9 Oct 10:00, unless it says otherwise.
//
//   node tests/e2e/changes.e2e.mjs                against TRAVELS_URL, or the dev server on http://127.0.0.1:3000/
//   ONLY=P2,P7 node tests/e2e/changes.e2e.mjs     only the checks whose names start with those labels
//   SHOTS=<dir> node tests/e2e/changes.e2e.mjs    also saves a screenshot of each screen it looks at
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { BASE, TRIP, assert, check, live, loadTrip, noSideScroll, phone, readProgress, ready, romeCopy, seedS, sideScroll, smallTargets } from './lib.mjs'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean)
const SHOTS = process.env.SHOTS || ''
if (SHOTS) mkdirSync(SHOTS, { recursive: true })

const FRI10 = '2026-10-09T10:00'
const VATICAN = 'vatican-museums-sistine-chapel'
const PONTE = 'ponte-sant-angelo-via-dei-coronari-piazza-navona'
const STEPS = 'top-of-the-spanish-steps-for-sunset-18-38'
const ARMANDO = 'dinner-at-armando-al-pantheon'
const METRO = 'metro-a-termini-ottaviano'
const BONCI = 'early-lunch-at-bonci-pizzarium'
const ST_PETER = 'st-peter-s-basilica-the-free-grottoes'

const trip = loadTrip()
const seed = seedS(trip)
const clone = x => JSON.parse(JSON.stringify(x))
/** Seed S with Friday untouched: the morning after a cancelled flight, nothing done yet. */
const friFresh = (() => {
  const p = clone(seed)
  for (const s of trip.days[1].stops) delete p.stops[s.id]
  return p
})()
const AT = '2026-10-09T08:00:00.000Z'
/** A claim as the template makes one for Wizz Air, kept in progress (for checks that start from one). */
function wizzClaim(over = {}) {
  return {
    id: 'cl-wizz',
    kind: 'flight-cancelled',
    title: 'Wizz Air claim',
    company: 'Wizz Air',
    reference: 'TMICKP',
    incident: '2026-10-08',
    deadline: '2026-12-08',
    status: 'draft',
    lines: [
      { id: 'refund', label: 'Refund of the ticket', amount: 74.4, currency: 'EUR', odds: 'sure' },
      { id: 'new-ticket', label: 'Extra cost of the new ticket', amount: 254.99, currency: 'EUR', odds: 'likely' },
      { id: 'eu261', label: 'Fixed compensation (EU261)', amount: 250, currency: 'EUR', odds: 'unsure' },
    ],
    steps: [
      { id: 'collect', text: 'Collect receipts and screenshots', done: true },
      { id: 'send', text: 'Send the claim through the airline\'s form and save its reference', due: '2026-12-08' },
      { id: 'escalate', text: 'No answer within a month? Complain to the national enforcement body' },
    ],
    at: AT,
    updatedAt: AT,
    ...over,
  }
}
const withClaims = (p, ...claims) => ({ ...clone(p), claims: Object.fromEntries(claims.map(c => [c.id, c])) })
/** The Rome trip as a group trip on this device (no cloud in these checks: the chat line is never sent). */
const groupTrip = role => ({ ...romeCopy(trip), group: { id: 'g-e2e-group', role } })

const browser = await chromium.launch()

// ---------- helpers ----------

const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const sleep = ms => new Promise(res => setTimeout(res, ms))
const textOf = async loc => flat(await loc.innerText())

async function until(fn, message, ms = 6000) {
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
    await sleep(80)
  }
  throw new Error(`${message}${last instanceof Error ? ` (${last.message.split('\n')[0]})` : last !== undefined ? ` (last: ${JSON.stringify(last)})` : ''}`)
}

async function test(name, fn) {
  if (ONLY.length && !ONLY.some(p => name.startsWith(p))) return
  await check(name, fn)
}

/** A phone on `path` (a trip section, or "/…" for the app), live at `at`; Seed S unless `progress` is given (null: Fresh). */
async function open(path, { at = FRI10, progress = seed, ...opts } = {}) {
  const ph = await phone(browser, { ...opts, progress: progress ?? undefined })
  await live(ph.page, at)
  const url = path.startsWith('/') ? `${BASE}${path.slice(1)}` : `${BASE}trips/${TRIP}/${path}`
  await ph.page.goto(url, { waitUntil: 'domcontentloaded' })
  await ready(ph.page)
  return ph
}
const done = ph => ph.ctx.close()

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`) })
}

const sheetOf = (page, name) => page.getByRole('dialog', { name, exact: true })
const card = (page, key) => sheetOf(page, 'Plans changed').locator(`.pc-card[data-card="${key}"]`)

/** Opens Plans changed (from Now's link, or straight from the URL) and waits for its cards. */
async function openChanged(page) {
  const sh = sheetOf(page, 'Plans changed')
  if (!new URL(page.url()).searchParams.get('changed')) await page.locator('.pcl').click()
  await sh.waitFor({ timeout: 5000 })
  await sh.locator('.pc-card').first().waitFor()
  await sleep(250)
  return sh
}

async function step(page, key) {
  const sh = await openChanged(page)
  await card(page, key).click()
  await sh.locator('.step-h').waitFor()
  await sleep(200)
  return sh
}

async function toastWith(page, text) {
  const t = page.locator('.toasts .toast', { hasText: text }).last()
  await t.waitFor({ timeout: 6000 })
  return t
}
const toastText = async t => flat(await t.locator('.txt').textContent())
/**
 * The toast that says `text`, kept on screen while a check reads what changed: focus on its Undo holds it, as it does
 * for someone using a keyboard (ToastHost), so a slow machine can't let it go before Undo is tapped.
 */
async function heldToast(page, text) {
  const t = await toastWith(page, text)
  // A sheet that closed with the change gives focus back to its opener first, which would let the toast go again.
  await page.waitForFunction(() => !document.documentElement.classList.contains('sheet-open'), null, { timeout: 3000 }).catch(() => {})
  await sleep(100)
  await t.getByRole('button', { name: 'Undo' }).focus()
  return t
}

/** The trip as the page saved it. */
async function savedTrip(page) {
  return page.evaluate((id) => {
    try {
      return JSON.parse(localStorage.getItem('travel:trips:v1') || '[]').find(t => t.id === id) ?? null
    }
    catch {
      return null
    }
  }, TRIP)
}
const dayStops = async (page, dayId) => (await savedTrip(page))?.days.find(d => d.id === dayId)?.stops ?? []
const stopOf = async (page, dayId, id) => (await dayStops(page, dayId)).find(s => s.id === id)
const claimsOf = async page => Object.values((await readProgress(page))?.claims ?? {})
const expensesOf = async page => (await readProgress(page))?.expenses ?? {}
const seedStop = (dayId, id) => trip.days.find(d => d.id === dayId).stops.find(s => s.id === id)

/** Buttons and links under 44 x 44 px inside `root` only (everything else is hidden while it looks). */
async function smallIn(page, rootSelector) {
  await page.evaluate((sel) => {
    const keep = document.querySelector(sel)
    for (const el of document.querySelectorAll('body *')) {
      if (keep && (el === keep || el.contains(keep) || keep.contains(el))) continue
      if (el.matches('button, a[href], [role="button"]')) el.setAttribute('data-e2e-hidden', el.style.visibility || '_')
    }
    for (const el of document.querySelectorAll('[data-e2e-hidden]')) el.style.visibility = 'hidden'
  }, rootSelector)
  const small = await smallTargets(page)
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[data-e2e-hidden]')) {
      const was = el.getAttribute('data-e2e-hidden')
      el.style.visibility = was === '_' ? '' : was
      el.removeAttribute('data-e2e-hidden')
    }
  })
  return small
}

/** Text under 4.5:1 against what is behind it, inside `root` (text over pictures is left out). */
async function lowContrast(page, rootSelector, min = 4.5) {
  return page.evaluate(({ sel, min }) => {
    const root = document.querySelector(sel)
    if (!root) return [`no ${sel}`]
    function parse(c) {
      let m = /^rgba?\(([^)]+)\)/.exec(c)
      if (m) {
        const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
        return [p[0], p[1], p[2], p[3] ?? 1]
      }
      m = /^color\(srgb ([^)]+)\)/.exec(c)
      if (m) {
        const p = m[1].split(/[\s/]+/).filter(Boolean).map(Number)
        return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1]
      }
      return null
    }
    const over = (top, under) => [0, 1, 2].map(i => top[i] * top[3] + under[i] * (1 - top[3])).concat(1)
    const lum = (c) => {
      const f = (x) => {
        const v = x / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    }
    function behind(el) {
      const layers = []
      for (let e = el; e; e = e.parentElement) {
        const cs = getComputedStyle(e)
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return null
        if (e.classList.contains('art-frame') || e.classList.contains('on-art')) return null
        const c = parse(cs.backgroundColor)
        if (c && c[3] > 0) {
          layers.push(c)
          if (c[3] >= 1) break
        }
      }
      let bg = [255, 255, 255, 1]
      for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg)
      return bg
    }
    const out = []
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    const seen = new Set()
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement
      if (!el || seen.has(el) || !n.textContent.trim() || el.closest('svg, .sr-only, option, select')) continue
      seen.add(el)
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      if (cs.visibility === 'hidden' || cs.display === 'none' || r.width < 1 || r.height < 1 || Number(cs.opacity) === 0) continue
      const bg = behind(el)
      const fg = parse(cs.color)
      if (!bg || !fg) continue
      const a = lum(over(fg, bg))
      const b = lum(bg)
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      if (ratio < min) out.push(`${n.textContent.trim().slice(0, 30)} ${ratio.toFixed(2)}:1 (${cs.color} on rgb(${bg.slice(0, 3).map(Math.round).join(',')}))`)
    }
    return out
  }, { sel: rootSelector, min })
}

/** Sideways scroll on the page or inside an open sheet. */
async function sideways(page) {
  const out = []
  if (!(await noSideScroll(page))) out.push(`page ${JSON.stringify(await sideScroll(page))}`)
  const inner = await page.evaluate(() => [...document.querySelectorAll('.sheet .body')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => `${b.closest('[role=dialog]')?.getAttribute('aria-label')}: ${b.scrollWidth} > ${b.clientWidth}`))
  return out.concat(inner)
}

const describe = list => list.map(s => `${s.tag} "${s.text || s.label}" ${s.w}x${s.h}${s.clip ? ` (${s.clip})` : ''}`).join(', ')

// ---------- Now and the sheet's cards ----------

await test('P1 Now at Fri 10:00 has "Plans changed?" under the guide; it opens ?changed=1 with four cards in order', async () => {
  const ph = await open('now')
  try {
    const { page } = ph
    const link = page.locator('.pcl')
    assert(await textOf(link) === 'Plans changed? Running late, starting later or a cancelled flight', `link: ${await textOf(link)}`)
    const below = await page.evaluate(() => {
      const l = document.querySelector('.pcl')
      const hero = document.querySelector('.hero')
      return !!l && !!hero && !!(hero.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    assert(below, 'the link is not under the guide')
    await shot(page, 'p1-now-link')
    const sh = await openChanged(page)
    assert(new URL(page.url()).searchParams.get('changed') === '1', `url ${page.url()}`)
    const titles = (await sh.locator('.pc-card b').allInnerTexts()).map(flat)
    assert(JSON.stringify(titles) === JSON.stringify(['Running late', 'Starting later', 'Flight cancelled or delayed', 'Taking the rest of today off']), `cards: ${titles.join(' | ')}`)
    assert(await sh.evaluate(el => el.contains(document.activeElement)), 'focus is not in the sheet')
    // Back gives focus to the card that opened the step.
    await card(page, 'off').click()
    await sh.locator('.step-h').waitFor()
    assert(await sh.locator('.step-h').evaluate(el => el === document.activeElement), 'the step heading has no focus')
    await sh.getByRole('button', { name: 'Back' }).click()
    await until(() => card(page, 'off').evaluate(el => el === document.activeElement), 'focus did not return to the card')
    await page.keyboard.press('Escape')
    await sh.waitFor({ state: 'detached' })
    assert(!new URL(page.url()).searchParams.get('changed'), 'Escape left ?changed')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

// ---------- running late ----------

await test('P2 running late by 30 min moves the seven stops left and leaves the booked Pantheon and dinner; Undo puts them back', async () => {
  const ph = await open('now')
  try {
    const { page } = ph
    const sh = await step(page, 'late')
    assert(await sh.getByRole('button', { name: '30 minutes', exact: true }).getAttribute('aria-pressed') === 'true', '30 is not picked')
    const rows = (await sh.locator('.mv').allInnerTexts()).map(flat)
    assert(rows.length === 9, `${rows.length} rows: ${rows.join(' | ')}`)
    assert(rows[0].startsWith('16:30 → moves to 17:00 Ponte Sant'), `first row: ${rows[0]}`)
    assert(rows[0].includes('Now overlaps Pantheon at 17:15'), `no clash on the first row: ${rows[0]}`)
    assert(rows[1] === '17:15 Pantheon Stays: booked', `Pantheon: ${rows[1]}`)
    assert(rows.includes('19:30 Dinner at Armando al Pantheon Stays: booked'), `the dinner does not stay: ${rows.join(' | ')}`)
    assert(rows.find(r => r.includes('Top of the Spanish Steps'))?.includes('Now overlaps Dinner at Armando al Pantheon at 19:30'), 'no clash with the dinner')
    const move = sh.getByRole('button', { name: 'Move 7 stops' })
    assert(await move.count() === 1, 'no "Move 7 stops"')
    // 1 h 30 changes the list.
    await sh.getByRole('button', { name: '1 hour 30 minutes' }).click()
    assert((await textOf(sh.locator('.mv').first())).startsWith('16:30 → moves to 18:00'), `1 h 30: ${await textOf(sh.locator('.mv').first())}`)
    await sh.getByRole('button', { name: '30 minutes', exact: true }).click()
    await shot(page, 'p2-late')

    await move.click()
    const t = await heldToast(page, 'Moved 7 stops')
    assert(await toastText(t) === 'Moved 7 stops by 30 min', `toast: ${await toastText(t)}`)
    await sh.waitFor({ state: 'detached' })
    assert(!new URL(page.url()).searchParams.get('changed'), 'the sheet stayed in the URL')
    const fri = new Map((await dayStops(page, 'fri')).map(s => [s.id, s]))
    const ponte = fri.get(PONTE)
    assert(ponte.start === 1020 && ponte.end === 1065 && ponte.timeLabel === '17:00' && !!ponte.updatedAt, `Ponte: ${JSON.stringify(ponte)}`)
    const expect = { 'sant-ignazio-s-painted-false-dome': [1095, '18:15'], 'galleria-sciarra': [1105, '18:25'], 'trevi-fountain': [1115, '18:35'], [STEPS]: [1130, '18:50'], 'pick-frinight': [1320, '22:00'], 'trevi-at-night-free-and-lit': [1350, '22:30'] }
    for (const [id, [start, label]] of Object.entries(expect)) {
      const s = fri.get(id)
      assert(s.start === start && s.timeLabel === label, `${id}: ${JSON.stringify(s)}`)
    }
    for (const id of ['pantheon', ARMANDO, VATICAN, 'castel-sant-angelo-the-angel-s-terrace']) {
      const s = fri.get(id)
      const was = seedStop('fri', id)
      assert(s.start === was.start && s.timeLabel === was.timeLabel && !s.updatedAt, `${id} moved: ${JSON.stringify(s)}`)
    }
    await t.getByRole('button', { name: 'Undo' }).click()
    await until(async () => (await stopOf(page, 'fri', PONTE))?.start === 990, 'Undo did not put Ponte back')
    const back = new Map((await dayStops(page, 'fri')).map(s => [s.id, s]))
    for (const s of trip.days[1].stops) {
      const now = back.get(s.id)
      assert(now && now.start === s.start && now.end === s.end && now.timeLabel === s.timeLabel, `after Undo ${s.id}: ${JSON.stringify(now)}`)
    }
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('P2 running late from a stop on now that isn\'t done moves it too; nothing to move late at night', async () => {
  // 18:10 with Friday untouched: the Trevi Fountain (18:05 to 18:20) is on now, not done: it moves too.
  let ph = await open('now?changed=1', { at: '2026-10-09T18:10', progress: friFresh })
  try {
    const { page } = ph
    const sh = await step(page, 'late')
    const first = await textOf(sh.locator('.mv').first())
    assert(first.startsWith('18:05 → moves to 18:35 Trevi Fountain'), `first row at 18:10: ${first}`)
  }
  finally {
    await done(ph)
  }
  const late = clone(seed)
  for (const s of trip.days[1].stops) late.stops[s.id] = { status: 'done', at: AT }
  ph = await open('now?changed=1', { at: '2026-10-09T23:50', progress: late })
  try {
    const { page } = ph
    const sh = await step(page, 'late')
    assert((await textOf(sh)).includes('Nothing left to move today.'), `late at night: ${(await textOf(sh)).slice(0, 200)}`)
    assert(await sh.getByRole('button', { name: 'Nothing to move' }).isDisabled(), 'the button is not disabled')
  }
  finally {
    await done(ph)
  }
})

// ---------- starting later ----------

await test('P3 starting at 13:00 skips the morning and moves the Vatican Museums to Sat 10 (closed Sunday); Undo puts it all back', async () => {
  const ph = await open('now?changed=1', { progress: friFresh })
  try {
    const { page } = ph
    const sh = await step(page, 'later')
    const time = sh.getByLabel('I\'ll start at')
    assert(await time.inputValue() === '10:15', `default start: ${await time.inputValue()}`)
    await time.fill('13:00')
    await sleep(200)
    const skip = (await sh.locator('section[aria-labelledby="pc-skip-h"] li').allInnerTexts()).map(flat)
    assert(JSON.stringify(skip) === JSON.stringify(['07:15 Metro A, Termini → Ottaviano', '11:15 Early lunch at Bonci Pizzarium', '12:15 St Peter\'s Basilica + the free Grottoes']), `to skip: ${skip.join(' | ')}`)
    const must = sh.locator('.must')
    assert(await must.count() === 1 && (await textOf(must)).startsWith('08:00 Vatican Museums + Sistine Chapel Booked'), `must-dos: ${await textOf(must)}`)
    const choices = (await must.locator('.opts button').allInnerTexts()).map(flat)
    assert(JSON.stringify(choices) === JSON.stringify(['Move to Sat 10', 'Skip']), `choices: ${choices.join(' | ')}`)
    assert(await must.getByRole('button', { name: 'Move to Sat 10' }).getAttribute('aria-pressed') === 'true', 'Move is not the default')
    await shot(page, 'p3-later')
    await sh.getByRole('button', { name: /^Apply/ }).click()
    const t = await heldToast(page, 'Skipped 3 stops')
    assert(await toastText(t) === 'Skipped 3 stops · moved Vatican Museums + Sistine Chapel to Sat 10', `toast: ${await toastText(t)}`)
    const p = await readProgress(page)
    for (const id of [METRO, BONCI, ST_PETER]) assert(p.stops[id]?.status === 'skipped', `${id} not skipped`)
    assert(!p.stops[VATICAN], 'the Vatican was skipped')
    const saved = await savedTrip(page)
    assert(!saved.days.find(d => d.id === 'fri').stops.some(s => s.id === VATICAN), 'the Vatican is still on Friday')
    const sat = saved.days.find(d => d.id === 'sat').stops.find(s => s.id === VATICAN)
    assert(sat && sat.start === 480 && sat.bookingId === 'vatican' && !!sat.updatedAt, `on Saturday: ${JSON.stringify(sat)}`)
    assert(Object.keys(saved.tombstones ?? {}).includes(`stop:fri::${VATICAN}`), `tombstones: ${JSON.stringify(saved.tombstones)}`)
    await t.getByRole('button', { name: 'Undo' }).click()
    await until(async () => (await savedTrip(page)).days.find(d => d.id === 'fri').stops.some(s => s.id === VATICAN), 'Undo did not bring the Vatican back')
    const after = await savedTrip(page)
    assert(!after.days.find(d => d.id === 'sat').stops.some(s => s.id === VATICAN), 'the Vatican is still on Saturday')
    const p2 = await readProgress(page)
    for (const id of [METRO, BONCI, ST_PETER]) assert(!p2.stops[id], `${id} still skipped`)
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('P3 "Skip" on the must-do skips it too; a time after the last stop says nothing is skipped', async () => {
  const ph = await open('now?changed=1', { progress: friFresh })
  try {
    const { page } = ph
    const sh = await step(page, 'later')
    await sh.getByLabel('I\'ll start at').fill('13:00')
    await sh.locator('.must').getByRole('button', { name: 'Skip' }).click()
    await sh.getByRole('button', { name: /^Apply/ }).click()
    const t = await toastWith(page, 'Skipped 4 stops')
    assert(await toastText(t) === 'Skipped 4 stops', `toast: ${await toastText(t)}`)
    const p = await readProgress(page)
    assert(p.stops[VATICAN]?.status === 'skipped', 'the Vatican is not skipped')
    assert((await savedTrip(page)).days.find(d => d.id === 'fri').stops.some(s => s.id === VATICAN), 'the Vatican left Friday')
  }
  finally {
    await done(ph)
  }
})

// ---------- the rest of today off ----------

await test('P4 the rest of today off at Fri 16:40 skips seven stops, keeps the booked Pantheon and dinner; Undo', async () => {
  const ph = await open('now?changed=1', { at: '2026-10-09T16:40' })
  try {
    const { page } = ph
    const sh = await step(page, 'off')
    const said = await textOf(sh)
    assert(said.includes('Still in your plan 17:15 Pantheon 19:30 Dinner at Armando al Pantheon'), `keep: ${said}`)
    await shot(page, 'p4-off')
    await sh.getByRole('button', { name: 'Skip 7 stops' }).click()
    const t = await heldToast(page, 'The rest of today is off')
    assert(await toastText(t) === 'The rest of today is off: 7 stops skipped', `toast: ${await toastText(t)}`)
    const p = await readProgress(page)
    for (const id of [PONTE, 'sant-ignazio-s-painted-false-dome', 'galleria-sciarra', 'trevi-fountain', STEPS, 'pick-frinight', 'trevi-at-night-free-and-lit']) {
      assert(p.stops[id]?.status === 'skipped', `${id} is not skipped`)
    }
    assert(!p.stops.pantheon && !p.stops[ARMANDO], 'a booked stop was skipped')
    await t.getByRole('button', { name: 'Undo' }).click()
    await until(async () => !(await readProgress(page)).stops[PONTE], 'Undo kept the skips')
    assert(Object.keys((await readProgress(page)).stops).length === Object.keys(seed.stops).length, 'Undo changed other marks')
  }
  finally {
    await done(ph)
  }
})

// ---------- a cancelled or delayed flight ----------

await test('P5 the flight card: the checklist keeps its ticks for the visit; the message to your stay in English and Italian, copied', async () => {
  const ph = await open('now?changed=1', { permissions: ['clipboard-read', 'clipboard-write'] })
  try {
    const { page } = ph
    let sh = await step(page, 'flight')
    const items = (await sh.locator('.ck-main').allInnerTexts()).map(flat)
    assert(items.length === 7 && items[0] === 'Ask for rerouting on another airline before accepting a refund or credit' && items[5] === 'Tell your stay you\'ll arrive later', `checklist: ${items.join(' | ')}`)
    await sh.getByLabel('Ask for rerouting on another airline before accepting a refund or credit').check()
    await sh.getByLabel('Keep every receipt and screenshot').check()
    assert((await textOf(sh)).includes('This is a guide, not legal advice.'), 'no guide line')
    await shot(page, 'p5-flight')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await ready(page)
    sh = await step(page, 'flight')
    assert(await sh.getByLabel('Ask for rerouting on another airline before accepting a refund or credit').isChecked(), 'the tick did not stay')
    assert(await sh.getByLabel('Keep every receipt and screenshot').isChecked(), 'the second tick did not stay')
    assert(!(await sh.getByLabel('Ask for the reason in writing').isChecked()), 'an untouched item is ticked')

    await sh.getByLabel('I\'ll arrive on').selectOption('fri')
    await sh.getByLabel(/^Around/).fill('13:30')
    await sleep(150)
    const en = await textOf(sh.locator('.msg-t[lang="en"]'))
    assert(en === 'Hello. I have a booking with you from Thursday 8 October. Because of a problem with my flight, I\'ll arrive later than planned: on Friday 9 October, around 13:30. Please don\'t cancel my booking: I\'m still coming. Thank you.', `English: ${en}`)
    const it = await textOf(sh.locator('.msg-t[lang="it"]'))
    assert(it.startsWith('Buongiorno. Ho una prenotazione da voi a partire da giovedì 8 ottobre.') && it.includes('venerdì 9 ottobre, verso le ore 13:30.'), `Italian: ${it}`)
    await sh.locator('.msg').first().getByRole('button', { name: 'Copy' }).click()
    await toastWith(page, 'Message in English copied')
    assert(await page.evaluate(() => navigator.clipboard.readText()) === en, 'the clipboard does not hold the message')
    await sh.getByRole('button', { name: 'Copy the message in Italian' }).click()
    await toastWith(page, 'Message in Italian copied')
    assert(await page.evaluate(() => navigator.clipboard.readText()) === it, 'the clipboard does not hold the Italian')

    // Re-plan tomorrow: Starting later for Sat 10, from midday; Back returns to the flight card.
    await sh.getByRole('button', { name: 'Re-plan tomorrow' }).click()
    await until(async () => (await textOf(sh.locator('.step-h'))) === 'Starting later', 'not on Starting later')
    assert((await textOf(sh)).includes('Saturday 10 October'), 'not for Saturday')
    assert(await sh.getByLabel('I\'ll start at').inputValue() === '12:00', 'not from midday')
    const skip = (await sh.locator('section[aria-labelledby="pc-skip-h"] li').allInnerTexts()).map(flat)
    assert(skip.length && skip[0].startsWith('07:30 Bar breakfast'), `Saturday's morning: ${skip.join(' | ')}`)
    assert((await textOf(sh.locator('.must'))).includes('Colosseum'), 'the Colosseum is not a must-do')
    await sh.getByRole('button', { name: 'Back' }).click()
    await until(async () => (await textOf(sh.locator('.step-h'))) === 'Flight cancelled or delayed', 'Back did not return to the flight card')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('P6 "Start a claim" starts a Flight cancelled claim for Thu 8 Oct, due 8 Dec, with its lines and steps', async () => {
  const ph = await open('now?changed=1')
  try {
    const { page } = ph
    const sh = await step(page, 'flight')
    await sh.getByRole('button', { name: 'Start a claim' }).click()
    const claim = sheetOf(page, 'Claim')
    await claim.waitFor()
    const id = await until(() => {
      const q = new URL(page.url()).searchParams.get('claim')
      return q && q !== 'new' ? q : null
    }, 'the URL has no claim id')
    assert(!new URL(page.url()).searchParams.get('changed') && !new URL(page.url()).searchParams.get('kind'), `url ${page.url()}`)
    await toastWith(page, 'Claim started. It saves as you go.')
    const c = (await claimsOf(page)).find(x => x.id === id)
    assert(c && c.kind === 'flight-cancelled' && c.title === 'Flight cancelled' && c.status === 'draft' && c.incident === '2026-10-08' && c.deadline === '2026-12-08', `claim: ${JSON.stringify(c)}`)
    assert(c.lines.length === 5 && c.steps.length === 3 && c.steps[1].due === '2026-12-08', `lines and steps: ${JSON.stringify(c)}`)
    const top = await textOf(claim.locator('.cl-sum'))
    assert(top.includes('Flight cancelled') && top.includes('Not sent yet') && top.includes('Send by 8 Dec · 60 days left'), `summary: ${top}`)
    assert(await claim.getByLabel('It happened on').inputValue() === '2026-10-08', 'the date it happened')
    assert((await textOf(claim)).includes('Two months after the flight, to be safe. Check their own deadline.'), 'no deadline hint')
    assert((await textOf(claim)).includes('This is a guide, not legal advice.'), 'no guide line')
    // Back goes to the plans changed sheet.
    await page.goBack()
    await sheetOf(page, 'Plans changed').waitFor()
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

// ---------- claims ----------

await test('P7 a claim from the Claims page: lines, a linked cost, a cost added from it, steps, sent; the list says where it stands', async () => {
  const ph = await open('claims')
  try {
    const { page } = ph
    assert((await textOf(page.locator('.page.claims'))).includes('What happened?'), 'no templates on the empty page')
    const kinds = (await page.locator('.kind b').allInnerTexts()).map(flat)
    assert(JSON.stringify(kinds) === JSON.stringify(['Flight cancelled', 'Flight delayed', 'Lost or late bag', 'Booking refund', 'Other']), `templates: ${kinds.join(' | ')}`)
    await shot(page, 'p7-claims-empty')
    await page.getByRole('link', { name: /^Flight cancelled/ }).click()
    const sh = sheetOf(page, 'Claim')
    await sh.waitFor()
    await until(() => new URL(page.url()).searchParams.get('claim')?.startsWith('cl-'), 'no claim id in the URL')
    const id = new URL(page.url()).searchParams.get('claim')
    await sh.getByLabel('Title').fill('Wizz Air claim')
    await sh.getByLabel('Company').fill('Wizz Air')
    await sh.getByLabel('Your booking reference').fill('TMICKP')
    await sh.getByLabel('Refund of the ticket: amount in EUR').fill('74,40')
    await sh.getByLabel('Extra cost of the new ticket: amount in EUR').fill('254.99')
    await sh.getByLabel('Fixed compensation (EU261): amount in EUR').fill('250')
    await sh.getByLabel('Meals and transport while waiting: how likely').selectOption('sure')
    await until(async () => (await claimsOf(page)).find(c => c.id === id)?.company === 'Wizz Air', 'the company was not saved')
    const top = await textOf(sh.locator('.cl-sum'))
    assert(top.includes('€579.39') && top.includes('likely €329'), `totals: ${top}`)

    // Link an old cost (the Metro, "Logged earlier"): it becomes a record that is part of the claim.
    await sh.getByRole('button', { name: /Link from your costs/ }).click()
    await sh.getByRole('switch', { name: /Part of this claim: Metro A/ }).check()
    await until(async () => (await expensesOf(page))[`legacy-stop-${METRO}`]?.claimId === id, 'the Metro cost is not linked')
    const metro = (await expensesOf(page))[`legacy-stop-${METRO}`]
    assert(metro.amount === 25 && metro.cat === 'transport' && metro.dayId === 'fri' && !metro.deleted, `Metro: ${JSON.stringify(metro)}`)

    // A cost added from the claim opens the cost sheet over it and is part of it.
    await sh.getByRole('button', { name: 'Add a cost' }).click()
    const cs = sheetOf(page, 'Add a cost')
    await cs.waitFor()
    assert(new URL(page.url()).searchParams.get('claim') === id && new URL(page.url()).searchParams.get('cost') === 'new', `url ${page.url()}`)
    assert((await textOf(cs)).includes('Part of Wizz Air claim'), 'no claim line in the cost sheet')
    assert(await cs.locator('.chip.at').count() === 0, 'a cost for a claim is linked to the stop on now')
    const onTop = await page.evaluate(() => {
      const [a, b] = ['Add a cost', 'Claim'].map(n => document.querySelector(`[role="dialog"][aria-label="${n}"]`)?.closest('.sheet-wrap'))
      return a && b ? Number(getComputedStyle(a).zIndex) > Number(getComputedStyle(b).zIndex) : false
    })
    assert(onTop, 'the cost sheet is not over the claim')
    for (const k of ['1', '8']) await cs.getByRole('button', { name: k, exact: true }).click()
    await cs.locator('button.cat', { hasText: 'Food' }).click()
    await cs.waitFor({ state: 'detached' })
    const food = await until(async () => Object.values(await expensesOf(page)).find(e => e.amount === 18 && !e.deleted), 'no €18 cost')
    assert(food.claimId === id && food.cat === 'food' && !food.stopId, `€18: ${JSON.stringify(food)}`)
    assert(await sh.isVisible(), 'the claim closed')
    await until(async () => (await textOf(sh.locator('.lc-sum'))) === '2 costs linked €43.00', 'the claim does not show both costs')

    // Steps: tick one, add one; "Sent on" makes it sent, ticks the send step and dates the next one.
    await sh.getByLabel('Done: Collect receipts and screenshots').check()
    await sh.getByLabel('A new step').fill('Call the airline about the credit')
    await sh.getByLabel('A new step').press('Enter')
    await sh.getByLabel('Sent on').fill('2026-10-09')
    await until(async () => (await claimsOf(page)).find(c => c.id === id)?.status === 'sent', 'not sent')
    const c = (await claimsOf(page)).find(x => x.id === id)
    assert(c.sentOn === '2026-10-09' && c.steps.find(s => s.id === 'escalate')?.due === '2026-11-09', `escalate: ${JSON.stringify(c.steps)}`)
    assert(c.steps.find(s => s.id === 'send')?.done === true && c.steps.find(s => s.id === 'collect')?.done === true, `ticks: ${JSON.stringify(c.steps)}`)
    assert(c.steps.some(s => s.text === 'Call the airline about the credit'), 'the new step is missing')
    assert(JSON.stringify(c.lines.map(l => l.amount)) === JSON.stringify([74.4, 254.99, 0, 250, 0]), `amounts: ${JSON.stringify(c.lines)}`)
    assert(await sh.getByLabel('Where it stands').inputValue() === 'sent', 'the status is not Sent')
    assert((await textOf(sh.locator('.cl-sum'))).includes('Sent 9 Oct · answer due by 9 Nov'), `summary: ${await textOf(sh.locator('.cl-sum'))}`)
    await shot(page, 'p7-claim')

    await sh.getByRole('button', { name: 'Done' }).click()
    await sh.waitFor({ state: 'detached' })
    const row = await textOf(page.locator('.cl-card'))
    assert(row === 'Wizz Air claim Wizz Air · TMICKP Sent Sent 9 Oct · answer due by 9 Nov €579.39 · likely €329 · 2 of 4 steps done', `list: ${row}`)
    assert(await page.locator('.kind').count() === 0, 'the templates still show')
    await page.getByRole('button', { name: 'New claim' }).click()
    assert(await page.locator('.kind').count() === 5, 'New claim does not show the templates')
    await shot(page, 'p7-claims-list')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('P7 the deadline follows the date it happened; Delete asks first, then Undo brings the claim back', async () => {
  const ph = await open(`claims?claim=cl-wizz`, { progress: withClaims(seed, wizzClaim()) })
  try {
    const { page } = ph
    const sh = sheetOf(page, 'Claim')
    await sh.waitFor()
    await sh.getByLabel('It happened on').fill('2026-10-10')
    await until(async () => (await claimsOf(page))[0]?.deadline === '2026-12-10', 'the deadline did not follow')
    assert((await claimsOf(page))[0].steps.find(s => s.id === 'send').due === '2026-12-10', 'the send step did not follow')
    // A deadline you set yourself stays.
    await sh.getByLabel('Send it by').fill('2026-11-30')
    await sh.getByLabel('It happened on').fill('2026-10-08')
    await until(async () => (await claimsOf(page))[0]?.incident === '2026-10-08', 'the date was not saved')
    assert((await claimsOf(page))[0].deadline === '2026-11-30', 'your own deadline moved')
    let asked = ''
    page.once('dialog', (d) => {
      asked = d.message()
      d.accept()
    })
    await sh.getByRole('button', { name: 'Delete' }).click()
    const t = await heldToast(page, 'Deleted: Wizz Air claim')
    assert(asked.startsWith('Delete “Wizz Air claim”?'), `confirm: ${asked}`)
    await sh.waitFor({ state: 'detached' })
    assert((await claimsOf(page))[0].deleted === true, 'not a tombstone')
    assert(!new URL(page.url()).searchParams.get('claim'), 'the URL keeps the claim')
    assert(await page.locator('.cl-card').count() === 0, 'the list still shows it')
    await t.getByRole('button', { name: 'Undo' }).click()
    await until(async () => (await claimsOf(page))[0]?.deleted !== true, 'Undo did not bring it back')
    await until(async () => (await page.locator('.cl-card').count()) === 1, 'the list does not show it again')
    // Dismissing the question deletes nothing.
    await page.locator('.cl-card').click()
    await sh.waitFor()
    page.once('dialog', d => d.dismiss())
    await sh.getByRole('button', { name: 'Delete' }).click()
    await sleep(300)
    assert(!(await claimsOf(page))[0].deleted && await sh.isVisible(), 'dismissing deleted it')
  }
  finally {
    await done(ph)
  }
})

// ---------- Home ----------

await test('P8 Home shows the deadline from 60 days out: plain, amber within 14 days, red once late; never once sent', async () => {
  const cases = [
    ['2026-09-30T12:00', null],
    ['2026-10-14T12:00', ['Wizz Air claim: send by 8 Dec · 55 days left', 'ok']],
    ['2026-11-28T12:00', ['Wizz Air claim: send by 8 Dec · 10 days left', 'soon']],
    ['2026-12-10T12:00', ['Wizz Air claim: send by 8 Dec · 2 days late', 'overdue']],
  ]
  for (const [at, want] of cases) {
    const ph = await open('/', { at, progress: withClaims(seed, wizzClaim(), wizzClaim({ id: 'cl-sent', title: 'Sent one', status: 'sent', sentOn: '2026-10-12' })) })
    try {
      const { page } = ph
      const box = page.locator('.deadlines')
      if (!want) {
        assert(await box.count() === 0, `${at}: deadlines show 69 days out`)
        continue
      }
      const rows = page.locator('.deadlines .hd')
      assert(await rows.count() === 1, `${at}: ${await rows.count()} rows`)
      const line = await textOf(rows.locator('.hd-l1'))
      assert(line === want[0], `${at}: ${line}`)
      assert(await rows.locator(`.hd-l1 .tone-${want[1]}`).count() === 1, `${at}: not ${want[1]}`)
      assert((await textOf(rows)).endsWith('Rome'), `${at}: no trip name`)
      if (want[1] === 'overdue') {
        const color = await rows.locator('.hd-l1 .tone-overdue').evaluate(el => getComputedStyle(el).color)
        const bad = await page.evaluate(() => {
          const i = document.createElement('i')
          i.style.color = 'var(--bad)'
          document.body.appendChild(i)
          const c = getComputedStyle(i).color
          i.remove()
          return c
        })
        assert(color === bad, `overdue colour ${color}, --bad ${bad}`)
        await shot(page, 'p8-home-overdue')
        await rows.click()
        await sheetOf(page, 'Claim').waitFor()
        assert(new URL(page.url()).pathname.endsWith(`/trips/${TRIP}/claims`) && new URL(page.url()).searchParams.get('claim') === 'cl-wizz', `opened ${page.url()}`)
      }
      assert(!ph.errors.length, `${at}: page errors: ${ph.errors.join(' / ')}`)
    }
    finally {
      await done(ph)
    }
  }
})

// ---------- the cost sheet ----------

await test('P9 the cost sheet: "Part of a claim" in edit mode links and unlinks; no claim, no field; added from a claim, it is part of it', async () => {
  let ph = await open('costs')
  try {
    const { page } = ph
    await page.locator('button.crow', { hasText: 'Vatican Museums' }).click()
    const sh = sheetOf(page, 'Edit cost')
    await sh.waitFor()
    assert(await sh.getByLabel('Part of a claim').count() === 0, 'the field shows with no claim')
  }
  finally {
    await done(ph)
  }
  ph = await open('costs', { progress: withClaims(seed, wizzClaim(), wizzClaim({ id: 'cl-paid', title: 'Paid one', status: 'paid' })) })
  try {
    const { page } = ph
    await page.locator('button.crow', { hasText: 'Vatican Museums' }).click()
    let sh = sheetOf(page, 'Edit cost')
    await sh.waitFor()
    const field = sh.getByLabel('Part of a claim')
    assert(await field.inputValue() === '', 'not None')
    const options = (await field.locator('option').allInnerTexts()).map(flat)
    assert(JSON.stringify(options) === JSON.stringify(['None', 'Wizz Air claim']), `options: ${options.join(' | ')}`)
    await field.selectOption('cl-wizz')
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    const rec = await until(async () => (await expensesOf(page))[`legacy-stop-${VATICAN}`], 'no record for the old value')
    assert(rec.claimId === 'cl-wizz' && rec.amount === 12, `record: ${JSON.stringify(rec)}`)
    await page.locator('button.crow', { hasText: 'Vatican Museums' }).click()
    sh = sheetOf(page, 'Edit cost')
    await sh.waitFor()
    assert(await sh.getByLabel('Part of a claim').inputValue() === 'cl-wizz', 'the field does not show the claim')
    await shot(page, 'p9-cost-edit')
    await sh.getByLabel('Part of a claim').selectOption('')
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    await until(async () => !('claimId' in ((await expensesOf(page))[`legacy-stop-${VATICAN}`] ?? { claimId: 1 })), 'not unlinked')
    // Escape keeps what was there.
    await page.locator('button.crow', { hasText: 'Vatican Museums' }).click()
    sh = sheetOf(page, 'Edit cost')
    await sh.waitFor()
    await sh.getByLabel('Part of a claim').selectOption('cl-wizz')
    await page.keyboard.press('Escape')
    await sh.waitFor({ state: 'detached' })
    await sleep(300)
    assert(!(await expensesOf(page))[`legacy-stop-${VATICAN}`].claimId, 'Escape linked it')
    // Opened from the claim (?claim=…&cost=new).
    await page.goto(`${BASE}trips/${TRIP}/costs?claim=cl-wizz&cost=new`, { waitUntil: 'domcontentloaded' })
    await ready(page)
    const add = sheetOf(page, 'Add a cost')
    await add.waitFor()
    assert((await textOf(add)).includes('Part of Wizz Air claim'), 'no claim line')
    for (const k of ['3', '5']) await add.getByRole('button', { name: k, exact: true }).click()
    await add.locator('button.cat', { hasText: 'Transport' }).click()
    const taxi = await until(async () => Object.values(await expensesOf(page)).find(e => e.amount === 35 && !e.deleted), 'no €35 cost')
    assert(taxi.claimId === 'cl-wizz' && taxi.cat === 'transport', `€35: ${JSON.stringify(taxi)}`)
    await sheetOf(page, 'Claim').waitFor()
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

// ---------- group trips ----------

await test('P10 in a group trip, moving stops asks first ("This changes the plan for everyone in this trip.")', async () => {
  const ph = await open('now?changed=1', { trips: [groupTrip('editor')] })
  try {
    const { page } = ph
    const sh = await step(page, 'late')
    assert((await textOf(sh)).includes('This changes the plan for everyone in this trip.'), 'no note')
    let asked = ''
    page.once('dialog', (d) => {
      asked = d.message()
      d.dismiss()
    })
    await sh.getByRole('button', { name: 'Move 7 stops' }).click()
    await sleep(300)
    assert(asked === 'This changes the plan for everyone in this trip. Move 7 stops by 30 min?', `asked: ${asked}`)
    assert((await stopOf(page, 'fri', PONTE)).start === 990, 'it moved after No')
    page.once('dialog', d => d.accept())
    await sh.getByRole('button', { name: 'Move 7 stops' }).click()
    await toastWith(page, 'Moved 7 stops by 30 min')
    assert((await stopOf(page, 'fri', PONTE)).start === 1020, 'it did not move after Yes')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('P10 someone who can only view a group trip gets the personal parts: no running late, must-dos only skip, the rest of today off', async () => {
  const ph = await open('now?changed=1', { trips: [groupTrip('viewer')], progress: friFresh })
  try {
    const { page } = ph
    let sh = await openChanged(page)
    const titles = (await sh.locator('.pc-card b').allInnerTexts()).map(flat)
    assert(JSON.stringify(titles) === JSON.stringify(['Starting later', 'Flight cancelled or delayed', 'Taking the rest of today off']), `cards: ${titles.join(' | ')}`)
    assert((await textOf(sh)).includes('You can view this plan: skipping stops is just for you.'), 'no viewer note')
    sh = await step(page, 'later')
    await sh.getByLabel('I\'ll start at').fill('13:00')
    const must = sh.locator('.must')
    assert(JSON.stringify((await must.locator('.opts button').allInnerTexts()).map(flat)) === JSON.stringify(['Skip']), 'a viewer can move a stop')
    assert((await textOf(sh)).includes('Only the people who can edit this plan can move stops.'), 'no note on moving')
    await sh.getByRole('button', { name: /^Apply/ }).click()
    await toastWith(page, 'Skipped 4 stops')
    assert((await readProgress(page)).stops[VATICAN]?.status === 'skipped', 'the Vatican is not skipped')
    assert((await savedTrip(page)).days.find(d => d.id === 'fri').stops.some(s => s.id === VATICAN), 'the plan changed')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

// ---------- before and after the trip, and Plan ----------

await test('P11 before the trip: "Flight trouble?" from the day before, with the flight card and starting the first day later', async () => {
  let ph = await open('now', { at: '2026-09-30T12:00', progress: null })
  try {
    assert(await ph.page.locator('.pcl').count() === 0, 'the link shows eight days out')
    await ph.page.goto(`${BASE}trips/${TRIP}/plan?day=thu`, { waitUntil: 'domcontentloaded' })
    await ready(ph.page)
    assert(await ph.page.locator('.pdt').count() === 0, 'Plan\'s tools show eight days out')
  }
  finally {
    await done(ph)
  }
  ph = await open('now', { at: '2026-10-07T12:00', progress: null })
  try {
    const { page } = ph
    const link = page.locator('.pcl')
    assert(await textOf(link) === 'Flight trouble? What to do, and how to re-plan', `link: ${await textOf(link)}`)
    await shot(page, 'p11-before')
    const sh = await openChanged(page)
    const titles = (await sh.locator('.pc-card b').allInnerTexts()).map(flat)
    assert(JSON.stringify(titles) === JSON.stringify(['Flight cancelled or delayed', 'Starting later']), `cards: ${titles.join(' | ')}`)
    await card(page, 'flight').click()
    assert(await sh.getByRole('button', { name: 'Re-plan tomorrow' }).count() === 1, 'no Re-plan tomorrow')
    await sh.getByRole('button', { name: 'Re-plan tomorrow' }).click()
    assert((await textOf(sh)).includes('Thursday 8 October'), 'not for the first day')
  }
  finally {
    await done(ph)
  }
})

await test('P11 Plan\'s "Plans changed?" is there for today and the days ahead, opens the sheet for that day, and not after the trip', async () => {
  let ph = await open('plan?day=thu')
  try {
    const { page } = ph
    assert(await page.locator('.pdt').count() === 0, 'tools on a day gone by')
    await page.goto(`${BASE}trips/${TRIP}/plan?day=sat`, { waitUntil: 'domcontentloaded' })
    await ready(page)
    await page.locator('.pdt').getByRole('button', { name: 'Plans changed?' }).click()
    await until(() => new URL(page.url()).searchParams.get('changed'), 'the button did not open ?changed')
    const sh = await openChanged(page)
    const q = new URL(page.url()).searchParams
    assert(q.get('changed') === '1' && q.get('day') === 'sat', `url ${page.url()}`)
    const titles = (await sh.locator('.pc-card b').allInnerTexts()).map(flat)
    assert(JSON.stringify(titles) === JSON.stringify(['Starting later', 'Flight cancelled or delayed']), `cards for Saturday: ${titles.join(' | ')}`)
    assert((await textOf(card(page, 'later'))).includes('On Sat 10'), 'not for Saturday')
    await page.keyboard.press('Escape')
    await sh.waitFor({ state: 'detached' })
    assert(new URL(page.url()).searchParams.get('day') === 'sat', 'closing lost the day of the plan')
    await page.goto(`${BASE}trips/${TRIP}/plan?day=fri`, { waitUntil: 'domcontentloaded' })
    await ready(page)
    assert(await page.locator('.pdt').count() === 1, 'no tools today')
  }
  finally {
    await done(ph)
  }
  ph = await open('plan?day=mon', { at: '2026-10-20T12:00' })
  try {
    assert(await ph.page.locator('.pdt').count() === 0, 'tools after the trip')
    assert(await ph.page.locator('.pcl').count() === 0, 'a link after the trip')
  }
  finally {
    await done(ph)
  }
})

// ---------- offline ----------

await test('P12 offline after load, running late and a new claim work with no page error', async () => {
  // Pages already loaded only: these checks block the service worker that serves the app offline.
  const ph = await open('now?changed=1')
  try {
    const { page, ctx } = ph
    await ctx.setOffline(true)
    const sh = await step(page, 'late')
    await sh.getByRole('button', { name: 'Move 7 stops' }).click()
    await toastWith(page, 'Moved 7 stops by 30 min')
    assert((await stopOf(page, 'fri', PONTE)).start === 1020, 'not moved offline')
    await ctx.setOffline(false)
    await page.goto(`${BASE}trips/${TRIP}/claims`, { waitUntil: 'domcontentloaded' })
    await ready(page)
    await ctx.setOffline(true)
    await page.getByRole('link', { name: /^Lost or late bag/ }).click()
    const claim = sheetOf(page, 'Claim')
    await claim.waitFor()
    await claim.getByLabel('Company').fill('Pegasus')
    await until(async () => (await claimsOf(page)).some(c => c.kind === 'bag' && c.company === 'Pegasus' && c.title === 'Lost or late bag'), 'the bag claim was not saved offline')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

// ---------- every new screen: 390 and 320 px, light and dark ----------

for (const width of [390, 320]) {
  for (const dark of [false, true]) {
    const tag = `${width}${dark ? '-dark' : ''}`
    await test(`P13 ${width} px${dark ? ', dark' : ''}: Now, the four steps, Plan, Claims, the claim sheet, the cost sheet and Home: no sideways scroll, 44 px targets, 4.5:1 text, no page error`, async () => {
      const problems = []
      const look = async (page, where, root, opts = {}) => {
        await sleep(250)
        problems.push(...(await sideways(page)).map(x => `${where}: sideways ${x}`))
        if (opts.targets !== false) problems.push(...(await smallIn(page, root)).map(s => `${where}: small ${describe([s])}`))
        problems.push(...(await lowContrast(page, root)).map(x => `${where}: contrast ${x}`))
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `p13-${where.replace(/\W+/g, '-')}-${tag}.png`) })
      }
      /** Looks at a sheet screen by screen: its body scrolled from top to bottom. */
      const lookSheet = async (page, where, name) => {
        const root = `[role="dialog"][aria-label="${name}"]`
        const steps = await page.evaluate(sel => {
          const b = document.querySelector(`${sel} .body`)
          return b ? Math.max(1, Math.ceil(b.scrollHeight / Math.max(1, b.clientHeight * 0.8))) : 1
        }, root)
        for (let i = 0; i < Math.min(steps, 8); i++) {
          await page.evaluate(([sel, k]) => {
            const b = document.querySelector(`${sel} .body`)
            if (b) b.scrollTop = b.clientHeight * 0.8 * k
          }, [root, i])
          await look(page, `${where} ${i + 1}`, root)
        }
      }
      const progress = withClaims(friFresh, wizzClaim({ deadline: '2026-10-20' }))
      const ph = await open('now', { width, dark, progress })
      try {
        const { page } = ph
        await page.locator('.pcl').scrollIntoViewIfNeeded()
        await look(page, 'now', '.pcl')
        for (const key of ['list', 'late', 'later', 'flight', 'off']) {
          const sh = await openChanged(page)
          if (key !== 'list') {
            await card(page, key).click()
            await sh.locator('.step-h').waitFor()
            if (key === 'later') await sh.getByLabel('I\'ll start at').fill('13:00')
          }
          await lookSheet(page, `plans changed ${key}`, 'Plans changed')
          await page.keyboard.press('Escape')
          await sh.waitFor({ state: 'detached' })
        }
        await page.goto(`${BASE}trips/${TRIP}/plan?day=fri`, { waitUntil: 'domcontentloaded' })
        await ready(page)
        await page.locator('.pdt').scrollIntoViewIfNeeded()
        await look(page, 'plan tools', '.pdt')
        await page.goto(BASE, { waitUntil: 'domcontentloaded' })
        await ready(page)
        await look(page, 'home', '.deadlines')
        assert(await page.locator('.deadlines .hd-l1 .tone-soon').count() === 1, 'Home: the deadline is not amber')
        await page.goto(`${BASE}trips/${TRIP}/claims`, { waitUntil: 'domcontentloaded' })
        await ready(page)
        await page.getByRole('button', { name: 'New claim' }).click()
        await look(page, 'claims', '.page.claims')
        await page.locator('.cl-card').click()
        const claim = sheetOf(page, 'Claim')
        await claim.waitFor()
        await claim.getByRole('button', { name: /Link from your costs/ }).click()
        await claim.getByLabel('Where it stands').selectOption('partly')
        await lookSheet(page, 'claim', 'Claim')
        await claim.getByRole('button', { name: 'Add a cost' }).click()
        await sheetOf(page, 'Add a cost').waitFor()
        await look(page, 'cost sheet from a claim', '[role="dialog"][aria-label="Add a cost"]')
        await page.goto(`${BASE}trips/${TRIP}/costs`, { waitUntil: 'domcontentloaded' })
        await ready(page)
        await page.locator('button.crow').first().click()
        await sheetOf(page, 'Edit cost').waitFor()
        await look(page, 'cost sheet edit', '[role="dialog"][aria-label="Edit cost"]')
        assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
        assert(!problems.length, problems.join(' | '))
      }
      finally {
        await done(ph)
      }
    })
  }
}

// ---------- copy ----------

await test('P14 no em dash (U+2014) in the package\'s files', async () => {
  const files = [
    'shared/utils/changes.ts', 'shared/utils/claims.ts', 'tests/changes.test.ts', 'tests/claims.test.ts', 'tests/e2e/changes.e2e.mjs',
    'app/components/PlansChangedSheet.vue', 'app/components/PlansChangedLink.vue', 'app/components/PlanDayTools.vue', 'app/components/HomeDeadlines.vue',
    'app/components/ClaimSheet.vue', 'app/components/ClaimLines.vue', 'app/components/ClaimSteps.vue', 'app/components/ClaimCosts.vue', 'app/components/ClaimLinks.vue',
    'app/components/CostSheet.vue', 'app/pages/trips/[id]/claims.vue',
  ]
  const dash = String.fromCharCode(0x2014)
  const hits = files.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(dash))
  assert(!hits.length, `em dash in ${hits.join(', ')}`)
})

await browser.close()
