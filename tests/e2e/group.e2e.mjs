// Browser checks for package P2, group trips (docs/design/2026-10-14-together.md, 5.1 to 5.4 and T4 to T7, T14,
// T21, T22), on a build whose "cloud" lives in the browser:
//
//   NUXT_PUBLIC_SOCIAL_BACKEND=memory npm run generate
//   node tests/e2e/group.e2e.mjs --build           (serves .output/public on port 4177)
//   TRAVELS_URL=http://127.0.0.1:<port>/ node tests/e2e/group.e2e.mjs
//
// The device is the test account of lib.mjs (TEST_ACCOUNT); Ali and Can act through social-lib.mjs's act(). Every
// scenario opens its own phone (390 x 844, touch, Europe/Rome), so one failure can't spill into the next.
import { randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { BASE, TRIP, assert, check, go, live, loadTrip, noSideScroll, phone, ready, romeCopy, romeTime, serveBuild, sideScroll, smallTargets, useBase } from './lib.mjs'
import { ALI, CAN, DENIZ, ME, act, befriend, cloudOf, socialReady } from './social-lib.mjs'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const srv = process.argv.includes('--build') ? await serveBuild(4177) : null
if (srv) useBase(srv.url)

const trip = loadTrip()
const FRI_2330 = '2026-10-09T23:30'
const FRI_1720 = '2026-10-09T17:20'
const EM_DASH = String.fromCharCode(0x2014)
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim()
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** Polls fn() until it gives something truthy; throws naming `what` after `ms`. */
async function until(what, fn, ms = 8000) {
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

/** A group id or invite token as the app makes them (socialToken). */
function token(n = 22) {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < n; i++) s += A[randomInt(A.length)]
  return s
}

const browser = await chromium.launch()

/**
 * A phone (phone() of lib.mjs) that accepts confirm() questions, with `at` frozen as the trip's clock when given (a
 * real clock otherwise: chat read marks need time to move). Opens `path` ("group", "plan?day=fri", "/j/<token>").
 */
async function device(opts = {}) {
  const { at, path, init, ...rest } = opts
  const ph = await phone(browser, rest)
  ph.page.on('dialog', d => void d.accept())
  if (init) await ph.ctx.addInitScript(init)
  if (at) await live(ph.page, at)
  if (path !== undefined) await open(ph.page, path)
  return ph
}

/**
 * Opens a path of the app ("group", "plan?day=fri", "/j/<token>"). With `social` (the default) the app starts on
 * Home, waits for the social layer (memory builds: ready at once, signed in) and moves there by client-side
 * navigation, as a tap does. Not a direct load: useGroups' stopAll() drops the live lists (votes, who's in,
 * statuses) of screens that mounted before the social layer was ready, so after a direct load they sometimes never
 * come (7 loads in 30; reported with the package, the fix is in useGroups.ts).
 */
async function open(page, path, { social = true } = {}) {
  const url = path.startsWith('/') ? `${BASE}${path.slice(1)}` : `${BASE}trips/${TRIP}/${path}`
  if (!social) {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await ready(page)
    return
  }
  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  await ready(page)
  await socialReady(page)
  await go(page, path)
  await ready(page)
}

/** A trip as this phone holds it. */
const localTrip = (page, id = TRIP) => page.evaluate(i => JSON.parse(localStorage.getItem('travel:trips:v1') || '[]').find(t => t.id === i) ?? null, id)
/** This phone's progress on a trip. */
const progressOf = (page, id = TRIP) => page.evaluate(i => JSON.parse(localStorage.getItem('travel:progress:v1') || '{}')[i] ?? null, id)
/** The group trip's messages in the fake cloud, oldest first. */
const messagesOf = async (page, gid) => Object.values((await cloudOf(page)).messages[gid] ?? {}).sort((a, b) => a.at - b.at)
/** The newest toast that says `text`, once it shows. */
async function toastWith(page, text, timeout = 6000) {
  const t = page.locator('.toasts .toast').filter({ hasText: text }).last()
  await t.waitFor({ state: 'visible', timeout })
  return t
}

/** Makes this phone's Rome trip a group trip (as the first invite does) and gives its group id. */
async function makeGroup(page) {
  return page.evaluate(id => window.__travelsTest.groups.makeGroup(id), TRIP)
}
/** A working invite of the device's for a group trip. */
async function inviteFor(page, gid, role = 'editor') {
  const inv = await act(page, ME, 'createInvite', { kind: 'trip', trip: gid, role, tripTitle: trip.title, tripDestination: trip.destination, tripStart: trip.start, tripEnd: trip.end, tripCover: trip.cover })
  return inv.token
}
/** `person` joins the device's group trip with a fresh link. */
async function joinAs(page, person, gid, role = 'editor') {
  return act(page, person, 'joinGroup', await inviteFor(page, gid, role))
}
/** Ali makes a group trip of a plan of his own (the Rome sample under the group's id) and gives its id. */
async function alisGroup(page) {
  const gid = token()
  const plan = { ...loadTrip(), id: gid }
  delete plan.seedVersion
  delete plan.edited
  delete plan.group
  await act(page, ALI, 'createGroup', { id: gid, title: plan.title, destination: plan.destination, start: plan.start, end: plan.end, cover: plan.cover, json: JSON.stringify(plan), updatedAt: Date.now() })
  await act(page, ALI, 'savePointer', { gid, localId: 'rome-ali', role: 'owner', title: plan.title, at: Date.now() })
  return gid
}
const alisInvite = async (page, gid, role) => (await act(page, ALI, 'createInvite', { kind: 'trip', trip: gid, role, tripTitle: trip.title, tripDestination: trip.destination, tripStart: trip.start, tripEnd: trip.end, tripCover: trip.cover })).token

// ---------- screens: sideways scroll, touch targets, contrast ----------

/**
 * Contrast problems inside `rootSel`: text under 4.5:1 against what is painted behind it (3:1 for large text), as
 * ui.e2e.mjs measures them. Text on pictures is left out.
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
        if (s.backgroundImage !== 'none') return null
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
    for (const scope of document.querySelectorAll(sel)) {
      for (const el of scope.querySelectorAll('*')) {
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
        if (!own || el.closest('.art-frame, svg, .tabbar, .toasts, .sr-only, option, select, :disabled')) continue
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
        if (got < (large ? 3 : 4.5)) out.push(`"${el.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)}" ${Math.round(got * 100) / 100}:1`)
      }
    }
    return out
  }, rootSel)
}

/**
 * Buttons and links under 44 x 44 px anywhere on the page, scrolled through screen by screen; in an open sheet, each
 * of its controls brought to the middle of the sheet in turn and measured there (a control half under the sheet's
 * edge isn't small). The map's markers and tiles (Leaflet, another package's) are left out.
 */
async function allSmall(page) {
  await page.addStyleTag({ content: '.leaflet-container { visibility: hidden !important; } .toasts { display: none !important; }' })
  const found = new Map()
  const note = list => list.forEach(t => found.set(`${t.cls}|${t.text}|${t.label}`, t))
  const n = await page.evaluate(() => {
    const sheet = [...document.querySelectorAll('[role="dialog"]')].pop()
    const list = sheet ? [...sheet.querySelectorAll('button, a[href], [role="button"]')] : []
    list.forEach((el, i) => el.setAttribute('data-e2e-probe', String(i)))
    return list.length
  })
  if (n) {
    for (let i = 0; i < n; i++) {
      const shown = await page.evaluate((k) => {
        const el = document.querySelector(`[data-e2e-probe="${k}"]`)
        if (!el || !el.getClientRects().length) return false
        el.scrollIntoView({ block: 'center' })
        el.classList.add('e2e-probe')
        return true
      }, i)
      if (!shown) continue
      await sleep(40)
      const hit = (await smallTargets(page)).find(t => t.cls.split(' ').includes('e2e-probe'))
      await page.evaluate(k => document.querySelector(`[data-e2e-probe="${k}"]`)?.classList.remove('e2e-probe'), i)
      if (hit) note([{ ...hit, cls: hit.cls.replace(/\s*e2e-probe/, '') }])
    }
  }
  else {
    // The chat holds on to its newest message until you scroll yourself: a wheel lets it go.
    await page.evaluate(() => window.dispatchEvent(new WheelEvent('wheel')))
    const h = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y <= h; y += 500) {
      await page.evaluate(to => window.scrollTo(0, to), y)
      await sleep(60)
      note(await smallTargets(page))
    }
  }
  return [...found.values()]
}
const brief = list => list.map(t => `${t.tag}.${t.cls.split(' ')[0]} "${t.text || t.label}" ${t.w}x${t.h}${t.clip ? ` (${t.clip})` : ''}`).join('; ')

