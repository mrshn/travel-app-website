// Shared helpers for the phone-sized browser checks (tests/e2e/<area>.e2e.mjs), on Playwright Chromium.
//
//   import { BASE, TRIP, check, live, loadTrip, phone, seedS } from './lib.mjs'
//   const browser = await chromium.launch()
//   const { page } = await phone(browser, { progress: seedS(loadTrip()) })
//   await live(page, '2026-10-09T16:40')          // before the first navigation
//   await page.goto(`${BASE}trips/${TRIP}/costs`)
//   await check('Today reads €37.00', async () => { ... })
//
// Checks run against TRAVELS_URL (default: the dev server at http://127.0.0.1:3000/). The final gate serves
// the generated site with serveBuild() and points TRAVELS_URL at it.
//
// Run on its own it is a smoke test: Seed S at live Fri 9 Oct 16:40, every trip route at 390 and 320 px
// with no page error, on full loads and on client-side navigation:
//   node tests/e2e/lib.mjs            (against TRAVELS_URL or the dev server)
//   node tests/e2e/lib.mjs --build    (serves .output/public on port 4173 and checks that)
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))

export const TRIP = 'rome-2026-10'

/** Where the app runs (always ends with "/"). useBase() changes it, for example to a served build. */
export let BASE = withSlash(process.env.TRAVELS_URL || 'http://127.0.0.1:3000/')

function withSlash(url) {
  return url.endsWith('/') ? url : `${url}/`
}

/** Points the helpers (preview, the smoke run) at another copy of the app. */
export function useBase(url) {
  BASE = withSlash(url)
  return BASE
}

/** The Rome trip as seeded (app/data/rome.ts, read as JSON; the file must not be edited). */
export function loadTrip() {
  const src = readFileSync(join(ROOT, 'app/data/rome.ts'), 'utf8')
  return JSON.parse(src.slice(src.indexOf('{', src.indexOf('romeTrip')), src.lastIndexOf('}') + 1))
}

/**
 * The instant of a wall-clock time in Rome, as ISO. Takes "2026-10-09T16:40" (Rome time) or anything
 * Date understands with its own zone ("2026-10-09T16:40:00+02:00", "…Z", a Date, milliseconds).
 */
export function romeTime(at) {
  if (at instanceof Date || typeof at === 'number') return new Date(at).toISOString()
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(at).trim())
  if (!m) {
    const t = Date.parse(at)
    if (Number.isNaN(t)) throw new Error(`Not a time: ${at}`)
    return new Date(t).toISOString()
  }
  const [y, mo, d, h = '0', mi = '0', s = '0'] = m.slice(1)
  const wall = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)
  // Rome's offset at that moment, found by reading the guess back in Rome time (twice, for the DST edges).
  let t = wall
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(t)).map(p => [p.type, p.value]))
    const seen = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
    t -= seen - wall
  }
  return new Date(t).toISOString()
}

/**
 * Seed S of the spec (section 9), the state of the screenshots: every Thursday stop done at Thu 23:30;
 * Friday's stops that start before 16:00 done at 09:10, 10:10 and so on, except the 4th (St Peter's
 * Basilica), skipped; ratings 5, 4 and 5 on the first three Friday stops, with the old "spent" 25 and 12 on
 * the first two; Thursday's day note with a journal line and extraSpent 9; the first four bookings and the
 * first 12 packing items ticked. No costs or stamps of the new kind.
 */
export function seedS(trip = loadTrip()) {
  const p = { stops: {}, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {}, expenses: {}, stamps: {} }
  const [thu, fri] = trip.days
  for (const s of thu.stops) p.stops[s.id] = { status: 'done', at: romeTime('2026-10-08T23:30') }
  const early = fri.stops
    .map((s, i) => [s, i])
    .sort((a, b) => a[0].start - b[0].start || a[1] - b[1])
    .map(x => x[0])
    .filter(s => s.start < 16 * 60)
  early.forEach((s, i) => {
    p.stops[s.id] = { status: i === 3 ? 'skipped' : 'done', at: romeTime(`2026-10-09T${String(9 + i).padStart(2, '0')}:10`) }
  })
  const ratings = [5, 4, 5]
  const spent = [25, 12]
  early.slice(0, 3).forEach((s, i) => {
    p.feedback[s.id] = { rating: ratings[i], ...(spent[i] ? { spent: spent[i] } : {}), updatedAt: romeTime('2026-10-09T15:00') }
  })
  p.dayNotes.thu = { note: 'Landed late, pizza by the hostel.', extraSpent: 9, updatedAt: romeTime('2026-10-08T23:59') }
  for (const b of trip.bookings.slice(0, 4)) p.bookings[b.id] = true
  for (const x of trip.packing.slice(0, 12)) p.packing[x] = true
  return p
}

