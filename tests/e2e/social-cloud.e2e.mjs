// End-to-end check of the social layer against the Firebase emulators: the Firestore backend
// (app/lib/social/firestore.ts) and the security rules (firebase/firestore.rules, storage.rules), with three accounts
// on three browsers. Run by .github/workflows/cloud-tests.yml:
//   NUXT_PUBLIC_FIREBASE_EMULATORS=127.0.0.1 npm run generate
//   npx firebase-tools emulators:exec --only auth,firestore,storage --project demo-travels "node tests/e2e/social-cloud.e2e.mjs"
//
// alice, bob and carol are made-up Google accounts (the Auth emulator). Each browser drives the app's own social
// backend (window.__travelsTest.social.backend.value) and group trip engine (window.__travelsTest.groups); a fourth
// browser with no account reads links. The rules are also asked directly, through the emulators' REST APIs with each
// account's ID token, and the cloud is read past the rules with the emulator's owner token, to check what it holds.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { chromium } from 'playwright'
import { loadTrip } from './lib.mjs'

const ROOT = '.output/public'
const PORT = 4174
const BASE = `http://127.0.0.1:${PORT}/`
const PROJECT = 'demo-travels'
const BUCKET = 'demo-travels.appspot.com'
const TRIP = 'rome-sample'
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
const STORAGE = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'
const DOCS = `http://${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }

// The Rome sample's stops these checks touch: two on different days, an option stop and a sight.
const plan = loadTrip()
const STOP_A = plan.days[0].stops[0].id
const STOP_B = plan.days[1].stops[0].id
const PICK = plan.days[1].stops.find(s => s.options)?.id ?? 'pick-frinight'
const CHOICES = plan.days[1].stops.find(s => s.options)?.options.choices.map(c => c.id) ?? ['crawl', 'italian', 'hostel']
const SIGHT = plan.days[1].stops.find(s => s.kind === 'sight')?.id ?? plan.days[1].stops[1].id

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
const devices = []

// On GitHub, results also go out as annotations (readable from the API without the full log).
const esc = s => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
const escProp = s => esc(s).replace(/:/g, '%3A').replace(/,/g, '%2C')
function annotate(level, title, msg) {
  if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=${escProp(title)}::${esc(msg)}`)
}

function assert(cond, message) {
  if (!cond) throw new Error(message)
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
    const msg = String(e?.message ?? e)
    problems.push(`${title}: ${msg.split('\n')[0]}`)
    console.log(`✗ ${title}\n   ${msg.split('\n').join('\n   ')}`)
    const state = await Promise.all(devices.map(d => run(d, () => {
      const T = window.__travelsTest
      return `${T.cloud.user.value?.email ?? 'nobody'}, cloud ${T.cloud.status.value}, social ${T.social.state.value}${T.social.error.value ? ` (${T.social.error.value})` : ''}`
    }).then(x => `${d.name}: ${x}`, () => `${d.name}: ?`)))
    annotate('error', `✗ ${title}`, `${msg.split('\n').slice(0, 30).join('\n')}\n\ndevices: ${state.join(' | ')}\n\nlogs:\n${logs.slice(-15).join('\n')}`)
  }
}

/** Polls `fn` (in Node) until it gives something truthy; throws `what` with the last value after `timeout`. */
async function poll(what, fn, timeout = 20000, describe = null) {
  let last
  for (const end = Date.now() + timeout; Date.now() < end; await new Promise(r => setTimeout(r, 250))) {
    last = await fn()
    if (last) return last
  }
  const now = describe ? await describe().catch(e => `? ${e.message}`) : last
  throw new Error(`waited for ${what} (now: ${JSON.stringify(now)?.slice(0, 400)})`)
}

// ---------- browsers ----------

/** A browser of its own, opened at "/". `pub`: it has no account and reads links only (social.publicApi()). */
async function device(name, pub = false) {
  const ctx = await browser.newContext({ timezoneId: 'Europe/Rome', serviceWorkers: 'block' })
  const page = await ctx.newPage()
  page.on('pageerror', e => problems.push(`[${name}] page error: ${e.message}`))
  page.on('console', (m) => {
    const text = m.text()
    if (text.includes('[social]') || text.includes('[groups]') || text.includes('[cloud]') || m.type() === 'error') {
      logs.push(`[${name}] ${m.type()}: ${text.slice(0, 300)}`)
      console.log(`   [${name}] ${text.slice(0, 300)}`)
    }
  })
  await page.goto(BASE)
  await page.waitForFunction(() => !!window.__travelsTest?.social)
  const d = { name, ctx, page, pub }
  devices.push(d)
  return d
}

const run = (d, fn, arg) => d.page.evaluate(fn, arg)
const email = sub => `${sub}@example.com`

/** Signs `d` in as the made-up Google account `sub`, and waits until the social layer is ready for it. */
async function signIn(d, sub) {
  await run(d, ([s, e]) => window.__travelsTest.cloud.testSignIn(s, e), [sub, email(sub)])
  await d.page.waitForFunction(e => window.__travelsTest.cloud.user.value?.email === e && window.__travelsTest.social.state.value === 'ready', email(sub), { timeout: 30000, polling: 200 })
  return run(d, () => window.__travelsTest.cloud.user.value.uid)
}

/**
 * Calls the social backend on `d` (the account's own, or for a browser with no account the one for links):
 * { ok: true, value } or { ok: false, code, message }.
 */
const call = (d, method, ...args) => run(d, async ([m, a, pub]) => {
  try {
    const S = window.__travelsTest.social
    const api = pub ? await S.publicApi() : S.backend.value
    const v = await api[m](...a)
    return { ok: true, value: v === undefined ? null : JSON.parse(JSON.stringify(v)) }
  }
  catch (e) {
    return { ok: false, code: e?.code ?? 'thrown', message: String(e?.message ?? e) }
  }
}, [method, args, d.pub])

/** The backend call's result; a failure names the call. */
async function must(d, method, ...args) {
  const r = await call(d, method, ...args)
  if (!r.ok) throw new Error(`${d.name}: ${method}(${JSON.stringify(args).slice(1, -1).slice(0, 120)}) failed with '${r.code}' (${r.message.slice(0, 200)})`)
  return r.value
}

/** The backend call must be refused with SocialError `code`. */
async function refused(d, code, method, ...args) {
  const r = await call(d, method, ...args)
  const got = r.ok ? `it worked (${JSON.stringify(r.value)?.slice(0, 120)})` : `'${r.code}' (${r.message.slice(0, 160)})`
  assert(!r.ok && r.code === code, `${d.name}: ${method}(${JSON.stringify(args).slice(1, -1).slice(0, 120)}) should be refused with '${code}', got ${got}`)
}

/**
 * Starts a live read of the backend on `d` (a watch method), kept in the page under `key`: how many times it called
 * back, the last value (several arguments come as a list) and its error code. Starting it again replaces it.
 */
async function watch(d, key, method, ...args) {
  await run(d, async ([k, m, a, pub]) => {
    const all = (window.__watch ??= {})
    all[k]?.stop?.()
    const w = { calls: 0, last: undefined, error: null, stop: null }
    all[k] = w
    const S = window.__travelsTest.social
    const api = pub ? await S.publicApi() : S.backend.value
    w.stop = api[m](...a, (...v) => {
      w.calls++
      w.last = JSON.parse(JSON.stringify(v.length > 1 ? v : (v[0] ?? null)))
    }, (e) => {
      w.error = e?.code ?? String(e)
    })
  }, [key, method, args, d.pub])
}
const watched = (d, key) => run(d, (k) => {
  const w = window.__watch?.[k]
  return w ? { calls: w.calls, last: w.last ?? null, error: w.error } : null
}, key)

/** Waits until the live read `key` on `d` gives what `test` likes ({ calls, last, error }). */
const seen = (d, key, test, what, timeout = 20000) => poll(`${d.name} ${what}`, async () => {
  const w = await watched(d, key)
  return w && test(w) ? w : null
}, timeout, () => watched(d, key))

// What the app on a browser holds (its own live lists).
const friendshipsOf = d => run(d, () => JSON.parse(JSON.stringify(window.__travelsTest.social.friendships.value)))
const requestsOf = d => run(d, () => JSON.parse(JSON.stringify({ incoming: window.__travelsTest.social.incoming.value, outgoing: window.__travelsTest.social.outgoing.value })))
const inboxOf = d => run(d, () => JSON.parse(JSON.stringify(window.__travelsTest.social.inbox.value)))
/** The trip on `d` with id `id`: its id, title, group, and the titles of two stops. */
const tripOn = (d, id) => run(d, ([i, a, b]) => {
  const t = window.__travelsTest.trips.value.find(x => x.id === i || x.group?.id === i)
  if (!t) return null
  const title = (day, stop) => t.days[day]?.stops.find(s => s.id === stop)?.title ?? null
  return { id: t.id, title: t.title, group: t.group ? { ...t.group } : null, a: title(0, a), b: title(1, b) }
}, [id, STOP_A, STOP_B])

