// Browser checks for the Costs package: the Costs page, the cost pad and the cost sheet, and costs and stamps
// in the stop sheet (spec 4.1, 4.2, 4.9 and 9.2: C1 to C15 but C10 (a unit test), C16 and C17 (bookings and Now
// belong to other packages), plus A1 to A4 and N5 for these screens).
// A phone-sized Chromium against TRAVELS_URL (the dev server by default):
//   node tests/e2e/costs.e2e.mjs
//   SHOTS=<dir> node tests/e2e/costs.e2e.mjs   also saves a screenshot of every screen it looks at
//   ONLY=C2,A3 node tests/e2e/costs.e2e.mjs    runs the checks whose names start with those labels
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { BASE, TRIP, assert, check, go, live, loadTrip, noSideScroll, phone, preview, readProgress, ready, seedS, sideScroll, smallTargets } from './lib.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SHOTS = process.env.SHOTS || ''
if (SHOTS) mkdirSync(SHOTS, { recursive: true })
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean)

const FRI = '2026-10-09T16:40'
const SEP30 = '2026-09-30T12:00'
const OCT20 = '2026-10-20T12:00'
const CASTEL = 'castel-sant-angelo-the-angel-s-terrace'
const CASTEL_TITLE = 'Castel Sant\'Angelo + the Angel\'s Terrace'
const VATICAN = 'vatican-museums-sistine-chapel'
const TAVERNACCIA = 'sunday-lunch-la-tavernaccia-da-bruno'
const TAVERNACCIA_TITLE = 'Sunday lunch: La Tavernaccia da Bruno'

const trip = loadTrip()
const seed = seedS(trip)
const browser = await chromium.launch()

// ---------- helpers ----------

/** Whitespace collapsed, to compare what a screen says. */
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const textOf = async loc => flat(await loc.innerText())
/** The page's kicker as written (innerText would give its CSS capitals). */
const kickerOf = async page => flat(await page.locator('.page.costs .kicker').textContent())
const sleep = ms => new Promise(res => setTimeout(res, ms))

