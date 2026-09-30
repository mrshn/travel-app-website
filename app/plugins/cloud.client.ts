// Keeps the app on one address, reconnects your Google account when the app opens, and keeps a device with no
// account on the landing page.
export default defineNuxtPlugin(() => {
  const config = useAppConfig()
  // Firebase Hosting answers on two addresses; your data is stored per address, so use one.
  if (location.hostname === `${config.firebase.projectId}.web.app`) {
    location.replace(`https://${config.firebase.authDomain}${location.pathname}${location.search}${location.hash}`)
    return
  }
  const cloud = useCloud()
  if (cloud.enabled.value) void cloud.start()

  // Signed out (here or in another tab) or removed from this device: back to the landing page (spec D33, D36).
  // Opening a route is checked by middleware/auth.global.ts.
  const router = useRouter()
  watch(() => !cloud.account.value && !cloud.signedIn.value, (out) => {
    if (out && router.currentRoute.value.path !== '/') void router.replace('/')
  })

  // Emulator builds (tests) expose the stores so a test can drive two "devices".
  if (useRuntimeConfig().public.firebaseEmulators) {
    const trips = useTrips()
    Object.assign(window, { __travelsTest: { cloud, trips: trips.trips, addSample: trips.addSample, progress: useProgressStore(), photos: usePhotos() } })
  }
})
