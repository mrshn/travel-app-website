# Travels

A trip companion that tells you **what to do right now**, follows you on the map, and keeps track of **what you planned, what you did and what's left**, across all your trips.

It ships with a full 5-day plan for **Rome, 8–12 October 2026** (first trip abroad, solo, social hostel) and you can add your own trips.

<p>
  <img src="docs/screenshots/now.webp" width="240" alt="The Now screen: the stop you should be at, time left, and when to leave for the next one">
  <img src="docs/screenshots/plan.webp" width="240" alt="A day's timeline with stops ticked off">
  <img src="docs/screenshots/progress.webp" width="240" alt="Progress: planned vs done vs left">
</p>

## What it does

**Now**: the live guide for this exact moment
- The stop you should be at, how long it has left, and a one-tap **Done**, **Skip** or **Go** (Google Maps directions).
- The next stop with a **leave-by time**, worked out from where you are (or the previous stop, or your hostel) with a walking or transit estimate.
- "Time to go" when a gap is ending, "free time" when it isn't, and a clear end-of-day screen with a day rating.
- Timed alerts for the day (dress code, sunset, last metro) and **leave reminders** (a notification or in-app nudge while the app is open).
- **Did you do these?**: earlier stops you haven't marked, one tap each.
- A live map that **follows you** (GPS dot, accuracy ring, compass heading where the phone has one) with today's route, plus an arrow and distance to your next stop.
- **Preview any moment** of the trip before you go ("what will it tell me on Friday at 16:40?"). Add `?at=2026-10-09T16:40` to the Now URL to jump there.
- Before the trip it becomes a countdown with what to book now and your packing progress; after it, a summary of the trip.

**Plan**: day by day
- Timeline per day with times, costs, must-do / optional / skip-if-tired tags and small logistics steps you can hide.
- Stops with options ("Pick your ride into Rome", "Pick your Friday night") where you choose one and the rest of the app follows your choice.
- Trip-wide variants: switching the Colosseum from Saturday to Sunday rearranges both days.
- Add, edit, move or delete stops; drop a pin on the map, use your location or paste a Google Maps link.

**Feedback and progress**
- Rate every stop, tag it (Loved it, Hidden gem, Too crowded…), write a note, log what you spent and add photos.
- **Progress**: planned vs done vs skipped vs not marked vs still to come, per day and per kind (sights, food, nights), money logged vs planned budget (with the lira conversion), your top-rated stops.
- **Journal**: everything you did, day by day, with notes and photos; download it as Markdown.
- **What's left**: upcoming stops, unmarked ones, bookings and packing.

**Everything else from the research**: bookings with due dates and tick-offs, a packing list, 81 places (sights, food, photo spots) with open days and "add to plan", the full guide (money with a converter, phone, safety, getting around, departure day, useful Italian you can listen to), and an SOS screen with tap-to-call numbers and a card to show a taxi driver.

**All your trips** on one home screen, with progress bars for the plan and for your preparation.

**Notes & chats**: research, tips and chat logs saved from conversations with Claude, readable in the app (home screen, `/notes`, and each trip's *More* tab). They're Markdown files in [`content/notes`](content/notes).

<p>
  <img src="docs/screenshots/feedback.webp" width="240" alt="Rating, tags, note and spend for a stop">
  <img src="docs/screenshots/night.webp" width="240" alt="The Now screen at night in dark mode">
  <img src="docs/screenshots/home.webp" width="240" alt="All trips">
</p>

## Privacy and offline

- There is no server and no account. Trips and progress are stored in your browser (`localStorage`); photos in IndexedDB. Nothing leaves your phone except map-tile requests to CARTO and the Google Maps links you tap.
- It's an installable PWA: add it to your home screen and it opens full screen and works offline. Map areas you've viewed are cached for when you have no signal.
- **Back up** from *Settings → Export everything* and import the file on another device. Photos stay on the device they were added on.

## Saving chats and trips from Claude

Everything the app shows lives in this repository, so a chat can add to it:

- **Notes** go in `content/notes/YYYY-MM-DD-slug.md` with a small front matter (title, date, kind, trip, summary, tags).
- **Trips** go in `app/data/<trip>.ts` and are listed in `app/data/trips.ts`.

The formats and rules (stable stop ids, real coordinates, what never to publish) are in **[docs/content-guide.md](docs/content-guide.md)**. After a push to `main` the site redeploys in about two minutes. Phones pick up trip changes by themselves: a trip nobody changed updates quietly; one changed on the phone gets an *Update / Keep mine* banner that keeps the person's ticks, notes, photos and own stops.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (time, geo, plan, guide, notes, trip data)
npm run typecheck
npm run generate   # static site in .output/public
```

Stack: Nuxt 4 (client-side SPA, static generation), Vue 3, VueUse, Leaflet with OpenStreetMap/CARTO tiles, idb-keyval, `@vite-pwa/nuxt`, Vitest. The illustrations are original hand-coded SVG, lit for the time of day.

### Project layout

```
app/
  pages/            index (all trips), trips/new, settings,
                    trips/[id]/{now,plan,map,progress,more,bookings,packing,places,guide,sos,settings}
  components/       MapView (Leaflet), StopSheet, StopEditor, FeedbackEditor, DayStrip, …
  composables/      useTrips, useProgress, useTripView, useClock, useGeo, useLiveAlerts, usePhotos, …
  data/trips.ts     the trips that ship with the app (rome.ts is the Rome plan)
  data/notes.ts     loads content/notes/*.md
  utils/            illustration engine, icons, map helpers, UI helpers
shared/
  types/trip.ts     the data model
  utils/            time (trip clock, time zones), geo, plan (states, progress), guide (live guide), text
tests/              Vitest (including checks of every trip's data)
content/notes/      notes and chat logs (Markdown)
public/archive/     standalone pages kept as they were
docs/               content guide and screenshots
```

### Add a trip that ships with the app

Create `app/data/<trip>.ts` exporting a `Trip` (see `shared/types/trip.ts`; `app/data/rome.ts` is a complete example) and add it to `SEED_TRIPS` in `app/data/trips.ts`. See [docs/content-guide.md](docs/content-guide.md). Seeded trips follow newer versions pushed here, and can be reset to the original from *Trip settings*.

## Deploy (GitHub Pages)

The workflow in `.github/workflows/deploy.yml` tests, builds and publishes the site on every push to `main`.
One-time setup: in the repository go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. The app is then served at `https://<user>.github.io/<repo>/`.

## Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, map tiles © [CARTO](https://carto.com/attributions). Fonts: Cinzel, Instrument Sans and IBM Plex Mono (SIL Open Font License), bundled via Fontsource. Trip facts were researched in September 2026; check opening times and rules before you go.
