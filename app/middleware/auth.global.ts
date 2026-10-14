import { socialPublicPath } from '#shared/utils/social'

// Sign-in required (spec D33): a device with no account sees the landing page at "/", and every other route sends it
// there. A remembered account opens as usual, offline too, while Firebase picks up its session in the background.
// Links meant for anyone (an invite, a meetup, a plan link: /f/, /j/, /m/, /p/) open without an account, and show
// nothing of the device's trips (docs/design/2026-10-14-together.md, 4.1).
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || to.path === '/' || socialPublicPath(to.path)) return
  const cloud = useCloud()
  if (cloud.account.value || cloud.signedIn.value) return
  return navigateTo('/', { replace: true })
})