/** Polls fn() until it gives something truthy; throws `message` after `ms`. */
async function until(fn, message, ms = 5000) {
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

/** A check that runs unless ONLY names others. */
async function test(name, fn) {
  if (ONLY.length && !ONLY.some(p => name.startsWith(p))) return
  await check(name, fn)
}

/**
 * A phone on a trip page, live at `at` (Rome time) or previewing it. Seed S unless `fresh` or `progress`.
 * Returns lib's { ctx, page, errors, consoleErrors }; close with done(ph).
 */
async function open(path, { at = FRI, fresh = false, previewing = false, progress, ...opts } = {}) {
  const ph = await phone(browser, { ...opts, progress: progress ?? (fresh ? undefined : seed) })
  if (previewing) {
    await preview(ph.page, at)
    await go(ph.page, path)
  }
  else {
    await live(ph.page, at)
    await ph.page.goto(`${BASE}trips/${TRIP}/${path}`, { waitUntil: 'domcontentloaded' })
    await ready(ph.page)
  }
  return ph
}
const done = ph => ph.ctx.close()

async function reload(page) {
  await page.reload({ waitUntil: 'domcontentloaded' })
  await ready(page)
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`) })
}

const padOn = page => page.locator('.padcard')
const sheetOf = (page, name) => page.getByRole('dialog', { name, exact: true })
/** Taps the keypad: digits, "." and "<" for Delete last digit. */
async function keys(scope, seq) {
  for (const ch of seq) {
    const name = ch === '.' ? 'Decimal point' : ch === '<' ? 'Delete last digit' : ch
    await scope.getByRole('button', { name, exact: true }).click()
  }
}
const catButton = (scope, label) => scope.locator('button.cat', { hasText: label })
const amountOf = async scope => flat(await scope.locator('output').innerText())
const todayOf = async page => flat(await page.locator('.sum .big').first().innerText())
const section = (page, heading) => page.locator('section').filter({ has: page.getByRole('heading', { name: heading }) })
const row = (scope, text) => scope.locator('button.crow', { hasText: text })
const records = async page => (await readProgress(page))?.expenses ?? {}
const liveRecords = async page => Object.values(await records(page)).filter(e => !e.deleted)

/** The toast that says `text` (it appears within a few seconds). */
async function toastWith(page, text) {
  const t = page.locator('.toasts .toast', { hasText: text }).last()
  await t.waitFor({ timeout: 5000 })
  return t
}

/** Waits until the sheet named `name` is open and has keyboard focus inside it. */
async function sheetOpen(page, name) {
  const sh = sheetOf(page, name)
  await sh.waitFor({ timeout: 5000 })
  await until(() => sh.evaluate(el => el.contains(document.activeElement)), `focus did not move into "${name}"`)
  await sleep(150)
  return sh
}

/** Money on a screen that should never show: NaN, "of ~€0", a sign with no number, "undefined". */
async function badMoney(scope) {
  const all = await scope.evaluate((el) => {
    const copy = el.cloneNode(true)
    copy.querySelectorAll('.fx').forEach(x => x.remove())
    return copy.textContent || ''
  })
  const text = flat(all)
  const found = []
  for (const [label, re] of [
    ['NaN', /NaN/], ['of ~€0', /of ~?€0(?![\d.,])/], ['undefined', /undefined/], ['null', /\bnull\b/], ['Infinity', /Infinity/],
    ['a sign with no number', /[€₺](?!\s?\d)/], ['≈ with no number', /≈(?!\s?[₺\d])/], ['a negative amount', /-\s?€|€\s?-/],
  ]) {
    const m = re.exec(text)
    if (m) found.push(`${label}: "…${text.slice(Math.max(0, m.index - 30), m.index + 30)}…"`)
  }
  return found
}

/** Buttons and links under 44 x 44 px on touch, in `root` only: the shell's own bars are hidden first. */
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

/** Text under 4.5:1 against what is behind it, in `root` (text over pictures is left out). */
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

/** No sideways scroll on the page, nor inside the open sheets. */
async function sideways(page) {
  const out = []
  if (!(await noSideScroll(page))) out.push(`page ${JSON.stringify(await sideScroll(page))}`)
  const inner = await page.evaluate(() => [...document.querySelectorAll('.sheet .body')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => `${b.closest('[role=dialog]')?.getAttribute('aria-label')}: ${b.scrollWidth} > ${b.clientWidth}`))
  return out.concat(inner)
}

// ---------- the Costs page, Seed S at live Fri 9 Oct 16:40 ----------

await test('C1 Seed S at live Fri 16:40: Today, Trip so far, By kind, Everything and the rate', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const kicker = await kickerOf(page)
    assert(kicker === 'Fri 9 Oct · Day 2 of 5', `kicker: ${kicker}`)
    const sum = await textOf(page.locator('.sum'))
    for (const s of ['Today', '€37.00', '≈ ₺2,065', '€134.50 left of €171.50']) assert(sum.includes(s), `summary lacks "${s}": ${sum}`)
    const tsf = await textOf(section(page, 'Trip so far'))
    assert(tsf.startsWith('Trip so far €46.00 of ~€503'), `trip so far: ${tsf.slice(0, 80)}`)
    for (const s of ['Thu €9.00 of €21', 'Fri €37.00 of €172', 'Sat €0.00 of €155', 'Dashed: the plan. Solid: what you logged.']) assert(tsf.includes(s), `trip so far lacks "${s}": ${tsf}`)
    const kinds = (await page.locator('.krow').allInnerTexts()).map(flat)
    const kind = label => kinds.find(k => k.startsWith(`${label} `)) ?? ''
    assert(kind('Sights').includes('€12.00 of €100'), `Sights: ${kind('Sights')}`)
    assert(kind('Transport').includes('€25.00 of €78'), `Transport: ${kind('Transport')}`)
    assert(kind('Food').includes('€0.00 of €225'), `Food: ${kind('Food')}`)
    assert(kind('Other').includes('€9.00') && kind('Other').includes('not in the plan'), `Other: ${kind('Other')}`)
    assert(kind('Stay').includes('€0.00') && kind('Stay').includes('not in the plan'), `Stay: ${kind('Stay')}`)
    assert(kinds.length === 6, `${kinds.length} kinds`)
    const every = await textOf(page.locator('section.every'))
    assert(every.includes('Everything €46.00 · ≈ ₺2,567'), `everything: ${every}`)
    assert(every.includes('1 € = 55.8 ₺ · ECB, 25 Sep 2026'), `rate: ${every}`)
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
    await shot(page, 'costs-live-390')
  }
  finally {
    await done(ph)
  }
})

await test('C7 Seed S shows three "Logged earlier" rows with their kinds and times', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const rows = (await page.locator('button.crow', { hasText: 'Logged earlier' }).allInnerTexts()).map(flat)
    assert(rows.length === 3, `${rows.length} rows: ${rows.join(' | ')}`)
    const fri = section(page, 'Fri 9 Oct · today')
    assert((await textOf(fri.locator('.bhrow'))) === 'Fri 9 Oct · today €37.00', `Friday header: ${await textOf(fri.locator('.bhrow'))}`)
    const metro = await textOf(row(fri, 'Metro A'))
    assert(['07:15', 'Metro A, Termini → Ottaviano', 'Transport', 'Logged earlier', '€25.00', '≈ ₺1,395'].every(s => metro.includes(s)), `metro: ${metro}`)
    const vatican = await textOf(row(fri, 'Vatican Museums'))
    assert(['08:00', 'Vatican Museums + Sistine Chapel', 'Sights', 'Logged earlier', '€12.00'].every(s => vatican.includes(s)), `vatican: ${vatican}`)
    const thu = section(page, 'Thu 8 Oct')
    const other = await textOf(row(thu, 'Other spending'))
    assert(['Other spending', 'Other', 'Logged earlier', '€9.00'].every(s => other.includes(s)), `thursday: ${other}`)
    // Newest first: Friday's rows by time, and Friday before Thursday.
    const order = (await page.locator('button.crow').allInnerTexts()).map(flat)
    assert(order[0].includes('Vatican') && order[1].includes('Metro') && order[2].includes('Other spending'), `order: ${order.join(' | ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('C7 editing the Vatican row to 13 writes legacy-stop-…; deleting Thursday\'s row tombstones legacy-day-thu', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    await row(section(page, 'Fri 9 Oct · today'), 'Vatican Museums').click()
    let sh = await sheetOpen(page, 'Edit cost')
    const said = await textOf(sh)
    assert(said.includes('Logged on this stop before costs had their own page.'), `edit sheet: ${said.slice(0, 160)}`)
    assert(await amountOf(sh) === '€12.00', `amount ${await amountOf(sh)}`)
    assert(await catButton(sh, 'Sights').getAttribute('aria-pressed') === 'true', 'Sights is not pressed')
    await shot(page, 'cost-sheet-edit-legacy-390')
    await keys(sh, '13')
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    const rec = await until(async () => (await records(page))[`legacy-stop-${VATICAN}`], 'no legacy-stop record')
    assert(rec.amount === 13 && !rec.deleted && rec.cat === 'sights' && rec.dayId === 'fri' && rec.stopId === VATICAN, JSON.stringify(rec))
    await until(async () => (await todayOf(page)) === '€38.00', 'Today is not €38.00')
    await until(async () => (await textOf(section(page, 'Fri 9 Oct · today').locator('.bhrow'))).endsWith('€38.00'), 'Friday is not €38.00')
    assert((await page.locator('button.crow', { hasText: 'Logged earlier' }).count()) === 2, 'the edited row still says Logged earlier')

    await row(section(page, 'Thu 8 Oct'), 'Other spending').click()
    sh = await sheetOpen(page, 'Edit cost')
    assert((await textOf(sh)).includes('Logged for this day before costs had their own page.'), 'no legacy day line')
    await sh.getByRole('button', { name: 'Delete', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    const tomb = await until(async () => (await records(page))['legacy-day-thu'], 'no legacy-day-thu record')
    assert(tomb.deleted === true, JSON.stringify(tomb))
    const thuRow = await textOf(page.locator('.tsf-row', { hasText: 'Thu' }))
    assert(thuRow === 'Thu €0.00 of €21', `Thursday: ${thuRow}`)
    assert((await section(page, 'Thu 8 Oct').count()) === 0, 'Thursday still has a group')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('C9 Not logged yet: Castel with Log €18, Bonci and the dome with Add; Log €18 makes Today €55.00', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const nl = section(page, 'Not logged yet')
    const items = (await nl.locator('.nl').allInnerTexts()).map(flat)
    assert(items.length === 3, `${items.length}: ${items.join(' | ')}`)
    // Newest first, like every list on the page: the stop you just left comes first.
    assert(items[0].startsWith('Castel') && items[1].startsWith('Climb the dome') && items[2].startsWith('Early lunch'), `order: ${items.join(' | ')}`)
    const castel = nl.locator('.nl', { hasText: 'Castel Sant\'Angelo' })
    assert(await castel.getByRole('button', { name: /^Log €18\b/ }).count() === 1, 'no Log €18 on Castel')
    assert((await textOf(castel)).includes('€18'), 'Castel does not show its price')
    for (const title of ['Early lunch at Bonci Pizzarium', 'Climb the dome']) {
      const b = nl.locator('.nl', { hasText: title }).getByRole('button')
      assert((await b.count()) === 1 && flat(await b.innerText()) === 'Add', `${title}: no Add`)
    }
    await castel.getByRole('button', { name: /^Log €18\b/ }).click()
    await toastWith(page, 'Added €18.00 · Sights')
    await until(async () => (await todayOf(page)) === '€55.00', 'Today is not €55.00')
    await until(async () => (await nl.locator('.nl', { hasText: 'Castel' }).count()) === 0, 'Castel is still listed')
    const rec = (await liveRecords(page)).find(e => e.stopId === CASTEL)
    assert(rec && rec.amount === 18 && rec.cat === 'sights' && rec.dayId === 'fri', JSON.stringify(rec))
    // "Add" opens the cost sheet for that stop, with its prices as quick picks.
    await nl.locator('.nl', { hasText: 'Early lunch at Bonci' }).getByRole('button').click()
    const sh = await sheetOpen(page, 'Add a cost')
    const said = await textOf(sh)
    assert(said.includes('For: Early lunch at Bonci Pizzarium') && said.includes('€10') && said.includes('€15'), `sheet: ${said.slice(0, 120)}`)
    assert(await amountOf(sh) === '€0', `a range should not prefill: ${await amountOf(sh)}`)
    assert(await catButton(sh, 'Food').evaluate(el => el.classList.contains('ring')), 'no ring on Food')
    await sh.getByRole('button', { name: 'Fill in €15' }).click()
    assert(await amountOf(sh) === '€15', `pick: ${await amountOf(sh)}`)
    await page.keyboard.press('Escape')
    await sh.waitFor({ state: 'detached' })
  }
  finally {
    await done(ph)
  }
})

await test('C2 on /costs, 3 . 5 0 then Food adds €3.50 as Food for Friday; it survives a reload', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const pad = padOn(page)
    // No scrolling: every key and category is above the tab bar on a 390 x 844 phone.
    const barTop = await page.evaluate(() => document.querySelector('nav.tabbar')?.getBoundingClientRect().top ?? window.innerHeight)
    const lowest = Math.max(...await pad.locator('.key, .cat').evaluateAll(els => els.map(e => e.getBoundingClientRect().bottom)))
    assert(lowest <= barTop, `the pad ends at ${lowest}, the tab bar starts at ${barTop}`)
    await keys(pad, '3.50')
    assert(await amountOf(pad) === '€3.50', `amount ${await amountOf(pad)}`)
    assert(await catButton(pad, 'Food').getAttribute('aria-label') === 'Save €3.50 as Food', `name: ${await catButton(pad, 'Food').getAttribute('aria-label')}`)
    await catButton(pad, 'Food').click()
    const t = await toastWith(page, 'Added €3.50 · Food')
    assert(await t.getByRole('button', { name: 'Undo' }).count() === 1, 'no Undo')
    // The toast's Undo must not sit over a category, where the next cost's tap would land.
    const tb = await t.boundingBox()
    const cats = await pad.locator('.cat').evaluateAll(els => els.map(e => [e.getBoundingClientRect().top, e.getBoundingClientRect().bottom]))
    assert(cats.every(([top, bottom]) => bottom <= tb.y || top >= tb.y + tb.height), `the toast (${Math.round(tb.y)} to ${Math.round(tb.y + tb.height)}) covers a category (${cats.map(c => c.map(Math.round).join('-')).join(', ')})`)
    await until(async () => (await todayOf(page)) === '€40.50', 'Today is not €40.50')
    const list = await until(async () => {
      const l = (await liveRecords(page)).filter(e => e.amount === 3.5)
      return l.length ? l : null
    }, 'no record')
    assert(list.length === 1, `${list.length} records`)
    const r = list[0]
    assert(r.cat === 'food' && r.dayId === 'fri' && r.currency === 'EUR' && !!r.at && !!r.updatedAt && !r.stopId && !r.preview, JSON.stringify(r))
    assert(await amountOf(pad) === '€0', 'the amount was not cleared')
    await reload(page)
    assert((await todayOf(page)) === '€40.50', `after a reload Today is ${await todayOf(page)}`)
    const again = (await records(page))[r.id]
    assert(again && again.amount === 3.5 && !again.deleted, JSON.stringify(again))
    assert(await row(section(page, 'Fri 9 Oct · today'), '€3.50').count() === 1, 'no €3.50 row')
    const food = await textOf(row(section(page, 'Fri 9 Oct · today'), '€3.50'))
    assert(food.startsWith('16:40') && food.includes('Food'), `row: ${food}`)

    // C4 on the same cost.
    await row(section(page, 'Fri 9 Oct · today'), '€3.50').click()
    let sh = await sheetOpen(page, 'Edit cost')
    assert(await amountOf(sh) === '€3.50', `edit amount ${await amountOf(sh)}`)
    await keys(sh, '4')
    assert(await amountOf(sh) === '€4', `typed ${await amountOf(sh)}`)
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    await toastWith(page, 'Cost updated')
    await until(async () => (await todayOf(page)) === '€41.00', 'C4: Today is not €41.00')
    const edited = (await records(page))[r.id]
    assert(edited && edited.amount === 4 && !edited.deleted && edited.cat === 'food', `C4: ${JSON.stringify(edited)}`)
    assert(Object.values(await records(page)).filter(e => e.amount === 4).length === 1, 'C4: the edit made a second record')

    await row(section(page, 'Fri 9 Oct · today'), '€4.00').click()
    sh = await sheetOpen(page, 'Edit cost')
    await sh.getByRole('button', { name: 'Delete', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    const del = await toastWith(page, 'Deleted €4.00')
    await until(async () => (await records(page))[r.id]?.deleted === true, 'C4: not a tombstone')
    await until(async () => (await row(page.locator('.lists'), '€4.00').count()) === 0, 'C4: the row is still there')
    assert((await todayOf(page)) === '€37.00', `C4: Today ${await todayOf(page)}`)
    await del.getByRole('button', { name: 'Undo' }).click()
    await until(async () => {
      const x = (await records(page))[r.id]
      return x && !x.deleted && x.amount === 4
    }, 'C4: Undo did not bring it back')
    await until(async () => (await todayOf(page)) === '€41.00', 'C4: Today after Undo')
    assert(await row(section(page, 'Fri 9 Oct · today'), '€4.00').count() === 1, 'C4: the row did not come back')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('C3 Undo on "Added €3.50 · Food" tombstones the record and Today is €37.00 again', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const pad = padOn(page)
    await keys(pad, '3.50')
    await catButton(pad, 'Food').click()
    const t = await toastWith(page, 'Added €3.50 · Food')
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 3.5), 'no record')
    await until(async () => (await todayOf(page)) === '€40.50', 'Today did not reach €40.50')
    await t.getByRole('button', { name: 'Undo' }).click()
    await until(async () => (await records(page))[r.id]?.deleted === true, 'not a tombstone')
    await until(async () => (await todayOf(page)) === '€37.00', 'Today is not €37.00 again')
  }
  finally {
    await done(ph)
  }
})

await test('C5 Food with no amount says "Type an amount first"; a 6th whole digit and a 3rd decimal are ignored', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const pad = padOn(page)
    const before = JSON.stringify(await records(page))
    assert(await catButton(pad, 'Food').getAttribute('aria-label') === 'Food', 'the name should not offer to save nothing')
    await catButton(pad, 'Food').click()
    await until(() => pad.getByText('Type an amount first').isVisible(), 'no "Type an amount first"')
    await sleep(300)
    assert(JSON.stringify(await records(page)) === before, 'something was saved')
    await keys(pad, '123456')
    assert(await amountOf(pad) === '€12,345', `6 digits: ${await amountOf(pad)}`)
    assert(!(await pad.getByText('Type an amount first').isVisible()), 'the warning stays after typing')
    await keys(pad, '<<<<<')
    assert(await amountOf(pad) === '€0', `cleared: ${await amountOf(pad)}`)
    await keys(pad, '1.234')
    assert(await amountOf(pad) === '€1.23', `3 decimals: ${await amountOf(pad)}`)
    await keys(pad, '<<<<')
    await keys(pad, '0.')
    assert(await amountOf(pad) === '€0.', `a leading zero: ${await amountOf(pad)}`)
    await keys(pad, '<<')
    await keys(pad, '007')
    assert(await amountOf(pad) === '€7', `leading zeros: ${await amountOf(pad)}`)
  }
  finally {
    await done(ph)
  }
})

await test('C5 €99,999.99 fits the pad at 320 px', async () => {
  const ph = await open('costs', { width: 320 })
  try {
    const { page } = ph
    const pad = padOn(page)
    await keys(pad, '99999.99')
    assert(await amountOf(pad) === '€99,999.99', `amount ${await amountOf(pad)}`)
    const fits = await pad.locator('output').evaluate((el) => {
      const r = el.getBoundingClientRect()
      const card = el.closest('.card').getBoundingClientRect()
      return { right: r.right, card: card.right, wide: el.scrollWidth > el.clientWidth + 1, lines: Math.round(r.height / Number.parseFloat(getComputedStyle(el).lineHeight)) }
    })
    assert(fits.right <= fits.card - 8 && !fits.wide && fits.lines === 1, `output ${JSON.stringify(fits)}`)
    assert(await noSideScroll(page), `sideways ${JSON.stringify(await sideScroll(page))}`)
    await catButton(pad, 'Other').click()
    await toastWith(page, 'Added €99,999.99 · Other')
    await until(async () => (await liveRecords(page)).some(e => e.amount === 99999.99), 'not saved')
    assert(await noSideScroll(page), 'sideways once listed')
    await shot(page, 'costs-max-320')
  }
  finally {
    await done(ph)
  }
})

await test('C6 a double tap on Food within 150 ms leaves exactly one record', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const pad = padOn(page)
    await keys(pad, '7')
    await catButton(pad, 'Food').evaluate(el => new Promise((res) => {
      el.click()
      setTimeout(() => {
        el.click()
        res()
      }, 100)
    }))
    await sleep(500)
    const list = (await liveRecords(page)).filter(e => e.amount === 7)
    assert(list.length === 1, `${list.length} records`)
    assert(!(await pad.getByText('Type an amount first').isVisible()), 'the second tap of a double tap shows the warning')
  }
  finally {
    await done(ph)
  }
})

