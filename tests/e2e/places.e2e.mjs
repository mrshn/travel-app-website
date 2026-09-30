// Browser checks for Places, the place sheet, the map and the stop editor (spec 9.3, 9.6 and 9.8).
//
//   node tests/e2e/places.e2e.mjs            against TRAVELS_URL, or the dev server on http://127.0.0.1:3000
//   node tests/e2e/places.e2e.mjs --build    also serves .output/public on port 4173 with its service worker and
//                                             checks the offline map (O1); run `npm run generate` first
//
// Every check opens its own phone (390 x 844 unless it says otherwise), with Seed S at live Fri 9 Oct 16:40
// unless it says otherwise, so one failure can't spill into the next check.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { BASE, TRIP, assert, check, go, live, loadTrip, noSideScroll, phone, preview, readProgress, ready, seedS, serveBuild, sideScroll, smallTargets } from './lib.mjs'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const trip = loadTrip()
const SEED = seedS(trip)
const FRI = '2026-10-09T16:40'
const LOCATION_OFF = 'Location is off. Allow it in your browser settings to sort by distance.'
/** Closed on Sunday 11 Oct (spec P3). */
const SUNDAY_CLOSED = [
  'sight-vatican-museums', 'sight-galleria-sciarra', 'sight-san-sebastiano-catacombs', 'sight-vatican-necropolis-scavi',
  'food-armando-al-pantheon', 'food-da-enzo-al-29', 'food-l-arcangelo', 'food-mercato-di-testaccio', 'food-antico-caffe-greco',
]
const SETS = [
  ['Ancient sites', '0/10'], ['Museums & art', '2/7'], ['Churches', '0/4'], ['Underground', '0/6'], ['Piazzas & views', '0/8'],
  ['Trattorias & pasta', '0/11'], ['Pizza & street food', '1/9'], ['Coffee & sweets', '0/6'], ['Morning light', '0/10'],
  ['Golden hour', '0/5'], ['Any time', '0/3'],
]
const OWN_FILES = [
  'app/pages/trips/[id]/places.vue', 'app/components/PlaceTile.vue', 'app/components/PlaceSheet.vue', 'app/pages/trips/[id]/map.vue',
  'app/components/MapView.vue', 'app/utils/mapdata.ts', 'app/components/StopEditor.vue', 'nuxt.config.ts', 'tests/e2e/places.e2e.mjs',
]

// ---------- helpers ----------

/** Waits until fn() gives something truthy (every 100 ms); throws naming `what` after `ms`. */
async function until(fn, what, ms = 6000) {
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
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error(`timed out waiting for ${what}${last instanceof Error ? ` (${last.message.split('\n')[0]})` : ''}`)
}

/**
 * Runs fn with a fresh phone opened on a trip path: Seed S (or `fresh`), live at `at` (null leaves the real clock),
 * plus any phone() options (width, dark, geolocation...). `init` is [fn, arg] for an init script. Fails on page
 * errors. Closes the phone after.
 */
async function withPhone(browser, path, opts, fn) {
  const { at = FRI, fresh = false, provider, init, ...rest } = opts ?? {}
  const ph = await phone(browser, { progress: fresh ? undefined : SEED, ...rest })
  if (provider) await ph.ctx.addInitScript(p => localStorage.setItem('travel:map:provider', p), provider)
  if (init) await ph.ctx.addInitScript(...init)
  try {
    if (at) await live(ph.page, at)
    if (path) {
      await ph.page.goto(`${BASE}trips/${TRIP}/${path}`, { waitUntil: 'domcontentloaded' })
      await ready(ph.page)
    }
    await fn(ph)
    assert(!ph.errors.length, `page error: ${ph.errors.join(' / ')}`)
  }
  finally {
    await ph.ctx.close()
  }
}

/**
 * Init script: window.__geoFail(code) makes every location watcher report an error, as a phone does when it loses
 * its position for a moment (2, indoors or underground). With { noFix: true } no position ever arrives.
 */
function geoHook({ noFix = false } = {}) {
  const fails = []
  const real = navigator.geolocation.watchPosition.bind(navigator.geolocation)
  navigator.geolocation.watchPosition = (ok, err, o) => {
    if (err) fails.push(err)
    return real(noFix ? () => {} : ok, err, o)
  }
  window.__geoFail = code => fails.forEach(f => f({ code, message: 'test', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }))
}

/** Metres between two { lat, lng } points. */
function metres(a, b) {
  const rad = d => d * Math.PI / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

const tile = (page, id) => page.locator(`.tile[data-place="${id}"]`)
const sheetOf = (page, name) => page.getByRole('dialog', { name, exact: true })
const filterChip = (page, name) => page.locator('.filters').getByRole('button', { name, exact: true })
const stampsOf = async page => (await readProgress(page))?.stamps ?? {}

/** Opens every set ("Show all N") so each matching card is on the page. */
async function expandAll(page) {
  for (let i = 0; i < 20; i++) {
    const more = page.locator('button.more', { hasText: /Show all/ }).first()
    if (!(await more.count())) return
    await more.click()
  }
}

/** Ids of the cards on the page, in order. */
const tileIds = page => page.locator('.tile').evaluateAll(els => els.map(e => e.dataset.place))

/** [label, count] of every set header, in order (the label as written, before CSS capitals). */
function setHeaders(page) {
  return page.locator('section.set').evaluateAll(els => els.map(s => [
    s.querySelector('.set-t')?.textContent?.trim() ?? '',
    s.querySelector('.set-n')?.textContent?.trim() ?? '',
  ]))
}

/** The newest toast holding `text`. */
async function toastWith(page, text) {
  const t = page.locator('.toasts .toast').filter({ hasText: text }).last()
  await t.waitFor({ timeout: 6000 })
  return t
}

/** Opens a place's sheet by tapping its card on Places (opening the sets first when the card is hidden). */
async function tapTile(page, id, name) {
  if (!(await tile(page, id).count())) await expandAll(page)
  await tile(page, id).click()
  const d = sheetOf(page, name)
  await d.waitFor({ timeout: 6000 })
  return d
}

/** Buttons and links under 44 x 44 px (lib's smallTargets), leaving out map pins cut by the map's edge (pan to them). */
async function targets(page, where) {
  const small = (await smallTargets(page)).filter(t => !(t.cls.includes('leaflet-marker-icon') && t.clip))
  assert(!small.length, `${where}: ${small.map(t => `${t.tag} "${t.text || t.label}" ${t.w}x${t.h}${t.clip ? ` (${t.clip})` : ''}`).join('; ')}`)
}

async function wide(page, where) {
  assert(await noSideScroll(page), `${where} scrolls sideways: ${JSON.stringify(await sideScroll(page))}`)
}

/**
 * Spec A2 inside the roots: text below 4.5:1 (3:1 when large) against its background, stamp ink and the gold rim of
 * top picks below 3:1. Text over art (an .art-frame or a background image) and inside SVG is left out; the stamp's
 * ink is checked on its own against the card or sheet under it.
 */
function contrastIssues(page, roots) {
  return page.evaluate((sel) => {
    const rgb = (c) => {
      const s = String(c ?? '').trim()
      const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s)
      if (hex) {
        const h = hex[1].length === 3 ? [...hex[1]].map(x => x + x).join('') : hex[1]
        return { r: Number.parseInt(h.slice(0, 2), 16), g: Number.parseInt(h.slice(2, 4), 16), b: Number.parseInt(h.slice(4, 6), 16), a: 1 }
      }
      const m = /rgba?\(([^)]+)\)/.exec(s)
      if (!m) return null
      const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number)
      return { r, g, b, a }
    }
    const lin = (v) => {
      const x = v / 255
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    }
    const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
    const ratio = (a, b) => {
      const [x, y] = [lum(a), lum(b)]
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
    }
    const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 })
    /** The colour behind an element, or null over art. */
    function bgOf(el) {
      const layers = []
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        const s = getComputedStyle(e)
        if (e.classList.contains('art-frame') || (s.backgroundImage && s.backgroundImage !== 'none')) return null
        const c = rgb(s.backgroundColor)
        if (c && c.a > 0) {
          layers.push(c)
          if (c.a >= 1) break
        }
      }
      let bg = layers.length && layers[layers.length - 1].a >= 1 ? layers.pop() : rgb(getComputedStyle(document.body).backgroundColor)
      while (layers.length) bg = over(layers.pop(), bg)
      return bg
    }
    const out = []
    const seen = new Set()
    for (const root of document.querySelectorAll(sel)) {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      while (walk.nextNode()) {
        const node = walk.currentNode
        const el = node.parentElement
        if (!node.textContent.trim() || !el || seen.has(el) || el.closest('svg, .sr-only')) continue
        seen.add(el)
        const s = getComputedStyle(el)
        const box = el.getBoundingClientRect()
        if (s.visibility === 'hidden' || box.width < 1 || box.height < 1) continue
        let opacity = 1
        for (let e = el; e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity)
        const fg = rgb(s.color)
        const bg = bgOf(el)
        if (!fg || !bg) continue
        const size = Number.parseFloat(s.fontSize)
        const need = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700) ? 3 : 4.5
        const cr = ratio(over({ ...fg, a: fg.a * opacity }, bg), bg)
        if (cr < need - 0.005) out.push(`"${node.textContent.trim().slice(0, 30)}" ${cr.toFixed(2)}:1`)
      }
      // Stamp ink: on a card, against the card's surface (the stamp sits on a patch of it); in the sheet, against the sheet.
      for (const svg of root.querySelectorAll('svg.stamp')) {
        const ink = rgb(getComputedStyle(svg).color)
        const cardEl = svg.closest('.tile')
        const under = cardEl ? rgb(getComputedStyle(cardEl).getPropertyValue('--surface')) : bgOf(svg.parentElement)
        if (ink && under && ratio(ink, under) < 3) out.push(`stamp ink ${ratio(ink, under).toFixed(2)}:1`)
      }
      for (const t of root.querySelectorAll('.tile.top')) {
        const rim = rgb(getComputedStyle(t).borderTopColor)
        const under = bgOf(t.parentElement)
        if (rim && under && ratio(rim, under) < 3) out.push(`gold rim ${ratio(rim, under).toFixed(2)}:1`)
      }
    }
    return out
  }, roots)
}

