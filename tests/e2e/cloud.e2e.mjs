// End-to-end check of accounts, sign-in and sync against the Firebase emulators, with browsers playing devices.
// Run by .github/workflows/cloud-tests.yml:
//   NUXT_PUBLIC_FIREBASE_EMULATORS=127.0.0.1 npm run generate
//   npx firebase-tools emulators:exec --only auth,firestore,storage --project demo-travels "node tests/e2e/cloud.e2e.mjs"
//
// Two accounts, alice and bob (made up by the Auth emulator). A and B start as devices from before accounts: the Rome
// trip on both, and ticks on A. C is a new device. The cloud itself is read past the security rules with the
// emulators' owner token, to check what each account holds.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { chromium } from 'playwright'
import { loadTrip, romeCopy } from './lib.mjs'

const ROOT = '.output/public'
const PORT = 4173
const BASE = `http://127.0.0.1:${PORT}/`
const TRIP = 'rome-2026-10'
/** The app's own address (Firebase's authDomain), stood in for by this build in the sign-in method checks. */
const OWN = 'https://travela-emre.firebaseapp.com/'
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
const STORAGE = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }

/** A file of the build, with the SPA fallback to index.html. */
async function builtFile(pathname) {
  const path = normalize(decodeURIComponent(pathname))
  let file = join(ROOT, path)
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
  }
  catch {
    file = join(ROOT, 'index.html')
  }
  try {
    return { body: await readFile(file), type: TYPES[extname(file)] ?? 'application/octet-stream' }
  }
  catch {
    return { body: await readFile(join(ROOT, 'index.html')), type: TYPES['.html'] }
  }
}

const server = createServer(async (req, res) => {
  const { body, type } = await builtFile(new URL(req.url, BASE).pathname)
  res.writeHead(200, { 'content-type': type })
  res.end(body)
}).listen(PORT, '127.0.0.1')

const browser = await chromium.launch()
const problems = []
const logs = []
let passed = 0

// On GitHub, results also go out as annotations (readable from the API without the full log).
const esc = s => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
const escProp = s => esc(s).replace(/:/g, '%3A').replace(/,/g, '%2C')
function annotate(level, title, msg) {
  if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=${escProp(title)}::${esc(msg)}`)
}

/**
 * A device, opened at "/". `storage` is put in its localStorage before the app's first script (values as JSON, a
 * string as it is): a device from before accounts, for example. `init` are scripts run before the app's own (to slow
 * or break a browser feature).
 */
async function device(name, storage = {}, init = []) {
  const ctx = await browser.newContext({ timezoneId: 'Europe/Rome', serviceWorkers: 'block' })
  if (Object.keys(storage).length) {
    await ctx.addInitScript((s) => {
      if (localStorage.getItem('travel:e2e:device')) return
      localStorage.setItem('travel:e2e:device', '1')
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
    }, storage)
  }
  for (const s of init) await ctx.addInitScript(s)
  const page = await ctx.newPage()
  page.on('pageerror', e => problems.push(`[${name}] page error: ${e.message}`))
  page.on('console', (m) => {
    if (m.text().includes('[cloud]') || m.type() === 'error') {
      logs.push(`[${name}] ${m.type()}: ${m.text()}`)
      console.log(`   [${name}] ${m.text()}`)
    }
  })
  await page.goto(BASE)
  await page.waitForFunction(() => !!window.__travelsTest)
  return { name, ctx, page }
}

const run = (d, fn, arg) => d.page.evaluate(fn, arg)
const until = (d, fn, arg, timeout = 20000) => d.page.waitForFunction(fn, arg, { timeout, polling: 200 })
const email = sub => `${sub}@example.com`

/** Signs `d` in as the made-up Google account `sub`, and waits until it has synced with that account. */
async function signIn(d, sub) {
  await run(d, ([s, e]) => window.__travelsTest.cloud.testSignIn(s, e), [sub, email(sub)])
  await until(d, e => window.__travelsTest.cloud.status.value === 'synced' && window.__travelsTest.cloud.user.value?.email === e, email(sub), 30000)
}

const uidOf = d => run(d, () => window.__travelsTest.cloud.user.value?.uid ?? null)
/** What the app on `d` holds: its account (email), who is signed in, and its trips (id and title). */
const stateOf = d => run(d, () => {
  const T = window.__travelsTest
  return {
    account: T.cloud.account.value?.email ?? null,
    user: T.cloud.user.value?.email ?? null,
    status: T.cloud.status.value,
    path: location.pathname,
    trips: T.trips.value.map(t => `${t.id}: ${t.title}`),
  }
})

/** Waits until this device has pushed its latest local change. */
async function settle(d) {
  const t0 = await run(d, () => Date.now())
  await d.page.waitForTimeout(1500) // the app waits a moment after a change
  await until(d, t => window.__travelsTest.cloud.status.value === 'synced' && window.__travelsTest.cloud.lastSynced.value >= t, t0)
}

async function step(title, fn) {
  const t = Date.now()
  try {
    await fn()
    passed++
    console.log(`✓ ${title} (${Date.now() - t} ms)`)
    annotate('notice', `✓ ${title}`, `${Date.now() - t} ms`)
  }
  catch (e) {
    problems.push(`${title}: ${e.message.split('\n')[0]}`)
    console.log(`✗ ${title}\n   ${e.message.split('\n').slice(0, 3).join('\n   ')}`)
    for (const d of [A, B].filter(Boolean)) console.log(`   ${d.name} now: ${JSON.stringify(await stateOf(d).catch(() => '?'))}`)
    const state = await Promise.all([A, B].filter(Boolean).map(d => run(d, () => { const c = window.__travelsTest.cloud; return `${c.status.value} ${c.message.value}` }).then(x => `${d.name}: ${x}`, () => `${d.name}: ?`)))
    annotate('error', `✗ ${title}`, `${e.message.split('\n').slice(0, 6).join('\n')}\n\nstatus: ${state.join(' | ')}\n\nlogs:\n${logs.slice(-25).join('\n')}`)
  }
}

function assert(cond, message) {
  if (!cond) throw new Error(message)
}

const progressOf = (d, id = TRIP) => run(d, i => JSON.parse(JSON.stringify(window.__travelsTest.progress.value[i] ?? null)), id)
const edit = (d, body) => run(d, `(() => { const T = window.__travelsTest; const P = (T.progress.value['${TRIP}'] ??= { stops: {}, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {} }); ${body} })()`)

/** Moves inside the app as a tapped link does (a full load would start the app and its sign-in again). */
async function goTo(d, path) {
  await run(d, (to) => {
    history.pushState(null, '', to)
    dispatchEvent(new PopStateEvent('popstate', { state: null }))
  }, path)
  await d.page.waitForFunction(to => `${location.pathname}${location.search}` === to, path)
}

/** Both devices offline, or both back online. */
async function offline(on) {
  await Promise.all([A, B].map(d => d.ctx.setOffline(on)))
  if (on) for (const d of [A, B]) await until(d, () => window.__travelsTest.cloud.status.value === 'offline')
}

/** The live costs this device holds (amounts, sorted), and how many are deleted. */
async function costsOn(d) {
  const all = Object.values((await progressOf(d))?.expenses ?? {})
  return { live: all.filter(e => !e.deleted).map(e => e.amount).sort((x, y) => x - y), deleted: all.filter(e => e.deleted).map(e => e.amount) }
}

/** What the Costs page on `d` shows as Everything, its costs and its sync status, for a failure message. */
async function costState(d) {
  const shown = await run(d, () => (document.querySelector('.every .strong')?.textContent ?? '').trim()).catch(() => '?')
  const status = await run(d, () => { const c = window.__travelsTest.cloud; return `${c.status.value} ${c.message.value ?? ''}`.trim() }).catch(() => '?')
  return `${d.name} shows "${shown}", holds ${JSON.stringify(await costsOn(d).catch(() => '?'))}, sync ${status}`
}

/** Waits until the Costs page on `d` shows `amount` (e.g. "€12.00") as Everything. */
async function showsTotal(d, amount, timeout = 40000) {
  try {
    await until(d, a => (document.querySelector('.every .strong')?.textContent ?? '').trim().startsWith(a), amount, timeout)
  }
  catch {
    throw new Error(`waited for ${amount}: ${await costState(A)}; ${await costState(B)}`)
  }
}

/** Logs a cost on the Costs page's pad: the amount's digits, then a category (a tap on it saves). */
async function logCost(d, digits) {
  const pad = d.page.locator('.padcard')
  for (const k of digits) await pad.getByRole('button', { name: k, exact: true }).click()
  await pad.locator('button.cat', { hasText: 'Other' }).click()
}

/** Opens the cost row that reads `amount` in the edit sheet. */
async function editRow(d, amount) {
  await d.page.locator('button.crow', { hasText: amount }).click()
  const sheet = d.page.getByRole('dialog', { name: 'Edit cost' })
  await sheet.waitFor()
  return sheet
}

/** An account's items as the cloud holds them, read past the rules with the emulator's owner token. */
async function cloudItems(uid) {
  const out = {}
  let next = ''
  do {
    const r = await fetch(`http://${FIRESTORE}/v1/projects/demo-travels/databases/(default)/documents/users/${uid}/items?pageSize=300${next ? `&pageToken=${next}` : ''}`, { headers: { Authorization: 'Bearer owner' } })
    if (!r.ok) throw new Error(`reading ${uid}'s items: HTTP ${r.status}`)
    const j = await r.json()
    for (const doc of j.documents ?? []) {
      const f = doc.fields ?? {}
      out[doc.name.split('/').pop()] = { json: f.json?.stringValue ?? '', deleted: f.deleted?.booleanValue === true }
    }
    next = j.nextPageToken ?? ''
  } while (next)
  return out
}