await test('C8 the stop sheet shows Costs here in its first screen; Add a cost prefills €18 with a ring on Sights; Sights saves it', async () => {
  const ph = await open(`plan?day=fri&stop=${CASTEL}`)
  try {
    const { page } = ph
    const stopSheet = sheetOf(page, CASTEL_TITLE)
    await stopSheet.waitFor()
    const h = stopSheet.getByRole('heading', { name: 'Costs here' })
    const box = await h.boundingBox()
    const vh = page.viewportSize().height
    assert(box && box.y >= 0 && box.y + box.height <= vh, `Costs here at ${JSON.stringify(box)}`)
    assert((await textOf(stopSheet.locator('section.here'))).includes('Nothing logged here yet.'), 'no empty line')
    await shot(page, 'stop-sheet-castel-390')
    await stopSheet.getByRole('button', { name: 'Add a cost' }).click()
    const sh = await sheetOpen(page, 'Add a cost')
    const said = await textOf(sh)
    assert(said.includes(`For: ${CASTEL_TITLE}`), `sheet: ${said.slice(0, 120)}`)
    assert(await amountOf(sh) === '€18', `amount ${await amountOf(sh)}`)
    assert(said.includes('≈ ₺1,004'), 'no live lira line')
    assert(await catButton(sh, 'Sights').evaluate(el => el.classList.contains('ring') && !el.hasAttribute('aria-pressed')), 'no ring on Sights')
    const url = new URL(page.url())
    assert(url.searchParams.get('cost') === 'new' && url.searchParams.get('for') === `stop:${CASTEL}` && url.searchParams.get('cday') === 'fri' && url.searchParams.get('stop') === CASTEL, `url ${url.search}`)
    await shot(page, 'cost-sheet-add-castel-390')
    await catButton(sh, 'Sights').click()
    await sh.waitFor({ state: 'detached' })
    const rec = await until(async () => (await liveRecords(page)).find(e => e.stopId === CASTEL), 'no record')
    assert(rec.amount === 18 && rec.cat === 'sights' && rec.dayId === 'fri' && rec.title === CASTEL_TITLE, JSON.stringify(rec))
    await until(async () => (await textOf(stopSheet.locator('section.here'))).includes('€18.00'), 'the stop sheet does not show €18.00')
    const after = new URL(page.url())
    assert(after.searchParams.get('stop') === CASTEL && !after.searchParams.get('cost'), `url after ${after.search}`)
    assert(await stopSheet.isVisible(), 'the stop sheet closed too')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('C11 switching the Colosseum day and deleting an added stop keep Everything, and orphaned rows keep their titles', async () => {
  const at = '2026-10-09T10:00:00.000Z'
  const progress = JSON.parse(JSON.stringify(seed))
  progress.expenses = {
    'c-tavernaccia': { id: 'c-tavernaccia', amount: 30, currency: 'EUR', cat: 'food', dayId: 'sun', stopId: TAVERNACCIA, title: TAVERNACCIA_TITLE, at, updatedAt: at },
    'c-gelato': { id: 'c-gelato', amount: 4.5, currency: 'EUR', cat: 'food', dayId: 'fri', stopId: 'e2e-gelato', title: 'Gelato at Giolitti', at, updatedAt: at },
  }
  const ph = await open('costs', { progress })
  try {
    const { page } = ph
    // A stop added to Friday, as the stop editor saves one.
    await page.evaluate((id) => {
      const trips = JSON.parse(localStorage.getItem('travel:trips:v1'))
      const t = trips.find(x => x.id === id)
      t.days.find(d => d.id === 'fri').stops.push({ id: 'e2e-gelato', start: 1005, timeLabel: '16:45', kind: 'food', title: 'Gelato at Giolitti', custom: true })
      t.edited = true
      localStorage.setItem('travel:trips:v1', JSON.stringify(trips))
    }, TRIP)
    await reload(page)
    const everything = async () => textOf(page.locator('section.every'))
    const before = await everything()
    assert(before.includes('Everything €80.50'), `before: ${before}`)
    const sunRow = async () => textOf(row(section(page, 'Sun 11 Oct'), '€30.00'))
    assert((await sunRow()).includes(TAVERNACCIA_TITLE), `Sunday row: ${await sunRow()}`)
    // Colosseum on Sunday: Sunday's lunch stop leaves the plan.
    await page.evaluate((id) => {
      const all = JSON.parse(localStorage.getItem('travel:progress:v1'))
      all[id].variant = 'sun'
      localStorage.setItem('travel:progress:v1', JSON.stringify(all))
    }, TRIP)
    await reload(page)
    assert((await everything()) === before, `after the switch: ${await everything()}`)
    assert((await sunRow()).includes(TAVERNACCIA_TITLE), `Sunday row after the switch: ${await sunRow()}`)
    // Delete the added stop.
    await page.evaluate((id) => {
      const trips = JSON.parse(localStorage.getItem('travel:trips:v1'))
      const fri = trips.find(x => x.id === id).days.find(d => d.id === 'fri')
      fri.stops = fri.stops.filter(s => s.id !== 'e2e-gelato')
      localStorage.setItem('travel:trips:v1', JSON.stringify(trips))
    }, TRIP)
    await reload(page)
    assert((await everything()) === before, `after the delete: ${await everything()}`)
    const gelato = await textOf(row(section(page, 'Fri 9 Oct · today'), '€4.50'))
    assert(gelato.includes('Gelato at Giolitti'), `orphaned row: ${gelato}`)
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('C12 a preview at Fri 16:40: the gold line, a Preview row and "1 cost was logged while previewing."', async () => {
  const ph = await open('costs', { previewing: true })
  try {
    const { page } = ph
    const pad = padOn(page)
    assert((await textOf(pad)).includes('Preview is on. This cost is real and counts for Fri 9.'), `pad: ${(await textOf(pad)).slice(-160)}`)
    assert((await kickerOf(page)) === 'Fri 9 Oct · Day 2 of 5', 'the kicker does not follow the preview')
    await shot(page, 'costs-preview-390')
    await keys(pad, '2')
    await catButton(pad, 'Food').click()
    await toastWith(page, 'Added €2.00 · Food')
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 2), 'no record')
    assert(r.preview === true && r.dayId === 'fri', JSON.stringify(r))
    const previewRow = await textOf(row(section(page, 'Fri 9 Oct · today'), '€2.00'))
    assert(previewRow.includes('Preview'), `row: ${previewRow}`)
    const banner = page.locator('.rehearse')
    await until(async () => (await textOf(banner)).startsWith('1 cost was logged while previewing.'), 'no banner')
    await banner.getByRole('button', { name: 'Remove it' }).click()
    await until(async () => (await records(page))[r.id]?.deleted === true, 'not a tombstone')
    await until(async () => (await banner.count()) === 0, 'the banner stays')
    await toastWith(page, 'Removed 1 cost')
  }
  finally {
    await done(ph)
  }
})

await test('C13 Fresh at live 30 Sep 12:00: the budget card and "Before the trip"; a €35 Stay cost lands before the trip', async () => {
  const ph = await open('costs', { fresh: true, at: SEP30 })
  try {
    const { page } = ph
    assert((await kickerOf(page)) === 'In 8 days', 'kicker')
    const sum = await textOf(page.locator('.sum'))
    for (const s of ['Your budget', '~€503', 'for 5 days · ≈ ₺28,065', 'Thu €21 · Fri €172 · Sat €155 · Sun €123 · Mon €32', 'Where you stay isn\'t included.']) assert(sum.includes(s), `summary lacks "${s}": ${sum}`)
    const pad = padOn(page)
    const chip = `${await textOf(pad.locator('.dayp .cap'))} ${await textOf(pad.locator('.dayp .val'))}`
    assert(chip === 'Counts for Before the trip', `day chip: ${chip}`)
    assert(await pad.getByLabel('Counts for').inputValue() === '@before', 'the select is not on Before the trip')
    assert((await textOf(page.locator('.lists'))).includes('No costs yet. Type an amount, then tap what it was for.'), 'no empty state')
    await shot(page, 'costs-fresh-390')
    await keys(pad, '35')
    await catButton(pad, 'Stay').click()
    await toastWith(page, 'Added €35.00 · Stay')
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 35), 'no record')
    assert(r.cat === 'stay' && !('dayId' in r), JSON.stringify(r))
    const before = section(page, 'Before the trip')
    await until(async () => (await textOf(before)).includes('€35.00'), 'not in Before the trip')
    assert((await textOf(before.locator('.bhrow'))) === 'Before the trip €35.00', `header ${await textOf(before.locator('.bhrow'))}`)
    const days = (await page.locator('.tsf-row').allInnerTexts()).map(flat)
    assert(days.every(d => d.includes('€0.00 of')), `a day took it: ${days.join(' | ')}`)
    assert((await textOf(page.locator('section.every'))).includes('Everything €35.00 · ≈ ₺1,953'), `everything: ${await textOf(page.locator('section.every'))}`)
    // The day picker stores the day: Fri 9 counts for Friday.
    await pad.getByLabel('Counts for').selectOption('fri')
    await keys(pad, '25')
    await catButton(pad, 'Sights').click()
    const fri = await until(async () => (await liveRecords(page)).find(e => e.amount === 25), 'no Friday record')
    assert(fri.dayId === 'fri', JSON.stringify(fri))
    const friRow = await textOf(row(section(page, 'Fri 9 Oct'), '€25.00'))
    assert(friRow.startsWith('Paid before'), `a cost logged before its day: ${friRow}`)
  }
  finally {
    await done(ph)
  }
})

await test('C14 Fresh: no NaN, "of ~€0" or empty number on Costs and the stop sheet, before, during and after the trip', async () => {
  for (const at of [SEP30, FRI, OCT20]) {
    const ph = await open('costs', { fresh: true, at })
    try {
      const { page } = ph
      const bad = await badMoney(page.locator('.page.costs'))
      assert(!bad.length, `${at} costs: ${bad.join(' / ')}`)
      await go(page, `plan?day=fri&stop=${CASTEL}`)
      const stopSheet = sheetOf(page, CASTEL_TITLE)
      await stopSheet.waitFor()
      const bad2 = await badMoney(stopSheet)
      assert(!bad2.length, `${at} stop sheet: ${bad2.join(' / ')}`)
      await stopSheet.getByRole('button', { name: 'Add a cost' }).click()
      const sh = await sheetOpen(page, 'Add a cost')
      const bad3 = await badMoney(sh)
      assert(!bad3.length, `${at} cost sheet: ${bad3.join(' / ')}`)
      assert(!ph.errors.length, `${at} page errors: ${ph.errors.join(' / ')}`)
    }
    finally {
      await done(ph)
    }
  }
})

await test('C15 offline after load, adding, editing and deleting costs work with no page error', async () => {
  const ph = await open('costs')
  try {
    const { page, ctx } = ph
    await ctx.setOffline(true)
    const pad = padOn(page)
    await keys(pad, '4')
    await catButton(pad, 'Food').click()
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 4), 'offline add')
    await row(section(page, 'Fri 9 Oct · today'), '€4.00').click()
    let sh = await sheetOpen(page, 'Edit cost')
    await keys(sh, '5')
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    await until(async () => (await records(page))[r.id]?.amount === 5, 'offline edit')
    await row(section(page, 'Fri 9 Oct · today'), '€5.00').click()
    sh = await sheetOpen(page, 'Edit cost')
    await sh.getByRole('button', { name: 'Delete', exact: true }).click()
    await until(async () => (await records(page))[r.id]?.deleted === true, 'offline delete')
    await until(async () => (await todayOf(page)) === '€37.00', 'Today after the offline delete')
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('A3 the keypad takes a physical keyboard; Enter saves an edit, Escape closes; focus stays in the sheet and returns to the opener', async () => {
  const ph = await open('costs', { hasTouch: false, isMobile: false })
  try {
    const { page } = ph
    const pad = padOn(page)
    await page.evaluate(() => document.activeElement?.blur())
    await page.keyboard.type('12,5')
    assert(await amountOf(pad) === '€12.5', `typed ${await amountOf(pad)}`)
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Backspace')
    assert(await amountOf(pad) === '€12', `Backspace ${await amountOf(pad)}`)
    await page.keyboard.type('.75')
    assert(await amountOf(pad) === '€12.75', `"." ${await amountOf(pad)}`)
    await catButton(pad, 'Food').focus()
    await page.keyboard.press('Enter')
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 12.75), 'Enter on Food did not save')
    assert(r.cat === 'food', JSON.stringify(r))

    const opener = row(section(page, 'Fri 9 Oct · today'), '€12.75')
    await opener.focus()
    await page.keyboard.press('Enter')
    const sh = await sheetOpen(page, 'Edit cost')
    await page.keyboard.type('8')
    assert(await amountOf(sh) === '€8', `sheet typed ${await amountOf(sh)}`)
    assert(await amountOf(pad) === '€0', 'keys reached the page pad behind the sheet')
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press(i % 5 === 4 ? 'Shift+Tab' : 'Tab')
      assert(await sh.evaluate(el => el.contains(document.activeElement)), `Tab ${i + 1} left the sheet`)
    }
    await sh.evaluate(el => el.focus())
    await page.keyboard.press('Enter')
    await sh.waitFor({ state: 'detached' })
    await until(async () => (await records(page))[r.id]?.amount === 8, 'Enter did not save the edit')
    const back = row(section(page, 'Fri 9 Oct · today'), '€8.00')
    await until(() => back.evaluate(el => el === document.activeElement), 'focus did not return to the row')

    await page.keyboard.press('Enter')
    const sh2 = await sheetOpen(page, 'Edit cost')
    await page.keyboard.type('9')
    await page.keyboard.press('Escape')
    await sh2.waitFor({ state: 'detached' })
    assert((await records(page))[r.id]?.amount === 8, 'Escape saved')
    await until(() => back.evaluate(el => el === document.activeElement), 'focus did not return after Escape')
    assert(!new URL(page.url()).searchParams.get('cost'), 'the URL keeps ?cost')
  }
  finally {
    await done(ph)
  }
})