// ---------- the checks ----------

const browser = await chromium.launch()
try {
  await check('P1 Seed S live Fri 16:40: 4 cards above the tab bar, none over 200 px, at most 8 screens (12 expanded)', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      const measure = () => page.evaluate(() => {
        const bar = document.querySelector('nav.tabbar')?.getBoundingClientRect().top ?? innerHeight
        const boxes = [...document.querySelectorAll('.tile')].map(t => t.getBoundingClientRect())
        return { above: boxes.filter(b => b.top >= 0 && b.bottom <= bar).length, tallest: Math.max(...boxes.map(b => b.height)), screens: document.documentElement.scrollHeight / innerHeight }
      })
      const top = await measure()
      assert(top.above >= 4, `${top.above} cards fully above the tab bar`)
      assert(top.tallest <= 200, `a card is ${top.tallest} px tall`)
      assert(top.screens <= 8, `the page is ${top.screens.toFixed(2)} screens tall`)
      await expandAll(page)
      const all = await measure()
      assert(await page.locator('.tile').count() === 81, `${await page.locator('.tile').count()} cards expanded`)
      assert(all.tallest <= 200, `a card is ${all.tallest} px tall`)
      assert(all.screens <= 12, `expanded, the page is ${all.screens.toFixed(2)} screens tall`)
    }))

  await check('P2 header "3 of 79 stamped", "Top picks 2/8", the 11 sets and the two dimmed places', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      const tally = (await page.locator('.tally').textContent()).replace(/\s+/g, ' ')
      assert(tally.includes('3 of 79 stamped'), `tally: ${tally}`)
      const topChip = page.getByRole('link', { name: 'Top picks 2/8' })
      assert(await topChip.count() === 1, 'no "Top picks 2/8" chip')
      assert((await topChip.getAttribute('href'))?.endsWith(`/trips/${TRIP}/badges`), 'the chip does not go to /badges')
      assert((await page.locator('.kicker').first().textContent()).trim() === 'Your collection', 'kicker')
      const heads = await setHeaders(page)
      assert(JSON.stringify(heads) === JSON.stringify(SETS), `sets: ${JSON.stringify(heads)}`)
      await expandAll(page)
      assert(await page.locator('section.set[data-set="pasta"] .tile').count() === 12, 'Trattorias & pasta does not have 12 cards')
      assert(await page.locator('section.set[data-set="sweet"] .tile').count() === 7, 'Coffee & sweets does not have 7 cards')
      for (const [id, chip] of [['food-tonnarello', 'Tourist trap'], ['food-antico-caffe-greco', 'Closed']]) {
        const t = tile(page, id)
        assert(await t.evaluate(e => e.classList.contains('dim')), `${id} is not dimmed`)
        assert((await t.locator('.flags').textContent()).includes(chip), `${id} has no "${chip}" chip`)
        assert(!(await t.locator('.status').count()), `${id} shows a status`)
      }
      const pasta = await page.locator('section.set[data-set="pasta"] .tile').evaluateAll(els => els.map(e => e.dataset.place))
      assert(pasta.at(-1) === 'food-tonnarello', 'Tonnarello is not last in its set')
    }))

  await check('P4 plan status: Borghese "Sun 14:15", Pantheon "Fri 17:15"; none for Tonnarello, Capitoline, Pantheon photo', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      await expandAll(page)
      const status = async id => (await tile(page, id).locator('.status').textContent().catch(() => ''))?.replace(/\s+/g, ' ').trim() ?? ''
      assert(await status('sight-borghese-gallery') === 'In your plan · Sun 14:15', `Borghese: ${await status('sight-borghese-gallery')}`)
      assert(await status('sight-pantheon') === 'In your plan · Fri 17:15', `Pantheon: ${await status('sight-pantheon')}`)
      for (const id of ['food-tonnarello', 'sight-capitoline-museums', 'photo-pantheon']) {
        const s = await tile(page, id).locator('.status').count() ? await status(id) : ''
        assert(!s.includes('In your plan'), `${id}: ${s}`)
      }
      // The first card of a set is a top pick, and stamped cards show their stamp.
      assert((await tileIds(page))[0] === 'sight-colosseum-forum-palatine-24h', 'the Colosseum is not first')
      assert(await tile(page, 'sight-vatican-museums').locator('.mark svg.stamp').count() === 1, 'the Vatican card has no stamp')
      assert((await tile(page, 'sight-vatican-museums').locator('.status').textContent()).includes('Stamped'), 'the Vatican card does not read Stamped')
    }))

  await check('P3 Free 26, Not stamped 76, Top picks 8, and filters combine', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      const count = async () => {
        await expandAll(page)
        return page.locator('.tile').count()
      }
      for (const [name, n] of [['Free', 26], ['Not stamped', 76], ['Top picks', 8]]) {
        await filterChip(page, name).click()
        assert(await filterChip(page, name).getAttribute('aria-pressed') === 'true', `${name} is not pressed`)
        const got = await count()
        assert(got === n, `${name}: ${got} cards`)
        await filterChip(page, name).click()
      }
      assert(await count() === 81, 'the filters did not let go')
      // Food + Top picks: nothing, then "Clear filters" brings everything back.
      await page.locator('.cats').getByRole('button', { name: /^Food/ }).click()
      await filterChip(page, 'Top picks').click()
      await page.getByText('Nothing here with these filters.').waitFor({ timeout: 4000 })
      await page.getByRole('button', { name: 'Clear filters' }).click()
      assert(await count() === 81, 'Clear filters did not bring every card back')
      assert(await page.locator('.cats [aria-pressed="true"]').textContent().then(t => t.trim().startsWith('All')), 'the category is not All')
    }))

  await check('P3 preview Sun 11 Oct 12:00: Open today hides exactly the 9 places closed on Sunday (72 left)', async () => {
    const { ctx, page, errors } = await phone(browser, { progress: SEED })
    try {
      await preview(page, '2026-10-11T12:00')
      await go(page, 'places')
      await filterChip(page, 'Open today').click()
      await expandAll(page)
      const shown = await tileIds(page)
      const hidden = trip.places.map(p => p.id).filter(id => !shown.includes(id))
      assert(shown.length === 72, `${shown.length} cards`)
      assert(JSON.stringify(hidden.sort()) === JSON.stringify([...SUNDAY_CLOSED].sort()), `hidden: ${hidden.join(', ')}`)
      assert(!errors.length, errors.join(' / '))
    }
    finally {
      await ctx.close()
    }
  })

  await check('P3 Near me at 41.9009, 12.4833: a flat list from "Trevi Fountain", distances shown, no coordinates last', () =>
    withPhone(browser, 'places', { geolocation: { latitude: 41.9009, longitude: 12.4833 }, permissions: ['geolocation'] }, async ({ page }) => {
      await filterChip(page, 'Near me').click()
      await until(() => page.locator('.grid.flat .tile').count(), 'the flat list')
      assert(!(await page.locator('section.set').count()), 'set headers still show')
      const first = await until(async () => {
        const n = (await page.locator('.tile .name').first().textContent()).trim()
        return n === 'Trevi Fountain' ? n : null
      }, 'Trevi Fountain first')
      assert(first, 'Trevi Fountain is not first')
      assert(/\d+ m|\d km/.test(await page.locator('.tile .status').first().textContent()), 'no distance on the first card')
      const ids = await tileIds(page)
      const noGeo = trip.places.filter(p => !p.place).map(p => p.id)
      assert(ids.length === 81, `${ids.length} cards`)
      assert(ids.slice(-noGeo.length).every(id => noGeo.includes(id)), 'places without coordinates are not last')
      // The sheet tells how far it is.
      await tile(page, 'sight-trevi-fountain').click()
      const d = sheetOf(page, 'Trevi Fountain')
      await d.waitFor()
      assert(/from you · about \d+ min on foot/.test(await d.locator('.away').textContent()), 'no distance in the sheet')
    }))

  await check('Near me with location blocked toasts "Location is off…" and stays off; no location, no distances', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      assert(!(await page.locator('.tile .away').count()), 'a distance shows with no location')
      await filterChip(page, 'Near me').click()
      await toastWith(page, LOCATION_OFF)
      await until(async () => (await filterChip(page, 'Near me').getAttribute('aria-pressed')) === 'false', 'Near me to switch off')
      assert(await page.locator('section.set').count() > 0, 'not back to the sets')
    }))

  await check('Near me rides out a moment without a position, and the cards keep their order until you are 50 m on', async () => {
    // Two cafés 133 m apart: start 10 m on Armando's side of their midpoint, then step 20 m to Sant'Eustachio's.
    const [A, B] = ['food-armando-al-pantheon', 'food-sant-eustachio-il-caffe'].map(id => trip.places.find(p => p.id === id))
    const span = metres(A.place, B.place)
    const along = t => ({ latitude: A.place.lat + (B.place.lat - A.place.lat) * t, longitude: A.place.lng + (B.place.lng - A.place.lng) * t })
    const colosseum = trip.places.find(p => p.id === 'sight-colosseum-forum-palatine-24h').place
    await withPhone(browser, 'places', { geolocation: along(0.5 - 10 / span), permissions: ['geolocation'], init: [geoHook, {}] }, async ({ page, ctx }) => {
      const order = () => tileIds(page)
      const away = async id => Number((await tile(page, id).locator('.away').textContent()).replace(/\D/g, ''))
      await filterChip(page, 'Near me').click()
      await until(async () => (await order()).indexOf(A.id) === 0, 'Armando first')
      assert((await order()).indexOf(B.id) === 1, 'Sant\'Eustachio is not second')
      // The phone loses its position for a moment (indoors, underground): Near me stays on, and says nothing.
      await page.evaluate(() => window.__geoFail(2))
      await page.waitForTimeout(400)
      assert(await filterChip(page, 'Near me').getAttribute('aria-pressed') === 'true', 'Near me went off on a passing error')
      assert(!(await page.locator('.toasts .toast', { hasText: 'Location is off' }).count()), 'a "Location is off" toast for a passing error')
      // 20 m on, Sant'Eustachio is the nearer one: the distances follow you, the order waits.
      await ctx.setGeolocation(along(0.5 + 10 / span))
      await until(async () => (await away(B.id)) < (await away(A.id)), 'the distances to follow the move')
      const now = await order()
      assert(now.indexOf(A.id) === 0 && now.indexOf(B.id) === 1, `the cards moved after 20 m: ${now.slice(0, 3).join(', ')}`)
      assert(await filterChip(page, 'Near me').getAttribute('aria-pressed') === 'true', 'Near me went off')
      // A real move sorts again.
      await ctx.setGeolocation({ latitude: colosseum.lat, longitude: colosseum.lng })
      await until(async () => (await order())[0] === 'sight-colosseum-forum-palatine-24h', 'the Colosseum first after the move')
    })
    // With no position at all, a "position unavailable" switches Near me off with the toast, as a blocked location does.
    await withPhone(browser, 'places', { geolocation: along(0.5), permissions: ['geolocation'], init: [geoHook, { noFix: true }] }, async ({ page }) => {
      await filterChip(page, 'Near me').click()
      await page.waitForTimeout(300)
      await page.evaluate(() => window.__geoFail(2))
      await toastWith(page, LOCATION_OFF)
      await until(async () => (await filterChip(page, 'Near me').getAttribute('aria-pressed')) === 'false', 'Near me to switch off')
    })
  })

  await check('P3 the Map chip opens /map?day=all&places=1&from=places with the places layer on and Places lit', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      await page.locator('.filters').getByRole('link', { name: 'Map', exact: true }).click()
      await until(() => new URL(page.url()).pathname.endsWith(`/trips/${TRIP}/map`), 'the map')
      const q = new URL(page.url()).searchParams
      assert(q.get('day') === 'all' && q.get('places') === '1' && q.get('from') === 'places', `query: ${q}`)
      await until(() => page.locator('.mk.place').count(), 'place pins')
      assert(await page.locator('.lchip', { hasText: 'Places' }).getAttribute('aria-pressed') === 'true', 'the places layer is off')
      assert(await page.locator('nav.tabbar [aria-current="page"]').textContent().then(t => t.includes('Places')), 'Places is not lit')
    }))

  await check('Search matches name, area and text without accents; Cancel returns to the sets', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      await page.getByRole('button', { name: 'Search places' }).click()
      const box = page.getByRole('searchbox', { name: 'Search places' })
      await box.waitFor()
      assert(await box.evaluate(e => e === document.activeElement), 'the field has no focus')
      assert(await box.getAttribute('placeholder') === 'Search places', 'placeholder')
      await box.fill('caffe')
      await until(() => page.locator('.grid.flat').count(), 'the flat list')
      const ids = await tileIds(page)
      assert(ids.includes('food-sant-eustachio-il-caffe') && ids.includes('food-antico-caffe-greco'), `caffe: ${ids.join(', ')}`)
      await box.fill('trastevere')
      await until(async () => (await tileIds(page)).includes('food-da-enzo-al-29'), 'an area match (Da Enzo, Trastevere)')
      await page.getByRole('button', { name: 'Cancel' }).click()
      await until(() => page.locator('section.set').count(), 'the sets')
      assert(await page.getByRole('searchbox').count() === 0, 'the field is still open')
    }))

  await check('The category is remembered in travel:places:cat', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      await page.locator('.cats').getByRole('button', { name: /^Photo/ }).click()
      await until(async () => (await page.locator('section.set').count()) === 3, 'three photo sets')
      await page.reload()
      await ready(page)
      assert(await page.evaluate(() => localStorage.getItem('travel:places:cat')) === 'photo', 'not stored')
      assert(await page.locator('section.set').count() === 3, 'the category was not kept')
      const counts = (await page.locator('.cats button').allTextContents()).map(t => t.replace(/\s+/g, ' ').trim()).join(' · ')
      assert(counts === 'All 81 · Sights 35 · Food 28 · Photo 18', `segment: ${counts}`)
    }))

  await check('S1 "I was here" on Galleria Doria Pamphilj stamps it (3/7), "Remove stamp" writes on: false (2/7)', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      const d = await tapTile(page, 'sight-galleria-doria-pamphilj', 'Galleria Doria Pamphilj')
      await d.getByRole('button', { name: 'I was here' }).click()
      const t = await toastWith(page, 'Stamped: Galleria Doria Pamphilj')
      assert((await t.locator('.txt').textContent()).trim() === 'Stamped: Galleria Doria Pamphilj · Museums & art 3/7', `toast: ${await t.locator('.txt').textContent()}`)
      await d.locator('svg.stamp').waitFor()
      assert((await d.locator('.stamped').textContent()).includes('Stamped · Fri 9 Oct'), 'no "Stamped · Fri 9 Oct"')
      assert(await tile(page, 'sight-galleria-doria-pamphilj').locator('svg.stamp').count() === 1, 'the card shows no stamp')
      assert((await stampsOf(page))['sight-galleria-doria-pamphilj']?.on === true, 'not on: true')
      assert((await page.locator('section.set[data-set="art"] .set-n').textContent()).trim() === '3/7', 'the set does not read 3/7')
      await d.getByRole('button', { name: 'Remove stamp' }).click()
      await toastWith(page, 'Stamp removed: Galleria Doria Pamphilj')
      await until(async () => (await stampsOf(page))['sight-galleria-doria-pamphilj']?.on === false, 'on: false')
      assert((await page.locator('section.set[data-set="art"] .set-n').textContent()).trim() === '2/7', 'the set does not read 2/7')
      assert(await d.getByRole('button', { name: 'I was here' }).count() === 1, 'the stamp button did not come back')
    }))

  await check('The stamp presses on only when it appears on screen, and a double tap does not undo it', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      // Stamped before the page opened: no press, on the card or in the sheet.
      assert(!(await tile(page, 'sight-vatican-museums').locator('svg.stamp.press').count()), 'the Vatican card presses on load')
      const vat = await tapTile(page, 'sight-vatican-museums', 'Vatican Museums')
      assert(!(await vat.locator('svg.stamp.press').count()), 'the Vatican sheet presses on open')
      await page.keyboard.press('Escape')
      await vat.waitFor({ state: 'detached' })
      // Stamped now, with a double tap on the right of the button (where "Remove stamp" then appears).
      const d = await tapTile(page, 'sight-galleria-spada', 'Galleria Spada')
      const btn = d.getByRole('button', { name: 'I was here' })
      const box = await btn.boundingBox()
      await btn.click({ position: { x: box.width - 24, y: box.height / 2 }, clickCount: 2 })
      await d.locator('svg.stamp.press').waitFor()
      await page.waitForTimeout(400)
      assert((await stampsOf(page))['sight-galleria-spada']?.on === true, 'the double tap took the stamp back')
      assert(await tile(page, 'sight-galleria-spada').locator('svg.stamp.press').count() === 1, 'the card did not press')
      assert(!(await page.locator('.toasts .toast', { hasText: 'Stamp removed' }).count()), 'a "Stamp removed" toast')
    }))

  await check('S1 Undo on the stamp toast leaves on: null and the set at 2/7', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      const d = await tapTile(page, 'sight-galleria-doria-pamphilj', 'Galleria Doria Pamphilj')
      await d.getByRole('button', { name: 'I was here' }).click()
      const t = await toastWith(page, 'Stamped: Galleria Doria Pamphilj')
      await t.getByRole('button', { name: 'Undo' }).click()
      await until(async () => (await stampsOf(page))['sight-galleria-doria-pamphilj']?.on === null, 'on: null')
      assert((await page.locator('section.set[data-set="art"] .set-n').textContent()).trim() === '2/7', 'the set does not read 2/7')
      assert(!(await tile(page, 'sight-galleria-doria-pamphilj').locator('svg.stamp').count()), 'the card still shows a stamp')
    }))

  await check('S4 Armando done stamps Armando only; Trastevere bars stamps nothing; Tonnarello never', async () => {
    const progress = JSON.parse(JSON.stringify(SEED))
    progress.stops['dinner-at-armando-al-pantheon'] = { status: 'done', at: '2026-10-09T18:00:00.000Z' }
    progress.stops['trastevere-bars'] = { status: 'done', at: '2026-10-10T21:10:00.000Z' }
    const { ctx, page, errors } = await phone(browser, { progress })
    try {
      await live(page, '2026-10-10T23:30')
      await page.goto(`${BASE}trips/${TRIP}/places`, { waitUntil: 'domcontentloaded' })
      await ready(page)
      await expandAll(page)
      assert((await page.locator('.tally').textContent()).includes('4 of 79 stamped'), 'not 4 stamped')
      assert(await tile(page, 'food-armando-al-pantheon').locator('svg.stamp').count() === 1, 'Armando is not stamped')
      for (const id of ['sight-pantheon', 'photo-pantheon']) assert(!(await tile(page, id).locator('svg.stamp').count()), `${id} is stamped`)
      await tile(page, 'food-tonnarello').click()
      const d = sheetOf(page, 'Tonnarello')
      await d.waitFor()
      assert((await d.locator('.note').textContent()).trim() === 'Not in your collection: tourist trap.', 'no trap note')
      assert(!(await d.getByRole('button', { name: /I ate here|Got the shot|I was here/ }).count()), 'a stamp button shows')
      await go(page, 'places?place=food-antico-caffe-greco')
      assert((await sheetOf(page, 'Antico Caffè Greco').locator('.note').textContent()).trim() === 'Not in your collection: closed.', 'no closed note')
      assert(!errors.length, errors.join(' / '))
    }
    finally {
      await ctx.close()
    }
  })

  await check('S5 removing the Vatican Museums stamp writes on: false, and it stays off after unticking and ticking the stop', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      const d = await tapTile(page, 'sight-vatican-museums', 'Vatican Museums')
      assert((await d.locator('.stamped').textContent()).replace(/\s+/g, ' ').includes('Stamped · Fri 9 Oct · from your plan'), 'no "from your plan"')
      await d.getByRole('button', { name: 'Remove stamp' }).click()
      await until(async () => (await stampsOf(page))['sight-vatican-museums']?.on === false, 'on: false')
      await go(page, 'map?day=fri&focus=vatican-museums-sistine-chapel')
      const card = page.locator('.selcard')
      await card.getByRole('button', { name: 'Done' }).click()
      await toastWith(page, 'Unticked: Vatican Museums')
      await card.getByRole('button', { name: 'Mark done' }).click()
      const t = await toastWith(page, 'Done: Vatican Museums')
      assert(!(await t.textContent()).includes('Stamped'), 'the tick says it stamped')
      assert((await stampsOf(page))['sight-vatican-museums']?.on === false, 'the record changed')
      await go(page, 'places')
      assert(!(await tile(page, 'sight-vatican-museums').locator('svg.stamp').count()), 'the Vatican card is stamped again')
    }))

  await check('S6 Fresh at live 30 Sep: "You can stamp places from Thu 8 Oct." and no stamp button', () =>
    withPhone(browser, 'places?place=sight-pantheon', { fresh: true, at: '2026-09-30T12:00' }, async ({ page }) => {
      const d = sheetOf(page, 'Pantheon')
      await d.waitFor()
      assert((await d.locator('.note').textContent()).trim() === 'You can stamp places from Thu 8 Oct.', 'no before-the-trip note')
      assert(!(await d.getByRole('button', { name: /I was here|I ate here|Got the shot/ }).count()), 'a stamp button shows')
    }))

  await check('S7 "Got the shot" on the Pantheon photo spot does not stamp the Pantheon sight, and the other way round', async () => {
    const closeSheet = async (page) => {
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'detached' })
    }
    await withPhone(browser, 'places?place=photo-pantheon', {}, async ({ page }) => {
      await sheetOf(page, 'Pantheon').getByRole('button', { name: 'Got the shot' }).click()
      await toastWith(page, 'Stamped: Pantheon · Morning light 1/10')
      const s = await stampsOf(page)
      assert(s['photo-pantheon']?.on === true && !s['sight-pantheon'], JSON.stringify(s))
      await closeSheet(page)
      await expandAll(page)
      assert(!(await tile(page, 'sight-pantheon').locator('svg.stamp').count()), 'the sight is stamped')
      assert(await tile(page, 'photo-pantheon').locator('svg.stamp').count() === 1, 'the photo spot is not stamped')
    })
    await withPhone(browser, 'places?place=sight-pantheon', {}, async ({ page }) => {
      await sheetOf(page, 'Pantheon').getByRole('button', { name: 'I was here' }).click()
      await toastWith(page, 'Stamped: Pantheon · Ancient sites 1/10')
      await closeSheet(page)
      await expandAll(page)
      assert(!(await tile(page, 'photo-pantheon').locator('svg.stamp').count()), 'the photo spot is stamped')
      assert(await tile(page, 'sight-pantheon').locator('svg.stamp').count() === 1, 'the sight is not stamped')
    })
  })

  await check('Preview: a stamp made while previewing is real and stays after "Back to live"', async () => {
    const { ctx, page, errors } = await phone(browser, { progress: SEED })
    try {
      await preview(page, FRI)
      await go(page, 'places?place=sight-galleria-spada')
      await sheetOf(page, 'Galleria Spada').getByRole('button', { name: 'I was here' }).click()
      await until(async () => (await stampsOf(page))['sight-galleria-spada']?.on === true, 'on: true')
      await page.keyboard.press('Escape')
      await page.getByRole('button', { name: 'Back to live' }).click()
      await expandAll(page)
      assert(await tile(page, 'sight-galleria-spada').locator('svg.stamp').count() === 1, 'the stamp went away')
      assert(!errors.length, errors.join(' / '))
    }
    finally {
      await ctx.close()
    }
  })

  await check('Before the trip: "Open on…" (Sunday hides the 9); after the trip: no Open today', async () => {
    await withPhone(browser, 'places', { fresh: true, at: '2026-09-30T12:00' }, async ({ page }) => {
      assert(!(await filterChip(page, 'Open today').count()), 'Open today shows before the trip')
      const sel = page.locator('.filters select')
      assert((await sel.locator('option').first().textContent()).trim() === 'Open on…', 'no "Open on…"')
      await sel.selectOption({ label: 'Open Sun 11 Oct' })
      await expandAll(page)
      assert((await tileIds(page)).length === 72, `${(await tileIds(page)).length} cards open on Sunday`)
      assert(!(await page.locator('.tile .status', { hasText: 'Closed today' }).count()), '"Closed today" before the trip')
    })
    await withPhone(browser, 'places', { at: '2026-10-20T12:00' }, async ({ page }) => {
      assert(!(await filterChip(page, 'Open today').count()), 'Open today shows after the trip')
      assert(!(await page.locator('.filters select').count()), '"Open on…" shows after the trip')
      assert(await page.locator('.tile').count() > 0, 'no cards')
    })
  })

  await check('"Open on…" takes a 44 px tap and is 16 px (an iPhone does not zoom into it), and the chip shows the day picked', () =>
    withPhone(browser, 'places', { fresh: true, at: '2026-09-30T12:00', width: 320 }, async ({ page }) => {
      const got = await page.evaluate(() => {
        const sel = document.querySelector('.filters select')
        const chip = sel.closest('.daysel')
        const s = sel.getBoundingClientRect()
        const c = chip.getBoundingClientRect()
        const x = c.left + c.width / 2
        const hits = [c.top - 4, c.top + c.height / 2, c.bottom + 4].every(y => document.elementFromPoint(x, y) === sel)
        return { h: s.height, w: s.width, chipW: c.width, font: Number.parseFloat(getComputedStyle(sel).fontSize), hits, text: chip.querySelector(':scope > span').textContent.trim() }
      })
      assert(got.h >= 44 && got.w >= got.chipW - 1, `the picker is ${got.w}x${got.h} over a ${got.chipW} px chip`)
      assert(got.font >= 16, `the picker is ${got.font} px`)
      assert(got.hits, 'a tap on the chip, or just above or below it, misses the picker')
      assert(got.text === 'Open on…', `chip: ${got.text}`)
      await page.locator('.filters select').selectOption({ label: 'Open Sun 11 Oct' })
      await until(async () => (await page.locator('.daysel > span').textContent()).trim() === 'Open Sun 11 Oct', 'the chip to say Open Sun 11 Oct')
      assert(await page.locator('.daysel').evaluate(e => e.classList.contains('on')), 'the chip does not look picked')
      await wide(page, 'Places with a day picked')
    }))

  await check('Offline: the cards, the filters and the place sheet keep working', () =>
    withPhone(browser, 'places', {}, async ({ page, ctx }) => {
      await ctx.setOffline(true)
      await filterChip(page, 'Free').click()
      await expandAll(page)
      assert(await page.locator('.tile').count() === 26, 'Free does not work offline')
      await filterChip(page, 'Free').click()
      await tile(page, 'sight-trevi-fountain').click()
      const d = sheetOf(page, 'Trevi Fountain')
      await d.waitFor()
      assert(await d.getByRole('link', { name: 'Go' }).count() === 1, 'no Go offline')
      await ctx.setOffline(false)
    }))

  await check('A place without coordinates offers Maps instead of Go, and no distance', () =>
    withPhone(browser, 'places?place=sight-st-peter-s-dome', { geolocation: { latitude: 41.9009, longitude: 12.4833 }, permissions: ['geolocation'] }, async ({ page }) => {
      const d = sheetOf(page, 'St Peter\'s dome')
      await d.waitFor()
      const maps = d.getByRole('link', { name: 'Maps' })
      assert(await maps.count() === 1 && !(await d.getByRole('link', { name: 'Go' }).count()), 'not Maps')
      assert((await maps.getAttribute('href')).startsWith('https://www.google.com/maps/search/'), 'Maps is not a search')
      assert(!(await d.locator('.away').count()), 'a distance shows')
      assert(await d.getByRole('link', { name: 'Photos' }).count() === 1, 'no Photos')
    }))

  await check('The sheet: price with ≈ ₺ for one amount, booking, open days with today outlined, plan row to the stop sheet', () =>
    withPhone(browser, 'places?place=sight-pantheon', {}, async ({ page }) => {
      const d = sheetOf(page, 'Pantheon')
      await d.waitFor()
      const facts = (await d.locator('.facts').textContent()).replace(/\s+/g, ' ')
      assert(facts.includes('€7 ≈ ₺391'), `price: ${facts}`)
      assert(facts.includes('Book ahead: Timed slot'), `booking: ${facts}`)
      assert(await d.locator('.dd').count() === 4, 'not four day pills')
      assert(await d.locator('.dd.today').textContent().then(t => t.includes('Fr')), 'Friday is not outlined')
      assert((await d.locator('.top .chip').first().textContent()).includes('Ancient sites'), 'no set chip')
      assert((await d.locator('.top .chip', { hasText: 'Top pick' }).count()) === 1, 'no Top pick chip')
      const plan = d.getByRole('button', { name: /In your plan: Fri 9 Oct · 17:15/ })
      await plan.click()
      await until(() => new URL(page.url()).searchParams.get('stop') === 'pantheon' && !new URL(page.url()).searchParams.has('place'), 'place replaced with stop')
      await until(async () => !(await sheetOf(page, 'Pantheon').count()) || (await page.getByRole('dialog').count()) === 1, 'one sheet')
    }))

  await check('The booking line hides for "No" and a dash; a sight with no data shows no open days', async () => {
    await withPhone(browser, 'places?place=sight-colosseum-night-tour', {}, async ({ page }) => {
      const d = sheetOf(page, 'Colosseum night tour')
      await d.waitFor()
      assert(!(await d.getByText(/Book ahead/).count()), 'a dash shows as Book ahead')
      assert(!(await d.locator('.dd').count()), 'open days show with no data')
    })
    await withPhone(browser, 'places?place=sight-spanish-steps', {}, async ({ page }) => {
      const d = sheetOf(page, 'Spanish Steps')
      await d.waitFor()
      assert(!(await d.getByText(/Book ahead/).count()), '"No" shows as Book ahead')
    })
  })

  await check('O2 /map?day=all&places=1: place pins, the got class on 3 stamped places, a tapped pin opens its sheet', () =>
    withPhone(browser, 'map?day=all&places=1', {}, async ({ page }) => {
      await until(() => page.locator('.mk.place').count(), 'place pins')
      assert(await page.locator('.mk.place').count() === trip.places.filter(p => p.place).length, 'not every place with coordinates has a pin')
      assert(await page.locator('.mk.place.got').count() === 3, `${await page.locator('.mk.place.got').count()} got pins`)
      const at = await page.evaluate(() => {
        for (const el of document.querySelectorAll('.leaflet-marker-icon')) {
          if (!el.querySelector('.mk.place')) continue
          const r = el.getBoundingClientRect()
          const x = r.left + r.width / 2
          const y = r.top + r.height / 2
          if (x < 30 || x > innerWidth - 30 || y < 220 || y > innerHeight - 220) continue
          const top = document.elementFromPoint(x, y)
          if (top && el.contains(top)) return { x, y, title: el.getAttribute('title') }
        }
        return null
      })
      assert(at, 'no place pin free to tap')
      await page.touchscreen.tap(at.x, at.y)
      await until(() => new URL(page.url()).searchParams.get('place'), 'place in the URL')
      await sheetOf(page, at.title).waitFor({ timeout: 6000 })
    }))

  await check('O2 while previewing, the preview bar does not cover the map\'s day chips (hit test)', async () => {
    const { ctx, page, errors } = await phone(browser, { progress: SEED })
    try {
      await preview(page, FRI)
      await go(page, 'map?day=all')
      await page.locator('.pvbar').waitFor()
      const covered = await page.evaluate(() => [...document.querySelectorAll('.dchip')].filter((c) => {
        const r = c.getBoundingClientRect()
        if (r.right <= 0 || r.left >= innerWidth) return false
        const x = Math.min(Math.max(r.left + r.width / 2, 2), innerWidth - 2)
        const top = document.elementFromPoint(x, r.top + r.height / 2)
        return !(top && c.contains(top))
      }).map(c => c.textContent.trim()))
      assert(!covered.length, `covered: ${covered.join(', ')}`)
      assert(!errors.length, errors.join(' / '))
    }
    finally {
      await ctx.close()
    }
  })

  for (const dark of [false, true]) {
    await check(`Map tiles from tile.openstreetmap.org with crossOrigin and attribution, nothing from CARTO, ${dark ? 'dimmed in dark mode' : 'undimmed in light mode'}, old cache deleted`, () =>
      withPhone(browser, 'places', { dark, provider: 'osm' }, async ({ page }) => {
        const asked = []
        page.on('request', r => asked.push(r.url()))
        // A cache left by an older version (it only holds watermarks now); opening a map deletes it.
        await page.evaluate(async () => {
          const c = await caches.open('map-tiles')
          await c.put(new Request('/old-tile.png'), new Response('x'))
        })
        await go(page, 'map?day=fri')
        await until(() => page.evaluate(() => [...document.querySelectorAll('img.leaflet-tile')].some(i => i.complete && i.naturalWidth > 0)), 'a loaded map tile', 20000)
        const info = await page.evaluate(() => ({
          srcs: [...document.querySelectorAll('img.leaflet-tile')].map(i => i.src),
          cors: [...document.querySelectorAll('img.leaflet-tile')].every(i => i.hasAttribute('crossorigin')),
          filter: getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter,
          attr: document.querySelector('.leaflet-control-attribution')?.textContent?.trim(),
          href: document.querySelector('.leaflet-control-attribution a')?.href,
        }))
        assert(info.srcs.length && info.srcs.every(s => s.startsWith('https://tile.openstreetmap.org/')), `tiles: ${info.srcs[0]}`)
        assert(info.cors, 'a tile without crossorigin')
        assert(!asked.some(u => u.includes('basemaps.cartocdn.com')), 'CARTO was asked')
        assert(info.attr === '© OpenStreetMap contributors', `attribution: ${info.attr}`)
        assert(info.href === 'https://www.openstreetmap.org/copyright', `attribution link: ${info.href}`)
        assert(dark ? info.filter !== 'none' : info.filter === 'none', `tile pane filter: ${info.filter}`)
        await until(() => page.evaluate(async () => !(await caches.has('map-tiles'))), 'the old map-tiles cache to go')
      }))
  }

  await check('The map card\'s "Mark done" gives the tick toast (with Undo)', () =>
    withPhone(browser, 'map?day=fri&focus=pantheon', {}, async ({ page }) => {
      const card = page.locator('.selcard')
      await card.getByRole('button', { name: 'Mark done' }).click()
      const t = await toastWith(page, 'Done: Pantheon')
      assert((await t.locator('.txt').textContent()).trim() === 'Done: Pantheon · Stamped', `toast: ${await t.locator('.txt').textContent()}`)
      assert(await t.getByRole('button', { name: 'Undo' }).count() === 1, 'no Undo')
      assert(await t.getByRole('button', { name: 'Log €7' }).count() === 1, 'no Log €7')
    }))

  await check('Stop editor: a stop added from a place saves placeId and starts at the next half hour today', () =>
    withPhone(browser, 'places?place=sight-capitoline-museums', {}, async ({ page }) => {
      const d = sheetOf(page, 'Capitoline Museums')
      await d.getByRole('button', { name: 'Add to plan' }).click()
      const ed = page.getByRole('dialog', { name: 'Add a stop' })
      await ed.waitFor()
      assert(await ed.locator('input.input').first().inputValue() === 'Capitoline Museums', 'title not filled in')
      assert(await ed.locator('input[type="time"]').first().inputValue() === '17:00', `start ${await ed.locator('input[type="time"]').first().inputValue()}`)
      await ed.getByRole('button', { name: 'Add stop' }).click()
      await toastWith(page, 'Stop added to your plan')
      const saved = await page.evaluate(id => (JSON.parse(localStorage.getItem('travel:trips:v1') || '[]').find(t => t.id === id)?.days ?? [])
        .flatMap(day => [...day.stops, ...Object.values(day.variants ?? {}).flatMap(x => x.stops)].map(s => ({ day: day.id, ...s })))
        .find(s => s.placeId === 'sight-capitoline-museums'), TRIP)
      assert(saved && saved.day === 'fri' && saved.start === 17 * 60, `saved: ${JSON.stringify(saved)}`)
      await until(async () => (await sheetOf(page, 'Capitoline Museums').locator('.planrow').textContent().catch(() => '')).includes('In your plan: Fri 9 Oct · 17:00'), 'the place in the plan')
    }))

  await check('Stop editor: a photo spot starts at its best light; the icon-only delete button is named "Delete stop"', async () => {
    await withPhone(browser, 'places?place=photo-pincio-terrace', {}, async ({ page }) => {
      await sheetOf(page, 'Pincio terrace').getByRole('button', { name: 'Add to plan' }).click()
      const ed = page.getByRole('dialog', { name: 'Add a stop' })
      await ed.waitFor()
      assert(await ed.locator('input[type="time"]').first().inputValue() === '18:00', `start ${await ed.locator('input[type="time"]').first().inputValue()}`)
    })
    await withPhone(browser, 'plan?edit=pantheon', { width: 320 }, async ({ page }) => {
      const del = page.getByRole('dialog', { name: 'Edit stop' }).getByRole('button', { name: 'Delete stop' })
      await del.waitFor()
      assert(!(await del.textContent()).trim() || (await del.locator('.hide-xs').isHidden()), 'the button is not icon-only at 320 px')
    })
  })

  await check('"Add to plan" from a place on the map\'s Saturday suggests Saturday, and the map behind stays on Saturday', () =>
    withPhone(browser, 'map?day=sat&places=1', {}, async ({ page }) => {
      await go(page, 'map?day=sat&places=1&place=sight-capitoline-museums')
      const d = sheetOf(page, 'Capitoline Museums')
      await d.waitFor()
      await d.getByRole('button', { name: 'Add to plan' }).click()
      const ed = page.getByRole('dialog', { name: 'Add a stop' })
      await ed.waitFor()
      assert(await ed.locator('select').first().inputValue() === 'sat', `the editor suggests ${await ed.locator('select').first().inputValue()}`)
      assert(new URL(page.url()).searchParams.get('day') === 'sat', `the map is on ${new URL(page.url()).searchParams.get('day')}`)
      assert((await page.locator('.dchip[aria-pressed="true"]').textContent()).includes('Sat'), 'the map\'s day chip changed')
      await ed.getByRole('button', { name: 'Cancel' }).click()
      await ed.waitFor({ state: 'detached' })
      assert((await page.locator('.dchip[aria-pressed="true"]').textContent()).includes('Sat'), 'the map is not on Saturday after Cancel')
    }))

  for (const width of [390, 320]) {
    for (const dark of [false, true]) {
      const tag = `${width} px ${dark ? 'dark' : 'light'}`
      await check(`N5 A1 A2 Places, the place sheet and the map at ${tag}`, () =>
        withPhone(browser, 'places', { width, dark }, async ({ page }) => {
          await wide(page, 'Places')
          const cols = await page.locator('section.set').first().locator('.tile').evaluateAll(els => els.slice(0, 3).map(e => Math.round(e.getBoundingClientRect().top)))
          assert(cols[0] === cols[1] && cols[2] > cols[0], `not 2 columns: ${cols.join(', ')}`)
          await targets(page, 'Places')
          const low = await contrastIssues(page, '.places')
          assert(!low.length, `Places contrast: ${low.join('; ')}`)
          await expandAll(page)
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2))
          await page.waitForTimeout(200)
          await targets(page, 'Places, halfway down')
          await wide(page, 'Places expanded')
          assert(!(await contrastIssues(page, '.places')).length, 'contrast further down')
          for (const [id, name] of [['sight-vatican-museums', 'Vatican Museums'], ['sight-galleria-doria-pamphilj', 'Galleria Doria Pamphilj'], ['food-tonnarello', 'Tonnarello']]) {
            await tile(page, id).scrollIntoViewIfNeeded()
            await tile(page, id).click()
            const d = sheetOf(page, name)
            await d.waitFor()
            await page.waitForTimeout(350)
            await wide(page, `the ${name} sheet`)
            await targets(page, `the ${name} sheet`)
            const lowSheet = await contrastIssues(page, '[role="dialog"]')
            assert(!lowSheet.length, `${name} sheet contrast: ${lowSheet.join('; ')}`)
            await page.keyboard.press('Escape')
            await d.waitFor({ state: 'detached' })
          }
          await go(page, 'map?day=all&places=1')
          await until(() => page.locator('.mk.place').count(), 'place pins')
          await wide(page, 'the map')
          await targets(page, 'the map')
        }))
    }
  }

  // Fresh before the trip, and Seed S in a preview: Places and a sheet, at both widths and in both themes.
  for (const [width, dark] of [[320, false], [390, true]]) {
    const tag = `${width} px ${dark ? 'dark' : 'light'}`
    await check(`N5 A1 A2 Fresh at live 30 Sep: Places and a place sheet at ${tag}`, () =>
      withPhone(browser, 'places', { fresh: true, at: '2026-09-30T12:00', width, dark }, async ({ page }) => {
        assert((await page.locator('.tally').textContent()).includes('0 of 79 stamped'), 'not 0 stamped')
        await wide(page, 'Places')
        await targets(page, 'Places')
        assert(!(await contrastIssues(page, '.places')).length, `Places contrast: ${(await contrastIssues(page, '.places')).join('; ')}`)
        await tile(page, 'sight-pantheon').click()
        await sheetOf(page, 'Pantheon').waitFor()
        await page.waitForTimeout(350)
        await wide(page, 'the sheet')
        await targets(page, 'the sheet')
        assert(!(await contrastIssues(page, '[role="dialog"]')).length, `sheet contrast: ${(await contrastIssues(page, '[role="dialog"]')).join('; ')}`)
      }))
    await check(`N5 A1 A2 Seed S in a preview of Fri 16:40: Places and a place sheet at ${tag}`, async () => {
      const { ctx, page, errors } = await phone(browser, { progress: SEED, width, dark })
      try {
        await preview(page, FRI)
        await go(page, 'places')
        await page.locator('.pvbar').waitFor()
        await wide(page, 'Places')
        await targets(page, 'Places')
        assert(!(await contrastIssues(page, '.places')).length, `Places contrast: ${(await contrastIssues(page, '.places')).join('; ')}`)
        await tile(page, 'sight-colosseum-forum-palatine-24h').click()
        await sheetOf(page, 'Colosseum + Forum + Palatine (24h)').waitFor()
        await page.waitForTimeout(350)
        await wide(page, 'the sheet')
        await targets(page, 'the sheet')
        assert(!(await contrastIssues(page, '[role="dialog"]')).length, `sheet contrast: ${(await contrastIssues(page, '[role="dialog"]')).join('; ')}`)
        assert(!errors.length, errors.join(' / '))
      }
      finally {
        await ctx.close()
      }
    })
  }

  // ---------- fixes from the final review ----------
  await check('Review: in the flat view each card names its set on the art, so the two Trevi Fountain cards differ; the grouped view does not', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      assert(!(await page.locator('section.set .tile .chip.set').count()), 'set chips in the grouped view')
      await page.getByRole('button', { name: 'Search places' }).click()
      await page.getByRole('searchbox', { name: 'Search places' }).fill('trevi')
      await until(() => page.locator('.grid.flat').count(), 'the flat list')
      const sets = []
      for (const id of ['sight-trevi-fountain', 'photo-trevi-fountain']) {
        const t = tile(page, id)
        assert(await t.count() === 1, `no card ${id}`)
        sets.push((await t.locator('.flags .chip.set').textContent()).trim())
      }
      assert(sets[0] === 'Piazzas & views' && sets[1] === 'Morning light', `sets: ${sets.join(' / ')}`)
      const tall = await page.locator('.grid.flat .tile').evaluateAll(els => els.map(e => e.getBoundingClientRect().height).filter(h => h > 200.5))
      assert(!tall.length, `cards over 200 px: ${tall.join(', ')}`)
    }))

  await check('Review: the header\'s "Top picks 2/8" chip shows a chevron: it is a link to Badges, not the Top picks filter', () =>
    withPhone(browser, 'places', {}, async ({ page }) => {
      const chip = page.getByRole('link', { name: 'Top picks 2/8' })
      assert((await chip.innerHTML()).includes('M9 6l6 6-6 6'), 'no chevron on the chip')
    }))

  await check('Review: a sheet\'s close button over light art keeps 3:1 around its white cross (dark glass)', async () => {
    const low = []
    for (const [path, name] of [['places?place=food-antico-caffe-greco', 'Antico Caffè Greco'], ['places?place=sight-vatican-museums', 'Vatican Museums'], ['plan?day=fri&stop=vatican-museums-sistine-chapel', 'Vatican Museums + Sistine Chapel']]) {
      await withPhone(browser, path, {}, async ({ page }) => {
        const btn = sheetOf(page, name).getByRole('button', { name: 'Close', exact: true })
        await btn.waitFor()
        await page.waitForTimeout(500)
        const box = await btn.boundingBox()
        const cross = await btn.evaluate(el => getComputedStyle(el).color)
        await page.addStyleTag({ content: '[role="dialog"] button.close svg { visibility: hidden !important; }' })
        await page.waitForTimeout(150)
        const png = (await page.screenshot({ clip: { x: box.x + box.width / 4, y: box.y + box.height / 4, width: box.width / 2, height: box.height / 2 } })).toString('base64')
        // The median contrast of the cross's colour against the disc behind it, pixel by pixel.
        const median = await page.evaluate(async ([b64, fg]) => {
          const img = new Image()
          img.src = `data:image/png;base64,${b64}`
          await img.decode()
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          const g = c.getContext('2d')
          g.drawImage(img, 0, 0)
          const d = g.getImageData(0, 0, c.width, c.height).data
          const lin = (v) => {
            const x = v / 255
            return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
          }
          const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b)
          const f = fg.match(/[\d.]+/g).map(Number)
          const lf = lum(f[0], f[1], f[2])
          const all = []
          for (let i = 0; i < d.length; i += 4) {
            const lb = lum(d[i], d[i + 1], d[i + 2])
            all.push((Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05))
          }
          all.sort((a, b) => a - b)
          return all[all.length >> 1]
        }, [png, cross])
        if (median < 3) low.push(`${name}: ${median.toFixed(2)}:1`)
      })
    }
    assert(!low.length, low.join('; '))
  })

  await check('A4 no em dash (U+2014) in the files of this package', () => {
    const EM_DASH = String.fromCharCode(8212)
    const hits = OWN_FILES.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(EM_DASH))
    assert(!hits.length, `em dash in ${hits.join(', ')}`)
  })

  if (process.argv.includes('--build')) {
    // Its own port, so it can run beside a build another check serves on lib's 4173.
    const srv = await serveBuild(4179)
    try {
      for (const dark of [false, true]) {
        await check(`O1 the generated site's map works offline from cached OpenStreetMap tiles${dark ? ', dimmed in dark mode' : ''}`, async () => {
          const { ctx, page, errors } = await phone(browser, { progress: SEED, sw: true, dark })
          await ctx.addInitScript(() => localStorage.setItem('travel:map:provider', 'osm'))
          const asked = []
          page.on('request', r => asked.push(r.url()))
          try {
            const url = `${srv.url}trips/${TRIP}/map?day=fri`
            await page.goto(url, { waitUntil: 'domcontentloaded' })
            await ready(page)
            await page.waitForFunction(() => navigator.serviceWorker?.controller, null, { timeout: 20000 })
            // Now the service worker sees the tile requests: load them once online.
            await page.reload({ waitUntil: 'domcontentloaded' })
            await ready(page)
            await until(() => page.evaluate(async () => (await (await caches.open('map-tiles-v2')).keys()).length >= 4), 'tiles in map-tiles-v2', 20000)
            await ctx.setOffline(true)
            await page.reload({ waitUntil: 'domcontentloaded' })
            await ready(page)
            await until(() => page.evaluate(() => [...document.querySelectorAll('img.leaflet-tile')].filter(i => i.complete && i.naturalWidth > 0).length >= 4), 'tiles shown offline', 15000)
            // Real map tiles, not the 2 KB "API KEY REQUIRED" images the old cache held.
            const sizes = await page.evaluate(async () => {
              const c = await caches.open('map-tiles-v2')
              return Promise.all((await c.keys()).map(async k => (await (await c.match(k)).blob()).size))
            })
            assert(sizes.filter(s => s > 5000).length >= 4, `cached tile sizes: ${sizes.join(', ')}`)
            assert(!asked.some(u => u.includes('basemaps.cartocdn.com')), 'CARTO was asked')
            const filter = await page.evaluate(() => getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter)
            assert(dark ? filter !== 'none' : filter === 'none', `tile pane filter: ${filter}`)
            assert(!errors.length, errors.join(' / '))
          }
          finally {
            await ctx.close()
          }
        })
      }
    }
    finally {
      await srv.close()
    }
  }
}
finally {
  await browser.close()
}