const DOCS = `http://${FIRESTORE}/v1/projects/demo-travels/databases/(default)/documents`

/**
 * One request to the Firestore emulator's REST API as an account (its ID token), past the rules ('owner') or as nobody
 * (null): resolves to the HTTP status, 403 being the security rules saying no. `fields` is a document to write.
 */
async function asAccount(token, method, path, fields) {
  const r = await fetch(`${DOCS}/${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(fields ? { 'content-type': 'application/json' } : {}) },
    body: fields ? JSON.stringify({ fields }) : undefined,
  })
  await r.arrayBuffer()
  return r.status
}
const str = s => ({ stringValue: s })
const int = n => ({ integerValue: String(n) })
/** A well-formed item for the rules: a tombstone, so a device that sees it in its account changes nothing. */
const item = (ref, more = {}) => ({ kind: str('trip'), ref: str(ref), json: str(''), updatedAt: int(Date.now()), deleted: { booleanValue: true }, ...more })
/** The ID token Firebase sends for the account signed in on `d`. */
const tokenOf = d => run(d, async () => (await (await window.__travelsTest.cloud.testFirebase()).auth.currentUser?.getIdToken()) ?? null)

/** The photo files an account holds in the cloud (their paths). */
async function cloudPhotos(uid) {
  const r = await fetch(`http://${STORAGE}/v0/b/demo-travels.appspot.com/o?prefix=${encodeURIComponent(`users/${uid}/`)}`, { headers: { Authorization: 'Bearer owner' } })
  if (!r.ok) throw new Error(`listing ${uid}'s photos: HTTP ${r.status}`)
  return ((await r.json()).items ?? []).map(i => i.name)
}

/** The photos in this device's IndexedDB (null when it can't tell). Never creates the app's database. */
const devicePhotos = d => run(d, async () => {
  if (!(await indexedDB.databases()).some(x => x.name === 'travels-photos')) return []
  return new Promise((resolve) => {
    const rq = indexedDB.open('travels-photos')
    rq.onerror = () => resolve(null)
    rq.onsuccess = () => {
      const db = rq.result
      if (!db.objectStoreNames.contains('photos')) {
        db.close()
        resolve([])
        return
      }
      const keys = db.transaction('photos').objectStore('photos').getAllKeys()
      keys.onsuccess = () => {
        db.close()
        resolve(keys.result.map(String))
      }
      keys.onerror = () => {
        db.close()
        resolve(null)
      }
    }
  })
})

/**
 * Watches `d` on every frame from now on, noting each frame whose screen shows one of `texts`, or whose store holds a
 * trip titled one of `titles` or a progress with `booking` ticked, with who the account is then. seen(d) reads it back.
 */
async function watchFrames(d, marks) {
  await run(d, (m) => {
    const T = window.__travelsTest
    const frames = []
    window.__frames = frames
    const tick = () => {
      const text = document.body.innerText
      const shown = m.texts.filter(x => text.includes(x))
      const held = T.trips.value.filter(t => m.titles.includes(t.title)).map(t => t.title)
      const ticked = Object.values(T.progress.value).some(p => p?.bookings?.[m.booking])
      if (shown.length || held.length || ticked) frames.push({ account: T.cloud.account.value?.email ?? null, user: T.cloud.user.value?.email ?? null, shown, held, ticked, path: location.pathname })
      window.__frame = requestAnimationFrame(tick)
    }
    tick()
  }, marks)
}
const seen = d => run(d, () => {
  cancelAnimationFrame(window.__frame)
  return window.__frames
})

const trip = loadTrip()
const thursday = trip.days[0].stops.map(s => s.id)
/** A device used before accounts: the Rome trip the app added by itself, what was ticked there, and the old bookkeeping. */
const before = (progress, extra = {}) => ({
  'travel:trips:v1': [romeCopy(trip)],
  'travel:seeded:v1': [TRIP],
  ...(progress ? { 'travel:progress:v1': { [TRIP]: progress } } : {}),
  ...extra,
})

const EDITED = 'Rome (edited on A)'
let A, B
// A was used before accounts, with the first Thursday stop ticked (and the sync memory older versions wrote).
A = await device('A', before({ stops: { [thursday[0]]: { status: 'done', at: '2026-10-08T15:00:00.000Z' } }, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {} }, { 'travel:cloud:sync:v1': '[object Object]' }))
// B was used before accounts too: only the Rome trip the app added there.
B = await device('B', before(null))
let alice = ''
let bob = ''
let bobToken = ''

await step('W1 a device with no account opens on the landing page, and a trip route sends it there', async () => {
  const s = await stateOf(A)
  assert(s.account === null && s.user === null, `account ${s.account}, signed in ${s.user}`)
  assert(s.path === '/' && !(await A.page.locator('.shell').count()), `at ${s.path}`)
  await run(A, (to) => {
    history.pushState(null, '', to)
    dispatchEvent(new PopStateEvent('popstate', { state: null }))
  }, `/trips/${TRIP}/now`)
  await A.page.waitForTimeout(800)
  const t = await stateOf(A)
  assert(t.path === '/' && !(await A.page.locator('.shell').count()), `a trip route opened: ${t.path}`)
  assert(!(await A.page.locator('body').innerText()).includes(trip.subtitle), 'the landing page shows the trip on the device')
})

await step('W5 a device used before accounts signs in for the first time: its trips and ticks reach the account', async () => {
  await signIn(A, 'alice')
  alice = await uidOf(A)
  const s = await stateOf(A)
  assert(s.account === email('alice'), `remembered account ${s.account}`)
  assert(s.trips.includes(`${TRIP}: Rome`), `trips on A: ${s.trips}`)
  assert((await progressOf(A))?.stops?.[thursday[0]]?.status === 'done', 'the tick on A is gone')
  const items = await cloudItems(alice)
  assert(items[`trip-${TRIP}`] && JSON.parse(items[`trip-${TRIP}`].json).title === 'Rome', `the account's items: ${Object.keys(items)}`)
  assert(JSON.parse(items[`progress-${TRIP}`]?.json || '{}').stops?.[thursday[0]]?.status === 'done', 'the tick did not reach the account')
})

await step('A\'s changes reach B when B signs in (and B\'s untouched copy from before accounts doesn\'t overwrite them)', async () => {
  await edit(A, `P.bookings['hostel'] = true; const t = T.trips.value.find(x => x.id === '${TRIP}'); t.title = '${EDITED}'; t.edited = true; t.updatedAt = new Date().toISOString()`)
  await settle(A)
  await signIn(B, 'alice')
  await until(B, ([id, title]) => window.__travelsTest.trips.value.find(t => t.id === id)?.title === title, [TRIP, EDITED])
  const p = await progressOf(B)
  if (!p?.bookings?.hostel) throw new Error('booking missing on B')
  if (p?.stops?.[thursday[0]]?.status !== 'done') throw new Error('A\'s tick from before accounts is missing on B')
})

await step('a tick on B shows up on A while both are open', async () => {
  await edit(B, `P.stops['vatican-museums-sistine-chapel'] = { status: 'done', at: new Date().toISOString() }`)
  await settle(B)
  await until(A, id => window.__travelsTest.progress.value[id]?.stops?.['vatican-museums-sistine-chapel']?.status === 'done', TRIP)
})

await step('changes made offline on A merge with changes made meanwhile on B', async () => {
  await A.ctx.setOffline(true)
  await until(A, () => window.__travelsTest.cloud.status.value === 'offline')
  await edit(A, `P.packing['adapter'] = true`)
  await edit(B, `P.packing['charger'] = true`)
  await settle(B)
  await A.page.waitForTimeout(1500)
  await A.ctx.setOffline(false)
  await until(A, id => { const p = window.__travelsTest.progress.value[id]; return !!(p?.packing?.adapter && p?.packing?.charger) }, TRIP, 40000)
  await until(B, id => { const p = window.__travelsTest.progress.value[id]; return !!(p?.packing?.adapter && p?.packing?.charger) }, TRIP, 40000)
})

let photoId = ''
await step('a photo added on A can be opened on B', async () => {
  photoId = await run(A, async () => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 48
    const g = c.getContext('2d')
    g.fillStyle = '#8A1538'
    g.fillRect(0, 0, 64, 48)
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9))
    return window.__travelsTest.photos.add(blob)
  })
  await edit(A, `P.feedback['vatican-museums-sistine-chapel'] = { rating: 5, photos: ['${photoId}'], updatedAt: new Date().toISOString() }`)
  await settle(A)
  await until(A, () => window.__travelsTest.cloud.photosWaiting.value === 0 && window.__travelsTest.cloud.photoBackup.value === 'on', null, 30000)
  await until(B, ([id, ph]) => (window.__travelsTest.progress.value[id]?.feedback?.['vatican-museums-sistine-chapel']?.photos ?? []).includes(ph), [TRIP, photoId])
  const url = await run(B, id => window.__travelsTest.photos.url(id), photoId)
  if (!url) throw new Error('B could not load the photo')
})