await test('Stop sheet: ticks through markStop, no "Spent here", stamp lines, and a stamp opens the place instead', async () => {
  const ph = await open('plan?day=fri&stop=pantheon')
  try {
    const { page } = ph
    const sh = sheetOf(page, 'Pantheon')
    await sh.waitFor()
    const said = await textOf(sh)
    assert(!said.includes('Spent here'), 'Spent here is still there')
    assert(said.includes('Photos stay on this phone until you sign in.'), 'no signed-out photo line')
    assert(said.includes('Stamps when done: Pantheon'), `stamps: ${said.slice(0, 400)}`)
    await sh.getByRole('group', { name: 'Status' }).getByRole('button', { name: 'Done' }).click()
    const t = await toastWith(page, 'Done: Pantheon')
    assert(await t.getByRole('button', { name: 'Undo' }).count() === 1, 'no Undo')
    assert(await t.getByRole('button', { name: 'Log €7' }).count() === 1, 'no Log €7')
    await until(async () => (await textOf(sh.locator('.stamps'))).includes('Stamped · Fri 9 Oct'), 'not stamped')
    assert((await readProgress(page)).stops.pantheon?.status === 'done', 'not marked done')
    await shot(page, 'stop-sheet-pantheon-done-390')
    await t.getByRole('button', { name: 'Undo' }).click()
    await until(async () => (await textOf(sh.locator('.stamps'))).includes('Stamps when done: Pantheon'), 'Undo kept the stamp')
    assert(!(await readProgress(page)).stops.pantheon, 'Undo kept the tick')
    await sh.locator('.stamps').getByRole('button', { name: /Pantheon/ }).click()
    await until(() => new URL(page.url()).searchParams.get('place'), 'no ?place')
    const url = new URL(page.url())
    assert(!url.searchParams.get('stop') && url.searchParams.get('place'), `url ${url.search}`)
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('At {stop}: in the Pantheon\'s slot the pad links the cost to it with a ring on Sights; another day hides it; × unlinks', async () => {
  const ph = await open('costs', { at: '2026-10-09T17:20' })
  try {
    const { page } = ph
    const pad = padOn(page)
    const chip = pad.locator('.chip.at')
    assert((await textOf(chip)) === 'At Pantheon', `chip: ${await chip.count() ? await textOf(chip) : 'none'}`)
    assert(await catButton(pad, 'Sights').evaluate(el => el.classList.contains('ring')), 'no ring on Sights')
    await pad.getByLabel('Counts for').selectOption('thu')
    assert(await chip.count() === 0, 'the chip shows for Thursday')
    assert(!(await catButton(pad, 'Sights').evaluate(el => el.classList.contains('ring'))), 'the ring stays for Thursday')
    await pad.getByLabel('Counts for').selectOption('fri')
    await keys(pad, '7')
    await catButton(pad, 'Sights').click()
    await toastWith(page, 'Added €7.00 · Sights · Pantheon')
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 7), 'no record')
    assert(r.stopId === 'pantheon' && r.dayId === 'fri' && r.cat === 'sights' && r.title === 'Pantheon', JSON.stringify(r))
    assert(await chip.count() === 1, 'the chip went after a save')
    await chip.getByRole('button', { name: 'Don\'t link this cost to Pantheon' }).click()
    assert(await chip.count() === 0, '× did not unlink')
    await keys(pad, '3')
    await catButton(pad, 'Food').click()
    const r2 = await until(async () => (await liveRecords(page)).find(e => e.amount === 3), 'no second record')
    assert(!r2.stopId, `still linked: ${JSON.stringify(r2)}`)
    await shot(page, 'costs-at-pantheon-390')
  }
  finally {
    await done(ph)
  }
})

await test('At {stop} at Castel (15:10): the two-line toast of a linked cost leaves every category free to tap', async () => {
  const ph = await open('costs', { at: '2026-10-09T15:10' })
  try {
    const { page } = ph
    const pad = padOn(page)
    assert((await textOf(pad.locator('.chip.at'))).startsWith('At Castel Sant\'A'), 'no At Castel chip')
    const barTop = await page.evaluate(() => document.querySelector('nav.tabbar')?.getBoundingClientRect().top ?? window.innerHeight)
    const lowest = Math.max(...await pad.locator('.key, .cat').evaluateAll(els => els.map(e => e.getBoundingClientRect().bottom)))
    assert(lowest <= barTop, `the pad ends at ${lowest}, the tab bar starts at ${barTop}`)
    await keys(pad, '3')
    await catButton(pad, 'Sights').click()
    const t = await toastWith(page, 'Added €3.00 · Sights · Castel')
    const tb = await t.boundingBox()
    const cats = await pad.locator('.cat').evaluateAll(els => els.map(e => [e.getBoundingClientRect().top, e.getBoundingClientRect().bottom]))
    assert(cats.every(([top, bottom]) => bottom <= tb.y + 0.5 || top >= tb.y + tb.height), `the toast (${Math.round(tb.y)} to ${Math.round(tb.y + tb.height)}) covers a category (${cats.map(c => c.map(Math.round).join('-')).join(', ')})`)
  }
  finally {
    await done(ph)
  }
})

await test('A note: "+ Note" opens "What was it? (optional)" (80 characters) and the note titles the row', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const pad = padOn(page)
    await keys(pad, '2.5')
    await pad.getByRole('button', { name: '+ Note' }).click()
    const field = pad.getByLabel('What was it? (optional)')
    await until(() => field.evaluate(el => el === document.activeElement), 'the note field is not focused')
    await field.fill('x'.repeat(100))
    assert((await field.inputValue()).length === 80, `length ${(await field.inputValue()).length}`)
    await field.fill('Espresso at the bar')
    await page.keyboard.press('Enter')
    await catButton(pad, 'Food').click()
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 2.5), 'no record')
    assert(r.note === 'Espresso at the bar', JSON.stringify(r))
    const line = await textOf(row(section(page, 'Fri 9 Oct · today'), '€2.50'))
    assert(line.includes('Espresso at the bar') && line.includes('Food'), `row: ${line}`)
    assert(await field.count() === 0 && await pad.getByRole('button', { name: '+ Note' }).count() === 1, 'the note stays open after a save')
    // Editing keeps the note and can clear it.
    await row(section(page, 'Fri 9 Oct · today'), '€2.50').click()
    const sh = await sheetOpen(page, 'Edit cost')
    const edit = sh.getByLabel('What was it? (optional)')
    assert(await edit.inputValue() === 'Espresso at the bar', 'the edit sheet lost the note')
    await edit.fill('')
    await edit.press('Enter')
    await sh.waitFor({ state: 'detached' })
    await until(async () => (await records(page))[r.id] && !('note' in (await records(page))[r.id]), 'the note was not cleared')
  }
  finally {
    await done(ph)
  }
})

