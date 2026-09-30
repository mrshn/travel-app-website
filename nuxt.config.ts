// https://nuxt.com/docs/api/configuration/nuxt-config
const base = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',
  ssr: false,
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      // Set NUXT_PUBLIC_FIREBASE_EMULATORS=127.0.0.1 when building to use local Firebase emulators (tests).
      firebaseEmulators: '',
    },
  },
  modules: ['@vueuse/nuxt', '@vite-pwa/nuxt'],
  css: [
    // Fonts are bundled with the app (no Google requests, and they work offline).
    '@fontsource/cinzel/600.css',
    '@fontsource/cinzel/700.css',
    '@fontsource-variable/instrument-sans/index.css',
    '@fontsource/ibm-plex-mono/latin-400.css',
    '@fontsource/ibm-plex-mono/latin-ext-400.css',
    '@fontsource/ibm-plex-mono/latin-600.css',
    '@fontsource/ibm-plex-mono/latin-ext-600.css',
    'leaflet/dist/leaflet.css',
    '~/assets/css/main.css',
  ],
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Travels',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Your travel companion: follow the plan live on a map, tick off what you did, leave feedback and see what is left.' },
        { name: 'theme-color', content: '#8A1538' },
        // A personal travel app: keep it out of search engines.
        { name: 'robots', content: 'noindex, nofollow' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` },
        { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` },
      ],
    },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Travels: trip companion',
      short_name: 'Travels',
      description: 'Follow your travel plans live, track progress and keep a journal.',
      theme_color: '#8A1538',
      background_color: '#F2F3F0',
      display: 'standalone',
      categories: ['travel', 'navigation', 'lifestyle'],
      start_url: base,
      scope: base,
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: base,
      // Standalone pages kept in public/archive open as themselves, not as the app.
      navigateFallbackDenylist: [/\/archive\//],
      globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
      globIgnores: ['**/archive/**'],
      runtimeCaching: [
        {
          // OpenStreetMap tiles you looked at, so the map still shows them offline. Only tiles the map asked for
          // are kept: no prefetching (the OSM tile policy). Status 200 only: an opaque response would hide errors
          // and count about 7 MB against the phone's storage quota.
          urlPattern: /^https:\/\/tile\.openstreetmap\.org\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'map-tiles-v2',
            expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [200] },
          },
        },
      ],
    },
    client: { installPrompt: true },
    devOptions: { enabled: false },
  },
})