await step('signed in, trip settings says your data is kept on this device and in your account in the cloud', async () => {
  await goTo(A, `/trips/${TRIP}/settings`)
  await A.page.getByText('Everything is kept on this device and in your account in the cloud.').waitFor({ timeout: 10000 })
})

// D6 (spec 9.7): costs are merged record by record, so two phones logging, editing and deleting costs while
// offline end up with the same costs, and a deleted one never comes back.
await step('D6 a €5 cost on A and a €7 one on B, both logged offline, show €12 on both after sync', async () => {
  for (const d of [A, B]) {
    await goTo(d, `/trips/${TRIP}/costs`)
    await d.page.locator('.padcard').waitFor({ timeout: 10000 })
  }
  await offline(true)
  await logCost(A, '5')
  await logCost(B, '7')
  await showsTotal(A, '€5.00', 5000)
  await showsTotal(B, '€7.00', 5000)
  await offline(false)
  for (const d of [A, B]) await showsTotal(d, '€12.00')
  for (const d of [A, B]) {
    const c = await costsOn(d)
    if (JSON.stringify(c.live) !== '[5,7]') throw new Error(`${d.name} holds ${JSON.stringify(c)}`)
  }
})

await step('D6 A deletes the €5 while B edits the €7 to €8 (both offline): both show only €8 after sync', async () => {
  await offline(true)
  const a = await editRow(A, '€5.00')
  await a.getByRole('button', { name: 'Delete', exact: true }).click()
  await a.waitFor({ state: 'detached' })
  const b = await editRow(B, '€7.00')
  await b.getByRole('button', { name: '8', exact: true }).click()
  await b.getByRole('button', { name: 'Save', exact: true }).click()
  await b.waitFor({ state: 'detached' })
  await showsTotal(A, '€7.00', 5000)
  await showsTotal(B, '€13.00', 5000)
  await offline(false)
  for (const d of [A, B]) await showsTotal(d, '€8.00')
  for (const d of [A, B]) {
    const c = await costsOn(d)
    if (JSON.stringify(c.live) !== '[8]' || JSON.stringify(c.deleted) !== '[5]') throw new Error(`${d.name} holds ${JSON.stringify(c)}`)
    const rows = (await d.page.locator('button.crow').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim())
    if (rows.length !== 1 || !rows[0].includes('€8.00')) throw new Error(`${d.name} lists ${JSON.stringify(rows)}`)
  }
})

// ---------- W4: every account is private ----------
const LISBON = { ...romeCopy(trip), id: 'lisbon-2026-11', seedId: undefined, title: 'Lisbon', destination: 'Lisbon', country: 'Portugal', subtitle: 'Bob\'s own trip', edited: true }

await step('W4 two accounts can\'t read or write each other\'s items (the rules), and a new account starts empty', async () => {
  const C = await device('C')
  try {
    await signIn(C, 'bob')
    bob = await uidOf(C)
    bobToken = await tokenOf(C)
    assert(bob && bob !== alice, `bob's uid ${bob}`)
    assert(!(await stateOf(C)).trips.length, 'a new account on a new device got trips by itself')
    const refused = (d, fn, uid) => run(d, ([f, u]) => window.__travelsTest.cloud[f](u).then(() => false, e => String(e.code ?? e).includes('permission-denied')), [fn, uid])
    assert(await refused(C, 'testPeek', alice), 'bob could read alice\'s items')
    assert(await refused(C, 'testPoke', alice), 'bob could write into alice\'s items')
    assert(await refused(A, 'testPeek', bob), 'alice could read bob\'s items')
    assert(await refused(A, 'testPoke', bob), 'alice could write into bob\'s items')
    assert((await run(C, u => window.__travelsTest.cloud.testPeek(u), bob)).length === 0, 'bob can\'t read his own (empty) items')
    // Bob's own trip, and the sample trip (W6: it keeps its seedId, and the same id as alice's Rome).
    await run(C, t => window.__travelsTest.trips.value.push(t), JSON.parse(JSON.stringify(LISBON)))
    const sample = await run(C, () => {
      const t = window.__travelsTest.addSample()
      return t && { id: t.id, seedId: t.seedId, title: t.title, edited: t.edited }
    })
    assert(sample?.id === TRIP && sample.seedId === TRIP && sample.title === 'Rome' && sample.edited === false, `the sample: ${JSON.stringify(sample)}`)
    await settle(C)
    const items = await cloudItems(bob)
    assert(JSON.parse(items['trip-lisbon-2026-11']?.json || '{}').title === 'Lisbon', `bob's items: ${Object.keys(items)}`)
    assert(JSON.parse(items[`trip-${TRIP}`]?.json || '{}').seedId === TRIP, 'the sample did not reach bob\'s account with its seedId')
    const mine = await cloudItems(alice)
    assert(!mine['trip-lisbon-2026-11'] && JSON.parse(mine[`trip-${TRIP}`].json).title === EDITED, 'bob\'s trips reached alice\'s account')
  }
  finally {
    await C.ctx.close()
  }
})