await test('Edit: the day picker moves a cost; "Before the trip" stores no day', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const pad = padOn(page)
    await keys(pad, '6')
    await catButton(pad, 'Other').click()
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 6), 'no record')
    await row(section(page, 'Fri 9 Oct · today'), '€6.00').click()
    const sh = await sheetOpen(page, 'Edit cost')
    assert(await sh.getByLabel('Counts for').inputValue() === 'fri', 'the edit sheet is not on Friday')
    await sh.getByLabel('Counts for').selectOption('@before')
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    await until(async () => {
      const x = (await records(page))[r.id]
      return x && !('dayId' in x) && x.amount === 6
    }, 'the day was not cleared')
    await until(async () => (await textOf(section(page, 'Before the trip'))).includes('€6.00'), 'not in Before the trip')
    assert((await todayOf(page)) === '€37.00', `Today ${await todayOf(page)}`)
  }
  finally {
    await done(ph)
  }
})

await test('for=booking: the sheet links the booking and its plan stop, prefills its price and counts to that stop\'s day', async () => {
  const ph = await open('costs?cost=new&for=booking:vatican', { fresh: true, at: SEP30 })
  try {
    const { page } = ph
    // Opened by the URL itself (a reload with the sheet open): BottomSheet leaves focus on the page then,
    // and keys typed there still reach the sheet's pad.
    const sh = sheetOf(page, 'Add a cost')
    await sh.waitFor()
    const said = await textOf(sh)
    assert(said.includes('For: Vatican Museums, Fri 9 Oct, 08:00'), `sheet: ${said.slice(0, 120)}`)
    assert(await amountOf(sh) === '€25', `amount ${await amountOf(sh)}`)
    await page.keyboard.type('3')
    assert(await amountOf(sh) === '€3', `typed on the page: ${await amountOf(sh)}`)
    await sh.getByRole('button', { name: 'Fill in €25' }).click()
    assert(await amountOf(sh) === '€25', `pick: ${await amountOf(sh)}`)
    assert(await sh.getByLabel('Counts for').inputValue() === 'fri', 'not counted for Friday')
    assert(await catButton(sh, 'Sights').evaluate(el => el.classList.contains('ring')), 'no ring on Sights')
    await catButton(sh, 'Sights').click()
    await sh.waitFor({ state: 'detached' })
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 25), 'no record')
    assert(r.bookingId === 'vatican' && r.stopId === VATICAN && r.dayId === 'fri' && r.cat === 'sights', JSON.stringify(r))
    const line = await textOf(row(section(page, 'Fri 9 Oct'), '€25.00'))
    assert(line.startsWith('Paid before') && line.includes('Vatican Museums + Sistine Chapel'), `row: ${line}`)
  }
  finally {
    await done(ph)
  }
})