/**
 * A phone: 390 x 844 (or width/height), DPR 2, touch (so `pointer: coarse` applies), Europe/Rome, light or
 * dark. `progress` (for TRIP) is put in localStorage before any script runs, unless the page already has
 * saved progress (so a reload keeps what the app wrote). Service workers are blocked unless `sw: true`.
 * Other options go to browser.newContext() (e.g. reducedMotion: 'reduce').
 * Returns { ctx, page, errors, consoleErrors }; `errors` collects page errors (uncaught exceptions).
 */
export async function phone(browser, opts = {}) {
  const { dark, width = 390, height = 844, progress, sw, ...rest } = opts
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    timezoneId: 'Europe/Rome',
    colorScheme: dark ? 'dark' : 'light',
    serviceWorkers: sw ? 'allow' : 'block',
    ...rest,
  })
  if (progress) {
    await ctx.addInitScript(([p, id]) => {
      try {
        if (!localStorage.getItem('travel:progress:v1')) localStorage.setItem('travel:progress:v1', JSON.stringify({ [id]: p }))
      }
      catch { /* storage refused */ }
    }, [progress, TRIP])
  }
  const page = await ctx.newPage()
  const errors = []
  const consoleErrors = []
  page.on('pageerror', e => errors.push(String(e?.message ?? e)))
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300))
  })
  return { ctx, page, errors, consoleErrors }
}

/** Live at a moment: the page's clock shows it from the first script on. Call before the first navigation. */
export async function live(page, at) {
  await page.clock.setFixedTime(new Date(romeTime(at)))
}

/** Opens a preview of a moment (trip time, "2026-10-09T16:40") on Now; move on with go() to keep it. */
export async function preview(page, at) {
  await page.goto(`${BASE}trips/${TRIP}/now?at=${encodeURIComponent(at)}`, { waitUntil: 'domcontentloaded' })
  await ready(page)
}

/** Waits for a page of the app to be there and settled (the trip shell, or any app page off the trip). */
export async function ready(page, timeout = 20000) {
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt')
    return !!root && root.children.length > 0 && !!document.querySelector('.shell, .page, main, .empty')
  }, null, { timeout, polling: 100 })
  await settle(page)
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {})
  await page.waitForTimeout(350)
}

/**
 * A path in the app: "/settings" is app-level (from the root), "plan?day=fri" is a section of the trip.
 * Returns the path with the app's base, e.g. "/trips/rome-2026-10/plan?day=fri".
 */
export function tripPath(path) {
  const rel = path.startsWith('/') ? path.slice(1) : `trips/${TRIP}/${path}`
  const u = new URL(rel, BASE)
  return `${u.pathname}${u.search}${u.hash}`
}

/**
 * Client-side navigation, as a tap on a link does: history.pushState and a popstate event, so the page
 * keeps its state (a preview included). `path` as in tripPath().
 */
export async function go(page, path) {
  const target = tripPath(path)
  await page.evaluate(async (to) => {
    const router = document.querySelector('#__nuxt')?.__vue_app__?.config?.globalProperties?.$router
    const done = router
      ? new Promise((res) => {
          const off = router.afterEach(() => {
            off()
            res()
          })
          setTimeout(res, 5000)
        })
      : null
    history.pushState(null, '', to)
    dispatchEvent(new PopStateEvent('popstate', { state: null }))
    if (done) await done
  }, target)
  await page.waitForFunction(to => `${location.pathname}${location.search}${location.hash}` === to, target, { timeout: 5000 }).catch(() => {})
  await settle(page)
}

/** This trip's saved progress as the page has it (null when there is none). */
export async function readProgress(page) {
  return page.evaluate((id) => {
    try {
      return JSON.parse(localStorage.getItem('travel:progress:v1') || '{}')[id] ?? null
    }
    catch {
      return null
    }
  }, TRIP)
}

/** True when the page doesn't scroll sideways (the document is no wider than the window). */
export async function noSideScroll(page) {
  const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }))
  return sw <= w
}

