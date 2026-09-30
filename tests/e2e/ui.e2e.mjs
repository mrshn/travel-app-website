// Cross-screen browser checks for the Travels UI refresh (the integration package, spec section 9):
//   N2  the lit tab on every route, on a full load, a reload and client-side navigation
//   N5  no sideways scroll on every trip page at 390 and 320 px, also with the cost sheet and the place sheet open
//   A1  44 x 44 px touch targets on Now, Plan, Places, Costs, More, Bookings and Packing (390 and 320 px)
//   A2  dark mode: toast actions and text at 4.5:1 on Costs, Places, Badges and the place sheet; stamps and seals 3:1
//   C2  a cost from /now through the Costs tab; L1 the tick toast with Undo on the Plan timeline, What's left, the
//       map card and the stop sheet; C16 "Paid before" on Costs; C18 €46 on Costs, Progress and Home; S2 and S3 the
//       stamped Pantheon card on Places; G4 the Churches header reads "Complete"
//   O1  the generated site's map offline (--build only); Q1 no network hosts beyond the app's own services
// and the wave-2 fixes: toasts keep clear of the cost pad, a sheet in the URL takes focus, light faint text at
// 4.5:1, the Guide's headings, read-only stars, the segmented controls' focus ring.
// Every check opens its own phone (390 x 844, DPR 2, touch, Europe/Rome): Seed S at live Fri 9 Oct 16:40 unless
// it says otherwise.
//
//   node tests/e2e/ui.e2e.mjs                   against TRAVELS_URL, or the dev server on http://127.0.0.1:3000
//   node tests/e2e/ui.e2e.mjs --build           serves .output/public itself (port 4175) and adds O1 (it needs the
//                                               generated service worker); run `npm run generate` first
//   ONLY=N2,C2 node tests/e2e/ui.e2e.mjs        only the checks whose names start with those labels
//   SHOTS=1 node tests/e2e/ui.e2e.mjs --build   only writes the README screenshots to docs/screenshots/*.webp
//                                               (PNG from Playwright, then cwebp -q 82; set CWEBP to its path)
//   SHOTS=<dir> node tests/e2e/ui.e2e.mjs ...   the same screenshots as PNG files in <dir>, nothing converted
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { BASE, TRIP, TRIP_ROUTES, assert, check, go, live, loadTrip, phone, readProgress, ready, seedS, serveBuild, smallTargets, tripPath, useBase } from './lib.mjs'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const BUILD = process.argv.includes('--build')
const SHOTS = process.env.SHOTS || ''
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean)

const FRI = '2026-10-09T16:40'
const SEP30 = '2026-09-30T12:00'
const trip = loadTrip()
const SEED = seedS(trip)
const CHURCHES = ['sight-st-peter-s-basilica', 'sight-santa-maria-maggiore', 'sight-st-john-lateran', 'sight-tempietto-del-bramante']
/** Every trip page: lib's routes plus the two new ones. */
const PAGES = [...TRIP_ROUTES, 'costs', 'badges']

const srv = BUILD ? await serveBuild(4175) : null
if (srv) useBase(srv.url)
const browser = await chromium.launch()

// ---------- helpers ----------

const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const sleep = ms => new Promise(res => setTimeout(res, ms))

/** Polls fn() until it gives something truthy; throws `message` after `ms`. */
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

/** A check that runs unless ONLY names others. */
async function test(name, fn) {
  if (ONLY.length && !ONLY.some(p => name.startsWith(p))) return
  await check(name, fn)
}

/** Every host asked for during this run, with the first address seen (Q1). */
const hosts = new Map()
function noteHost(url) {
  try {
    const u = new URL(url)
    if (!/^https?:$/.test(u.protocol)) return
    if (!hosts.has(u.host)) hosts.set(u.host, `${u.origin}${u.pathname}`.slice(0, 100))
  }
  catch { /* not a URL */ }
}

/** Records every toast that shows (text, tone, actions), so counts survive toasts timing out. */
function logToasts() {
  window.__toastLog = []
  const seen = new WeakSet()
  const scan = () => {
    for (const el of document.querySelectorAll('.toasts .toast')) {
      if (seen.has(el)) continue
      seen.add(el)
      window.__toastLog.push({
        text: (el.querySelector('.txt')?.textContent ?? '').trim(),
        gold: el.classList.contains('t-gold'),
        actions: [...el.querySelectorAll('button')].map(b => b.textContent.trim()),
      })
    }
  }
  new MutationObserver(scan).observe(document, { childList: true, subtree: true })
}
const toastLog = page => page.evaluate(() => window.__toastLog ?? [])

/**
 * A phone (lib's phone()) with its requests noted for Q1 and its toasts logged: Seed S unless `progress` is given
 * (null for Fresh), live at `at` unless `at` is null (the real clock).
 */
async function device({ at = FRI, progress = SEED, ...opts } = {}) {
  const d = await phone(browser, { ...opts, progress: progress ?? undefined })
  d.ctx.on('request', r => noteHost(r.url()))
  await d.ctx.addInitScript(logToasts)
  if (at) await live(d.page, at)
  return d
}

/** A full load of an app path ("costs", "plan?day=fri", or "/" and "/settings" off the trip). */
async function open(page, path) {
  await page.goto(new URL(tripPath(path), BASE).href, { waitUntil: 'domcontentloaded' })
  await ready(page)
}

/** Runs fn with a fresh device, closing it afterwards. */
async function withDevice(opts, fn) {
  const d = await device(opts)
  try {
    return await fn(d)
  }
  finally {
    await d.ctx.close()
  }
}

/** The toast (on screen, not waiting for room) that says `text`. */
async function toastWith(page, text, ms = 5000) {
  const t = page.locator('.toasts .toast:not(.off)', { hasText: text }).last()
  await t.waitFor({ timeout: ms })
  return t
}
const actsOf = async t => (await t.locator('button').allInnerTexts()).map(flat)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Taps the cost pad's keys: digits, "." (Decimal point). */
async function keys(scope, seq) {
  for (const ch of seq) await scope.getByRole('button', { name: ch === '.' ? 'Decimal point' : ch, exact: true }).tap()
}
const catButton = (scope, label) => scope.locator('button.cat', { hasText: label })
const liveCosts = async page => Object.values((await readProgress(page))?.expenses ?? {}).filter(e => !e.deleted)