await test('During the trip with nothing logged today: "Nothing logged today yet. That first espresso counts too."', async () => {
  const ph = await open('costs', { fresh: true })
  try {
    const { page } = ph
    const lists = await textOf(page.locator('.lists'))
    assert(lists.startsWith('Nothing logged today yet. That first espresso counts too.'), `lists: ${lists.slice(0, 120)}`)
    const sum = await textOf(page.locator('.sum'))
    assert(sum.includes('€0.00') && sum.includes('€171.50 left of €171.50') && !sum.includes('≈'), `summary: ${sum}`)
  }
  finally {
    await done(ph)
  }
})

await test('After the trip: "All in" with everything and "Trip days … of ~€503"', async () => {
  const ph = await open('costs', { at: OCT20 })
  try {
    const { page } = ph
    assert((await kickerOf(page)) === 'Trip done', 'kicker')
    const sum = await textOf(page.locator('.sum'))
    for (const s of ['All in', '€46.00', '≈ ₺2,567', 'Trip days €46.00 of ~€503']) assert(sum.includes(s), `summary lacks "${s}": ${sum}`)
    assert(await padOn(page).getByLabel('Counts for').inputValue() === '@after', 'the day chip is not After the trip')
    await shot(page, 'costs-after-390')
  }
  finally {
    await done(ph)
  }
})

await test('A trip without fx or a budget hides lira, plans and bars', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    await page.evaluate((id) => {
      const trips = JSON.parse(localStorage.getItem('travel:trips:v1'))
      const t = trips.find(x => x.id === id)
      delete t.fx
      delete t.budget
      t.edited = true
      localStorage.setItem('travel:trips:v1', JSON.stringify(trips))
    }, TRIP)
    await reload(page)
    const text = await textOf(page.locator('.page.costs'))
    assert(!/[≈₺]/.test(text), `lira shows: ${text.match(/.{20}[≈₺].{20}/)?.[0]}`)
    assert(!/ of ~?€/.test(text), `a plan shows: ${text.match(/.{20} of ~?€.{10}/)?.[0]}`)
    assert(text.includes('No plan for today'), 'no "No plan for today"')
    assert(!text.includes('Dashed: the plan'), 'the legend shows')
    assert((await page.locator('.page.costs .bars, .page.costs .bar').count()) === 0, 'bars show')
    assert(!(await badMoney(page.locator('.page.costs'))).length, 'bad money')
    await keys(padOn(page), '3')
    assert(!(await textOf(padOn(page))).includes('≈'), 'the pad shows lira')
    await shot(page, 'costs-nofx-390')
  }
  finally {
    await done(ph)
  }
})

// ---------- found in review ----------

await test('C7 an edited old value keeps its look: "Other spending" with no made-up time, never "Paid before"', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    await row(section(page, 'Thu 8 Oct'), 'Other spending').click()
    let sh = await sheetOpen(page, 'Edit cost')
    await keys(sh, '10')
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    await until(async () => (await records(page))['legacy-day-thu']?.amount === 10, 'no legacy-day-thu record')
    const thu = row(section(page, 'Thu 8 Oct'), '€10.00')
    await until(async () => (await thu.count()) === 1, 'no €10.00 row on Thursday')
    const said = await textOf(thu)
    // Its record's time is 23:59, set only to keep its place in the list.
    assert(said.startsWith('Other spending') && !/\d\d:\d\d/.test(said), `Thursday's edited row: ${said}`)
    await thu.click()
    sh = await sheetOpen(page, 'Edit cost')
    await sh.getByLabel('Counts for').selectOption('fri')
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    const fri = row(section(page, 'Fri 9 Oct · today'), '€10.00')
    await until(async () => (await fri.count()) === 1, 'not moved to Friday')
    const moved = await textOf(fri)
    assert(moved.startsWith('Other spending') && !moved.includes('Paid before'), `moved to Friday: ${moved}`)
    // An old stop value, edited, keeps the stop's planned start.
    await row(section(page, 'Fri 9 Oct · today'), 'Vatican Museums').click()
    sh = await sheetOpen(page, 'Edit cost')
    await keys(sh, '13')
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    await until(async () => (await records(page))[`legacy-stop-${VATICAN}`]?.amount === 13, 'no legacy-stop record')
    const vatican = await textOf(row(section(page, 'Fri 9 Oct · today'), 'Vatican Museums'))
    assert(vatican.startsWith('08:00 Vatican Museums + Sistine Chapel'), `Vatican row: ${vatican}`)
    assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
  }
  finally {
    await done(ph)
  }
})

