// Browser checks of the landing page, the signed-in home and the account screens (spec D30 to D39; acceptance W1,
// W2, W6, W7 and W8, and the landing's sign-in button), on phone-sized Chromium from ./lib.mjs:
//   node tests/e2e/landing.e2e.mjs            (against TRAVELS_URL or the dev server)
//   node tests/e2e/landing.e2e.mjs --build    (serves .output/public on port 4173 and checks that)
// Nothing here reaches Firebase or Google: every request that would leave the app's own address is stopped (and noted),
// and the devices sign in only as lib.mjs's made-up TEST_ACCOUNT, remembered on the device.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import {
  BASE, TEST_ACCOUNT, TRIP, assert, check, go, live, noSideScroll, phone, ready, romeCopy, seedS, serveBuild, sideScroll, smallTargets, useBase,
} from './lib.mjs'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const srv = process.argv.includes('--build') ? await serveBuild(4173) : null
if (srv) useBase(srv.url)
const ORIGIN = new URL(BASE).origin
const HOME_PATH = new URL(BASE).pathname
const browser = await chromium.launch()

const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim()
/** U+2014, written by its code so this file never holds one. */
const EM_DASH = String.fromCharCode(0x2014)
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** The seven jobs of the landing page's feature cards, in order (spec D38). */
const FEATURES = [
  ['now', 'Now'], ['plan', 'Plan'], ['places', 'Places'], ['costs', 'Costs'], ['badges', 'Badges and ranks'],
  ['offline', 'Offline and on every device'], ['private', 'Private'],
]

/**
 * A phone from lib.mjs (signed in as TEST_ACCOUNT unless `signedOut`), whose requests to any other address than the
 * app's are stopped: `away` lists them. `landingSeen()` says whether the landing page was ever on screen.
 */
async function device(opts = {}) {
  const d = await phone(browser, opts)
  d.away = []
  await d.ctx.route('**/*', (route) => {
    const url = route.request().url()
    if (url.startsWith(ORIGIN) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue()
    d.away.push(url)
    return route.abort()
  })
  await d.ctx.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector('main.landing')) window.__landingSeen = true
    }).observe(document, { childList: true, subtree: true })
  })
  d.landingSeen = () => d.page.evaluate(() => !!window.__landingSeen)
  return d
}

/** A full load of an app path ("", "settings", "trips/rome-2026-10/now"). */
async function open(page, path = '') {
  await page.goto(`${BASE}${path.replace(/^\//, '')}`, { waitUntil: 'domcontentloaded' })
  await ready(page)
}

const stored = (page, key) => page.evaluate((k) => {
  try {
    return JSON.parse(localStorage.getItem(k) ?? 'null')
  }
  catch {
    return 'unreadable'
  }
}, key)

async function until(what, fn, timeout = 8000) {
  const end = Date.now() + timeout
  let last
  while (Date.now() < end) {
    last = await fn()
    if (last) return last
    await sleep(120)
  }
  throw new Error(`timed out: ${what}`)
}

const onLanding = async page => (await page.locator('main.landing').count()) === 1 && new URL(page.url()).pathname === HOME_PATH

/**
 * Text whose contrast with what is behind it is under `min` (WCAG: 4.5 for text). The colours come from the computed
 * styles: the text colour (with every opacity above it) over the background colours of its boxes, composited from the
 * first opaque one. Text in SVG art, in 1 px screen-reader text, in disabled controls and on a picture is left out.
 */