/** The simulated iPhone safe areas (a notch at the top, the home bar at the bottom). */
async function notch(page) {
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-t', '47px')
    document.documentElement.style.setProperty('--safe-b', '34px')
  })
  await sleep(100)
}

/** Scrolls through the page and collects lib's smallTargets() at every stop, the toasts left out. */
async function allSmall(page) {
  const found = new Map()
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const step = await page.evaluate(() => Math.round(window.innerHeight * 0.6))
  for (let y = 0; y <= height; y += step) {
    await page.evaluate(top => window.scrollTo(0, top), y)
    await sleep(120)
    for (const t of await smallTargets(page)) {
      if (/\b(?:act|toast)\b/.test(t.cls)) continue
      found.set(`${t.tag}.${t.cls}|${t.text}|${t.label}`, t)
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  return [...found.values()]
}
const brief = list => JSON.stringify(list.slice(0, 5))

/** Sideways scroll on the page or inside an open sheet. */
async function sideways(page) {
  return page.evaluate(() => {
    const out = []
    const d = document.documentElement
    if (d.scrollWidth !== window.innerWidth) out.push(`page ${d.scrollWidth} px wide at ${window.innerWidth}`)
    for (const b of document.querySelectorAll('.sheet .body')) {
      if (b.scrollWidth > b.clientWidth + 1) out.push(`${b.closest('[role=dialog]')?.getAttribute('aria-label')}: ${b.scrollWidth} > ${b.clientWidth}`)
    }
    return out
  })
}

/**
 * Contrast problems in `rootSel` (default: the trip shell, its tab bar left out): text under 4.5:1 against what
 * is painted behind it (3:1 for large text, as WCAG), stamp ink and rims and badge seals under 3:1, and toast
 * actions under 4.5:1. Colours are composited over the solid backgrounds behind them; text on pictures is left out.
 */
function contrastIssues(page, rootSel = '.shell') {
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
    const scope = document.querySelector(sel)
    if (!scope) return [`nothing matches ${sel}`]
    for (const el of scope.querySelectorAll('*')) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
      if (!own || el.closest('.art-frame, svg, .tabbar, .toasts, .sr-only, option, select')) continue
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      if (s.visibility !== 'visible' || s.display === 'none' || r.width < 1 || r.height < 1) continue
      const bg = bgOf(el)
      const fg = parse(s.color)
      if (!bg || !fg) continue
      const shown = over([fg[0], fg[1], fg[2], fg[3] * opacityOf(el)], bg)
      const size = Number.parseFloat(s.fontSize)
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700)
      const need = large ? 3 : 4.5
      const got = ratio(shown, bg)
      if (got < need) out.push(`text "${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)}" ${r2(got)}:1`)
    }
    // Stamps: the ink (rings, words, date) and the gold rim of a top pick, against what is behind the stamp.
    for (const st of scope.querySelectorAll('svg.stamp')) {
      const bg = bgOf(st.parentElement)
      if (!bg) continue
      const ink = parse(getComputedStyle(st).color)
      if (ink && ratio(over(ink, bg), bg) < 3) out.push(`stamp ink "${st.getAttribute('aria-label')}" ${r2(ratio(over(ink, bg), bg))}:1`)
      for (const rim of st.querySelectorAll('.rim')) {
        const c = parse(getComputedStyle(rim).stroke)
        if (c && ratio(over(c, bg), bg) < 3) out.push(`stamp rim "${st.getAttribute('aria-label')}" ${r2(ratio(over(c, bg), bg))}:1`)
      }
    }
    // Badge seals: an earned seal's laurel, a locked one's icon.
    for (const seal of scope.querySelectorAll('svg.seal')) {
      const bg = bgOf(seal.parentElement)
      if (!bg) continue
      const part = seal.classList.contains('on') ? seal.querySelector('.leaf') : seal.querySelector('.icon')
      if (!part) continue
      const cs = getComputedStyle(part)
      const c = parse(part.classList.contains('leaf') ? cs.fill : cs.color)
      if (c && ratio(over(c, bg), bg) < 3) out.push(`seal "${seal.getAttribute('aria-label')}" ${r2(ratio(over(c, bg), bg))}:1`)
    }
    return out
  }, rootSel)
}

/** Toast actions under 4.5:1 against their toast. */
function toastActionIssues(page) {
  return page.evaluate(() => {
    const parse = (c) => {
      const m = /rgba?\(([^)]+)\)/.exec(c)
      if (!m) return null
      const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
      return [r, g, b, a]
    }
    const lum = ([r, g, b]) => [r, g, b].map(v => v / 255).map(s => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4)).reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0)
    const out = []
    let n = 0
    for (const b of document.querySelectorAll('.toasts .toast:not(.off) .act')) {
      const fg = parse(getComputedStyle(b).color)
      const bg = parse(getComputedStyle(b.closest('.toast')).backgroundColor)
      if (!fg || !bg) continue
      n++
      const [x, y] = [lum(fg), lum(bg)].sort((p, q) => q - p)
      const got = (x + 0.05) / (y + 0.05)
      if (got < 4.5) out.push(`"${b.textContent.trim()}" ${Math.round(got * 100) / 100}:1`)
    }
    return { n, out }
  })
}

/**
 * Pad keys and category buttons a toast covers: boxes that intersect, and keys whose middle, when tapped, lands
 * on something that is not the key (a toast or its Undo).
 */
function padCovered(page) {
  return page.evaluate(() => {
    const toasts = [...document.querySelectorAll('.toasts .toast')]
      .filter(t => getComputedStyle(t).visibility !== 'hidden' && !t.classList.contains('toast-leave-active'))
      .map(t => t.getBoundingClientRect())
    const out = []
    for (const b of document.querySelectorAll('.pad .key, .pad .cats button')) {
      const r = b.getBoundingClientRect()
      const name = b.getAttribute('aria-label') || b.textContent.trim()
      if (toasts.some(t => Math.min(t.right, r.right) - Math.max(t.left, r.left) > 0 && Math.min(t.bottom, r.bottom) - Math.max(t.top, r.top) > 0)) out.push(`${name} (under a toast)`)
      const x = r.left + r.width / 2
      const y = r.top + r.height / 2
      if (y > 0 && y < innerHeight) {
        const at = document.elementFromPoint(x, y)
        if (at?.closest('.toasts')) out.push(`${name} (a tap lands on "${at.textContent.trim().slice(0, 30)}")`)
      }
    }
    return { out, toasts: toasts.length }
  })
}