await test('A1 the "At" chip\'s × keeps its whole 44 px touch area at 320, 360 and 390 px', async () => {
  for (const width of [320, 360, 390]) {
    // 17:20 is the Pantheon's slot: the pad shows "At Pantheon".
    const ph = await open('costs', { at: '2026-10-09T17:20', width })
    try {
      const { page } = ph
      assert(await padOn(page).locator('.chip.at').count() === 1, `${width} px: no At chip`)
      const small = await smallIn(page, '.page.costs')
      assert(!small.length, `${width} px: ${small.map(s => `${s.tag} "${s.text || s.label}" ${s.w}x${s.h}${s.clip ? ` (${s.clip})` : ''}`).join(', ')}`)
      if (width === 320) await shot(page, 'costs-at-pantheon-320')
    }
    finally {
      await done(ph)
    }
  }
})

await test('C5 "Type an amount first" is read out: its live region is there, empty, before the message', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const region = padOn(page).locator('.line [aria-live]')
    assert(await region.count() === 1, 'no live region for the warning')
    const before = await region.evaluate(el => ({ text: el.textContent, display: getComputedStyle(el).display }))
    // A live region hidden with display: none until its message arrives is not reliably spoken.
    assert(before.text === '' && before.display !== 'none', `before the message: ${JSON.stringify(before)}`)
    await catButton(padOn(page), 'Food').click()
    await until(async () => flat(await region.textContent()) === 'Type an amount first', 'the warning is not in the live region')
  }
  finally {
    await done(ph)
  }
})

await test('A2 in light mode too, the stop sheet\'s grey chips and lines reach 4.5:1 (spec 7: both themes)', async () => {
  const ph = await open(`plan?day=fri&stop=${VATICAN}`)
  try {
    const { page } = ph
    const problems = []
    for (const [id, title, expect] of [
      [VATICAN, 'Vatican Museums + Sistine Chapel', 'Saved'],
      [CASTEL, CASTEL_TITLE, 'Skip if tired'],
      ['metro-a-termini-ottaviano', 'Metro A, Termini → Ottaviano', 'Logistics step'],
    ]) {
      if (id !== VATICAN) await go(page, `plan?day=fri&stop=${id}`)
      const sel = `[role="dialog"][aria-label="${title}"]`
      await page.locator(sel).waitFor()
      await sleep(300)
      assert((await textOf(page.locator(sel))).includes(expect), `${title}: no "${expect}"`)
      problems.push(...(await lowContrast(page, sel)).map(x => `${title}: ${x}`))
    }
    assert(!problems.length, problems.join(' | '))
  }
  finally {
    await done(ph)
  }
})

await test('The photo line follows the account: signed out, backed up, signed in as someone else, backup off', async () => {
  const ph = await open(`plan?day=fri&stop=${CASTEL}`)
  try {
    const { page } = ph
    const line = page.locator('.fb .photo-line')
    await line.waitFor()
    assert(flat(await line.textContent()) === 'Photos stay on this phone until you sign in.', `signed out: ${flat(await line.textContent())}`)
    // The signed-in states are set through the component's own handle, which only the dev server has.
    if (!(await page.evaluate(() => !!document.querySelector('.fb')?.__vueParentComponent?.setupState?.cloud))) {
      console.log('     (signed-in states skipped: no component handles on this build)')
      return
    }
    const says = async (status, backup) => {
      await page.evaluate(([status, backup]) => {
        const cloud = document.querySelector('.fb').__vueParentComponent.setupState.cloud
        cloud.user.value = { uid: 'e2e', name: 'E2E', email: 'e2e@example.com', photo: null }
        cloud.status.value = status
        cloud.photoBackup.value = backup
      }, [status, backup])
      await sleep(120)
      return flat(await line.textContent())
    }
    const on = await says('synced', 'on')
    assert(on === 'Photos are backed up to your account.', `signed in: ${on}`)
    // Another Google account than the app's owner: nothing is kept in the cloud (Trip settings says so too).
    const other = await says('not-owner', 'on')
    assert(other === 'Photos stay on this device.', `not the owner: ${other}`)
    const off = await says('synced', 'unavailable')
    assert(off === 'Photos stay on this device.', `backup unavailable: ${off}`)
  }
  finally {
    await done(ph)
  }
})

// ---------- every screen: 390 and 320 px, light and dark, live and preview, Seed S and Fresh ----------

const MODES = [
  { key: 'live', label: 'Seed S live Fri 16:40', opts: {} },
  { key: 'preview', label: 'Seed S preview Fri 16:40', opts: { previewing: true } },
  { key: 'fresh', label: 'Fresh live 30 Sep', opts: { fresh: true, at: SEP30 } },
]
for (const width of [390, 320]) {
  for (const dark of [false, true]) {
    for (const mode of MODES) {
      const tag = `${mode.key}-${width}${dark ? '-dark' : ''}`
      await test(`N5/A1/A2 ${mode.label}, ${width} px${dark ? ', dark' : ''}: Costs, the cost sheet and the stop sheet`, async () => {
        const ph = await open('costs', { ...mode.opts, width, dark })
        try {
          const { page } = ph
          const problems = []
          const look = async (where, root) => {
            problems.push(...(await sideways(page)).map(x => `${where}: sideways ${x}`))
            problems.push(...(await badMoney(page.locator(root))).map(x => `${where}: ${x}`))
            if (width === 390) {
              const small = await smallIn(page, root)
              problems.push(...small.map(s => `${where}: small target ${s.tag} "${s.text || s.label}" ${s.w}x${s.h}${s.clip ? ` (${s.clip})` : ''}`))
            }
            // A2 asks for dark mode; spec 7 wants 4.5:1 in both themes.
            problems.push(...(await lowContrast(page, root)).map(x => `${where}: contrast ${x}`))
          }
          await look('costs', '.page.costs')
          await shot(page, `costs-${tag}`)
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          await sleep(250)
          await look('costs (bottom)', '.page.costs')
          await shot(page, `costs-${tag}-bottom`)
          await page.evaluate(() => window.scrollTo(0, 0))

          // The cost sheet: edit the newest row (Seed S), or add from the pad's stop list (Fresh has none).
          const first = page.locator('button.crow').first()
          if (await first.count()) {
            await first.click()
            await sheetOpen(page, 'Edit cost')
            await look('edit sheet', '[role="dialog"][aria-label="Edit cost"]')
            await shot(page, `cost-sheet-edit-${tag}`)
            await page.keyboard.press('Escape')
            await sheetOf(page, 'Edit cost').waitFor({ state: 'detached' })
          }
          await go(page, `plan?day=fri&stop=${CASTEL}`)
          const stopSheet = sheetOf(page, CASTEL_TITLE)
          await stopSheet.waitFor()
          await sleep(300)
          await look('stop sheet', `[role="dialog"][aria-label="${CASTEL_TITLE}"]`)
          await shot(page, `stop-sheet-${tag}`)
          await stopSheet.getByRole('button', { name: 'Add a cost' }).click()
          await sheetOpen(page, 'Add a cost')
          await look('add sheet', '[role="dialog"][aria-label="Add a cost"]')
          await shot(page, `cost-sheet-add-${tag}`)
          assert(!ph.errors.length, `page errors: ${ph.errors.join(' / ')}`)
          assert(!problems.length, problems.join(' | '))
        }
        finally {
          await done(ph)
        }
      })
    }
  }
}

// ---------- fixes from the final review ----------

await test('Review: a double tap on "Log €18" logs Castel once, and the second tap opens nothing for the row that slid up', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    await section(page, 'Not logged yet').locator('.nl').first().getByRole('button', { name: /^Log €18\b/ }).dblclick()
    await sleep(700)
    const live = await liveRecords(page)
    assert(live.length === 1 && live[0].stopId === CASTEL && live[0].amount === 18, JSON.stringify(live))
    assert(!new URL(page.url()).searchParams.get('cost'), `a cost sheet opened: ${page.url()}`)
  }
  finally {
    await done(ph)
  }
})