const pairOf = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`)
const token22 = () => Array.from({ length: 22 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 56)]).join('')

// ---------- the cloud, asked directly ----------

/** A value in the REST API's form. */
function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } }
  return { mapValue: { fields: toFields(v) } }
}
const toFields = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, toValue(v)]))

/** A value back from the REST API's form. */
function fromValue(v) {
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('stringValue' in v) return v.stringValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fromValue)
  if ('mapValue' in v) return fromFields(v.mapValue.fields ?? {})
  return v
}
const fromFields = f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, fromValue(v)]))

/** A field path for the REST API, its parts quoted where they need it (uids may start with a digit). */
const fieldPath = (...parts) => parts.map(p => (/^[A-Za-z_]\w*$/.test(p) ? p : `\`${p.replace(/[`\\]/g, m => `\\${m}`)}\``)).join('.')

/**
 * One request to Firestore's REST API as an account (its ID token), past the rules ('owner') or as nobody (null).
 * `data` is a document (or the fields of `mask` to set; a masked field not in `data` is removed), `exists` a
 * precondition. Resolves to the HTTP status (403: the rules said no) and the body.
 */
async function rest(token, method, path, { data, mask, exists } = {}) {
  const params = new URLSearchParams()
  for (const f of mask ?? []) params.append('updateMask.fieldPaths', f)
  if (exists !== undefined) params.set('currentDocument.exists', String(exists))
  const q = params.toString()
  // A write that only removes masked fields still sends a document (an empty one).
  const body = data || mask ? JSON.stringify({ fields: toFields(data ?? {}) }) : undefined
  const r = await fetch(`${DOCS}/${path}${q ? `?${q}` : ''}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body,
  })
  return { status: r.status, body: await r.text() }
}

/** A document as the cloud holds it (read past the rules), or null. */
async function cloudDoc(path) {
  const r = await rest('owner', 'GET', path)
  if (r.status === 404) return null
  assert(r.status === 200, `reading ${path} past the rules: HTTP ${r.status} ${r.body.slice(0, 200)}`)
  return fromFields(JSON.parse(r.body).fields ?? {})
}

/** The ids of a collection's documents (read past the rules). */
async function cloudIds(path) {
  const out = []
  let next = ''
  do {
    const r = await rest('owner', 'GET', `${path}?pageSize=300${next ? `&pageToken=${next}` : ''}`)
    assert(r.status === 200, `listing ${path} past the rules: HTTP ${r.status}`)
    const j = JSON.parse(r.body)
    for (const doc of j.documents ?? []) out.push(doc.name.split('/').pop())
    next = j.nextPageToken ?? ''
  } while (next)
  return out
}

/** The ID token Firebase sends for the account signed in on `d`. */
const tokenOf = d => run(d, async () => (await (await window.__travelsTest.cloud.testFirebase()).auth.currentUser?.getIdToken()) ?? null)

/** An upload to the Storage emulator as the SDK makes one (multipart), with an account's ID token: the HTTP status. */
async function upload(token, path, contentType, bytes) {
  const boundary = `travels${Date.now()}`
  const meta = JSON.stringify({ name: path, contentType })
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
    Buffer.from(bytes),
    Buffer.from(`\r\n--${boundary}--`),
  ])
  const r = await fetch(`http://${STORAGE}/v0/b/${BUCKET}/o?name=${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Protocol': 'multipart', 'Content-Type': `multipart/related; boundary=${boundary}`, ...(token ? { Authorization: `Firebase ${token}` } : {}) },
    body,
  })
  await r.arrayBuffer()
  return r.status
}

/** Reads a file's details from the Storage emulator with an account's ID token (or none): the HTTP status. */
async function storageMeta(token, path) {
  const r = await fetch(`http://${STORAGE}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}`, { headers: token ? { Authorization: `Firebase ${token}` } : {} })
  await r.arrayBuffer()
  return r.status
}

// ---------- the checks ----------

let A, B, C, D
let alice = ''
let bob = ''
let carol = ''
/** Each account's name as the app shows it (the Auth emulator's accounts have none: the app uses the email's). */
const names = {}

await step('the security rules compile on the emulators (every issue listed with its line)', async () => {
  const firestore = await readFile('firebase/firestore.rules', 'utf8')
  const r = await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: firestore }] } }),
  })
  const text = await r.text()
  let body = null
  try {
    body = JSON.parse(text)
  }
  catch { /* not JSON: shown as it is */ }
  const issues = (body?.issues ?? []).map(i => ({
    severity: String(i.severity ?? ''),
    line: `firestore.rules line ${i.sourcePosition?.line ?? '?'}:${i.sourcePosition?.column ?? '?'}: ${i.description ?? JSON.stringify(i)}`,
  }))
  for (const i of issues.filter(x => !/error/i.test(x.severity))) annotate('warning', 'firestore.rules', i.line)
  const errors = issues.filter(x => /error/i.test(x.severity)).map(x => x.line)
  assert(r.ok && !errors.length, `the Firestore emulator refused the rules (HTTP ${r.status}):\n${errors.join('\n') || text.slice(0, 1500)}`)
  const storage = await readFile('firebase/storage.rules', 'utf8')
  const s = await fetch(`http://${STORAGE}/internal/setRules`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rules: { files: [{ name: 'storage.rules', content: storage }] } }),
  })
  const sText = await s.text()
  // 400 is the emulator saying the rules don't compile; anything else unexpected leaves them to the photo step.
  assert(s.status !== 400, `the Storage emulator refused the rules:\n${sText.slice(0, 1500)}`)
  if (!s.ok) annotate('warning', 'storage.rules', `loading the rules into the Storage emulator: HTTP ${s.status} (the photo step checks them)`)
  // Loaded: a link anyone may read is readable signed out (a missing one is "not found", not "refused").
  const open = await rest(null, 'GET', `invites/${token22()}`)
  assert(open.status === 404, `reading a missing invite signed out: HTTP ${open.status} (403 means the rules didn't load)`)
})

await step('three accounts sign in on three browsers, and the social layer gets ready on each (with a profile)', async () => {
  const browsers = await Promise.all([device('alice'), device('bob'), device('carol')])
  A = browsers[0]
  B = browsers[1]
  C = browsers[2]
  const uids = await Promise.all([signIn(A, 'alice'), signIn(B, 'bob'), signIn(C, 'carol')])
  alice = uids[0]
  bob = uids[1]
  carol = uids[2]
  assert(alice && bob && carol && new Set([alice, bob, carol]).size === 3, `uids: ${alice}, ${bob}, ${carol}`)
  for (const [d, uid] of [[A, alice], [B, bob], [C, carol]]) {
    names[d.name] = await run(d, () => window.__travelsTest.social.me.value?.name ?? '')
    const p = await poll(`${d.name}'s profile`, async () => (await call(d, 'getProfile', uid)).value)
    assert(p.uid === uid && p.name && p.name === names[d.name], `${d.name}'s profile: ${JSON.stringify(p)}, the app's name ${names[d.name]}`)
  }
})

await step('profiles and handles: claimed, taken, malformed, found, changed (the old one is free again) and removed', async () => {
  assert(await must(A, 'claimHandle', 'Alice.E2E') === 'ok', 'alice could not claim alice.e2e')
  assert(await must(B, 'claimHandle', '@alice.e2e') === 'taken', 'bob took alice\'s handle')
  assert(await must(B, 'claimHandle', 'no spaces here') === 'invalid', 'a malformed handle was not invalid')
  assert(await must(B, 'claimHandle', 'bob_e2e') === 'ok', 'bob could not claim bob_e2e')
  const found = await must(C, 'findHandle', '@Alice.E2E')
  assert(found?.uid === alice && found.handle === 'alice.e2e', `carol found ${JSON.stringify(found)}`)
  assert(await must(A, 'claimHandle', 'alice.travels') === 'ok', 'alice could not change her handle')
  assert(await must(C, 'findHandle', 'alice.e2e') === null, 'alice\'s old handle still finds her')
  assert((await must(C, 'findHandle', 'alice.travels'))?.uid === alice, 'alice\'s new handle doesn\'t find her')
  assert(!(await cloudDoc('handles/alice.e2e')), 'the old handle is still held')
  assert(await must(B, 'claimHandle', null) === 'ok' && await must(C, 'findHandle', 'bob_e2e') === null, 'bob\'s handle wasn\'t removed')
  assert(await must(C, 'claimHandle', 'bob_e2e') === 'ok', 'a removed handle can\'t be claimed by someone else')
  const p = await must(A, 'saveProfile', { bio: 'Rome in October', homeCity: 'Istanbul' })
  assert(p.handle === 'alice.travels' && p.bio === 'Rome in October' && p.homeCity === 'Istanbul', `alice saved ${JSON.stringify(p)}`)
  assert((await must(B, 'getProfile', alice))?.homeCity === 'Istanbul', 'bob doesn\'t see alice\'s home city')
  await refused(A, 'invalid', 'saveProfile', { bio: 'x'.repeat(161) })
  assert(await must(B, 'getProfile', 'no-such-account') === null, 'a missing profile isn\'t null')
})