async function lowContrast(page, min = 4.5) {
  return page.evaluate((MIN) => {
    const parse = (c) => {
      let m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/.exec(c)
      if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : m[5] ? m[4] / 100 : +m[4]]
      m = /^color\(srgb\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/.exec(c)
      if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : m[5] ? m[4] / 100 : +m[4]]
      return null
    }
    const over = (top, under) => [0, 1, 2].map(i => top[i] * top[3] + under[i] * (1 - top[3])).concat(1)
    const lum = (c) => {
      const f = (v) => {
        const x = v / 255
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])
    }
    const ratio = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (hi + 0.05) / (lo + 0.05)
    }
    /** The colour behind an element, or null when it is a picture or a gradient. */
    function behind(el) {
      const layers = []
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e)
        if (s.backgroundImage && s.backgroundImage !== 'none') return null
        const c = parse(s.backgroundColor)
        if (c && c[3] > 0) {
          layers.push(c)
          if (c[3] >= 1) break
        }
      }
      return layers.reverse().reduce((under, c) => over(c, under), [255, 255, 255, 1])
    }
    const out = []
    const seen = new Set()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || seen.has(el) || !n.textContent.trim()) continue
      seen.add(el)
      if (el.closest('svg, .sr-only, :disabled, [aria-disabled="true"]')) continue
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      const s = getComputedStyle(el)
      if (s.visibility === 'hidden') continue
      let alpha = 1
      for (let e = el; e; e = e.parentElement) alpha *= +getComputedStyle(e).opacity
      if (alpha < 0.05) continue
      const fg = parse(s.color)
      const bg = behind(el)
      if (!fg || !bg) continue
      const k = ratio(over([fg[0], fg[1], fg[2], fg[3] * alpha], bg), bg)
      if (k < MIN) out.push({ text: flat(n.textContent).slice(0, 40), ratio: Math.round(k * 100) / 100, color: s.color, cls: typeof el.className === 'string' ? el.className : '' })
    }
    return out
    function flat(t) {
      return String(t).replace(/\s+/g, ' ').trim()
    }
  }, min)
}

/** Scrolls through the whole page (lazy pictures draw), then back to the top. */
async function scrollThrough(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  const vh = await page.evaluate(() => innerHeight)
  for (let y = 0; y < h; y += Math.round(vh * 0.8)) {
    await page.evaluate(top => scrollTo(0, top), y)
    await sleep(90)
  }
  await page.evaluate(() => scrollTo(0, 0))
  await sleep(200)
}

/** A trip only an old device has (from before accounts): it must never show on the landing page. */
function oldTrip() {
  const t = romeCopy()
  delete t.seedId
  delete t.seedVersion
  return { ...t, id: 'lisbon-2026-11', title: 'Lisbon Hideaway', destination: 'Lisbon', country: 'Portugal', subtitle: 'Only on this phone', edited: true }
}

