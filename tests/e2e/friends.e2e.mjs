// Browser checks of package P3, friends and the feed (docs/design/2026-10-14-together.md, 5.5 to 5.8), on a memory build
// (NUXT_PUBLIC_SOCIAL_BACKEND=memory npm run generate), phone-sized Chromium from ./lib.mjs:
//   node tests/e2e/friends.e2e.mjs            (against TRAVELS_URL or the dev server, run as a memory build)
//   node tests/e2e/friends.e2e.mjs --build    (serves .output/public on port 4177 and checks that)
//   ONLY=F8,F9 node tests/e2e/friends.e2e.mjs --build    (only the checks whose names start with those labels)
// The device is lib.mjs's TEST_ACCOUNT; Ali, Can, Deniz and Ece act through the memory backend's hooks (social-lib.mjs).
// Every request that would leave the app's own address is stopped.
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import {
  BASE, TRIP, assert, check, loadTrip, noSideScroll, phone, ready, romeCopy, seedS, serveBuild, sideScroll, smallTargets, useBase,
} from './lib.mjs'
import { ALI, CAN, DENIZ, ME, act, befriend, cloudOf, profileOf, socialReady } from './social-lib.mjs'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const srv = process.argv.includes('--build') ? await serveBuild(4177) : null
if (srv) useBase(srv.url)
const ORIGIN = new URL(BASE).origin
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean)
const browser = await chromium.launch()

/** A made-up person of this file only (nothing personal). */
const ECE = Object.freeze({ uid: 'u-ece', name: 'Ece Kaya', photo: null })
const trip = loadTrip()
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const sleep = ms => new Promise(r => setTimeout(r, ms))
/** U+2014, written by its code so this file never holds one. */
const EM_DASH = String.fromCharCode(0x2014)

/** Runs a check unless ONLY names others. */
async function test(name, fn) {
  if (ONLY.length && !ONLY.includes(name.split(' ')[0])) return
  return check(name, fn)
}

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

/** A phone of lib.mjs whose requests to any other address than the app's are stopped (`away` lists them). */
async function device(opts = {}) {
  const d = await phone(browser, opts)
  d.away = []
  await d.ctx.route('**/*', (route) => {
    const url = route.request().url()
    if (url.startsWith(ORIGIN) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue()
    d.away.push(url)
    return route.abort()
  })
  return d
}

/** A full load of an app path ("friends?tab=you", "f/<token>", ""). */
async function open(page, path = '') {
  await page.goto(`${BASE}${path.replace(/^\//, '')}`, { waitUntil: 'domcontentloaded' })
  await ready(page)
}

async function toastWith(page, text, ms = 6000) {
  const t = page.locator('.toasts .toast:not(.off)', { hasText: text }).last()
  await t.waitFor({ timeout: ms })
  return t
}

const dialog = (page, name) => page.getByRole('dialog', { name })
const today = page => page.evaluate(() => new Date().toISOString().slice(0, 10))
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/** The sample trip moved to start `days` after today (UTC) and made a trip of its own to Lisbon: always ahead. */
function laterTrip(days) {
  const t = romeCopy(trip)
  const start = addDays(new Date().toISOString().slice(0, 10), days)
  const shift = Math.round((Date.parse(`${start}T00:00:00Z`) - Date.parse(`${t.start}T00:00:00Z`)) / 86_400_000)
  delete t.seedId
  delete t.seedVersion
  Object.assign(t, { id: 'lisbon-later', title: 'Lisbon', destination: 'Lisbon', country: 'Portugal', subtitle: 'Ahead of us', edited: true, start, end: addDays(t.end, shift) })
  t.days = t.days.map(x => ({ ...x, date: addDays(x.date, shift) }))
  for (const b of t.bookings ?? []) {
    if (b.due) b.due = addDays(b.due, shift)
  }
  return t
}

/** A small PNG drawn in the page (two colours), as a file buffer. */
async function png(page, w = 48, h = 32) {
  const b64 = await page.evaluate(([w, h]) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const x = c.getContext('2d')
    x.fillStyle = '#C99A2E'
    x.fillRect(0, 0, w, h)
    x.fillStyle = '#8A1538'
    x.fillRect(0, 0, w / 2, h)
    return c.toDataURL('image/png').split(',')[1]
  }, [w, h])
  return Buffer.from(b64, 'base64')
}

/** The posts in the fake cloud, newest first. */
async function posts(page) {
  return Object.values((await cloudOf(page)).posts ?? {}).sort((a, b) => b.at - a.at)
}