let friendToken = ''
await step('friends by link: bob adds alice with her link, both see it live; carol can\'t read alice\'s card; a reset link fails', async () => {
  const inv = await must(A, 'createInvite', { kind: 'friend' })
  friendToken = inv.token
  const read = await must(B, 'getInvite', inv.token)
  assert(read?.kind === 'friend' && read.from === alice && !read.revoked, `bob read ${JSON.stringify(read)}`)
  await refused(A, 'invalid', 'addFriendByInvite', inv.token)
  const f = await must(B, 'addFriendByInvite', inv.token)
  assert(f.id === pairOf(alice, bob) && f.via === inv.token && f.members.join('_') === f.id, `the friendship: ${JSON.stringify(f)}`)
  for (const d of [A, B]) await poll(`${d.name} to see the friendship`, async () => (await friendshipsOf(d)).some(x => x.id === f.id))
  const again = await must(B, 'addFriendByInvite', inv.token)
  assert(again.id === f.id && again.createdAt === f.createdAt, 'adding again made another friendship')
  assert(await must(B, 'getCard', alice) === null, 'alice has no card yet, but bob read one')
  await must(A, 'saveCard', { showTrips: true, trips: [{ title: 'Rome', destination: 'Rome', country: 'Italy', start: '2026-10-08', end: '2026-10-12', cover: { scene: 'skyline', tod: 'sunset' } }] })
  const card = await must(B, 'getCard', alice)
  assert(card?.showTrips === true && card.trips[0]?.destination === 'Rome', `bob read alice's card as ${JSON.stringify(card)}`)
  await refused(C, 'denied', 'getCard', alice)
  await refused(B, 'denied', 'revokeInvite', inv.token)
  await must(A, 'revokeInvite', inv.token)
  assert((await must(C, 'getInvite', inv.token))?.revoked === true, 'a reset link doesn\'t read as reset')
  await refused(C, 'not-found', 'addFriendByInvite', inv.token)
  await refused(C, 'not-found', 'addFriendByInvite', 'NoSuchToken123456789')
  assert(!(await must(A, 'myInvites')).some(i => i.token === inv.token), 'a reset link is still among alice\'s links')
})

await step('friend requests: carol asks alice (alice sees it live and in her activity); bob asks carol, and carol declines', async () => {
  await must(C, 'sendRequest', { uid: alice, name: 'alice', photo: null })
  await poll('alice to see carol\'s request', async () => (await requestsOf(A)).incoming.some(r => r.from === carol))
  await poll('carol to see her request waiting', async () => (await requestsOf(C)).outgoing.some(r => r.to === alice))
  await poll('alice\'s activity to say carol wants to be friends', async () => (await inboxOf(A)).some(i => i.kind === 'friend-request' && i.from === carol))
  await must(B, 'sendRequest', { uid: alice, name: 'alice', photo: null })
  assert(!(await cloudDoc(`requests/${bob}_${alice}`)), 'a request between friends was made')
  await must(B, 'sendRequest', { uid: carol, name: 'carol', photo: null })
  const req = await poll('carol to see bob\'s request', async () => (await requestsOf(C)).incoming.find(r => r.from === bob))
  await refused(A, 'not-found', 'acceptRequest', req)
  await must(C, 'dropRequest', req)
  await poll('bob\'s request to go for both', async () => !(await requestsOf(B)).outgoing.length && !(await requestsOf(C)).incoming.some(r => r.from === bob))
  await refused(A, 'denied', 'dropRequest', { ...req, id: `${bob}_${carol}` })
})

let postA = null
await step('the feed: alice posts to her friends, bob\'s feed has it; carol (not her friend) is refused it', async () => {
  await watch(A, 'feedA', 'watchFeed', 20)
  await watch(B, 'feedB', 'watchFeed', 20)
  postA = await run(A, p => window.__travelsTest.social.post(p).then(x => JSON.parse(JSON.stringify(x))), { kind: 'moment', text: 'Hello from the Pantheon', place: { name: 'Pantheon', lat: 41.8986, lng: 12.4769 }, trip: { title: 'Rome', destination: 'Rome' } })
  assert(JSON.stringify([...postA.audience].sort()) === JSON.stringify([alice, bob].sort()), `the audience: ${postA.audience}`)
  const inFeed = await seen(B, 'feedB', w => w.last?.some(i => i.id === postA.id), 'to have alice\'s post in his feed')
  const item = inFeed.last.find(i => i.id === postA.id)
  assert(!('audience' in item) && !('likes' in item) && item.text === 'Hello from the Pantheon' && item.place?.name === 'Pantheon', `bob's copy: ${JSON.stringify(item)}`)
  await seen(A, 'feedA', w => w.last?.[0]?.id === postA.id, 'to have her post first in her feed')
  assert(!(await cloudDoc(`users/${carol}/feed/${postA.id}`)), 'carol got a copy')
  await watch(C, 'postC', 'watchPost', postA.id)
  await seen(C, 'postC', w => w.error === 'denied', 'to be refused alice\'s post')
  await refused(C, 'denied', 'countComments', postA.id)
  await refused(C, 'denied', 'addComment', postA.id, 'hi')
  await refused(C, 'denied', 'setLike', postA.id, true)
  await refused(C, 'denied', 'deletePost', postA.id)
  await refused(C, 'invalid', 'createPost', { kind: 'moment', text: 'x'.repeat(2001) }, [])
})

await step('likes and comments: bob likes and comments, alice sees them live, the counts add up, alice deletes bob\'s comment', async () => {
  await watch(A, 'postA', 'watchPost', postA.id)
  await must(B, 'setLike', postA.id, true)
  await seen(A, 'postA', w => w.last?.likes?.[bob] === true, 'to see bob\'s like')
  await must(B, 'setLike', postA.id, false)
  await seen(A, 'postA', w => w.last && !w.last.likes?.[bob], 'to see bob take his like back')
  await must(B, 'setLike', postA.id, true)
  await watch(A, 'commentsA', 'watchComments', postA.id)
  const c1 = await must(B, 'addComment', postA.id, '  Looks great  ')
  assert(c1.text === 'Looks great' && c1.author === bob && c1.post === postA.id, `bob's comment: ${JSON.stringify(c1)}`)
  const c2 = await must(A, 'addComment', postA.id, 'Come next time')
  await seen(A, 'commentsA', w => w.last?.map(c => c.id).join() === [c1.id, c2.id].join(), 'to see both comments, oldest first')
  assert(await must(B, 'countComments', postA.id) === 2, 'bob counts other than 2 comments')
  await refused(B, 'invalid', 'addComment', postA.id, '   ')
  await refused(B, 'invalid', 'addComment', postA.id, 'x'.repeat(1001))
  await refused(B, 'denied', 'deleteComment', postA.id, c2.id)
  await must(A, 'deleteComment', postA.id, c1.id)
  await seen(A, 'commentsA', w => w.last?.length === 1 && w.last[0].id === c2.id, 'to see bob\'s comment gone')
  assert(await must(B, 'countComments', postA.id) === 1, 'the count didn\'t go down')
  await must(A, 'deleteComment', postA.id, 'noSuchComment')
  await refused(B, 'not-found', 'setLike', 'noSuchPost12345678901', true)
  await refused(B, 'not-found', 'addComment', 'noSuchPost12345678901', 'hi')
  await refused(B, 'denied', 'deletePost', postA.id)
})