/** How wide the page is against the window, for a message when noSideScroll() fails. */
export async function sideScroll(page) {
  return page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, width: window.innerWidth }))
}

/**
 * Buttons, links and [role=button] whose hit box is under 44 x 44 px: the element's own box joined with
 * its ::after (the touch area of main.css), cut to what the boxes around it let through. An ancestor with
 * overflow hidden or clip (or contain: paint) cuts to its padding box, and the element's own overflow cuts its
 * ::after. A scroller cuts only what no scrolling brings into view: what lies before the start of its content,
 * and any part larger than its window. Positioned elements are cut only by the ancestors that contain them.
 * A control in view is also tapped (elementFromPoint) from its middle out to each edge, and a box painted over
 * it cuts it too, except the page's fixed or sticky bars and another control; so scroll to the part of the page
 * to check. Hidden elements, elements cut away entirely, 1 px screen-reader text and inline text links are left
 * out. Each item: { tag, text, label, cls, w, h, clip }; clip names the box that cut the hit area ("under <box>"
 * for one painted over it), or is ''.
 */
export async function smallTargets(page, min = 44) {
  return page.evaluate((MIN) => {
    const styles = new Map()
    const css = (el) => {
      if (!styles.has(el)) styles.set(el, getComputedStyle(el))
      return styles.get(el)
    }
    const px = v => Number.parseFloat(v) || 0
    const name = el => [el.tagName.toLowerCase(), ...(typeof el.className === 'string' ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3) : [])].join('.')
    // Holds position: fixed descendants (and absolute ones, like any positioned element).
    const holdsFixed = s => s.transform !== 'none' || s.perspective !== 'none' || s.filter !== 'none'
      || (!!s.backdropFilter && s.backdropFilter !== 'none') || /\b(?:paint|layout|strict|content)\b/.test(s.contain)
      || /\b(?:transform|perspective|filter)\b/.test(s.willChange)
    // One axis [a, b] of a box inside [lo, hi], the padding box of an element with that axis's overflow `mode`,
    // scrolled by `scroll`. A scroller moves what it lets through into its window, for the boxes further out;
    // `moved` then says the box is no longer where the control is on screen.
    let moved = false
    function cutAxis(a, b, lo, hi, scroll, mode) {
      if (mode === 'visible') return [a, b]
      if (mode !== 'auto' && mode !== 'scroll') return [Math.max(a, lo), Math.min(b, hi)]
      const from = Math.max(a, lo - scroll)
      const to = Math.min(b, from + (hi - lo))
      const shift = from < lo ? lo - from : to > hi ? hi - to : 0
      if (Math.abs(shift) > 0.01) moved = true
      return [from + shift, to + shift]
    }
    // A box [left, top, right, bottom] as the element `p` lets it through (overflow does nothing on an inline box).
    function cut(box, p) {
      const s = css(p)
      if (s.display === 'inline' || !(p instanceof HTMLElement || p instanceof SVGSVGElement)) return box
      const paint = /\b(?:paint|strict|content)\b/.test(s.contain)
      const modeX = s.overflowX === 'visible' && paint ? 'clip' : s.overflowX
      const modeY = s.overflowY === 'visible' && paint ? 'clip' : s.overflowY
      if (modeX === 'visible' && modeY === 'visible') return box
      const r = p.getBoundingClientRect()
      const sx = p.offsetWidth ? r.width / p.offsetWidth : 1
      const sy = p.offsetHeight ? r.height / p.offsetHeight : 1
      const x = r.left + p.clientLeft * sx
      const y = r.top + p.clientTop * sy
      const [left, right] = cutAxis(box[0], box[2], x, x + p.clientWidth * sx, p.scrollLeft * sx, modeX)
      const [top, bottom] = cutAxis(box[1], box[3], y, y + p.clientHeight * sy, p.scrollTop * sy, modeY)
      return [left, top, Math.max(left, right), Math.max(top, bottom)]
    }
    const size = box => [box[2] - box[0], box[3] - box[1]]
    const smaller = (a, b) => size(a)[0] < size(b)[0] - 0.25 || size(a)[1] < size(b)[1] - 0.25
    const inView = (x, y) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight
    const hits = (el, x, y) => {
      const at = document.elementFromPoint(x, y)
      return !!at && (at === el || el.contains(at))
    }
    // Inside a fixed or sticky bar of the page (a header, the tab bar, a toast) that doesn't hold the control.
    function onBar(node, el) {
      for (let p = node; p && p !== document.body; p = p.parentElement) {
        const pos = css(p).position
        if (pos === 'fixed' || pos === 'sticky') return !p.contains(el)
      }
      return false
    }

    const out = []
    for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
      const cs = css(el)
      if (cs.display === 'none' || cs.visibility === 'hidden') continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      if (el.tagName === 'A' && cs.display === 'inline') continue
      let box = [r.left, r.top, r.right, r.bottom]
      let clip = ''
      moved = false
      const a = getComputedStyle(el, '::after')
      // The ::after is placed against the element only when the element contains it (it is positioned).
      const contains = cs.position !== 'static' || holdsFixed(cs)
      if (contains && a.content && a.content !== 'none' && a.content !== 'normal' && a.display !== 'none' && a.position === 'absolute') {
        const m = new DOMMatrixReadOnly(a.transform === 'none' ? undefined : a.transform)
        const x0 = r.left + px(cs.borderLeftWidth) + px(a.left) + m.e
        const y0 = r.top + px(cs.borderTopWidth) + px(a.top) + m.f
        const claimed = [x0, y0, x0 + px(a.width), y0 + px(a.height)]
        const after = cut(claimed, el)
        if (smaller(after, claimed)) clip = name(el)
        box = [Math.min(box[0], after[0]), Math.min(box[1], after[1]), Math.max(box[2], after[2]), Math.max(box[3], after[3])]
      }
      // The ancestors that clip it: all of them for a box in the flow, only its containing blocks and their
      // ancestors for an absolute or fixed one.
      let pos = cs.position
      for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        const s = css(p)
        if (s.display === 'contents') continue
        if (pos === 'fixed' && !holdsFixed(s)) continue
        if (pos === 'absolute' && s.position === 'static' && !holdsFixed(s)) continue
        const next = cut(box, p)
        if (!clip && smaller(next, box)) clip = name(p)
        box = next
        pos = s.position
      }
      // In view, walk out from the middle of the control to each edge of that box, tapping as it goes
      // (elementFromPoint): a box painted over the way (a later row, a drag strip) cuts it where it starts. Not
      // counted: the page's fixed or sticky bars (they move with scrolling) and another control (spec 7 lets the
      // 44 px areas of neighbours 6 to 8 px apart overlap). A control whose middle is covered stays as it is.
      const mx = (r.left + r.right) / 2
      const my = (r.top + r.bottom) / 2
      if (!moved && inView(mx, my) && hits(el, mx, my)) {
        for (const [i, dx, dy] of [[1, 0, -1], [3, 0, 1], [0, -1, 0], [2, 1, 0]]) {
          const span = Math.abs(dx ? box[i] - mx : box[i] - my)
          const x = d => mx + dx * d
          const y = d => my + dy * d
          let d = 1
          while (d < span && inView(x(d), y(d)) && hits(el, x(d), y(d))) d += 1
          if (d >= span || !inView(x(d), y(d))) continue
          let e = d - 0.75
          while (e < d && hits(el, x(e), y(e))) e += 0.25
          const over = document.elementFromPoint(x(e), y(e))
          const other = over?.closest('button, a[href], [role="button"]')
          if (!over || (other && other !== el && !other.contains(el)) || onBar(over, el)) continue
          box[i] = dx ? x(e) : y(e)
          if (!clip) clip = `under ${name(over)}`
        }
      }
      const [w, h] = size(box)
      if (w <= 0 || h <= 0) continue
      if (w < MIN - 0.5 || h < MIN - 0.5) {
        out.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
          label: el.getAttribute('aria-label') || '',
          cls: typeof el.className === 'string' ? el.className : '',
          w: Math.round(w * 10) / 10,
          h: Math.round(h * 10) / 10,
          clip,
        })
      }
    }
    return out
  }, min)
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.map': 'application/json',
}