try {
  // ---------- W1: a device with no account ----------
  {
    const d = await device({ signedOut: true })
    await check('W1 a fresh device at "/" sees the landing page (Travels, the promise, Sign in with Google) and nothing else', async () => {
      await open(d.page)
      assert(await onLanding(d.page), `not the landing page at ${d.page.url()}`)
      assert(flat(await d.page.locator('h1').first().innerText()).toLowerCase() === 'travels', 'no "Travels" heading')
      const text = flat(await d.page.locator('body').innerText())
      for (const s of ['Your trip, live.', 'Sign in with Google', 'Free · private to your Google account · works offline', 'How it works']) assert(text.includes(s), `missing "${s}"`)
      assert(!(await d.page.locator('.home, .tcard, .shell').count()), 'the trips home or a trip shows')
      assert(await d.page.title() === 'Travels: your trip, live', `title: ${await d.page.title()}`)
      // D39: the data is kept under the Google sign-in, in the app's cloud (not in the Google account itself).
      const priv = flat(await d.page.locator('[data-feature="private"]').innerText())
      assert(priv.includes('stored under your Google sign-in') && priv.includes('No other account can open it') && !/saved to your own Google account|only you can see/.test(priv), `the Private card: ${priv}`)
      assert(!d.errors.length, d.errors.join(' / '))
    })
    for (const path of [`trips/${TRIP}/now`, 'notes', 'settings', 'trips/new']) {
      await check(`W1 /${path} on a device with no account goes to "/" and the landing page`, async () => {
        await open(d.page, path)
        await until(`back at "/" from /${path}`, () => onLanding(d.page))
        assert(!d.errors.length, d.errors.join(' / '))
      })
    }
    await check('W1 moving inside the app (client-side) to /settings also lands on "/"', async () => {
      await open(d.page)
      await go(d.page, '/settings')
      await until('back at "/"', () => onLanding(d.page))
    })
    await ctxClose(d)
  }
  {
    const d = await device({ signedOut: true, trips: [oldTrip()], progress: seedS() })
    await check('W1 a device with trips but no account (from before accounts) shows none of them on the landing page, and keeps them', async () => {
      await open(d.page)
      assert(await onLanding(d.page), 'not the landing page')
      await scrollThrough(d.page)
      const text = flat(await d.page.locator('body').innerText())
      assert(!/Lisbon|Hideaway|Only on this phone/.test(text), 'the device\'s own trip shows')
      assert(!(await d.page.locator('.tcard, .stats, .livecard').count()), 'trip cards show')
      await open(d.page, 'trips/lisbon-2026-11/now')
      await until('back at "/"', () => onLanding(d.page))
      const kept = await stored(d.page, 'travel:trips:v1')
      assert(Array.isArray(kept) && kept.some(t => t.id === 'lisbon-2026-11'), 'the device copy was changed')
    })
    await ctxClose(d)
  }
  {
    // D43: the notes (the Rome research and planning chat among them) load only for the signed-in home.
    const d = await device({ signedOut: true })
    const scripts = []
    d.page.on('response', (r) => {
      if ((r.headers()['content-type'] ?? '').includes('javascript')) scripts.push(r.text().catch(() => ''))
    })
    await check('D43 the landing page loads none of the notes', async () => {
      await open(d.page)
      await scrollThrough(d.page)
      const bodies = await Promise.all(scripts)
      assert(bodies.length > 3, `only ${bodies.length} scripts seen`)
      assert(!bodies.some(b => b.includes('Conquer Rome') || b.includes('our planning chat')), 'a note came with the landing page')
    })
    await ctxClose(d)
  }

  // ---------- W2: the landing page on phones and a desktop, light and dark ----------
  const SIZES = [
    { name: '390 x 844', width: 390, height: 844, phone: true },
    { name: '320 x 640', width: 320, height: 640, phone: true },
    { name: '1280 x 800', width: 1280, height: 800, phone: false },
  ]
  for (const size of SIZES) {
    for (const dark of [false, true]) {
      const label = `${size.name}${dark ? ', dark' : ''}`
      const extra = size.phone ? {} : { isMobile: false, hasTouch: false, deviceScaleFactor: 1 }
      const d = await device({ signedOut: true, width: size.width, height: size.height, dark, ...extra })
      await check(`W2 landing at ${label}: no sideways scroll, targets of 44 px, text at 4.5:1, all seven features, one sign-in button above the fold, only the app's own address asked`, async () => {
        await open(d.page)
        await d.page.evaluate(() => document.fonts.ready)
        const fold = await d.page.evaluate(() => {
          const shown = [...document.querySelectorAll('button')].filter(b => /Sign in with Google/.test(b.textContent))
          return shown.map((b) => {
            const r = b.getBoundingClientRect()
            return { top: r.top, bottom: r.bottom, inCover: !!b.closest('.cover'), gold: b.classList.contains('gold') }
          })
        })
        const above = fold.filter(b => b.top >= 0 && b.bottom <= size.height)
        assert(above.length === 1 && above[0].inCover, `sign-in buttons above the fold: ${JSON.stringify(fold)}`)
        await scrollThrough(d.page)
        assert(await noSideScroll(d.page), `sideways scroll: ${JSON.stringify(await sideScroll(d.page))}`)
        const small = await smallTargets(d.page)
        assert(!small.length, `small targets: ${JSON.stringify(small)}`)
        const low = await lowContrast(d.page)
        assert(!low.length, `low contrast: ${JSON.stringify(low.slice(0, 6))}`)
        const names = await d.page.locator('[data-feature]').evaluateAll(els => els.map(e => [e.dataset.feature, e.querySelector('h3')?.textContent.replace(/\s+/g, ' ').trim()]))
        assert(JSON.stringify(names) === JSON.stringify(FEATURES), `feature cards: ${JSON.stringify(names)}`)
        assert(!d.away.length, `requests away from the app: ${d.away.join(', ')}`)
        assert(!d.errors.length, d.errors.join(' / '))
      })
      await ctxClose(d)
    }
  }

  // ---------- the landing's sign-in buttons ----------
  {
    const d = await device({ signedOut: true })
    await check('Sign in with Google on the landing page calls signIn (the cover\'s button and the last one), and the message shows under the button used', async () => {
      await open(d.page)
      const hasHandle = await d.page.evaluate(() => !!document.querySelector('main.landing')?.__vueParentComponent?.setupState?.cloud)
      if (!hasHandle) {
        console.log('     (the stand-in for signIn needs the dev server\'s component handles: checked through the real sign-in below)')
        return
      }
      await d.page.evaluate(() => {
        const cloud = document.querySelector('main.landing').__vueParentComponent.setupState.cloud
        window.__signIns = 0
        cloud.signIn = () => {
          window.__signIns++
          cloud.message.value = `Test message ${window.__signIns}`
          return Promise.resolve()
        }
      })
      const buttons = d.page.getByRole('button', { name: 'Sign in with Google' })
      assert(await buttons.count() === 2, `${await buttons.count()} sign-in buttons`)
      await buttons.first().click()
      assert(await d.page.evaluate(() => window.__signIns) === 1, 'the cover\'s button did not call signIn')
      assert(flat(await d.page.locator('.cover .msg').textContent()) === 'Test message 1', 'no message under the cover\'s button')
      await buttons.last().click()
      assert(await d.page.evaluate(() => window.__signIns) === 2, 'the last button did not call signIn')
      assert(flat(await d.page.locator('.how .msg').textContent()) === 'Test message 2', 'no message under the last button')
      assert(!flat(await d.page.locator('.cover .msg').textContent()), 'the message shows twice')
    })
    await ctxClose(d)
  }
  {
    const d = await device({ signedOut: true })
    await check('the real sign-in starts from the cover\'s button (Google\'s sign-in script is asked for, and stopped here), then the button is back with a message', async () => {
      await open(d.page)
      // Firebase is loaded ahead of the tap (prepare), from the app's own address only.
      await sleep(800)
      assert(!d.away.length, `asked before the tap: ${d.away.join(', ')}`)
      await d.page.locator('.cover').getByRole('button', { name: 'Sign in with Google' }).click()
      await until('a request for Google\'s sign-in', () => d.away.some(u => /apis\.google\.com|\/__\/auth\/|accounts\.google\.com/.test(u)), 10000)
      const msg = d.page.locator('.cover .msg')
      await until('a message under the button', async () => flat(await msg.textContent()), 15000)
      await until('the button is back', async () => (await d.page.locator('.cover').getByRole('button', { name: 'Sign in with Google' }).isEnabled()), 15000)
      assert(!d.errors.length, d.errors.join(' / '))
    })
    await ctxClose(d)
  }

  // ---------- a remembered account opens straight into its trips ----------
  {
    const d = await device({ progress: seedS() })
    await check('a remembered account opens into its trips at "/" and on a trip\'s page, never showing the landing page, with no "Sign in again" while its session isn\'t checked', async () => {
      await open(d.page)
      await d.page.locator('.tcard').first().waitFor()
      assert(!(await d.landingSeen()), 'the landing page showed')
      assert(!(await d.page.locator('.again').count()), '"Sign in again" shows without Firebase having answered')
      assert(await d.page.title() === 'Travels', `title: ${await d.page.title()}`)
      await open(d.page, `trips/${TRIP}/now`)
      assert(new URL(d.page.url()).pathname.endsWith(`/trips/${TRIP}/now`), `sent to ${d.page.url()}`)
      assert(!(await d.landingSeen()), 'the landing page showed')
      assert(!d.errors.length, d.errors.join(' / '))
    })
    await ctxClose(d)
  }

  // ---------- W6: signed in with no trips ----------
  {
    const d = await device({ trips: [] })
    await check('W6 signed in with no trips: "No trips yet" with "Plan a trip" (to /trips/new) and "Try the sample trip"', async () => {
      await open(d.page)
      const card = d.page.locator('.firsttrip')
      await card.waitFor()
      assert(flat(await card.innerText()).includes('No trips yet'), 'no "No trips yet"')
      const plan = card.getByRole('link', { name: 'Plan a trip' })
      assert(new URL(await plan.getAttribute('href'), BASE).pathname.endsWith('/trips/new'), 'Plan a trip does not go to /trips/new')
      assert(await card.getByRole('button', { name: 'Try the sample trip' }).isVisible(), 'no Try the sample trip')
      assert(!(await d.page.locator('.actions').getByRole('link', { name: 'New trip' }).count()), 'New trip shows twice')
      await plan.click()
      await until('the new-trip page', () => new URL(d.page.url()).pathname.endsWith('/trips/new'))
      assert(!d.errors.length, d.errors.join(' / '))
    })
    await check('W6 "Try the sample trip" adds the sample with its seedId and opens it', async () => {
      await open(d.page)
      await d.page.locator('.firsttrip').getByRole('button', { name: 'Try the sample trip' }).click()
      await until('the sample\'s Now', () => new URL(d.page.url()).pathname.endsWith(`/trips/${TRIP}/now`))
      const trips = await until('the stored sample', async () => {
        const t = await stored(d.page, 'travel:trips:v1')
        return Array.isArray(t) && t.length ? t : null
      })
      const want = romeCopy()
      assert(trips.length === 1 && trips[0].id === TRIP && trips[0].seedId === want.seedId, `stored: ${JSON.stringify(trips.map(t => [t.id, t.seedId]))}`)
      assert(trips[0].seedVersion === want.seedVersion && trips[0].edited === false, `seedVersion ${trips[0].seedVersion}, edited ${trips[0].edited}`)
      assert(!d.errors.length, d.errors.join(' / '))
    })
    /** Gives the stored sample an older plan version and a change of its own, as when a newer plan was pushed. */
    const older = (v, title) => d.page.evaluate(([v, title, id]) => {
      const list = JSON.parse(localStorage.getItem('travel:trips:v1'))
      const t = list.find(x => x.id === id)
      Object.assign(t, { seedVersion: v, edited: true, title })
      localStorage.setItem('travel:trips:v1', JSON.stringify(list))
    }, [v, title, TRIP])
    await check('W6 a newer version of the sample\'s plan still reaches it: Keep mine keeps your copy', async () => {
      await older('0ld0ld00', 'Rome, my way')
      await open(d.page, `trips/${TRIP}/now`)
      const bar = d.page.locator('.updbar')
      await bar.waitFor()
      await bar.getByRole('button', { name: 'Keep mine' }).click()
      await until('the bar gone', async () => !(await bar.count()))
      const t = (await stored(d.page, 'travel:trips:v1')).find(x => x.id === TRIP)
      assert(t.title === 'Rome, my way' && t.seedVersion === romeCopy().seedVersion, `after Keep mine: ${t.title}, ${t.seedVersion}`)
      await open(d.page, `trips/${TRIP}/now`)
      assert(!(await d.page.locator('.updbar').count()), 'offered again after Keep mine')
    })
    await check('W6 ... and Update takes the newer plan', async () => {
      await older('0ld0ld01', 'Rome, my way')
      await open(d.page, `trips/${TRIP}/now`)
      const bar = d.page.locator('.updbar')
      await bar.waitFor()
      await bar.getByRole('button', { name: 'Update' }).click()
      await until('the bar gone', async () => !(await bar.count()))
      const t = (await stored(d.page, 'travel:trips:v1')).find(x => x.id === TRIP)
      assert(t.title === 'Rome' && t.seedId === TRIP && t.seedVersion === romeCopy().seedVersion, `after Update: ${t.title}, ${t.seedVersion}`)
      assert(!d.errors.length, d.errors.join(' / '))
    })
    await ctxClose(d)
  }
  // D37: the sample opens on the live guide it is there to show, as a preview of its second day at 16:40 (the
  // moment the landing page shows), unless the sample's dates are today.
  for (const [at, preview] of [['2026-09-30T12:00', true], ['2026-12-02T12:00', true], ['2026-10-10T11:00', false]]) {
    const d = await device({ trips: [] })
    await live(d.page, at)
    await check(`D37 "Try the sample trip" on ${at.slice(0, 10)} opens ${preview ? 'a preview of Fri 9 Oct 16:40 on Now' : 'the live guide'}`, async () => {
      await open(d.page)
      await d.page.locator('.firsttrip').getByRole('button', { name: 'Try the sample trip' }).click()
      await until('the sample\'s Now', () => new URL(d.page.url()).pathname.endsWith(`/trips/${TRIP}/now`))
      await ready(d.page)
      const bar = d.page.locator('.pvbar')
      if (preview) {
        assert(new URL(d.page.url()).searchParams.get('at') === '2026-10-09T16:40', `opened ${d.page.url()}`)
        await bar.waitFor({ timeout: 5000 })
        assert(flat(await bar.innerText()).includes('16:40'), `preview bar: ${flat(await bar.innerText())}`)
        assert(flat(await d.page.locator('main, .shell').first().innerText()).includes('Pantheon'), 'Now does not show the 16:40 moment (next: Pantheon)')
      }
      else {
        assert(!new URL(d.page.url()).searchParams.get('at'), `opened ${d.page.url()}`)
        assert(!(await bar.count()), 'a preview opened on the trip\'s own dates')
      }
      assert(!d.errors.length, d.errors.join(' / '))
    })
    await ctxClose(d)
  }
  {
    // D43: another trip's notes stay out of an account that doesn't have that trip.
    const d = await device({ trips: [] })
    const listed = async () => (await d.page.locator('.notes .ncard, .notes a').allInnerTexts()).map(flat).join(' | ')
    await check('D43 a new account\'s home and Notes list only the notes of no trip (the how-to); the sample brings its own', async () => {
      await open(d.page)
      await d.page.getByRole('heading', { name: 'Notes & chats' }).waitFor()
      const home = await listed()
      assert(home.includes('How to use the Travels app') && !/Rome|planning chat|Conquer/.test(home), `home lists: ${home}`)
      await open(d.page, 'notes')
      const all = flat(await d.page.locator('.notes-page').innerText())
      assert(all.includes('How to use the Travels app') && !/our planning chat|Conquer Rome|illustrated Rome/.test(all), `Notes lists: ${all.slice(0, 300)}`)
      await open(d.page)
      await d.page.locator('.firsttrip').getByRole('button', { name: 'Try the sample trip' }).click()
      await until('the sample\'s Now', () => new URL(d.page.url()).pathname.endsWith(`/trips/${TRIP}/now`))
      await open(d.page)
      await d.page.getByRole('heading', { name: 'Notes & chats' }).waitFor()
      assert(/planning chat/.test(await listed()), `with the sample, home lists: ${await listed()}`)
      assert(!d.errors.length, d.errors.join(' / '))
    })
    await check('a note\'s Back link never leaves the app (?from=//another-site)', async () => {
      await open(d.page, 'notes/2026-09-30-how-to-use-travels?from=//evil.example/x')
      const href = await d.page.locator('a[aria-label="Back"]').first().getAttribute('href')
      assert(href && href.startsWith('/') && !href.startsWith('//') && !href.includes('evil'), `Back goes to ${href}`)
    })
    await ctxClose(d)
  }
  // The home's header holds four buttons for every signed-in device: each keeps 44 x 44, and the logo stays whole.
  for (const width of [390, 360, 320]) {
    const d = await device({ width })
    await check(`the home's header at ${width} px: the Travels link and each button at least 44 x 44, the logo whole, nothing cut`, async () => {
      await open(d.page)
      const m = await d.page.evaluate(() => {
        const top = document.querySelector('.home-top')
        const size = (el) => {
          const r = el.getBoundingClientRect()
          return [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]
        }
        return {
          controls: [...top.querySelectorAll('a, button')].map(el => [el.getAttribute('aria-label') ?? '', ...size(el)]),
          logo: size(top.querySelector('.brand svg')),
          cut: top.scrollWidth - top.clientWidth,
        }
      })
      assert(m.controls.length === 5, `controls: ${JSON.stringify(m.controls)}`)
      const small = m.controls.filter(([, w, h]) => w < 44 || h < 44)
      assert(!small.length, `under 44 px: ${JSON.stringify(small)}`)
      assert(m.logo[0] >= 29.5 && m.logo[1] >= 29.5, `the logo is ${m.logo.join(' x ')}`)
      assert(m.cut <= 0 && await noSideScroll(d.page), `the header overflows by ${m.cut} px`)
    })
    await ctxClose(d)
  }
  {
    const d = await device({ trips: [] })
    await check('Settings offers the sample trip while it isn\'t on the device, and Add puts it there', async () => {
      await open(d.page, 'settings')
      const sec = d.page.locator('section').filter({ has: d.page.getByRole('heading', { name: 'Try the sample trip' }) })
      await sec.getByRole('button', { name: /Add the sample trip/ }).click()
      await until('the toast', async () => flat(await d.page.locator('body').innerText()).includes('Added the sample trip: Rome'))
      const t = await stored(d.page, 'travel:trips:v1')
      assert(Array.isArray(t) && t.length === 1 && t[0].seedId === TRIP, `stored: ${JSON.stringify(t?.map?.(x => x.id))}`)
      await until('the section gone', async () => !(await sec.count()))
    })
    await ctxClose(d)
  }

  // ---------- W7: signing out ----------
  {
    // The remembered account's trip and progress have never reached its cloud copy (no sync memory): 2 changes.
    const d = await device({ progress: seedS() })
    await check('W7 Sign out with changes not in the account yet: the warning, with the count; Stay signed in keeps everything', async () => {
      await open(d.page, 'settings')
      const card = d.page.locator('#account')
      await card.getByRole('button', { name: 'Sign out', exact: true }).click()
      const warn = card.getByRole('alert')
      await warn.waitFor()
      const text = flat(await warn.innerText())
      assert(text.startsWith('2 changes haven\'t reached your account yet. Stay signed in until you\'re online, or sign out anyway.'), `warning: ${text}`)
      assert(await d.page.evaluate(() => document.activeElement?.textContent.trim()) === 'Stay signed in', 'focus is not on Stay signed in')
      await warn.getByRole('button', { name: 'Stay signed in' }).click()
      await until('the warning gone', async () => !(await warn.count()))
      assert(new URL(d.page.url()).pathname.endsWith('/settings'), `moved to ${d.page.url()}`)
      const a = await stored(d.page, 'travel:account:v1')
      assert(a?.uid === TEST_ACCOUNT.uid && !a.out, `account: ${JSON.stringify(a)}`)
      assert((await stored(d.page, 'travel:trips:v1'))?.length === 1, 'the trips changed')
      await open(d.page)
      assert(await d.page.locator('.tcard').count(), 'the home lost its trips')
    })
    await check('W7 ... Sign out anyway goes to the landing page; the device copy stays for the same account, hidden', async () => {
      await open(d.page, 'settings')
      const card = d.page.locator('#account')
      await card.getByRole('button', { name: 'Sign out', exact: true }).click()
      await card.getByRole('alert').getByRole('button', { name: 'Sign out anyway' }).click()
      await until('the landing page', () => onLanding(d.page))
      const a = await stored(d.page, 'travel:account:v1')
      assert(a?.uid === TEST_ACCOUNT.uid && a.out === true, `account: ${JSON.stringify(a)}`)
      assert((await stored(d.page, 'travel:trips:v1'))?.length === 1, 'the device copy was removed')
      assert(!/ROME|Upcoming/.test(await d.page.locator('body').innerText()), 'the trips show')
      await open(d.page, `trips/${TRIP}/now`)
      await until('back at "/"', () => onLanding(d.page))
      assert(!d.errors.length, d.errors.join(' / '))
    })
    await ctxClose(d)
  }
  {
    const d = await device({ trips: [] })
    await check('W7 Sign out with nothing waiting goes straight to the landing page', async () => {
      await open(d.page, 'settings')
      await d.page.locator('#account').getByRole('button', { name: 'Sign out', exact: true }).click()
      await until('the landing page', () => onLanding(d.page))
      assert(!(await d.page.getByRole('alert').count()), 'a warning showed')
    })
    await ctxClose(d)
  }
  {
    const d = await device({ progress: seedS() })
    await check('"Sign out and remove from this device" asks first (naming what would be lost); No changes nothing', async () => {
      await open(d.page, 'settings')
      let asked = ''
      d.page.once('dialog', (dlg) => {
        asked = dlg.message()
        void dlg.dismiss()
      })
      await d.page.getByRole('button', { name: 'Sign out and remove from this device' }).click()
      await until('the question', () => asked)
      assert(asked.startsWith('Sign out and remove your trips from this device? 2 changes haven\'t reached your account yet and will be lost.'), `asked: ${asked}`)
      await sleep(300)
      assert(new URL(d.page.url()).pathname.endsWith('/settings'), 'left settings')
      assert((await stored(d.page, 'travel:account:v1'))?.uid === TEST_ACCOUNT.uid, 'the account was forgotten')
    })
    await check('... Yes signs out, removes the device copy and the remembered account, and shows the landing page', async () => {
      d.page.once('dialog', dlg => void dlg.accept())
      await d.page.getByRole('button', { name: 'Sign out and remove from this device' }).click()
      await until('the landing page', () => onLanding(d.page))
      assert(await stored(d.page, 'travel:account:v1') === null, 'the account is still remembered')
      const trips = await stored(d.page, 'travel:trips:v1')
      assert(!trips || !trips.length, `trips left: ${trips?.length}`)
      assert(!Object.keys((await stored(d.page, 'travel:progress:v1')) ?? {}).length, 'progress left')
      assert(!d.errors.length, d.errors.join(' / '))
    })
    await ctxClose(d)
  }

  // ---------- W8: the session is gone ----------
  {
    const d = await device({})
    // This device uses the cloud, so Firebase starts and finds no session of the remembered account.
    await d.ctx.addInitScript(() => {
      try {
        localStorage.setItem('travel:cloud:on', 'true')
      }
      catch { /* storage refused */ }
    })
    await check('W8 a remembered account whose session is gone: the app opens into the trips, and Home asks to sign in again', async () => {
      await open(d.page)
      await d.page.locator('.tcard').first().waitFor()
      const again = d.page.locator('.again')
      await again.waitFor({ timeout: 15000 })
      assert(flat(await again.innerText()).startsWith('Sign in again to keep saving to your account.'), `home: ${flat(await again.innerText())}`)
      assert(await again.getByRole('button', { name: 'Sign in with Google' }).isVisible(), 'no sign-in button')
      assert(!(await d.landingSeen()), 'the landing page showed')
      assert(await d.page.locator('.tcard').count(), 'the trips are gone')
    })
    await check('W8 ... and Settings asks too, with the account still there to sign out of or remove', async () => {
      await go(d.page, '/settings')
      const card = d.page.locator('#account')
      await card.locator('.again').waitFor()
      const text = flat(await card.innerText())
      assert(text.includes('Sign in again to keep saving to your account.'), `settings: ${text}`)
      assert(text.includes(TEST_ACCOUNT.email), 'no account shown')
      for (const name of ['Sign in with Google', 'Sign out', 'Sign out and remove from this device']) assert(await card.getByRole('button', { name, exact: true }).count() === 1, `no ${name}`)
      assert(!d.away.length, `requests away from the app: ${d.away.join(', ')}`)
      assert(!d.errors.length, d.errors.join(' / '))
    })
    await ctxClose(d)
  }

  // ---------- D39: what Settings says about your data ----------
  {
    const d = await device({})
    await check('Settings: "Your data" says everything is saved to your account in the cloud and kept on this device, with Export everything and Import a backup', async () => {
      await open(d.page, 'settings')
      const sec = d.page.locator('section').filter({ has: d.page.getByRole('heading', { name: 'Your data' }) })
      const text = flat(await sec.innerText())
      assert(text.includes('Everything you record is saved to your account in the cloud and kept on this device for offline use'), `your data: ${text}`)
      assert(await sec.getByRole('button', { name: 'Export everything' }).count() === 1, 'no Export everything')
      assert(await sec.locator('input[type=file]').count() === 1, 'no Import a backup')
      assert(!(await d.page.getByText('Delete all data on this device').count()), 'the old wipe is still there')
      assert(!(await d.page.getByRole('heading', { name: 'Try the sample trip' }).count()), 'offers the sample it already has')
    })
    await ctxClose(d)
  }

  // ---------- copy ----------
  await check('no em dash in the files of this package; the page head reads "Travels: your trip, live" and keeps noindex', async () => {
    const files = ['app/pages/index.vue', 'app/components/LandingPage.vue', 'app/components/AccountCard.vue', 'app/pages/settings.vue', 'app/app.config.ts', 'nuxt.config.ts', 'tests/e2e/landing.e2e.mjs']
    const bad = files.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(EM_DASH))
    assert(!bad.length, `em dash in ${bad.join(', ')}`)
    const cfg = readFileSync(join(ROOT, 'nuxt.config.ts'), 'utf8')
    assert(cfg.includes('title: \'Travels: your trip, live\'') && cfg.includes('noindex, nofollow'), 'nuxt.config.ts head')
    const app = readFileSync(join(ROOT, 'app/app.config.ts'), 'utf8')
    assert(!app.includes('firebaseLive'), 'firebaseLive is still in app.config.ts')
    const home = readFileSync(join(ROOT, 'app/pages/index.vue'), 'utf8') + readFileSync(join(ROOT, 'app/components/AccountCard.vue'), 'utf8')
    assert(!home.includes('not-owner') && !home.includes('github.io'), 'not-owner or the GitHub Pages block is still there')
  })
}
finally {
  await browser.close()
  await srv?.close()
}

async function ctxClose(d) {
  await d.ctx.close().catch(() => {})
}