await step('a new friend: alice accepts carol\'s request (carol hears it), and carol gets alice\'s recent posts and may read them', async () => {
  const req = (await requestsOf(A)).incoming.find(r => r.from === carol)
  assert(req, 'carol\'s request is gone from alice\'s list')
  await run(A, r => window.__travelsTest.social.acceptRequest(r).then(() => true), req)
  for (const d of [A, C]) await poll(`${d.name} to see the friendship`, async () => (await friendshipsOf(d)).some(x => x.id === pairOf(alice, carol)))
  await poll('the request to go', async () => !(await requestsOf(A)).incoming.length && !(await requestsOf(C)).outgoing.length)
  await poll('carol to hear alice accepted', async () => (await inboxOf(C)).some(i => i.kind === 'friend-accepted' && i.from === alice))
  // The app gives a new friend your recent posts by itself (useSocial); asked again it changes nothing.
  await must(A, 'shareRecentPostsWith', carol)
  await watch(C, 'feedC', 'watchFeed', 20)
  await seen(C, 'feedC', w => w.last?.some(i => i.id === postA.id), 'to have alice\'s earlier post')
  await watch(C, 'postC', 'watchPost', postA.id)
  await seen(C, 'postC', w => w.last?.id === postA.id && w.last.audience.includes(carol), 'to read it')
  await refused(B, 'denied', 'shareRecentPostsWith', carol)
  const inbox = await inboxOf(C)
  await must(C, 'markRead', inbox.map(i => i.id))
  await poll('carol\'s activity to be read', async () => (await inboxOf(C)).every(i => i.read))
  await must(C, 'removeInbox', inbox.map(i => i.id))
  await poll('carol\'s activity to be empty', async () => !(await inboxOf(C)).length)
})

await step('alice deletes her post: it leaves every feed, its comments go, and watching it gives null', async () => {
  await must(A, 'deletePost', postA.id)
  await seen(B, 'feedB', w => !w.last?.some(i => i.id === postA.id), 'to lose the post')
  await seen(C, 'feedC', w => !w.last?.some(i => i.id === postA.id), 'to lose the post')
  await seen(C, 'postC', w => w.last === null, 'to see it gone')
  assert(!(await cloudDoc(`posts/${postA.id}`)), 'the post is still in the cloud')
  assert(!(await cloudIds(`posts/${postA.id}/comments`)).length, 'its comments are still in the cloud')
  for (const u of [alice, bob, carol]) assert(!(await cloudDoc(`users/${u}/feed/${postA.id}`)), `a copy stayed in ${u}'s feed`)
  await must(A, 'deletePost', postA.id)
})

await step('unfriend: alice and bob stop being friends, and each one\'s posts leave the other\'s feed', async () => {
  const post = (d, text) => run(d, t => window.__travelsTest.social.post({ kind: 'moment', text: t }).then(x => JSON.parse(JSON.stringify(x))), text)
  const pa = await post(A, 'Alice again')
  const pb = await post(B, 'Bob here')
  await seen(B, 'feedB', w => [pa.id, pb.id].every(id => w.last?.some(i => i.id === id)), 'to have both posts')
  await seen(A, 'feedA', w => [pa.id, pb.id].every(id => w.last?.some(i => i.id === id)), 'to have both posts')
  await must(A, 'unfriend', bob)
  await seen(B, 'feedB', w => !w.last?.some(i => i.id === pa.id) && w.last?.some(i => i.id === pb.id), 'to lose alice\'s post and keep his own')
  await seen(A, 'feedA', w => !w.last?.some(i => i.id === pb.id) && w.last?.some(i => i.id === pa.id), 'to lose bob\'s post and keep her own')
  await seen(C, 'feedC', w => w.last?.some(i => i.id === pa.id), 'to keep alice\'s post')
  for (const d of [A, B]) await poll(`${d.name}'s friends to change`, async () => !(await friendshipsOf(d)).some(x => x.id === pairOf(alice, bob)))
  assert(!(await cloudDoc(`posts/${pa.id}`)).audience.includes(bob), 'bob is still in the audience of alice\'s post')
  await watch(B, 'postB', 'watchPost', pa.id)
  await seen(B, 'postB', w => w.error === 'denied', 'to be refused alice\'s post now')
  await refused(B, 'denied', 'getCard', alice)
  await refused(B, 'denied', 'notify', alice, { kind: 'like', text: 'liked your post', ref: pa.id })
})

// ---------- group trips, through the app's engine (useGroups) ----------
let gid = ''
let editorLink = ''
let viewerLink = ''
const meta = { title: 'Rome', destination: 'Rome', start: '2026-10-08', end: '2026-10-12', cover: { scene: 'skyline', tod: 'sunset' } }

await step('a group trip: alice makes the sample trip a group trip, and makes an editor link and a viewer link', async () => {
  const t = await run(A, () => {
    const s = window.__travelsTest.addSample()
    return s && { id: s.id, title: s.title }
  })
  assert(t?.id === TRIP, `the sample: ${JSON.stringify(t)}`)
  gid = await run(A, id => window.__travelsTest.groups.makeGroup(id), TRIP)
  assert(typeof gid === 'string' && gid.length >= 16, `the group id: ${gid}`)
  const doc = await cloudDoc(`trips/${gid}`)
  assert(doc?.owner === alice && doc.roles[alice] === 'owner' && doc.people[alice]?.name === names.alice && JSON.parse(doc.json).id === gid, `trips/${gid}: ${JSON.stringify(doc)?.slice(0, 300)}`)
  assert((await cloudDoc(`users/${alice}/groups/${gid}`))?.localId === TRIP, 'alice\'s pointer is missing')
  assert((await tripOn(A, TRIP))?.group?.id === gid, 'alice\'s trip isn\'t a group trip')
  editorLink = (await must(A, 'createInvite', { kind: 'trip', trip: gid, role: 'editor', tripTitle: 'Rome', tripDestination: 'Rome', tripStart: '2026-10-08', tripEnd: '2026-10-12', tripCover: { scene: 'skyline', tod: 'sunset' } })).token
  viewerLink = (await must(A, 'createInvite', { kind: 'trip', trip: gid, role: 'viewer', tripTitle: 'Rome' })).token
  const seenSignedOut = await rest(null, 'GET', `invites/${editorLink}`)
  assert(seenSignedOut.status === 200, `an invite read signed out: HTTP ${seenSignedOut.status}`)
  await refused(B, 'denied', 'createInvite', { kind: 'trip', trip: gid, role: 'editor' })
  await refused(A, 'invalid', 'createInvite', { kind: 'trip', trip: gid, role: 'owner' })
})

await step('carol, not in the trip, can\'t vote, chat, set a status, write the plan or read it', async () => {
  await refused(C, 'denied', 'setVote', gid, PICK, CHOICES[0])
  await refused(C, 'denied', 'setRsvp', gid, SIGHT, 'in')
  await refused(C, 'denied', 'setStatus', gid, { kind: 'free', text: 'Free now' })
  await refused(C, 'denied', 'sendMessage', gid, { kind: 'text', text: 'Let me in' })
  await refused(C, 'denied', 'writeGroupJson', gid, '{}', Date.now() + 60000, 0, meta)
  await refused(C, 'denied', 'updateMe', gid)
  await watch(C, 'chatC', 'watchMessages', gid, 50)
  await seen(C, 'chatC', w => w.error === 'denied', 'to be refused the chat')
  await watch(C, 'groupC', 'watchGroup', gid)
  await seen(C, 'groupC', w => w.calls === 1 && w.last === null && !w.error, 'to be told the trip isn\'t hers (null, once)')
  await refused(C, 'not-found', 'joinGroup', 'NoSuchInvite123456789')
  await refused(C, 'not-found', 'joinGroup', friendToken)
})

await step('bob joins with the editor link (useGroups.join) and gets the plan as a trip on his device; alice hears it', async () => {
  const r = await run(B, t => window.__travelsTest.groups.join(t), editorLink)
  assert(r?.gid === gid && r.localId === gid, `join gave ${JSON.stringify(r)}`)
  const t = await poll('bob\'s copy of the plan', () => tripOn(B, gid))
  assert(t.id === gid && t.group?.role === 'editor' && t.title === 'Rome', `bob's copy: ${JSON.stringify(t)}`)
  const doc = await cloudDoc(`trips/${gid}`)
  assert(doc.roles[bob] === 'editor' && doc.people[bob]?.name === names.bob && doc.joinedVia === editorLink, `after bob joined: ${JSON.stringify({ roles: doc.roles, people: doc.people, joinedVia: doc.joinedVia })}`)
  assert((await must(B, 'joinGroup', editorLink)).roles[bob] === 'editor', 'joining again changed bob\'s role')
  await poll('alice to hear bob joined', async () => (await inboxOf(A)).some(i => i.kind === 'joined-trip' && i.from === bob && i.ref === gid))
})

await step('alice and bob change different stops at the same moment: both changes end up on both devices and in the cloud', async () => {
  for (const d of [A, B]) await poll(`${d.name}'s copy to be in step`, () => run(d, g => window.__travelsTest.groups.sync.value[g] === 'synced', gid), 20000)
  const edit = (d, day, stop, title) => run(d, ([g, dy, st, ti]) => {
    const t = window.__travelsTest.trips.value.find(x => x.group?.id === g)
    const s = t.days[dy].stops.find(x => x.id === st)
    const now = new Date().toISOString()
    s.title = ti
    s.updatedAt = now
    t.updatedAt = now
    return true
  }, [gid, day, stop, title])
  await Promise.all([edit(A, 0, STOP_A, 'Dinner (alice)'), edit(B, 1, STOP_B, 'Metro (bob)')])
  for (const d of [A, B]) {
    await poll(`${d.name} to have both changes`, async () => {
      const t = await tripOn(d, gid)
      return t?.a === 'Dinner (alice)' && t.b === 'Metro (bob)'
    }, 45000, () => tripOn(d, gid))
  }
  await poll('the cloud to have both changes', async () => {
    const t = JSON.parse((await cloudDoc(`trips/${gid}`)).json)
    return t.days[0].stops.find(s => s.id === STOP_A)?.title === 'Dinner (alice)' && t.days[1].stops.find(s => s.id === STOP_B)?.title === 'Metro (bob)'
  }, 20000)
})

