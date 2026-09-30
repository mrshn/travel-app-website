// End-to-end check of sign-in and sync against the Firebase emulators, with two browsers
// playing two devices. Run by .github/workflows/cloud-tests.yml:
//   NUXT_PUBLIC_FIREBASE_EMULATORS=127.0.0.1 npm run generate
//   npx firebase-tools emulators:exec --only auth,firestore,storage --project demo-travels "node tests/e2e/cloud.e2e.mjs"
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { chromium } from 'playwright'

const ROOT = '.output/public'
const PORT = 4173
const BASE = `http://127.0.0.1:${PORT}/`
const TRIP = 'rome-2026-10'
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, BASE).pathname))
  let file = join(ROOT, path)
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
  }
  catch {
    file = join(ROOT, 'index.html')
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  }
  catch {
    res.writeHead(200, { 'content-type': TYPES['.html'] })
    res.end(await readFile(join(ROOT, 'index.html')))
  }
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

async function device(name) {
  const ctx = await browser.newContext({ timezoneId: 'Europe/Rome', serviceWorkers: 'block' })
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

async function signIn(d, sub) {
  await run(d, s => window.__travelsTest.cloud.testSignIn(s, `${s}@example.com`), sub)
  await until(d, () => ['synced', 'not-owner'].includes(window.__travelsTest.cloud.status.value))
}

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
    const state = await Promise.all([A, B].filter(Boolean).map(d => run(d, () => { const c = window.__travelsTest.cloud; return `${c.status.value} ${c.message.value}` }).then(x => `${d.name}: ${x}`, () => `${d.name}: ?`)))
    annotate('error', `✗ ${title}`, `${e.message.split('\n').slice(0, 6).join('\n')}\n\nstatus: ${state.join(' | ')}\n\nlogs:\n${logs.slice(-25).join('\n')}`)
  }
}

const progressOf = (d, id = TRIP) => run(d, i => JSON.parse(JSON.stringify(window.__travelsTest.progress.value[i] ?? null)), id)
const edit = (d, body) => run(d, `(() => { const T = window.__travelsTest; const P = (T.progress.value['${TRIP}'] ??= { stops: {}, feedback: {}, choices: {}, bookings: {}, packing: {}, dayNotes: {} }); ${body} })()`)

let A, B
A = await device('A')
B = await device('B')
let ownerUid = ''

await step('A signs in and becomes the owner', async () => {
  await signIn(A, 'owner')
  ownerUid = await run(A, () => window.__travelsTest.cloud.user.value.uid)
  const s = await run(A, () => window.__travelsTest.cloud.status.value)
  if (s !== 'synced') throw new Error(`status ${s}`)
})

await step('A\'s changes reach B when B signs in (and B\'s fresh copy doesn\'t overwrite them)', async () => {
  await edit(A, `P.bookings['hostel'] = true; const t = T.trips.value.find(x => x.id === '${TRIP}'); t.title = 'Rome (edited on A)'; t.edited = true; t.updatedAt = new Date().toISOString()`)
  await settle(A)
  await signIn(B, 'owner')
  await until(B, id => window.__travelsTest.trips.value.find(t => t.id === id)?.title === 'Rome (edited on A)', TRIP)
  const p = await progressOf(B)
  if (!p?.bookings?.hostel) throw new Error('booking missing on B')
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

await step('deleting the trip on A removes it on B', async () => {
  await run(A, id => { window.__travelsTest.trips.value = window.__travelsTest.trips.value.filter(t => t.id !== id) }, TRIP)
  await settle(A)
  await until(B, id => !window.__travelsTest.trips.value.some(t => t.id === id), TRIP)
})

await step('another Google account can\'t use the app or read the owner\'s data', async () => {
  const C = await device('C')
  await signIn(C, 'stranger')
  const s = await run(C, () => window.__travelsTest.cloud.status.value)
  if (s !== 'not-owner') throw new Error(`status ${s}`)
  const denied = await run(C, uid => window.__travelsTest.cloud.testPeek(uid).then(() => false, e => String(e.code ?? e).includes('permission-denied')), ownerUid)
  if (!denied) throw new Error('the rules let a stranger read the owner\'s items')
  await C.ctx.close()
})

await browser.close()
server.close()
console.log(`\n${passed} passed, ${problems.length} problem(s)`)
for (const p of problems) console.log(`  - ${p}`)
process.exit(problems.length ? 1 : 0)