await test('Review: the day stays after a save (4.2); a cost for another day says which in its toast, and the day box stands out', async () => {
  const ph = await open('costs', { at: '2026-10-09T07:30' })
  try {
    const { page } = ph
    const pad = padOn(page)
    const offDay = () => pad.locator('.dayp').evaluate(el => el.classList.contains('off'))
    const said = async t => flat(await t.locator('.txt').textContent())
    assert(!(await offDay()), 'today stands out')
    await pad.getByLabel('Counts for').selectOption('thu')
    assert(await offDay(), 'Thu 8 does not stand out')
    await keys(pad, '14')
    await catButton(pad, 'Stay').click()
    const a = await toastWith(page, 'Added €14.00')
    assert(await said(a) === 'Added €14.00 · Stay · Thu 8', `toast: ${await said(a)}`)
    // The next cost still counts for Thursday, and says so too.
    await keys(pad, '1.5')
    await catButton(pad, 'Transport').click()
    const b = await toastWith(page, 'Added €1.50')
    assert(await said(b) === 'Added €1.50 · Transport · Thu 8', `toast: ${await said(b)}`)
    const metro = await until(async () => (await liveRecords(page)).find(e => e.amount === 1.5), 'no €1.50 record')
    assert(metro.dayId === 'thu', JSON.stringify(metro))
    await pad.getByLabel('Counts for').selectOption('fri')
    assert(!(await offDay()), 'today stands out')
    await keys(pad, '2')
    await catButton(pad, 'Food').click()
    const c = await toastWith(page, 'Added €2.00')
    assert(await said(c) === 'Added €2.00 · Food', `toast for today: ${await said(c)}`)
  }
  finally {
    await done(ph)
  }
})

await test('Review: "At" takes only a cost of its stop\'s kind; a pizza paid late goes to lunch, not to the sight the plan has moved on to', async () => {
  let ph = await open('costs', { at: '2026-10-09T17:20' })
  try {
    const { page } = ph
    const pad = padOn(page)
    assert((await textOf(pad.locator('.chip.at'))) === 'At Pantheon', 'no At Pantheon chip')
    await keys(pad, '4')
    await catButton(pad, 'Food').click()
    const t = await toastWith(page, 'Added €4.00')
    assert(flat(await t.locator('.txt').textContent()) === 'Added €4.00 · Food', `toast: ${await t.locator('.txt').textContent()}`)
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 4), 'no record')
    assert(!r.stopId, `linked to ${r.stopId}`)
  }
  finally {
    await done(ph)
  }
  // 12:20, still paying at Bonci (11:15 to 12:10, not ticked) while the plan has St Peter's on now.
  const progress = JSON.parse(JSON.stringify(seed))
  for (const id of Object.keys(progress.stops)) {
    if (/bonci|st-peter/.test(id)) delete progress.stops[id]
  }
  ph = await open('costs', { at: '2026-10-09T12:20', progress })
  try {
    const { page } = ph
    const pad = padOn(page)
    assert((await textOf(pad.locator('.chip.at'))).startsWith('At St Peter'), `chip: ${await textOf(pad.locator('.chip.at'))}`)
    await keys(pad, '12.40')
    await catButton(pad, 'Food').click()
    await toastWith(page, 'Added €12.40 · Food · Early lunch at Bonci Pizzarium')
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 12.4), 'no record')
    assert(r.stopId === 'early-lunch-at-bonci-pizzarium' && r.cat === 'food', JSON.stringify(r))
  }
  finally {
    await done(ph)
  }
})

await test('Review C2: on short phones and an installed iPhone (notch and home bar), every key and category is above the tab bar', async () => {
  const cases = [
    [390, 664, FRI], [375, 667, '2026-10-09T17:20'], [360, 740, '2026-10-09T17:20'], [320, 640, FRI],
    [390, 844, '2026-10-09T17:20', [47, 34]], [393, 852, '2026-10-09T17:20', [59, 34]], [375, 812, '2026-10-09T17:20', [50, 34]],
  ]
  for (const [width, height, at, safe] of cases) {
    const ph = await open('costs', { at, width, height })
    try {
      const { page } = ph
      if (safe) {
        await page.evaluate(([t, b]) => {
          document.documentElement.style.setProperty('--safe-t', `${t}px`)
          document.documentElement.style.setProperty('--safe-b', `${b}px`)
        }, safe)
        await sleep(150)
      }
      const barTop = await page.evaluate(() => document.querySelector('nav.tabbar')?.getBoundingClientRect().top ?? window.innerHeight)
      const lowest = Math.max(...await padOn(page).locator('.key, .cat').evaluateAll(els => els.map(e => e.getBoundingClientRect().bottom)))
      assert(lowest <= barTop, `${width} x ${height}${safe ? ` with safe areas ${safe.join('/')}` : ''}: the pad ends at ${Math.round(lowest)}, the tab bar starts at ${Math.round(barTop)}`)
      assert(await noSideScroll(page), `${width} x ${height}: sideways`)
    }
    finally {
      await done(ph)
    }
  }
})

await test('Review: "After the trip" picked during the trip stays after the trip, in the list and when it opens again', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const pad = padOn(page)
    await pad.getByLabel('Counts for').selectOption('@after')
    await keys(pad, '12.34')
    await catButton(pad, 'Other').click()
    await toastWith(page, 'Added €12.34 · Other · After the trip')
    const r = await until(async () => (await liveRecords(page)).find(e => e.amount === 12.34), 'no record')
    assert(!('dayId' in r) && r.when === 'after', JSON.stringify(r))
    await until(async () => (await row(section(page, 'After the trip'), '€12.34').count()) === 1, 'not under After the trip')
    await row(section(page, 'After the trip'), '€12.34').click()
    const sh = await sheetOpen(page, 'Edit cost')
    assert(await sh.getByLabel('Counts for').inputValue() === '@after', `reopens as ${await sh.getByLabel('Counts for').inputValue()}`)
    await sh.getByRole('button', { name: 'Save', exact: true }).click()
    await sh.waitFor({ state: 'detached' })
    await sleep(300)
    assert((await records(page))[r.id]?.when === 'after', JSON.stringify((await records(page))[r.id]))
    assert(await row(section(page, 'After the trip'), '€12.34').count() === 1, 'a plain Save moved it')
  }
  finally {
    await done(ph)
  }
})

await test('Review: a Stay cost is named beside Today and Trip so far, which leave it out (D8)', async () => {
  const ph = await open('costs')
  try {
    const { page } = ph
    const pad = padOn(page)
    await keys(pad, '35')
    await catButton(pad, 'Stay').click()
    await toastWith(page, 'Added €35.00 · Stay')
    await until(async () => flat(await page.locator('.sum').first().innerText()).includes('+ €35.00 stay, not in the plan'), 'the Today card does not name the stay')
    assert((await todayOf(page)) === '€37.00', `Today ${await todayOf(page)}`)
    const tsf = await textOf(section(page, 'Trip so far'))
    assert(tsf.startsWith('Trip so far €46.00') && tsf.includes('+ €35.00 stay, not in the plan'), `trip so far: ${tsf.slice(0, 160)}`)
  }
  finally {
    await done(ph)
  }
})

await test('Desktop 1280 px: two columns, the pad beside the lists', async () => {
  const ph = await open('costs', { width: 1280, height: 900, isMobile: false, hasTouch: false })
  try {
    const { page } = ph
    const [a, b] = await page.locator('.cols > .col').evaluateAll(els => els.map(e => e.getBoundingClientRect()).map(r => ({ x: r.x, y: r.y, w: r.width })))
    assert(a && b && b.x > a.x + a.w - 1 && Math.abs(a.y - b.y) < 2, `columns ${JSON.stringify([a, b])}`)
    assert(await noSideScroll(page), 'sideways')
    await shot(page, 'costs-desktop-1280')
  }
  finally {
    await done(ph)
  }
})

await test('A4 no em dash (U+2014) in the Costs package files', async () => {
  const files = [
    'app/pages/trips/[id]/costs.vue', 'app/components/CostSheet.vue', 'app/components/CostPad.vue', 'app/components/CostRow.vue',
    'app/components/StopSheet.vue', 'app/components/FeedbackEditor.vue', 'tests/e2e/costs.e2e.mjs',
  ]
  const dash = String.fromCharCode(0x2014)
  const hits = files.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(dash))
  assert(!hits.length, `em dash in ${hits.join(', ')}`)
})

await browser.close()
