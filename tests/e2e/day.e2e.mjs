// Browser checks for Now, Plan and the day tools (package N of the UI refresh): spec 9.5 (L1 to L9), C16 and
// C17 (9.2), S2 and S3 (9.3), D7 (9.7), the SOS driver card, 44 px touch targets (A1), no sideways scroll (N5)
// and no em dash (A4). Seed S and Fresh as in spec section 9; "live" freezes the page's clock at a Rome time.
//
//   node tests/e2e/day.e2e.mjs                 (against TRAVELS_URL, or the dev server at http://127.0.0.1:3000/)
//   node tests/e2e/day.e2e.mjs --shots=<dir>   (also saves a phone screenshot of each state there)
import { mkdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { assert, BASE, check, go, live, loadTrip, noSideScroll, phone, preview, readProgress, ready, seedS, sideScroll, smallTargets, TRIP } from './lib.mjs'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const SHOTS = process.argv.find(a => a.startsWith('--shots='))?.slice(8) ?? ''
if (SHOTS) mkdirSync(SHOTS, { recursive: true })

const trip = loadTrip()
const SEED = seedS(trip)
const FRI_1640 = '2026-10-09T16:40'
const FRI_1720 = '2026-10-09T17:20'
const FRI_2230 = '2026-10-09T22:30'
const PRE_TRIP = '2026-09-30T12:00'
const HOME = trip.home

const NBSP = String.fromCharCode(0xA0)
const EM_DASH = String.fromCharCode(0x2014)
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Polls `fn` (async, in Node) until it returns something truthy. */
async function until(what, fn, timeout = 5000) {
  const end = Date.now() + timeout
  let last
  do {
    last = await fn()
    if (last) return last
    await sleep(100)
  } while (Date.now() < end)
  throw new Error(`timed out waiting for ${what}`)
}

const browser = await chromium.launch()

/**
 * A phone at a moment: Seed S by default (`progress: null` for Fresh), live at `at` (Rome time), on `path`
 * ("now", "plan?day=fri" or an app path like "/settings"). Other options go to phone() (width, dark, …).
 */
async function scenario({ progress = SEED, at, path = 'now', init, ...rest } = {}) {
  const r = await phone(browser, { ...rest, progress: progress ?? undefined })
  if (init) await r.ctx.addInitScript(init)
  if (at) await live(r.page, at)
  await open(r.page, path)
  return r
}

async function open(page, path) {
  const url = path.startsWith('/') ? `${BASE}${path.slice(1)}` : `${BASE}trips/${TRIP}/${path}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await ready(page)
}

async function shot(page, name, opts = {}) {
  if (!SHOTS) return
  await page.screenshot({ path: join(SHOTS, `${name}.png`), ...opts })
}

/** The newest toast that says `text` (a substring or a RegExp), once it shows. */
async function toastWith(page, text, timeout = 5000) {
  const t = page.locator('.toasts .toast').filter({ hasText: text }).last()
  await t.waitFor({ state: 'visible', timeout })
  return t
}
const toastText = async t => flat(await t.locator('.txt').innerText())
const toastActs = async t => (await t.locator('button').allInnerTexts()).map(flat)

async function queryOf(page) {
  return Object.fromEntries(new URL(page.url()).searchParams)
}

/** The page's saved trip, changed by `fn`, then reloaded (for trips without a home, a driver card…). */
async function editTrip(page, fn) {
  await page.evaluate(([id, src]) => {
    const list = JSON.parse(localStorage.getItem('travel:trips:v1') || '[]')
    const t = list.find(x => x.id === id)
    // eslint-disable-next-line no-new-func
    new Function('t', src)(t)
    localStorage.setItem('travel:trips:v1', JSON.stringify(list))
  }, [TRIP, fn])
  await page.reload({ waitUntil: 'domcontentloaded' })
  await ready(page)
}

/** WCAG contrast of an element's text against the first opaque background behind it. */
async function contrastOf(page, selector) {
  return page.locator(selector).first().evaluate((el) => {
    const probe = document.createElement('i')
    document.body.appendChild(probe)
    const rgb = (c) => {
      probe.style.color = ''
      probe.style.color = c
      const m = getComputedStyle(probe).color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 1]
      if (/^color\(srgb/.test(getComputedStyle(probe).color)) return [m[0] * 255, m[1] * 255, m[2] * 255, m[3] ?? 1]
      return [m[0], m[1], m[2], m[3] ?? 1]
    }
    const lum = ([r, g, b]) => {
      const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const fg = rgb(getComputedStyle(el).color)
    let bg = [255, 255, 255, 0]
    for (let p = el; p; p = p.parentElement) {
      const c = rgb(getComputedStyle(p).backgroundColor)
      if (c[3] > 0.5) {
        bg = c
        break
      }
    }
    probe.remove()
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
    return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100
  })
}

/**
 * Buttons and links under 44 x 44 px anywhere on the page (scrolled through, screen by screen). With
 * `mine`, the parts other packages own are left out: the trip shell's bars and the Leaflet map (markers).
 */
async function allSmall(page, { mine = false } = {}) {
  if (mine) {
    await page.evaluate(() => {
      const s = document.createElement('style')
      s.id = 'e2e-others'
      // Toasts fade with `transition: all`, which keeps them visible for a moment: take them out instead.
      s.textContent = '.top, .tabbar, .leaflet-container { visibility: hidden !important; } .toasts { display: none !important; }'
      document.head.appendChild(s)
    })
  }
  const found = new Map()
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const step = Math.round((await page.evaluate(() => innerHeight)) * 0.7)
  for (let y = 0; ; y += step) {
    await page.evaluate(v => window.scrollTo(0, v), y)
    await sleep(150)
    for (const t of await smallTargets(page)) found.set(`${t.tag}|${t.cls}|${t.label}|${t.text}`, t)
    if (y + step >= height) break
  }
  await page.evaluate(() => {
    document.getElementById('e2e-others')?.remove()
    window.scrollTo(0, 0)
  })
  return [...found.values()]
}
const describe = list => list.map(t => `${t.tag}.${t.cls.split(' ')[0] || ''} "${t.label || t.text}" ${t.w}x${t.h}${t.clip ? ` (${t.clip})` : ''}`).join('; ')

/**
 * The lines of a row of phrases joined by dots (`.parts`), as they show: the words on each line, leaving out
 * a dot that sits in the clipped strip on the left (the one of a phrase that starts a line).
 */
async function shownLines(page, selector) {
  return page.locator(selector).first().evaluate((box) => {
    const edge = box.getBoundingClientRect().left - Number.parseFloat(getComputedStyle(box).marginLeft)
    const range = document.createRange()
    const words = []
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      let off = 0
      for (const w of n.textContent.split(/([\s ]+)/)) {
        if (w.trim()) {
          range.setStart(n, off)
          range.setEnd(n, off + w.length)
          const r = range.getClientRects()[0]
          if (r && r.right > edge + 0.5) words.push({ top: r.top, left: r.left, w })
        }
        off += w.length
      }
    }
    const lines = []
    for (const x of words.sort((a, b) => a.top - b.top || a.left - b.left)) {
      const line = lines.find(l => Math.abs(l.top - x.top) < 6)
      if (line) line.words.push(x)
      else lines.push({ top: x.top, words: [x] })
    }
    return lines.map(l => l.words.sort((a, b) => a.left - b.left).map(x => x.w).join(' '))
  })
}

async function noPageErrors(errors) {
  assert(!errors.length, `page errors: ${errors.join(' / ')}`)
}

try {
  // ---------- during the trip: live Fri 16:40, Seed S ----------
  {
    const { ctx, page, errors } = await scenario({ at: FRI_1640 })
    await shot(page, 'now-fri-1640')

    await check('C17 Now shows "€37.00 today · €134.50 left" and "≈ ₺2,065 spent" above the hero', async () => {
      const row = page.locator('.money')
      await row.waitFor()
      const text = flat(await row.innerText())
      assert(text.includes('€37.00 today · €134.50 left'), `money row reads "${text}"`)
      assert(text.includes('≈ ₺2,065 spent'), `money row reads "${text}"`)
      const m = await row.boundingBox()
      const h = await page.locator('.hero').boundingBox()
      assert(m && h && m.y + m.height <= h.y + 1, 'the money row is not above the hero')
      assert(await page.getByRole('button', { name: 'Add a cost', exact: true }).count() === 1, 'no button named "Add a cost"')
    })

    await check('C17 Add opens ?cost=new for Friday; the walk on now (kind move) is not linked', async () => {
      await page.getByRole('button', { name: 'Add a cost', exact: true }).click()
      await until('?cost=new', async () => (await queryOf(page)).cost === 'new')
      const q = await queryOf(page)
      assert(new URL(page.url()).pathname.endsWith('/now'), `left Now: ${page.url()}`)
      assert(q.cday === 'fri', `cday is ${q.cday}`)
      assert(!q.for, `linked to ${q.for}`)
      await page.goBack()
      await until('the sheet keys gone', async () => !(await queryOf(page)).cost)
    })

    await check('L9 "Today so far" says "3 stamps today"', async () => {
      const text = flat(await page.locator('.daycard').innerText())
      assert(text.includes('Today so far'), text)
      assert(text.includes('3 stamps today'), `day card reads "${text}"`)
    })

    await check('L9 the Next card\'s leave-by line is one line in the reading face at 390 px', async () => {
      const l = await page.locator('.next .leave').evaluate((el) => {
        const cs = getComputedStyle(el)
        const inner = el.querySelector('.ellipsis')
        return {
          text: el.textContent.trim(),
          h: el.getBoundingClientRect().height,
          line: Number.parseFloat(cs.lineHeight) || Number.parseFloat(cs.fontSize) * 1.5,
          font: cs.fontFamily,
          tnum: el.classList.contains('tnum'),
          cut: inner ? inner.scrollWidth > inner.clientWidth + 1 : true,
        }
      })
      assert(l.text === `Leave by 17:05 · in 25${NBSP}min`, `reads "${l.text}"`)
      assert(l.tnum && !/Plex Mono/i.test(l.font.split(',')[0]), `font ${l.font}`)
      assert(l.h < l.line * 1.5, `${l.h} px tall for a ${l.line} px line`)
      assert(!l.cut, 'the line is cut short')
    })

    await check('L1 the hero\'s Skip toasts "Skipped: …" with Undo, and Undo brings the stop back', async () => {
      const hero = page.locator('.hero')
      const title = flat(await hero.locator('.ttl').innerText())
      await hero.getByRole('button', { name: /^Skip / }).click()
      const t = await toastWith(page, 'Skipped: Ponte')
      assert(await toastText(t) === `Skipped: ${title}`, `toast "${await toastText(t)}"`)
      assert(same(await toastActs(t), ['Undo']), `actions ${await toastActs(t)}`)
      await t.getByRole('button', { name: 'Undo' }).click()
      await until('the walk unmarked', async () => !(await readProgress(page)).stops['ponte-sant-angelo-via-dei-coronari-piazza-navona'])
      await page.locator('.hero .ttl', { hasText: 'Ponte' }).waitFor()
    })

    await check('L1 a Later today tick toasts with Undo, and Undo unticks it', async () => {
      const tick = page.locator('.later #stop-trevi-fountain .tick')
      await tick.click()
      const t = await toastWith(page, 'Done: Trevi Fountain')
      const acts = await toastActs(t)
      assert(acts.includes('Undo'), `actions ${acts}`)
      assert((await readProgress(page)).stops['trevi-fountain']?.status === 'done', 'not ticked')
      await t.getByRole('button', { name: 'Undo' }).click()
      await until('Trevi unticked', async () => !(await readProgress(page)).stops['trevi-fountain'])
    })

    await check('N5 Now has no sideways scroll at 390 px (live Fri 16:40)', async () => {
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
    })

    await check('A1 every button and link of Now is at least 44 x 44 px (390 px)', async () => {
      await page.locator('.leaflet-marker-icon').first().waitFor({ timeout: 8000 }).catch(() => {})
      const others = await allSmall(page)
      const mine = await allSmall(page, { mine: true })
      if (others.length > mine.length) console.log(`     note (other packages): ${describe(others.filter(o => !mine.some(m => m.cls === o.cls && m.text === o.text && m.label === o.label)))}`)
      assert(!mine.length, describe(mine))
    })

    await check('C17 tapping the money row opens Costs', async () => {
      await page.locator('.money .mn-link').click()
      await until('/costs', async () => new URL(page.url()).pathname.endsWith(`/trips/${TRIP}/costs`))
    })
    await check('no page errors on Now (live Fri 16:40)', () => noPageErrors(errors))
    await ctx.close()
  }

  // ---------- the Pantheon on now: live Fri 17:20, Seed S ----------
  {
    const { ctx, page, errors } = await scenario({ at: FRI_1720 })
    await shot(page, 'now-fri-1720')

    await check('C17 at 17:20 Add links the cost to the Pantheon, the sight on now ("At Pantheon", as on Costs)', async () => {
      await page.getByRole('button', { name: 'Add a cost', exact: true }).click()
      await until('?cost=new', async () => (await queryOf(page)).cost === 'new')
      const q = await queryOf(page)
      assert(!q.for && q.cday === 'fri', `query ${JSON.stringify(q)}`)
      const sh = page.getByRole('dialog', { name: 'Add a cost' })
      await sh.waitFor()
      assert(flat(await sh.locator('.chip.at').innerText()) === 'At Pantheon', 'no "At Pantheon" chip')
      assert(await sh.locator('button.cat.ring', { hasText: 'Sights' }).count() === 1, 'no ring on Sights')
      await page.goBack()
      await until('the sheet keys gone', async () => !(await queryOf(page)).cost)
    })

    await check('S2 Done on the Pantheon hero toasts "Done: Pantheon · Stamped" [Log €7] [Undo]; no stamps record', async () => {
      const hero = page.locator('.hero')
      assert(flat(await hero.innerText()).includes('Pantheon'), 'the hero is not the Pantheon')
      await hero.getByRole('button', { name: 'Done', exact: true }).click()
      const t = await toastWith(page, 'Done: Pantheon')
      assert(await toastText(t) === 'Done: Pantheon · Stamped', `toast "${await toastText(t)}"`)
      assert(same(await toastActs(t), ['Log €7', 'Undo']), `actions ${await toastActs(t)}`)
      const p = await readProgress(page)
      assert(p.stops.pantheon?.status === 'done', 'the Pantheon is not ticked')
      assert(!Object.keys(p.stamps ?? {}).length, `stamps written: ${JSON.stringify(p.stamps)}`)
      await t.getByRole('button', { name: 'Undo' }).click()
      await until('the Pantheon unticked', async () => !(await readProgress(page)).stops.pantheon)
    })

    await check('S3 "Log €7" toasts "Added €7.00 · Sights · Pantheon" and the money row reads €44.00 today', async () => {
      // The same button tapped again within half a second is the second tap of a double tap (tapGuard): wait like a hand.
      await sleep(550)
      await page.locator('.hero').getByRole('button', { name: 'Done', exact: true }).click()
      const t = await toastWith(page, 'Done: Pantheon')
      await t.getByRole('button', { name: 'Log €7' }).click()
      const a = await toastWith(page, 'Added €7.00')
      assert(await toastText(a) === 'Added €7.00 · Sights · Pantheon', `toast "${await toastText(a)}"`)
      await until('€44.00 today', async () => flat(await page.locator('.money').innerText()).includes('€44.00 today'))
      const live = Object.values((await readProgress(page)).expenses ?? {}).filter(e => !e.deleted)
      assert(live.length === 1, `${live.length} costs`)
      const e = live[0]
      assert(e.amount === 7 && e.cat === 'sights' && e.dayId === 'fri' && e.stopId === 'pantheon', JSON.stringify(e))
    })

    await check('L1 "Did you do these?": the count chip is neutral; Yes toasts with Undo', async () => {
      const chip = page.locator('.catch .catch-h .chip')
      const cls = await chip.getAttribute('class')
      assert(!/\bt-warn\b/.test(cls), `chip classes ${cls}`)
      assert(/\d+ not marked/.test(flat(await chip.innerText())), 'no count')
      const row = page.locator('.catch .row-item').first()
      const title = flat(await row.locator('.link-like').innerText())
      await row.getByRole('button', { name: 'Yes' }).click()
      const t = await toastWith(page, `Done: ${title.slice(0, 20)}`)
      assert((await toastActs(t)).includes('Undo'), `actions ${await toastActs(t)}`)
      await t.getByRole('button', { name: 'Undo' }).click()
      await page.locator('.catch .row-item', { hasText: title.slice(0, 20) }).first().waitFor()
      await page.locator('.catch .row-item', { hasText: title.slice(0, 20) }).first().getByRole('button', { name: 'No' }).click()
      const s = await toastWith(page, `Skipped: ${title.slice(0, 20)}`)
      assert(same(await toastActs(s), ['Undo']), `actions ${await toastActs(s)}`)
      await s.getByRole('button', { name: 'Undo' }).click()
    })

    await check('S3 and L1 on the Plan timeline: untick and tick again toast with Undo, and no Log is offered', async () => {
      await go(page, 'plan?day=fri')
      const tick = page.locator('#stop-pantheon .tick')
      await tick.click()
      const u = await toastWith(page, 'Unticked: Pantheon')
      assert(same(await toastActs(u), ['Undo']), `actions ${await toastActs(u)}`)
      await tick.click()
      const d = await until('a new Done toast', async () => {
        const all = page.locator('.toasts .toast').filter({ hasText: 'Done: Pantheon' })
        return (await all.count()) ? all.last() : null
      })
      assert(await toastText(d) === 'Done: Pantheon · Stamped', `toast "${await toastText(d)}"`)
      assert(same(await toastActs(d), ['Undo']), `actions ${await toastActs(d)}`)
    })
    await check('no page errors (live Fri 17:20)', () => noPageErrors(errors))
    await ctx.close()
  }

  // ---------- the same moments in a preview ----------
  {
    const { ctx, page, errors } = await phone(browser, { progress: SEED })
    await preview(page, FRI_1720)
    await check('preview Fri 17:20: the money row and the hero\'s Done work as live', async () => {
      await page.locator('.money').waitFor()
      assert(flat(await page.locator('.money').innerText()).includes('€37.00 today · €134.50 left'), 'money row')
      await page.locator('.hero').getByRole('button', { name: 'Done', exact: true }).click()
      const t = await toastWith(page, 'Done: Pantheon')
      assert(same(await toastActs(t), ['Log €7', 'Undo']), `actions ${await toastActs(t)}`)
      await t.getByRole('button', { name: 'Undo' }).click()
      await shot(page, 'now-preview-1720')
    })
    await check('preview Fri 17:20: a Plan timeline tick toasts with Undo, and the preview holds', async () => {
      await go(page, 'plan?day=fri')
      await page.locator('#stop-trevi-fountain .tick').click()
      const t = await toastWith(page, 'Done: Trevi Fountain')
      assert((await toastActs(t)).includes('Undo'), `actions ${await toastActs(t)}`)
      await t.getByRole('button', { name: 'Undo' }).click()
      await until('Trevi unticked', async () => !(await readProgress(page)).stops['trevi-fountain'])
      assert(await page.locator('.dh-chip').isVisible(), 'no day picture chip')
    })
    await check('no page errors in the preview', () => noPageErrors(errors))
    await ctx.close()
  }

  // ---------- 320 px: live Fri 16:40, Seed S ----------
  {
    const { ctx, page, errors } = await scenario({ at: FRI_1640, width: 320 })
    await shot(page, 'now-fri-1640-320')
    await check('L8 at 320 px Now has no sideways scroll and "Remind me when to leave" shows in full', async () => {
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
      const b = await page.locator('.daycard button', { hasText: 'Remind me when to leave' }).evaluate((el) => {
        const r = el.getBoundingClientRect()
        const card = el.closest('.card').getBoundingClientRect()
        return { cut: el.scrollWidth > el.clientWidth + 1, inCard: r.left >= card.left - 0.5 && r.right <= card.right + 0.5, inView: r.right <= innerWidth }
      })
      assert(!b.cut && b.inCard && b.inView, JSON.stringify(b))
    })
    await check('A1 at 320 px the hero\'s buttons and every other target of Now are at least 44 x 44 px', async () => {
      const mine = await allSmall(page, { mine: true })
      assert(!mine.length, describe(mine))
    })
    await check('the money row reads cleanly at 320 px (spent and left on their own lines, no stray dot)', async () => {
      const lines = await shownLines(page, '.money .mn-l1')
      assert(same(lines, ['€37.00 today', '€134.50 left']), `shows ${JSON.stringify(lines)}`)
      assert(flat(await page.locator('.money .mn-l1').innerText()) === '€37.00 today · €134.50 left', 'the text lost its dot')
    })
    await check('the day card\'s count wraps with no dot left at a line\'s start or end (320 px)', async () => {
      const lines = await shownLines(page, '.daycard .parts')
      const text = flat(await page.locator('.daycard .parts').innerText())
      assert(/^3 done · \d+ to go · 1 skipped$/.test(text), `reads "${text}"`)
      assert(lines.length > 1 && lines.every(l => !/^·|·$/.test(l)) && lines.join(' · ') === text, `shows ${JSON.stringify(lines)}`)
    })
    await check('no page errors on Now at 320 px', () => noPageErrors(errors))
    await ctx.close()
  }

  // ---------- the money row between 361 and 389 px (375 px phones), and over today's plan ----------
  {
    const { ctx, page, errors } = await scenario({ at: FRI_1640, width: 375 })
    await check('at 375 px the money row keeps each amount with its words ("€134.50 left" is never split)', async () => {
      const lines = await shownLines(page, '.money .mn-l1')
      assert(same(lines, ['€37.00 today', '€134.50 left']), `shows ${JSON.stringify(lines)}`)
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
      await noPageErrors(errors)
    })
    await ctx.close()
  }
  {
    const fri = (h, m) => new Date(Date.UTC(2026, 9, 9, h - 2, m)).toISOString()
    const lunch = { id: 'c-lunch', amount: 147, currency: 'EUR', cat: 'food', dayId: 'fri', at: fri(14, 0), updatedAt: fri(14, 0) }
    const { ctx, page, errors } = await scenario({ progress: { ...SEED, expenses: { 'c-lunch': lunch } }, at: FRI_1640 })
    await check('over today\'s plan at 390 px: "€12.50 over today\'s plan" stays whole, in amber, on its own line', async () => {
      const lines = await shownLines(page, '.money .mn-l1')
      assert(same(lines, ['€184.00 today', '€12.50 over today\'s plan']), `shows ${JSON.stringify(lines)}`)
      assert(flat(await page.locator('.money .over').innerText()) === '€12.50 over today\'s plan', 'the amber part')
      assert(flat(await page.locator('.money').innerText()).startsWith('€184.00 today · €12.50 over today\'s plan'), 'text')
      await shot(page, 'now-over-plan')
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  // ---------- late at night: Getting back ----------
  {
    const { ctx, page, errors } = await scenario({ at: FRI_2230 })
    await shot(page, 'now-fri-2230')
    await check('L2 at Fri 22:30 Now shows "Getting back to YellowSquare" with its three actions, under the hero', async () => {
      const hc = page.locator('.hc')
      await hc.waitFor()
      const text = flat(await hc.innerText())
      for (const s of ['Late night', 'Getting back to YellowSquare', 'Via Palestro 51, 00185 Roma', 'Last metro ~01:30', 'Take me home', 'Show the driver', 'Call a taxi · 060609']) {
        assert(text.toLowerCase().includes(s.toLowerCase()), `missing "${s}" in "${text}"`)
      }
      const order = await page.evaluate(() => {
        const hc = document.querySelector('.hc')
        const at = sel => document.querySelector(sel)
        const after = (a, b) => !!a && !!b && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
        return { afterHero: after(at('.hero'), hc), afterNext: !at('.next') || after(at('.next'), hc), beforeCatch: !at('.catch') || after(hc, at('.catch')) }
      })
      assert(order.afterHero && order.afterNext && order.beforeCatch, JSON.stringify(order))
      const home = new URL(await hc.getByRole('link', { name: 'Take me home' }).getAttribute('href'))
      assert(home.origin + home.pathname === 'https://www.google.com/maps/dir/', `${home}`)
      assert(home.searchParams.get('destination') === `${HOME.lat},${HOME.lng}`, `${home}`)
      assert(await hc.getByRole('link', { name: 'Call a taxi · 060609' }).getAttribute('href') === 'tel:060609', 'taxi link')
    })

    await check('L2 "Show the driver" opens the full-screen card "Per favore, mi porti a:"; Escape and a tap close it', async () => {
      await page.locator('.hc').getByRole('button', { name: 'Show the driver' }).click()
      const card = page.getByRole('dialog', { name: 'Card for the taxi driver' })
      await card.waitFor()
      const first = flat(await card.locator('p').first().innerText())
      assert(first === 'Per favore, mi porti a:', `first line "${first}"`)
      const box = await card.boundingBox()
      const vp = page.viewportSize()
      assert(box && box.width >= vp.width - 1 && box.height >= vp.height - 1, `card ${JSON.stringify(box)}`)
      await shot(page, 'driver-card')
      await page.keyboard.press('Escape')
      await card.waitFor({ state: 'hidden' })
      await page.locator('.hc').getByRole('button', { name: 'Show the driver' }).click()
      await card.waitFor()
      await card.click({ position: { x: 40, y: 40 } })
      await card.waitFor({ state: 'hidden' })
    })

    await check('the driver card gives focus back to "Show the driver" when the tap did not focus it (Safari)', async () => {
      const btn = page.locator('.hc').getByRole('button', { name: 'Show the driver' })
      await page.evaluate(() => document.activeElement?.blur?.())
      // A press, then a click that leaves focus where it was, as a tap does in Safari.
      await btn.evaluate((el) => {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))
        el.click()
      })
      const card = page.getByRole('dialog', { name: 'Card for the taxi driver' })
      await card.waitFor()
      await page.keyboard.press('Escape')
      await card.waitFor({ state: 'hidden' })
      assert(await btn.evaluate(el => document.activeElement === el), 'focus did not come back to "Show the driver"')
    })

    await check('A1 and N5 with the Getting back card (390 px)', async () => {
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
      const mine = await allSmall(page, { mine: true })
      assert(!mine.length, describe(mine))
    })

    await check('offline, "Take me home" is still built', async () => {
      await ctx.setOffline(true)
      await sleep(300)
      const href = await page.locator('.hc').getByRole('link', { name: 'Take me home' }).getAttribute('href')
      assert(href?.startsWith('https://www.google.com/maps/dir/?'), href)
      await ctx.setOffline(false)
    })
    await check('no page errors at Fri 22:30', () => noPageErrors(errors))
    await ctx.close()
  }

  {
    const { ctx, page, errors } = await scenario({ at: '2026-10-10T01:45' })
    await shot(page, 'now-sat-0145')
    await check('L2 at Sat 10 Oct 01:45 the card sits above "That\'s today done"', async () => {
      const hero = page.locator('.hero.mode-done')
      await hero.waitFor()
      assert(flat(await hero.innerText()).includes('That\'s today done'), 'no "That\'s today done"')
      const a = await page.locator('.hc').boundingBox()
      const b = await hero.boundingBox()
      assert(a && b && a.y + a.height <= b.y, 'the card is not above the hero')
    })
    await check('no page errors at Sat 01:45', () => noPageErrors(errors))
    await ctx.close()
  }

  {
    const { ctx, page, errors } = await scenario({ at: '2026-10-10T22:00' })
    await check('L2 at Sat 22:00 (dinner on now, the bars next) the card sits right under the Next card', async () => {
      await page.locator('.hc').waitFor()
      const order = await page.evaluate(() => {
        const next = document.querySelector('.next')
        return !!next && next.nextElementSibling === document.querySelector('.hc')
      })
      assert(order, 'the card is not right under the Next card')
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  for (const [at, why] of [['2026-10-12T21:30', 'Mon 12 Oct 21:30 (the last day)'], ['2026-10-13T01:45', 'Tue 13 Oct 01:45 (still the last day)'], ['2026-10-09T20:30', 'Fri 20:30 (before 21:00)']]) {
    const { ctx, page, errors } = await scenario({ at })
    await check(`L2 no Getting back card at ${why}`, async () => {
      await page.locator('.statusline, .countdown').first().waitFor()
      assert(!(await page.locator('.hc').count()), 'the card shows')
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  {
    // A position: the distance line, and transit for a way home over 2.8 km; then a walk.
    const { ctx, page, errors } = await scenario({
      at: FRI_2230,
      geolocation: { latitude: 41.8892, longitude: 12.4697 },
      permissions: ['geolocation'],
      init: () => {
        try {
          localStorage.setItem('travel:geo:on', 'true')
        }
        catch {}
      },
    })
    await check('with a location fix: "3.3 km from you · about 53 min on foot" and transit directions from you', async () => {
      const line = await until('the distance line', async () => {
        const t = flat(await page.locator('.hc').innerText())
        return /from you/.test(t) ? t : ''
      }, 8000)
      assert(line.includes('3.3 km from you · about 53 min on foot'), line)
      const home = new URL(await page.locator('.hc').getByRole('link', { name: 'Take me home' }).getAttribute('href'))
      assert(home.searchParams.get('travelmode') === 'transit', `${home}`)
      assert(home.searchParams.get('origin') === '41.8892,12.4697', `${home}`)
      await shot(page, 'now-fri-2230-fix')
    })
    await check('a fix near home: walking directions', async () => {
      await ctx.setGeolocation({ latitude: 41.9009, longitude: 12.5010 })
      const href = await until('walking directions', async () => {
        const h = await page.locator('.hc').getByRole('link', { name: 'Take me home' }).getAttribute('href')
        return h?.includes('travelmode=walking') ? h : ''
      }, 8000)
      assert(href.includes('origin=41.9009%2C12.501'), href)
      assert(/\d+ m from you · about \d+ min on foot/.test(flat(await page.locator('.hc').innerText())), 'distance line')
    })
    await check('no page errors with a location fix', () => noPageErrors(errors))
    await ctx.close()
  }

  {
    const { ctx, page, errors } = await scenario({ at: FRI_2230 })
    await check('a trip with no home: "Getting back", no address and no "Take me home"; driver and taxi stay', async () => {
      await editTrip(page, 'delete t.home')
      const hc = page.locator('.hc')
      await hc.waitFor()
      assert(flat(await hc.locator('h2').innerText()) === 'Getting back', flat(await hc.locator('h2').innerText()))
      assert(!(await hc.getByRole('link', { name: 'Take me home' }).count()), 'Take me home shows')
      assert(await hc.getByRole('button', { name: 'Show the driver' }).count() === 1, 'no driver button')
      assert(await hc.getByRole('link', { name: 'Call a taxi · 060609' }).count() === 1, 'no taxi link')
    })
    await check('no home, no driver card and no SOS taxi entry: no card at all', async () => {
      await editTrip(page, 'delete t.home; delete t.driverCard; t.sos = (t.sos || []).filter(s => !/taxi/i.test(s.label))')
      await page.locator('.hero').waitFor()
      assert(!(await page.locator('.hc').count()), 'the card shows')
    })
    await check('no page errors on a trip missing those pieces', () => noPageErrors(errors))
    await ctx.close()
  }

  // ---------- before and after the trip ----------
  {
    const { ctx, page, errors } = await scenario({ progress: null, at: PRE_TRIP })
    await shot(page, 'now-before-fresh')
    await check('before the trip: no money row; ticking a "Do now" booking toasts "Booked. One less thing." [Log €25] [Undo]', async () => {
      await page.locator('.countdown').waitFor()
      assert(!(await page.locator('.money').count()), 'a money row shows before the trip')
      const row = page.locator('.book-rows label', { hasText: 'Vatican Museums, Fri 9 Oct, 08:00' })
      // The row leaves the list once booked, so a plain click (check() would wait for it to show checked).
      await row.locator('input[type=checkbox]').click()
      const t = await toastWith(page, 'Booked. One less thing.')
      assert(same(await toastActs(t), ['Log €25', 'Undo']), `actions ${await toastActs(t)}`)
      assert((await readProgress(page))?.bookings?.vatican === true, 'not booked')
      await t.getByRole('button', { name: 'Undo' }).click()
      await until('unbooked', async () => !(await readProgress(page))?.bookings?.vatican)
    })
    await check('A1 and N5 on Now before the trip (390 px)', async () => {
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
      const mine = await allSmall(page, { mine: true })
      assert(!mine.length, describe(mine))
    })
    await check('no page errors before the trip', () => noPageErrors(errors))
    await ctx.close()
  }
  {
    const { ctx, page, errors } = await scenario({ progress: null, at: PRE_TRIP, width: 320 })
    await check('A1 and N5 on Now before the trip (320 px)', async () => {
      await page.locator('.countdown').waitFor()
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
      const mine = await allSmall(page, { mine: true })
      assert(!mine.length, describe(mine))
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  {
    const { ctx, page, errors } = await scenario({ at: '2026-10-20T12:00' })
    await shot(page, 'now-after')
    await check('after the trip the summary line adds " · 3 stamps"; no money row', async () => {
      const line = flat(await page.locator('.countdown .cd-sub').innerText())
      assert(/ · 3 stamps$/.test(line), `reads "${line}"`)
      assert(!(await page.locator('.money').count()), 'a money row shows after the trip')
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  // ---------- Plan: live Fri 16:40, Seed S, the Colosseum day chosen ----------
  for (const width of [390, 320]) {
    const { ctx, page, errors } = await scenario({ progress: { ...SEED, variant: 'sat' }, at: FRI_1640, path: 'plan', width })
    await shot(page, `plan-fri-1640-${width}`)
    await check(`L3 at ${width} px: the Colosseum question is one row; alerts fold; the first stop starts above 780 px`, async () => {
      const row = page.locator('.variant-row')
      await row.waitFor()
      const text = flat(await row.innerText())
      assert(text.includes('Which day is your Colosseum ticket?') && text.includes('Sat 10'), text)
      assert(await row.getByRole('button', { name: /^Change/ }).count() === 1, 'no Change button')
      assert((await row.boundingBox()).height <= 72, `row is ${(await row.boundingBox()).height} px tall`)
      assert(!(await page.locator('.variant .seg').count()), 'the day buttons still show')
      assert(await page.locator('.alerts .alert').count() === 1, 'more than the first alert shows')
      const more = page.locator('.alerts .more-alerts')
      assert(flat(await more.innerText()) === '2 more heads-ups', flat(await more.innerText()))
      const top = await page.locator('.tl .srow').first().evaluate(el => el.getBoundingClientRect().top)
      assert(top < 780, `first row at ${top} px`)
    })
    await check(`L3 at ${width} px: a 132 px picture with "3/11 done", facts in one sideways row, no ring row`, async () => {
      const pic = await page.locator('.dh-pic').boundingBox()
      assert(Math.round(pic.height) === 132, `picture ${pic.height} px`)
      assert(flat(await page.locator('.dh-chip').innerText()) === '3/11 done', flat(await page.locator('.dh-chip').innerText()))
      assert(!(await page.locator('.dh-prog').isVisible()), 'the ring row shows')
      const f = await page.locator('.facts').evaluate(el => ({ tops: [...el.children].map(li => Math.round(li.getBoundingClientRect().top)), sw: el.scrollWidth, cw: el.clientWidth }))
      assert(new Set(f.tops).size === 1, `facts on ${new Set(f.tops).size} lines`)
      assert(f.sw > f.cw, 'the facts do not scroll sideways')
    })
    await check(`N5 and A1 on Plan at ${width} px`, async () => {
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
      const mine = await allSmall(page, { mine: true })
      assert(!mine.length, describe(mine))
    })
    if (width === 390) {
      await check('L3 "2 more heads-ups" opens the rest; "Hide" folds them again', async () => {
        const more = page.locator('.alerts .more-alerts')
        await more.click()
        assert(await page.locator('.alerts .alert').count() === 3, 'not all alerts show')
        assert(flat(await more.innerText()) === 'Hide' && await more.getAttribute('aria-expanded') === 'true', 'no Hide')
        await more.click()
        assert(await page.locator('.alerts .alert').count() === 1, 'the alerts did not fold')
      })
      await check('L4 Your day shows "Spent this day: €37.00 of €171.50", "≈ ₺2,065" and "Add a cost", and no number input', async () => {
        const card = page.locator('.daynote')
        const text = flat(await card.innerText())
        assert(text.includes('Spent this day: €37.00 of €171.50') && text.includes('≈ ₺2,065'), text)
        assert(!(await card.locator('input[type=number]').count()), 'a number input is still there')
        assert(!(await page.getByText('Other spending today').count()), '"Other spending today" is still there')
        assert((await card.getByRole('link', { name: 'See costs' }).getAttribute('href')).endsWith(`/trips/${TRIP}/costs`), 'See costs link')
        await card.getByRole('button', { name: 'Add a cost' }).click()
        await until('?cost=new', async () => (await queryOf(page)).cost === 'new')
        const q = await queryOf(page)
        assert(q.cday === 'fri' && !q.for, JSON.stringify(q))
        await page.goBack()
        await until('the sheet keys gone', async () => !(await queryOf(page)).cost)
        await card.scrollIntoViewIfNeeded()
        await shot(page, 'plan-yourday')
      })
      await check('L6 tapping the 4th star twice on touch leaves no star lit (and no rating)', async () => {
        const star = page.locator('.daynote .stars button').nth(3)
        await star.tap()
        await until('4 stars lit', async () => (await page.locator('.daynote .stars svg.on').count()) === 4)
        await star.tap()
        await sleep(200)
        const lit = await page.locator('.daynote .stars svg.on').count()
        assert(lit === 0, `${lit} stars lit`)
        await until('no rating saved', async () => (await readProgress(page)).dayNotes.fri?.rating === undefined)
        const size = await star.boundingBox()
        assert(size.width >= 44 && size.height >= 44, `star ${size.width} x ${size.height}`)
      })
      await check('L5 typing in the Day journal and switching day at once saves the text on the first day', async () => {
        const text = 'Pizza by the Pantheon, then the Trevi lit up.'
        await page.evaluate((t) => {
          const ta = document.querySelector('.daynote textarea')
          ta.value = t
          ta.dispatchEvent(new Event('input', { bubbles: true }))
          document.querySelectorAll('.days .day')[2].click()
        }, text)
        await until('Saturday', async () => (await queryOf(page)).day === 'sat')
        await sleep(700)
        const notes = (await readProgress(page)).dayNotes
        assert(notes.fri?.note === text, `Friday's note: ${JSON.stringify(notes.fri)}`)
        assert(!notes.sat?.note, `Saturday got ${JSON.stringify(notes.sat)}`)
        assert(await page.locator('.daynote textarea').inputValue() === '', 'Saturday shows Friday\'s text')
        await page.locator('.days .day').nth(1).click()
        await until('Friday\'s text back', async () => await page.locator('.daynote textarea').inputValue() === text)
      })
      await check('the Day journal never writes an untouched copy over a newer note (from another tab or phone)', async () => {
        // This tab shows Thursday's note; another tab (standing in for another phone through the cloud) rewrites it.
        await page.locator('.days .day').nth(0).click()
        await until('Thursday', async () => (await queryOf(page)).day === 'thu')
        const old = await page.locator('.daynote textarea').inputValue()
        assert(old === SEED.dayNotes.thu.note, `Thursday shows "${old}"`)
        const newer = 'Written on the other phone: the best carbonara of the trip.'
        const other = await ctx.newPage()
        try {
          await other.goto(`${BASE}trips/${TRIP}/plan?day=thu`, { waitUntil: 'domcontentloaded' })
          await ready(other)
          await other.locator('.daynote textarea').fill(newer)
          await other.locator('.daynote textarea').blur()
          await until('the other tab\'s note saved', async () => (await readProgress(page)).dayNotes.thu?.note === newer)
        }
        finally {
          await other.close()
        }
        // This tab shows the newer note, and switching day or leaving the page keeps it.
        await until('the newer note shown', async () => await page.locator('.daynote textarea').inputValue() === newer)
        await page.locator('.days .day').nth(1).click()
        await until('Friday', async () => (await queryOf(page)).day === 'fri')
        await sleep(600)
        await go(page, 'now')
        await sleep(300)
        const note = (await readProgress(page)).dayNotes.thu?.note
        assert(note === newer, `Thursday's note became "${note}"`)
        await go(page, 'plan?day=fri')
      })
    }
    if (width === 320) {
      await check('at 320 px "Spent this day" wraps before "≈ ₺2,065" with no stray dot', async () => {
        const lines = await shownLines(page, '.daynote .spent .parts')
        assert(same(lines, ['Spent this day: €37.00 of €171.50', '≈ ₺2,065']), `shows ${JSON.stringify(lines)}`)
        assert(flat(await page.locator('.daynote .spent .parts').innerText()) === 'Spent this day: €37.00 of €171.50 · ≈ ₺2,065', 'text')
      })
    }
    await check(`no page errors on Plan at ${width} px`, () => noPageErrors(errors))
    await ctx.close()
  }

  {
    const { ctx, page, errors } = await scenario({ at: FRI_1640, path: 'plan?day=mon' })
    await check('Plan: a day\'s facts never repeat a sun time (Monday has a sunrise fact but no sunset)', async () => {
      const facts = (await page.locator('.facts li').allInnerTexts()).map(flat)
      assert(new Set(facts).size === facts.length, `facts ${JSON.stringify(facts)}`)
      assert(facts.filter(f => /^Sunrise\b/.test(f)).length === 1 && facts.some(f => /^Sunset \d\d:\d\d$/.test(f)), `facts ${JSON.stringify(facts)}`)
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  {
    const { ctx, page, errors } = await scenario({ progress: null, at: PRE_TRIP, path: 'plan' })
    await check('before the trip with no choice: the full Colosseum question; picking folds it; Change opens it again', async () => {
      const seg = page.locator('.variant .seg')
      await seg.waitFor()
      for (const b of await seg.locator('button').all()) {
        const box = await b.boundingBox()
        assert(box.height >= 44, `day button ${box.height} px tall`)
      }
      await seg.getByRole('button', { name: 'Sun 11' }).click()
      const row = page.locator('.variant-row')
      await row.waitFor()
      assert(flat(await row.innerText()).includes('Sun 11'), flat(await row.innerText()))
      assert((await readProgress(page)).variant === 'sun', 'variant not saved')
      await row.getByRole('button', { name: /^Change/ }).click()
      await seg.waitFor()
      assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-pressed')) === 'true', 'focus is not on the picked day')
      await seg.getByRole('button', { name: 'Sat 10' }).click()
      await row.waitFor()
      assert(flat(await row.innerText()).includes('Sat 10'), flat(await row.innerText()))
    })
    await check('no page errors on Plan before the trip', () => noPageErrors(errors))
    await ctx.close()
  }

  // ---------- Bookings (Fresh, live 30 Sep) ----------
  for (const width of [390, 320]) {
    const { ctx, page, errors } = await scenario({ progress: null, at: PRE_TRIP, path: 'bookings', width })
    if (width === 390) {
      await shot(page, 'bookings-fresh')
      await check('C16 ticking "Vatican Museums, Fri 9 Oct, 08:00" toasts [Log €25] [Undo]; Log writes the linked cost', async () => {
        const card = page.locator('article.bk', { hasText: 'Vatican Museums, Fri 9 Oct, 08:00' }).first()
        const hit = await card.locator('label.bk-check').boundingBox()
        assert(hit.width >= 44 && hit.height >= 44, `checkbox target ${hit.width} x ${hit.height}`)
        await card.locator('label.bk-check').click()
        const t = await toastWith(page, 'Booked. One less thing.')
        assert(same(await toastActs(t), ['Log €25', 'Undo']), `actions ${await toastActs(t)}`)
        await t.getByRole('button', { name: 'Log €25' }).click()
        await toastWith(page, 'Added €25.00')
        const p = await until('the cost', async () => {
          const q = await readProgress(page)
          return Object.values(q?.expenses ?? {}).some(e => !e.deleted) ? q : null
        })
        const live = Object.values(p.expenses).filter(e => !e.deleted)
        assert(live.length === 1, `${live.length} costs`)
        const { amount, cat, dayId, stopId, bookingId } = live[0]
        assert(same({ amount, cat, dayId, stopId, bookingId }, { amount: 25, cat: 'sights', dayId: 'fri', stopId: 'vatican-museums-sistine-chapel', bookingId: 'vatican' }), JSON.stringify(live[0]))
        assert(p.bookings.vatican === true, 'not booked')
      })
    }
    await check(`N5 and A1 on Bookings at ${width} px`, async () => {
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
      const mine = await allSmall(page, { mine: true })
      assert(!mine.length, describe(mine))
      const small = await page.locator('label.bk-check').evaluateAll(els => els.filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width < 44 || r.height < 44
      }).length)
      assert(!small, `${small} booking checkboxes under 44 px`)
    })
    await check(`no page errors on Bookings at ${width} px`, () => noPageErrors(errors))
    await ctx.close()
  }

  // ---------- Packing (Seed S) ----------
  for (const width of [390, 320]) {
    const { ctx, page, errors } = await scenario({ at: PRE_TRIP, path: 'packing', width })
    if (width === 390) await shot(page, 'packing-seed')
    await check(`L7 at ${width} px: the 5 items to pack come first, the packed ones under "Packed · 12"; rows are 44 px or more`, async () => {
      const lists = page.locator('ul.list')
      assert(await lists.count() === 2, `${await lists.count()} lists`)
      assert(await lists.nth(0).locator('li').count() === 5, `${await lists.nth(0).locator('li').count()} to pack`)
      assert(flat(await page.locator('.pk-div').innerText()) === 'Packed · 12', flat(await page.locator('.pk-div').innerText()))
      assert(await lists.nth(1).locator('li').count() === 12, `${await lists.nth(1).locator('li').count()} packed`)
      const order = await page.evaluate(() => {
        const [a, b] = document.querySelectorAll('ul.list')
        const d = document.querySelector('.pk-div')
        return !!(a.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(d.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
      })
      assert(order, 'the divider is not between the lists')
      const short = await page.locator('.pk .lbl').evaluateAll(els => els.map(el => el.getBoundingClientRect().height).filter(h => h < 44))
      assert(!short.length, `rows ${short.join(', ')} px tall`)
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
    })
    await check(`A1 on Packing at ${width} px (the list in edit mode too)`, async () => {
      let mine = await allSmall(page, { mine: true })
      assert(!mine.length, describe(mine))
      await page.getByRole('button', { name: 'Edit list' }).click()
      mine = await allSmall(page, { mine: true })
      assert(!mine.length, describe(mine))
      await page.getByRole('button', { name: 'Done editing' }).click()
    })
    if (width === 390) {
      await check('L7 ticking the last item toasts "All packed. Buon viaggio!"', async () => {
        for (let i = 5; i > 0; i--) {
          await page.locator('ul.list').first().locator('li .lbl').first().click()
          if (i > 1) await until(`${i - 1} left`, async () => (await page.locator('ul.list').first().locator('li').count()) === i - 1)
          // A tap on the same spot within half a second is the second tap of a double tap (tapGuard): wait like a hand does.
          await sleep(550)
        }
        await toastWith(page, 'All packed. Buon viaggio!')
        assert(flat(await page.locator('.pk-div').innerText()) === 'Packed · 17', flat(await page.locator('.pk-div').innerText()))
        await shot(page, 'packing-all')
      })
    }
    await check(`no page errors on Packing at ${width} px`, () => noPageErrors(errors))
    await ctx.close()
  }

  {
    const { ctx, page, errors } = await scenario({ at: PRE_TRIP, path: 'packing' })
    await check('Packing from the keyboard: focus stays in the list you go through (the next item, then "All packed")', async () => {
      const focused = () => page.evaluate(() => document.activeElement?.dataset?.pack ?? '')
      const left = trip.packing.slice(12)
      await page.locator('ul.list').first().locator('input[type=checkbox]').first().focus()
      for (let i = 0; i < left.length; i++) {
        await page.keyboard.press('Space')
        if (left[i + 1]) await until(`focus on "${left[i + 1]}"`, async () => (await focused()) === left[i + 1])
      }
      await until('focus on "All packed"', () => page.evaluate(() => !!document.activeElement?.classList.contains('all')))
      assert(flat(await page.evaluate(() => document.activeElement.textContent)) === 'All packed. Buon viaggio!', 'focus is not on "All packed"')
      // Unticking from the packed list keeps focus in that list too.
      const boxes = page.locator('ul.list.done input[type=checkbox]')
      const second = await boxes.nth(1).getAttribute('data-pack')
      await boxes.first().focus()
      await page.keyboard.press('Space')
      await until('focus on the next packed item', async () => (await focused()) === second)
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  // ---------- SOS ----------
  {
    const { ctx, page, errors } = await scenario({ at: FRI_1640, path: 'sos' })
    await check('SOS still opens the driver card (DriverCard.vue); Escape closes it', async () => {
      await page.getByRole('button', { name: 'Show the driver' }).click()
      const card = page.getByRole('dialog', { name: 'Card for the taxi driver' })
      await card.waitFor()
      assert(flat(await card.locator('p').first().innerText()) === 'Per favore, mi porti a:', 'first line')
      await page.keyboard.press('Escape')
      await card.waitFor({ state: 'hidden' })
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  // ---------- D7: importing an older backup merges ----------
  {
    const at = (h, m) => new Date(Date.UTC(2026, 9, 9, h - 2, m)).toISOString()
    const expense = (id, amount, t) => ({ id, amount, currency: 'EUR', cat: 'food', dayId: 'fri', at: t, updatedAt: t })
    const local = {
      ...SEED,
      expenses: { 'c-local': expense('c-local', 5, at(18, 0)), 'c-both': expense('c-both', 9, at(18, 5)) },
      stamps: { 'sight-galleria-doria-pamphilj': { on: true, at: at(18, 10), updatedAt: at(18, 10) } },
    }
    const { ctx, page, errors } = await scenario({ progress: local, at: '2026-10-09T18:30', path: '/settings' })
    await check('D7 importing an older backup keeps the newer local costs and stamps (a merge, not a replace)', async () => {
      const stored = await page.evaluate(id => JSON.parse(localStorage.getItem('travel:trips:v1') || '[]').find(t => t.id === id), TRIP)
      assert(stored, 'no trip saved')
      const older = { ...SEED, expenses: { 'c-old': expense('c-old', 3, at(9, 0)), 'c-both': expense('c-both', 4, at(9, 5)) } }
      const backup = { app: 'travels', version: 1, exportedAt: at(9, 30), trips: [stored], progress: { [TRIP]: older } }
      await page.locator('input[type=file]').setInputFiles({ name: 'travels-backup-2026-10-09.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
      await toastWith(page, 'Imported')
      const p = await readProgress(page)
      assert(p.expenses['c-local']?.amount === 5, 'the newer local cost is gone')
      assert(p.expenses['c-old']?.amount === 3, 'the backup\'s own cost did not come in')
      assert(p.expenses['c-both']?.amount === 9, `the newer copy lost: ${JSON.stringify(p.expenses['c-both'])}`)
      assert(p.stamps['sight-galleria-doria-pamphilj']?.on === true, 'the local stamp is gone')
      assert(Object.keys(p.stops).length === Object.keys(SEED.stops).length, 'ticks changed')
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  {
    const { ctx, page, errors } = await scenario({ progress: null, at: '2026-10-09T18:30', path: '/settings' })
    await check('Review: a backup whose costs and stamps are lists, imported on a device with nothing yet, still keeps the costs logged after it', async () => {
      const stored = await page.evaluate(id => JSON.parse(localStorage.getItem('travel:trips:v1') || '[]').find(t => t.id === id), TRIP)
      assert(stored, 'no trip saved')
      const backup = { app: 'travels', version: 1, trips: [stored], progress: { [TRIP]: { ...SEED, expenses: [], stamps: [] } } }
      await page.locator('input[type=file]').setInputFiles({ name: 'travels-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
      await toastWith(page, 'Imported')
      const p = await readProgress(page)
      assert(p && !Array.isArray(p.expenses) && !Array.isArray(p.stamps), `stored ${JSON.stringify({ expenses: p?.expenses, stamps: p?.stamps })}`)
      assert(Object.keys(p.stops).length === Object.keys(SEED.stops).length, 'the ticks did not come in')
      await go(page, 'costs')
      await page.locator('.padcard').getByRole('button', { name: '9', exact: true }).click()
      await page.locator('.padcard button.cat', { hasText: 'Food' }).click()
      await toastWith(page, 'Added €9.00 · Food')
      const kept = await until('the cost stored', async () => Object.values((await readProgress(page))?.expenses ?? {}).find(e => e.amount === 9))
      assert(kept.cat === 'food' && kept.dayId === 'fri', JSON.stringify(kept))
      await noPageErrors(errors)
    })
    await ctx.close()
  }

  // ---------- dark mode ----------
  {
    const { ctx, page, errors } = await scenario({ at: FRI_2230, dark: true })
    await shot(page, 'now-fri-2230-dark')
    await check('dark mode: the Getting back card\'s text reads at 4.5:1 or better', async () => {
      await page.locator('.hc').waitFor()
      for (const sel of ['.hc h2', '.hc .muted', '.hc .hc-line', '.hc .kicker', '.hc .call']) {
        const c = await contrastOf(page, sel)
        assert(c >= 4.5, `${sel} ${c}:1`)
      }
    })
    await ctx.close()
    const b = await scenario({ at: FRI_1640, dark: true, width: 320 })
    await shot(b.page, 'now-fri-1640-dark-320')
    await check('dark mode at 320 px: the money row and the day card read at 4.5:1; no sideways scroll', async () => {
      for (const sel of ['.money .mn-l1', '.money .muted', '.daycard .dc-stamps']) {
        const c = await contrastOf(b.page, sel)
        assert(c >= 4.5, `${sel} ${c}:1`)
      }
      assert(await noSideScroll(b.page), JSON.stringify(await sideScroll(b.page)))
      await noPageErrors([...errors, ...b.errors])
    })
    await b.ctx.close()
  }

  // ---------- the Guide's charts (InfoSpecial.vue) ----------
  for (const width of [390, 320]) {
    const { ctx, page, errors } = await scenario({ at: FRI_1640, path: 'guide', width })
    await check(`the Guide's night chart reads at ${width} px: whole times, axis labels apart`, async () => {
      await page.locator('button', { hasText: 'Clubs, crawls' }).first().click()
      const chart = page.locator('.night')
      await chart.waitFor()
      await chart.scrollIntoViewIfNeeded()
      const m = await chart.evaluate((el) => {
        const shown = [...el.querySelectorAll('.nt, .nbt')].filter(x => x.getClientRects().length && getComputedStyle(x).display !== 'none')
        // Cut short: the time sticks out of the box that holds it (the row's label, or the bar that clips it).
        const cut = shown.filter((x) => {
          const holder = x.closest('.nbar') ?? x.closest('.nl')
          const r = x.getBoundingClientRect()
          const h = holder.getBoundingClientRect()
          return r.right > h.right + 0.5 || r.left < h.left - 0.5 || holder.scrollWidth > holder.clientWidth + 1
        })
        const ticks = [...el.querySelectorAll('.axis-tick')].filter(x => getComputedStyle(x).display !== 'none').map(x => x.getBoundingClientRect())
        const overlap = ticks.some((r, i) => i > 0 && r.left < ticks[i - 1].right + 2)
        const box = el.getBoundingClientRect()
        const outside = ticks.some(r => r.left < box.left || r.right > box.right)
        return { times: shown.map(x => x.textContent.trim()), cut: cut.length, overlap, outside, labels: ticks.length }
      })
      assert(m.times.length === 4 && m.times.every(t => /^\d\d:\d\d–\d\d:\d\d$/.test(t)), `times ${JSON.stringify(m.times)}`)
      assert(!m.cut && !m.overlap && !m.outside && m.labels >= 3, JSON.stringify(m))
      assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
      await shot(page, `guide-night-${width}`)
    })
    if (width === 390) {
      await check('the Guide\'s budget line ends "(≈ ₺28,065)." with no space before the full stop', async () => {
        await page.locator('button', { hasText: 'About €150 a full day' }).first().click()
        const line = flat(await page.locator('.budget p').last().innerText())
        assert(line.endsWith('(≈ ₺28,065).'), `reads "${line}"`)
      })
    }
    await check(`no page errors on the Guide at ${width} px`, () => noPageErrors(errors))
    await ctx.close()
  }

  // ---------- fixes from the final review ----------
  /** Stops ticked done in this trip's saved progress. */
  const doneCount = async page => Object.values((await readProgress(page))?.stops ?? {}).filter(x => x.status === 'done').length
  {
    // Fresh, live Fri 16:40: the morning is in "Did you do these?", the evening in "Later today".
    const { ctx, page, errors } = await scenario({ progress: null, at: FRI_1640 })
    await check('Review: a double tap on "Yes" in "Did you do these?" marks one stop, not the one that slides into its place', async () => {
      await page.locator('.catch .row-item').first().getByRole('button', { name: 'Yes' }).dblclick()
      await sleep(700)
      assert(await doneCount(page) === 1, `${await doneCount(page)} stops done`)
    })
    await check('Review: a double tap on a "Later today" tick marks one stop', async () => {
      await sleep(600)
      await page.locator('.later .tick').first().dblclick()
      await sleep(700)
      assert(await doneCount(page) === 2, `${await doneCount(page)} stops done`)
    })
    await check('Review: the map card\'s buttons stay under the tab bar and the header when scrolled behind them', async () => {
      // Scrolls so the middle of the card's button strip (28 px above its bottom) sits at height y.
      const stripAt = y => page.evaluate((to) => {
        window.scrollBy(0, document.querySelector('.mapcard').getBoundingClientRect().bottom - 28 - to)
      }, y)
      const missed = sel => page.evaluate(s => [...document.querySelectorAll(s)].filter((a) => {
        const r = a.getBoundingClientRect()
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('a, button') !== a
      }).map(a => a.textContent.trim()), sel)
      const tabMid = await page.evaluate(() => {
        const r = document.querySelector('nav.tabbar a').getBoundingClientRect()
        return r.top + r.height / 2
      })
      await stripAt(tabMid)
      await sleep(200)
      const tabs = await missed('nav.tabbar a')
      assert(!tabs.length, `taps on ${tabs.join(', ')} land on the map`)
      const sosMid = await page.evaluate(() => {
        const r = document.querySelector('.sosbtn').getBoundingClientRect()
        return r.top + r.height / 2
      })
      await stripAt(sosMid)
      await sleep(200)
      const sos = await missed('.sosbtn')
      assert(!sos.length, 'a tap on SOS lands on the map')
    })
    await check('no page errors (review, Fresh at Fri 16:40)', () => noPageErrors(errors))
    await ctx.close()
  }
  {
    const { ctx, page, errors } = await scenario({ at: FRI_1640, path: 'plan?day=fri' })
    await check('Review: on Plan, the day map\'s expand button stays under the tab bar', async () => {
      await page.evaluate(() => {
        const tab = document.querySelector('nav.tabbar a').getBoundingClientRect()
        window.scrollBy(0, document.querySelector('.mapcard').getBoundingClientRect().bottom - 28 - (tab.top + tab.height / 2))
      })
      await sleep(200)
      const off = await page.evaluate(() => [...document.querySelectorAll('nav.tabbar a')].filter((a) => {
        const r = a.getBoundingClientRect()
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('a, button') !== a
      }).map(a => a.textContent.trim()))
      assert(!off.length, `taps on ${off.join(', ')} land on the map`)
    })
    await check('no page errors (review, Plan)', () => noPageErrors(errors))
    await ctx.close()
  }
  await check('Review: the day picture\'s kicker reads at 4.5:1 or more over the art on phones (Fri, Sat and Mon; 390 and 320 px)', async () => {
    const low = []
    for (const width of [390, 320]) {
      for (const day of ['fri', 'sat', 'mon']) {
        const { ctx, page } = await scenario({ at: FRI_1640, path: `plan?day=${day}`, width })
        const k = page.locator('.dh-in .k')
        const box = await k.boundingBox()
        const color = await k.evaluate(el => getComputedStyle(el).color)
        await page.addStyleTag({ content: '.dh-in, .dh-chip { visibility: hidden !important; }' })
        await sleep(150)
        const png = (await page.screenshot({ clip: { x: box.x, y: box.y, width: Math.min(box.width, width - box.x - 1), height: box.height } })).toString('base64')
        // The median contrast of the kicker's colour against the art and scrim behind it, pixel by pixel.
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
        }, [png, color])
        if (median < 4.5) low.push(`${day} at ${width} px: ${median.toFixed(2)}:1`)
        await ctx.close()
      }
    }
    assert(!low.length, low.join('; '))
  })
  {
    const { ctx, page, errors } = await scenario({ at: PRE_TRIP, path: 'packing' })
    await check('Review: a double tap on the first box to pack packs that one only (the next slides into its place)', async () => {
      await page.locator('ul.list').first().locator('input[type=checkbox]').first().dblclick()
      await sleep(700)
      const n = Object.values((await readProgress(page))?.packing ?? {}).filter(Boolean).length
      assert(n === 13, `${n} packed (Seed S has 12)`)
    })
    await check('no page errors (review, Packing)', () => noPageErrors(errors))
    await ctx.close()
  }
  for (const path of ['bookings', 'now']) {
    const { ctx, page, errors } = await scenario({ progress: null, at: PRE_TRIP, path })
    await check(`Review: a double tap on the first booking's box on ${path === 'now' ? 'Now\'s Get ready' : 'Bookings'} ticks one booking`, async () => {
      const box = path === 'now' ? page.locator('.book-rows input[type=checkbox]').first() : page.locator('label.bk-check input').first()
      await box.dblclick()
      await sleep(700)
      const n = Object.values((await readProgress(page))?.bookings ?? {}).filter(Boolean).length
      assert(n === 1, `${n} bookings ticked`)
    })
    await check(`no page errors (review, ${path})`, () => noPageErrors(errors))
    await ctx.close()
  }

  // ---------- copy ----------
  await check('A4 no em dash in the files of this package; the Settings map line is the new one', async () => {
    const files = [
      'app/pages/trips/[id]/now.vue', 'app/pages/trips/[id]/plan.vue', 'app/components/HomeCard.vue', 'app/components/DriverCard.vue',
      'app/pages/trips/[id]/sos.vue', 'app/components/StarRating.vue', 'app/pages/trips/[id]/bookings.vue', 'app/pages/trips/[id]/packing.vue',
      'app/pages/settings.vue', 'app/components/StopRow.vue', 'app/components/InfoSpecial.vue', 'tests/e2e/day.e2e.mjs',
    ]
    const bad = files.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(EM_DASH))
    assert(!bad.length, `em dash in ${bad.join(', ')}`)
    const settings = readFileSync(join(ROOT, 'app/pages/settings.vue'), 'utf8')
    assert(settings.includes('Shops, restaurants and transit from Google, with real walking and transit times for “leave by”. Offline, the map shows the areas you looked at with OpenStreetMap on.'), 'Google map line')
    assert(settings.includes('mergeProgress('), 'import does not merge')
  })
}
finally {
  await browser.close()
}