/**
 * Text whose contrast with what is behind it is under 4.5:1 (as landing.e2e.mjs measures it): the text colour with every
 * opacity above it, over the background colours of its boxes. Text in SVG, screen-reader text, disabled controls and
 * on pictures is left out; so is text behind an open sheet's scrim.
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
    const sheet = document.querySelector('.sheet-wrap')
    const out = []
    const seen = new Set()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!el || seen.has(el) || !n.textContent.trim()) continue
      seen.add(el)
      if (el.closest('svg, .sr-only, :disabled, [aria-disabled="true"], .art-frame, .toasts')) continue
      if (sheet && !sheet.contains(el)) continue
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
      if (k < MIN) out.push({ text: String(n.textContent).replace(/\s+/g, ' ').trim().slice(0, 40), ratio: Math.round(k * 100) / 100, color: s.color, cls: typeof el.className === 'string' ? el.className : '' })
    }
    return out
  }, min)
}

/** Scrolls the page (and an open sheet) through, so lazy parts draw, then back to the top. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    const boxes = [document.scrollingElement, ...document.querySelectorAll('.sheet .body')].filter(Boolean)
    for (const b of boxes) {
      for (let y = 0; y < b.scrollHeight; y += Math.round(innerHeight * 0.7)) {
        b.scrollTop = y
        await new Promise(r => setTimeout(r, 60))
      }
      b.scrollTop = 0
    }
  })
  await sleep(150)
}

/** Every rule of the screens: no sideways scroll, 44 px targets, 4.5:1 text, no page error. */
async function screenRules(d, where) {
  await scrollThrough(d.page)
  assert(await noSideScroll(d.page), `${where}: sideways scroll ${JSON.stringify(await sideScroll(d.page))}`)
  // Scroll each part into view in turn, so every control is measured where it can be tapped.
  const small = []
  const tall = await d.page.evaluate(() => {
    const b = document.querySelector('.sheet .body') ?? document.scrollingElement
    return { h: b.scrollHeight, view: b.clientHeight }
  })
  for (let y = 0; y < Math.max(1, tall.h); y += Math.max(200, Math.round(tall.view * 0.8))) {
    await d.page.evaluate((top) => {
      const b = document.querySelector('.sheet .body') ?? document.scrollingElement
      b.scrollTop = top
    }, y)
    await sleep(80)
    for (const s of await smallTargets(d.page)) {
      if (!small.some(x => x.text === s.text && x.label === s.label && x.cls === s.cls)) small.push(s)
    }
  }
  await d.page.evaluate(() => {
    const b = document.querySelector('.sheet .body') ?? document.scrollingElement
    b.scrollTop = 0
  })
  assert(!small.length, `${where}: small targets ${JSON.stringify(small.slice(0, 5))}`)
  const low = await lowContrast(d.page)
  assert(!low.length, `${where}: low contrast ${JSON.stringify(low.slice(0, 5))}`)
  assert(!d.errors.length, `${where}: page errors ${d.errors.join(' / ')}`)
}

/**
 * A cloud with something in it, as the device's account sees it: Ali and Can are friends (Ali travelling now, in Rome
 * over your dates; Can in Lisbon soon), each has posted, Ali commented, Deniz asked to be friends, Ali liked your post.
 */
async function seed(page) {
  const t = await today(page)
  await befriend(page, ALI, ME)
  await befriend(page, CAN, ME)
  await profileOf(page, ALI, { bio: 'Slow mornings, fast trains.', homeCity: 'Istanbul' })
  await act(page, ALI, 'claimHandle', 'ali.d')
  await act(page, ALI, 'saveCard', { showTrips: true, trips: [{ title: 'Rome', destination: 'Rome', start: t < '2026-10-10' ? t : '2026-10-10', end: addDays(t, 2) > '2026-10-13' ? addDays(t, 2) : '2026-10-13' }] })
  await act(page, CAN, 'saveCard', { showTrips: true, trips: [{ title: 'Lisbon weekend', destination: 'Lisbon', country: 'Portugal', start: addDays(t, 6), end: addDays(t, 9) }] })
  const ali = await act(page, ALI, 'createPost', { kind: 'moment', text: 'Sunset from the Pincio terrace. Worth the climb.', trip: { title: 'Rome', destination: 'Rome' }, place: { name: 'Pincio' } }, [ALI.uid, ME.uid])
  await act(page, CAN, 'createPost', { kind: 'day', text: '', recap: '11 stops · 4 stamps · ★★★★', trip: { title: 'Rome', destination: 'Rome' } }, [CAN.uid, ME.uid])
  const mine = await act(page, ME, 'createPost', { kind: 'moment', text: 'Supplì at Trastevere, still warm.', place: { name: 'Trastevere' } }, [ME.uid, ALI.uid, CAN.uid])
  await act(page, ALI, 'addComment', ali.id, 'Come up at 18:30, the light is best then.')
  await act(page, ALI, 'setLike', mine.id, true)
  await act(page, ALI, 'notify', ME.uid, { kind: 'like', text: 'liked your post', link: `/friends?post=${mine.id}`, ref: mine.id })
  await profileOf(page, DENIZ)
  await act(page, DENIZ, 'sendRequest', ME)
  await profileOf(page, ECE, { bio: 'Night trains and day hikes.', homeCity: 'Izmir' })
  const inv = await act(page, ECE, 'createInvite', { kind: 'friend' })
  return { ali: ali.id, mine: mine.id, eceToken: inv.token }
}