await step('carol joins as a viewer: her copy follows the plan, and the rules refuse her writing it', async () => {
  const r = await run(C, t => window.__travelsTest.groups.join(t), viewerLink)
  assert(r?.gid === gid, `join gave ${JSON.stringify(r)}`)
  const t = await poll('carol\'s copy with both changes', async () => {
    const x = await tripOn(C, gid)
    return x?.group?.role === 'viewer' && x.a === 'Dinner (alice)' && x.b === 'Metro (bob)' ? x : null
  }, 20000, () => tripOn(C, gid))
  assert(t.id === gid, `carol's copy: ${JSON.stringify(t)}`)
  const doc = await cloudDoc(`trips/${gid}`)
  await refused(C, 'denied', 'writeGroupJson', gid, doc.json, doc.updatedAt + 1000, doc.updatedAt, meta)
  const token = await tokenOf(C)
  const w = await rest(token, 'PATCH', `trips/${gid}`, { data: { json: '{"by":"carol"}', updatedAt: doc.updatedAt + 1000 }, mask: ['json', 'updatedAt'] })
  assert(w.status === 403, `carol (a viewer) wrote the plan through the REST API: HTTP ${w.status}`)
  assert(JSON.parse((await cloudDoc(`trips/${gid}`)).json).id === gid, 'the plan changed')
})

await step('votes, who\'s in, statuses and the chat, between the trip\'s people', async () => {
  await watch(A, 'votesA', 'watchVotes', gid)
  await must(B, 'setVote', gid, PICK, CHOICES[0])
  await seen(A, 'votesA', w => w.last?.some(v => v.uid === bob && v.stopId === PICK && v.choiceId === CHOICES[0]), 'to see bob\'s vote')
  await must(B, 'setVote', gid, PICK, CHOICES[2])
  await seen(A, 'votesA', w => w.last?.filter(v => v.uid === bob).map(v => v.choiceId).join() === CHOICES[2], 'to see bob change his vote')
  await must(B, 'setVote', gid, PICK, null)
  await seen(A, 'votesA', w => w.last && !w.last.some(v => v.uid === bob), 'to see bob take his vote back')
  await must(C, 'setVote', gid, PICK, CHOICES[1])
  await seen(A, 'votesA', w => w.last?.some(v => v.uid === carol), 'to see carol\'s vote (viewers vote too)')
  await watch(B, 'rsvpsB', 'watchRsvps', gid)
  await must(A, 'setRsvp', gid, SIGHT, 'in')
  await must(C, 'setRsvp', gid, SIGHT, 'maybe')
  await seen(B, 'rsvpsB', w => w.last?.some(x => x.uid === alice && x.going === 'in') && w.last.some(x => x.uid === carol && x.going === 'maybe'), 'to see who\'s in')
  await must(C, 'setRsvp', gid, SIGHT, null)
  await seen(B, 'rsvpsB', w => w.last && !w.last.some(x => x.uid === carol), 'to see carol\'s answer gone')
  await watch(A, 'statusA', 'watchStatuses', gid)
  await must(B, 'setStatus', gid, { kind: 'at', text: 'At Pantheon', stopId: SIGHT, place: { lat: 41.8986, lng: 12.4769, acc: 20 } })
  await seen(A, 'statusA', w => w.last?.some(s => s.uid === bob && s.text === 'At Pantheon'), 'to see bob\'s status')
  await refused(B, 'invalid', 'setStatus', gid, { kind: 'custom', text: 'x'.repeat(81) })
  await must(B, 'setStatus', gid, null)
  await seen(A, 'statusA', w => w.last && !w.last.some(s => s.uid === bob), 'to see bob\'s status cleared')
  await watch(B, 'chatB', 'watchMessages', gid, 50)
  const m = await must(A, 'sendMessage', gid, { kind: 'text', text: 'Meet at 8?' })
  const pin = await must(C, 'sendMessage', gid, { kind: 'location', text: '', place: { lat: 41.9, lng: 12.47, acc: 12 } })
  const chat = await seen(B, 'chatB', w => [m.id, pin.id].every(id => w.last?.some(x => x.id === id)), 'to read alice\'s and carol\'s messages')
  assert(chat.last.findIndex(x => x.id === m.id) < chat.last.findIndex(x => x.id === pin.id), 'the chat isn\'t oldest first')
  await refused(B, 'denied', 'deleteMessage', gid, m.id)
  await must(A, 'deleteMessage', gid, m.id)
  await seen(B, 'chatB', w => w.last && !w.last.some(x => x.id === m.id), 'to see alice\'s message gone')
  await must(A, 'deleteMessage', gid, 'noSuchMessage')
  await refused(B, 'invalid', 'sendMessage', gid, { kind: 'text', text: 'x'.repeat(1001) })
  // bob and carol aren't friends: telling each other about the trip they share is allowed.
  await must(B, 'notify', carol, { kind: 'home-safe', text: 'is home safe', ref: gid })
  await poll('carol to hear bob is home safe', async () => (await inboxOf(C)).some(i => i.kind === 'home-safe' && i.from === bob))
  await refused(B, 'denied', 'notify', carol, { kind: 'like', text: 'liked your post' })
})

await step('the organiser: roles change, she can\'t leave or demote herself, and removing carol leaves carol a copy of her own', async () => {
  await refused(A, 'denied', 'leaveGroup', gid)
  await refused(A, 'invalid', 'setRole', gid, alice, 'viewer')
  await refused(B, 'denied', 'setRole', gid, carol, 'editor')
  await refused(A, 'not-found', 'setRole', gid, 'someoneElse', 'editor')
  await must(A, 'setRole', gid, bob, 'viewer')
  await poll('bob\'s copy to follow his new role', async () => (await tripOn(B, gid))?.group?.role === 'viewer')
  await must(A, 'setRole', gid, bob, 'editor')
  await poll('bob\'s copy to be an editor\'s again', async () => (await tripOn(B, gid))?.group?.role === 'editor')
  await run(A, ([g, u]) => window.__travelsTest.groups.setRole(g, u, null), [gid, carol])
  await poll('carol\'s copy to stay, as a trip of her own', async () => {
    const t = await tripOn(C, gid)
    return t && t.id === gid && !t.group
  }, 20000, () => tripOn(C, gid))
  await poll('carol\'s pointer to go', async () => !(await cloudDoc(`users/${carol}/groups/${gid}`)))
  const doc = await cloudDoc(`trips/${gid}`)
  assert(!doc.roles[carol] && !doc.people[carol] && doc.roles[bob] === 'editor', `after carol was removed: ${JSON.stringify({ roles: doc.roles, people: doc.people })}`)
  await refused(C, 'denied', 'sendMessage', gid, { kind: 'text', text: 'Still here?' })
  await must(C, 'leaveGroup', gid)
})

await step('alice stops sharing: the trip and all that was said in it leave the cloud, and bob keeps his copy', async () => {
  await run(A, g => window.__travelsTest.groups.stopSharing(g), gid)
  await poll('bob\'s copy to stay, as a trip of his own', async () => {
    const t = await tripOn(B, gid)
    return t && t.id === gid && !t.group
  }, 20000, () => tripOn(B, gid))
  assert(!(await cloudDoc(`trips/${gid}`)), 'the trip is still in the cloud')
  for (const part of ['messages', 'votes', 'rsvps', 'status']) assert(!(await cloudIds(`trips/${gid}/${part}`)).length, `its ${part} are still in the cloud`)
  const mine = await tripOn(A, TRIP)
  assert(mine && !mine.group && mine.a === 'Dinner (alice)' && mine.b === 'Metro (bob)', `alice's own copy: ${JSON.stringify(mine)}`)
  await must(A, 'deleteGroup', gid)
  await poll('bob\'s pointer to go', async () => !(await cloudDoc(`users/${bob}/groups/${gid}`)))
})

// ---------- meetups and plan links, signed in and out ----------
let meetupId = ''
let shareId = ''