await step('W4 the rules, asked directly with each account\'s own token: no reading or writing another account\'s items, nobody reads or writes the old meta/owner document, and malformed items are refused', async () => {
  const aliceToken = await tokenOf(A)
  assert(aliceToken && bobToken, `ID tokens: alice ${!!aliceToken}, bob ${!!bobToken}`)
  // The owner document the version before accounts wrote (it stays in the real database): written past the rules.
  const claimed = Date.now()
  assert(await asAccount('owner', 'PATCH', 'meta/owner', { uid: str(alice), claimedAt: int(claimed) }) === 200, 'could not write meta/owner past the rules')
  const cases = [
    // What each account may do with its own items (so a refusal below is the rules, not a bad token).
    ['alice lists her own items', aliceToken, 'GET', `users/${alice}/items`, null, 200],
    ['alice writes a well-formed item of her own', aliceToken, 'PATCH', `users/${alice}/items/trip-rules-check`, item('rules-check'), 200],
    ['bob lists his own items', bobToken, 'GET', `users/${bob}/items`, null, 200],
    // Another account's items.
    ['alice lists bob\'s items', aliceToken, 'GET', `users/${bob}/items`, null, 403],
    ['alice reads bob\'s trip', aliceToken, 'GET', `users/${bob}/items/trip-lisbon-2026-11`, null, 403],
    ['alice writes into bob\'s items', aliceToken, 'PATCH', `users/${bob}/items/trip-rules-check`, item('rules-check'), 403],
    ['bob lists alice\'s items', bobToken, 'GET', `users/${alice}/items`, null, 403],
    ['bob reads alice\'s trip', bobToken, 'GET', `users/${alice}/items/trip-${TRIP}`, null, 403],
    ['bob writes into alice\'s items', bobToken, 'PATCH', `users/${alice}/items/trip-rules-check`, item('rules-check'), 403],
    ['bob deletes alice\'s trip', bobToken, 'DELETE', `users/${alice}/items/trip-${TRIP}`, null, 403],
    ['nobody signed in lists alice\'s items', null, 'GET', `users/${alice}/items`, null, 403],
    // The old owner document, even for the account it names.
    ['alice reads meta/owner', aliceToken, 'GET', 'meta/owner', null, 403],
    ['bob reads meta/owner', bobToken, 'GET', 'meta/owner', null, 403],
    ['nobody signed in reads meta/owner', null, 'GET', 'meta/owner', null, 403],
    ['bob claims meta/owner', bobToken, 'PATCH', 'meta/owner', { uid: str(bob), claimedAt: int(Date.now()) }, 403],
    ['alice rewrites meta/owner', aliceToken, 'PATCH', 'meta/owner', { uid: str(alice), claimedAt: int(Date.now()) }, 403],
    ['alice deletes meta/owner', aliceToken, 'DELETE', 'meta/owner', null, 403],
    ['bob writes a document outside the items', bobToken, 'PATCH', `users/${bob}`, { uid: str(bob) }, 403],
    // Items that aren't what the app writes.
    ['alice writes an item of another kind', aliceToken, 'PATCH', `users/${alice}/items/photo-rules-check`, item('rules-check', { kind: str('photo') }), 403],
    ['alice writes an item whose updatedAt is text', aliceToken, 'PATCH', `users/${alice}/items/trip-rules-time`, item('rules-time', { updatedAt: str('now') }), 403],
    ['alice writes an item of 1,000,000 characters', aliceToken, 'PATCH', `users/${alice}/items/trip-rules-big`, item('rules-big', { json: str('x'.repeat(1000000)) }), 403],
    ['alice writes an item with a field the app never writes', aliceToken, 'PATCH', `users/${alice}/items/trip-rules-extra`, item('rules-extra', { extra: str('x'.repeat(900000)) }), 403],
    ['alice writes an item under a name that isn\'t its kind and ref', aliceToken, 'PATCH', `users/${alice}/items/trip-rules-name`, item('rules-other'), 403],
    ['alice writes an item whose deleted is text', aliceToken, 'PATCH', `users/${alice}/items/trip-rules-del`, item('rules-del', { deleted: str('yes') }), 403],
    // (Items without `deleted`, the app's own, go up in every sync check here.)
  ]
  const wrong = []
  for (const [what, token, method, path, fields, want] of cases) {
    const got = await asAccount(token, method, path, fields)
    if (got !== want) wrong.push(`${what}: HTTP ${got}, expected ${want}`)
  }
  assert(!wrong.length, wrong.join('; '))
  const owner = await (await fetch(`${DOCS}/meta/owner`, { headers: { Authorization: 'Bearer owner' } })).json()
  assert(owner.fields?.uid?.stringValue === alice && owner.fields?.claimedAt?.integerValue === String(claimed), `meta/owner changed: ${JSON.stringify(owner.fields)}`)
  const bobs = Object.keys(await cloudItems(bob)).sort()
  assert(JSON.stringify(bobs) === JSON.stringify(['trip-lisbon-2026-11', `trip-${TRIP}`]), `bob's account holds ${bobs}`)
})

await step('W4 on one device alice signs out and bob signs in: bob never sees alice\'s trips, and none of them reach his account', async () => {
  const r = await run(A, () => window.__travelsTest.cloud.signOut())
  assert(r === 'done', `sign-out said ${r}`)
  await until(A, () => location.pathname === '/' && !window.__travelsTest.cloud.account.value && !window.__travelsTest.cloud.signedIn.value)
  const text = await A.page.locator('body').innerText()
  assert(!text.includes(EDITED) && !(await A.page.locator('.shell').count()), 'signed out, the screen still shows alice\'s trip')
  // D36: the copy stays on the device with the remembered account, behind the landing page.
  const kept = await run(A, () => ({ trips: JSON.parse(localStorage.getItem('travel:trips:v1') || '[]').map(t => t.title), account: JSON.parse(localStorage.getItem('travel:account:v1') || 'null') }))
  assert(kept.trips.includes('Rome (edited on A)') && kept.account?.out === true && kept.account.email === email('alice'), `after sign-out the device holds ${JSON.stringify(kept)}`)
  assert((await devicePhotos(A))?.includes(photoId), 'alice\'s photo left the device at sign-out')

  await watchFrames(A, { texts: [EDITED, trip.subtitle], titles: [EDITED], booking: 'hostel' })
  await signIn(A, 'bob')
  await until(A, () => window.__travelsTest.trips.value.some(t => t.id === 'lisbon-2026-11') && window.__travelsTest.trips.value.some(t => t.id === 'rome-2026-10'))
  await A.page.waitForTimeout(1500)
  const frames = await seen(A)
  // The watch works: until bob signed in, it saw alice's copy held (hidden) on the device.
  assert(frames.some(f => f.held.includes(EDITED) && !f.account && !f.shown.length), `the frame watch saw ${frames.length} frames, none with alice's hidden copy`)
  const leaks = frames.filter(f => f.shown.length || ((f.account === email('bob') || f.user === email('bob')) && (f.held.length || f.ticked)))
  assert(!leaks.length, `alice's data showed or was held under bob: ${JSON.stringify(leaks.slice(0, 3))}`)
  const s = await stateOf(A)
  assert(s.account === email('bob') && JSON.stringify([...s.trips].sort()) === JSON.stringify(['lisbon-2026-11: Lisbon', `${TRIP}: Rome`]), `A under bob: ${JSON.stringify(s)}`)
  const p = await progressOf(A)
  assert(!p?.bookings?.hostel && !p?.packing?.adapter && !Object.keys(p?.expenses ?? {}).length, `alice's progress is on A under bob: ${JSON.stringify(p)?.slice(0, 200)}`)
  assert(!(await devicePhotos(A))?.includes(photoId), 'alice\'s photo is still on the device under bob')
  assert(!(await run(A, () => localStorage.getItem('travel:seeded:v1'))), 'the old seeded bookkeeping is still there')
  // Anything A would send goes up within the app's debounce (800 ms, at most 5 s): give it that, then look.
  await A.page.waitForTimeout(5500)
  await until(A, () => window.__travelsTest.cloud.status.value === 'synced' && window.__travelsTest.cloud.pending.value === 0)
  const items = await cloudItems(bob)
  // (The Rome plan itself holds a booking called "hostel" and Thursday's stops: look at what was done, not the plan.)
  const leaked = Object.entries(items).filter(([key, i]) => {
    const x = i.json ? JSON.parse(i.json) : {}
    return key.startsWith('trip-') ? x.title === EDITED : !!(x.bookings?.hostel || x.stops?.[thursday[0]] || x.packing?.adapter || Object.keys(x.expenses ?? {}).length)
  })
  assert(JSON.stringify(Object.keys(items).sort()) === JSON.stringify(['trip-lisbon-2026-11', `trip-${TRIP}`]), `bob's account holds ${Object.keys(items)}`)
  assert(!leaked.length, `alice's data reached bob's account: ${leaked.map(([k]) => k)}`)
  assert(!(await cloudPhotos(bob)).some(p => p.includes(photoId)), 'alice\'s photo reached bob\'s account')
})