// ---------- SHOTS: the README screenshots ----------

/**
 * docs/screenshots: Seed S, signed out, live Fri 9 Oct 16:40 at 390 x 844 (DPR 2), light, unless a screen says
 * otherwise. The night shot is later that evening (Getting back shows), and the desktop one is 1280 px wide.
 */
const SCREENS = [
  { name: 'now', path: 'now' },
  { name: 'plan', path: 'plan?day=fri' },
  { name: 'progress', path: 'progress' },
  { name: 'costs', path: 'costs' },
  { name: 'places', path: 'places' },
  { name: 'badges', path: 'badges' },
  { name: 'feedback', path: 'plan?day=fri&stop=vatican-museums-sistine-chapel', sheet: 'Vatican Museums + Sistine Chapel' },
  { name: 'night', path: 'now', at: '2026-10-09T22:30', dark: true },
  { name: 'home', path: '/' },
  { name: 'desktop', path: 'now', width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
]

async function takeShots() {
  const toDocs = SHOTS === '1'
  const dir = toDocs ? mkdtempSync(join(tmpdir(), 'travels-shots-')) : resolve(SHOTS)
  mkdirSync(dir, { recursive: true })
  const cwebp = process.env.CWEBP || (existsSync('/opt/homebrew/bin/cwebp') ? '/opt/homebrew/bin/cwebp' : 'cwebp')
  for (const { name, path, sheet, ...opts } of SCREENS) {
    await withDevice(opts, async ({ ctx, page }) => {
      // The map shows OpenStreetMap, as it does wherever Google's tiles don't answer (127.0.0.1 among them).
      await ctx.addInitScript(() => localStorage.setItem('travel:map:provider', 'osm'))
      await open(page, path)
      if (sheet) {
        const sh = page.getByRole('dialog', { name: sheet })
        await sh.waitFor()
        await sleep(500)
      }
      if (await page.locator('.leaflet-container').count()) {
        // A frozen clock never finishes Leaflet's fade-in: show loaded tiles at once.
        await page.addStyleTag({ content: '.leaflet-tile-loaded { opacity: 1 !important; }' })
        await until(() => page.evaluate(() => [...document.querySelectorAll('img.leaflet-tile')].filter(i => i.complete && i.naturalWidth > 0).length >= 6), 'map tiles', 15000).catch(() => {})
      }
      await page.evaluate(() => document.fonts.ready)
      await sleep(400)
      const png = join(dir, `${name}.png`)
      await page.screenshot({ path: png, animations: 'disabled' })
      if (toDocs) {
        execFileSync(cwebp, ['-quiet', '-q', '82', png, '-o', join(ROOT, 'docs/screenshots', `${name}.webp`)])
        console.log(`docs/screenshots/${name}.webp`)
      }
      else {
        console.log(png)
      }
    })
  }
  if (toDocs) rmSync(dir, { recursive: true, force: true })
}

if (SHOTS) {
  try {
    await takeShots()
  }
  finally {
    await browser.close()
    await srv?.close()
  }
  process.exit(0)
}

// ---------- N2: the lit tab ----------

const LIT = {
  'now': 'Now', 'plan': 'Plan', 'map': 'Plan', 'map?from=places': 'Places', 'places': 'Places', 'costs': 'Costs',
  'more': 'More', 'progress': 'More', 'badges': 'More', 'bookings': 'More', 'packing': 'More', 'guide': 'More',
  'notes': 'More', 'sos': 'More', 'settings': 'More',
}
const litTabs = page => page.evaluate(() => ({
  bar: [...document.querySelectorAll('.tabbar [aria-current="page"]')].map(a => a.textContent.trim()),
  top: [...document.querySelectorAll('.tabs-top [aria-current="page"]')].map(a => a.textContent.trim()),
}))

await test('N2 every route lights its tab (tab bar and top tabs) on a full load and a reload, with no page error', () =>
  withDevice({}, async ({ page, errors }) => {
    const bad = []
    for (const [path, want] of Object.entries(LIT)) {
      for (const how of ['load', 'reload']) {
        errors.length = 0
        if (how === 'load') await open(page, path)
        else {
          await page.reload({ waitUntil: 'domcontentloaded' })
          await ready(page)
        }
        const lit = await litTabs(page)
        if (!same(lit.bar, [want]) || !same(lit.top, [want])) bad.push(`${path} (${how}): ${JSON.stringify(lit)}`)
        if (errors.length) bad.push(`${path} (${how}): page error ${errors.join(' / ')}`)
      }
    }
    assert(!bad.length, bad.join('; '))
  }))

await test('N2 every route lights its tab on client-side navigation, with no page error', () =>
  withDevice({}, async ({ page, errors }) => {
    await open(page, 'now')
    const bad = []
    for (const [path, want] of Object.entries(LIT)) {
      errors.length = 0
      await go(page, path)
      assert(`${new URL(page.url()).pathname}${new URL(page.url()).search}` === tripPath(path), `not at ${path}: ${page.url()}`)
      const lit = await litTabs(page)
      if (!same(lit.bar, [want]) || !same(lit.top, [want])) bad.push(`${path}: ${JSON.stringify(lit)}`)
      if (errors.length) bad.push(`${path}: page error ${errors.join(' / ')}`)
    }
    assert(!bad.length, bad.join('; '))
  }))

// ---------- N5: no sideways scroll ----------

for (const width of [390, 320]) {
  await test(`N5 no sideways scroll at ${width} px on every trip page, and with the cost sheet and the place sheet open`, () =>
    withDevice({ width, height: width === 320 ? 640 : 844 }, async ({ page, errors }) => {
      const bad = []
      for (const path of [...PAGES, 'costs?cost=new', 'places?place=sight-pantheon', 'now?cost=new', 'map?day=all&places=1&from=places&place=sight-pantheon']) {
        await open(page, path)
        if (path.includes('cost=') || path.includes('place=')) {
          await page.getByRole('dialog').first().waitFor({ timeout: 5000 })
          await sleep(350)
        }
        for (const s of await sideways(page)) bad.push(`${path}: ${s}`)
      }
      assert(!bad.length, bad.join('; '))
      assert(!errors.length, `page errors: ${errors.join(' / ')}`)
    }))
}

// ---------- A1: touch targets ----------

for (const width of [390, 320]) {
  await test(`A1 every button and link is at least 44 x 44 px at ${width} px on Now, Plan, Places, Costs, More, Bookings and Packing`, () =>
    withDevice({ width, height: width === 320 ? 640 : 844 }, async ({ page }) => {
      const bad = []
      for (const path of ['now', 'plan?day=fri', 'places', 'costs', 'more', 'bookings', 'packing']) {
        await open(page, path)
        const small = await allSmall(page)
        if (small.length) bad.push(`${path}: ${brief(small)}`)
      }
      assert(!bad.length, bad.join('; '))
    }))
}

// ---------- A2: dark mode contrast ----------

await test('A2 dark: text on Costs, Places and Badges at 4.5:1 (3:1 large), stamps and seals at 3:1', () =>
  withDevice({ dark: true }, async ({ page }) => {
    const bad = []
    for (const path of ['costs', 'places', 'badges']) {
      await open(page, path)
      for (const x of await contrastIssues(page)) bad.push(`${path}: ${x}`)
    }
    // Stamps were checked: Seed S has three, on Places and in "Stamps by day".
    assert(await page.locator('svg.stamp').count() >= 3, 'no stamps on Badges to check')
    assert(!bad.length, bad.join('; '))
  }))

await test('A2 dark: the place sheet (a stamped top pick) at 4.5:1, its stamp and rim at 3:1', () =>
  withDevice({ dark: true }, async ({ page }) => {
    const stamped = trip.places.find(p => p.id === 'sight-vatican-museums')
    assert(stamped, 'no Vatican Museums place')
    await open(page, 'places?place=sight-vatican-museums')
    const sh = page.getByRole('dialog', { name: stamped.name })
    await sh.waitFor()
    await sleep(400)
    assert(await sh.locator('svg.stamp').count() >= 1, 'the sheet shows no stamp')
    const bad = await contrastIssues(page, '[role="dialog"]')
    assert(!bad.length, bad.join('; '))
  }))

await test('A2 dark: toast actions at 4.5:1 (Undo after a cost, Log and Undo after a tick)', () =>
  withDevice({ dark: true, at: '2026-10-09T17:20' }, async ({ page }) => {
    await open(page, 'now')
    await page.locator('.hero').getByRole('button', { name: 'Done', exact: true }).click()
    await toastWith(page, 'Done: Pantheon')
    let res = await toastActionIssues(page)
    assert(res.n >= 2 && !res.out.length, `tick toast: ${JSON.stringify(res)}`)
    await go(page, 'costs')
    await keys(page.locator('.padcard'), '2')
    await catButton(page.locator('.padcard'), 'Food').tap()
    await toastWith(page, 'Added €2.00')
    res = await toastActionIssues(page)
    assert(res.n >= 1 && !res.out.length, `cost toast: ${JSON.stringify(res)}`)
  }))

// ---------- C2: a cost from Now, through the Costs tab ----------

await test('C2 from /now: the Costs tab, 3 . 5 0 and Food, with no scrolling: "Added €3.50 · Food", Today €40.50, the record kept after a reload', () =>
  withDevice({}, async ({ page, errors }) => {
    await open(page, 'now')
    /** Taps a control that is fully on screen and not covered, as a thumb would, without scrolling. */
    async function tapInView(loc, what) {
      const ok = await loc.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const bar = document.querySelector('.tabbar')
        const floor = bar && !el.closest('.tabbar') ? bar.getBoundingClientRect().top : innerHeight
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
        return r.top >= 0 && r.bottom <= floor && !!at && (at === el || el.contains(at))
      })
      assert(ok, `${what} is not on screen without scrolling`)
      await loc.tap()
    }
    await tapInView(page.locator('.tabbar a', { hasText: 'Costs' }), 'the Costs tab')
    await until(() => new URL(page.url()).pathname.endsWith('/costs'), 'did not reach /costs')
    const pad = page.locator('.padcard')
    await pad.waitFor()
    for (const k of ['3', 'Decimal point', '5', '0']) await tapInView(pad.getByRole('button', { name: k, exact: true }), `key ${k}`)
    await tapInView(catButton(pad, 'Food'), 'Food')
    const t = await toastWith(page, 'Added €3.50')
    assert(flat(await t.locator('.txt').textContent()) === 'Added €3.50 · Food', `toast: ${await t.locator('.txt').textContent()}`)
    assert(await page.evaluate(() => scrollY) === 0, 'the page scrolled')
    await until(async () => flat(await page.locator('.sum .big').first().innerText()) === '€40.50', 'Today is not €40.50')
    const check = async () => {
      const recs = await liveCosts(page)
      assert(recs.length === 1, `${recs.length} records`)
      const r = recs[0]
      assert(r.amount === 3.5 && r.cat === 'food' && r.dayId === 'fri' && r.currency === 'EUR' && r.at && r.updatedAt, JSON.stringify(r))
    }
    await check()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await ready(page)
    await check()
    assert(flat(await page.locator('.sum .big').first().innerText()) === '€40.50', 'Today after the reload')
    assert(!errors.length, errors.join(' / '))
  }))

