// Browser checks for package G: the trip shell (tabs, lit tab, header line 2), the More hub, the Badges page,
// the game's celebrations, Progress and trip settings (spec 9.1, 9.4, 4.10 and 9.8 for these screens).
//
//   node tests/e2e/game.e2e.mjs                 (against TRAVELS_URL, or the dev server on 127.0.0.1:3000)
//   node tests/e2e/game.e2e.mjs --shots=<dir>   (also saves phone screenshots of every screen and state)
//   node tests/e2e/game.e2e.mjs --only=G3       (only the checks whose names hold that text)
//
// Hand stamps are written the way another tab or a synced device writes them (the progress in localStorage
// plus a storage event), so the celebrations are checked without depending on the place sheet's buttons.
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { BASE, TRIP, assert, check, go, live, loadTrip, noSideScroll, phone, readProgress, ready, romeTime, seedS, sideScroll, smallTargets, tripPath } from './lib.mjs'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const SHOTS = (process.argv.find(a => a.startsWith('--shots=')) ?? '').slice(8)
if (SHOTS) mkdirSync(SHOTS, { recursive: true })
const ONLY = (process.argv.find(a => a.startsWith('--only=')) ?? '').slice(7)
/** check(), unless --only names other checks. */
const run = (name, fn) => (!ONLY || name.includes(ONLY) ? check(name, fn) : Promise.resolve(true))

const trip = loadTrip()
const SEED = seedS(trip)
const FRI = '2026-10-09T16:40'
const SEEN_KEY = 'travel:game:seen:v1'
const GOLDEN = 'top-of-the-spanish-steps-for-sunset-18-38'
const SPANISH_STEPS = 'Top of the Spanish Steps for sunset (18:38)'
const CHURCHES = ['sight-st-peter-s-basilica', 'sight-santa-maria-maggiore', 'sight-st-john-lateran', 'sight-tempietto-del-bramante']
/** Five places whose stamps finish no set and earn no badge: with Seed S's three, the fifth makes eight. */
const FIVE = ['sight-galleria-doria-pamphilj', 'food-trapizzino', 'photo-momo-staircase', 'sight-domus-aurea', 'food-giolitti']

// ---------- helpers ----------

/** Records every toast that shows (text, tone, buttons), so a count survives toasts timing out. */
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

/** A phone with Seed S (or `progress`), live at `at`, toasts logged. */
async function device(browser, { at = FRI, progress = SEED, ...opts } = {}) {
  const d = await phone(browser, { progress, ...opts })
  await d.ctx.addInitScript(logToasts)
  if (at) await live(d.page, at)
  return d
}

/** A full load of a trip section ("badges", "progress?view=left"). */
async function open(page, path) {
  await page.goto(new URL(tripPath(path), BASE).href, { waitUntil: 'domcontentloaded' })
  await ready(page)
}

const toastLog = page => page.evaluate(() => window.__toastLog ?? [])
const celebrations = async page => (await toastLog(page)).filter(t => t.gold)
const text = (page, sel) => page.locator(sel).first().evaluate(el => el.textContent.replace(/\s+/g, ' ').trim())

/** Stamps places by hand as another tab or a synced device would: the saved progress, then a storage event. */
async function stampByHand(page, ids, at = romeTime('2026-10-09T16:45')) {
  await page.evaluate(([ids, at, id]) => {
    const key = 'travel:progress:v1'
    const oldValue = localStorage.getItem(key)
    const all = JSON.parse(oldValue || '{}')
    const p = all[id] ?? { stops: {}, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {}, expenses: {}, stamps: {} }
    p.stamps ??= {}
    for (const placeId of ids) p.stamps[placeId] = { on: true, at, updatedAt: at }
    all[id] = p
    const newValue = JSON.stringify(all)
    localStorage.setItem(key, newValue)
    window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue, storageArea: localStorage }))
  }, [ids, at, TRIP])
  await page.waitForTimeout(500)
}

const seenOf = page => page.evaluate(([k, id]) => {
  try {
    return JSON.parse(localStorage.getItem(k) || '{}')[id] ?? null
  }
  catch {
    return null
  }
}, [SEEN_KEY, TRIP])

async function shot(page, name) {
  if (!SHOTS) return
  await page.screenshot({ path: join(SHOTS, `${name}.png`) })
}

/** Scrolls through the page and collects controls under 44 x 44 px (lib's smallTargets) at every stop. */
async function allSmallTargets(page) {
  const found = new Map()
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const step = await page.evaluate(() => Math.round(window.innerHeight * 0.7))
  for (let y = 0; y <= height; y += step) {
    await page.evaluate(top => window.scrollTo(0, top), y)
    await page.waitForTimeout(120)
    for (const t of await smallTargets(page)) found.set(`${t.tag}.${t.cls}|${t.text}|${t.label}`, t)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  return [...found.values()]
}

/**
 * Text under 4.5:1 (3:1 for large text) against what is painted behind it, and badge seals under 3:1.
 * Colours are composited over the solid backgrounds behind them; text on pictures is left out.
 */
function contrastReport() {
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
  const out = []
  const scope = document.querySelector('.shell') ?? document.body
  for (const el of scope.querySelectorAll('*')) {
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
    if (!own || el.closest('.art-frame, svg, .tabbar, .toasts')) continue
    const s = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    if (s.visibility !== 'visible' || s.display === 'none' || r.width < 1 || r.height < 1) continue
    if (el.closest('.sr-only')) continue
    const bg = bgOf(el)
    const fg = parse(s.color)
    if (!bg || !fg) continue
    const shown = over([fg[0], fg[1], fg[2], fg[3] * opacityOf(el)], bg)
    const size = Number.parseFloat(s.fontSize)
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700)
    const need = large ? 3 : 4.5
    const got = ratio(shown, bg)
    if (got < need) out.push({ what: 'text', text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40), ratio: Math.round(got * 100) / 100, need })
  }
  for (const seal of document.querySelectorAll('svg.seal')) {
    const bg = bgOf(seal.parentElement)
    if (!bg) continue
    const parts = seal.classList.contains('on') ? seal.querySelectorAll('.leaf') : seal.querySelectorAll('.icon')
    for (const part of [...parts].slice(0, 1)) {
      const cs = getComputedStyle(part)
      const c = parse(part.classList.contains('leaf') ? cs.fill : cs.color)
      if (!c) continue
      const got = ratio(over(c, bg), bg)
      if (got < 3) out.push({ what: 'seal', text: seal.getAttribute('aria-label'), ratio: Math.round(got * 100) / 100, need: 3 })
    }
  }
  return out
}

