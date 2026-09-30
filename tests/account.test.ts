import { describe, expect, it } from 'vitest'
import {
  accountFrom, accountMobileUA, accountOnSignIn, accountSignIn, accountSignInMethod, accountSwitchKept, accountSwitchQuestion,
  accountUnsynced, syncMemoryFrom, type SignInEnv, type SignInSteps,
} from '../shared/utils/account'
import { itemKey, jsonHash } from '../shared/utils/sync'

const OWN = 'travela-emre.firebaseapp.com'
const env = (o: Partial<SignInEnv> = {}): SignInEnv => ({ host: OWN, authDomain: OWN, standalone: false, coarse: false, mobileUA: false, ...o })

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15'
const WIN_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

describe('accountSignInMethod (D31)', () => {
  it('redirects an installed Home Screen app on the app\'s own address', () => {
    expect(accountSignInMethod(env({ standalone: true }))).toBe('redirect')
  })

  it('redirects a touch device on the app\'s own address, by pointer or by user agent', () => {
    expect(accountSignInMethod(env({ coarse: true }))).toBe('redirect')
    expect(accountSignInMethod(env({ mobileUA: true }))).toBe('redirect')
  })

  it('opens a pop-up in a desktop browser tab on the app\'s own address', () => {
    expect(accountSignInMethod(env())).toBe('popup')
  })

  it('opens a pop-up on any other address, even on a phone or from the Home Screen', () => {
    for (const host of ['localhost', '127.0.0.1', 'travela-emre.web.app', 'mrshn.github.io', '']) {
      expect(accountSignInMethod(env({ host, standalone: true, coarse: true, mobileUA: true }))).toBe('popup')
    }
  })

  it('compares addresses without regard to case or stray spaces', () => {
    expect(accountSignInMethod(env({ host: 'Travela-Emre.FirebaseApp.com', coarse: true }))).toBe('redirect')
    expect(accountSignInMethod(env({ authDomain: ` ${OWN} `, coarse: true }))).toBe('redirect')
  })
})

describe('accountMobileUA', () => {
  it('knows phones and tablets', () => {
    expect(accountMobileUA(IPHONE)).toBe(true)
    expect(accountMobileUA(ANDROID)).toBe(true)
    // An iPad asking for the desktop site says Macintosh, but has touch points.
    expect(accountMobileUA(MAC_SAFARI, 5)).toBe(true)
  })

  it('leaves desktop browsers out', () => {
    expect(accountMobileUA(MAC_SAFARI, 0)).toBe(false)
    expect(accountMobileUA(WIN_CHROME, 10)).toBe(false) // a touch laptop is still a desktop browser
    expect(accountMobileUA('')).toBe(false)
  })
})

/** Fake Firebase steps that record what was asked for, and whether a pop-up was asked for inside the call. */
function fake(o: { method: SignInSteps['method'], own: boolean, loaded: boolean, popupError?: string, loadOk?: boolean }) {
  const calls: string[] = []
  let inCall = false
  let popupInCall: boolean | null = null
  const steps: SignInSteps = {
    method: o.method,
    own: o.own,
    loaded: o.loaded,
    load: async () => {
      calls.push('load')
      return o.loadOk ?? true
    },
    popup: () => {
      calls.push('popup')
      popupInCall = inCall
      return o.popupError ? Promise.reject(Object.assign(new Error(o.popupError), { code: o.popupError })) : Promise.resolve('user')
    },
    redirect: () => {
      calls.push('redirect')
      return Promise.resolve()
    },
  }
  const run = () => {
    inCall = true
    try {
      return accountSignIn(steps)
    }
    finally {
      inCall = false
    }
  }
  return { steps, calls, run, popupInCall: () => popupInCall }
}

