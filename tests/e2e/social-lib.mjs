// Helpers for the browser checks of the social layer on a memory build (docs/design/2026-10-14-together.md, 8 and 9).
//
//   NUXT_PUBLIC_SOCIAL_BACKEND=memory npm run generate       (a build whose "cloud" lives in the browser)
//   node tests/e2e/<area>.e2e.mjs --build                     (serves .output/public, see lib.mjs)
//
// The device itself is the test account of lib.mjs (TEST_ACCOUNT, uid 'e2e-traveller'). Other people act through the
// memory backend's hooks, on the same page and the same fake cloud:
//
//   import { ALI, act, socialReady } from './social-lib.mjs'
//   await socialReady(page)
//   const token = await act(page, ME, 'createInvite', { kind: 'friend' }).then(i => i.token)
//   await act(page, ALI, 'addFriendByInvite', token)
//   await act(page, ALI, 'createPost', { kind: 'moment', text: 'Ciao' }, [ALI.uid, ME.uid])
import { TEST_ACCOUNT } from './lib.mjs'

/** The device's own account, as a person. */
export const ME = Object.freeze({ uid: TEST_ACCOUNT.uid, name: TEST_ACCOUNT.name, photo: null })
/** Made-up people (nothing personal). */
export const ALI = Object.freeze({ uid: 'u-ali', name: 'Ali Demir', photo: null })
export const CAN = Object.freeze({ uid: 'u-can', name: 'Can Yildiz', photo: null })
export const DENIZ = Object.freeze({ uid: 'u-deniz', name: 'Deniz Aksoy', photo: null })

/** Calls a SocialBackend method as `person` on the page's fake cloud; resolves to its result (as JSON). */
export async function act(page, person, method, ...args) {
  return page.evaluate(async ([p, m, a]) => {
    const b = window.__travelsSocial.as(p)
    try {
      return JSON.parse(JSON.stringify(await b[m](...a) ?? null))
    }
    finally {
      b.close()
    }
  }, [person, method, args])
}

/** Waits until the page's social layer is ready (memory builds: at once once the app has started). */
export async function socialReady(page, timeout = 15000) {
  await page.waitForFunction(() => window.__travelsTest?.social?.state?.value === 'ready', null, { timeout, polling: 100 })
}

/** A copy of the whole fake cloud. */
export function cloudOf(page) {
  return page.evaluate(() => window.__travelsSocial.store())
}

/** Empties the fake cloud (the device keeps its own copy). */
export function resetCloud(page) {
  return page.evaluate(() => window.__travelsSocial.reset())
}

/** Gives a made-up person their public card, as their own app does when it first starts (so names show). */
export async function profileOf(page, person, extra = {}) {
  return act(page, person, 'saveProfile', { name: person.name, photo: person.photo, ...extra })
}

/** Makes `a` and `b` friends through a's friend link (both get their public card first). */
export async function befriend(page, a, b) {
  await profileOf(page, a)
  await profileOf(page, b)
  const inv = await act(page, a, 'createInvite', { kind: 'friend' })
  await act(page, b, 'addFriendByInvite', inv.token)
  return inv.token
}
