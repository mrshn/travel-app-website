/**
 * Accounts on this device (spec D31 to D36): how to sign in, what happens to the device's copy when someone signs in,
 * and what hasn't reached the account yet. Pure functions: the Firebase side lives in the app (useCloud).
 */
import { jsonHash, type Known } from './sync'

/** localStorage key of the account this device's copy belongs to. */
export const ACCOUNT_KEY = 'travel:account:v1'

/** The account this device's copy belongs to, as the device remembers it (written when someone signs in). */
export interface RememberedAccount {
  uid: string
  name: string
  email: string
  photo: string | null
  /** Signed out on purpose: the copy stays with this account, behind the landing page, until someone signs in. */
  out?: boolean
}

/** What this device and one account's cloud copy last agreed on. */
export interface SyncMemory {
  uid: string
  /** Per item (itemKey): its hash and version when the two last agreed. */
  known: Record<string, Known>
  /** Photos already in the cloud. */
  photos: string[]
}

const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const own = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key)

/** JSON text as a value (anything else as it is); unreadable text is null. */
function parse(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw) as unknown
  }
  catch {
    return null
  }
}

/** The remembered account in storage (JSON text or a value), or null when it isn't one. */
export function accountFrom(raw: unknown): RememberedAccount | null {
  const a = parse(raw)
  if (!isObject(a) || typeof a.uid !== 'string' || !a.uid) return null
  const out: RememberedAccount = {
    uid: a.uid,
    name: typeof a.name === 'string' ? a.name : '',
    email: typeof a.email === 'string' ? a.email : '',
    photo: typeof a.photo === 'string' && a.photo ? a.photo : null,
  }
  if (a.out === true) out.out = true
  return out
}

/** The sync memory in storage, or null when it isn't one (versions before accounts saved it as "[object Object]"). */
export function syncMemoryFrom(raw: unknown): SyncMemory | null {
  const m = parse(raw)
  if (!isObject(m) || typeof m.uid !== 'string' || !m.uid) return null
  const known: Record<string, Known> = {}
  if (isObject(m.known)) {
    for (const [key, k] of Object.entries(m.known)) {
      if (key !== '__proto__' && isObject(k) && typeof k.hash === 'string' && typeof k.updatedAt === 'number' && Number.isFinite(k.updatedAt)) {
        known[key] = { hash: k.hash, updatedAt: k.updatedAt }
      }
    }
  }
  const photos = Array.isArray(m.photos) ? m.photos.filter((p): p is string => typeof p === 'string') : []
  return { uid: m.uid, known, photos }
}

// ---------- signing in ----------

export type SignInMethod = 'popup' | 'redirect'

/** What the sign-in method depends on, read from the browser by the app. */
export interface SignInEnv {
  /** Where the app runs (location.hostname). */
  host: string
  /** Firebase's authDomain: the app's own address, where Google's sign-in page returns to. */
  authDomain: string
  /** Opened from the Home Screen: navigator.standalone, or display-mode standalone, fullscreen or minimal-ui. */
  standalone: boolean
  /** A touch screen is the main pointer (pointer: coarse). */
  coarse: boolean
  /** A phone or tablet by its user agent (accountMobileUA). */
  mobileUA: boolean
}

/** The app runs on its own address: Firebase's authDomain, where Google's sign-in page returns to. */
export function accountOwnAddress(host: string, authDomain: string): boolean {
  const h = host.trim().toLowerCase()
  return !!h && h === authDomain.trim().toLowerCase()
}

/**
 * How to sign in (D31). On the app's own address, an installed app, a phone or a tablet goes to Google's page and back
 * (a redirect: pop-ups fail in Home Screen apps and are often blocked on phones), and a desktop browser opens a pop-up.
 * Anywhere else (localhost, tests) a pop-up, as before: a redirect started away from the app's own address loses its
 * state in browsers that partition storage ("missing initial state").
 */
export function accountSignInMethod(env: SignInEnv): SignInMethod {
  if (!accountOwnAddress(env.host, env.authDomain)) return 'popup'
  return env.standalone || env.coarse || env.mobileUA ? 'redirect' : 'popup'
}

/** A phone or tablet browser by its user agent. iPads ask for the desktop site, but have touch points. */
export function accountMobileUA(ua: string, touchPoints = 0): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|IEMobile|Opera Mini/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)
}