await step('W4 alice signs back in on that device and gets her trips back from the cloud, and bob\'s leave it', async () => {
  assert(await run(A, () => window.__travelsTest.cloud.signOut()) === 'done', 'bob could not sign out')
  await signIn(A, 'alice')
  await until(A, ([id, title]) => window.__travelsTest.trips.value.find(t => t.id === id)?.title === title, [TRIP, EDITED])
  await until(A, id => !!window.__travelsTest.progress.value[id]?.bookings?.hostel, TRIP)
  const s = await stateOf(A)
  assert(!s.trips.some(t => t.startsWith('lisbon')), `bob's trip stayed: ${s.trips}`)
  const c = await costsOn(A)
  assert(JSON.stringify(c.live) === '[8]', `alice's costs on A: ${JSON.stringify(c)}`)
  const url = await run(A, id => window.__travelsTest.photos.url(id), photoId)
  assert(url, 'alice\'s photo did not come back from her account')
})

await step('D36 sign-out with changes that haven\'t reached the account warns and changes nothing; forced, the change arrives when she signs back in', async () => {
  await A.ctx.setOffline(true)
  await until(A, () => window.__travelsTest.cloud.status.value === 'offline')
  await edit(A, `P.packing['sunscreen'] = true`)
  await until(A, () => window.__travelsTest.cloud.pending.value > 0)
  const r = await run(A, () => window.__travelsTest.cloud.signOut())
  assert(r === 'pending', `sign-out said ${r}`)
  const still = await stateOf(A)
  assert(still.user === email('alice') && still.account === email('alice'), `after the warning: ${JSON.stringify(still)}`)
  assert((await progressOf(A))?.packing?.sunscreen, 'the change is gone')
  assert(await run(A, () => window.__travelsTest.cloud.signOut({ force: true })) === 'done', 'a forced sign-out did not finish')
  await until(A, () => location.pathname === '/' && !window.__travelsTest.cloud.account.value)
  await A.ctx.setOffline(false)
  await signIn(A, 'alice')
  assert((await progressOf(A))?.packing?.sunscreen, 'signing back in lost the change made offline')
  await until(B, id => !!window.__travelsTest.progress.value[id]?.packing?.sunscreen, TRIP, 40000)
})

await step('D34 a remembered account whose session is gone keeps its trips open (after a reload too), home asks to sign in again, and signing in keeps them', async () => {
  await run(B, async () => (await window.__travelsTest.cloud.testFirebase()).signOut())
  await until(B, () => window.__travelsTest.cloud.status.value === 'signed-out')
  const s = await stateOf(B)
  assert(s.account === email('alice') && s.user === null && s.path === `/trips/${TRIP}/costs` && s.trips.length === 1, `once the session went: ${JSON.stringify(s)}`)
  await B.page.reload()
  await B.page.waitForFunction(() => !!window.__travelsTest)
  await until(B, () => window.__travelsTest.cloud.status.value === 'signed-out')
  const r = await stateOf(B)
  assert(r.path === `/trips/${TRIP}/costs` && r.account === email('alice') && r.trips.length === 1, `after a reload: ${JSON.stringify(r)}`)
  assert(await B.page.locator('.shell.sec-costs').count(), 'the trip did not open')
  await goTo(B, '/')
  await B.page.getByText('Sign in again to keep saving to your account.').first().waitFor({ timeout: 10000 })
  await signIn(B, 'alice')
  const t = await stateOf(B)
  assert(t.trips.length === 1 && (await progressOf(B))?.packing?.sunscreen, `signed in again: ${JSON.stringify(t)}`)
})

await step('deleting the trip on A removes it on B', async () => {
  await run(A, id => { window.__travelsTest.trips.value = window.__travelsTest.trips.value.filter(t => t.id !== id) }, TRIP)
  await settle(A)
  await until(B, id => !window.__travelsTest.trips.value.some(t => t.id === id), TRIP)
})

await step('removing the account from a device clears it there and keeps everything in the cloud', async () => {
  const before = await cloudItems(alice)
  await run(B, () => window.__travelsTest.cloud.forget())
  await until(B, () => location.pathname === '/' && !window.__travelsTest.cloud.account.value)
  const left = await run(B, () => ({ trips: window.__travelsTest.trips.value.length, progress: Object.keys(window.__travelsTest.progress.value).length, account: localStorage.getItem('travel:account:v1'), memory: localStorage.getItem('travel:cloud:sync:v1') }))
  assert(!left.trips && !left.progress && left.account === null && left.memory === null, `B still holds ${JSON.stringify(left)}`)
  assert(!(await devicePhotos(B))?.length, 'photos stayed on B')
  await B.page.waitForTimeout(2500)
  assert(JSON.stringify(await cloudItems(alice)) === JSON.stringify(before), 'removing the device changed the account\'s cloud copy')
})

await step('W6 the sample tried again on a device new to the account after the account deleted its copy: it stays, and reaches the account and A', async () => {
  assert((await cloudItems(alice))[`trip-${TRIP}`]?.deleted, 'the account\'s copy of the sample is not deleted')
  await signIn(B, 'alice')
  const t = await run(B, () => {
    const s = window.__travelsTest.addSample()
    return s && { id: s.id, seedId: s.seedId, edited: s.edited }
  })
  assert(t?.id === TRIP && t.seedId === TRIP && t.edited === false, `the sample: ${JSON.stringify(t)}`)
  // It goes up a moment after it is added (the account's deletion of the earlier copy must not take it away instead).
  let items = {}
  for (const end = Date.now() + 20000; Date.now() < end; await B.page.waitForTimeout(400)) {
    items = await cloudItems(alice)
    if (items[`trip-${TRIP}`] && !items[`trip-${TRIP}`].deleted) break
  }
  const onB = (await stateOf(B)).trips
  assert(onB.some(x => x.startsWith(`${TRIP}:`)), `the sample went away again on B, which holds ${JSON.stringify(onB)}`)
  assert(!items[`trip-${TRIP}`]?.deleted && JSON.parse(items[`trip-${TRIP}`]?.json || '{}').seedId === TRIP, 'the sample did not reach the account')
  await until(A, id => window.__travelsTest.trips.value.some(x => x.id === id), TRIP)
})

// ---------- after review (spec D42 to D44): what isn't in the cloud yet, and a copy's edits, stay with their account ----------
const STOP = thursday[0]
/** Who Firebase itself has signed in on `d` (its email), whatever the app shows. */
const firebaseUser = d => run(d, async () => (await window.__travelsTest.cloud.testFirebase()).auth.currentUser?.email ?? null)
/** Firebase's session on `d` ends by itself (it expired, or the browser cleared it): the app keeps the account (D34). */
async function sessionGone(d) {
  await run(d, async () => (await window.__travelsTest.cloud.testFirebase()).signOut())
  await until(d, () => window.__travelsTest.cloud.status.value === 'signed-out' && !window.__travelsTest.cloud.user.value)
}
/** A small JPEG made in the page and saved through the app (usePhotos().add): its id. */
const addPhoto = d => run(d, async () => {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 48
  const g = c.getContext('2d')
  g.fillStyle = '#123456'
  g.fillRect(0, 0, 64, 48)
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9))
  return window.__travelsTest.photos.add(blob)
})
/** Polls `fn` (in Node) until it gives something truthy; throws `what` after `timeout`. */
async function poll(what, fn, timeout = 20000) {
  let last
  for (const end = Date.now() + timeout; Date.now() < end; await new Promise(r => setTimeout(r, 300))) {
    last = await fn()
    if (last) return last
  }
  throw new Error(`${what} (last: ${JSON.stringify(last)?.slice(0, 200)})`)
}
const cloudProgress = async uid => (await cloudItems(uid))[`progress-${TRIP}`]?.json ?? ''