/**
 * Serves the generated site (.output/public, from `npm run generate`) on 127.0.0.1, with the SPA fallback
 * to index.html, like tests/e2e/cloud.e2e.mjs. Resolves to { url, close() }.
 */
export async function serveBuild(port = 4173, dir = join(ROOT, '.output/public')) {
  const root = resolve(dir)
  const index = join(root, 'index.html')
  const server = createServer(async (req, res) => {
    let file = index
    try {
      const path = normalize(decodeURIComponent(new URL(req.url, 'http://x/').pathname))
      const want = resolve(join(root, path))
      if (want === root || want.startsWith(root + sep)) {
        file = (await stat(want).catch(() => null))?.isDirectory() ? join(want, 'index.html') : want
      }
      const body = await readFile(file).catch(() => null)
      if (body) {
        res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
        res.end(body)
        return
      }
      res.writeHead(200, { 'content-type': TYPES['.html'] })
      res.end(await readFile(index))
    }
    catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain' })
      res.end(String(e))
    }
  })
  await new Promise((ok, fail) => {
    server.once('error', fail)
    server.listen(port, '127.0.0.1', ok)
  })
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise(ok => server.close(() => ok())),
  }
}

const results = []
let reporting = false

/**
 * Runs one check and records it: prints "ok" or "FAIL" with the reason, never throws. When the script
 * ends, a summary is printed and the exit code is 1 if any check failed. Resolves to true or false.
 */