/** The steps of one sign-in, for accountSignIn (the app passes Firebase's). */
export interface SignInSteps {
  method: SignInMethod
  /** The app runs on its own address, where a redirect keeps its state. */
  own: boolean
  /** Firebase is loaded, so a pop-up can open straight away, inside the tap. */
  loaded: boolean
  /** Loads Firebase; false when it couldn't. */
  load: () => Promise<boolean>
  popup: () => Promise<unknown>
  redirect: () => Promise<unknown>
}

const codeOf = (e: unknown) => String((e as { code?: unknown } | null)?.code ?? '')

/** Calls `fn` now, turning a thrown error into a rejection. */
function now(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    return fn()
  }
  catch (e) {
    return Promise.reject(e)
  }
}

/**
 * Runs a sign-in (D31) and resolves to the way it went ahead ('none' when Firebase couldn't load). With Firebase loaded
 * and a pop-up wanted, the pop-up is asked for straight away, before anything is awaited (otherwise Safari blocks it as
 * not coming from the tap); a blocked pop-up on the app's own address falls back to a redirect. With Firebase not
 * loaded yet, it loads first; the tap's moment has then passed, so the app's own address redirects while any other
 * address still tries the pop-up, as before. Other errors (a pop-up closed, a redirect refused) reject.
 */
export function accountSignIn(steps: SignInSteps): Promise<SignInMethod | 'none'> {
  if (steps.loaded && steps.method === 'popup') {
    return now(steps.popup).then(() => 'popup' as const, (e: unknown) => {
      if (steps.own && codeOf(e) === 'auth/popup-blocked') return now(steps.redirect).then(() => 'redirect' as const)
      throw e
    })
  }
  return steps.load().then(async (ok): Promise<SignInMethod | 'none'> => {
    if (!ok) return 'none'
    if (steps.method === 'redirect' || steps.own) {
      await now(steps.redirect)
      return 'redirect'
    }
    await now(steps.popup)
    return 'popup'
  })
}

// ---------- the device's copy ----------

export type AccountDecision = 'keep' | 'adopt' | 'clear' | 'ask'

/**
 * What happens to this device's copy when an account signs in (D35, D42), by uid. The remembered account signing in
 * again keeps it. Another account clears it first (nothing of it may be shown to that account or uploaded to it); when
 * the copy holds changes that haven't reached the remembered account yet (`pending`: items and photos), the app asks
 * first, since clearing would lose them for good. With no remembered account (the app used before accounts), a copy
 * with anything in it is adopted: merged into the account, as before; an empty one is simply kept.
 */
export function accountOnSignIn(o: { remembered?: string | null, incoming: string, hasLocalData: boolean, pending?: number }): AccountDecision {
  if (o.remembered) {
    if (o.remembered === o.incoming) return 'keep'
    return (o.pending ?? 0) > 0 ? 'ask' : 'clear'
  }
  return o.hasLocalData ? 'adopt' : 'keep'
}

const changes = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`
const them = (n: number) => (n === 1 ? 'it' : 'them')

/**
 * The question before another account's sign-in clears changes that haven't reached the remembered account (D42).
 * OK removes them and goes on as the other account; Cancel (or closing the question) keeps them.
 */
export function accountSwitchQuestion(n: number, from: string, to: string): string {
  const f = from || 'the account used here before'
  return `This device has ${changes(n)} for ${f} that ${n === 1 ? 'hasn\'t' : 'haven\'t'} reached that account yet. `
    + `Remove ${them(n)} and continue as ${to || 'the new account'}? Cancel keeps ${them(n)}: sign in with ${f} to save ${them(n)}.`
}

/** What the sign-in button says once those changes were kept and the other account signed out again (D42). */
export function accountSwitchKept(n: number, from: string, to: string): string {
  const f = from || 'the account used here before'
  const what = n === 1 ? 'the change' : `the ${n} changes`
  return `Not signed in as ${to || 'the new account'}, so ${what} for ${f} ${n === 1 ? 'stays' : 'stay'} on this device. `
    + `Sign in with ${f} to save ${them(n)}.`
}

/**
 * How many items this device hasn't agreed with the cloud yet (D36). `local` lists each item on the device as
 * [itemKey, JSON]; `known` is what the two last agreed on. An item counts when it is new or changed here, or deleted
 * here while the cloud still has it.
 */
export function accountUnsynced(local: Iterable<readonly [string, string]>, known: Record<string, Known> = {}): number {
  let n = 0
  const here = new Set<string>()
  for (const [key, json] of local) {
    here.add(key)
    const k = own(known, key) ? known[key] : undefined
    if (k?.hash !== jsonHash(json)) n++
  }
  for (const [key, k] of Object.entries(known)) {
    if (k?.hash && !here.has(key)) n++
  }
  return n
}