let E
await step('D42 "Sign in again" with another account while changes wait on the device: it asks first, and Cancel keeps them for the first account', async () => {
  E = await device('E')
  await signIn(E, 'carol')
  await run(E, () => window.__travelsTest.addSample())
  await settle(E)
  // Carol's session goes (D34), and she goes on ticking her packing list.
  await sessionGone(E)
  await edit(E, `P.packing['carol-kept'] = true`)
  await until(E, () => window.__travelsTest.cloud.pending.value > 0)
  // Google's account list offers her other account, and it is picked: the app asks, and Cancel keeps her change.
  const asked = []
  E.page.once('dialog', (dlg) => {
    asked.push(dlg.message())
    void dlg.dismiss()
  })
  await run(E, ([s, e]) => window.__travelsTest.cloud.testSignIn(s, e), ['dave', email('dave')])
  await poll('the question', () => asked.length, 10000)
  await until(E, () => window.__travelsTest.cloud.message.value.startsWith('Not signed in as'))
  assert(asked[0].includes(email('carol')) && asked[0].includes(email('dave')) && /Remove (it|them)/.test(asked[0]), `asked: ${asked[0]}`)
  const s = await stateOf(E)
  assert(s.account === email('carol') && s.user === null && s.status === 'signed-out' && s.trips.length === 1, `after Cancel: ${JSON.stringify(s)}`)
  assert(await firebaseUser(E) === null, `still signed in as ${await firebaseUser(E)}`)
  assert((await progressOf(E))?.packing?.['carol-kept'], 'the change is gone from the device')
  const msg = await run(E, () => window.__travelsTest.cloud.message.value)
  assert(msg.includes(email('carol')) && msg.includes(email('dave')), `message: ${msg}`)
  // Carol signs in: her change reaches her account.
  await signIn(E, 'carol')
  const carol = await uidOf(E)
  await poll('the kept change in carol\'s account', async () => (await cloudProgress(carol)).includes('carol-kept'))
})

await step('D42 ... and OK removes them and goes on as the other account, which gets nothing of the first', async () => {
  try {
    const carol = await uidOf(E)
    await sessionGone(E)
    await edit(E, `P.packing['carol-dropped'] = true`)
    await until(E, () => window.__travelsTest.cloud.pending.value > 0)
    const asked = []
    E.page.once('dialog', (dlg) => {
      asked.push(dlg.message())
      void dlg.accept()
    })
    await signIn(E, 'dave')
    assert(asked.length === 1, `asked ${asked.length} times`)
    const dave = await uidOf(E)
    const s = await stateOf(E)
    assert(s.account === email('dave') && !s.trips.length && !Object.keys(await run(E, () => window.__travelsTest.progress.value)).length, `as dave: ${JSON.stringify(s)}`)
    await E.page.waitForTimeout(2500)
    assert(!Object.keys(await cloudItems(dave)).length, `dave's account holds ${Object.keys(await cloudItems(dave))}`)
    const kept = await cloudProgress(carol)
    assert(kept.includes('carol-kept') && !kept.includes('carol-dropped'), 'carol\'s account changed')
  }
  finally {
    await E.ctx.close()
  }
})

await step('D44 a stop sheet follows a newer note from another device, never writes its older one back, and never writes into the next account', async () => {
  const F = await device('F')
  const G = await device('G')
  try {
    await signIn(F, 'erin')
    await run(F, () => window.__travelsTest.addSample())
    await edit(F, `P.feedback['${STOP}'] = { rating: 3, note: 'ERIN FIRST NOTE', updatedAt: new Date().toISOString() }`)
    await settle(F)
    const erin = await uidOf(F)
    await signIn(G, 'erin')
    await until(G, ([id, st]) => window.__travelsTest.progress.value[id]?.feedback?.[st]?.note === 'ERIN FIRST NOTE', [TRIP, STOP])
    // F has the stop open; on G the note is rewritten.
    await goTo(F, `/trips/${TRIP}/plan?stop=${STOP}`)
    await F.page.locator('section.fb textarea').waitFor({ timeout: 10000 })
    await edit(G, `P.feedback['${STOP}'] = { ...P.feedback['${STOP}'], note: 'ERIN NEWER NOTE', updatedAt: new Date().toISOString() }`)
    await settle(G)
    await until(F, ([id, st]) => window.__travelsTest.progress.value[id]?.feedback?.[st]?.note === 'ERIN NEWER NOTE', [TRIP, STOP])
    await until(F, () => document.querySelector('section.fb textarea')?.value === 'ERIN NEWER NOTE', null, 5000)
      .catch(() => { throw new Error('the open sheet still shows the older note') })
    // Closed untouched, it writes nothing back.
    await goTo(F, `/trips/${TRIP}/plan`)
    await F.page.waitForTimeout(2500)
    const note = JSON.parse((await cloudProgress(erin)) || '{}').feedback?.[STOP]?.note
    assert(note === 'ERIN NEWER NOTE', `after closing the sheet the account holds "${note}"`)
    // Open again, untouched, when another account signs in on F: none of erin's note goes to that account.
    await goTo(F, `/trips/${TRIP}/plan?stop=${STOP}`)
    await F.page.locator('section.fb textarea').waitFor({ timeout: 10000 })
    await signIn(F, 'frank')
    await F.page.waitForTimeout(3000)
    const frank = await uidOf(F)
    const items = await cloudItems(frank)
    const leaked = Object.keys(items).filter(k => items[k].json.includes('ERIN'))
    assert(!leaked.length, `frank's account holds erin's note in ${leaked}`)
    assert(!JSON.stringify(await run(F, () => window.__travelsTest.progress.value)).includes('ERIN'), 'erin\'s note is on the device under frank')
  }
  finally {
    await F.ctx.close()
    await G.ctx.close()
  }
})

let ginaPhoto = ''
await step('D44 a photo goes up only once a stop of the device\'s copy holds it: one nothing refers to stays on the device', async () => {
  const H = await device('H')
  try {
    await signIn(H, 'gina')
    await run(H, () => window.__travelsTest.addSample())
    await settle(H)
    const gina = await uidOf(H)
    // Saved, but no stop holds it yet (as a photo left from an earlier account would be): it doesn't go up.
    ginaPhoto = await addPhoto(H)
    await H.page.waitForTimeout(2500)
    await run(H, () => window.__travelsTest.cloud.backupPhotos())
    const early = (await cloudPhotos(gina)).some(p => p.includes(ginaPhoto))
    const waiting = await run(H, () => window.__travelsTest.cloud.pending.value)
    // A stop holds it: it goes up (the next check fetches it on another device).
    await edit(H, `P.feedback['${STOP}'] = { rating: 5, photos: ['${ginaPhoto}'], updatedAt: new Date().toISOString() }`)
    await settle(H)
    await poll('the photo in gina\'s account', async () => (await cloudPhotos(gina)).some(p => p.includes(ginaPhoto)))
    await poll('the stop holding it in gina\'s account', async () => (await cloudProgress(gina)).includes(ginaPhoto))
    assert(!early, 'a photo no stop holds went up')
    assert(waiting === 0, `a photo no stop holds counts as waiting (${waiting})`)
  }
  finally {
    await H.ctx.close()
  }
})

await step('D44 a photo still downloading from one account when another signs in never lands on the device', async () => {
  const M = await device('M')
  try {
    await signIn(M, 'gina')
    await until(M, ([id, st, ph]) => (window.__travelsTest.progress.value[id]?.feedback?.[st]?.photos ?? []).includes(ph), [TRIP, STOP, ginaPhoto])
    // A slow connection: gina's photo takes 4 s to arrive.
    await M.ctx.route(u => u.href.includes(':9199') && u.href.includes(ginaPhoto), async (route) => {
      await new Promise(r => setTimeout(r, 4000))
      await route.continue().catch(() => {})
    })
    await run(M, (id) => {
      window.__got = window.__travelsTest.photos.url(id)
    }, ginaPhoto)
    await M.page.waitForTimeout(400)
    assert(await run(M, () => window.__travelsTest.cloud.signOut({ force: true })) === 'done', 'gina could not sign out')
    await signIn(M, 'lena')
    const got = await run(M, () => window.__got)
    assert(!got, `the photo was shown under lena: ${got}`)
    await M.page.waitForTimeout(1500)
    assert(!(await devicePhotos(M))?.includes(ginaPhoto), 'gina\'s photo is on the device under lena')
    await run(M, () => window.__travelsTest.cloud.backupPhotos())
    await M.page.waitForTimeout(1500)
    assert(!(await cloudPhotos(await uidOf(M))).length, 'lena\'s account got a photo')
  }
  finally {
    await M.ctx.close()
  }
})