/** One screen: no sideways scroll, 44 px targets and text contrast inside `roots`. */
async function screenOk(page, name, roots) {
  assert(await noSideScroll(page), `${name}: sideways scroll ${JSON.stringify(await sideScroll(page))}`)
  const small = await allSmall(page)
  assert(!small.length, `${name}: small targets ${brief(small)}`)
  // No hover (phones have none) and no colour half way through a transition.
  await page.mouse.move(0, 0)
  await sleep(300)
  const low = await contrastIssues(page, roots)
  assert(!low.length, `${name}: low contrast ${low.join(', ')}`)
}

try {
  // ================= The organiser's phone: solo, then a group =================
  {
    const { ctx, page, errors } = await device({ path: 'group' })

    await check('G1 a solo trip\'s Together page: the intro, its three ways in, and "Plan with friends" in the header', async () => {
      const body = flat(await page.locator('.together').innerText())
      for (const s of ['Together', 'Plan this trip with friends', 'Invite people to see the plan, change it with you, vote on options and chat.', 'Your ticks, costs, notes and photos stay yours.']) {
        assert(body.toLowerCase().includes(s.toLowerCase()), `missing "${s}"`)
      }
      const href = async name => new URL(await page.getByRole('link', { name, exact: true }).getAttribute('href'), BASE).search
      assert(await href('Invite people') === '?invite=1', await href('Invite people'))
      assert(await href('Let people follow along') === '?invite=1&role=viewer', await href('Let people follow along'))
      assert(await href('Share a copy of the plan') === '?share=1', await href('Share a copy of the plan'))
      const btn = page.locator('header.top').getByRole('link', { name: 'Plan with friends' })
      const box = await btn.boundingBox()
      assert(box && box.width >= 44 && box.height >= 44, `header button ${JSON.stringify(box)}`)
      assert(await page.locator('.tabbar a[aria-current="page"]').innerText() === 'More', 'More is not lit')
    })

    let gid = ''
    await check('G2 Invite people on a solo trip: "Create the invite link" makes it a group trip, with its link and QR code', async () => {
      await page.getByRole('link', { name: 'Invite people', exact: true }).click()
      const sheet = page.getByRole('dialog', { name: 'Invite people' })
      await sheet.waitFor()
      assert(flat(await sheet.innerText()).includes('This makes Rome a group trip: people you invite see the plan. Your ticks, costs, notes and photos stay yours.'), 'no "This makes Rome a group trip" line')
      await sheet.getByRole('button', { name: 'Create the invite link' }).click()
      const addr = sheet.locator('.sl .addr')
      await addr.waitFor()
      const t = await localTrip(page)
      assert(t.group?.role === 'owner' && t.group.id, `the trip's group: ${JSON.stringify(t.group)}`)
      gid = t.group.id
      assert(!t.seedId && !t.seedVersion, 'the trip still follows its seed')
      const cloud = await cloudOf(page)
      assert(cloud.groups[gid]?.roles[ME.uid] === 'owner', 'no group in the cloud')
      const invites = Object.values(cloud.invites).filter(i => i.trip === gid && !i.revoked)
      assert(invites.length === 1 && invites[0].role === 'editor', `invites ${JSON.stringify(invites)}`)
      assert(flat(await addr.innerText()).endsWith(`/j/${invites[0].token}`), `link "${flat(await addr.innerText())}"`)
      await sheet.getByRole('button', { name: 'QR code' }).click()
      await sheet.locator('svg.qr').waitFor()
      assert(flat(await sheet.innerText()).includes('Anyone with the link can join as Can edit until you reset it.'), 'no "Anyone with the link" line')
      await toastWith(page, 'Rome is a group trip now')
    })

    await check('G3 "Can view" makes a link of its own (kept in the URL); Reset replaces a link and the old one stops working', async () => {
      const sheet = page.getByRole('dialog', { name: 'Invite people' })
      await sheet.getByRole('button', { name: 'Can view' }).click()
      await until('?role=viewer', async () => new URL(page.url()).searchParams.get('role') === 'viewer')
      await until('a viewer link', async () => Object.values((await cloudOf(page)).invites).some(i => i.trip === gid && i.role === 'viewer'))
      await until('the viewer line', async () => flat(await sheet.innerText()).includes('Anyone with the link can join as Can view until you reset it.'))
      const rows = sheet.locator('.rows .row-item')
      await until('two links', async () => (await rows.count()) === 2)
      const before = Object.values((await cloudOf(page)).invites).find(i => i.trip === gid && i.role === 'viewer' && !i.revoked)
      await rows.filter({ hasText: 'Can view' }).getByRole('button', { name: 'Reset' }).click()
      await toastWith(page, 'Link reset')
      const after = await cloudOf(page)
      assert(after.invites[before.token].revoked === true, 'the old link still works')
      const fresh = Object.values(after.invites).filter(i => i.trip === gid && i.role === 'viewer' && !i.revoked)
      assert(fresh.length === 1 && fresh[0].token !== before.token, `viewer links ${JSON.stringify(fresh)}`)
      await until('the new link on screen', async () => flat(await sheet.locator('.sl .addr').innerText()).endsWith(fresh[0].token))
      await page.keyboard.press('Escape')
      await sheet.waitFor({ state: 'hidden' })
    })

    await check('G3b "Send to friends": a friend gets the invite in their inbox, with the link', async () => {
      await befriend(page, ME, DENIZ)
      await open(page, 'group?invite=1')
      const sheet = page.getByRole('dialog', { name: 'Invite people' })
      const row = sheet.locator('li', { hasText: 'Deniz Aksoy' })
      await row.waitFor()
      await row.getByRole('button', { name: 'Invite' }).click()
      await toastWith(page, 'Deniz has your invite')
      await row.getByText('Invited').waitFor()
      const link = Object.values((await cloudOf(page)).invites).find(i => i.trip === gid && i.role === 'editor' && !i.revoked)
      const item = Object.values((await cloudOf(page)).inbox[DENIZ.uid] ?? {}).find(i => i.kind === 'trip-invite')
      assert(item && item.from === ME.uid && item.text === 'invited you to Rome' && item.link === `/j/${link.token}` && item.ref === gid, JSON.stringify(item))
      await page.keyboard.press('Escape')
      await sheet.waitFor({ state: 'hidden' })
    })

    await check('G4 Ali joins: the header shows two faces, and Together its header, faces and Invite', async () => {
      await joinAs(page, ALI, gid)
      const btn = page.locator('header.top a.tgb')
      await until('"Together: 2 people"', async () => (await btn.getAttribute('aria-label')) === 'Together: 2 people')
      assert(await btn.locator('.av').count() === 2, `${await btn.locator('.av').count()} faces`)
      const box = await btn.boundingBox()
      assert(box && box.width >= 44 && box.height >= 44, `header button ${JSON.stringify(box)}`)
      assert(await page.locator('.g-head h1').innerText() === 'Together', 'no Together header')
      assert(await page.locator('.g-head').getByRole('link', { name: 'Invite' }).count() === 1, 'no Invite')
      for (const name of ['Chat', 'People', 'Decide']) assert(await page.locator('.tabs').getByRole('button', { name, exact: true }).count() === 1, `no ${name}`)
    })

    await check('G5 Ali\'s message lights the dot in the header; opening the chat clears it', async () => {
      await open(page, 'plan?day=fri')
      await act(page, ALI, 'sendMessage', gid, { kind: 'text', text: 'Ciao! Pizza at 8?' })
      const btn = page.locator('header.top a.tgb')
      await until('the unread dot', async () => (await btn.getAttribute('aria-label')) === 'Together: 2 people, 1 new message' && await btn.locator('.unread-dot').count() === 1)
      await btn.click()
      await page.locator('.chat').waitFor()
      const bubble = page.locator('.cm.theirs .bubble', { hasText: 'Ciao! Pizza at 8?' })
      await bubble.waitFor()
      assert(flat(await page.locator('.cm.theirs .who').first().innerText()) === 'Ali', 'no first name over Ali\'s message')
      await until('the dot to go', async () => (await btn.getAttribute('aria-label')) === 'Together: 2 people' && !(await btn.locator('.unread-dot').count()))
      // A new message while the chat is open stays read.
      await act(page, ALI, 'sendMessage', gid, { kind: 'text', text: 'Or gelato first' })
      await page.locator('.cm.theirs .bubble', { hasText: 'Or gelato first' }).waitFor()
      await sleep(400)
      assert((await btn.getAttribute('aria-label')) === 'Together: 2 people', `label ${await btn.getAttribute('aria-label')}`)
    })

    await check('G6 the chat both ways: a text, a stop (its card opens the stop) and a photo (made smaller, as a JPEG)', async () => {
      const input = page.locator('.composer input[aria-label="Message"]')
      await input.fill('Yes, see you there')
      await input.press('Enter')
      await page.locator('.cm.mine .bubble', { hasText: 'Yes, see you there' }).waitFor()
      assert((await messagesOf(page, gid)).some(m => m.author === ME.uid && m.kind === 'text' && m.text === 'Yes, see you there'), 'the text is not in the cloud')
      await page.locator('.composer').getByRole('button', { name: 'Send a photo, a stop or where you are' }).click()
      await page.locator('.composer').getByRole('button', { name: 'A stop', exact: true }).click()
      const picker = page.getByRole('dialog', { name: 'Send a stop' })
      await picker.waitFor()
      await picker.getByRole('button', { name: /^\s*17:15\s*Pantheon\s*$/ }).click()
      await picker.waitFor({ state: 'hidden' })
      const card = page.locator('.cm.mine .stopcard', { hasText: 'Pantheon' })
      await card.waitFor()
      assert(flat(await card.innerText()).includes('Fri 9 Oct · 17:15'), `card "${flat(await card.innerText())}"`)
      const sent = (await messagesOf(page, gid)).find(m => m.kind === 'stop')
      assert(sent?.stopId === 'pantheon' && sent.stopTitle === 'Pantheon' && sent.stopWhen === 'Fri 9 Oct · 17:15', JSON.stringify(sent))
      await card.click()
      await until('?stop=pantheon', async () => new URL(page.url()).searchParams.get('stop') === 'pantheon')
      await page.getByRole('dialog', { name: 'Pantheon' }).waitFor()
      await page.keyboard.press('Escape')
      await page.getByRole('dialog', { name: 'Pantheon' }).waitFor({ state: 'hidden' })
      // A photo: 1600 x 1000 in, 1280 px wide and a JPEG out.
      const png = await page.evaluate(() => {
        const c = document.createElement('canvas')
        c.width = 1600
        c.height = 1000
        const g = c.getContext('2d')
        g.fillStyle = '#3a7'
        g.fillRect(0, 0, 1600, 1000)
        g.fillStyle = '#fd2'
        g.fillRect(400, 250, 800, 500)
        return c.toDataURL('image/png').split(',')[1]
      })
      await page.locator('.composer input[type="file"]').setInputFiles({ name: 'gelato.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') })
      const img = page.locator('.cm.mine .photo img')
      await img.waitFor()
      const photo = (await messagesOf(page, gid)).find(m => m.kind === 'photo')
      assert(photo?.image?.startsWith('data:image/jpeg'), `photo ${String(photo?.image).slice(0, 30)}`)
      const size = await img.evaluate(async (el) => {
        await el.decode()
        return [el.naturalWidth, el.naturalHeight]
      })
      assert(size[0] === 1280 && size[1] === 800, `photo ${size}`)
      await page.locator('.cm.mine .photo').click()
      await page.getByRole('dialog', { name: 'Your photo' }).waitFor()
      await page.keyboard.press('Escape')
    })

    await check('G6b offline, the chat keeps its messages and its composer is off ("You\'re offline. Messages send when you\'re back.")', async () => {
      await open(page, 'group?tab=chat')
      await page.locator('.cm').first().waitFor()
      await ctx.setOffline(true)
      try {
        const line = page.locator('.composer .off')
        await line.waitFor()
        assert(flat(await line.innerText()) === 'You\'re offline. Messages send when you\'re back.', flat(await line.innerText()))
        assert(await page.locator('.composer input[aria-label="Message"]').isDisabled(), 'the composer still works')
        assert(await page.locator('.cm .bubble', { hasText: 'Yes, see you there' }).count() === 1, 'the messages went')
      }
      finally {
        await ctx.setOffline(false)
      }
      await until('the composer back', async () => !(await page.locator('.composer input[aria-label="Message"]').isDisabled()))
    })

    await check('G6c an editor\'s change says in the chat what changed: added, changed, moved, removed', async () => {
      const said = async text => until(`"${text}"`, async () => (await messagesOf(page, gid)).some(m => m.kind === 'system' && m.text === text))
      await open(page, 'plan?day=fri&edit=pantheon')
      let editor = page.getByRole('dialog', { name: 'Edit stop' })
      await editor.getByLabel('Starts').fill('17:30')
      await editor.getByRole('button', { name: 'Save' }).click()
      await said('Test changed “Pantheon” to 17:30')
      await open(page, 'plan?day=fri&edit=new')
      editor = page.getByRole('dialog', { name: 'Add a stop' })
      await editor.getByLabel('What').fill('Gelato at Giolitti')
      await editor.getByLabel('Starts').fill('16:00')
      await editor.getByRole('button', { name: 'Add stop' }).click()
      await said('Test added “Gelato at Giolitti” on Fri 9')
      const id = (await localTrip(page)).days.find(d => d.id === 'fri').stops.find(x => x.title === 'Gelato at Giolitti')?.id
      assert(id, 'the new stop is not in the plan')
      await open(page, `plan?day=fri&edit=${id}`)
      editor = page.getByRole('dialog', { name: 'Edit stop' })
      await editor.getByLabel('Day').selectOption('sat')
      await editor.getByRole('button', { name: 'Save' }).click()
      await said('Test moved “Gelato at Giolitti” to Sat 10')
      await open(page, `plan?day=sat&edit=${id}`)
      await page.getByRole('dialog', { name: 'Edit stop' }).getByRole('button', { name: 'Delete stop' }).click()
      await said('Test removed “Gelato at Giolitti”')
    })

    await check('G7 votes: a pick is a vote; Ali and Can vote; the organiser makes the leader the group pick; "Follow the group"', async () => {
      await open(page, 'plan?day=fri&stop=pick-frinight')
      const sheet = page.locator('[role="dialog"]')
      await sheet.locator('fieldset.choices.group').waitFor()
      await sheet.locator('label.choice', { hasText: 'Hostel party' }).click()
      await until('my vote in the cloud', async () => (await cloudOf(page)).votes[gid]?.[`pick-frinight__${ME.uid}`]?.choiceId === 'hostel')
      const hostel = sheet.locator('label.choice', { hasText: 'Hostel party' })
      await until('"1 vote" under Hostel party', async () => flat(await hostel.locator('.vn').innerText()) === '1 vote')
      assert((await progressOf(page))?.choices?.['pick-frinight'] === 'hostel', 'the pick is not mine')
      await act(page, ALI, 'setVote', gid, 'pick-frinight', 'clubs')
      await joinAs(page, CAN, gid)
      await act(page, CAN, 'setVote', gid, 'pick-frinight', 'clubs')
      const clubs = sheet.locator('label.choice', { hasText: 'Clubs' })
      await until('"2 votes" under Clubs', async () => flat(await clubs.locator('.vn').innerText()) === '2 votes')
      assert(await clubs.locator('.votes .av').count() === 2, 'two faces under Clubs')
      const crawl = sheet.locator('label.choice', { hasText: 'Pub crawl' })
      assert(await crawl.locator('.gpick').count() === 1, 'the group pick (the default, Pub crawl) is not marked')
      const make = sheet.getByRole('button', { name: 'Make it the group pick' })
      await make.waitFor()
      await make.click()
      await toastWith(page, 'Clubs is the group pick')
      const stop = (await localTrip(page)).days.find(d => d.id === 'fri').stops.find(s => s.id === 'pick-frinight')
      assert(stop.options.default === 'clubs' && stop.updatedAt, `default ${stop.options.default}`)
      await until('the Group pick chip on Clubs', async () => await clubs.locator('.gpick').count() === 1 && !(await crawl.locator('.gpick').count()))
      await until('the group pick in the cloud', async () => {
        const plan = JSON.parse((await cloudOf(page)).groups[gid].json)
        return plan.days.find(d => d.id === 'fri').stops.find(s => s.id === 'pick-frinight').options.default === 'clubs'
      })
      const line = sheet.locator('.mine')
      assert(flat(await line.innerText()).startsWith('You picked Hostel party. The group picked Clubs.'), flat(await line.innerText()))
      await line.getByRole('button', { name: 'Follow the group' }).click()
      await until('my own pick to go', async () => !(await progressOf(page))?.choices?.['pick-frinight'])
      await until('Clubs on', async () => (await clubs.getAttribute('class')).includes('on'))
      assert(!(await sheet.locator('.mine').count()), 'the "You picked" line stays')
      assert((await messagesOf(page, gid)).some(m => m.kind === 'system' && m.text.includes('made “Clubs” the group pick')), 'the chat wasn\'t told')
      await page.keyboard.press('Escape')
    })

    await check('G8 who\'s in from the stop sheet (pressed state, faces), and the faces on the stop row', async () => {
      await open(page, 'plan?day=fri&stop=pantheon')
      const sheet = page.getByRole('dialog', { name: 'Pantheon' })
      await sheet.getByRole('heading', { name: 'Who\'s in?' }).waitFor()
      const inBtn = sheet.getByRole('button', { name: 'I\'m in' })
      assert(await inBtn.getAttribute('aria-pressed') === 'false', 'pressed before')
      await inBtn.click()
      await until('pressed', async () => await inBtn.getAttribute('aria-pressed') === 'true')
      await until('my RSVP in the cloud', async () => (await cloudOf(page)).rsvps[gid]?.[`pantheon__${ME.uid}`]?.going === 'in')
      await act(page, ALI, 'setRsvp', gid, 'pantheon', 'in')
      await act(page, CAN, 'setRsvp', gid, 'pantheon', 'maybe')
      await until('In and Maybe rows', async () => {
        const t = flat(await sheet.locator('.who').innerText())
        return t.includes('In') && t.includes('Test, Ali') && t.includes('Maybe') && t.includes('Can')
      })
      await sheet.getByRole('button', { name: 'Send to chat' }).click()
      await toastWith(page, 'Sent to the group chat')
      await page.keyboard.press('Escape')
      await sheet.waitFor({ state: 'hidden' })
      const faces = page.locator('#stop-pantheon .going')
      await faces.waitFor()
      assert(await faces.getAttribute('aria-label') === 'In: Test and Ali', await faces.getAttribute('aria-label'))
      // A minor stop has no "Who's in?".
      await open(page, 'plan?day=fri&stop=climb-the-dome')
      await page.locator('[role="dialog"] .content').waitFor()
      assert(!(await page.locator('[role="dialog"] .st-tog').count()), 'a small step shows "Who\'s in?"')
    })

    await check('G9 People: a quick status (and the chat hears it); others\' statuses with how long ago', async () => {
      await open(page, 'group?tab=people')
      const mine = page.locator('.you')
      await mine.getByRole('button', { name: 'On my way' }).click()
      await until('pressed', async () => await mine.getByRole('button', { name: 'On my way' }).getAttribute('aria-pressed') === 'true')
      const st = (await cloudOf(page)).statuses[gid]?.[ME.uid]
      assert(st?.kind === 'onway' && st.text === 'On my way', JSON.stringify(st))
      await until('my status line', async () => flat(await mine.locator('.mine').innerText()) === 'On my way · just now')
      assert((await messagesOf(page, gid)).some(m => m.kind === 'status' && m.text === 'Test Traveller: On my way'), 'the chat wasn\'t told')
      await mine.getByRole('button', { name: 'Other' }).click()
      await mine.getByRole('textbox', { name: 'Your status' }).fill('Getting gelato')
      await mine.getByRole('button', { name: 'Save' }).click()
      await until('the custom status', async () => (await cloudOf(page)).statuses[gid]?.[ME.uid]?.text === 'Getting gelato')
      await act(page, ALI, 'setStatus', gid, { kind: 'at', text: 'At Pantheon' })
      const ali = page.locator('.person', { hasText: 'Ali Demir' })
      await until('Ali\'s status', async () => flat(await ali.locator('.st').innerText()).startsWith('At Pantheon · just now'))
      assert(flat(await ali.innerText()).includes('Can edit'), 'Ali\'s role')
    })

    await check('G10 the organiser changes a role and removes someone (after asking)', async () => {
      const ali = page.locator('.person', { hasText: 'Ali Demir' })
      await ali.getByRole('combobox').selectOption('viewer')
      await until('Ali can view', async () => (await cloudOf(page)).groups[gid].roles[ALI.uid] === 'viewer')
      await toastWith(page, 'Ali can view the plan now')
      const can = page.locator('.person', { hasText: 'Can Yildiz' })
      await can.getByRole('button', { name: 'Remove' }).click()
      await until('Can removed', async () => !(await cloudOf(page)).groups[gid].roles[CAN.uid])
      await until('Can off the list', async () => !(await page.locator('.person', { hasText: 'Can Yildiz' }).count()))
    })

    await check('G11 "Stop sharing this trip": the group goes, the organiser keeps the trip as their own', async () => {
      await page.getByRole('button', { name: 'Stop sharing this trip' }).click()
      await toastWith(page, 'Rome isn\'t shared any more. Everyone keeps their own copy.')
      await until('no group on the trip', async () => !(await localTrip(page))?.group)
      assert(!(await cloudOf(page)).groups[gid], 'the group is still in the cloud')
      await page.getByRole('heading', { name: 'Plan this trip with friends' }).waitFor()
      assert(await page.locator('header.top').getByRole('link', { name: 'Plan with friends' }).count() === 1, 'the header still shows faces')
    })
    await check('no page errors on the organiser\'s phone', async () => assert(!errors.length, errors.join(' / ')))
    await ctx.close()
  }

  // ================= Late at night: Home safe, the Now strip, "At <the stop on now>" =================
  {
    const shared = () => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: async (d) => { window.__shared = d } })
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    }
    const { ctx, page, errors } = await device({ at: FRI_2330, path: 'now', init: shared })

    await check('H1 a solo trip late at night: "Let someone know" shares "Home safe, 23:30." (text only)', async () => {
      const hc = page.locator('.hc')
      await hc.waitFor()
      assert(flat(await hc.innerText()).includes('Back already? Let someone know.'), 'no line')
      await hc.getByRole('button', { name: 'Let someone know' }).click()
      const d = await until('the share sheet', () => page.evaluate(() => window.__shared))
      assert(d.text === 'Home safe, 23:30.' && !d.url, JSON.stringify(d))
      assert(!(await page.locator('.gstrip').count()), 'a group strip on a solo trip')
    })

    let gid = ''
    await check('H2 a group trip: "I\'m home safe" sets your status and tells the chat', async () => {
      gid = await makeGroup(page)
      await joinAs(page, ALI, gid)
      await open(page, 'now')
      const hc = page.locator('.hc')
      await hc.getByRole('button', { name: 'I\'m home safe' }).click()
      await toastWith(page, 'Your group knows you\'re home safe.')
      const st = (await cloudOf(page)).statuses[gid]?.[ME.uid]
      assert(st?.kind === 'home' && st.text === 'Home safe', JSON.stringify(st))
      assert((await messagesOf(page, gid)).some(m => m.kind === 'status' && m.text === 'Test Traveller: Home safe'), 'the chat wasn\'t told')
      await until('the told line', async () => flat(await hc.innerText()).includes('You told the group you\'re home safe.'))
    })

    await check('H3 Now during a group trip: one line of faces and statuses, the unread count, a tap to the chat', async () => {
      await act(page, ALI, 'setStatus', gid, { kind: 'at', text: 'At Trevi' })
      await joinAs(page, CAN, gid)
      await act(page, CAN, 'setStatus', gid, { kind: 'home', text: 'Home safe' })
      const strip = page.locator('a.gstrip')
      await until('the statuses', async () => {
        const t = flat(await strip.innerText())
        return t.includes('Ali: At Trevi') && t.includes('Can: Home safe')
      })
      await act(page, ALI, 'sendMessage', gid, { kind: 'text', text: 'Night bus or taxi?' })
      await until('"1 new"', async () => flat(await strip.innerText()).includes('1 new'))
      assert(await strip.locator('.av').count() === 2, 'two faces')
      await strip.click()
      await until('the chat', async () => new URL(page.url()).pathname.endsWith('/group') && new URL(page.url()).searchParams.get('tab') === 'chat')
      await page.locator('.cm .bubble', { hasText: 'Night bus or taxi?' }).waitFor()
      const people = page.locator('.cm.line', { hasText: 'Home safe' })
      assert(await people.count() >= 1, 'the status lines are not in the chat')
    })

    await check('H4 Home safe in People reads with its time ("Home safe · 23:30")', async () => {
      await open(page, 'group?tab=people')
      const can = page.locator('.person', { hasText: 'Can Yildiz' })
      await until('Can\'s status', async () => flat(await can.locator('.st').innerText()) === 'Home safe · 23:30')
      assert(flat(await page.locator('.you .mine').innerText()) === 'Home safe · 23:30', flat(await page.locator('.you .mine').innerText()))
    })

    await check('H5 at Fri 17:20 the quick statuses offer "At Pantheon" (the stop on now)', async () => {
      await page.clock.setFixedTime(new Date(romeTime(FRI_1720)))
      await open(page, 'group?tab=people')
      const chip = page.locator('.you').getByRole('button', { name: 'At Pantheon' })
      await chip.click()
      await until('At Pantheon', async () => {
        const st = (await cloudOf(page)).statuses[gid]?.[ME.uid]
        return st?.kind === 'at' && st.text === 'At Pantheon' && st.stopId === 'pantheon'
      })
    })
    await check('no page errors late at night', async () => assert(!errors.length, errors.join(' / ')))
    await ctx.close()
  }

  // ================= Decide during the trip, and a new trip with friends =================
  {
    const { ctx, page, errors } = await device({ at: FRI_1720, path: 'now' })
    const gid = await makeGroup(page)
    await joinAs(page, ALI, gid)
    await act(page, ALI, 'setVote', gid, 'pick-ride', 'taxi')
    await act(page, ALI, 'setVote', gid, 'pick-frinight', 'clubs')

    await check('G12 Decide on Fri 9 Oct at 17:20: the options still ahead first, from Friday night; Thursday\'s ride folded under "Earlier · 1", with its vote', async () => {
      await open(page, 'group?tab=decide')
      const ahead = page.locator('.decide section').first().locator(':scope > .opts > article.opt')
      await ahead.first().waitFor()
      const first = flat(await ahead.first().innerText())
      // The day and time are a kicker, upper case on screen.
      assert(first.toLowerCase().includes('fri 9 oct · 21:30') && first.includes('Pick your Friday night'), first.slice(0, 80))
      const aheadText = flat(await page.locator('.decide section').first().locator(':scope > .opts').innerText())
      assert(!aheadText.includes('Pick your ride into Rome'), 'Thursday\'s ride is among the options ahead')
      const earlier = page.locator('details.earlier')
      assert(flat(await earlier.locator('summary').innerText()) === 'Earlier · 1', flat(await earlier.locator('summary').innerText()))
      assert(await earlier.getAttribute('open') === null, 'Earlier is open before a tap')
      await earlier.locator('summary').click()
      const past = earlier.locator('article.opt')
      await past.first().waitFor()
      const text = flat(await past.first().innerText())
      assert(text.includes('Pick your ride into Rome') && text.includes('Votes: Taxi €55 1'), text.slice(0, 200))
    })

    await check('G13 a new trip "With friends" opens on Together with Invite people; "Just me" opens its plan', async () => {
      await open(page, '/trips/new')
      const friends = page.getByRole('button', { name: 'With friends' })
      assert(await page.getByRole('button', { name: 'Just me' }).getAttribute('aria-pressed') === 'true', 'Just me is not the default')
      await friends.click()
      assert(await friends.getAttribute('aria-pressed') === 'true', 'With friends is not pressed')
      await page.getByPlaceholder('e.g. Lisbon').first().fill('Lisbon')
      const told = toastWith(page, 'Trip created. Invite your friends to plan it with you.')
      await page.getByRole('button', { name: 'Create trip' }).click()
      await told
      await until('Together with ?invite=1', async () => {
        const u = new URL(page.url())
        return /^\/trips\/[^/]+\/group$/.test(u.pathname.replace(/\/$/, '')) && u.searchParams.get('invite') === '1'
      })
      await page.getByRole('dialog', { name: 'Invite people' }).waitFor()
      await page.keyboard.press('Escape')
      await open(page, '/trips/new')
      await page.getByPlaceholder('e.g. Lisbon').first().fill('Porto')
      await page.getByRole('button', { name: 'Create trip' }).click()
      await until('the new trip\'s plan', async () => /^\/trips\/[^/]+\/plan$/.test(new URL(page.url()).pathname.replace(/\/$/, '')))
    })
    await check('no page errors on Decide and New trip', async () => assert(!errors.length, errors.join(' / ')))
    await ctx.close()
  }

  // ================= The device as a viewer of Ali's plan =================
  {
    const { ctx, page, errors } = await device({ path: 'now' })
    const gid = await alisGroup(page)
    const viewerLink = await alisInvite(page, gid, 'viewer')

    await check('V1 the join page, signed in: Ali\'s invite to follow, what it means, and "Join Rome"', async () => {
      await open(page, `/j/${viewerLink}`)
      const card = page.locator('.j-card')
      await card.waitFor()
      const text = flat(await card.innerText())
      for (const s of ['8–12 Oct 2026', 'Rome', 'Ali invited you to follow this trip', 'You\'ll see the plan as it changes and can chat. Your own ticks, costs and notes stay yours.']) {
        assert(text.toLowerCase().includes(s.toLowerCase()), `missing "${s}" in "${text}"`)
      }
      assert(!text.includes('Sign in with Google'), 'asks to sign in')
    })

    await check('V2 "Join Rome" adds the device and opens the trip\'s plan once it is here', async () => {
      await page.getByRole('button', { name: 'Join Rome' }).click()
      await until('the plan', async () => new URL(page.url()).pathname.endsWith(`/trips/${gid}/plan`), 15000)
      const t = await localTrip(page, gid)
      assert(t?.group?.id === gid && t.group.role === 'viewer', JSON.stringify(t?.group))
      const cloud = await cloudOf(page)
      assert(cloud.groups[gid].roles[ME.uid] === 'viewer', 'not in the group')
      assert(cloud.pointers[ME.uid]?.[gid]?.localId === gid, 'no pointer')
      assert(Object.values(cloud.messages[gid] ?? {}).some(m => m.kind === 'system' && m.text === 'Test Traveller joined the trip'), 'no joined line')
    })

    await check('V3 a viewer: no "Edit stop", no "Add a stop", trip settings read-only, and the editor refuses to open', async () => {
      await open(page, `/trips/${gid}/plan?day=fri&stop=pantheon`)
      const sheet = page.getByRole('dialog', { name: 'Pantheon' })
      await sheet.getByRole('heading', { name: 'Who\'s in?' }).waitFor()
      assert(!(await sheet.getByRole('button', { name: 'Edit stop' }).count()), 'Edit stop shows')
      await page.keyboard.press('Escape')
      await sheet.waitFor({ state: 'hidden' })
      assert(!(await page.getByRole('button', { name: /^Add a stop/ }).count()), 'Add a stop shows')
      const refused = toastWith(page, 'You can view this trip, so its plan stays as the group made it.', 10000)
      await go(page, `/trips/${gid}/plan?day=fri&edit=pantheon`)
      await refused
      assert(!(await page.getByRole('dialog', { name: 'Edit stop' }).count()), 'the editor opened')
      await until('?edit gone', async () => !new URL(page.url()).searchParams.has('edit'))
      await open(page, `/trips/${gid}/settings`)
      assert(!(await page.getByRole('button', { name: 'Save changes' }).count()), 'the trip form shows')
      assert(flat(await page.locator('.page').innerText()).includes('You can view this trip.'), 'no read-only line')
      await open(page, `/trips/${gid}/group?tab=people`)
      assert(!(await page.locator('.g-head').getByRole('link', { name: 'Invite' }).count()), 'a viewer gets Invite')
      assert(await page.getByRole('button', { name: 'Leave this trip' }).count() === 1, 'no Leave')
      assert(!(await page.locator('.person select').count()), 'a viewer can change roles')
      await open(page, `/trips/${gid}/group?invite=1`)
      const inv = page.getByRole('dialog', { name: 'Invite people' })
      await inv.waitFor()
      assert(flat(await inv.innerText()).includes('You can view this trip. The organiser and people who can edit invite others.'), 'no viewer note')
      assert(!(await inv.locator('.sl').count()), 'a viewer gets a link')
    })

    await check('V4 the join page again: "You\'re already in this trip" with "Open Rome"; a reset link says so', async () => {
      await open(page, `/j/${viewerLink}`)
      await page.getByText('You\'re already in this trip.').waitFor()
      const href = await page.getByRole('link', { name: 'Open Rome' }).getAttribute('href')
      assert(href?.endsWith(`/trips/${gid}/plan`), href)
      const reset = await alisInvite(page, gid, 'editor')
      await act(page, ALI, 'revokeInvite', reset)
      await open(page, `/j/${reset}`)
      await page.getByText('This link was reset. Ask Ali for a new one.').waitFor()
      assert(!(await page.getByRole('button', { name: /^Join/ }).count()), 'Join on a reset link')
      await open(page, '/j/NoSuchLinkAtAll22chars')
      await page.getByRole('heading', { name: 'This link doesn\'t work' }).waitFor()
    })

    await check('V5 removed by the organiser: the copy stays on the device as its own trip, and a toast says so', async () => {
      await open(page, `/trips/${gid}/plan`)
      await act(page, ALI, 'setRole', gid, ME.uid, null)
      await toastWith(page, '“Rome” isn’t shared with you any more. Your copy stays on this device.')
      await until('no group on the copy', async () => {
        const t = await localTrip(page, gid)
        return t && !t.group
      })
      assert(await page.getByRole('button', { name: /^Add a stop/ }).count() === 1, 'the copy is not editable')
    })
    await check('no page errors on the viewer\'s phone', async () => assert(!errors.length, errors.join(' / ')))
    await ctx.close()
  }

  // ================= A member leaves, keeping a copy; your own invite link =================
  {
    const { ctx, page, errors } = await device({ path: 'now' })
    const gid = await alisGroup(page)
    const link = await alisInvite(page, gid, 'editor')
    await check('M1 an editor joins from the join page ("Ali invited you to plan this trip together"), then leaves and keeps a copy', async () => {
      await open(page, `/j/${link}`)
      assert(flat(await page.locator('.j-card').innerText()).includes('Ali invited you to plan this trip together'), 'no editor line')
      assert(flat(await page.locator('.j-card').innerText()).includes('You\'ll see the plan, chat and vote. Your own ticks, costs and notes stay yours.'), 'no meaning line')
      await page.getByRole('button', { name: 'Join Rome' }).click()
      await until('the plan', async () => new URL(page.url()).pathname.endsWith(`/trips/${gid}/plan`), 15000)
      assert((await localTrip(page, gid))?.group?.role === 'editor', 'not an editor')
      await open(page, `/trips/${gid}/group?tab=people`)
      await page.getByRole('button', { name: 'Leave this trip' }).click()
      const sheet = page.getByRole('dialog', { name: 'Leave this trip?' })
      await sheet.waitFor()
      await sheet.getByRole('button', { name: 'Leave and keep my copy' }).click()
      await toastWith(page, 'You left Rome. Your copy stays on this phone.')
      await until('the plan', async () => new URL(page.url()).pathname.endsWith(`/trips/${gid}/plan`))
      const t = await localTrip(page, gid)
      assert(t && !t.group, 'the copy is gone or still shared')
      assert(!(await cloudOf(page)).groups[gid].roles[ME.uid], 'still in the group')
    })
    await check('M2 your own invite link: "This is your invite link."', async () => {
      const gid2 = await makeGroup(page)
      const mine = await inviteFor(page, gid2, 'editor')
      await open(page, `/j/${mine}`)
      await page.getByText('This is your invite link. Share it with the people you want to join.').waitFor()
      assert(!(await page.getByRole('button', { name: /^Join/ }).count()), 'Join on your own link')
    })
    await check('no page errors (member)', async () => assert(!errors.length, errors.join(' / ')))
    await ctx.close()
  }

  // ================= Signed out: the join page asks to sign in, and shows nothing of the device =================
  {
    const { ctx, page, errors } = await device({ signedOut: true, trips: [romeCopy(trip)] })
    await check('J1 signed out, /j/<token> shows the invite and "Sign in with Google to join", nothing of the device\'s trips', async () => {
      await open(page, '/j/NotMadeYetButValid1', { social: false })
      await page.waitForFunction(() => !!window.__travelsSocial, null, { timeout: 10000 })
      const gid = await alisGroup(page)
      const link = await alisInvite(page, gid, 'editor')
      await open(page, `/j/${link}`, { social: false })
      await page.getByRole('button', { name: 'Sign in with Google to join' }).waitFor()
      const body = flat(await page.locator('body').innerText())
      assert(body.includes('Ali invited you to plan this trip together'), 'no invite line')
      assert(!body.includes(trip.subtitle) && !(await page.locator('.shell').count()), 'the device\'s trip shows')
      assert(!(await page.getByRole('button', { name: /^Join/ }).count()), 'Join while signed out')
      assert(new URL(page.url()).pathname.endsWith(`/j/${link}`), `moved to ${page.url()}`)
    })
    await check('no page errors (signed out)', async () => assert(!errors.length, errors.join(' / ')))
    await ctx.close()
  }

  // ================= Every new screen at 390 and 320 px, light and dark =================
  for (const width of [390, 320]) {
    for (const dark of [false, true]) {
      const tag = `${width} px${dark ? ', dark' : ''}`
      const { ctx, page, errors } = await device({ width, dark, at: FRI_2330, path: 'group' })
      await check(`S1 the solo intro and Invite people (solo) at ${tag}`, async () => {
        await screenOk(page, 'solo intro', '.together')
        await open(page, 'group?invite=1')
        await page.getByRole('dialog', { name: 'Invite people' }).waitFor()
        await screenOk(page, 'invite (solo)', '[role="dialog"]')
      })
      const gid = await makeGroup(page)
      await joinAs(page, ALI, gid)
      await joinAs(page, CAN, gid, 'viewer')
      for (const [who, kind, text] of [[ALI, 'text', 'Ciao! Pizza at 8?'], [CAN, 'text', 'A very long message about the night bus, the taxi rank at Termini and where we meet for breakfast tomorrow morning'], [ME, 'text', 'See you there']]) {
        await act(page, who, 'sendMessage', gid, { kind, text })
      }
      await act(page, ALI, 'sendMessage', gid, { kind: 'stop', text: '', stopId: 'pantheon', stopTitle: 'Pantheon', stopWhen: 'Fri 9 Oct · 17:15' })
      await act(page, ALI, 'sendMessage', gid, { kind: 'location', text: '', place: { lat: 41.8986, lng: 12.4769, acc: 18 } })
      await act(page, ALI, 'setStatus', gid, { kind: 'at', text: 'At Pantheon' })
      await act(page, CAN, 'setStatus', gid, { kind: 'home', text: 'Home safe' })
      await act(page, ALI, 'setVote', gid, 'pick-frinight', 'clubs')
      await act(page, CAN, 'setVote', gid, 'pick-frinight', 'clubs')
      await act(page, ALI, 'setRsvp', gid, 'trevi-at-night-free-and-lit', 'in')

      await check(`S2 Together: chat, people and decide at ${tag}`, async () => {
        for (const t of ['chat', 'people', 'decide']) {
          await open(page, `group?tab=${t}`)
          await page.locator(t === 'chat' ? '.cm' : t === 'people' ? '.person' : '.opt').first().waitFor()
          await screenOk(page, t, '.together')
        }
      })
      await check(`S3 the composer's menu and "Send a stop" at ${tag}`, async () => {
        await open(page, 'group?tab=chat')
        await page.locator('.composer').getByRole('button', { name: 'Send a photo, a stop or where you are' }).click()
        await screenOk(page, 'composer menu', '.composer')
        await page.locator('.composer').getByRole('button', { name: 'A stop', exact: true }).click()
        await page.getByRole('dialog', { name: 'Send a stop' }).waitFor()
        await screenOk(page, 'send a stop', '[role="dialog"]')
      })
      await check(`S4 Invite people (group) at ${tag}`, async () => {
        await open(page, 'group?invite=1')
        const sheet = page.getByRole('dialog', { name: 'Invite people' })
        await sheet.locator('.sl').waitFor()
        await sheet.getByRole('button', { name: 'QR code' }).click()
        await screenOk(page, 'invite (group)', '[role="dialog"]')
      })
      await check(`S5 the stop sheet: Who's in? and the votes at ${tag}`, async () => {
        await open(page, 'plan?day=fri&stop=pick-frinight')
        await page.locator('[role="dialog"] fieldset.group').waitFor()
        await page.locator('[role="dialog"] label.choice', { hasText: 'Hostel party' }).click()
        await page.locator('[role="dialog"] .lead').waitFor()
        await screenOk(page, 'stop sheet', '[role="dialog"]')
      })
      await check(`S6 Now late at night: the group strip and Home safe at ${tag}`, async () => {
        await open(page, 'now')
        await page.locator('a.gstrip').waitFor()
        await page.locator('.hc').waitFor()
        await screenOk(page, 'now', '.gstrip, .hc')
      })
      await check(`S7 Plan: faces on the stop rows at ${tag}`, async () => {
        await open(page, 'plan?day=fri')
        await page.locator('#stop-trevi-at-night-free-and-lit .going').waitFor()
        await screenOk(page, 'plan', '.srow')
      })
      await check(`S8 the trip header with faces and the unread dot at ${tag}`, async () => {
        // The clock is frozen, and the chat was read at 23:30: a message after that.
        await page.clock.setFixedTime(new Date(romeTime('2026-10-09T23:35')))
        await act(page, ALI, 'sendMessage', gid, { kind: 'text', text: 'One more' })
        await open(page, 'more')
        const btn = page.locator('header.top a.tgb')
        await until('the dot', async () => await btn.locator('.unread-dot').count() === 1)
        const head = await page.evaluate(() => {
          const top = document.querySelector('.top-in')
          const name = document.querySelector('.ttl .name')
          return { over: top.scrollWidth > top.clientWidth + 1, cut: name.scrollWidth > name.clientWidth }
        })
        assert(!head.over, 'the header overflows')
        const small = (await smallTargets(page)).filter(t => /tgb|back|ttl|sosbtn/.test(t.cls))
        assert(!small.length, brief(small))
        assert(await noSideScroll(page), JSON.stringify(await sideScroll(page)))
      })
      const theirs = await alisGroup(page)
      const link = await alisInvite(page, theirs, 'editor')
      await check(`S9 the join page and leaving at ${tag}`, async () => {
        await open(page, `/j/${link}`)
        await page.getByRole('button', { name: 'Join Rome' }).waitFor()
        await screenOk(page, 'join', '.join')
        await page.getByRole('button', { name: 'Join Rome' }).click()
        // The trip is on (Fri 23:30): it opens on Now.
        await until('Now', async () => new URL(page.url()).pathname.endsWith(`/trips/${theirs}/now`), 15000)
        await open(page, `/trips/${theirs}/group?tab=people`)
        await page.getByRole('button', { name: 'Leave this trip' }).click()
        await page.getByRole('dialog', { name: 'Leave this trip?' }).waitFor()
        await screenOk(page, 'leave', '[role="dialog"]')
      })
      await check(`no page errors at ${tag}`, async () => assert(!errors.length, errors.join(' / ')))
      await ctx.close()
    }
  }

  // ================= Copy =================
  await check('A4 no em dash in the files of this package', async () => {
    const files = [
      'app/pages/trips/[id]/group.vue', 'app/pages/j/[token].vue', 'app/components/InviteSheet.vue', 'app/components/TogetherButton.vue',
      'app/components/NowGroupStrip.vue', 'app/components/StopTogether.vue', 'app/components/ChoicePicker.vue', 'app/components/StopRow.vue',
      'app/components/HomeCard.vue', 'app/components/StopEditor.vue', 'app/components/GroupChat.vue', 'app/components/GroupPeople.vue',
      'app/components/GroupDecide.vue', 'app/components/GroupNotice.vue', 'app/components/AvatarStack.vue', 'app/components/GroupWhereButton.vue',
      'app/components/ChatMessage.vue', 'app/components/ChatComposer.vue', 'app/components/ChatStopPicker.vue', 'tests/e2e/group.e2e.mjs',
      'app/components/MeetTalk.vue', 'shared/utils/talk.ts', 'app/pages/trips/new.vue', 'tests/e2e/meet.e2e.mjs', 'tests/talk.test.ts',
    ]
    const bad = files.filter(f => readFileSync(join(ROOT, f), 'utf8').includes(EM_DASH))
    assert(!bad.length, `em dash in ${bad.join(', ')}`)
  })
}
finally {
  await browser.close()
  await srv?.close()
}