await step('meetups: alice makes one, a browser with no account reads it live; bob says he\'s in and tells her; carol can\'t tell bob', async () => {
  D = await device('nobody', true)
  const m = await must(A, 'createMeetup', { title: 'Vatican at 8', note: 'Anyone for the Vatican at 8 on Friday?', place: { name: 'Vatican Museums', lat: 41.9065, lng: 12.4536 }, start: '2026-10-16T08:00:00+02:00', timezone: 'Europe/Rome', destination: 'Rome', tripTitle: 'Rome' })
  meetupId = m.id
  assert(m.host === alice && m.hostName === names.alice && m.id.length >= 16, `the meetup: ${JSON.stringify(m)}`)
  const pub = await must(D, 'getMeetup', m.id)
  assert(pub?.title === 'Vatican at 8' && pub.place?.name === 'Vatican Museums', `read signed out: ${JSON.stringify(pub)}`)
  assert(await must(D, 'getMeetup', 'NoSuchMeetup123456789') === null, 'a missing meetup isn\'t null')
  await watch(D, 'meetD', 'watchMeetup', m.id)
  await seen(D, 'meetD', w => w.last?.id === m.id, 'to watch the meetup signed out')
  await refused(D, 'auth', 'setGoing', m.id, true)
  await watch(D, 'goingD', 'watchGoing', m.id)
  await seen(D, 'goingD', w => w.error === 'auth', 'to be refused who\'s going (signed out)')
  await watch(A, 'goingA', 'watchGoing', m.id)
  await must(B, 'setGoing', m.id, true)
  await seen(A, 'goingA', w => w.last?.some(g => g.uid === bob && g.name === names.bob), 'to see bob going')
  await must(B, 'notify', alice, { kind: 'meetup-going', text: 'is in for Vatican at 8', ref: m.id, link: `/m/${m.id}` })
  await poll('alice to hear bob is going', async () => (await inboxOf(A)).some(i => i.kind === 'meetup-going' && i.from === bob && i.ref === m.id))
  await refused(C, 'denied', 'notify', bob, { kind: 'meetup-going', text: 'is in', ref: m.id })
  await refused(B, 'denied', 'updateMeetup', m.id, { title: 'Mine now' })
  await refused(A, 'invalid', 'updateMeetup', m.id, { title: 'x'.repeat(81) })
  await must(A, 'updateMeetup', m.id, { note: 'Meet at the entrance', cancelled: true })
  await seen(D, 'meetD', w => w.last?.cancelled === true && w.last.note === 'Meet at the entrance', 'to see it cancelled')
  assert((await must(A, 'myMeetups')).some(x => x.id === m.id), 'alice\'s meetups miss it')
  assert(!(await must(B, 'myMeetups')).length, 'bob has meetups he never made')
  await must(B, 'setGoing', m.id, false)
  await seen(A, 'goingA', w => w.last && !w.last.some(g => g.uid === bob), 'to see bob not going any more')
  await refused(B, 'not-found', 'setGoing', 'NoSuchMeetup123456789', true)
  await refused(B, 'not-found', 'updateMeetup', 'NoSuchMeetup123456789', { title: 'x' })
})

await step('plan links: anyone reads one; only alice removes it; removed, it reads as removed with no plan', async () => {
  const json = JSON.stringify({ id: 'copy', title: 'Rome', days: [] })
  const s = await must(A, 'createShare', { title: 'Rome', destination: 'Rome', start: '2026-10-08', end: '2026-10-12', cover: { scene: 'skyline', tod: 'sunset' }, days: 5, json })
  shareId = s.id
  const pub = await must(D, 'getShare', s.id)
  assert(pub?.json === json && !pub.revoked && pub.owner === alice, `read signed out: ${JSON.stringify(pub)?.slice(0, 200)}`)
  assert((await must(A, 'myShares')).some(x => x.id === s.id), 'alice\'s plan links miss it')
  await refused(B, 'denied', 'revokeShare', s.id)
  await must(A, 'revokeShare', s.id)
  const after = await must(D, 'getShare', s.id)
  assert(after?.revoked === true && after.json === '', `removed, it reads ${JSON.stringify(after)?.slice(0, 200)}`)
  assert(!(await must(A, 'myShares')).some(x => x.id === s.id), 'a removed link is still among alice\'s')
  assert(await must(D, 'getShare', 'NoSuchShare1234567890') === null, 'a missing plan link isn\'t null')
  await refused(A, 'invalid', 'createShare', { title: 'Big', destination: 'x', start: '', end: '', cover: { scene: 'skyline', tod: 'day' }, days: 1, json: 'x'.repeat(1_000_000) })
  const inv = await must(A, 'createInvite', { kind: 'friend' })
  assert((await must(D, 'getInvite', inv.token))?.from === alice, 'an invite can\'t be read signed out')
  await refused(D, 'auth', 'getProfile', alice)
  await refused(D, 'auth', 'myInvites')
})

await step('photos: alice\'s public photo opens by its link; non-images are refused; the rules keep folders to their owners', async () => {
  const url = await run(A, async () => {
    const c = document.createElement('canvas')
    c.width = 32
    c.height = 24
    const g = c.getContext('2d')
    g.fillStyle = '#8A1538'
    g.fillRect(0, 0, 32, 24)
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9))
    return window.__travelsTest.social.backend.value.uploadPublicPhoto(blob)
  })
  assert(typeof url === 'string' && url.includes(encodeURIComponent(`users/${alice}/public/`)), `the photo's link: ${url}`)
  const got = await fetch(url)
  assert(got.ok && (got.headers.get('content-type') ?? '').startsWith('image/'), `opening the link: HTTP ${got.status} ${got.headers.get('content-type')}`)
  const text = await run(A, () => window.__travelsTest.social.backend.value.uploadPublicPhoto(new Blob(['hello'], { type: 'text/plain' })).then(() => 'ok', e => e.code))
  assert(text === 'invalid', `a text file was ${text}`)
  const [ta, tb] = await Promise.all([tokenOf(A), tokenOf(B)])
  const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 1, 0xFF, 0xD9])
  const cases = [
    ['alice uploads a photo into her public folder', ta, `users/${alice}/public/rest-check.jpg`, 'image/jpeg', jpeg, 200],
    ['bob uploads a photo into alice\'s public folder', tb, `users/${alice}/public/from-bob.jpg`, 'image/jpeg', jpeg, 403],
    ['alice uploads a text file into her public folder', ta, `users/${alice}/public/note.txt`, 'text/plain', Buffer.from('hello'), 403],
    ['alice uploads a photo over 4 MB', ta, `users/${alice}/public/huge.jpg`, 'image/jpeg', Buffer.alloc(4 * 1024 * 1024 + 1), 403],
    ['nobody signed in uploads into alice\'s public folder', null, `users/${alice}/public/anon.jpg`, 'image/jpeg', jpeg, 403],
    ['bob uploads into alice\'s stop photos', tb, `users/${alice}/photos/from-bob.jpg`, 'image/jpeg', jpeg, 403],
  ]
  const wrong = []
  for (const [what, token, path, type, bytes, want] of cases) {
    const status = await upload(token, path, type, bytes)
    if (status !== want) wrong.push(`${what}: HTTP ${status}, expected ${want}`)
  }
  const meta = [
    ['bob (signed in) reads alice\'s public photo', tb, `users/${alice}/public/rest-check.jpg`, 200],
    ['nobody signed in reads alice\'s public photo without its link', null, `users/${alice}/public/rest-check.jpg`, 403],
  ]
  for (const [what, token, path, want] of meta) {
    const status = await storageMeta(token, path)
    if (status !== want) wrong.push(`${what}: HTTP ${status}, expected ${want}`)
  }
  assert(!wrong.length, wrong.join('; '))
})

// ---------- the rules, asked directly: each refusal next to what that account may do ----------