await step('D44 a photo being saved when another account signs in is dropped: it stays off the device and out of that account', async () => {
  const L = await device('L', {}, [() => {
    const orig = window.createImageBitmap
    window.createImageBitmap = async (...a) => {
      if (window.__slowShrink) await new Promise(r => setTimeout(r, window.__slowShrink))
      return orig.apply(window, a)
    }
  }])
  try {
    await signIn(L, 'jack')
    await run(L, () => window.__travelsTest.addSample())
    await settle(L)
    await run(L, async () => {
      window.__slowShrink = 2500
      const c = document.createElement('canvas')
      c.width = 64
      c.height = 48
      c.getContext('2d').fillRect(0, 0, 64, 48)
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9))
      window.__adding = window.__travelsTest.photos.add(blob).then(id => ({ id }), e => ({ error: String(e?.message ?? e) }))
    })
    await L.page.waitForTimeout(300)
    await signIn(L, 'kate')
    const out = await run(L, () => window.__adding)
    assert(out?.error, `the photo was saved under kate: ${JSON.stringify(out)}`)
    await L.page.waitForTimeout(2500)
    assert(!(await devicePhotos(L))?.length, `photos on the device under kate: ${await devicePhotos(L)}`)
    assert(!(await cloudPhotos(await uidOf(L))).length, 'kate\'s account got a photo')
  }
  finally {
    await L.ctx.close()
  }
})

await step('D44 "Sign out and remove from this device" when the photo store refuses to clear: the account stays remembered (signed out) until its photos are gone, and the next account never gets them', async () => {
  const K = await device('K', {}, [() => {
    const orig = IDBObjectStore.prototype.clear
    IDBObjectStore.prototype.clear = function (...a) {
      if (window.__failClear) {
        window.__failClear = false
        throw new DOMException('Connection to Indexed Database server lost. Refresh the page to try again', 'UnknownError')
      }
      return orig.apply(this, a)
    }
  }])
  try {
    await signIn(K, 'hank')
    await run(K, () => window.__travelsTest.addSample())
    const photo = await addPhoto(K)
    await edit(K, `P.feedback['${STOP}'] = { rating: 4, photos: ['${photo}'], updatedAt: new Date().toISOString() }`)
    await settle(K)
    await until(K, () => window.__travelsTest.cloud.photosWaiting.value === 0 && window.__travelsTest.cloud.pending.value === 0, null, 30000)
    await run(K, () => {
      window.__failClear = true
    })
    await run(K, () => window.__travelsTest.cloud.forget())
    await until(K, () => location.pathname === '/' && !window.__travelsTest.cloud.account.value)
    const kept = await run(K, () => JSON.parse(localStorage.getItem('travel:account:v1') || 'null'))
    assert(kept?.email === email('hank') && kept.out === true, `remembered after the failed removal: ${JSON.stringify(kept)}`)
    assert((await devicePhotos(K))?.includes(photo), 'the test did not keep the photo on the device')
    await signIn(K, 'ivy')
    await K.page.waitForTimeout(2500)
    assert(!(await devicePhotos(K))?.includes(photo), 'hank\'s photo is still on the device under ivy')
    assert(!(await cloudPhotos(await uidOf(K))).length, 'ivy\'s account got hank\'s photo')
  }
  finally {
    await K.ctx.close()
  }
})

// ---------- W3: the sign-in method on the app's own address ----------
/**
 * A browser context whose requests to the app's own address are answered by this build, so the app runs there. Its
 * Firebase sign-in calls are stood in for (standIn): each call is noted as made inside the tap or later, after
 * something was awaited; for the pop-up, `popup` says how it ends.
 */
async function ownAddress(name, opts) {
  const ctx = await browser.newContext({ timezoneId: 'Europe/Rome', serviceWorkers: 'block', ...opts })
  await ctx.route(`${OWN}**`, async (route) => {
    const { body, type } = await builtFile(new URL(route.request().url()).pathname)
    await route.fulfill({ status: 200, contentType: type, body })
  })
  const page = await ctx.newPage()
  page.on('pageerror', e => problems.push(`[${name}] page error: ${e.message}`))
  await page.goto(OWN)
  await page.waitForFunction(() => !!window.__travelsTest)
  return { name, ctx, page }
}

async function standIn(d, popup) {
  await run(d, async (outcome) => {
    const fb = await window.__travelsTest.cloud.testFirebase()
    window.__calls = []
    fb.signInPopup = () => {
      window.__calls.push(`popup:${window.__inTap ? 'tap' : 'later'}`)
      return outcome === 'blocked' ? Promise.reject(Object.assign(new Error('blocked'), { code: 'auth/popup-blocked' })) : new Promise(() => {})
    }
    fb.signInRedirect = () => {
      window.__calls.push(`redirect:${window.__inTap ? 'tap' : 'later'}`)
      return new Promise(() => {})
    }
  }, popup)
}

/**
 * Taps the landing page's first Sign in with Google button and gives back the sign-in calls made. The tap is a click
 * dispatched inside one script, flagged while it runs: nothing awaited can run before the flag is down again (promise
 * callbacks wait for the script to end), so a call that sees the flag was made straight from the tap.
 */
async function tapSignIn(d) {
  const button = () => [...document.querySelectorAll('button')].find(b => /Sign in with Google/.test(b.textContent ?? ''))
  await d.page.waitForFunction(`(${button})() && !(${button})().disabled`, null, { timeout: 10000 })
  await run(d, `(() => { const b = (${button})(); window.__inTap = true; try { b.click() } finally { window.__inTap = false } })()`)
  await d.page.waitForTimeout(600)
  return run(d, () => window.__calls)
}

await step('W3 on the app\'s own address a desktop browser opens the pop-up inside the tap, and a blocked pop-up goes to Google\'s page', async () => {
  const D = await ownAddress('desktop', { viewport: { width: 1280, height: 800 } })
  try {
    assert(await run(D, () => location.hostname) === new URL(OWN).hostname, 'not on the app\'s own address')
    await standIn(D, 'open')
    const calls = await tapSignIn(D)
    assert(JSON.stringify(calls) === '["popup:tap"]', `calls: ${JSON.stringify(calls)}`)
    await D.page.reload()
    await D.page.waitForFunction(() => !!window.__travelsTest)
    await standIn(D, 'blocked')
    const blocked = await tapSignIn(D)
    assert(JSON.stringify(blocked) === '["popup:tap","redirect:later"]', `calls when blocked: ${JSON.stringify(blocked)}`)
  }
  finally {
    await D.ctx.close()
  }
})