function brief(list) {
  return JSON.stringify(list.slice(0, 6))
}

/**
 * Items of the rows matching `sel` (buttons, badges, stars) drawn narrower than they are, because a long title
 * beside them made the row shrink them too. Each item is measured again with shrinking off. The title (.grow)
 * is the one meant to give way. (A 44 px touch area can hide a squeezed button from smallTargets.)
 */
function squeezedItems(sel) {
  const out = []
  for (const row of document.querySelectorAll(sel)) {
    for (const el of row.children) {
      if (el.matches('.grow') || getComputedStyle(el).display === 'none') continue
      const drawn = el.getBoundingClientRect().width
      const before = el.style.flexShrink
      el.style.flexShrink = '0'
      const natural = el.getBoundingClientRect().width
      el.style.flexShrink = before
      if (natural - drawn > 1) {
        out.push({ row: row.textContent.replace(/\s+/g, ' ').trim().slice(0, 30), item: String(el.className?.baseVal ?? el.className), drawn: Math.round(drawn), natural: Math.round(natural) })
      }
    }
  }
  return out
}

// ---------- the checks ----------

const browser = await chromium.launch()
try {
  // N1: the bar has the five jobs; at 1280 px the same five are top tabs.
  await run('N1 the bottom bar has exactly Now, Plan, Places, Costs and More, each at least 44 x 44', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'now')
    const tabs = page.locator('nav.tabbar a')
    const labels = await tabs.allTextContents()
    assert(JSON.stringify(labels.map(s => s.trim())) === JSON.stringify(['Now', 'Plan', 'Places', 'Costs', 'More']), `tabs: ${labels}`)
    for (let i = 0; i < 5; i++) {
      const box = await tabs.nth(i).boundingBox()
      assert(box && box.width >= 44 && box.height >= 44, `${labels[i]} is ${box?.width} x ${box?.height}`)
    }
    await ctx.close()
  })

  await run('N1 at 1280 px the top tabs show the same five, and the bottom bar is gone', async () => {
    // A desktop browser (no touch), signed in and holding the trip like every phone of these checks (lib.mjs).
    const { ctx, page } = await phone(browser, { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1, progress: SEED })
    await live(page, FRI)
    await open(page, 'badges')
    const top = page.locator('nav.tabs-top a')
    assert(await top.first().isVisible(), 'top tabs are hidden')
    const labels = (await top.allTextContents()).map(s => s.trim())
    assert(JSON.stringify(labels) === JSON.stringify(['Now', 'Plan', 'Places', 'Costs', 'More']), `top tabs: ${labels}`)
    assert(!(await page.locator('nav.tabbar').isVisible()), 'the bottom bar shows at 1280 px')
    assert((await page.locator('nav.tabs-top a[aria-current="page"]').textContent()).trim() === 'More', 'More is not lit on /badges')
    await shot(page, 'desktop-badges-1280')
    await ctx.close()
  })

  // N2: the lit tab for every section, on a full load and on client-side navigation.
  const LIT = [
    ['now', 'Now'], ['plan', 'Plan'], ['map', 'Plan'], ['map?from=places', 'Places'], ['map?from=place:sight-pantheon', 'Places'],
    ['places', 'Places'], ['costs', 'Costs'], ['more', 'More'], ['progress', 'More'], ['badges', 'More'], ['bookings', 'More'],
    ['packing', 'More'], ['guide', 'More'], ['notes', 'More'], ['sos', 'More'], ['settings', 'More'],
  ]
  {
    const { ctx, page, errors } = await device(browser)
    const lit = async () => {
      const cur = page.locator('nav.tabbar a[aria-current="page"]')
      return { n: await cur.count(), label: (await cur.first().textContent().catch(() => '')).trim() }
    }
    const notBuilt = []
    for (const [path, want] of LIT) {
      await run(`N2 ${path} lights ${want}, on a full load`, async () => {
        errors.length = 0
        await open(page, path)
        if (!(await page.locator('.shell').count())) {
          // Another package's page that isn't there yet in this wave: checked by its link below.
          notBuilt.push(path)
          console.log(`note: /${path} shows no trip page on this server yet`)
          return
        }
        const got = await lit()
        assert(got.n === 1 && got.label === want, `lit: ${got.n} tab(s), "${got.label}"`)
        assert(!errors.length, `page error: ${errors.join(' / ')}`)
      })
    }
    await open(page, 'now')
    for (const [path, want] of LIT) {
      if (notBuilt.includes(path)) continue
      await run(`N2 ${path} lights ${want}, on client-side navigation`, async () => {
        errors.length = 0
        await go(page, path)
        assert(await page.locator(`.shell.sec-${path.split('?')[0]}`).count(), 'the app did not move to this section')
        const got = await lit()
        assert(got.n === 1 && got.label === want, `lit: ${got.n} tab(s), "${got.label}"`)
        assert(!errors.length, `page error: ${errors.join(' / ')}`)
      })
    }
    if (notBuilt.length) {
      await run(`N2 the tab links point at the pages still being built (${notBuilt.join(', ')})`, async () => {
        await open(page, 'more')
        const href = await page.locator('nav.tabbar a', { hasText: 'Costs' }).getAttribute('href')
        assert(href === tripPath('costs'), `Costs links to ${href}`)
        console.log(`note: ${notBuilt.join(', ')} has no page yet on this server (another package's); only the link was checked`)
      })
    }
    await ctx.close()
  }

  // N3: header line 2 before, during and after the trip, on phones too.
  for (const [at, want, dot] of [
    ['2026-10-09T16:40', 'Day 2 of 5 · Fri 9', true],
    ['2026-09-30T12:00', 'In 8 days · 8–12 Oct', false],
    ['2026-10-07T12:00', 'Tomorrow · 8–12 Oct', false],
    ['2026-10-20T12:00', 'Trip done · 8–12 Oct', false],
  ]) {
    await run(`N3 at live ${at.replace('T', ' ')} header line 2 reads "${want}"`, async () => {
      const { ctx, page } = await device(browser, { at, width: 320 })
      await open(page, 'more')
      const line = page.locator('header .status')
      assert(await line.isVisible(), 'line 2 is hidden on a phone')
      const got = await text(page, 'header .status')
      assert(got === want, `reads "${got}"`)
      assert((await page.locator('header .status .live-dot').count()) === (dot ? 1 : 0), 'the live dot is wrong')
      assert(!(await page.locator('header .chip.status').count()), 'the old status chip is still there')
      assert(await noSideScroll(page), `sideways scroll: ${JSON.stringify(await sideScroll(page))}`)
      await ctx.close()
    })
  }

  await run('N3 in a preview, line 2 follows the previewed moment', async () => {
    const { ctx, page } = await device(browser, { at: '2026-09-30T12:00' })
    await open(page, 'now?at=2026-10-11T10:00')
    const got = await text(page, 'header .status')
    assert(got === 'Day 4 of 5 · Sun 11', `reads "${got}"`)
    await ctx.close()
  })

  await run('A1 the shell\'s header controls reach 44 x 44 (back, trip name, SOS) at 390 and 320 px', async () => {
    for (const width of [390, 320]) {
      const { ctx, page } = await device(browser, { width })
      await open(page, 'badges')
      const small = (await smallTargets(page)).filter(t => t.cls.includes('back') || t.cls.includes('ttl') || t.cls.includes('sosbtn') || t.cls.includes('tb'))
      assert(!small.length, `${width} px: ${brief(small)}`)
      await ctx.close()
    }
  })

  // N4 and G8: the More hub.
  await run('N4 /more groups Get ready, Find your way and Help and settings, with no Places row', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'more')
    const groups = await page.locator('.grp').evaluateAll(els => els.map(g => ({
      title: g.querySelector('h2').textContent.trim(),
      rows: [...g.querySelectorAll('a.mrow b')].map(b => b.textContent.trim()),
      heights: [...g.querySelectorAll('a.mrow')].map(a => a.getBoundingClientRect().height),
    })))
    const want = { 'Get ready': ['Bookings', 'Packing'], 'Find your way': ['Map', 'Guide', 'Notes & chats'], 'Help and settings': ['SOS', 'Trip settings'] }
    assert(groups.length === 3, `groups: ${groups.map(g => g.title)}`)
    for (const g of groups) assert(JSON.stringify(g.rows) === JSON.stringify(want[g.title]), `${g.title}: ${g.rows}`)
    // During the trip Find your way comes first.
    assert(groups[0].title === 'Find your way', `first group: ${groups[0].title}`)
    assert(groups.every(g => g.heights.every(h => h >= 56)), `row heights: ${groups.map(g => g.heights)}`)
    assert(!(await page.locator('a.mrow', { hasText: /^\s*Places\b/ }).count()), 'a Places row is there')
    const map = page.locator('a.mrow', { hasText: 'Map' })
    assert((await map.textContent()).includes('Days, places and the metro'), 'the Map row\'s line is wrong')
    assert(await map.getAttribute('href') === tripPath('map'), `Map links to ${await map.getAttribute('href')}`)
    const body = await page.locator('.page').textContent()
    for (const s of ['16 to do · 4 done', '12 of 17 packed', 'Emergency numbers & what to do', 'Dates, home base, backup, reset', 'This trip', 'All trips']) {
      assert(body.includes(s), `missing "${s}"`)
    }
    await ctx.close()
  })

  await run('N4 before the trip, Get ready comes first', async () => {
    const { ctx, page } = await device(browser, { at: '2026-09-30T12:00' })
    await open(page, 'more')
    const first = (await page.locator('.grp h2').first().textContent()).trim()
    assert(first === 'Get ready', `first group: ${first}`)
    await ctx.close()
  })

  await run('G8 the /more card reads "6 of 41 stops done" and "Viator · 3 stamps · 2 badges", earned badges first, and All badges opens /badges', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'more')
    const card = await text(page, '.you')
    assert(card.includes('6 of 41 stops done'), card)
    assert(card.includes('Viator · 3 stamps · 2 badges'), card)
    assert(card.includes('Progress & journal'), card)
    const seals = await page.locator('.strip svg.seal').evaluateAll(els => els.map(e => e.getAttribute('aria-label')))
    assert(seals.length === 6, `${seals.length} seals`)
    assert(/^First stamp badge, earned/.test(seals[0]) && /^Early bird badge, earned/.test(seals[1]), `order: ${seals}`)
    assert(seals.slice(2).every(s => !s.endsWith(', earned')), `order: ${seals}`)
    await shot(page, 'more-390-seed')
    await page.getByRole('link', { name: 'All badges' }).click()
    await page.waitForURL(u => u.pathname.endsWith(`/trips/${TRIP}/badges`))
    await ready(page)
    assert((await text(page, 'h1')) === 'Badges', 'not on the Badges page')
    await page.goBack()
    await ready(page)
    await page.getByRole('link', { name: 'Progress & journal' }).click()
    await page.waitForURL(u => u.pathname.endsWith(`/trips/${TRIP}/progress`))
    await ctx.close()
  })

  // G1: the Badges page with Seed S.
  await run('G1 with Seed S /badges reads the spec\'s numbers', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'badges')
    assert((await text(page, '.kicker')) === 'Your collection', 'kicker')
    const rank = await text(page, '.rank')
    for (const s of ['Rank II', 'Viator', 'the wayfarer', 'The road is yours.', '3 stamps · 5 more to Explorator', '2 of 12 badges']) assert(rank.includes(s), `rank card lacks "${s}": ${rank}`)
    const cells = Object.fromEntries(await page.locator('.grid .cell').evaluateAll(els => els.map(c => [c.querySelector('.lbl').textContent.trim(), c.querySelector('.st').textContent.trim()])))
    assert(Object.keys(cells).length === 12, `${Object.keys(cells).length} badges`)
    const want = { 'First stamp': 'Earned', 'Early bird': 'Earned', 'Top picks': '2 of 8', 'Critic': '3 of 10', 'Ready to go': '16 of 26', 'Money diary': '2 of 3' }
    for (const [k, v] of Object.entries(want)) assert(cells[k] === v, `${k}: "${cells[k]}"`)
    assert(Object.values(cells).filter(v => v === 'Earned').length === 2, JSON.stringify(cells))
    // Locked badges show their rule and a bar; never colour alone.
    const locked = await page.locator('.cell:not(.on)').first().evaluate(c => ({ rule: c.querySelector('.rule')?.textContent.trim(), bar: !!c.querySelector('.bar') }))
    assert(locked.rule === 'Stamp all 8 top picks.' && locked.bar, JSON.stringify(locked))
    // Stamps by day.
    const day = await text(page, '.day .dh')
    assert(/Friday · IX/.test(day) && /3 stamps/.test(day), day)
    const stamps = page.locator('.day .stamp-btn')
    assert(await stamps.count() === 3, `${await stamps.count()} stamps`)
    const first = await stamps.first().locator('svg.stamp').getAttribute('aria-label')
    assert(first === 'Stamp: Vatican Museums, 9 October', first)
    await shot(page, 'badges-390-seed')
    await stamps.first().click()
    await page.waitForURL(u => u.searchParams.get('place') === 'sight-vatican-museums')
    await ctx.close()
  })

  await run('Fresh: rank I with "Your first stamp is waiting.", no badges and no stamps', async () => {
    const { ctx, page } = await device(browser, { progress: null })
    await open(page, 'badges')
    const rank = await text(page, '.rank')
    for (const s of ['Rank I', 'Peregrinus', 'the newcomer', 'Your first stamp is waiting.', '0 stamps · 3 more to Viator', '0 of 12 badges']) assert(rank.includes(s), `rank card lacks "${s}": ${rank}`)
    const body = await text(page, '.page')
    assert(body.includes('No stamps yet. Tick a stop you visit, or stamp a place in Places.'), 'no empty-stamps line')
    await shot(page, 'badges-390-fresh')
    await go(page, 'more')
    const card = await text(page, '.you')
    assert(card.includes('0 of 41 stops done') && card.includes('Peregrinus · 0 stamps · 0 badges'), card)
    assert(!(await celebrations(page)).length, 'a celebration showed on a fresh device')
    await ctx.close()
  })

  await run('The top rank: "Rank VII", "Imperator", "The top rank. Veni, vidi, vici." (320 px, dark)', async () => {
    const { ctx, page } = await device(browser, { width: 320, dark: true })
    await open(page, 'badges')
    const ids = trip.places.filter(p => p.verdict !== 'trap' && p.verdict !== 'closed').map(p => p.id)
    await stampByHand(page, ids.slice(0, 40))
    const rank = await text(page, '.rank')
    for (const s of ['Rank VII', 'Imperator', 'the emperor', 'The top rank. Veni, vidi, vici.']) assert(rank.includes(s), `rank card lacks "${s}": ${rank}`)
    assert(/4[0-3] stamps/.test(rank) && !rank.includes('more to'), rank)
    assert(await noSideScroll(page), `sideways scroll: ${JSON.stringify(await sideScroll(page))}`)
    // A big catch-up celebrates in one short toast.
    const gold = await celebrations(page)
    assert(gold.length === 1, `${gold.length} celebrations: ${JSON.stringify(gold)}`)
    assert(gold[0].text.startsWith('New rank: Imperator · the emperor. ') && /\. And \d+ more$/.test(gold[0].text), gold[0].text)
    await shot(page, 'badges-320-dark-top-rank')
    await ctx.close()
  })

  // G2: the first load is silent; the sunset stop celebrates once; a reload doesn't.
  await run('G2 Seed S, never opened, live Fri 18:40: silent first load, one "Badge earned: Golden hour", none after a reload', async () => {
    const { ctx, page } = await device(browser, { at: '2026-10-09T18:40' })
    await open(page, 'progress?view=left')
    await page.waitForTimeout(800)
    assert(!(await celebrations(page)).length, `first load: ${JSON.stringify(await celebrations(page))}`)
    const seen = await seenOf(page)
    assert(seen && JSON.stringify(seen.badges) === JSON.stringify(['first-stamp', 'early-bird']) && seen.rank === 2, `seen: ${JSON.stringify(seen)}`)
    await page.getByRole('button', { name: `Mark ${SPANISH_STEPS} as done` }).click()
    await page.waitForTimeout(800)
    const log = await toastLog(page)
    assert(log.some(t => t.text === `Done: ${SPANISH_STEPS} · 2 stamps` && t.actions.includes('Undo')), `tick toast: ${JSON.stringify(log)}`)
    const gold = log.filter(t => t.gold)
    assert(gold.length === 1 && gold[0].text === 'Badge earned: Golden hour' && JSON.stringify(gold[0].actions) === '["See"]', `celebrations: ${JSON.stringify(gold)}`)
    await shot(page, 'progress-390-golden-hour-toast')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await ready(page)
    await page.waitForTimeout(1000)
    assert(!(await celebrations(page)).length, `after reload: ${JSON.stringify(await celebrations(page))}`)
    // G6: nothing about the game is written to the trip's progress.
    const p = await readProgress(page)
    const known = ['stops', 'feedback', 'choices', 'bookings', 'packing', 'dayNotes', 'expenses', 'stamps', 'variant', 'tripNote']
    assert(Object.keys(p).every(k => known.includes(k)), `progress keys: ${Object.keys(p)}`)
    assert(!JSON.stringify(p).includes('golden-hour'), 'the game leaked into the progress')
    await ctx.close()
  })

  await run('G2 the celebration\'s See opens /badges', async () => {
    const { ctx, page } = await device(browser, { at: '2026-10-09T18:40' })
    await open(page, 'progress?view=left')
    await page.getByRole('button', { name: `Mark ${SPANISH_STEPS} as done` }).click()
    await page.locator('.toast.t-gold').getByRole('button', { name: 'See' }).click()
    await page.waitForURL(u => u.pathname.endsWith(`/trips/${TRIP}/badges`))
    await ctx.close()
  })

  // G3: the fifth hand stamp gives the rank.
  await run('G3 Seed S live Fri 16:40: stamping five more places gives one "New rank: Explorator · the scout", on the fifth', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'more')
    await page.waitForTimeout(500)
    for (const id of FIVE.slice(0, 4)) await stampByHand(page, [id])
    assert(!(await celebrations(page)).length, `after four: ${JSON.stringify(await celebrations(page))}`)
    await stampByHand(page, [FIVE[4]])
    const gold = await celebrations(page)
    assert(gold.length === 1 && gold[0].text === 'New rank: Explorator · the scout', `celebrations: ${JSON.stringify(gold)}`)
    assert((await text(page, '.you')).includes('Explorator · 8 stamps · 2 badges'), await text(page, '.you'))
    await shot(page, 'more-390-rank-toast')
    await ctx.close()
  })

  await run('G3 through the place sheet: the fifth stamp by hand gives one "New rank: Explorator · the scout"', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'places')
    await page.waitForTimeout(500)
    for (const [i, id] of FIVE.entries()) {
      await go(page, `places?place=${id}`)
      const label = id.startsWith('food-') ? 'I ate here' : id.startsWith('photo-') ? 'Got the shot' : 'I was here'
      const button = page.getByRole('button', { name: label, exact: true })
      await button.waitFor({ timeout: 5000 }).catch(() => {
        throw new Error(`no "${label}" button in the place sheet of ${id}`)
      })
      await button.click()
      await page.waitForTimeout(600)
      const gold = await celebrations(page)
      if (i < 4) assert(!gold.length, `after stamp ${i + 1}: ${JSON.stringify(gold)}`)
      else assert(gold.length === 1 && gold[0].text === 'New rank: Explorator · the scout', `after the fifth: ${JSON.stringify(gold)}`)
    }
    const log = await toastLog(page)
    assert(log.filter(t => t.text.startsWith('Stamped: ')).length === 5, `stamp toasts: ${JSON.stringify(log.map(t => t.text))}`)
    await ctx.close()
  })

  // G4 (and G7 under reduced motion): a completed set, once.
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await run(`G4 stamping the four churches shows "Set complete: Churches" once${reducedMotion === 'reduce' ? ' (G7: under reduced motion too)' : ''}`, async () => {
      const { ctx, page } = await device(browser, { reducedMotion })
      await open(page, 'badges')
      for (const id of CHURCHES) await stampByHand(page, [id])
      let gold = await celebrations(page)
      assert(gold.length === 1 && gold[0].text === 'Set complete: Churches', `celebrations: ${JSON.stringify(gold)}`)
      const toastEl = page.locator('.toast.t-gold')
      assert(await toastEl.isVisible(), 'the toast is not visible')
      await page.waitForTimeout(300)
      const opacity = await toastEl.evaluate(el => getComputedStyle(el).opacity)
      assert(Number(opacity) === 1, `toast opacity ${opacity}`)
      // Taking one back and stamping it again doesn't celebrate twice.
      await page.evaluate(([id, key]) => {
        const all = JSON.parse(localStorage.getItem('travel:progress:v1'))
        const at = new Date().toISOString()
        all[key].stamps[id] = { on: false, at, updatedAt: at }
        const newValue = JSON.stringify(all)
        localStorage.setItem('travel:progress:v1', newValue)
        window.dispatchEvent(new StorageEvent('storage', { key: 'travel:progress:v1', newValue, storageArea: localStorage }))
      }, [CHURCHES[0], TRIP])
      await page.waitForTimeout(400)
      await stampByHand(page, [CHURCHES[0]])
      gold = await celebrations(page)
      assert(gold.length === 1, `celebrated again: ${JSON.stringify(gold)}`)
      await ctx.close()
    })
  }

  await run('G4 a set\'s See opens /places', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'more')
    await stampByHand(page, CHURCHES)
    await page.locator('.toast.t-gold').getByRole('button', { name: 'See' }).click()
    await page.waitForURL(u => u.pathname.endsWith(`/trips/${TRIP}/places`))
    await ctx.close()
  })

  // G5: nothing celebrates or is noted while previewing; back to live, it catches up once.
  await run('G5 nothing celebrates while previewing; after "Back to live" it celebrates once', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'more')
    await page.waitForTimeout(400)
    await go(page, 'now?at=2026-10-09T18:40')
    assert(await page.getByRole('button', { name: 'Back to live' }).isVisible(), 'no preview bar')
    await go(page, 'progress?view=left')
    await page.getByRole('button', { name: `Mark ${SPANISH_STEPS} as done` }).click()
    await page.waitForTimeout(800)
    assert(!(await celebrations(page)).length, `while previewing: ${JSON.stringify(await celebrations(page))}`)
    const seen = await seenOf(page)
    assert(!seen.badges.includes('golden-hour'), 'noted while previewing')
    await shot(page, 'progress-390-preview')
    await page.getByRole('button', { name: 'Back to live' }).click()
    await page.waitForTimeout(800)
    let gold = await celebrations(page)
    assert(gold.length === 1 && gold[0].text === 'Badge earned: Golden hour', `after Back to live: ${JSON.stringify(gold)}`)
    await page.waitForTimeout(600)
    gold = await celebrations(page)
    assert(gold.length === 1, `celebrated twice: ${JSON.stringify(gold)}`)
    await ctx.close()
  })

  await run('--shell-extra is 0px, then the preview bar\'s height while previewing', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'more')
    const extra = () => page.locator('.shell').evaluate(el => el.style.getPropertyValue('--shell-extra'))
    assert(await extra() === '0px', `live: ${await extra()}`)
    await go(page, 'now?at=2026-10-09T18:40')
    await page.waitForTimeout(400)
    const bar = await page.locator('.pvbar').evaluate(el => Math.round(el.getBoundingClientRect().height))
    const got = await extra()
    assert(got === `${bar}px` && bar > 30, `previewing: ${got}, bar ${bar}px`)
    await page.getByRole('button', { name: 'Back to live' }).click()
    await page.waitForTimeout(600)
    assert(await extra() === '0px', `back to live: ${await extra()}`)
    await ctx.close()
  })

  // Progress.
  await run('Progress: the Money card reads "Money", "€46.00 of ~€503", "≈ ₺2,567" and "See costs"', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'progress')
    const card = page.locator('.mcard')
    const t = (await card.textContent()).replace(/\s+/g, ' ')
    for (const s of ['Money', '€46.00 of ~€503', '≈ ₺2,567', 'See costs']) assert(t.includes(s), `lacks "${s}": ${t}`)
    assert(await card.locator('.bar').count() === 1, 'no bar')
    assert(await card.getByRole('link', { name: 'See costs' }).getAttribute('href') === tripPath('costs'), 'See costs goes elsewhere')
    assert(!(await page.locator('.mrow, .mbars').count()), 'the day chart is still on Progress')
    await ctx.close()
  })

  await run('Progress: the journal and its export read the costs ledger ("Spent: €37.00" for Friday)', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'progress?view=journal')
    const days = await page.locator('.jday').evaluateAll(els => els.map(e => e.querySelector('.sec-h').textContent.replace(/\s+/g, ' ').trim()))
    assert(days.some(d => d.startsWith('Friday 9 October') && d.includes('Spent: €37.00')), JSON.stringify(days))
    assert(days.some(d => d.startsWith('Thursday 8 October') && d.includes('Spent: €9.00')), JSON.stringify(days))
    const vatican = await page.locator('.fitem', { hasText: 'Vatican Museums + Sistine Chapel' }).textContent()
    assert(vatican.includes('€12.00'), `Vatican chip: ${vatican}`)
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download journal (.md)' }).click()])
    const md = readFileSync(await download.path(), 'utf8')
    const fri = md.slice(md.indexOf('## Friday 9 October'), md.indexOf('## Saturday'))
    assert(fri.includes('\nSpent: €37.00\n'), `Friday in the export: ${fri.slice(0, 200)}`)
    assert(/Vatican Museums \+ Sistine Chapel · ★★★★☆ · €12\.00/.test(fri), 'the Vatican line lacks €12.00')
    assert(md.includes('\nSpent: €9.00\n'), 'Thursday lacks Spent: €9.00')
    assert(md.split('\n')[2].includes('€46.00 spent'), md.split('\n')[2])
    await ctx.close()
  })

  await run('Progress: Did it, Skipped and the check in What\'s left each give the tick toast with Undo', async () => {
    const { ctx, page } = await device(browser, { at: '2026-10-09T19:00' })
    await open(page, 'progress?view=left')
    const row = name => page.locator('.row-item', { has: page.getByRole('button', { name, exact: true }) })
    await row('Pantheon').getByRole('button', { name: 'Did it' }).click()
    await page.waitForTimeout(300)
    await row('Trevi Fountain').getByRole('button', { name: 'Skipped' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Mark Dinner at Armando al Pantheon as done' }).click()
    await page.waitForTimeout(500)
    const log = await toastLog(page)
    const find = s => log.find(t => t.text === s)
    assert(find('Done: Pantheon · Stamped')?.actions.join() === 'Log €7,Undo', JSON.stringify(log))
    assert(find('Skipped: Trevi Fountain')?.actions.join() === 'Undo', JSON.stringify(log))
    assert(find('Done: Dinner at Armando al Pantheon · Stamped')?.actions.join() === 'Add cost,Undo', JSON.stringify(log))
    let p = await readProgress(page)
    assert(p.stops.pantheon?.status === 'done' && p.stops['trevi-fountain']?.status === 'skipped', JSON.stringify(p.stops.pantheon))
    await page.locator('.toast', { hasText: 'Done: Dinner at Armando' }).getByRole('button', { name: 'Undo' }).click()
    await page.waitForTimeout(300)
    p = await readProgress(page)
    assert(!p.stops['dinner-at-armando-al-pantheon'], 'Undo did not untick the dinner')
    await shot(page, 'progress-390-left-toasts')
    await ctx.close()
  })

  await run('Review: a double tap on "Did it" in What\'s left marks one stop, not the one that slides into its place', async () => {
    const { ctx, page } = await device(browser, { at: '2026-10-09T19:00' })
    await open(page, 'progress?view=left')
    const done = async () => Object.values((await readProgress(page))?.stops ?? {}).filter(s => s.status === 'done').length
    const before = await done()
    await page.getByRole('button', { name: 'Did it', exact: true }).first().dblclick()
    await page.waitForTimeout(700)
    assert(await done() === before + 1, `${await done() - before} stops marked done`)
    await page.waitForTimeout(600)
    const check = page.getByRole('button', { name: /^Mark .* as done$/ }).first()
    await check.dblclick()
    await page.waitForTimeout(700)
    assert(await done() === before + 2, `the check: ${await done() - before - 1} stops marked done`)
    await ctx.close()
  })

  await run('Progress: beside a long stop title, What\'s left\'s buttons and badges and the Ratings stars keep their size (320 and 390 px)', async () => {
    for (const width of [320, 390]) {
      // 18:40: rows not marked (Did it, Skipped), the Now and Next badges, and checks beside long titles.
      const { ctx, page } = await device(browser, { width, at: '2026-10-09T18:40' })
      await open(page, 'progress?view=left')
      const left = await page.evaluate(squeezedItems, '.lrow')
      assert(!left.length, `${width} px, What's left: ${brief(left)}`)
      assert(await page.locator('.lrow', { hasText: 'Did it' }).count() >= 1, 'no row that is not marked')
      assert(await noSideScroll(page), `${width} px, What's left scrolls sideways: ${JSON.stringify(await sideScroll(page))}`)
      const checks = await page.locator('.lrow .btn.icon').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().width)))
      assert(checks.length > 20 && checks.every(w => w === checks[0]), `${width} px, check widths: ${checks}`)
      await go(page, 'progress')
      const stars = await page.evaluate(squeezedItems, '.trow')
      assert(!stars.length, `${width} px, Ratings: ${brief(stars)}`)
      await ctx.close()
    }
  })

  await run('Progress: the "Before you go" links are rows: icon, words, then the chevron at the end (320 px)', async () => {
    const { ctx, page } = await device(browser, { width: 320 })
    await open(page, 'progress?view=left')
    const links = await page.locator('a.card-link.row').evaluateAll(as => as.map((a) => {
      const box = a.getBoundingClientRect()
      const icons = a.querySelectorAll(':scope > svg')
      const words = a.querySelector(':scope > .grow').getBoundingClientRect()
      return {
        text: a.textContent.replace(/\s+/g, ' ').trim(),
        display: getComputedStyle(a).display,
        gap: Math.round(words.left - icons[0].getBoundingClientRect().right),
        toEnd: Math.round(box.right - icons[icons.length - 1].getBoundingClientRect().right),
      }
    }))
    assert(links.length === 2 && links[0].text === '16 bookings not done' && links[1].text === '5 things not packed', JSON.stringify(links))
    for (const l of links) assert(l.display === 'flex' && l.gap >= 6 && l.toEnd <= 20, JSON.stringify(l))
    await ctx.close()
  })

  // Trip settings.
  await run('Trip settings: the Clear my progress question, and the Your data line when signed out', async () => {
    const { ctx, page } = await device(browser)
    await open(page, 'settings')
    let message = ''
    page.once('dialog', (d) => {
      message = d.message()
      void d.dismiss()
    })
    await page.getByRole('button', { name: 'Clear my progress' }).click()
    await page.waitForTimeout(300)
    assert(message === 'Clear everything you ticked, rated, wrote, logged and stamped for this trip? This can\'t be undone.', `asks "${message}"`)
    assert(Object.keys((await readProgress(page)).stops).length === 17, 'dismissing the question cleared something')
    const data = await text(page, '.data')
    assert(data.includes('Everything lives in this browser on this device.'), data)
    // Signed in (not reachable without a Google account here), the other line shows: it is in the page's code.
    const src = readFileSync(join(ROOT, 'app/pages/trips/[id]/settings.vue'), 'utf8')
    assert(/v-if="signedIn"[^>]*>\s*Everything is kept on this device and in your account in the cloud\. Export a backup if you want a file of your own\./.test(src), 'the signed-in line is not in settings.vue')
    await ctx.close()
  })

  // Offline: the screens keep working, the header says so.
  await run('Offline: More, Badges and Progress open, and the header shows Offline (icon only at 320 px)', async () => {
    const { ctx, page, errors } = await device(browser, { width: 320 })
    await open(page, 'now')
    // Load each screen once while online (the dev server hands out pages on demand; the built app caches them).
    for (const path of ['more', 'badges', 'progress', 'now']) await go(page, path)
    await ctx.setOffline(true)
    await page.waitForTimeout(300)
    for (const path of ['more', 'badges', 'progress']) {
      await go(page, path)
      assert(await page.locator(`.shell.sec-${path}`).count(), `${path} did not open`)
      assert(await noSideScroll(page), `${path}: sideways scroll ${JSON.stringify(await sideScroll(page))}`)
    }
    const chip = page.locator('header .offline')
    assert(await chip.isVisible(), 'no Offline chip')
    assert((await chip.textContent()).trim() === 'Offline', 'the chip lost its name')
    assert((await chip.locator('.off-t').boundingBox())?.width <= 1, 'the chip\'s word shows at 320 px')
    // Its icon alone must not read as full signal: the bars are struck through.
    assert((await chip.locator('svg').innerHTML()).includes('M3 3l18 18'), 'the Offline icon is not struck through')
    assert(!errors.length, `page errors: ${errors}`)
    await shot(page, 'offline-320')
    await ctx.setOffline(false)
    await ctx.close()
  })

  // N5, A1 and A2 for More, Badges and Progress at 390 and 320 px, light and dark; A4 over G's files.
  for (const width of [390, 320]) {
    for (const dark of [false, true]) {
      const tag = `${width} px${dark ? ', dark' : ''}`
      const { ctx, page } = await device(browser, { width, dark })
      await open(page, 'more')
      for (const path of ['more', 'badges', 'progress', 'progress?view=journal', 'progress?view=left', 'settings']) {
        await go(page, path)
        await run(`N5 /${path} has no sideways scroll (${tag})`, async () => {
          assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
        })
        if (!path.startsWith('settings')) {
          await run(`A1 /${path}: every control is at least 44 x 44 (${tag})`, async () => {
            const small = await allSmallTargets(page)
            assert(!small.length, brief(small))
          })
        }
        if (['more', 'badges', 'progress'].includes(path)) {
          await run(`A2 /${path}: text reaches 4.5:1 and seals 3:1 (${tag})`, async () => {
            const low = await page.evaluate(contrastReport)
            assert(!low.length, brief(low))
          })
          await shot(page, `${path}-${width}${dark ? '-dark' : ''}`)
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
          await page.waitForTimeout(200)
          await shot(page, `${path}-${width}${dark ? '-dark' : ''}-end`)
        }
      }
      if (dark) {
        await run(`Dark mode: the rank card uses the rank tokens (${tag})`, async () => {
          await go(page, 'badges')
          const { bg, ink, want } = await page.locator('.rank').evaluate((el) => {
            const root = getComputedStyle(document.documentElement)
            const probe = document.createElement('div')
            probe.style.color = root.getPropertyValue('--rank-bg').trim()
            document.body.append(probe)
            const want = getComputedStyle(probe).color
            probe.remove()
            return { bg: getComputedStyle(el).backgroundColor, ink: getComputedStyle(el).color, want }
          })
          assert(bg === want && bg === 'rgb(58, 21, 34)', `rank card background ${bg}, token ${want}`)
          assert(ink === 'rgb(235, 196, 104)', `rank ink ${ink}`)
        })
        await run(`A2 the celebration's See action reaches 4.5:1 (${tag})`, async () => {
          await stampByHand(page, CHURCHES)
          const r = await page.locator('.toast.t-gold .act').first().evaluate((btn) => {
            const toastEl = btn.closest('.toast')
            const parse = c => c.match(/[\d.]+/g).slice(0, 3).map(Number)
            const lum = ([r, g, b]) => [r, g, b].map((v) => {
              const s = v / 255
              return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
            }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0)
            const a = lum(parse(getComputedStyle(btn).color))
            const b = lum(parse(getComputedStyle(toastEl).backgroundColor))
            return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
          })
          assert(r >= 4.5, `See is ${r.toFixed(2)}:1`)
        })
      }
      await ctx.close()
    }
  }

  await run('A4 no em dash in G\'s files', async () => {
    const files = [
      'app/pages/trips/[id].vue', 'app/pages/trips/[id]/more.vue', 'app/pages/trips/[id]/badges.vue', 'app/pages/trips/[id]/progress.vue',
      'app/pages/trips/[id]/settings.vue', 'app/components/BadgeSeal.vue', 'app/components/RankCard.vue', 'app/components/GameHost.vue',
      'app/composables/useGame.ts', 'shared/utils/game.ts', 'tests/game.test.ts', 'tests/e2e/game.e2e.mjs',
    ]
    const hits = files.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(String.fromCharCode(0x2014)))
    assert(!hits.length, `em dash in ${hits}`)
  })
}
finally {
  await browser.close()
}
