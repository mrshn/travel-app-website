export default defineAppConfig({
  /** Where this app's content lives (for "Edit on GitHub" links). */
  repo: 'mrshn/travel-app-website',
  branch: 'main',

  /** Firebase web config. Not secret: access is controlled by the security rules in firebase/. */
  firebase: {
    apiKey: 'AIzaSyAuz_BsebA30tfmv3V2c6N-d1PVvEwhKU8',
    authDomain: 'travela-emre.firebaseapp.com',
    projectId: 'travela-emre',
    storageBucket: 'travela-emre.firebasestorage.app',
    messagingSenderId: '954018683436',
    appId: '1:954018683436:web:6a47cbcd569f4f82c80f89',
  },

  /** Google Maps Platform key (Map Tiles + Routes), locked to this app's addresses in Google Cloud. */
  mapsKey: 'AIzaSyCzkWA20wqmrvdgPwTtM0gpPWLK_FZa-P4',

  /** The app's one home, on Firebase Hosting (sign-in works best there, including from the Home Screen). */
  appUrl: 'https://travela-emre.firebaseapp.com/',
})
