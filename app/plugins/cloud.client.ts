// Keeps the app on one address and reconnects your Google account when the app opens.
export default defineNuxtPlugin(() => {
  const config = useAppConfig()
  // Firebase Hosting answers on two addresses; your data is stored per address, so use one.
  if (location.hostname === `${config.firebase.projectId}.web.app`) {
    location.replace(`https://${config.firebase.authDomain}${location.pathname}${location.search}${location.hash}`)
    return
  }
  const cloud = useCloud()
  if (cloud.enabled.value) void cloud.start()
  // Emulator builds (tests) expose the stores so a test can drive two "devices".
  if (useRuntimeConfig().public.firebaseEmulators) {
    Object.assign(window, { __travelsTest: { cloud, trips: useTrips().trips, progress: useProgressStore(), photos: usePhotos() } })
  }
})
