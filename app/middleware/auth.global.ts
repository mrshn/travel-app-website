// Sign-in required (spec D33): a device with no account sees the landing page at "/", and every other route sends it
// there. A remembered account opens as usual, offline too, while Firebase picks up its session in the background.
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || to.path === '/') return
  const cloud = useCloud()
  if (cloud.account.value || cloud.signedIn.value) return
  return navigateTo('/', { replace: true })
})