describe('accountSignIn (D31)', () => {
  it('asks for the pop-up inside the tap, before anything is awaited, once Firebase is loaded', async () => {
    const f = fake({ method: 'popup', own: true, loaded: true })
    const done = f.run()
    // Synchronously, still inside the call the tap made:
    expect(f.calls).toEqual(['popup'])
    expect(f.popupInCall()).toBe(true)
    await expect(done).resolves.toBe('popup')
    expect(f.calls).toEqual(['popup'])
  })

  it('falls back to a redirect when the pop-up is blocked on the app\'s own address', async () => {
    const f = fake({ method: 'popup', own: true, loaded: true, popupError: 'auth/popup-blocked' })
    await expect(f.run()).resolves.toBe('redirect')
    expect(f.calls).toEqual(['popup', 'redirect'])
  })

  it('keeps a blocked pop-up an error on other addresses (as before: no redirect off the app\'s own address)', async () => {
    const f = fake({ method: 'popup', own: false, loaded: true, popupError: 'auth/popup-blocked' })
    await expect(f.run()).rejects.toMatchObject({ code: 'auth/popup-blocked' })
    expect(f.calls).toEqual(['popup'])
  })

  it('does not redirect when the pop-up was closed or failed for another reason', async () => {
    const f = fake({ method: 'popup', own: true, loaded: true, popupError: 'auth/popup-closed-by-user' })
    await expect(f.run()).rejects.toMatchObject({ code: 'auth/popup-closed-by-user' })
    expect(f.calls).toEqual(['popup'])
  })

  it('redirects on a phone or Home Screen app, and never opens a pop-up', async () => {
    for (const loaded of [true, false]) {
      const f = fake({ method: 'redirect', own: true, loaded })
      await expect(f.run()).resolves.toBe('redirect')
      // (load() resolves at once when Firebase is already loaded; a redirect needs no tap.)
      expect(f.calls).toEqual(['load', 'redirect'])
    }
  })

  it('loads Firebase first when it is not loaded yet, then redirects on the app\'s own address (the tap has passed)', async () => {
    const f = fake({ method: 'popup', own: true, loaded: false })
    const done = f.run()
    expect(f.calls).toEqual(['load'])
    await expect(done).resolves.toBe('redirect')
    expect(f.calls).toEqual(['load', 'redirect'])
  })

  it('loads Firebase first on other addresses, then opens the pop-up as before', async () => {
    const f = fake({ method: 'popup', own: false, loaded: false })
    await expect(f.run()).resolves.toBe('popup')
    expect(f.calls).toEqual(['load', 'popup'])
    expect(f.popupInCall()).toBe(false)
  })

  it('does nothing more when Firebase cannot load', async () => {
    const f = fake({ method: 'redirect', own: true, loaded: false, loadOk: false })
    await expect(f.run()).resolves.toBe('none')
    expect(f.calls).toEqual(['load'])
  })

  it('turns a pop-up that throws straight away into a rejection', async () => {
    const f = fake({ method: 'popup', own: false, loaded: true })
    f.steps.popup = () => {
      throw Object.assign(new Error('boom'), { code: 'auth/argument-error' })
    }
    await expect(f.run()).rejects.toMatchObject({ code: 'auth/argument-error' })
  })
})

describe('accountOnSignIn (D35)', () => {
  it('keeps the copy when the remembered account signs in again', () => {
    expect(accountOnSignIn({ remembered: 'alice', incoming: 'alice', hasLocalData: true })).toBe('keep')
    expect(accountOnSignIn({ remembered: 'alice', incoming: 'alice', hasLocalData: false })).toBe('keep')
  })

  it('clears the copy first when another account signs in, whatever it holds', () => {
    expect(accountOnSignIn({ remembered: 'alice', incoming: 'bob', hasLocalData: true })).toBe('clear')
    expect(accountOnSignIn({ remembered: 'alice', incoming: 'bob', hasLocalData: false })).toBe('clear')
    expect(accountOnSignIn({ remembered: 'alice', incoming: 'bob', hasLocalData: true, pending: 0 })).toBe('clear')
  })

  it('asks first when the copy holds changes that haven\'t reached the remembered account (D42)', () => {
    expect(accountOnSignIn({ remembered: 'alice', incoming: 'bob', hasLocalData: true, pending: 2 })).toBe('ask')
    expect(accountOnSignIn({ remembered: 'alice', incoming: 'bob', hasLocalData: false, pending: 1 })).toBe('ask')
    // The same account never asks: its changes go up once it is signed in.
    expect(accountOnSignIn({ remembered: 'alice', incoming: 'alice', hasLocalData: true, pending: 3 })).toBe('keep')
    // A copy from before accounts is adopted, changes and all.
    expect(accountOnSignIn({ remembered: null, incoming: 'alice', hasLocalData: true, pending: 3 })).toBe('adopt')
  })

  it('words the question and what follows a "keep them" (D42)', () => {
    const q = accountSwitchQuestion(2, 'alice@example.com', 'bob@example.com')
    expect(q).toBe('This device has 2 changes for alice@example.com that haven\'t reached that account yet. Remove them and continue as bob@example.com? Cancel keeps them: sign in with alice@example.com to save them.')
    expect(accountSwitchQuestion(1, 'alice@example.com', 'bob@example.com')).toContain('1 change for alice@example.com that hasn\'t reached that account yet. Remove it and')
    expect(accountSwitchKept(2, 'alice@example.com', 'bob@example.com')).toBe('Not signed in as bob@example.com, so the 2 changes for alice@example.com stay on this device. Sign in with alice@example.com to save them.')
    expect(accountSwitchKept(1, 'alice@example.com', 'bob@example.com')).toBe('Not signed in as bob@example.com, so the change for alice@example.com stays on this device. Sign in with alice@example.com to save it.')
    // Accounts without an email still read.
    expect(accountSwitchQuestion(1, '', '')).toContain('for the account used here before')
    for (const s of [q, accountSwitchKept(3, '', '')]) expect(s).not.toContain(String.fromCharCode(0x2014))
  })

  it('adopts a copy from before accounts (no remembered account) into the account that signs in', () => {
    expect(accountOnSignIn({ remembered: null, incoming: 'alice', hasLocalData: true })).toBe('adopt')
    expect(accountOnSignIn({ remembered: undefined, incoming: 'alice', hasLocalData: true })).toBe('adopt')
    expect(accountOnSignIn({ remembered: '', incoming: 'alice', hasLocalData: true })).toBe('adopt')
  })

  it('simply keeps an empty device with no remembered account', () => {
    expect(accountOnSignIn({ remembered: null, incoming: 'alice', hasLocalData: false })).toBe('keep')
  })
})