await step('the rules, asked directly with each account\'s token: other people\'s profiles, cards, pointers, activity, posts, friendships and trips', async () => {
  const [ta, tb, tc] = await Promise.all([tokenOf(A), tokenOf(B), tokenOf(C)])
  assert(ta && tb && tc, 'an ID token is missing')
  const now = Date.now()
  // A group trip for these checks: alice organises it, bob edits, carol joins as a viewer through the REST API.
  const g2 = await must(A, 'createGroup', { id: token22(), title: 'Lisbon', destination: 'Lisbon', start: '2026-11-01', end: '2026-11-04', cover: { scene: 'skyline', tod: 'day' }, json: '{"id":"lisbon"}', updatedAt: now })
  const ed = await must(A, 'createInvite', { kind: 'trip', trip: g2, role: 'editor' })
  const vw = await must(A, 'createInvite', { kind: 'trip', trip: g2, role: 'viewer' })
  const old = await must(A, 'createInvite', { kind: 'trip', trip: g2, role: 'editor' })
  await must(A, 'revokeInvite', old.token)
  await must(B, 'joinGroup', ed.token)
  const oldFriendLink = friendToken
  // A post of alice's that carol (a friend) may read, for likes and comments.
  const pc = await must(A, 'createPost', { kind: 'moment', text: 'For carol' }, [carol])
  const ids = { p1: token22(), p2: token22(), p3: token22(), c1: token22(), c2: token22(), m1: token22(), i1: token22(), i2: token22() }
  const join = (uid, role, token) => ({ data: { roles: { [uid]: role }, people: { [uid]: { name: 'carol', photo: null } }, joinedVia: token }, mask: [fieldPath('roles', uid), fieldPath('people', uid), 'joinedVia'] })
  const plan = (json, at) => ({ data: { json, updatedAt: at }, mask: ['json', 'updatedAt'] })
  const inbox = (id, from, kind) => ({ data: { id, kind, from, fromName: 'x', fromPhoto: null, text: 'hello', at: now }, exists: false })
  const post = (id, author, audience, extra = {}) => ({ data: { id, kind: 'moment', text: 'hi', author, authorName: 'x', authorPhoto: null, audience, likes: {}, at: now, ...extra }, exists: false })
  const feed = (id, author) => ({ data: { id, kind: 'moment', text: 'hi', author, authorName: 'x', authorPhoto: null, at: now }, exists: false })
  const friendship = (a, b, via) => {
    const members = [a, b].sort()
    return { data: { id: members.join('_'), members, via, createdAt: now }, exists: false }
  }
  const vote = (uid, stop = 's1') => ({ data: { stopId: stop, uid, choiceId: 'c', at: now }, exists: false })
  const message = (id, author) => ({ data: { id, kind: 'text', text: 'hi', author, name: 'x', photo: null, at: now }, exists: false })
  const comment = (id, post, author) => ({ data: { id, post, author, name: 'x', photo: null, text: 'hi', at: now }, exists: false })
  const cases = [
    // Profiles, handles, cards and pointers.
    ['bob changes his own bio', tb, 'PATCH', `profiles/${bob}`, { data: { bio: 'Hi' }, mask: ['bio'] }, 200],
    ['bob changes alice\'s bio', tb, 'PATCH', `profiles/${alice}`, { data: { bio: 'Hacked' }, mask: ['bio'] }, 403],
    ['bob writes a profile for alice', tb, 'PATCH', `profiles/${alice}`, { data: { uid: alice, name: 'Not alice', photo: null, updatedAt: now } }, 403],
    ['bob puts a handle he doesn\'t hold on his profile', tb, 'PATCH', `profiles/${bob}`, { data: { handle: 'alice.travels' }, mask: ['handle'] }, 403],
    ['bob claims a handle for alice', tb, 'PATCH', 'handles/for.alice', { data: { uid: alice }, exists: false }, 403],
    ['bob deletes alice\'s handle', tb, 'DELETE', 'handles/alice.travels', {}, 403],
    ['nobody signed in reads a profile', null, 'GET', `profiles/${alice}`, {}, 403],
    ['bob lists every profile', tb, 'GET', 'profiles', {}, 403],
    ['bob writes his own card', tb, 'PATCH', `cards/${bob}`, { data: { uid: bob, showTrips: false, trips: [], updatedAt: now } }, 200],
    ['bob writes alice\'s card', tb, 'PATCH', `cards/${alice}`, { data: { uid: alice, showTrips: false, trips: [], updatedAt: now } }, 403],
    ['carol reads alice\'s card (friends)', tc, 'GET', `cards/${alice}`, {}, 200],
    ['bob reads alice\'s card (not friends any more)', tb, 'GET', `cards/${alice}`, {}, 403],
    ['bob writes a pointer of his own', tb, 'PATCH', `users/${bob}/groups/${g2}`, { data: { gid: g2, localId: g2, role: 'editor', title: 'Lisbon', at: now } }, 200],
    ['bob writes a pointer into alice\'s account', tb, 'PATCH', `users/${alice}/groups/${g2}`, { data: { gid: g2, localId: g2, role: 'owner', title: 'Lisbon', at: now } }, 403],
    ['bob lists alice\'s group trips', tb, 'GET', `users/${alice}/groups`, {}, 403],
    // Activity.
    ['carol tells alice (a friend) she liked her post', tc, 'PATCH', `users/${alice}/inbox/rc1`, inbox('rc1', carol, 'like'), 200],
    ['carol, a stranger, tells bob she liked his post', tc, 'PATCH', `users/${bob}/inbox/rc2`, inbox('rc2', carol, 'like'), 403],
    ['carol asks bob to be friends (anyone may)', tc, 'PATCH', `users/${bob}/inbox/rc3`, inbox('rc3', carol, 'friend-request'), 200],
    ['carol writes into bob\'s activity in alice\'s name', tc, 'PATCH', `users/${bob}/inbox/rc4`, inbox('rc4', alice, 'friend-request'), 403],
    ['carol says she joined a trip she isn\'t in', tc, 'PATCH', `users/${bob}/inbox/rc5`, { data: { ...inbox('rc5', carol, 'joined-trip').data, ref: g2 }, exists: false }, 403],
    ['carol reads bob\'s activity', tc, 'GET', `users/${bob}/inbox`, {}, 403],
    ['bob marks an item of his read', tb, 'PATCH', `users/${bob}/inbox/rc3`, { data: { read: true }, mask: ['read'] }, 200],
    ['bob rewrites what an item of his says', tb, 'PATCH', `users/${bob}/inbox/rc3`, { data: { text: 'changed' }, mask: ['text'] }, 403],
    ['alice deletes an item in bob\'s activity', ta, 'DELETE', `users/${bob}/inbox/rc3`, {}, 403],
    // Posts, likes, comments and feeds.
    ['bob posts as himself', tb, 'PATCH', `posts/${ids.p1}`, post(ids.p1, bob, [bob]), 200],
    ['bob posts in alice\'s name', tb, 'PATCH', `posts/${ids.p2}`, post(ids.p2, alice, [alice, bob]), 403],
    ['bob posts with likes already in it', tb, 'PATCH', `posts/${ids.p3}`, post(ids.p3, bob, [bob], { likes: { [alice]: true } }), 403],
    ['bob posts leaving himself out of the audience', tb, 'PATCH', `posts/${ids.p3}`, post(ids.p3, bob, [alice]), 403],
    ['bob reads alice\'s post meant for carol', tb, 'GET', `posts/${pc.id}`, {}, 403],
    ['bob lists every post', tb, 'GET', 'posts', {}, 403],
    ['carol likes alice\'s post', tc, 'PATCH', `posts/${pc.id}`, { data: { likes: { [carol]: true } }, mask: [fieldPath('likes', carol)] }, 200],
    ['carol likes alice\'s post in alice\'s name', tc, 'PATCH', `posts/${pc.id}`, { data: { likes: { [alice]: true } }, mask: [fieldPath('likes', alice)] }, 403],
    ['carol changes what alice\'s post says', tc, 'PATCH', `posts/${pc.id}`, { data: { text: 'Changed' }, mask: ['text'] }, 403],
    ['alice takes carol\'s like away', ta, 'PATCH', `posts/${pc.id}`, { mask: [fieldPath('likes', carol)] }, 403],
    ['carol comments on alice\'s post', tc, 'PATCH', `posts/${pc.id}/comments/${ids.c1}`, comment(ids.c1, pc.id, carol), 200],
    ['carol comments in alice\'s name', tc, 'PATCH', `posts/${pc.id}/comments/${ids.c2}`, comment(ids.c2, pc.id, alice), 403],
    ['bob comments on a post not meant for him', tb, 'PATCH', `posts/${pc.id}/comments/${ids.c2}`, comment(ids.c2, pc.id, bob), 403],
    ['bob deletes carol\'s comment on alice\'s post', tb, 'DELETE', `posts/${pc.id}/comments/${ids.c1}`, {}, 403],
    ['bob puts a copy of his post in his own feed', tb, 'PATCH', `users/${bob}/feed/${ids.p1}`, feed(ids.p1, bob), 200],
    ['bob puts a copy of his post in carol\'s feed (not friends)', tb, 'PATCH', `users/${carol}/feed/${ids.p1}`, feed(ids.p1, bob), 403],
    ['carol puts a copy in alice\'s feed in bob\'s name', tc, 'PATCH', `users/${alice}/feed/${ids.p1}`, feed(ids.p1, bob), 403],
    ['carol reads alice\'s feed', tc, 'GET', `users/${alice}/feed`, {}, 403],
    ['carol deletes a copy in alice\'s feed that isn\'t hers', tc, 'DELETE', `users/${alice}/feed/${pc.id}`, {}, 403],
    // Friends and invites.
    ['carol makes herself bob\'s friend with no request', tc, 'PATCH', `friendships/${pairOf(bob, carol)}`, friendship(bob, carol, 'request'), 403],
    ['carol makes herself bob\'s friend with alice\'s reset link', tc, 'PATCH', `friendships/${pairOf(bob, carol)}`, friendship(bob, carol, oldFriendLink), 403],
    ['bob makes alice and carol friends', tb, 'PATCH', `friendships/${pairOf(alice, carol)}`, { data: friendship(alice, carol, 'request').data }, 403],
    ['bob reads alice and carol\'s friendship', tb, 'GET', `friendships/${pairOf(alice, carol)}`, {}, 403],
    ['carol reads her friendship with alice', tc, 'GET', `friendships/${pairOf(alice, carol)}`, {}, 200],
    ['bob ends alice and carol\'s friendship', tb, 'DELETE', `friendships/${pairOf(alice, carol)}`, {}, 403],
    ['bob writes a request from carol', tb, 'PATCH', `requests/${carol}_${bob}`, { data: { id: `${carol}_${bob}`, from: carol, to: bob, fromName: 'x', fromPhoto: null, at: now } }, 403],
    ['bob lists every invite', tb, 'GET', 'invites', {}, 403],
    ['bob resets alice\'s invite', tb, 'PATCH', `invites/${vw.token}`, { data: { revoked: true }, mask: ['revoked'] }, 403],
    ['alice un-resets her own invite', ta, 'PATCH', `invites/${old.token}`, { data: { revoked: false }, mask: ['revoked'] }, 403],
    ['alice deletes her own invite', ta, 'DELETE', `invites/${vw.token}`, {}, 403],
    ['bob makes an invite in alice\'s name', tb, 'PATCH', `invites/${ids.i1}`, { data: { token: ids.i1, kind: 'friend', from: alice, fromName: 'x', fromPhoto: null, createdAt: now }, exists: false }, 403],
    ['nobody signed in reads an invite', null, 'GET', `invites/${vw.token}`, {}, 200],
    // Group trips.
    ['carol joins with a reset invite', tc, 'PATCH', `trips/${g2}`, join(carol, 'editor', old.token), 403],
    ['carol joins as an editor with a viewer invite', tc, 'PATCH', `trips/${g2}`, join(carol, 'editor', vw.token), 403],
    ['carol joins with an invite to another trip', tc, 'PATCH', `trips/${g2}`, join(carol, 'editor', editorLink), 403],
    ['carol joins with the viewer invite', tc, 'PATCH', `trips/${g2}`, join(carol, 'viewer', vw.token), 200],
    ['carol, a viewer, writes the plan', tc, 'PATCH', `trips/${g2}`, plan('{"by":"carol"}', now + 10000), 403],
    ['bob, an editor, writes the plan', tb, 'PATCH', `trips/${g2}`, plan('{"by":"bob"}', now + 20000), 200],
    ['bob writes the plan with an older version', tb, 'PATCH', `trips/${g2}`, plan('{"by":"bob, late"}', now + 15000), 403],
    ['bob writes the plan and the owner', tb, 'PATCH', `trips/${g2}`, { data: { json: '{}', updatedAt: now + 30000, owner: bob }, mask: ['json', 'updatedAt', 'owner'] }, 403],
    ['carol makes herself an editor', tc, 'PATCH', `trips/${g2}`, { data: { roles: { [carol]: 'editor' } }, mask: [fieldPath('roles', carol)] }, 403],
    ['bob removes alice from her trip', tb, 'PATCH', `trips/${g2}`, { mask: [fieldPath('roles', alice), fieldPath('people', alice)] }, 403],
    ['bob removes carol', tb, 'PATCH', `trips/${g2}`, { mask: [fieldPath('roles', carol), fieldPath('people', carol)] }, 403],
    ['alice makes bob the organiser', ta, 'PATCH', `trips/${g2}`, { data: { roles: { [bob]: 'owner' } }, mask: [fieldPath('roles', bob)] }, 403],
    ['alice gives up being the organiser', ta, 'PATCH', `trips/${g2}`, { data: { roles: { [alice]: 'editor' } }, mask: [fieldPath('roles', alice)] }, 403],
    ['carol renames bob in the trip', tc, 'PATCH', `trips/${g2}`, { data: { people: { [bob]: { name: 'Bobby', photo: null } } }, mask: [fieldPath('people', bob)] }, 403],
    ['carol changes her own name in the trip', tc, 'PATCH', `trips/${g2}`, { data: { people: { [carol]: { name: 'Carol', photo: null } } }, mask: [fieldPath('people', carol)] }, 200],
    ['nobody signed in reads the trip', null, 'GET', `trips/${g2}`, {}, 403],
    ['bob lists every group trip', tb, 'GET', 'trips', {}, 403],
    ['carol votes in bob\'s name', tc, 'PATCH', `trips/${g2}/votes/s1__${bob}`, vote(bob), 403],
    ['carol votes', tc, 'PATCH', `trips/${g2}/votes/s1__${carol}`, vote(carol), 200],
    ['carol answers who\'s in for bob', tc, 'PATCH', `trips/${g2}/rsvps/s1__${bob}`, { data: { stopId: 's1', uid: bob, going: 'in', at: now }, exists: false }, 403],
    ['carol sets bob\'s status', tc, 'PATCH', `trips/${g2}/status/${bob}`, { data: { uid: bob, kind: 'late', text: 'Late', at: now } }, 403],
    ['bob sends a message in carol\'s name', tb, 'PATCH', `trips/${g2}/messages/${ids.m1}`, message(ids.m1, carol), 403],
    ['bob sends a message', tb, 'PATCH', `trips/${g2}/messages/${ids.m1}`, message(ids.m1, bob), 200],
    ['carol deletes bob\'s message', tc, 'DELETE', `trips/${g2}/messages/${ids.m1}`, {}, 403],
    ['carol, a viewer, makes an invite to the trip', tc, 'PATCH', `invites/${ids.i2}`, { data: { token: ids.i2, kind: 'trip', from: carol, fromName: 'x', fromPhoto: null, createdAt: now, trip: g2, role: 'viewer' }, exists: false }, 403],
    ['carol leaves the trip', tc, 'PATCH', `trips/${g2}`, { mask: [fieldPath('roles', carol), fieldPath('people', carol)] }, 200],
    ['bob deletes alice\'s trip', tb, 'DELETE', `trips/${g2}`, {}, 403],
    // Meetups and plan links.
    ['bob changes alice\'s meetup', tb, 'PATCH', `meetups/${meetupId}`, { data: { title: 'Mine now' }, mask: ['title'] }, 403],
    ['bob says alice is going', tb, 'PATCH', `meetups/${meetupId}/going/${alice}`, { data: { uid: alice, name: 'x', photo: null, at: now } }, 403],
    ['bob says he is going', tb, 'PATCH', `meetups/${meetupId}/going/${bob}`, { data: { uid: bob, name: 'bob', photo: null, at: now } }, 200],
    ['nobody signed in reads who\'s going', null, 'GET', `meetups/${meetupId}/going`, {}, 403],
    ['bob makes a meetup at an id anyone could guess', tb, 'PATCH', 'meetups/abc', { data: { id: 'abc', host: bob, hostName: 'x', hostPhoto: null, title: 'T', note: '', place: null, start: 's', timezone: 'z', createdAt: now, updatedAt: now }, exists: false }, 403],
    ['bob lists every meetup', tb, 'GET', 'meetups', {}, 403],
    ['bob removes alice\'s plan link', tb, 'PATCH', `shares/${shareId}`, { data: { revoked: true, json: '' }, mask: ['revoked', 'json'] }, 403],
    ['alice puts a plan back in her removed link', ta, 'PATCH', `shares/${shareId}`, { data: { json: '{"id":"again"}' }, mask: ['json'] }, 403],
    ['bob lists every plan link', tb, 'GET', 'shares', {}, 403],
    ['nobody signed in reads a plan link', null, 'GET', `shares/${shareId}`, {}, 200],
    ['nobody signed in reads a meetup', null, 'GET', `meetups/${meetupId}`, {}, 200],
  ]
  const wrong = []
  for (const [what, token, method, path, opts, want] of cases) {
    const r = await rest(token, method, path, opts)
    if (r.status !== want) wrong.push(`${what}: HTTP ${r.status}, expected ${want}${r.status >= 400 && want === 200 ? ` (${r.body.replace(/\s+/g, ' ').slice(0, 160)})` : ''}`)
  }
  assert(!wrong.length, `${wrong.length} of ${cases.length} answers were wrong:\n${wrong.join('\n')}`)
  await must(A, 'deleteGroup', g2)
})

await browser.close()
server.close()
console.log(`\n${passed} passed, ${problems.length} problem(s)`)
for (const p of problems) console.log(`  - ${p}`)
process.exit(problems.length ? 1 : 0)