try {
  // ---------- the main device: one account, through the whole flow ----------
  // The sample trip, and a trip that is always ahead (your card holds trips that ended in the last two weeks, so the
  // sample alone would leave it empty some day).
  const later = laterTrip(10)
  const d = await device({ progress: seedS(trip), trips: [romeCopy(trip), later] })
  let myToken = ''

  await test('F1 /friends signed in: "Friends", the bell, Add friends, and Feed · Friends · You kept in ?tab=', async () => {
    await open(d.page, 'friends')
    await socialReady(d.page)
    assert(flat(await d.page.locator('h1').innerText()) === 'Friends', 'no "Friends" heading')
    assert(await d.page.getByRole('button', { name: 'Activity', exact: true }).isVisible(), 'no bell')
    assert(await d.page.getByRole('button', { name: 'Add friends' }).first().isVisible(), 'no Add friends')
    const tabs = await d.page.locator('.tabs button').allInnerTexts()
    assert(JSON.stringify(tabs.map(flat)) === JSON.stringify(['Feed', 'Friends', 'You']), `tabs: ${tabs}`)
    assert(flat(await d.page.locator('.prompt .ptx').innerText()).startsWith('Share a moment from your trip'), 'no prompt card')
    const empty = d.page.locator('.empty')
    await empty.waitFor()
    assert(flat(await empty.locator('h3').innerText()) === 'No posts yet' && flat(await empty.locator('p').innerText()) === 'When friends share moments from their trips, they show up here.', `empty feed: ${flat(await empty.innerText())}`)
    assert(await empty.getByRole('button', { name: 'Add friends' }).isVisible(), 'no Add friends in the empty feed')
    await d.page.locator('.tabs').getByRole('button', { name: 'You' }).click()
    await until('?tab=you', () => new URL(d.page.url()).searchParams.get('tab') === 'you')
    assert(await d.page.locator('.tabs button[aria-pressed="true"]').innerText() === 'You', 'You is not pressed')
    assert(!d.errors.length, d.errors.join(' / '))
  })

  await test('F2 You: your friend link (/f/<token>) with its QR code; the token is your friend invite in the cloud', async () => {
    await open(d.page, 'friends?tab=you')
    await socialReady(d.page)
    const addr = d.page.locator('.plinks .sl .u').first()
    await addr.waitFor()
    const url = await addr.getAttribute('title')
    const m = /\/f\/([\w-]+)$/.exec(url ?? '')
    assert(m, `link: ${url}`)
    myToken = m[1]
    await d.page.locator('.plinks').getByRole('button', { name: 'QR code' }).click()
    await d.page.locator('.plinks svg.qr').waitFor()
    const inv = (await cloudOf(d.page)).invites[myToken]
    assert(inv?.kind === 'friend' && inv.from === ME.uid && !inv.revoked, `invite: ${JSON.stringify(inv)}`)
  })

  await test('F3 Ali adds you through your link: he shows in Friends', async () => {
    await profileOf(d.page, ALI)
    await act(d.page, ALI, 'addFriendByInvite', myToken)
    await open(d.page, 'friends?tab=friends')
    const list = d.page.locator('section', { has: d.page.getByRole('heading', { name: /Your friends/ }) })
    await until('Ali in Your friends', async () => flat(await list.innerText()).includes('Ali Demir'))
  })

  await test('F4 /f/<token> signed in: "Add Can as a friend" adds him ("You and Can are friends", Open Friends); Can hears of it; your own link says so', async () => {
    await profileOf(d.page, CAN)
    const inv = await act(d.page, CAN, 'createInvite', { kind: 'friend' })
    await open(d.page, `f/${inv.token}`)
    const card = d.page.locator('.who')
    await until('Can on the page', async () => flat(await card.innerText()).includes('Can Yildiz'))
    await card.getByRole('button', { name: 'Add Can as a friend' }).click()
    await until('"You and Can are friends"', async () => flat(await card.innerText()).includes('You and Can are friends'))
    const cloud = await cloudOf(d.page)
    assert(Object.values(cloud.friendships).some(f => f.members.includes(CAN.uid) && f.members.includes(ME.uid)), 'no friendship with Can')
    await until('Can told', async () => Object.values((await cloudOf(d.page)).inbox[CAN.uid] ?? {}).some(i => i.kind === 'friend-accepted' && i.from === ME.uid))
    await card.getByRole('link', { name: 'Open Friends' }).click()
    await until('Friends tab', () => new URL(d.page.url()).pathname.endsWith('/friends') && new URL(d.page.url()).searchParams.get('tab') === 'friends')
    await until('Can listed', async () => flat(await d.page.locator('main, .page').first().innerText()).includes('Can Yildiz'))
    await open(d.page, `f/${inv.token}`)
    await until('already friends', async () => flat(await d.page.locator('.who').innerText()).includes('You and Can are friends'))
    await open(d.page, `f/${myToken}`)
    await until('your own link', async () => flat(await d.page.locator('.who').innerText()).includes('This is your friend link. Share it with the people you want to add.'))
    assert(!d.errors.length, d.errors.join(' / '))
  })

  await test('F5 a request from Deniz: a dot on Home\'s Friends button ("Friends, 2 new"), listed in Friends, and accepted', async () => {
    await profileOf(d.page, DENIZ)
    await act(d.page, DENIZ, 'sendRequest', ME)
    await open(d.page)
    const btn = d.page.locator('.home-top a[href$="/friends"]')
    await until('the label', async () => (await btn.getAttribute('aria-label')) === 'Friends, 2 new')
    assert(await btn.locator('.dot').isVisible(), 'no dot')
    await btn.click()
    await until('/friends', () => new URL(d.page.url()).pathname.endsWith('/friends'))
    await d.page.locator('.tabs').getByRole('button', { name: /Friends/ }).click()
    const req = d.page.locator('.reqs')
    await until('Deniz asks', async () => {
      const t = (await req.count()) ? flat(await req.innerText()) : ''
      return t.includes('Deniz Aksoy') && t.includes('Wants to be friends')
    })
    await req.getByRole('button', { name: 'Accept' }).click()
    await toastWith(d.page, 'You and Deniz are friends')
    await until('the request gone', async () => !(await d.page.locator('.reqs').count()))
    const cloud = await cloudOf(d.page)
    assert(Object.values(cloud.friendships).some(f => f.members.includes(DENIZ.uid)), 'no friendship with Deniz')
    assert(Object.values(cloud.inbox[ME.uid] ?? {}).every(i => i.read), 'the request\'s line is still unread')
    await open(d.page)
    await until('no dot', async () => (await d.page.locator('.home-top a[href$="/friends"]').getAttribute('aria-label')) === 'Friends')
  })

  let aliPost = ''
  await test('F6 Ali posts: it shows in your feed at once (live)', async () => {
    await open(d.page, 'friends')
    await socialReady(d.page)
    const p = await act(d.page, ALI, 'createPost', { kind: 'moment', text: 'Sunset from the Pincio terrace. Worth the climb.', trip: { title: 'Rome', destination: 'Rome' }, place: { name: 'Pincio' } }, [ALI.uid, ME.uid])
    aliPost = p.id
    const card = d.page.locator('article.post', { hasText: 'Sunset from the Pincio terrace' })
    await card.waitFor({ timeout: 6000 })
    const text = flat(await card.innerText())
    assert(text.includes('Ali Demir') && text.includes('Rome') && text.includes('Pincio'), `card: ${text}`)
  })

  await test('F7 you post a moment with a photo and text from "Share a moment from your trip"', async () => {
    await d.page.locator('.prompt').click()
    const sh = dialog(d.page, 'New post')
    await sh.waitFor()
    assert(flat(await sh.innerText()).includes('Posting to your friends'), 'no "Posting to your friends"')
    await sh.locator('textarea').fill('Gelato by the Pantheon, pistachio wins.')
    await sh.locator('input[type=file]').setInputFiles({ name: 'moment.png', mimeType: 'image/png', buffer: await png(d.page) })
    await sh.locator('.pic img').waitFor()
    await d.page.getByRole('button', { name: 'Post', exact: true }).click()
    await toastWith(d.page, 'Posted to your friends')
    await until('the sheet closed', async () => !(await sh.count()) && !new URL(d.page.url()).searchParams.get('compose'))
    const card = d.page.locator('article.post', { hasText: 'Gelato by the Pantheon' })
    await card.waitFor()
    const src = await card.locator('img.photo').getAttribute('src')
    assert(src?.startsWith('data:image/jpeg'), `photo: ${src?.slice(0, 40)}`)
    const mine = (await posts(d.page)).find(p => p.text.startsWith('Gelato'))
    assert(mine && mine.author === ME.uid && mine.photo && [ALI.uid, CAN.uid, DENIZ.uid].every(u => mine.audience.includes(u)), `post: ${JSON.stringify({ ...mine, photo: !!mine?.photo })}`)
  })

  await test('F8 like and comment on Ali\'s post: Ali hears of both, "Liked by you", and his comment arrives live', async () => {
    const card = d.page.locator('article.post', { hasText: 'Sunset from the Pincio terrace' })
    const like = card.getByRole('button', { name: /^Like/ })
    await like.click()
    await until('liked', async () => (await like.getAttribute('aria-pressed')) === 'true' && flat(await like.innerText()) === '1')
    await until('Ali told of the like', async () => Object.values((await cloudOf(d.page)).inbox[ALI.uid] ?? {}).some(i => i.kind === 'like' && i.text === 'liked your post' && i.link === `/friends?post=${aliPost}` && i.ref === aliPost))
    assert((await cloudOf(d.page)).posts[aliPost].likes[ME.uid] === true, 'the like is not in the post')
    await card.getByRole('button', { name: /^Comment/ }).click()
    const sh = dialog(d.page, 'Ali’s post')
    await sh.waitFor()
    assert(new URL(d.page.url()).searchParams.get('post') === aliPost, `url: ${d.page.url()}`)
    await until('"Liked by you"', async () => flat(await sh.locator('.likedby').innerText()) === 'Liked by you')
    await d.page.getByPlaceholder('Write a comment').fill('Going up tomorrow, thanks for the tip.')
    await d.page.getByRole('button', { name: 'Send' }).click()
    await until('your comment', async () => flat(await sh.locator('.cmts').innerText()).includes('Going up tomorrow, thanks for the tip.'))
    await until('Ali told of the comment', async () => Object.values((await cloudOf(d.page)).inbox[ALI.uid] ?? {}).some(i => i.kind === 'comment' && i.text === 'commented: Going up tomorrow, thanks for the tip.' && i.link === `/friends?post=${aliPost}`))
    await act(d.page, ALI, 'addComment', aliPost, 'Take the stairs from Piazza del Popolo.')
    await until('Ali\'s comment, live', async () => flat(await sh.locator('.cmts').innerText()).includes('Take the stairs from Piazza del Popolo.'))
    const order = (await sh.locator('.cm .ctext').allInnerTexts()).map(flat)
    assert(order.indexOf('Going up tomorrow, thanks for the tip.') < order.indexOf('Take the stairs from Piazza del Popolo.'), `not oldest first: ${order}`)
    // You can delete your own comment here, not Ali's (it isn't your post).
    assert(await sh.getByRole('button', { name: 'Delete your comment' }).count() === 1, 'no delete for your comment')
    assert(!(await sh.getByRole('button', { name: /Delete Ali’s comment/ }).count()), 'a delete for Ali\'s comment on his post')
    d.page.once('dialog', dlg => void dlg.accept())
    await sh.getByRole('button', { name: 'Delete your comment' }).click()
    await until('your comment gone', async () => !flat(await sh.locator('.cmts').innerText()).includes('Going up tomorrow'))
    await d.page.keyboard.press('Escape')
    await until('closed', () => !new URL(d.page.url()).searchParams.get('post'))
  })

  await test('F9 delete your post from its "…" menu (with a question first)', async () => {
    const card = d.page.locator('article.post', { hasText: 'Gelato by the Pantheon' })
    await card.getByRole('button', { name: 'Post options' }).click()
    let asked = ''
    d.page.once('dialog', (dlg) => {
      asked = dlg.message()
      void dlg.accept()
    })
    await card.getByRole('menuitem', { name: 'Delete post' }).click()
    await toastWith(d.page, 'Post deleted')
    assert(asked.startsWith('Delete this post?'), `asked: ${asked}`)
    await until('gone from the feed', async () => !(await d.page.locator('article.post', { hasText: 'Gelato by the Pantheon' }).count()))
    assert(!(await posts(d.page)).some(p => p.text.startsWith('Gelato')), 'still in the cloud')
  })

  await test('F10 Activity: what happened, newest first, unread marked; a line opens its post; Mark all read', async () => {
    const mine = await act(d.page, ME, 'createPost', { kind: 'moment', text: 'Morning espresso at the bar, standing.' }, [ME.uid, ALI.uid])
    await act(d.page, ALI, 'notify', ME.uid, { kind: 'like', text: 'liked your post', link: `/friends?post=${mine.id}`, ref: mine.id })
    await sleep(20)
    await act(d.page, CAN, 'notify', ME.uid, { kind: 'comment', text: 'commented: Grazie!', link: `/friends?post=${mine.id}`, ref: mine.id })
    const bell = d.page.locator('.fh .bell')
    await until('"Activity, 2 new"', async () => (await bell.getAttribute('aria-label')) === 'Activity, 2 new')
    await bell.click()
    const sh = dialog(d.page, 'Activity')
    await sh.waitFor()
    const lines = (await sh.locator('.item .line').allInnerTexts()).map(flat)
    assert(lines[0] === 'Can Yildiz commented: Grazie!' && lines[1] === 'Ali Demir liked your post', `lines: ${JSON.stringify(lines)}`)
    assert(await sh.locator('.item.unread').count() === 2, 'not marked unread')
    await sh.locator('.item', { hasText: 'Ali Demir liked your post' }).click()
    await until('the post opens', () => new URL(d.page.url()).searchParams.get('post') === mine.id)
    await dialog(d.page, 'Your post').waitFor()
    await until('that line read', async () => Object.values((await cloudOf(d.page)).inbox[ME.uid]).filter(i => !i.read).length === 1)
    await d.page.goBack()
    await sh.waitFor()
    await sh.getByRole('button', { name: 'Mark all read' }).click()
    await until('all read', async () => Object.values((await cloudOf(d.page)).inbox[ME.uid]).every(i => i.read))
    await until('no unread', async () => !(await sh.locator('.item.unread').count()))
    await until('the bell without a dot', async () => (await bell.getAttribute('aria-label')) === 'Activity')
    await d.page.keyboard.press('Escape')
  })

  await test('F11 Find by @handle: a bad handle, nobody, then Ece, asked to be friends (Waiting, with Cancel)', async () => {
    await profileOf(d.page, ECE)
    await act(d.page, ECE, 'claimHandle', 'ece.k')
    await open(d.page, 'friends?tab=friends')
    await socialReady(d.page)
    const add = d.page.locator('#add-friends')
    const field = add.getByRole('textbox')
    await field.fill('a')
    await add.getByRole('button', { name: 'Find' }).click()
    await until('the handle rule', async () => flat(await add.innerText()).includes('Handles are 3 to 20 lower-case letters, numbers, dots or underscores.'))
    await field.fill('@nobody.here')
    await add.getByRole('button', { name: 'Find' }).click()
    await until('nobody', async () => flat(await add.innerText()).includes('No one has the handle @nobody.here.'))
    await field.fill('@Ece.K')
    await add.getByRole('button', { name: 'Find' }).click()
    const result = add.locator('.result')
    await until('Ece found', async () => (await result.count()) && flat(await result.innerText()).includes('Ece Kaya'))
    await result.getByRole('button', { name: 'Add friend' }).click()
    await toastWith(d.page, 'Request sent to Ece')
    await until('the request in the cloud', async () => !!(await cloudOf(d.page)).requests[`${ME.uid}_${ECE.uid}`])
    await until('Waiting', async () => flat(await result.innerText()).includes('Request sent. Waiting for an answer.'))
    const req = d.page.locator('.reqs')
    await until('listed as waiting', async () => {
      const t = (await req.count()) ? flat(await req.innerText()) : ''
      return t.includes('Ece Kaya') && t.includes('Waiting')
    })
    await req.getByRole('button', { name: 'Cancel your request to Ece' }).click()
    await toastWith(d.page, 'Request cancelled')
    await until('the request gone', async () => !(await cloudOf(d.page)).requests[`${ME.uid}_${ECE.uid}`])
  })

  await test('F12 You: a handle someone has, a bad one, then yours with a line about you and your home city', async () => {
    await act(d.page, ALI, 'claimHandle', 'ali')
    await open(d.page, 'friends?tab=you')
    await socialReady(d.page)
    const card = d.page.locator('.pcard')
    await card.getByRole('button', { name: 'Edit profile' }).click()
    const handle = card.getByRole('textbox', { name: /@handle/ })
    await handle.fill('ali')
    await card.getByRole('button', { name: 'Save' }).click()
    await until('taken', async () => flat(await card.innerText()).includes('Someone else has @ali. Try another.'))
    await handle.fill('_x')
    await card.getByRole('button', { name: 'Save' }).click()
    await until('invalid', async () => flat(await card.innerText()).includes('Use 3 to 20 lower-case letters, numbers, dots or underscores, not starting or ending with a dot or underscore.'))
    await handle.fill('test.traveller')
    await card.getByRole('textbox', { name: 'About you' }).fill('Here for the pasta and the people.')
    await card.getByRole('textbox', { name: 'Home city' }).fill('Istanbul')
    await card.getByRole('button', { name: 'Save' }).click()
    await toastWith(d.page, 'Profile saved')
    await until('the card', async () => {
      const t = flat(await card.innerText())
      return t.includes('@test.traveller') && t.includes('Here for the pasta and the people.') && t.includes('Istanbul')
    })
    const cloud = await cloudOf(d.page)
    const p = cloud.profiles[ME.uid]
    assert(p.handle === 'test.traveller' && p.bio === 'Here for the pasta and the people.' && p.homeCity === 'Istanbul' && cloud.handles['test.traveller'] === ME.uid, `profile: ${JSON.stringify(p)}`)
  })

  await test('F13 "Let friends see where I\'m going": off until turned on; then your card holds where and when of your trips (the sample while recent, and the trip ahead)', async () => {
    const sw = d.page.getByRole('switch', { name: 'Let friends see where I’m going' })
    assert(await sw.getAttribute('aria-checked') === 'false', 'on from the start')
    assert(!(await cloudOf(d.page)).cards[ME.uid]?.showTrips, 'a card showing trips already')
    await sw.click()
    await toastWith(d.page, 'Friends can see where you’re going')
    await until('on', async () => (await sw.getAttribute('aria-checked')) === 'true')
    const c = (await cloudOf(d.page)).cards[ME.uid]
    const recent = addDays(await today(d.page), -14) <= trip.end
    const want = [...(recent ? [['Rome', trip.start, trip.end]] : []), ['Lisbon', later.start, later.end]]
    const got = (c?.trips ?? []).map(t => [t.destination, t.start, t.end])
    assert(c?.showTrips && JSON.stringify(got) === JSON.stringify(want), `card: ${JSON.stringify(c)}`)
    assert(c.trips.every(t => Object.keys(t).every(k => ['title', 'destination', 'country', 'start', 'end', 'cover'].includes(k))), 'more than where and when')
    const seen = flat(await d.page.locator('.ptrips').innerText())
    assert(seen.includes('Friends see:') && seen.includes('Lisbon · ') && seen.includes('Rome · 8 to 12 Oct') === recent, `what friends see: ${seen}`)
  })

  await test('F14 a friend (?friend=): handle, home city, line, their trips with "You were both in Rome on 10 to 12 Oct", their posts', async () => {
    const t = await today(d.page)
    await profileOf(d.page, ALI, { bio: 'Slow mornings, fast trains.', homeCity: 'Istanbul' })
    await act(d.page, ALI, 'saveCard', { showTrips: true, trips: [{ title: 'Rome', destination: 'Rome', start: t < '2026-10-10' ? t : '2026-10-10', end: addDays(t, 2) > '2026-10-13' ? addDays(t, 2) : '2026-10-13' }] })
    await open(d.page, 'friends?tab=friends')
    await socialReady(d.page)
    await d.page.locator('section', { has: d.page.getByRole('heading', { name: /Your friends/ }) }).getByRole('button', { name: /Ali Demir/ }).click()
    const sh = dialog(d.page, 'Ali Demir')
    await sh.waitFor()
    assert(new URL(d.page.url()).searchParams.get('friend') === ALI.uid, `url: ${d.page.url()}`)
    await until('his card', async () => {
      const x = flat(await sh.innerText())
      return x.includes('@ali') && x.includes('Istanbul') && x.includes('Slow mornings, fast trains.')
    })
    await until('the overlap', async () => /You(’re| were) both in Rome on 10 to 12 Oct/.test(flat(await sh.innerText())))
    await until('his post', async () => flat(await sh.locator('.fposts').innerText()).includes('Sunset from the Pincio terrace'))
    await sh.locator('.fposts .mini').first().click()
    await until('the post', () => new URL(d.page.url()).searchParams.get('post') === aliPost && !new URL(d.page.url()).searchParams.get('friend'))
    await dialog(d.page, 'Ali’s post').waitFor()
  })

  await test('F15 Home: Friends with Ali travelling now (Rome), the two newest posts and Open the feed', async () => {
    await open(d.page)
    const hf = d.page.locator('.hf')
    await hf.waitFor()
    await until('Ali travelling', async () => flat(await hf.locator('.trav').innerText()).includes('Ali Rome'))
    assert(await hf.locator('.posts .mini').count() === 2, `posts: ${await hf.locator('.posts .mini').count()}`)
    await hf.locator('.face').first().click()
    await dialog(d.page, 'Ali Demir').waitFor()
    await d.page.keyboard.press('Escape')
    await until('closed', () => !new URL(d.page.url()).searchParams.get('friend'))
    await hf.getByRole('link', { name: 'Open the feed' }).click()
    await until('the feed', () => new URL(d.page.url()).pathname.endsWith('/friends'))
  })

  await test('F16 Unfriend (after a question): Can leaves Friends, and his posts your feed', async () => {
    await act(d.page, CAN, 'createPost', { kind: 'moment', text: 'Lisbon tram 28, front seat.' }, [CAN.uid, ME.uid])
    await open(d.page, `friends?friend=${CAN.uid}`)
    const sh = dialog(d.page, 'Can Yildiz')
    await sh.waitFor()
    let asked = ''
    d.page.once('dialog', (dlg) => {
      asked = dlg.message()
      void dlg.accept()
    })
    await sh.getByRole('button', { name: 'Unfriend' }).click()
    await toastWith(d.page, 'You’re no longer friends with Can')
    assert(asked.startsWith('Unfriend Can Yildiz?'), `asked: ${asked}`)
    await until('closed', () => !new URL(d.page.url()).searchParams.get('friend'))
    const cloud = await cloudOf(d.page)
    assert(!Object.values(cloud.friendships).some(f => f.members.includes(CAN.uid)), 'still friends in the cloud')
    assert(!Object.values(cloud.feeds[ME.uid] ?? {}).some(p => p.author === CAN.uid), 'his posts are still in your feed')
  })

  await test('F17 Plan\'s "Share your day" opens the composer as a day recap (the trip, the recap line, the day), and posts it', async () => {
    await open(d.page, `trips/${TRIP}/plan?day=fri`)
    await d.page.getByRole('button', { name: 'Share your day' }).click()
    const sh = dialog(d.page, 'New post')
    await sh.waitFor()
    const text = flat(await sh.innerText())
    assert(text.includes('Friday 9 October · Day 2 of 5'), `context: ${text.slice(0, 200)}`)
    const recap = flat(await sh.locator('.recap').innerText())
    assert(/^\d+ stops?( · \d+ stamps?)?( · ★+)?$/.test(recap), `recap: ${recap}`)
    assert(flat(await sh.locator('.chips').innerText()).includes('Rome'), 'no trip chip')
    await d.page.getByRole('button', { name: 'Post', exact: true }).click()
    await toastWith(d.page, 'Posted to your friends')
    const p = (await posts(d.page))[0]
    assert(p.kind === 'day' && p.recap === recap && p.trip?.title === 'Rome', `post: ${JSON.stringify(p)}`)
  })

  await test('F18 the composer opens on top of a trip\'s sheet (as "Post to friends" from a stop sheet does), and back shows the stop again', async () => {
    await open(d.page, `trips/${TRIP}/plan?day=fri&stop=pantheon`)
    await dialog(d.page, 'Pantheon').waitFor()
    await d.page.evaluate(() => {
      const router = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router
      return router.push({ query: { ...router.currentRoute.value.query, compose: '1' } })
    })
    await dialog(d.page, 'New post').waitFor()
    await sleep(500)
    const top = await d.page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight - 30)?.closest('[role="dialog"]')?.getAttribute('aria-label'))
    assert(top === 'New post', `on top: ${top}`)
    await d.page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await until('the composer closed', async () => !new URL(d.page.url()).searchParams.get('compose') && !(await dialog(d.page, 'New post').count()))
    assert(await dialog(d.page, 'Pantheon').isVisible(), 'the stop sheet went too')
    assert(!d.errors.length, d.errors.join(' / '))
  })

  await test('F19 offline: the feed says so and keeps what it had', async () => {
    await open(d.page, 'friends')
    await socialReady(d.page)
    await d.page.locator('article.post').first().waitFor()
    const before = await d.page.locator('article.post').count()
    await d.ctx.setOffline(true)
    try {
      await until('the offline line', async () => flat(await d.page.locator('.page').innerText()).includes('You’re offline. New posts load when you’re back.'))
      assert(await d.page.locator('article.post').count() === before, 'the posts went')
    }
    finally {
      await d.ctx.setOffline(false)
    }
    await until('the line gone', async () => !flat(await d.page.locator('.page').innerText()).includes('You’re offline.'))
  })

  await test('F20 a group trip\'s card on Home shows its members\' faces ("With Ali")', async () => {
    await open(d.page)
    await socialReady(d.page)
    const gid = await d.page.evaluate(id => window.__travelsTest.groups.makeGroup(id), TRIP)
    const inv = await act(d.page, ME, 'createInvite', { kind: 'trip', trip: gid, role: 'editor', tripTitle: 'Rome' })
    await profileOf(d.page, ALI)
    await act(d.page, ALI, 'joinGroup', inv.token)
    const card = d.page.locator('.tcard', { hasText: 'ROME' }).first()
    await until('the faces', async () => (await card.locator('.group [role="img"]').count()) && flat(await card.locator('.group .strong').innerText()) === 'With Ali')
    const label = await card.locator('.group [role="img"]').getAttribute('aria-label')
    assert(label === 'Planned together: Test and Ali', `faces: ${label}`)
    assert(!d.errors.length, d.errors.join(' / '))
  })
  await d.ctx.close()

  // ---------- /f/<token> on a device with no account ----------
  {
    const s = await device({ signedOut: true, trips: [romeCopy(trip)] })
    await test('F21 /f/<token> signed out: who sent it and "Sign in with Google to add Ali", nothing of the device; a reset link says so', async () => {
      await open(s.page, 'f/NoSuchLink123')
      await until('"This link doesn\'t work"', async () => flat(await s.page.locator('.who').innerText()).includes('This link doesn’t work'))
      await s.page.waitForFunction(() => !!window.__travelsSocial)
      await profileOf(s.page, ALI)
      const inv = await act(s.page, ALI, 'createInvite', { kind: 'friend' })
      await open(s.page, `f/${inv.token}`)
      const card = s.page.locator('.who')
      await until('Ali', async () => flat(await card.innerText()).includes('Ali Demir'))
      assert(await card.getByRole('button', { name: 'Sign in with Google to add Ali' }).isVisible(), 'no sign-in button')
      assert(new URL(s.page.url()).pathname.endsWith(`/f/${inv.token}`), `moved to ${s.page.url()}`)
      const body = flat(await s.page.locator('body').innerText())
      assert(!body.includes(trip.subtitle) && !(await s.page.locator('.tcard, .shell, .home').count()), 'the device\'s trip shows')
      assert(!s.away.length, `requests away: ${s.away.join(', ')}`)
      await act(s.page, ALI, 'revokeInvite', inv.token)
      await open(s.page, `f/${inv.token}`)
      await until('reset', async () => flat(await s.page.locator('.who').innerText()).includes('This link was reset. Ask for a new one.'))
      assert(!s.errors.length, s.errors.join(' / '))
    })
    await s.ctx.close()
  }

  // ---------- Home with no friends yet ----------
  {
    const n = await device({})
    await test('F22 Home with no friends yet: "Travel is better with friends." and Add friends (to Add friends on the Friends tab)', async () => {
      await open(n.page)
      await socialReady(n.page)
      const hf = n.page.locator('.hf')
      await hf.waitFor()
      assert(flat(await hf.innerText()).includes('Travel is better with friends. Add friends to share moments and plan trips together.'), `section: ${flat(await hf.innerText())}`)
      await hf.getByRole('link', { name: 'Add friends' }).click()
      await until('the Friends tab', () => new URL(n.page.url()).searchParams.get('tab') === 'friends')
      await until('Add friends in view and focused', () => n.page.evaluate(() => {
        const h = document.getElementById('add-h')
        const r = h?.getBoundingClientRect()
        return !!r && r.top >= 0 && r.top < innerHeight && document.activeElement === h
      }))
      assert(!n.errors.length, n.errors.join(' / '))
    })
    await n.ctx.close()
  }

  // ---------- the Home header: six controls of 44 px ----------
  for (const width of [390, 360, 320]) {
    const h = await device({ width })
    await test(`F23 Home's header at ${width} px: logo, Notes, Theme, Friends, Account, Settings, each at least 44 x 44, nothing cut`, async () => {
      await open(h.page)
      await socialReady(h.page)
      const m = await h.page.evaluate(() => {
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
      const labels = m.controls.map(c => c[0])
      assert(JSON.stringify(labels.slice(0, 4)) === JSON.stringify(['Travels home', 'Notes and chats', 'Theme: auto', 'Friends']) && labels.length === 6, `controls: ${JSON.stringify(m.controls)}`)
      const small = m.controls.filter(([, w, hh]) => w < 44 || hh < 44)
      assert(!small.length, `under 44 px: ${JSON.stringify(small)}`)
      assert(m.logo[0] >= 29.5 && m.logo[1] >= 29.5, `the logo is ${m.logo.join(' x ')}`)
      assert(m.cut <= 0 && await noSideScroll(h.page), `the header overflows by ${m.cut} px`)
    })
    await h.ctx.close()
  }

  // ---------- every new screen at 390 and 320 px, light and dark ----------
  for (const width of [390, 320]) {
    for (const dark of [false, true]) {
      const label = `${width} px${dark ? ', dark' : ''}`
      const m = await device({ width, dark })
      let ids = null
      const screens = [
        ['Friends: Feed', () => 'friends'],
        ['Friends: Friends', () => 'friends?tab=friends'],
        ['Friends: You', () => 'friends?tab=you'],
        ['New post', () => 'friends?compose=1', 'New post'],
        ['A post', () => `friends?post=${ids.ali}`, 'Ali’s post'],
        ['Activity', () => 'friends?inbox=1', 'Activity'],
        ['A friend', () => `friends?friend=${ALI.uid}`, 'Ali Demir'],
        ['Add a friend', () => `f/${ids.eceToken}`],
        ['Home', () => ''],
      ]
      for (const [name, path, sheetName] of screens) {
        await test(`F24 ${name} at ${label}: no sideways scroll, 44 px targets, text at 4.5:1, no page error`, async () => {
          m.errors.length = 0
          if (!ids) {
            await open(m.page, 'friends')
            await socialReady(m.page)
            ids = await seed(m.page)
          }
          await open(m.page, path())
          await socialReady(m.page)
          if (sheetName) await dialog(m.page, sheetName).waitFor()
          if (name === 'Friends: Feed') await m.page.locator('article.post').first().waitFor()
          if (name === 'Friends: Friends') await until('requests and friends', async () => flat(await m.page.locator('.flist').innerText()).includes('Lisbon'))
          if (name === 'Friends: You') {
            await m.page.locator('.plinks .sl').waitFor()
            await m.page.locator('.pcard').getByRole('button', { name: 'Edit profile' }).click()
          }
          if (name === 'A post') await until('the comment', async () => flat(await dialog(m.page, sheetName).innerText()).includes('the light is best'))
          if (name === 'Add a friend') await m.page.getByRole('button', { name: 'Add Ece as a friend' }).waitFor()
          if (name === 'Home') await m.page.locator('.hf .posts').waitFor()
          await sleep(350)
          await screenRules(m, `${name} at ${label}`)
          assert(!m.away.length, `requests away: ${m.away.join(', ')}`)
        })
      }
      await m.ctx.close()
      const s = await device({ width, dark, signedOut: true })
      await test(`F25 Add a friend, signed out, at ${label}: no sideways scroll, 44 px targets, text at 4.5:1, no page error`, async () => {
        await open(s.page, 'f/NoSuchLink123')
        await s.page.waitForFunction(() => !!window.__travelsSocial)
        await profileOf(s.page, ALI)
        const inv = await act(s.page, ALI, 'createInvite', { kind: 'friend' })
        await open(s.page, `f/${inv.token}`)
        await s.page.getByRole('button', { name: 'Sign in with Google to add Ali' }).waitFor()
        await screenRules(s, `signed-out Add a friend at ${label}`)
      })
      await s.ctx.close()
    }
  }

  // ---------- the landing page's Together card ----------
  {
    const l = await device({ signedOut: true })
    await test('F26 the landing page has a "Together" card (plan with friends, vote, chat, meet people), asking nothing of the network', async () => {
      await open(l.page)
      const card = l.page.locator('article', { has: l.page.getByRole('heading', { name: 'Together' }) })
      const text = flat(await card.innerText())
      assert(text.includes('Plan a trip with friends') && /vote/.test(text) && /chat/.test(text) && /meet people/.test(text), `card: ${text}`)
      assert(!(await card.locator('img').count()), 'a picture in the card')
      assert(!l.away.length, `requests away: ${l.away.join(', ')}`)
      assert(!l.errors.length, l.errors.join(' / '))
    })
    await l.ctx.close()
  }

  // ---------- copy ----------
  await test('F27 no em dash (U+2014) in the files of this package', async () => {
    const comps = readdirSync(join(ROOT, 'app/components')).filter(f => /^(Post|Friend|Feed|Profile|Inbox)\w*\.vue$/.test(f)).map(f => `app/components/${f}`)
    const files = [
      ...comps, 'app/components/HomeFriends.vue', 'app/components/DayShare.vue', 'app/components/TripCard.vue', 'app/components/LandingPage.vue',
      'app/pages/friends.vue', 'app/pages/f/[token].vue', 'app/pages/index.vue', 'app/utils/image.ts', 'tests/e2e/friends.e2e.mjs', 'tests/e2e/landing.e2e.mjs',
    ]
    assert(comps.length >= 15, `components: ${comps.join(', ')}`)
    const bad = files.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(EM_DASH))
    assert(!bad.length, `em dash in ${bad.join(', ')}`)
  })
}
finally {
  await browser.close()
  await srv?.close()
}