describe('accountUnsynced (D36)', () => {
  const trip = JSON.stringify({ id: 'rome', title: 'Rome' })
  const progress = JSON.stringify({ stops: { a: { status: 'done', at: '2026-10-09T09:10:00Z' } } })
  const tk = itemKey('trip', 'rome')
  const pk = itemKey('progress', 'rome')

  it('is 0 when everything here is what the cloud last agreed on', () => {
    const known = { [tk]: { hash: jsonHash(trip), updatedAt: 1 }, [pk]: { hash: jsonHash(progress), updatedAt: 2 } }
    expect(accountUnsynced([[tk, trip], [pk, progress]], known)).toBe(0)
  })

  it('counts items changed here or new here', () => {
    const known = { [tk]: { hash: jsonHash(trip), updatedAt: 1 } }
    const changed = JSON.stringify({ id: 'rome', title: 'Rome (edited)' })
    expect(accountUnsynced([[tk, changed], [pk, progress]], known)).toBe(2)
  })

  it('counts items deleted here that the cloud still has, but not agreed deletions', () => {
    const known = { [tk]: { hash: jsonHash(trip), updatedAt: 1 }, [pk]: { hash: '', updatedAt: 2 } }
    expect(accountUnsynced([], known)).toBe(1)
  })

  it('counts everything on a device that never synced', () => {
    expect(accountUnsynced([[tk, trip], [pk, progress]])).toBe(2)
    expect(accountUnsynced([])).toBe(0)
  })

  it('reads keys that shadow object properties as unknown', () => {
    const key = 'constructor'
    expect(accountUnsynced([[key, trip]], {})).toBe(1)
  })
})

describe('what the device remembers', () => {
  it('reads a remembered account and tidies it', () => {
    expect(accountFrom('{"uid":"u1","name":"A","email":"a@example.com","photo":"https://x/p.png"}'))
      .toEqual({ uid: 'u1', name: 'A', email: 'a@example.com', photo: 'https://x/p.png' })
    expect(accountFrom({ uid: 'u1', out: true, photo: '' })).toEqual({ uid: 'u1', name: '', email: '', photo: null, out: true })
    expect(accountFrom({ uid: 'u1', out: 'yes' })).toEqual({ uid: 'u1', name: '', email: '', photo: null })
  })

  it('reads anything else as no account', () => {
    for (const raw of [null, undefined, '', 'null', '[object Object]', '{"uid":""}', '{"uid":7}', '[]', '"u1"', 5]) {
      expect(accountFrom(raw)).toBeNull()
    }
  })

  it('reads the sync memory, and the "[object Object]" that versions before accounts saved as none', () => {
    expect(syncMemoryFrom('[object Object]')).toBeNull()
    expect(syncMemoryFrom(null)).toBeNull()
    expect(syncMemoryFrom('{"known":{}}')).toBeNull()
    const m = syncMemoryFrom(JSON.stringify({
      uid: 'u1',
      known: { 'trip-rome': { hash: 'h', updatedAt: 5 }, 'bad': { hash: 1, updatedAt: 5 }, 'nan': { hash: 'h', updatedAt: null } },
      photos: ['ph1', 3, 'ph2'],
    }))
    expect(m).toEqual({ uid: 'u1', known: { 'trip-rome': { hash: 'h', updatedAt: 5 } }, photos: ['ph1', 'ph2'] })
    expect(syncMemoryFrom({ uid: 'u1' })).toEqual({ uid: 'u1', known: {}, photos: [] })
  })

  it('never lets a stored "__proto__" key through', () => {
    const m = syncMemoryFrom('{"uid":"u1","known":{"__proto__":{"hash":"h","updatedAt":1}}}')
    expect(m && Object.keys(m.known)).toEqual([])
    expect(Object.getPrototypeOf(m!.known)).toBe(Object.prototype)
  })
})