// ---------- L1: every tick surface toasts with Undo ----------

/** Taps a tick, checks its toast offers Undo, taps Undo and checks the stop is unticked again. */
async function tickAndUndo(page, tap, title = 'Pantheon', id = 'pantheon') {
  await tap()
  const t = await toastWith(page, `Done: ${title}`)
  const acts = await actsOf(t)
  assert(acts.includes('Undo'), `actions: ${acts}`)
  assert((await readProgress(page))?.stops?.[id]?.status === 'done', 'not ticked')
  await t.getByRole('button', { name: 'Undo' }).click()
  await until(async () => !(await readProgress(page))?.stops?.[id], 'Undo did not untick it')
}

await test('L1 the Plan timeline\'s tick toasts "Done: Pantheon" with Undo, and Undo unticks it', () =>
  withDevice({}, async ({ page }) => {
    await open(page, 'plan?day=fri')
    await tickAndUndo(page, () => page.locator('#stop-pantheon .tick').click())
  }))

await test('L1 "Did it" in What\'s left toasts with Undo, and Undo unticks it', () =>
  withDevice({ at: '2026-10-09T19:00' }, async ({ page }) => {
    await open(page, 'progress?view=left')
    const row = page.locator('.row-item', { has: page.getByRole('button', { name: 'Pantheon', exact: true }) })
    await tickAndUndo(page, () => row.getByRole('button', { name: 'Did it' }).click())
  }))