export async function check(name, fn) {
  if (!reporting) {
    reporting = true
    process.on('exit', () => {
      const failed = results.filter(r => !r.ok)
      console.log(`\n${results.length - failed.length} of ${results.length} checks passed`)
      for (const r of failed) console.log(`  FAIL ${r.name}: ${r.error}`)
      if (failed.length) process.exitCode = 1
    })
  }
  const t = Date.now()
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`ok   ${name} (${Date.now() - t} ms)`)
    return true
  }
  catch (e) {
    const error = String(e?.message ?? e).split('\n').slice(0, 4).join(' | ')
    results.push({ name, ok: false, error })
    console.log(`FAIL ${name}: ${error}`)
    return false
  }
}

/** Throws with `message` unless `cond` holds. */
export function assert(cond, message = 'assertion failed') {
  if (!cond) throw new Error(message)
}

/** The routes of a trip. */
export const TRIP_ROUTES = ['now', 'plan', 'map', 'places', 'progress', 'more', 'bookings', 'packing', 'guide', 'notes', 'sos', 'settings']

// ---------- smoke run ----------
const isMain = !!process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isMain) {
  const srv = process.argv.includes('--build') ? await serveBuild(4173) : null
  if (srv) useBase(srv.url)
  console.log(`Smoke run against ${BASE}: Seed S, live Fri 9 Oct 16:40`)
  const trip = loadTrip()
  const seed = seedS(trip)
  const browser = await chromium.launch()
  try {
    for (const width of [390, 320]) {
      const { ctx, page, errors } = await phone(browser, { width, progress: seed })
      await live(page, '2026-10-09T16:40')
      const wide = []
      for (const r of TRIP_ROUTES) {
        await check(`${r} loads at ${width} px`, async () => {
          errors.length = 0
          await page.goto(`${BASE}trips/${TRIP}/${r}`, { waitUntil: 'domcontentloaded' })
          await ready(page)
          assert(await page.locator(`.shell.sec-${r}`).count(), 'no trip shell for this section (trip not found?)')
          assert(!errors.length, `page error: ${errors.join(' / ')}`)
          if (!(await noSideScroll(page))) wide.push(`${r} (${(await sideScroll(page)).scrollWidth} px)`)
        })
      }
      await check(`Seed S is in place at ${width} px, and the clock is live on Fri 16:40`, async () => {
        const p = await readProgress(page)
        assert(p && Object.keys(p.stops ?? {}).length === 11 + 6, `stops ticked: ${Object.keys(p?.stops ?? {}).length}`)
        await page.goto(`${BASE}trips/${TRIP}/now`, { waitUntil: 'domcontentloaded' })
        await ready(page)
        const text = await page.locator('body').innerText()
        assert(text.includes('16:40'), 'Now does not show 16:40')
        assert(!/NaN/.test(text), 'Now shows NaN')
      })
      for (const r of TRIP_ROUTES) {
        await check(`${r} opens by client-side navigation at ${width} px`, async () => {
          errors.length = 0
          await go(page, r)
          assert(new URL(page.url()).pathname.endsWith(`/trips/${TRIP}/${r}`), `at ${page.url()}`)
          // The shell's section class follows the router, so this proves the app moved, not just the URL.
          assert(await page.locator(`.shell.sec-${r}`).count(), 'the app did not move to this section')
          assert(!errors.length, `page error: ${errors.join(' / ')}`)
        })
      }
      if (wide.length) console.log(`note: sideways scroll at ${width} px on ${wide.join(', ')}`)
      await ctx.close()
    }
  }
  finally {
    await browser.close()
    await srv?.close()
  }
}