await step('W3 on the app\'s own address a phone goes to Google\'s page, never a pop-up; elsewhere a phone gets the pop-up as before', async () => {
  const P = await ownAddress('phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  try {
    await standIn(P, 'open')
    const calls = await tapSignIn(P)
    assert(JSON.stringify(calls) === '["redirect:later"]', `calls: ${JSON.stringify(calls)}`)
  }
  finally {
    await P.ctx.close()
  }
  const ctx = await browser.newContext({ timezoneId: 'Europe/Rome', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  try {
    const page = await ctx.newPage()
    page.on('pageerror', e => problems.push(`[local phone] page error: ${e.message}`))
    await page.goto(BASE)
    await page.waitForFunction(() => !!window.__travelsTest)
    const Q = { name: 'local phone', ctx, page }
    await standIn(Q, 'open')
    const calls = await tapSignIn(Q)
    assert(JSON.stringify(calls) === '["popup:tap"]', `calls on another address: ${JSON.stringify(calls)}`)
  }
  finally {
    await ctx.close()
  }
})

/** Safari on an iPhone (Firebase itself decides by the user agent what to load ahead). */
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'

await step('W2 on the app\'s own address an iPhone\'s landing page asks no other address before the tap; the tap loads sign-in and goes to Google\'s page (never a pop-up), the button busy all the way', async () => {
  const ctx = await browser.newContext({ timezoneId: 'Europe/Rome', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: IPHONE })
  try {
    await ctx.route(`${OWN}**`, async (route) => {
      const { body, type } = await builtFile(new URL(route.request().url()).pathname)
      await route.fulfill({ status: 200, contentType: type, body })
    })
    const away = []
    ctx.on('request', (r) => {
      const url = r.url()
      if (!url.startsWith(OWN) && !url.startsWith('data:') && !url.startsWith('blob:')) away.push(url)
    })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(OWN)
    await page.locator('main.landing').waitFor({ timeout: 15000 })
    await page.waitForTimeout(2000)
    assert(!away.length, `asked before the tap: ${away.join(', ')}`)
    assert(!errors.length, `page errors: ${errors.join(' / ')}`)
    // Every change of the cover's button from the tap on (it must stay "Signing in…" until Google's page opens).
    const states = []
    await page.exposeBinding('__buttonState', (_source, s) => {
      states.push(s)
    })
    await page.evaluate(() => {
      const b = document.querySelector('.cover button')
      const note = () => window.__buttonState(`${b.disabled ? 'disabled' : 'enabled'}: ${b.textContent.trim()}`)
      new MutationObserver(note).observe(b, { attributes: true, childList: true, subtree: true, characterData: true })
    })
    let popups = 0
    ctx.on('page', () => popups++)
    await page.locator('.cover').getByRole('button', { name: 'Sign in with Google' }).click()
    // The Auth emulator's page stands in for Google's.
    await page.waitForURL(u => u.href.startsWith('http://127.0.0.1:9099/emulator/auth/handler'), { timeout: 20000 })
    assert(!popups, 'a pop-up opened')
    const busy = states.findIndex(s => s.startsWith('disabled'))
    assert(busy >= 0 && !states.slice(busy).some(s => s.startsWith('enabled')), `the button between the tap and Google's page: ${states.join(' > ') || 'never changed'}`)
  }
  finally {
    await ctx.close()
  }
})

/**
 * An iPhone at the app's own address (answered by this build), noting every request that goes anywhere else. On the
 * real address Firebase's sign-in frame is on that same address; here it comes from the Auth emulator on 127.0.0.1,
 * which Chromium's local network checks block from a public address: `on` is a browser without them, where the frame
 * answers as it does for real (the shared browser keeps them, which stalls Firebase's check of a return from Google).
 */
async function iphone(name, storage = {}, on = browser) {
  const ctx = await on.newContext({ timezoneId: 'Europe/Rome', serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: IPHONE })
  await ctx.route(`${OWN}**`, async (route) => {
    const { body, type } = await builtFile(new URL(route.request().url()).pathname)
    await route.fulfill({ status: 200, contentType: type, body })
  })
  const away = []
  ctx.on('request', (r) => {
    const url = r.url()
    if (!url.startsWith(OWN) && !url.startsWith('data:') && !url.startsWith('blob:')) away.push(url)
  })
  if (Object.keys(storage).length) await ctx.addInitScript(s => Object.entries(s).forEach(([k, v]) => localStorage.getItem(k) === null && localStorage.setItem(k, v)), storage)
  const page = await ctx.newPage()
  page.on('pageerror', e => problems.push(`[${name}] page error: ${e.message}`))
  return { name, ctx, page, away }
}
/** The cover's sign-in button: "enabled: Sign in with Google" or "disabled: Signing in…". */
const coverButton = page => page.evaluate(() => {
  const b = document.querySelector('.cover button')
  return b ? `${b.disabled ? 'disabled' : 'enabled'}: ${b.textContent.trim()}` : 'none'
})

/** Taps the cover's Sign in with Google on `d` (an iphone()), waits for Google's page (the Auth emulator's), and comes Back. */
async function backFromGoogle(d) {
  await d.page.goto(OWN)
  await d.page.locator('main.landing').waitFor({ timeout: 15000 })
  await d.page.locator('.cover').getByRole('button', { name: 'Sign in with Google' }).click()
  await d.page.waitForURL(u => u.href.startsWith('http://127.0.0.1:9099/emulator/auth/handler'), { timeout: 20000 })
  await d.page.goBack()
  await d.page.locator('main.landing').waitFor({ timeout: 15000 })
}

await step('D31 Back from Google\'s page on a phone: the button comes back, and the next start loads nothing and asks no other address (a sign-in that never finished leaves nothing on)', async () => {
  const free = await chromium.launch({ args: ['--disable-features=LocalNetworkAccessChecks'] })
  try {
    const P = await iphone('back', {}, free)
    await backFromGoogle(P)
    const t0 = Date.now()
    await poll('the button back', async () => (await coverButton(P.page)) === 'enabled: Sign in with Google', 30000)
    assert(Date.now() - t0 < 8000, `the button came back after ${Date.now() - t0} ms`)
    await poll('Firebase off for the next start', () => P.page.evaluate(() => localStorage.getItem('travel:cloud:on') === 'false'), 10000)
    // The next open of the landing page (a new tab, the next day).
    const next = await P.ctx.newPage()
    P.away.length = 0
    const states = new Set()
    await next.goto(OWN)
    await next.locator('main.landing').waitFor({ timeout: 15000 })
    for (let i = 0; i < 10; i++) {
      states.add(await coverButton(next))
      await next.waitForTimeout(150)
    }
    await next.waitForTimeout(1500)
    assert(!P.away.length, `the next start asked: ${P.away.join(', ')}`)
    assert(JSON.stringify([...states]) === '["enabled: Sign in with Google"]', `the next start's button: ${[...states].join(' > ')}`)
  }
  finally {
    await free.close()
  }
  // Firebase's check of the return never answers (a stalled network; here, the blocked frame): the buttons still come back.
  const S = await iphone('stalled')
  try {
    await backFromGoogle(S)
    await poll('the button back on a stalled network', async () => (await coverButton(S.page)) === 'enabled: Sign in with Google', 25000)
    assert(await S.page.evaluate(() => localStorage.getItem('travel:cloud:on')) === 'false', 'Firebase stays on for the next start')
  }
  finally {
    await S.ctx.close()
  }
  // A device where an earlier version left that flag on: the same.
  const Q = await iphone('flag left on', { 'travel:cloud:on': 'true' })
  try {
    await Q.page.goto(OWN)
    await Q.page.locator('main.landing').waitFor({ timeout: 15000 })
    await Q.page.waitForTimeout(2000)
    assert(!Q.away.length, `asked before the tap: ${Q.away.join(', ')}`)
    assert(await coverButton(Q.page) === 'enabled: Sign in with Google', `button: ${await coverButton(Q.page)}`)
    assert(await Q.page.evaluate(() => localStorage.getItem('travel:cloud:on')) === 'false', 'the flag stays on')
  }
  finally {
    await Q.ctx.close()
  }
})

await step('D31 back on the landing page from the browser\'s back-forward cache after leaving for Google\'s page: the sign-in buttons work again', async () => {
  const P = await ownAddress('bfcache', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  try {
    await standIn(P, 'open')
    const calls = await tapSignIn(P)
    assert(JSON.stringify(calls) === '["redirect:later"]', `calls: ${JSON.stringify(calls)}`)
    assert(await coverButton(P.page) === 'disabled: Signing in…', `leaving for Google's page: ${await coverButton(P.page)}`)
    // The browser shows the page it kept, as it was when it left.
    await run(P, () => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })))
    await poll('the button back', async () => (await coverButton(P.page)) === 'enabled: Sign in with Google', 5000)
    assert(await run(P, () => localStorage.getItem('travel:cloud:on')) === 'false', 'Firebase stays on for the next start')
  }
  finally {
    await P.ctx.close()
  }
})

await browser.close()
server.close()
console.log(`\n${passed} passed, ${problems.length} problem(s)`)
for (const p of problems) console.log(`  - ${p}`)
process.exit(problems.length ? 1 : 0)