await test('L1 "Mark done" on the map card toasts with Undo, and Undo unticks it', () =>
  withDevice({}, async ({ page }) => {
    await open(page, 'map?day=fri&focus=pantheon')
    const card = page.locator('.selcard')
    await card.waitFor()
    await tickAndUndo(page, () => card.getByRole('button', { name: 'Mark done' }).click())
  }))

await test('L1 Done in the stop sheet toasts with Undo, and Undo unticks it', () =>
  withDevice({}, async ({ page }) => {
    await open(page, 'plan?day=fri&stop=pantheon')
    const sh = page.getByRole('dialog', { name: 'Pantheon' })
    await sh.waitFor()
    await tickAndUndo(page, () => sh.locator('.status button', { hasText: 'Done' }).click())
  }))

// ---------- C16: a booking's cost, then "Paid before" on Costs ----------

await test('C16 Fresh at live 30 Sep: ticking the Vatican booking offers Log €25; Costs then shows "Paid before" under Fri 9 Oct', () =>
  withDevice({ at: SEP30, progress: null }, async ({ page }) => {
    await open(page, 'bookings')
    const card = page.locator('article.bk', { hasText: 'Vatican Museums, Fri 9 Oct, 08:00' }).first()
    await card.locator('label.bk-check').click()
    const t = await toastWith(page, 'Booked. One less thing.')
    assert(same(await actsOf(t), ['Log €25', 'Undo']), `actions ${await actsOf(t)}`)
    await t.getByRole('button', { name: 'Log €25' }).click()
    await toastWith(page, 'Added €25.00')
    const r = await until(async () => (await liveCosts(page))[0], 'no cost written')
    assert(r.amount === 25 && r.cat === 'sights' && r.dayId === 'fri' && r.stopId === 'vatican-museums-sistine-chapel' && r.bookingId === 'vatican', JSON.stringify(r))
    await page.locator('.tabbar a', { hasText: 'Costs' }).click()
    await until(() => new URL(page.url()).pathname.endsWith('/costs'), 'did not reach /costs')
    const fri = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Fri 9 Oct' }) })
    const row = fri.locator('button.crow', { hasText: '€25.00' })
    await row.waitFor()
    const line = flat(await row.innerText())
    assert(line.startsWith('Paid before') && line.includes('Vatican Museums'), `row: ${line}`)
  }))

// ---------- C18: the same €46 on Costs, Progress and Home ----------

await test('C18 Seed S: Costs "Trip so far", the Progress money card and the Home trip card all read €46', () =>
  withDevice({}, async ({ page }) => {
    await open(page, 'costs')
    const tsf = flat(await page.locator('section').filter({ has: page.getByRole('heading', { name: 'Trip so far' }) }).innerText())
    assert(tsf.startsWith('Trip so far €46.00'), `Costs: ${tsf.slice(0, 60)}`)
    await go(page, 'progress')
    const money = flat(await page.locator('.mcard .mline').innerText())
    assert(money.startsWith('€46.00'), `Progress: ${money}`)
    await open(page, '/')
    const card = flat(await page.locator('a, article, section, div').filter({ hasText: 'ROME' }).locator('.chip.num').first().innerText())
    assert(card === '€46', `Home: ${card}`)
  }))

// ---------- S2 and S3: the Pantheon, ticked on Now, is stamped on Places ----------

await test('S2 S3 live Fri 17:20: Done on the Pantheon hero stamps it (no stamps record); Log €7; the Pantheon card is stamped on Places', () =>
  withDevice({ at: '2026-10-09T17:20' }, async ({ page }) => {
    await open(page, 'now')
    const hero = page.locator('.hero')
    assert(flat(await hero.innerText()).includes('Pantheon'), 'the hero is not the Pantheon')
    await hero.getByRole('button', { name: 'Done', exact: true }).click()
    const t = await toastWith(page, 'Done: Pantheon')
    assert(flat(await t.locator('.txt').textContent()) === 'Done: Pantheon · Stamped', `toast: ${await t.locator('.txt').textContent()}`)
    assert(same(await actsOf(t), ['Log €7', 'Undo']), `actions ${await actsOf(t)}`)
    assert(!Object.keys((await readProgress(page))?.stamps ?? {}).length, 'a stamps record was written')
    await t.getByRole('button', { name: 'Log €7' }).click()
    await toastWith(page, 'Added €7.00 · Sights · Pantheon')
    await until(async () => flat(await page.locator('.money').innerText()).includes('€44.00 today'), 'the money row does not read €44.00 today')
    await page.locator('.tabbar a', { hasText: 'Places' }).click()
    const tile = page.locator('button.tile[data-place="sight-pantheon"]')
    await tile.waitFor()
    assert(await tile.evaluate(el => el.classList.contains('got') && !!el.querySelector('svg.stamp')), 'the Pantheon card is not stamped')
    const photo = page.locator('button.tile[data-place="photo-pantheon"]')
    if (await photo.count()) assert(!(await photo.evaluate(el => el.classList.contains('got'))), 'the Pantheon photo spot was stamped too')
  }))

// ---------- G4: the Churches set, stamped by hand on Places ----------

await test('G4 stamping the four churches on Places: "Set complete: Churches" once, and the Churches header reads "Complete"', () =>
  withDevice({}, async ({ page }) => {
    await open(page, 'places')
    for (const id of CHURCHES) {
      const name = trip.places.find(p => p.id === id)?.name
      await page.locator(`button.tile[data-place="${id}"]`).first().click()
      const sh = page.getByRole('dialog', { name })
      await sh.waitFor()
      await sh.getByRole('button', { name: 'I was here' }).click()
      await toastWith(page, `Stamped: ${name}`)
      await page.keyboard.press('Escape')
      await sh.waitFor({ state: 'detached' })
    }
    const done = await until(async () => (await toastLog(page)).filter(t => t.text.includes('Set complete: Churches')), 'no "Set complete: Churches"')
    await sleep(1200)
    const all = (await toastLog(page)).filter(t => t.text.includes('Set complete: Churches'))
    assert(done.length && all.length === 1 && all[0].gold, `celebrations: ${JSON.stringify(all)}`)
    const head = flat(await page.locator('section[aria-labelledby="set-church"] .set-n').innerText())
    assert(head === 'Complete', `Churches header: ${head}`)
    const p = await readProgress(page)
    assert(CHURCHES.every(id => p.stamps?.[id]?.on === true), JSON.stringify(p.stamps))
  }))

// ---------- C11 through the Plan and stop editor screens ----------

await test('C11 through the screens: a €30 cost on Sunday lunch, a new stop with a €4 cost, the Colosseum moved to Sun 11, the stop deleted: Everything stays €80.00 and the orphaned row keeps its title', () =>
  withDevice({}, async ({ page }) => {
    const everything = async () => {
      await go(page, 'costs')
      return flat(await page.locator('.every .strong').innerText())
    }
    /** Opens a stop's sheet, taps Add a cost, types the amount and taps Food (the sheet closes after a save). */
    async function costOn(stopPath, title, digits) {
      await go(page, stopPath)
      const sh = page.getByRole('dialog', { name: title })
      await sh.waitFor()
      await sh.getByRole('button', { name: 'Add a cost' }).click()
      const cs = page.getByRole('dialog', { name: 'Add a cost' })
      await cs.waitFor()
      for (const ch of digits) await cs.getByRole('button', { name: ch, exact: true }).click()
      await catButton(cs, 'Food').click()
      await cs.waitFor({ state: 'detached' })
      await page.keyboard.press('Escape')
      await sh.waitFor({ state: 'detached' })
    }
    await open(page, 'plan?day=fri')
    const LUNCH = 'Sunday lunch: La Tavernaccia da Bruno'
    await costOn('plan?day=sun&stop=sunday-lunch-la-tavernaccia-da-bruno', LUNCH, '30')
    const lunch = (await liveCosts(page)).find(e => e.amount === 30)
    assert(lunch?.stopId === 'sunday-lunch-la-tavernaccia-da-bruno' && lunch.dayId === 'sun', JSON.stringify(lunch))
    // A stop of your own on Friday, from Plan's "Add a stop".
    await go(page, 'plan?day=fri')
    await page.getByRole('button', { name: /^Add a stop to / }).click()
    const ed = page.getByRole('dialog', { name: 'Add a stop' })
    await ed.waitFor()
    await ed.locator('input.input').first().fill('Evening snack')
    await ed.getByRole('button', { name: 'Add stop' }).click()
    await ed.waitFor({ state: 'detached' })
    const row = page.locator('[id^="stop-evening-snack"]').first()
    await row.waitFor()
    const snack = (await row.getAttribute('id')).slice('stop-'.length)
    await costOn(`plan?day=fri&stop=${snack}`, 'Evening snack', '4')
    let all = await everything()
    assert(all.startsWith('€80.00'), `Everything before: ${all}`)
    // The Colosseum to Sunday, through the folded question's Change.
    await go(page, 'plan?day=sat')
    await page.getByRole('button', { name: /^Change: / }).click()
    await page.locator('.variant .seg button', { hasText: 'Sun 11' }).click()
    await until(async () => (await readProgress(page))?.variant === 'sun', 'the Colosseum day did not change')
    // Delete the stop of your own in the stop editor (it asks first).
    await go(page, `plan?day=fri&stop=${snack}`)
    const sh = page.getByRole('dialog', { name: 'Evening snack' })
    await sh.waitFor()
    await sh.getByRole('button', { name: 'Edit stop' }).click()
    const ed2 = page.getByRole('dialog', { name: 'Edit stop' })
    await ed2.waitFor()
    page.once('dialog', d => d.accept())
    await ed2.getByRole('button', { name: 'Delete stop' }).click()
    await ed2.waitFor({ state: 'detached' })
    await until(async () => !(await page.locator(`#stop-${snack}`).count()), 'the stop is still in the plan')
    all = await everything()
    assert(all.startsWith('€80.00'), `Everything after: ${all}`)
    const rows = (await page.locator('button.crow').allInnerTexts()).map(flat)
    assert(rows.some(r => r.includes('Evening snack') && r.includes('€4.00')), `no orphaned "Evening snack" row: ${JSON.stringify(rows)}`)
    assert(rows.some(r => r.includes('Tavernaccia') && r.includes('€30.00')), `no Sunday lunch row: ${JSON.stringify(rows)}`)
  }))

// ---------- the toasts keep clear of the cost pad (wave-2 fix) ----------

for (const [width, height] of [[390, 844], [320, 640]]) {
  for (const safe of [false, true]) {
    const where = `${width} x ${height}${safe ? ' with the iPhone safe areas' : ''}`
    await test(`Toasts: after one and after three quick saves on /costs no toast covers a key or a category (${where})`, () =>
      withDevice({ width, height }, async ({ page }) => {
        await open(page, 'costs')
        if (safe) await notch(page)
        const pad = page.locator('.padcard')
        const bad = []
        for (let i = 1; i <= 3; i++) {
          await keys(pad, String(i + 1))
          await catButton(pad, 'Food').tap()
          if (i === 2) continue
          // Right away (the next tap could come now), then once the toasts have settled.
          for (const wait of [0, 400]) {
            await sleep(wait)
            const got = await padCovered(page)
            if (got.out.length) bad.push(`after ${i} save(s), ${wait} ms: ${got.out.join(', ')}`)
          }
        }
        assert((await liveCosts(page)).length === 3, `${(await liveCosts(page)).length} costs saved`)
        assert(!bad.length, bad.join('; '))
        // The pad scrolled to where the thumb reaches the categories: still clear.
        await page.evaluate(() => {
          const cats = document.querySelector('.padcard .cats').getBoundingClientRect()
          const bar = document.querySelector('.tabbar').getBoundingClientRect()
          window.scrollBy(0, cats.bottom - bar.top + 8)
        })
        await keys(pad, '9')
        await catButton(pad, 'Other').tap()
        await sleep(300)
        const got = await padCovered(page)
        assert(!got.out.length, `scrolled to the categories: ${got.out.join(', ')}`)
        assert(got.toasts >= 1, 'no toast showed')
      }))
  }
  await test(`Toasts: a tick's toast keeps clear of the cost sheet opened under it (${width} x ${height})`, () =>
    withDevice({ width, height }, async ({ page }) => {
      await open(page, 'plan?day=fri&stop=pantheon')
      const sh = page.getByRole('dialog', { name: 'Pantheon' })
      await sh.waitFor()
      await sh.locator('.status button', { hasText: 'Done' }).click()
      await toastWith(page, 'Done: Pantheon')
      await sh.getByRole('button', { name: 'Add a cost' }).click()
      await page.getByRole('dialog', { name: 'Add a cost' }).waitFor()
      await sleep(450)
      const got = await padCovered(page)
      assert(got.toasts >= 1, 'the toast is gone')
      assert(!got.out.length, got.out.join(', '))
    }))
}

await test('Toasts: away from a cost pad they stay in their usual place above the tab bar', () =>
  withDevice({}, async ({ page }) => {
    await open(page, 'plan?day=fri')
    await page.locator('#stop-pantheon .tick').click()
    const t = await toastWith(page, 'Done: Pantheon')
    const box = await t.boundingBox()
    const bar = await page.locator('.tabbar').boundingBox()
    assert(!(await page.locator('.toasts').evaluate(el => el.classList.contains('at-top'))), 'the toasts moved to the top')
    assert(box.y + box.height <= bar.y && box.y + box.height > bar.y - 40, `toast at ${box.y}..${box.y + box.height}, tab bar at ${bar.y}`)
  }))

// ---------- a sheet in the URL takes focus (wave-2 fix) ----------

await test('A3 a direct load or a reload with ?cost=, ?stop= or ?place= puts focus in the sheet', () =>
  withDevice({}, async ({ page }) => {
    const bad = []
    for (const path of ['costs?cost=new', 'now?cost=new', 'plan?day=fri&stop=pantheon', 'places?place=sight-pantheon']) {
      for (const how of ['load', 'reload']) {
        if (how === 'load') await open(page, path)
        else {
          await page.reload({ waitUntil: 'domcontentloaded' })
          await ready(page)
        }
        const inSheet = await until(() => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')), 'focus', 3000).catch(() => false)
        if (!inSheet) bad.push(`${path} (${how}): focus on ${await page.evaluate(() => document.activeElement?.tagName)}`)
      }
    }
    assert(!bad.length, bad.join('; '))
    // Typing in the sheet keeps focus where it is.
    await page.getByRole('button', { name: 'Close' }).first().click().catch(() => {})
    await open(page, 'costs?cost=new')
    const sh = page.getByRole('dialog', { name: 'Add a cost' })
    await sh.getByRole('button', { name: '+ Note' }).click()
    await page.keyboard.type('espresso')
    await sleep(800)
    assert(await page.evaluate(() => document.activeElement?.tagName === 'INPUT' && document.activeElement.value === 'espresso'), 'focus left the note')
  }))

// ---------- light faint text, Guide headings, read-only stars, the segmented focus ring (wave-2 fixes) ----------

await test('A2 light: faint text (--fg-3) is at 4.5:1 or more on --bg, --surface and --surface-2; dark is unchanged', () =>
  withDevice({}, async ({ page }) => {
    await open(page, 'now')
    const r = await page.evaluate(() => {
      // A token as the browser resolves it (the build may write #FFFFFF as #fff), on an element of its own.
      const rgb = (token) => {
        const probe = document.body.appendChild(document.createElement('i'))
        probe.style.transition = 'none'
        probe.style.color = `var(${token})`
        const c = /rgba?\(([^)]+)\)/.exec(getComputedStyle(probe).color)[1].split(/[\s,/]+/).slice(0, 3).map(Number)
        probe.remove()
        return c
      }
      const lum = c => c.map(v => v / 255).map(s => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4)).reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0)
      const fg = rgb('--fg-3')
      return Object.fromEntries(['--bg', '--surface', '--surface-2'].map((k) => {
        const [x, y] = [lum(fg), lum(rgb(k))].sort((p, q) => q - p)
        return [k, Math.round((x + 0.05) / (y + 0.05) * 100) / 100]
      }))
    })
    assert(Object.values(r).every(x => x >= 4.5), JSON.stringify(r))
    const css = readFileSync(join(ROOT, 'app/assets/css/main.css'), 'utf8')
    assert((css.match(/--fg-3: #8D959B/g) ?? []).length === 2, 'the dark --fg-3 changed')
  }))

await test('Guide: "Nights & people" shows its Markdown headings as headings, with no literal "###"', () =>
  withDevice({}, async ({ page }) => {
    await open(page, 'guide')
    await page.locator('.sh', { hasText: 'Nights' }).first().click()
    const blocks = page.locator('.sec.open .blocks')
    await blocks.waitFor()
    const literal = await blocks.evaluate(el => [...el.querySelectorAll('p')].filter(p => /^#{1,4} /.test(p.textContent.trim())).length)
    assert(literal === 0, `${literal} paragraphs start with #`)
    const heads = await blocks.locator('h3').allInnerTexts()
    for (const h of ['How a Roman night works', 'Clubs on your nights']) assert(heads.map(flat).includes(h), `no heading "${h}": ${heads}`)
    assert(!(await page.locator('.sec.open').innerText()).includes('###'), 'a "###" is still shown')
  }))

for (const dark of [false, true]) {
  await test(`Read-only stars on Progress: role img with "4 out of 5", unlit stars outlined at 3:1 or more (${dark ? 'dark' : 'light'})`, () =>
    withDevice({ dark }, async ({ page }) => {
      await open(page, 'progress')
      const four = page.locator('.stars.ro[aria-label="4 out of 5"]').first()
      await four.waitFor()
      assert(await four.getAttribute('role') === 'img', 'no role img')
      const got = await four.evaluate((el) => {
        const parse = c => (/rgba?\(([^)]+)\)/.exec(c)?.[1].split(/[\s,/]+/).filter(Boolean).map(Number)) ?? null
        const lum = c => c.slice(0, 3).map(v => v / 255).map(s => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4)).reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0)
        const off = el.querySelector('svg:not(.on)')
        const cs = getComputedStyle(off)
        let bg = null
        for (let p = el; p && !bg; p = p.parentElement) {
          const c = parse(getComputedStyle(p).backgroundColor)
          if (c && (c[3] ?? 1) >= 1) bg = c
        }
        const s = parse(cs.stroke)
        const [x, y] = [lum(s), lum(bg)].sort((p, q) => q - p)
        return { width: Number.parseFloat(cs.strokeWidth), ratio: (x + 0.05) / (y + 0.05) }
      })
      assert(got.width > 0 && got.ratio >= 3, JSON.stringify(got))
    }))
}

await test('The segmented controls\' focus ring fits inside their padding (not cut by their overflow)', () =>
  withDevice({}, async ({ page }) => {
    await open(page, 'progress')
    let found = null
    for (let i = 0; i < 40 && !found; i++) {
      await page.keyboard.press('Tab')
      found = await page.evaluate(() => {
        const a = document.activeElement
        if (!a?.matches('.seg button')) return null
        const b = getComputedStyle(a)
        const seg = getComputedStyle(a.closest('.seg'))
        return { visible: a.matches(':focus-visible'), offset: Number.parseFloat(b.outlineOffset), width: Number.parseFloat(b.outlineWidth), pad: Number.parseFloat(seg.paddingTop) }
      })
    }
    assert(found?.visible, `no segmented button took keyboard focus: ${JSON.stringify(found)}`)
    assert(found.offset + found.width <= found.pad, JSON.stringify(found))
  }))

// ---------- O1: the generated site's map offline ----------

if (BUILD) {
  for (const dark of [false, true]) {
    await test(`O1 Settings → Map → OpenStreetMap, /map?day=fri online, then offline: tiles from the cache, over 5 KB, none from CARTO${dark ? ', dimmed in dark' : ''}`, () =>
      // The real clock: Leaflet fades tiles in by the clock, and a frozen one never finishes the fade.
      withDevice({ at: null, sw: true, dark }, async ({ ctx, page, errors }) => {
        const asked = []
        ctx.on('request', r => asked.push(r.url()))
        await open(page, '/settings')
        await page.getByRole('button', { name: 'OpenStreetMap' }).click()
        await until(() => page.evaluate(() => localStorage.getItem('travel:map:provider') === 'osm'), 'OpenStreetMap was not chosen')
        await open(page, 'map?day=fri')
        await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 20000 })
        // Now the service worker sees the tile requests: look around once online.
        await page.reload({ waitUntil: 'domcontentloaded' })
        await ready(page)
        await until(() => page.evaluate(async () => (await (await caches.open('map-tiles-v2')).keys()).length >= 4), 'tiles in map-tiles-v2', 20000)
        await ctx.setOffline(true)
        const tiles = []
        page.on('response', (r) => {
          if (r.url().includes('tile.openstreetmap.org')) tiles.push(r)
        })
        await page.reload({ waitUntil: 'domcontentloaded' })
        await ready(page)
        await until(() => page.evaluate(() => [...document.querySelectorAll('img.leaflet-tile')].filter(i => i.complete && i.naturalWidth > 0).length >= 4), 'tiles shown offline', 15000)
        const sizes = (await Promise.all(tiles.map(r => r.body().then(b => b.length, () => -1)))).filter(n => n >= 0)
        const cached = await page.evaluate(async () => {
          const c = await caches.open('map-tiles-v2')
          return Promise.all((await c.keys()).map(async k => (await (await c.match(k)).blob()).size))
        })
        const big = [...sizes, ...cached].filter(n => n > 5000)
        assert(big.length >= 4, `tile sizes offline ${sizes.join(', ')}; cached ${cached.join(', ')}`)
        assert(!asked.some(u => u.includes('basemaps.cartocdn.com')), 'CARTO was asked')
        const filter = await page.evaluate(() => getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter)
        assert(dark ? filter !== 'none' : filter === 'none', `tile pane filter: ${filter}`)
        assert(!errors.length, errors.join(' / '))
      }))
  }
}

// ---------- Q1: no new network hosts ----------

// ---------- fixes from the final review ----------

await test('A3 with a sheet open, Tab goes on from the sheet to a toast\'s buttons (Log €7, Undo), then back into the sheet', () =>
  withDevice({}, async ({ page, errors }) => {
    await open(page, 'plan?day=fri&stop=pantheon')
    const sh = page.getByRole('dialog', { name: 'Pantheon' })
    await sh.waitFor()
    await sh.locator('.status button', { hasText: 'Done' }).click()
    await toastWith(page, 'Done: Pantheon')
    const focused = () => page.evaluate(() => {
      const a = document.activeElement
      return a?.closest('.toasts') ? `toast:${a.textContent.trim()}` : a?.closest('[role="dialog"]') ? 'sheet' : `page:${a?.tagName}`
    })
    let at = ''
    for (let i = 0; i < 80 && !at.startsWith('toast:'); i++) {
      await page.keyboard.press('Tab')
      at = await focused()
      assert(at === 'sheet' || at.startsWith('toast:'), `Tab went to ${at}`)
    }
    assert(at === 'toast:Log €7', `Tab reached ${at}`)
    await page.keyboard.press('Tab')
    assert(await focused() === 'toast:Undo', `then ${await focused()}`)
    await page.keyboard.press('Tab')
    assert(await focused() === 'sheet', `after the toasts, Tab went to ${await focused()}`)
    await page.keyboard.press('Shift+Tab')
    assert(await focused() === 'toast:Undo', `Shift+Tab from the sheet's first control went to ${await focused()}`)
    await page.keyboard.press('Enter')
    await until(async () => !(await readProgress(page))?.stops?.pantheon, 'Undo from the keyboard did not untick the Pantheon')
    assert(!errors.length, errors.join(' / '))
  }))

await test('Q1 the network log shows no hosts beyond the app, Google Maps (as before) and tile.openstreetmap.org, and none from CARTO', () => {
  const app = new URL(BASE).host
  // Before this refresh the app asked Google (Map Tiles and Routes) and, once signed in, Firebase; the only new
  // host is OpenStreetMap's tile server (spec D19), which replaces CARTO's.
  const before = new Set(['tile.googleapis.com', 'routes.googleapis.com', 'maps.googleapis.com', 'identitytoolkit.googleapis.com', 'securetoken.googleapis.com', 'firestore.googleapis.com', 'firebasestorage.googleapis.com', 'www.googleapis.com', 'apis.google.com', 'travela-emre.firebaseapp.com'])
  const extra = [...hosts].filter(([h]) => h !== app && !before.has(h) && h !== 'tile.openstreetmap.org')
  assert(hosts.size > 0, 'no requests were logged')
  assert(!extra.length, `new hosts: ${extra.map(([h, u]) => `${h} (${u})`).join(', ')}`)
  assert(![...hosts.keys()].some(h => h.endsWith('basemaps.cartocdn.com')), 'CARTO was asked')
})

// ---------- A4: no em dash ----------

await test('A4 no em dash (U+2014) in this file or the how-to note', () => {
  const EM_DASH = String.fromCharCode(8212)
  const files = ['tests/e2e/ui.e2e.mjs', 'content/notes/2026-09-30-how-to-use-travels.md']
  const hits = files.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(EM_DASH))
  assert(!hits.length, `em dash in ${hits.join(', ')}`)
})

await browser.close()
await srv?.close()
