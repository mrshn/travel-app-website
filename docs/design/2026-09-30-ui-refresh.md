# Travels UI refresh: costs, a places collection and a light game

Design and build spec, written 30 Sep 2026 for the Rome trip (Thu 8 to Mon 12 Oct 2026).
Branch `ui-refresh`. It merges six reviews of the app (product, design, QA, engineering, growth and the
traveller's own walk-through of a full Rome day) into one plan. Where they disagreed, section 2 records the
choice, the alternatives and why.

Everything here must work offline, on a 390 px phone held in one hand, in light and dark mode, with no new
dependencies, fonts, images or CDNs, and with no change to `app/data/rome.ts`.

---

## 1. Goals

The owner's request, verbatim: "improve the ui ux of the website as a product engineer tester designer
developer investor user views". The owner's four tips, verbatim:

1. "More category about the places -> have little info cards about the places, categorize make it more like a game"
2. "Definetly add seperate page to track the cost. Easy way to add the cost."
3. "Add more gamification to whole app but keep it simple and travel fun."
4. "Generally categorize better and have better ui both on the mobile as well. The ui focus is mobile."

What "done" means for this build:

| Tip | Outcome |
|---|---|
| 1. Places as categorised little cards, like a game | Places is a tab. 81 places sit in 11 sets (Ancient sites, Museums & art, Trattorias & pasta, Golden hour…) as 2-column cards of 200 px or less. Each set shows its progress ("2/7"). Places get stamps, by hand or automatically when you tick the stop in your plan. |
| 2. A separate costs page and an easy add | Costs is a tab and a page. Adding takes three moves from any screen: the Costs tab, the amount on an in-app keypad, then what it was for (that tap saves). Ticking a stop with a fixed price offers **Log €7** in the toast. Totals show against the daily plan in € and ≈ ₺. |
| 3. Gamification across the app, simple and travel fun | One currency, stamps. Stamps fill sets, a Roman rank rises with them (Peregrinus to Imperator), and 12 badges reward real trip moments (Early bird, Golden hour, Night owl, Money diary…). Everything is derived from what you already do. No points, streaks or pop-ups. |
| 4. Better categories and a mobile-first UI | A bottom bar of the five thumb jobs (Now, Plan, Places, Costs, More), a grouped More hub, a shorter Plan top, 44 px touch targets, no sideways scroll at 320 px, a trip-status line in the header, and a late-night "Getting back" card on Now. |

Not goals: a new live guide (Now's hero, leave-by logic, alerts and live map stay as they are), social features,
bill splitting, receipt scanning, live exchange rates, notifications for game events, and any edit to the Rome seed.

---

## 2. Decisions

Each decision was taken by the lead on the evidence in the six reviews; the owner can reverse any of them.

**D1. Bottom bar: Now · Plan · Places · Costs · More.**
Alternatives: a raised "Add cost" coin in the centre with Places and More (design review); a floating "+ €" button
(growth); Now · Plan · Explore · Wallet · Passport (traveller); Now · Plan · Map · Wallet · Passport (growth).
Why: these are the five jobs of the trip (what now, the day, what's worth it nearby, money, everything else).
A tab gives the costs page its own home, which the owner asked for, and makes adding a cost one tap away from
every screen without a button that floats over Plan's tick column, the map controls or the toast's Undo.
Map leaves the bar because every map job has a closer home: Now's live map, Plan's day map (both with an expand
button), the Places "Map" chip and a More row. Progress leaves the bar because it is read once a day at most.

**D2. The page is called Costs.** Alternatives: Wallet, Money. Why: the owner's own words ("track the cost",
"add the cost"); "Money" already names a Guide section; "Wallet" sounds like payments. Route `/trips/<id>/costs`,
icon `wallet` (exists).

**D3. One cost pad, inline on the Costs page and in a sheet elsewhere; an in-app keypad; the category tap saves.**
Alternatives: a native decimal field (product), a sheet with a Save button (design), chips inside the Done toast
(traveller). Why: the in-app keypad never raises the phone keyboard, so nothing hides the buttons and the comma
problem on Turkish and Italian keypads cannot happen. "Type the amount, then tap what it was for" is two moves;
from any screen it is three interactions (Costs tab, amount, category). Editing an existing cost uses explicit
Save and Delete buttons instead, so changing the category never saves by accident.

**D4. Log from the moment you pay.** When you tick a stop Done and its planned cost is one euro amount ("€7",
"€1.50 tap", "about €13"), the toast offers **Log €7** (one tap). When it is a range ("~€10–15") the toast offers
**Add cost**, which opens the sheet with €10 and €15 as quick picks. Ticking a booking with one amount offers
**Log €25**. Alternatives: three spend chips in the toast (traveller). Why: a toast holds two actions next to Undo
at most; the cost list's "Not logged yet" catches the rest.

**D5. Every purchase is its own record; old spend fields are read, never migrated.**
New costs live in `TripProgress.expenses` keyed by id, with `updatedAt`, and deletions are tombstones.
`Feedback.spent` and `DayNote.extraSpent` show as read-only "Logged earlier" rows. Editing or deleting one writes
a normal record under a fixed id (`legacy-stop-<stopId>`, `legacy-day-<dayId>`), and a record with that id
(live or deleted) hides the old value. The old fields are never cleared and nothing new is written to them.
Alternatives: convert and clear the old field (product, design); keep editing the old fields (engineering);
migrate everything on load (QA). Why: no migration code, no double counting even when two devices edit the same
old value, and nothing can resurrect an old number through the existing union merge.

**D6. One source of truth for totals.** `costSummary()` feeds `summarize()`, so Now, Plan, Progress, Home and
Costs always show the same numbers. It also fixes the bug where money left the totals when the Colosseum day
changed or a stop was deleted: costs belong to days, not to stops of the active plan.

**D7. Which day a cost counts to.** The trip day of the app's clock (the 05:00 rule: a 01:30 drink is the night
before), shown on a chip you can change ("Before the trip", "Thu 8"…). While previewing, the chip follows the
previewed day, the pad says so, and the record gets `preview: true` so the Costs page can remove all rehearsal
costs in one tap. `at` is always the real time. Alternatives: always the real clock (design, QA). Why: while you
rehearse Friday, the Costs page shows Friday; saving to "Before the trip" would look like a lost cost.

**D8. Six categories: Food, Sights, Nightlife, Transport, Stay, Other.** The first four match the trip budget
(sights, food, night, transport). Stay (hostel, city tax) and "Before the trip" costs are never compared with the
daily plan, because the plan excludes the hostel. Alternatives: Shopping (design, engineering), Tickets (growth).
Why: six fit a 3×2 grid of 48 px buttons; souvenirs go to Other.

**D9. Amounts in euros; lira beside every total.** Totals show "≈ ₺2,065" with Intl's narrow symbol, whole lira,
always "≈", and the rate and its date in the Costs footer. Entering costs in lira and a "₺ first" switch come later
(section 11); `Expense.currency` is stored now so they need no data change. Alternatives: "TL" suffix (traveller),
a € | ₺ toggle now (design). Why: the owner thinks in lira, and nearly all trip spending is in euros.

**D10. Places: small cards grouped in derived sets.** 2 columns at 390 px, cards 200 px or shorter, grouped under
set headers with progress, 4 cards per set and "Show all". Sets come from each place's `scene` and `bestTime`
(Appendix A), with an optional `PlaceCard.set` override for other trips. Filters: Near me, Open today, Free,
Not stamped, Top picks, Map. Alternatives: a flat grid with set chips (design), carousels per group (traveller).
Why: a set header is the "category" and the "album page" at once; grouped grids keep the page under 8 screens
(today 32) and read well with a screen reader.

**D11. Stamps: tapped, or earned by ticking the stop that is that place.** A done stop stamps a place when the
stop's title contains the place's core name as whole words and the kinds fit: sight stops stamp sights, food stops
stamp food, photo stops (a sight stop with the `photo` icon) stamp photo spots. An optional `Stop.placeId` or
`Choice.placeId` links explicitly (set by the stop editor for stops added from a place). Never by distance or GPS;
tourist traps and closed places are never stamped. Tapping writes `stamps[placeId] = { on: true }`; "Remove stamp"
writes `on: false`, which also hides a stamp a done stop would give; undoing a fresh tap writes `on: null`, so a
later tick can still stamp the place. The default plan links 20 places, all 8 top picks included (Appendix B).
Alternatives: explicit `placeId` only (QA), which needs a seed edit; name or 70 m (today's rule), which stamps
Tonnarello, a tourist trap, and the Pantheon from a dinner; one stamp per done stop (growth). Why: honest,
generous, testable, and no seed change.

**D12. "In your plan" uses the same matcher** on the resolved plan (the picked Colosseum day and options).
Tonnarello and the Capitoline Museums lose the chip; the Borghese Gallery gets "In your plan · Sun 14:15".

**D13. The game is stamps, sets, badges and a rank. No XP.** The rank is a Roman title from the number of stamps
(I Peregrinus 0, II Viator 3, III Explorator 8, IV Civis 15, V Tribunus 22, VI Consul 30, VII Imperator 40), always
with its English gloss. 12 badges reward moments (section 4.5). Alternatives: XP from every action with 7 or 8
levels (design, engineering); no rank at all (product, growth, traveller). Why: one currency is simple to
understand, a rank gives the Roman identity and a rare "level up", nothing can be farmed by ticking and unticking,
and nothing new is stored or synced.

**D14. Celebrations are toasts.** A gold toast for a new badge, rank or completed set, once per device, silent
the first time a device computes the game, never while previewing. The stamp presses onto the card in 320 ms
(none with reduced motion). Alternatives: a level-up card with particles and vibration (design). Why: nothing may
cover Done, Go or the leave-by time; the traveller asked for no modals, sounds or vibration.

**D15. Progress stays a page; More becomes a hub; Badges get a page.** More opens with a "Your trip" card
(stops done, rank, stamps, badges, "Progress & journal") and groups the rest (Get ready, Find your way, Help and
settings). `/badges` shows the rank card, the 12 badges and your stamps by day. Alternatives: a Passport tab
(growth, traveller), a level ring in the header (design). Why: the how-to note's promise ("Progress turns all of
that into planned vs done vs left, money vs budget and a journal") stays true, and a real passport and visa are
on the packing list, so the word "Passport" stays out of navigation.

**D16. Header shows the trip status on phones.** Line 2 becomes "Day 2 of 5 · Fri 9" (today it is hidden under
420 px). The SOS pill gets a 44 px hit area. No level chip in the header.

**D17. No change to `app/data/rome.ts` in this build.** Any change alters its fingerprint and shows "Update / Keep
mine" on a phone whose copy was edited. Optional data fixes are listed in section 11.

**D18. Sync stays one JSON per trip, made safe for new records.** `mergeRecords()` merges `expenses` and `stamps`
by id (newer `updatedAt` wins, a deletion wins a tie, then a fixed order, so both devices agree). `mergeProgress()`
keeps top-level fields it does not know. `isPristine()` counts expenses, stamps and the Colosseum-day choice.
`decide()` merges instead of applying a newer cloud copy that lacks both new keys while this device has records
(an old app version merged it). Importing a backup merges instead of replacing. The existing untick resurrection
in two-device merges is left as it is and documented (section 11).

**D19. The offline map uses OpenStreetMap tiles.** CARTO now answers every tile with an "API KEY REQUIRED" image
and the service worker caches it for 60 days, so today's offline map is only watermarks. Switch the fallback to
`tile.openstreetmap.org`, cache viewed tiles only (no prefetch, per the OSM tile policy), and dim them with a CSS
filter in dark mode. Details: the layer is `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with `crossOrigin: true`,
`maxNativeZoom: 19`, `maxZoom: 20` and the attribution "© OpenStreetMap contributors"; the service worker caches it
`CacheFirst` in `map-tiles-v2` (3000 tiles, 30 days, status 200 only: opaque responses would hide errors and count
about 7 MB each against the phone's storage quota); the old `map-tiles` cache of watermarks is deleted once.

**D20. `/map` lights Plan, or Places when opened from Places** (`?from=places`, which also turns the places layer on).

**D21. A late-night "Getting back" card on Now.** From 21:00 on a night out or once the day is done, until 05:00,
Now shows directions home, the card for the taxi driver and a taxi number. It is built from data the trip already
has (home, driver card, SOS taxi entry, the day's metro fact). Why: alone at 01:45 with the metro closed, those
tools sit at the bottom of SOS today.

**D22. Plan's top gets shorter now; day pills later.** The Colosseum question folds into one row once chosen or
once the trip starts, the day's alerts fold under the first one, the day picture is shorter on phones and its
facts become one chip row, so the first stop of the day shows without scrolling.

**D23. Now gets one money row above the hero and nothing else near it.** "€37.00 today · €134.50 left" with an
Add button. The hero, Done/Go/Skip, the Next card's leave-by logic and the live map stay as they are.

**D24. Every tick behaves the same.** One `markStop()` action is used by Now, Plan, the stop sheet, the map card
and Progress, so every tick gives a toast with Undo, names any stamp earned and offers Log when it applies.

**D25. Money diary instead of On budget.** A badge for ending a day under budget rewards logging less, so the
money badge rewards logging on three days instead (QA review).

**D26. No stamping before the trip.** Before Thu 8 Oct the stamp button is replaced by "You can stamp places from
Thu 8 Oct." Stamps made while previewing are real, like ticks.

**D27. Touch targets through a zero-specificity rule.** On touch screens, `.btn.xs`, `.btn.sm`, chips, ticks and
`.hit` get an invisible 44 px hit area through `:where()`, so positioned buttons keep their `position`.

**D28. Build order.** A foundation package lands first and writes two placeholder components (`CostSheet.vue`,
`PlaceSheet.vue`) so the shell can mount them; four packages then work in parallel on files nobody else touches;
an integration package updates the docs, screenshots and end-to-end checks (section 10).

**D29. Every package proves its screens in a phone-sized browser.** The foundation ships `tests/e2e/lib.mjs`
(phone context, Seed S, live and preview clocks, client-side navigation, a static server for the generated site);
each parallel package writes its own `tests/e2e/<area>.e2e.mjs` for the acceptance tests of its screens; the
integration package runs them all on the generated site and adds the cross-screen checks. Alternatives: one
end-to-end file written at the end (engineering), checks by hand only (product). Why: seven days to the trip leave
no room for a regression found on the phone in Rome, and a script can be re-run after every fix.

---

## 3. Information architecture

### 3.1 Tab bar and header

```
┌────────────────────────────────────────────┐
│ ‹  ROME                        [Offline][SOS]│  line 1: back, trip name
│    ● Day 2 of 5 · Fri 9                     │  line 2: trip status (new on phones)
├────────────────────────────────────────────┤
│                 page content               │
├────────────────────────────────────────────┤
│  (◎)     (☰)      (⌖)      (▭)      (▦)    │
│  Now     Plan    Places   Costs    More    │  5 items, each ≥ 44×44 px
└────────────────────────────────────────────┘
```

Icons: Now `target`, Plan `list`, Places `pin`, Costs `wallet`, More `grid`. At 900 px and wider the same five
show as top tabs. Line 2 reads "In 8 days · 8–12 Oct", "Tomorrow · 8–12 Oct", "Today · 8–12 Oct",
"Day 2 of 5 · Fri 9" (with the live dot) or "Trip done · 8–12 Oct"; the separate status chip goes.

### 3.2 Where every screen lives

| Route | Screen | Lit tab | Reached from |
|---|---|---|---|
| `/trips/<id>/now` | Now (live guide) | Now | tab; trip name in the header |
| `/plan` | Plan (days, timeline, day map) | Plan | tab |
| `/map` | Full map | Plan; Places when `?from=places` | Now and Plan map cards (expand); Places "Map" chip; More "Map" row; stop sheet "Map" |
| `/places` | Places collection (rebuilt) | Places | tab |
| `/costs` | **Costs** (new) | Costs | tab; Now money row; Plan "Your day"; Progress money card |
| `/more` | More hub (regrouped) | More | tab |
| `/progress` | Progress & journal | More | More "Your trip" card; Now after the trip |
| `/badges` | **Badges** (new): rank, badges, stamps by day | More | More hub; badge toasts; Places "Top picks" chip |
| `/bookings`, `/packing` | unchanged screens | More | More "Get ready"; Now before the trip |
| `/guide`, `/notes` | unchanged | More | More "Find your way" |
| `/sos` | SOS | More | red SOS pill on every trip page; More |
| `/settings` | Trip settings | More | More "Help and settings" |

The shell decides the lit tab with one map: `map` lights `plan` (or `places` when `route.query.from` starts with
`place`, which covers `from=places` and the stop editor's own `from=place:<id>`);
`progress`, `badges`, `bookings`, `packing`, `guide`, `notes`, `sos`, `settings` and `more` light `more`; every other
section lights itself.

### 3.3 Sheets kept in the URL

Like today's `?stop=`, sheets are query values so the back gesture closes them and a reload reopens them.

| Query | Sheet | Mounted in the shell, in this stacking order |
|---|---|---|
| `?stop=<stopId>` | StopSheet (exists) | 1 |
| `?place=<placeId>` | PlaceSheet (new) | 2 |
| `?edit=new\|<stopId>` | StopEditor (exists) | 3 |
| `?cost=new` with optional `&for=stop:<id>` or `&for=booking:<id>` and `&cday=<dayId>`; `?cost=<expenseId>` to edit | CostSheet (new) | 4 (opens over a stop sheet) |

`cday` is not `day` because Plan and Map already use `?day=`. Going from a place to its stop replaces `place`
with `stop` (no stacked place and stop sheets).

### 3.4 Old deep links

All twelve existing paths (`now`, `plan`, `map`, `progress`, `more`, `places`, `bookings`, `packing`, `guide`, `sos`,
`settings`, `notes`) keep their pages; only the lit tab changes for `/map`, `/places` and `/progress`.
`/progress?view=overview|journal|left` and `/plan?day=&stop=` keep working. New: `/costs` and `/badges`.

---

## 4. Screens

Numbers in the wireframes are the seeded test state of section 9 (Friday 9 Oct 16:40).

### 4.1 Costs page (`/trips/<id>/costs`)

During the trip:

```
┌────────────────────────────────────────────┐
│ FRI 9 OCT · DAY 2 OF 5                     │ kicker
│ Costs                                      │
│ ┌────────────────────────────────────────┐ │ summary card
│ │ Today                          €37.00  │ │ Plex Mono 32
│ │                               ≈ ₺2,065 │ │
│ │ ▰▰▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱  │ │ bar vs the day's plan
│ │ €134.50 left of €171.50                │ │ or "€12.50 over today's plan" (amber)
│ └────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────┐ │ the cost pad (4.2)
│ │ €3.50                   Counts for [Fri 9 ▾]│
│ │ ≈ ₺195                                 │ │
│ │ (At Pantheon ×) (+ Note)               │ │
│ │ [ 1 ] [ 2 ] [ 3 ]                      │ │ keys 48 px
│ │ [ 4 ] [ 5 ] [ 6 ]                      │ │
│ │ [ 7 ] [ 8 ] [ 9 ]                      │ │
│ │ [ . ] [ 0 ] [ ⌫ ]                      │ │
│ │ Type the amount, then tap what it was for.│
│ │ [ Food ] [ Sights ] [Nightlife]        │ │ tap = save, 48 px
│ │ [Transport] [ Stay ] [ Other ]         │ │
│ └────────────────────────────────────────┘ │
│ NOT LOGGED YET                             │
│  Castel Sant'Angelo · €18       [Log €18]  │
│  Early lunch at Bonci · ~€10–15    [Add]   │
│ FRI 9 OCT · TODAY                  €37.00  │
│  08:00 (🎟) Vatican Museums + Si… €12.00   │ legacy rows: "Logged earlier"
│  07:15 (M) Metro A, Termini → Ott… €25.00  │
│ THU 8 OCT                           €9.00  │
│  (▭) Other spending · Logged earlier €9.00 │
│ TRIP SO FAR               €46.00 of ~€503  │
│  Thu ▮┆┆            €9.00 of €21            │ dashed = plan, solid = logged
│  Fri ▮▮▮┆┆┆┆┆┆┆┆   €37.00 of €172           │
│  Sat ┆┆┆┆┆┆┆┆┆┆    of €155 …                │
│ BY KIND                                    │
│  Sights €12.00 of €100 · Food €0.00 of €225│
│  Nightlife €0.00 of €100 · Transport €25.00 of €78
│  Stay €0.00 · Other €9.00 (not in the plan)│
│ Everything €46.00 · ≈ ₺2,567               │
│ 1 € = 55.8 ₺ · ECB, 25 Sep 2026            │
└────────────────────────────────────────────┘
```

- **Summary card by phase.** Before the trip: "Your budget", "~€503", "for 5 days · ≈ ₺28,065", the day plans
  in whole euros ("Thu €21 · Fri €172 · Sat €155 · Sun €123 · Mon €32") and "Where you stay isn't included."
  During: as drawn; with no plan for the day, only "Today €37.00". After: "All in", the grand total, ≈ ₺, and
  "Trip days €452.00 of ~€503". Trips without `fx` hide every ₺ part; trips without `budget` hide plans and bars.
- **Cost pad** inline (4.2). The day chip defaults to today during the trip, "Before the trip" before it and
  "After the trip" after it. The "At …" chip appears when the stop on now is a sight, food or night stop, and
  links the cost to it; × unlinks.
- **Not logged yet** (during the trip): today's done stops whose planned cost has a euro amount and that have
  no cost logged in their own category. One amount: **Log €18** (one tap). A range: **Add** (opens the sheet
  with the stop linked and the amounts as quick picks). Hidden when empty.
- **Costs by day**, newest day first, "Before the trip" and "After the trip" groups for costs with no day.
  Each row: time (or "Paid before" for a booking paid on another day), category icon, title, amount with cents,
  ≈ ₺ small. Title: the note; else the linked stop or booking when its category matches the cost's; else the
  category name followed by "· at Pantheon". Tap a row to edit it. Legacy rows carry "Logged earlier";
  rehearsal rows carry "Preview".
- **Trip so far**: dashed planned bar and solid logged bar per trip day (the chart that lived on Progress); over
  plan in `--warn`, never red alone, with the words "over".
- **By kind**: six rows, planned for the first four; Stay and Other say "not in the plan".
- **Rehearsal banner**: when any live cost has `preview: true`: "2 costs were logged while previewing."
  [Remove them] (tombstones, with Undo).
- Empty states: "No costs yet. Type an amount, then tap what it was for." and, during the trip, "Nothing logged
  today yet. That first espresso counts too."
- **Number format** (Costs, Now, Plan, Progress): money you logged always shows cents ("€37.00", "€134.50 left");
  the day's plan in the Today card shows cents ("of €171.50"); plans in lists and the trip plan show whole euros
  ("of €78", "~€503"); lira is whole and starts with "≈" ("≈ ₺2,065"). Sums are made in cents.
- Desktop (≥ 900 px): two columns; the summary and pad on the left, the lists on the right.

### 4.2 Cost pad and cost sheet

The pad (`CostPad.vue`) is used inline on the Costs page and inside the sheet (`CostSheet.vue`).

```
Add a cost (sheet, from a stop)              Edit cost (sheet)
┌───────────────────────────────────────┐    ┌───────────────────────────────────────┐
│ Add a cost                          × │    │ Edit cost                           × │
│ For: Castel Sant'Angelo + the Ang… ×  │    │ €12.00        Counts for [Fri 9 ▾]    │
│ €18        Counts for [Fri 9 ▾]       │    │ ≈ ₺670                                │
│ ≈ ₺1,004                              │    │ Logged on this stop before costs had  │
│ ( €18 )                               │    │ their own page.                       │
│ [1][2][3] [4][5][6] [7][8][9] [.][0][⌫]│    │ keypad                                │
│ Type the amount, then tap what it was │    │ [Food] [Sights✓] [Nightlife] …       │
│ for.                                  │    │ What was it? (optional) [__________]  │
│ [Food] [Sights•] [Nightlife]          │    │ [ Delete ]            [ Save ]        │
│ [Transport] [Stay] [Other]            │    └───────────────────────────────────────┘
└───────────────────────────────────────┘
```

- **Amount**: an `<output aria-live="polite">` showing "€" and the typed digits in Plex Mono 600 40 px; empty
  shows a faint "0". Live "≈ ₺1,004" under it. The keypad follows `costPadInput()`: digits, one decimal point
  (the `.` key; `,` and `.` on a physical keyboard), at most 2 decimals and 5 whole digits, no leading zeros,
  ⌫ removes the last character. The largest amount is €99,999.99.
- **Add mode**: the six category buttons save the cost. With no amount they show "Type an amount first" (warn,
  aria-live) and save nothing. After a save the amount and note clear (so a quick second tap cannot save twice),
  the day and stop chips stay, and a toast confirms. The sheet closes after a save; the inline pad stays. The category that fits the context (the linked stop's kind)
  gets a gold ring, not a pressed state.
- **Edit mode** (`?cost=<id>`): categories are toggles (`aria-pressed`), and [Delete] (`btn danger`) and [Save]
  commit. Editing a legacy row saves a record under its fixed id; deleting it writes a tombstone under that id.
  A legacy row explains itself: "Logged on this stop before costs had their own page." or, for a day's other
  spending, "Logged for this day before costs had their own page."
- **Prefill from context**: `for=stop:<id>` links the stop (chip "For: <title>" with ×), suggests its category,
  prefills the amount when its planned cost is one euro amount and nothing is logged for it yet, and shows every
  planned amount as a quick-pick chip that fills the amount. `for=booking:<id>` does the same from the booking,
  counting it to the day of the stop that uses the booking. `cday=<dayId>` presets the day.
- **Note**: "+ Note" opens a one-line field "What was it? (optional)" (80 characters). It is the only field
  that raises the phone keyboard.
- **Preview**: a gold line "Preview is on. This cost is real and counts for Fri 9."
- **Keyboard**: digits, `.`, `,`, Backspace, Enter (Save in edit mode), Escape closes the sheet; focus stays in
  the sheet and returns to the button that opened it.

### 4.3 Places (`/trips/<id>/places`)

```
┌────────────────────────────────────────────┐
│ YOUR COLLECTION                            │
│ Places                          [⌕]  [▯ Map]│ search icon opens a field
│ 3 of 79 stamped          (★ Top picks 2/8) │ chip → /badges
│ ▰▰▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱▱ │
│ [ All 81 | Sights 35 | Food 28 | Photo 18 ]│ .seg.block, remembered
│ (Near me)(Open today)(Free)(Not stamped)(★ Top…) ▸
│ (▥) ANCIENT SITES                    0/10  │ set header, gold when complete
│ Arenas, forums and old stones              │
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ [art 88px] (Top) │ │ [art]      (Top) │ │ cards ≤ 200 px, one button each
│ │ Colosseum +      │ │ Pantheon         │ │ name, 2 lines max
│ │ Forum + Palatine │ │ €7               │ │ one key fact
│ │ In your plan ·   │ │ In your plan ·   │ │ status line
│ │ Sat 08:30        │ │ Fri 17:15        │ │
│ └──────────────────┘ └──────────────────┘ │
│ [ … 2 more cards … ]                       │
│ [ Show all 10 ]                            │
│ (▣) MUSEUMS & ART                    2/7   │
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ [art] (IX·X stamp)│ │ [art] (IX·X)     │ │ stamp mark bottom right
│ │ Vatican Museums  │ │ Castel Sant'…    │ │
└────────────────────────────────────────────┘
```

- **Header**: kicker "Your collection", "3 of 79 stamped" with a thin gold bar (79 = collectable places), and a
  chip "Top picks 2/8" linking to `/badges`. The kicker "Saved for this trip" goes.
- **Category segment**: All 81 · Sights 35 · Food 28 · Photo 18 (persisted as today in `travel:places:cat`).
- **Filter chips** (one scrolling row, 44 px hit areas, not persisted):
  - **Near me**: turns location on, sorts by distance and shows it on cards; places without coordinates go last.
    Blocked location: toast "Location is off. Allow it in your browser settings to sort by distance."
  - **Open today** during the trip: hides places known to be closed on the app's current trip day
    (`placeOpenOn()`); places with no data stay. Before the trip it is today's "Open on…" select; after the trip
    it is hidden.
  - **Free**: price mentions "free" (26 places).
  - **Not stamped**: hides stamped and non-collectable places.
  - **Top picks**: the 8 top picks.
  - **Map**: goes to `/map?day=all&places=1&from=places`.
- **Grouped view** (default): sets in the order of Appendix A, each with icon, label, "stamped/collectable",
  blurb, the first 4 cards and "Show all N" / "Show fewer". Sets with no visible card are hidden. Inside a set:
  top picks first, then places in the plan (by date and time), then the rest in data order; non-collectable
  places last, dimmed. Positions never move when you stamp.
- **Flat view** when searching or with Near me: one grid, no set headers.
- **Card** (`PlaceTile.vue`, one button, opens `?place=<id>`): lazy scene art 88 px with a "Top" chip for top picks
  and a 2 px `--gold-rim` outline; name (14.5 px, 2 lines); one key fact (sights: price, food: price or verdict,
  photo spots: best time); one status line, first match wins: "Stamped" (with the stamp mark over the corner),
  "Closed today", "In your plan · Fri 17:15", "Book ahead" (booking Yes, Recommended, Timed slot, Online, Guided or
  Request form), "Best 06:35–07:15", food verdict ("Worth it", "Mixed reviews", "Overrated"); distance appended
  when location is on. Non-collectable: art at `grayscale(.75)` and chip "Tourist trap" or "Closed".
- **Empty**: "Nothing here with these filters." [Clear filters].
- Grid: `repeat(2, minmax(0, 1fr))` under 600 px, `repeat(auto-fill, minmax(180px, 1fr))` above.

### 4.4 Place sheet (`?place=<id>`)

```
┌────────────────────────────────────────────┐
│ [ scene art 180 px ....................(×)]│
│ (Museums & art) (★ Top pick)               │ chips on the art
│ Vatican Museums                (IX·X stamp)│ 96 px stamp when stamped
├────────────────────────────────────────────┤
│ Stamped · Fri 9 Oct · from your plan       │ or nothing
│ Last entry 18:00; 2026 Friday night …      │ p.text
│ €  €25 online (€20 door)                   │ + "≈ ₺1,395" when one amount
│ 🎟  Book ahead: Yes                         │
│ Open  [Fr] [Sa] [Su] [Mo]                  │ today outlined
│ 📅 In your plan: Fri 9 Oct · 08:00 ›       │ opens the stop sheet
│ ↝ 650 m from you · about 8 min on foot     │ with a location fix
│ [Go] [Photos] [Site]                       │ Maps instead of Go without coordinates
├────────────────────────────────────────────┤ footer, in thumb reach
│ [        I was here        ]               │ "I ate here" / "Got the shot"
│                      Remove stamp          │ when stamped (plain button)
└────────────────────────────────────────────┘
```

- Stamp button by category: sights "I was here", food "I ate here", photo spots "Got the shot". It writes
  `stamps[id] = { on: true }` with a toast "Stamped: Vatican Museums · Museums & art 3/7" [Undo] and the press
  animation. "Remove stamp" writes `on: false` with "Stamp removed: Vatican Museums" [Undo].
- Before the trip: "You can stamp places from Thu 8 Oct." and no button. Non-collectable: "Not in your
  collection: tourist trap." or "Not in your collection: closed." and no button.
- "+ Add to plan" when the place is not in the plan: the stop editor opens with the place (as today), and the
  new stop keeps `placeId`.
- The booking line is hidden when the value is "No", empty or a placeholder dash.

### 4.5 The game

**Stamps.** A place is stamped when you stamped it (`on: true`) or a done stop is that place (D11), unless you
removed it (`on: false`). A record with `on: null` (a hand stamp you undid at once) counts as no record. A derived
stamp is dated by the tick's time. Ticking and unticking add and remove derived stamps with no stored record.

**The stamp mark** (`StampMark.vue`, pure SVG): shape by category so it reads without colour (sights round,
food oval, photo spots a rectangular frame with a dashed inner frame); ink `--c-sight`, `--c-food` or `--c-night`;
top picks get a second ring in `--gold-rim`; the place's core name along the top arc (Cinzel 700, upper case,
20 characters at most), the set name along the bottom; the set icon and the Roman date ("IX·X", Plex Mono 600) in
the middle; a stable tilt of −8° to +8° from the place id; a light wear mask of 16 seeded dots. Sizes: 58 px on
cards, 72 px on the Badges page, 96 px in the place sheet. `role="img"` with "Stamp: Vatican Museums, 9 October".
Props: `place: PlaceCard`, `date?: string` (the `YYYY-MM-DD` of `placeStampDate()`; no date in the middle when
missing), `size?: 58 | 72 | 96` (default 58) and `press?: boolean` (play the press once on mount; callers pass it
only when the stamp appeared while they were on screen).

**Stamp date.** A stamp counts to the trip day of its time by the 05:00 rule, else to its calendar date in the
trip's time zone (`placeStampDate()`). "Stamped · Fri 9 Oct", the Roman date on the mark and "Stamps by day" all
use it.

**Sets.** Appendix A. A set is complete when every collectable place in it is stamped: its header turns gold with
a check, and a toast says "Set complete: Churches".

**Rank** (`GAME_RANKS`, by number of stamps):

| Rank | Stamps | Name | Gloss | Line |
|---|---|---|---|---|
| I | 0 | Peregrinus | the newcomer | Your first stamp is waiting. |
| II | 3 | Viator | the wayfarer | The road is yours. |
| III | 8 | Explorator | the scout | You know your way around. |
| IV | 15 | Civis | the citizen | The city treats you like a local now. |
| V | 22 | Tribunus | the tribune | People ask you for directions. |
| VI | 30 | Consul | the consul | Your stamps fill a whole page. |
| VII | 40 | Imperator | the emperor | Veni, vidi, vici. |

Following the whole default plan gives 20 stamps (Civis); side trips and "Got the shot" lead further.

**Badges** (`GAME_BADGES`, derived; a badge whose goal is 0 for a trip is hidden):

| id | Badge | Rule shown when locked | Goal | Counted from | Icon |
|---|---|---|---|---|---|
| `first-stamp` | First stamp | Stamp your first place. | 1 | stamps | `stamp` |
| `top-picks` | Top picks | Stamp all 8 top picks. | collectable top picks | stamped top picks | `star` |
| `sightseer` | Sightseer | Stamp 10 sights. | 10 | stamped sights | `landmark` |
| `foodie` | Foodie | Stamp 5 places to eat. | 5 | stamped food places | `food` |
| `shutterbug` | Shutterbug | Stamp 5 photo spots. | 5 | stamped photo spots | `camera` |
| `early-bird` | Early bird | Tick off a stop that starts before 08:00. | 1 | done stops with a planned start before 08:00 | `sunrise` |
| `golden-hour` | Golden hour | Be at a stop when the sun sets. | 1 | done, not minor, sight, food or night stops whose slot contains the day's sunset | `sunset` |
| `night-owl` | Night owl | Tick off a night out. | 1 | done stops of kind night | `moon` |
| `money-diary` | Money diary | Log a cost on 3 days of the trip. | 3 | trip days with a cost | `wallet` |
| `critic` | Critic | Rate 10 stops. | 10 | stops with a rating | `heart` |
| `storyteller` | Storyteller | Write a day journal on 3 days. | 3 | day notes with text | `book` |
| `ready` | Ready to go | Tick every "Do now" booking and pack everything. | "Do now" bookings + packing items | done ones | `bag` |

Time rules use the planned times, never the time you tapped. Goals are capped by what the trip offers
(3 days for Money diary, the number of collectable sights for Sightseer, and so on).

**Badges page** (`/badges`):

```
┌────────────────────────────────────────────┐
│ YOUR COLLECTION                            │
│ Badges                                     │
│ ┌────────────────────────────────────────┐ │ rank card: --rank-bg with --rank-ink,
│ │ RANK II                        (laurel)│ │ gold Cinzel, like a passport cover
│ │ VIATOR                                 │ │
│ │ the wayfarer                           │ │
│ │ ▰▰▰▰▰▰▱▱▱▱▱▱▱▱  3 stamps · 5 more to    │ │
│ │ Explorator · 2 of 12 badges            │ │
│ └────────────────────────────────────────┘ │
│ (seal) First stamp  (seal) Early bird  (○) Top picks│ 3 columns
│  Earned              Earned           2 of 8 ▰▰▱▱ │
│ …                                          │
│ STAMPS BY DAY                              │
│ FRIDAY · IX                      3 stamps  │
│ (stamp) (stamp) (stamp)                    │ tap → place sheet
└────────────────────────────────────────────┘
```

Badge seal (`BadgeSeal.vue`): a laurel of 12 leaves around a disc with the badge icon, `--gold` when earned; a
dashed `--line` ring with the icon in `--fg-3` when locked. Every badge shows its label and either "Earned" or
"2 of 8" with a thin bar; never colour alone. Top rank: "The top rank. Veni, vidi, vici."
Empty stamps: "No stamps yet. Tick a stop you visit, or stamp a place in Places."

**Where the game shows up**: Places (header, set progress, stamps on cards, set complete); Now (tick toasts name
stamps; "3 stamps today" in the day card; the after-trip line adds "17 stamps"); Plan and the stop sheet (tick
toasts; "Stamps when done: Pantheon"); Costs (logging feeds Money diary; the page itself shows no game UI); More
("Your trip" card and badge strip); Badges page.
Nothing on the hero card, no numbers per action, no streaks.

**Celebrations** (`GameHost.vue`, mounted once in the shell): on the first computation for a trip on a device it
records the earned badges, rank and complete sets in `localStorage` `travel:game:seen:v1` without a toast. After
that, anything new earns one gold toast (combined when several arrive together): "Badge earned: Golden hour",
"New rank: Civis · the citizen", "Set complete: Churches", each with a "See" action (to `/badges`, or `/places`
for a set). A combined toast joins its parts with ". " ("Badge earned: Golden hour. New rank: Civis · the
citizen") and its "See" goes to `/badges` unless every part is a set. Seen items are never removed, so each celebrates once per device. While previewing nothing
celebrates and nothing is recorded.

### 4.6 More hub (`/more`)

```
┌────────────────────────────────────────────┐
│ More                                       │
│ ┌────────────────────────────────────────┐ │
│ │ (ring 15%) 6 of 41 stops done          │ │
│ │            Viator · 3 stamps · 2 badges│ │
│ │            [ Progress & journal  › ]   │ │
│ │ (seal)(seal)(○)(○)(○)(○)  All badges › │ │ earned first
│ └────────────────────────────────────────┘ │
│ GET READY                                  │ during and after the trip,
│  (🎟) Bookings       16 to do · 4 done  ›  │ Find your way comes first
│  (👜) Packing        12 of 17 packed    ›  │
│ FIND YOUR WAY                              │
│  (🗺) Map            Days, places and the metro ›
│  (ⓘ) Guide          13 sections: money, phone, safety… ›
│  (📖) Notes & chats  3 saved from chats  ›  │
│ HELP AND SETTINGS                          │
│  (☎) SOS            Emergency numbers & what to do ›
│  (⚙) Trip settings  Dates, home base, backup, reset ›
│ THIS TRIP (unchanged card)                 │
│ [ All trips ]                              │
└────────────────────────────────────────────┘
```

Rows are 56 px inside grouped cards. Places leaves More (it is a tab).

### 4.7 Now

```
│ FRIDAY 9 OCTOBER · VATICAN                 │
│ 16:40 in Rome                   [Preview]  │ unchanged
│ [☀ Sunset 18:38 · in 1 h 58 min]           │ unchanged
│ ┌────────────────────────────────────────┐ │ NEW money row (tap → Costs)
│ │ (▭) €37.00 today · €134.50 left [ Add ]│ │ Add opens the cost sheet here
│ │     ≈ ₺2,065 spent                     │ │
│ └────────────────────────────────────────┘ │
│ [ hero: Now · Ponte Sant'Angelo … ]        │ unchanged
│ [ Done ] [ Go ] [ ⏭ ] [ … ]                │ ticks go through markStop()
│ [ Next · 17:15 Pantheon · Leave by 17:05 ] │ leave line in the text font, one line
│ Did you do these? (6 not marked)           │ count chip neutral, Yes/No via markStop()
│ Later today (ticks via markStop())         │
│ [map] [Today so far: 3 done · 8 to go]     │ + "3 stamps today"; toggles wrap at 320 px
```

- **Money row**, during the trip only: "€37.00 today · €134.50 left" (or "€12.50 over today's plan" in amber),
  "≈ ₺2,065 spent", and an **Add** button (aria-label "Add a cost") that opens the cost sheet linked to the stop
  on now when it is a sight, food or night stop.
- **Tick toasts** (every tick, all screens):

| Situation | Toast | Actions |
|---|---|---|
| Done, one exact amount, nothing logged in its category | "Done: Pantheon · Stamped" | [Log €7] [Undo] |
| Done, a range or several amounts | "Done: Early lunch at Bonci Pizzarium" | [Add cost] [Undo] |
| Done, free or no euro amount | "Done: Top of the Spanish Steps for sunset (18:38) · 2 stamps" | [Undo] |
| Skipped | "Skipped: Castel Sant'Angelo" | [Undo] |
| Unticked | "Unticked: Pantheon" | [Undo] |

  " · Stamped" is added for one new stamp and " · 2 stamps" for more. Toasts with two actions stay 6 s.
- **Getting back** card (`HomeCard.vue`): shown during the trip, not on the last day, between 21:00 and 05:00
  (trip clock), when the day is done, a stop of kind night is on now, or the next stop is a night stop. Above the
  hero when the day is done; otherwise under the Next card.

```
┌ LATE NIGHT ────────────────────────────────┐
│ Getting back to YellowSquare               │
│ Via Palestro 51, 00185 Roma                │
│ 2.4 km from you · about 30 min on foot     │ with a location fix
│ Last metro ~01:30                          │ the day's metro fact, if any
│ [ Take me home ] [ Show the driver ]       │
│ [ Call a taxi · 060609 ]                   │ first SOS entry about a taxi
└────────────────────────────────────────────┘
```

  "Take me home" opens directions (transit over 2.8 km). "Show the driver" opens the full-screen driver card that
  SOS already has, now a shared `DriverCard.vue`.
- **Stamps today** in the day card: stamps whose `stopId` is a stop of today's plan, plus hand stamps whose date
  (`placeStampDate()`) is today; "1 stamp today", "3 stamps today", hidden at 0.
- **After the trip** the summary line adds "· 17 stamps" (every stamp of the trip).

### 4.8 Plan

```
│ Which day is your Colosseum ticket? (Sat 10) [Change] │ one row once chosen or once the trip starts
│ [day cards strip, unchanged]                          │
│ ┌ day picture 132 px on phones, "3/11 done" chip ┐    │ ring row removed on phones
│ │ IX · FRIDAY 9 OCTOBER · Vatican and …          │    │
│ └────────────────────────────────────────────────┘    │
│ (☀ 07:15)(Sunset 18:38)(Blue hour …)(Last metro …) ▸  │ facts: one chip row on phones
│ ⚠ 08:00 Long trousers, covered shoulders…             │ first alert only
│ [ 2 more heads-ups ]                                  │ expands the rest
│ Timeline                          [Hide 6 small steps]│ first stop visible without scrolling
│ … StopRow ticks via markStop() …                      │
│ Your day: stars · Day journal                         │
│ Spent this day: €37.00 of €171.50 · ≈ ₺2,065          │ replaces "Other spending today"
│ [ Add a cost ]   See costs ›                          │
```

- A pending day journal is saved to the old day before switching days.
- The "Other spending today" number input is removed (old values show on Costs as "Logged earlier").

### 4.9 Stop sheet

```
│ [Planned | Done | Skipped]                 │ via markStop()
│ (Sight)(€25)(Must do)(Booked)              │
│ COSTS HERE                         €12.00  │ NEW, right under the chips
│  08:00 (🎟) Vatican Museums · Logged earlier €12.00 │ up to 3 rows, tap to edit
│  [ Add a cost ]                            │ opens the sheet with this stop
│ STAMPS  (stamp) Vatican Museums · Stamped Fri 9 Oct │ or "Stamps when done: …"
│ tip, lines, options, where, links          │ unchanged
│ How was it? stars · tags (40 px) · notes · photos   │ "Spent here" removed
│ Photos are backed up to your account.      │ signed out: "Photos stay on this phone until you sign in."
```

Tapping a stamp name closes the stop sheet and opens that place's sheet. The photo line: signed in with photo
backup on, "Photos are backed up to your account."; signed out, "Photos stay on this phone until you sign in.";
signed in while backup is unavailable, today's "Photos stay on this device."

### 4.10 Other screens

- **Progress**: the Money card becomes compact: "Money", "€46.00 of ~€503", a bar, "≈ ₺2,567" and "See costs";
  the day chart moves to Costs. Journal cost chips and the Markdown export read costs from `costSummary()`
  (per stop, plus "Spent: €37.00" per day). "Did it", "Skipped" and the check in What's left go through markStop().
- **Bookings**: ticking goes through `tickBooking()`: "Booked. One less thing." [Log €25] [Undo] when the cost is
  one euro amount. The checkbox gets a 44 px hit area.
- **Packing**: items still to pack first; packed ones under a divider "Packed · 12"; ticking the last one toasts
  "All packed. Buon viaggio!". Rows at least 44 px.
- **Map**: `?places=1` turns the places layer on; a place marker opens the place sheet; stamped places show a
  gold ring (class `got`); the stop card's "Mark done" goes through markStop(); the map starts below the preview
  bar and the update banner (`--shell-extra`). Fallback tiles from OpenStreetMap (D19).
- **Stop editor**: a stop added from a place saves `placeId`; on today's day the start defaults to the next half
  hour after now, for photo spots to the first time in `bestTime`, otherwise 10:00. The icon-only Delete button
  gets `aria-label="Delete stop"`.
- **Trip settings**: "Clear my progress" asks "Clear everything you ticked, rated, wrote, logged and stamped for this
  trip? This can't be undone." "Your data", signed in: "Everything is kept on this device and in your Google
  account. Export a backup if you want a file of your own."
- **App settings**: importing a backup merges each trip's progress with `mergeProgress()` instead of replacing it.
  The Google map option's line ends "Offline, the map shows the areas you looked at with OpenStreetMap on." instead
  of promising saved tiles that were never fetched.
- **SOS**: uses `DriverCard.vue`; otherwise unchanged.
- **Star rating**: hover only follows a mouse; tapping the same star twice clears the stars on touch.

### 4.11 Mobile polish, dark mode and desktop

- Touch targets: D27, plus the SOS pill, booking checkboxes and packing rows.
- `.tnum` (tabular figures in the text face) for sentences with numbers, such as the Next card's leave-by line;
  Plex Mono only for standalone numbers.
- No horizontal scroll at 320 px anywhere (today Now is 338 px wide because of the day card buttons).
- New surfaces use tokens only; every new colour has a dark value. `--toast-act` fixes the dark-mode toast action
  (1.64:1 today): light `var(--gold)` (6.36:1 on the toast), dark `#7A5A08` (5.46:1).
- Desktop: top tabs, sheets as right-hand drawers (existing), Places 4+ cards per row, Costs in two columns.
- `--shell-extra`: the shell sets it on `.shell` to the current height in px of the preview bar plus the update
  banner, margins included (`0px` when neither shows). The full-screen map adds it to its top offset, so the day
  chips never sit under the preview bar.

---

## 5. Data model and sync

### 5.1 Types (`shared/types/trip.ts`)

```ts
/** What a cost was for. The first four line up with Trip.budget values [sights, food, night, transport]. */
export type CostCat = 'food' | 'sights' | 'night' | 'transport' | 'stay' | 'other'

/** One thing you paid for. Kept by id; never removed, only marked deleted. */
export interface Expense {
  id: string
  /** More than 0, at most 99,999.99, rounded to cents, in `currency`. */
  amount: number
  /** The currency it was paid in (the trip's currency in this version). */
  currency: string
  cat: CostCat
  /** The trip day it counts towards. Missing: before or after the trip. */
  dayId?: string
  note?: string
  stopId?: string
  placeId?: string
  bookingId?: string
  /** Title of the linked stop or booking when it was logged, so it still reads well if that goes away. */
  title?: string
  /** Logged while previewing another moment of the trip. */
  preview?: true
  /** When it was logged (ISO, real clock). */
  at: string
  /** Last change (ISO). The newer copy wins when two devices merge. */
  updatedAt: string
  /** Deleted. Kept so a merge with an older copy can't bring it back. */
  deleted?: true
}

/** A place you stamped yourself, or took a stamp back from. */
export interface PlaceStamp {
  /** true: stamped by hand. false: taken back (also hides a stamp a done stop would give).
   *  null: no choice any more (a stamp you undid at once); a done stop can still stamp it. */
  on: boolean | null
  at: string
  updatedAt: string
}

/** Finer groups of places. Optional in trip data; worked out from the scene and best time when missing. */
export type PlaceSet =
  | 'ancient' | 'art' | 'church' | 'underground' | 'views' | 'sight-other'
  | 'pasta' | 'street' | 'sweet' | 'food-other'
  | 'morning' | 'golden' | 'anytime'

// Optional additions (no seed uses them yet):
//   PlaceCard.set?: PlaceSet
//   Stop.placeId?: string        // "this stop is that saved place": stamps and "In your plan"
//   Choice.placeId?: string
// TripProgress gains (older saves lack them):
//   expenses?: Record<string, Expense>
//   stamps?: Record<string, PlaceStamp>     // keyed by place id
```

`emptyProgress()` returns `expenses: {}` and `stamps: {}` too. The storage key `travel:progress:v1` and all
existing ids stay. XP, ranks, badges and "seen" celebrations are never stored in `TripProgress`.

### 5.2 `shared/utils/costs.ts` (new; relative imports; no runtime import of `plan.ts`)

| Export | Contract |
|---|---|
| `COST_CATS: readonly CostCat[]` | `['food', 'sights', 'night', 'transport', 'stay', 'other']` |
| `COST_PLANNED: Partial<Record<CostCat, 0\|1\|2\|3>>` | index into `BudgetDay.values`: sights 0, food 1, night 2, transport 3 |
| `COST_MAX = 99_999.99` | |
| `costCatForKind(kind: StopKind): CostCat` | sight→sights, food→food, night→night, move→transport, rest→stay, task→other |
| `costToCents(n: number): number` | `Math.round(n * 100)`; every sum is done in cents |
| `costParseAmount(text: string): number \| null` | accepts "3,50", "3.50", "3", " 12 ", "€7", "7 €"; one separator followed by 3 digits is a thousands separator ("1.250" is 1250); rejects empty, 0, negative, garbage, "4,5,0" and anything above `COST_MAX`; rounds to cents ("4.567" is 4.57) |
| `costPadInput(current: string, key: string): string` | keypad state: `'0'`–`'9'`, `'.'` or `','`, `'back'`, `'clear'`; no leading zeros ("0" then "5" gives "5"; "." on empty gives "0."), one point, 2 decimals, 5 whole digits |
| `costHints(text?: string): { exact?: number, options: number[] }` | euro amounts in a planned-cost text. `exact` only for exactly one amount with no range and none of " or ", "+", "·", "/" in the text; "Free"/"Included" with no amount give `exact: 0`; texts without a euro amount (US$, $, tip-based) give nothing. Appendix C lists all 42 Rome texts. |
| `costDayFor(trip, at: Date): string \| undefined` | the trip day id of an instant on the trip's clock (05:00 rule, trip time zone); `undefined` before or after the trip |
| `costLegacyId(kind: 'stop' \| 'day', id: string): string` | `legacy-stop-<id>` or `legacy-day-<id>` |
| `costEntries(trip, p, plans?): CostEntry[]` | every live cost, newest first: live expenses (not deleted), plus one legacy entry per `feedback[stopId].spent > 0` and per `dayNotes[dayId].extraSpent > 0` unless a record (live or deleted) exists under its legacy id. A legacy stop entry takes its day and kind from the resolved plan, else from any version of the trip, else none; `extraSpent` is `other`. |
| `costSummary(trip, p, plans?): CostSummary` | see below |
| `costLoggedFor(stop, s: CostSummary): boolean` | a live entry is linked to this stop in the stop's own category |
| `costOfferFor(stop, s: CostSummary): { exact?: number, options: number[] } \| null` | the stop's hints when they hold an amount above 0 and nothing is logged for it yet |

```ts
export interface CostEntry {
  id: string                    // expense id, or the legacy id
  source: 'expense' | 'legacy'
  amount: number                // in the trip's currency
  cat: CostCat
  dayId?: string
  stopId?: string
  placeId?: string
  bookingId?: string
  note?: string
  title?: string                // the linked stop's or booking's title
  sortAt: number                // ms; expenses use `at`, legacy stop entries their planned start, legacy day entries 23:59
  preview?: boolean
  expense?: Expense
}
export interface CostPair { spent: number, planned: number }
export interface CostSummary {
  entries: CostEntry[]
  byDay: Record<string, CostPair>     // every trip day; spent excludes 'stay'; planned from trip.budget
  byCat: Record<CostCat, CostPair>    // trip days only; planned for the four budget categories, 0 for stay and other
  trip: CostPair                      // sum of byDay
  all: number                         // every live entry, any day, any category
  byStop: Record<string, number>      // live entries linked to each stop, any category
  days: number                        // trip days with at least one entry
}
```

### 5.3 `shared/utils/places.ts` (new; type-only import of `plan.ts`)

| Export | Contract |
|---|---|
| `PLACE_SET_ORDER: readonly PlaceSet[]` | display order: ancient, art, church, underground, views, sight-other, pasta, street, sweet, food-other, morning, golden, anytime |
| `placeSetOf(p: PlaceCard): PlaceSet` | `p.set` when valid; photo spots: first clock time in `bestTime` before 12:00 `morning`, from 12:00 `golden`, none `anytime`; sights: name words catacomb, catacombs, necropolis, scavi or underground give `underground`, else the scene map of Appendix A, else `sight-other`; food: the scene map, else `food-other` |
| `placeSetCategory(set)` | its category |
| `placeIsCollectable(p)` | verdict is not `trap` or `closed` |
| `placeNorm(text)` | lower case, accents and apostrophes removed, other punctuation to spaces, single spaces, padded with one space on each side |
| `placeCoreName(name)` | `placeNorm` of the part before " + ", " (", ":" or " · ", with a leading la, il, lo, le, i, gli or the dropped |
| `placeLinksForStop(stop, places): string[]` | the explicit `stop.choice?.placeId ?? stop.placeId` when set; else every collectable place whose core name has at least 5 letters, whose core name the stop's normalised title contains, and whose category fits: sight←kind sight, food←kind food, photo←kind sight with icon `photo`. Uses the resolved title, kind and icon. |
| `placeStamps(trip, p, plans): Map<string, PlaceStampInfo>` | derived from done stops (earliest tick time wins), plus `stamps[id].on === true` (the earlier time wins); `on === false` removes; `on === null` leaves derived stamps alone; ids not in `trip.places` and non-collectable places are ignored |
| `placeStampDate(trip, info: PlaceStampInfo): string` | `YYYY-MM-DD`: the trip day of `info.at` by the 05:00 rule, else its calendar date in the trip's time zone |
| `placesInPlan(trip, plans): Map<string, PlacePlanHit>` | the first linked stop of each place (any state), by day then start |
| `placeOpenOn(p, trip, dayId): 'open' \| 'closed' \| 'unknown'` | verdict `closed` is closed; `open[]` by the index of `dayId` in `trip.openDays` (else the trip's day order); food with `sunday === false` is closed on a Sunday; otherwise unknown |
| `placeIsFree(p)` | `/\bfree\b/i` on the price |
| `placeNeedsBooking(p)` | booking is Yes, Recommended, Timed slot, Online, Guided or Request form |
| `placeSetProgress(trip, stamps): PlaceSetProgress[]` | per set with collectable places: `{ set, total, stamped, complete }` |

```ts
export interface PlaceStampInfo { placeId: string, at: string, via: 'tap' | 'stop', stopId?: string }
export interface PlacePlanHit { stopId: string, dayId: string, date: string, start: number, title: string }
export interface PlaceSetProgress { set: PlaceSet, total: number, stamped: number, complete: boolean }
```

### 5.4 `shared/utils/game.ts` (new, owned by the game package)

```ts
export interface GameRankDef { n: number, min: number, name: string, gloss: string, line: string }
export const GAME_RANKS: readonly GameRankDef[]            // the table in 4.5
export interface GameRank extends GameRankDef { stamps: number, next?: GameRankDef, toNext: number }
export function gameRank(stamps: number): GameRank
export type BadgeId = 'first-stamp' | 'top-picks' | 'sightseer' | 'foodie' | 'shutterbug' | 'early-bird'
  | 'golden-hour' | 'night-owl' | 'money-diary' | 'critic' | 'storyteller' | 'ready'
export interface BadgeDef { id: BadgeId, label: string, rule: string, icon: string }
export const GAME_BADGES: readonly BadgeDef[]              // the table in 4.5, in that order
export interface GameBadge extends BadgeDef { value: number, goal: number, earned: boolean }
export function gameBadges(i: { trip: Trip, p: TripProgress, plans: DayPlan[], stamps: Map<string, PlaceStampInfo>, costs: CostSummary }): GameBadge[]
export interface GameState { stamps: number, rank: GameRank, badges: GameBadge[], earned: number, sets: PlaceSetProgress[] }
export function gameState(i: { trip: Trip, p: TripProgress, plans: DayPlan[], stamps: Map<string, PlaceStampInfo>, costs: CostSummary, sets: PlaceSetProgress[] }): GameState
```

`app/composables/useGame.ts` (same package): `useGame(): ComputedRef<GameState | null>`, built from `useTripView()`
(null until the trip and its costs are ready). More, Badges and `GameHost` read it.

### 5.5 `shared/utils/plan.ts`

- `emptyProgress()` adds `expenses: {}` and `stamps: {}`.
- `summarize(trip, p, m, plans = planDays(trip, p, m), costs = costSummary(trip, p, plans))`: `DaySummary.spent`
  is `costs.byDay[id].spent`; `TripSummary.spent` is `costs.trip.spent`; new `TripSummary.spentAll` is `costs.all`.
  Nothing else changes; the existing test `s.spent === 25` still passes.

### 5.6 `shared/utils/sync.ts`

```ts
/** Records with their own updatedAt: the newer copy wins; on a tie a deletion (deleted or on: false) wins,
 *  then the larger JSON string, so merge(a, b) equals merge(b, a). */
export function mergeRecords<T extends { updatedAt: string }>(a?: Record<string, T>, b?: Record<string, T>): Record<string, T>
```

- Times compare with `Date.parse`, not as text.
- `mergeProgress`: after today's fields, `expenses = mergeRecords(a.expenses, b.expenses)` and
  `stamps = mergeRecords(a.stamps, b.stamps)`; top-level fields outside the known list
  (`stops, feedback, choices, bookings, packing, variant, dayNotes, tripNote, expenses, stamps`) are copied over,
  `b` winning.
- `isPristine` for progress is also false with any expense (a tombstone counts), any stamp record or a `variant`.
- `decide`: for progress, when the cloud copy is newer and would be applied, this device has at least one expense
  or stamp record, and the cloud JSON has neither an `expenses` nor a `stamps` key, return `merge` with
  `mergeProgress(local, remote)` instead of `apply`.
- Tombstones are kept for the life of the trip (200 costs are about 50 KB).

### 5.7 Composables

`useProgress` (all new actions set `updatedAt` to now):

```ts
export type NewExpense = Omit<Expense, 'id' | 'at' | 'updatedAt' | 'deleted'> & { id?: string, at?: string }
addExpense(e: NewExpense): string                       // uid('c') unless an id is given (legacy ids)
updateExpense(id: string, patch: Partial<Omit<Expense, 'id' | 'at' | 'updatedAt' | 'deleted'>>): void
removeExpense(id: string, fallback?: Omit<Expense, 'updatedAt' | 'deleted'>): Expense | undefined
                                                        // writes a tombstone; with no record, writes the fallback as one
restoreExpense(e: Expense): void                        // back to live, new updatedAt
setStamp(placeId: string, on: boolean | null): void
// edit(): p.expenses ??= {}; p.stamps ??= {}
```

`useTripView` adds, computed once per trip for every screen: `costs` (`CostSummary | null`), `stamps`
(`Map<string, PlaceStampInfo>`), `inPlan` (`Map<string, PlacePlanHit>`), `sets` (`PlaceSetProgress[]`) and
`todayCosts` (`{ dayId, spent, planned } | null`, during the trip); `summary` passes `costs` to `summarize()`.

`useTripActions()` (new, `app/composables/useTripActions.ts`):

```ts
export interface CostInput { amount: number, cat: CostCat, dayId?: string, note?: string, stopId?: string, placeId?: string, bookingId?: string }
markStop(stop: ResolvedStop, status: StopStatus | null): void   // tick toasts of 4.7
tickBooking(b: Booking, value?: boolean): void                   // "Booked. One less thing." [Log €X] [Undo]
addCost(input: CostInput): string                                // title snapshot, preview flag, toast with Undo
saveCost(id: string, input: CostInput): void                     // edit; legacy ids become records
deleteCost(id: string): void                                     // tombstone, toast with Undo
logStopCost(stop: ResolvedStop, amount: number): string          // one tap, linked, category from the kind
removePreviewCosts(): number
stampPlace(place: PlaceCard, on: boolean): void                  // toasts of 4.4; Undo restores the previous record, or on: null
```

`useCostSheet()` (same file) drives `?cost=`, `&for=`, `&cday=`: `mode` ('new' | 'edit' | null), `editId`,
`target` (`{ kind: 'stop' | 'booking', id }` or null), `day` (string or null),
`open(opts?: { stopId?: string, bookingId?: string, dayId?: string })`, `openEdit(id: string)`, `close()`. Closing
removes all three keys and uses the back gesture like `useQueryState`. Both composables are called in `setup`; the
functions they return are safe to call later, from a toast action for example.

Toasts accept `actions: { label, run }[]` (at most two; `action` still works) and a `gold` tone.
`BottomSheet` counts open sheets before removing `html.sheet-open` and keeps Tab focus inside the panel.

### 5.8 Shared UI

- `app/utils/ui.ts`: `money()` uses `currencyDisplay: 'narrowSymbol'` ("₺2,567", not "TRY 2,567");
  `moneyExact(n, currency)` always shows cents; `moneyHome(n, trip)` gives "≈ ₺2,065" (whole lira) or "";
  `romanDate(date: string)` gives "IX·X" for `2026-10-09`; `COST_META` and `PLACE_SET_META` (label, blurb, icon, colour) typed with
  `satisfies`.
- `app/assets/css/main.css`, in all three theme blocks: `--toast-act` (light `var(--gold)`, dark `#7A5A08`),
  `--gold-rim` (light `#B08520`, dark `#E3B545`), `--rank-bg` (light `#6E1030`, dark `#3A1522`) and `--rank-ink`
  (light `#F0D48C`, dark `#EBC468`); `.tnum`; the hit-area rule:

```css
@media (pointer: coarse) {
  :where(.btn.xs, .btn.sm, button.chip, a.chip, .tick, .hit) { position: relative; }
  :where(.btn.xs, .btn.sm, button.chip, a.chip, .tick, .hit)::after {
    content: ""; position: absolute; left: 50%; top: 50%;
    width: max(100%, 44px); height: max(100%, 44px); transform: translate(-50%, -50%);
  }
}
```

The hit area is centred and at least 44 × 44 px whatever the element's size (a 30 px icon button or a small tick
included).

- `app/utils/icons.ts`: `stamp`, `medal`, `column`, `church`, `arch`, `slice`, `backspace`, `laurel` (path data,
  set and category metadata in Appendix D).
- `StampMark.vue` (4.5) is shared by Places, the place sheet, the stop sheet and the Badges page.
- Exported names are prefixed (`cost…`, `place…`, `game…`) because every export of `shared/utils`, `app/utils` and
  `app/composables` becomes a global auto-import (`counts`, `money` and `placeMarkers` already exist).

### 5.9 Tests

- `tests/costs.test.ts`: the `costParseAmount` table of 5.2; `costPadInput`; the 42-text `costHints` table;
  `costDayFor` (Sat 10 Oct 01:30 Rome is `fri`, 05:00 is `sat`, 7 Oct and 13 Oct noon are undefined); legacy
  entries and their shadowing by a live or deleted record; a legacy spend on a stop outside the active plan still
  counts; 10 × €1.50 is exactly €15.00 and 3 × €1.10 is €3.30; the seeded summary of C1 in 9.2 (Fri €37, Thu €9,
  trip €46 of €502.95, byCat); stay excluded from days; `costOfferFor`.
- `tests/places.test.ts`: set counts of Appendix A and 79 collectable; an explicit `set` wins; the link table of
  Appendix B as an inline snapshot (default plan and the Sunday variant); stamps from ticks, `on: false`,
  `on: true` without a stop, `on: null` (a later tick still stamps), unticking; `placesInPlan` (Borghese on Sun
  at 14:15, no Tonnarello, no Capitoline Museums); Sunday closures; 26 free places.
- `tests/sync.test.ts`: both devices' records kept; newer wins; tombstone beats an older live copy and a newer live
  copy beats an older tombstone; ties symmetric; idempotent; unknown fields survive; `isPristine` cases;
  `decide()` guard; never-synced device with only an expense facing a cloud tombstone uploads; mixed ISO formats.
- `tests/plan.test.ts`: existing tests unchanged; `spent` from the ledger; switching the Colosseum day does not
  change `spent`.
- `tests/seeds.test.ts`: any `place.set` is a known set; any `placeId` names an existing place.
- `tests/game.test.ts`: rank boundaries (2/3, 7/8, 39/40, above 40); each badge on a small fixture; the seeded
  values of G1 in 9.4; unticking lowers counts; badge ids snapshot.

---

## 6. Copy

Short, plain English. No em dashes; ranges keep the data's own en dash. Every string is quoted; numbers are the
seeded example and come from data. `{…}` marks a value filled in by the app.

| Where | Strings |
|---|---|
| Tabs | "Now"; "Plan"; "Places"; "Costs"; "More" |
| Header line 2 | "In {n} days · 8–12 Oct"; "Tomorrow · 8–12 Oct"; "Today · 8–12 Oct"; "Day {n} of {total} · Fri 9"; "Trip done · 8–12 Oct" |
| Costs kicker and title | "Fri 9 Oct · Day 2 of 5"; "In 8 days"; "Trip done"; "Costs" |
| Costs summary | "Today"; "€37.00"; "≈ ₺2,065"; "€134.50 left of €171.50"; "€12.50 over today's plan"; "No plan for today"; "Your budget"; "~€503"; "for 5 days · ≈ ₺28,065"; "Thu €21 · Fri €172 · Sat €155 · Sun €123 · Mon €32"; "Where you stay isn't included."; "All in"; "Trip days €452.00 of ~€503" |
| Cost pad | "Counts for"; "Before the trip"; "After the trip"; "At {stop}"; "+ Note"; "What was it? (optional)"; "Type the amount, then tap what it was for."; "Type an amount first"; "Preview is on. This cost is real and counts for {Fri 9}." |
| Categories | "Food"; "Sights"; "Nightlife"; "Transport"; "Stay"; "Other" |
| Cost sheet | "Add a cost"; "Edit cost"; "For: {stop or booking title}"; "Save"; "Delete"; "Logged on this stop before costs had their own page."; "Logged for this day before costs had their own page."; "Paid before" |
| Cost toasts | "Added €3.50 · Food"; "Added €3.50 · Food · €12.50 over today's plan"; "Added €7.00 · Sights · Pantheon"; "Deleted €3.50"; "Cost updated"; "Removed 2 costs"; action "Undo" |
| Costs lists | "Not logged yet"; "Log €18"; "Add"; "Fri 9 Oct · today"; "Before the trip"; "After the trip"; "Logged earlier"; "Preview"; "Other spending"; "{Category} · at {stop}" |
| Costs totals | "Trip so far"; "€46.00 of ~€503"; "Dashed: the plan. Solid: what you logged."; "By kind"; "Sights €12.00 of €100"; "not in the plan"; "Everything"; "€46.00 · ≈ ₺2,567"; "1 € = 55.8 ₺ · ECB, 25 Sep 2026" |
| Costs states | "No costs yet. Type an amount, then tap what it was for."; "Nothing logged today yet. That first espresso counts too."; "1 cost was logged while previewing."; "2 costs were logged while previewing."; "Remove it"; "Remove them" |
| Now money row | "€37.00 today · €134.50 left"; "€12.50 over today's plan"; "≈ ₺2,065 spent"; button "Add" with aria-label "Add a cost" |
| Tick toasts | "Done: {title}"; "Done: {title} · Stamped"; "Done: {title} · {n} stamps"; "Skipped: {title}"; "Unticked: {title}"; actions "Log €7", "Add cost", "Undo" |
| Bookings | "Booked. One less thing."; action "Log €25" |
| Now | "3 stamps today"; "1 stamp today"; after the trip " · 17 stamps" |
| Getting back | "Late night"; "Getting back to {home label}"; "{2.4 km} from you · about {30} min on foot"; "Take me home"; "Show the driver"; "Call a taxi · {060609}" |
| Plan | "Change"; "{n} more heads-ups"; "Hide"; "{3}/{11} done"; "Spent this day: €37.00 of €171.50"; "Add a cost"; "See costs" |
| Stop sheet | "Costs here"; "Add a cost"; "Nothing logged here yet."; "Stamps when done: {place}"; "Stamped · Fri 9 Oct"; "Photos are backed up to your account."; "Photos stay on this phone until you sign in." |
| Places | "Your collection"; "Places"; "3 of 79 stamped"; "Top picks 2/8"; aria-label "Search places"; placeholder "Search places"; "Cancel"; "Near me"; "Open today"; "Open on…"; "Free"; "Not stamped"; "Top picks"; "Map"; "Show all 10"; "Show fewer"; "Complete" |
| Place cards | "Top"; "Stamped"; "Closed today"; "In your plan · Fri 17:15"; "Book ahead"; "Best 06:35–07:15"; "Worth it"; "Mixed reviews"; "Overrated"; "Tourist trap"; "Closed" |
| Places states | "Nothing here with these filters."; "Clear filters"; "Location is off. Allow it in your browser settings to sort by distance." |
| Set labels | "Ancient sites"; "Museums & art"; "Churches"; "Underground"; "Piazzas & views"; "Sights"; "Trattorias & pasta"; "Pizza & street food"; "Coffee & sweets"; "Food"; "Morning light"; "Golden hour"; "Any time" |
| Set blurbs (same order) | "Arenas, forums and old stones"; "Frescoes, statues and grand rooms"; "Domes, mosaics and quiet corners"; "Catacombs and what lies below"; "Fountains, steps, terraces and gardens"; "More to see"; "Sit-down meals and fresh pasta"; "Slices, supplì and quick bites"; "Espresso, gelato and pastries"; "More to eat"; "Empty streets before the crowds"; "Terraces and bridges in the evening light"; "Good at any hour" |
| Place sheet | "Top pick"; "I was here"; "I ate here"; "Got the shot"; "Remove stamp"; "Stamped · Fri 9 Oct"; " · from your plan"; "You can stamp places from Thu 8 Oct."; "Not in your collection: tourist trap."; "Not in your collection: closed."; "In your plan: Fri 9 Oct · 08:00"; "Add to plan"; "Go"; "Maps"; "Photos"; "Site"; "Book ahead: {booking}"; "Best: {bestTime}"; "Open"; "{650 m} from you · about {8} min on foot" |
| Stamp toasts | "Stamped: Galleria Doria Pamphilj · Museums & art 3/7"; "Stamp removed: Vatican Museums"; action "Undo" |
| Badges page | "Your collection"; "Badges"; "Rank II"; "Viator"; "the wayfarer"; "3 stamps · 5 more to Explorator"; "2 of 12 badges"; "The top rank. Veni, vidi, vici."; "Earned"; "2 of 8"; "Stamps by day"; "Friday · IX"; "3 stamps"; "No stamps yet. Tick a stop you visit, or stamp a place in Places." |
| Badge names and rules | the table in 4.5 |
| Celebrations | "Badge earned: Golden hour"; "New rank: Civis · the citizen"; "Set complete: Churches"; action "See" |
| More | "More"; "6 of 41 stops done"; "Viator · 3 stamps · 2 badges"; "Progress & journal"; "All badges"; "Get ready"; "Find your way"; "Help and settings"; "Days, places and the metro" (Map row) |
| Progress | "Money"; "€46.00 of ~€503"; "≈ ₺2,567"; "See costs"; export line "Spent: €37.00" |
| Packing | "Packed · 12"; "All packed. Buon viaggio!" |
| Trip settings | "Clear everything you ticked, rated, wrote, logged and stamped for this trip? This can't be undone."; signed in: "Everything is kept on this device and in your Google account. Export a backup if you want a file of your own." |
| Stop editor | aria-label "Delete stop" |
| App settings, Map | Google option: "Shops, restaurants and transit from Google, with real walking and transit times for “leave by”. Offline, the map shows the areas you looked at with OpenStreetMap on." (the OpenStreetMap option's line stays) |

---

## 7. Accessibility and motion

- Every interactive element is at least 44 × 44 CSS px on touch screens (D27); adjacent targets keep 6 to 8 px gaps.
- Text meets 4.5:1 and art, rims, stamp ink and badge seals meet 3:1 against their surface in both themes.
  Over-plan states use amber plus the word "over"; no state is shown by colour alone (stamps have shapes and a
  text status, badges a label and "Earned" or "2 of 8").
- The amount is an `<output aria-live="polite">`; keypad keys have names ("3", "Decimal point", "Delete last
  digit"); categories are a group named "What was it for?" and, in add mode, each button's name says it saves
  ("Save €3.50 as Food"). The day picker is a native `<select>`.
- Sheets trap Tab focus, close on Escape and return focus to the opener. A stacked sheet keeps page scroll locked.
- Toasts live in the existing polite live region; actions are real buttons.
- `StampMark` and `BadgeSeal` are `role="img"` with a text name.
- Motion: the stamp press is 320 ms (scale 1.6 to 0.94 to 1 with a small turn, `animation-fill-mode: both`), only
  after a tap or tick in view. `main.css` already cuts animation to 0.001 ms under `prefers-reduced-motion`, so the
  end state shows at once. No particles, confetti, sound or vibration.
- New copy is checked for U+2014 (em dash) by grep.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Seven days including phone testing | Foundation first with tests; four parallel packages on disjoint files; code freeze Wed 7 Oct 18:00; anything unverified waits until after the trip. |
| An old app version merges and drops `expenses` and `stamps` | The `decide()` guard; the forward-compatible merge; after the deploy, open the app once on every signed-in device and close old tabs. |
| Money counted twice or lost | Old values are read, never migrated; fixed legacy ids shadow them; unit tests on two-device edits. |
| Wrong automatic stamps | Whole-word core names, kind rules, no distance; traps and closed places excluded; the Rome link table is pinned by a test; "Remove stamp" fixes a generous one. |
| iOS keyboard and comma decimals | The in-app keypad; the note is the only native field; test on the phone (9.9). |
| Rehearsal pollutes real data | Preview flag and one-tap removal for costs; ticks and stamps made in preview are real, as today; no celebrations in preview. |
| 81 illustrated cards slow the page | `SceneArt` stays lazy; small cards; `content-visibility: auto` on set sections if needed. |
| OpenStreetMap tile policy | Viewed tiles only, cached, correct attribution, no prefetch; offline covers areas looked at with OpenStreetMap on (said in Settings and the how-to note). |
| A badge toast pushes Undo out | One combined celebration toast; toasts keep three. |
| Muscle memory for Map and Progress | Both one tap from Now, Plan, Places and More; the how-to note says where. |
| Rank curve feels wrong | One constant, `GAME_RANKS`; review after the first full day. |
| The how-to note stops being true | The integration package checks each statement (9.10). |

---

## 9. Acceptance tests

Harness: Playwright Chromium, 390 × 844, DPR 2, `isMobile`, `hasTouch`, time zone Europe/Rome (CEST, UTC+2),
light unless stated. "Live at T" means `page.clock.setFixedTime(T)` with no preview. "Preview at T" means opening
`/trips/rome-2026-10/now?at=<T>` and navigating on the client. Unit tests run with `npm test`. Browser checks live
in `tests/e2e/<area>.e2e.mjs`, one file per package, on the shared helpers of `tests/e2e/lib.mjs`; each runs with
`node tests/e2e/<file>` against `TRAVELS_URL` (a dev server by default, the generated site in the final gate).

**Seed S** (the state of the current screenshots): Thursday's stops all done; Friday's stops before 16:00 done
except St Peter's Basilica (skipped); ratings 5, 4 and 5 on "Metro A, Termini → Ottaviano", "Vatican Museums +
Sistine Chapel" and "Early lunch at Bonci Pizzarium"; old `Feedback.spent` €25 on the metro stop and €12 on the
Vatican stop; Thursday's day note with a journal line and `extraSpent` €9; the first four bookings ticked; 12 of
17 packing items ticked. **Fresh**: no progress.

### 9.1 Navigation and layout (P0)

- **N1** Given any trip page, then the bottom bar has exactly Now, Plan, Places, Costs, More, each at least
  44 × 44 px; at 1280 px the top tabs show the same five.
- **N2** Given each path, then `aria-current="page"` sits on: `/now` Now; `/plan` Plan; `/map` Plan;
  `/map?from=places` Places; `/places` Places; `/costs` Costs; `/more`, `/progress`, `/badges`, `/bookings`,
  `/packing`, `/guide`, `/notes`, `/sos`, `/settings` More; each renders without a page error on reload and on
  client navigation.
- **N3** Given live Fri 9 Oct 16:40, then header line 2 reads "Day 2 of 5 · Fri 9"; live 30 Sep 12:00 "In 8 days ·
  8–12 Oct"; live 20 Oct "Trip done · 8–12 Oct".
- **N4** Given `/more`, then the groups Get ready, Find your way and Help and settings list Bookings, Packing, Map,
  Guide, Notes & chats, SOS and Trip settings, and there is no Places row.
- **N5** Given 390 and 320 px widths, then `document.documentElement.scrollWidth` equals the width on Now, Plan,
  Places, Costs, More, Badges, Progress, Bookings, Packing and Map, and with the cost sheet and the place sheet open.

### 9.2 Costs (P0)

- **C1** Given Seed S live Fri 16:40, when `/costs` opens, then it shows Today "€37.00", "≈ ₺2,065", "€134.50 left of
  €171.50"; "Trip so far" "€46.00 of ~€503"; By kind Sights "€12.00 of €100", Transport "€25.00 of €78", Other
  "€9.00"; "Everything €46.00 · ≈ ₺2,567"; the footer "1 € = 55.8 ₺ · ECB, 25 Sep 2026".
- **C2** Given Seed S live Fri 16:40 on `/now`, when you tap Costs, the keys 3, ., 5, 0 and Food, then the toast
  reads "Added €3.50 · Food", Today reads "€40.50", and `localStorage['travel:progress:v1']['rome-2026-10'].expenses`
  holds one record `{ amount: 3.5, cat: 'food', dayId: 'fri', currency: 'EUR' }` with `at` and `updatedAt`, still
  there after a reload. That is three interactions plus the digits, with no scrolling.
- **C3** When you tap Undo on that toast, then the record has `deleted: true` and Today is "€37.00" again.
- **C4** Given a logged €3.50, when you tap its row, change it to 4 and tap Save, then Today is "€41.00" and the id is
  unchanged; when you tap Delete, the row goes, the record has `deleted: true` and "Deleted €4.00" offers Undo,
  which brings it back.
- **C5** Given the pad, when you tap Food with no amount, then "Type an amount first" shows and nothing is saved;
  a 6th whole digit and a 3rd decimal are ignored; €99,999.99 fits at 320 px.
- **C6** When you double-tap Food within 150 ms, then exactly one record exists.
- **C7** Given Seed S, then the lists show three "Logged earlier" rows: Metro A €25.00 (Transport), Vatican Museums
  €12.00 (Sights), Thursday's "Other spending" €9.00 (Other). When you edit the Vatican row to 13 and save, then a
  record `legacy-stop-vatican-museums-sistine-chapel` with amount 13 exists and Friday is "€38.00" (not €50.00).
  When you delete Thursday's row, then `legacy-day-thu` is a tombstone and Thursday is "€0.00".
- **C8** Given Seed S live Fri 16:40, when `/plan?day=fri&stop=castel-sant-angelo-the-angel-s-terrace` opens, then
  "Costs here" starts within the sheet's first screen; when you tap "Add a cost", then the sheet shows "For: Castel
  Sant'Angelo + the Angel's Terrace", the amount 18 and a ring on Sights; when you tap Sights, then a record
  `{ amount: 18, cat: 'sights', dayId: 'fri', stopId: 'castel-sant-angelo-the-angel-s-terrace' }` exists and the
  stop sheet shows "€18.00" under Costs here.
- **C9** Given Seed S live Fri 16:40, then "Not logged yet" lists Castel Sant'Angelo with "Log €18" and Early lunch
  at Bonci Pizzarium and Climb the dome with "Add"; when you tap "Log €18", then Today is "€55.00" and Castel leaves
  the list.
- **C10** (unit) `costDayFor` gives `fri` for Sat 10 Oct 01:30 Rome, `sat` for 05:00, and `undefined` for 7 Oct and
  13 Oct at noon, whatever the device's time zone.
- **C11** Given Seed S plus a €30 cost linked to "Sunday lunch: La Tavernaccia da Bruno" on Sunday, when you switch
  the Colosseum day to Sun 11 and delete a stop you added that has a linked cost, then "Everything" does not change
  and the orphaned row keeps its title.
- **C12** Given preview at Fri 16:40, then the pad shows "Preview is on. This cost is real and counts for Fri 9.";
  after adding €2 the row carries "Preview" and the banner "1 cost was logged while previewing." offers
  "Remove it", which tombstones it.
- **C13** Given Fresh live 30 Sep 12:00, then `/costs` shows "Your budget", "~€503", "for 5 days · ≈ ₺28,065",
  "Thu €21 · Fri €172 · Sat €155 · Sun €123 · Mon €32" and the day chip "Before the trip"; a €35 Stay cost lands
  in "Before the trip" and in no day.
- **C14** Given Fresh, then no screen shows "NaN", "of ~€0" or an empty number.
- **C15** Given `context.setOffline(true)` after load, then adding, editing and deleting costs work with no page error.
- **C16** Given Fresh live 30 Sep on `/bookings`, when you tick "Vatican Museums, Fri 9 Oct, 08:00", then the toast
  "Booked. One less thing." offers "Log €25" and "Undo"; "Log €25" writes `{ amount: 25, cat: 'sights', dayId:
  'fri', stopId: 'vatican-museums-sistine-chapel', bookingId: 'vatican' }` and the Friday group shows the row with
  "Paid before".
- **C17** Given Seed S live Fri 16:40, then Now shows "€37.00 today · €134.50 left" and "≈ ₺2,065 spent" above the
  hero; tapping the row opens `/costs`; tapping Add opens the cost sheet on Now.
- **C18** Given Seed S, then the Costs "Trip so far" spent, the Progress money card and the Home trip card all read
  €46.

### 9.3 Places and stamps (P0)

- **P1** Given Seed S live Fri 16:40 on `/places`, then at least 4 cards are fully above the tab bar, no card is
  taller than 200 px, the page is at most 8 screens tall, and at most 12 with every set expanded.
- **P2** Then the header reads "3 of 79 stamped" with the chip "Top picks 2/8", and the sets read: Ancient sites 0/10,
  Museums & art 2/7, Churches 0/4, Underground 0/6, Piazzas & views 0/8, Trattorias & pasta 0/11 (12 cards;
  Tonnarello dimmed with "Tourist trap"), Pizza & street food 1/9, Coffee & sweets 0/6 (7 cards; Antico Caffè Greco
  dimmed with "Closed"), Morning light 0/10, Golden hour 0/5, Any time 0/3.
- **P3** Free shows 26 cards. Given preview at Sun 11 Oct 12:00, Open today hides exactly Vatican Museums, Galleria
  Sciarra (the sight), San Sebastiano catacombs, Vatican Necropolis (Scavi), Armando al Pantheon, Da Enzo al 29,
  L'Arcangelo, Mercato di Testaccio and Antico Caffè Greco (72 cards remain). Not stamped leaves 76 cards. Top picks
  leaves 8. Near me with a location at 41.9009, 12.4833 gives a flat list whose first card is "Trevi Fountain".
  Map opens `/map?day=all&places=1&from=places` with the places layer on and Places lit.
- **P4** Then Borghese Gallery reads "In your plan · Sun 14:15" and the Pantheon sight "In your plan · Fri 17:15";
  Tonnarello, Capitoline Museums and the Pantheon photo spot show no plan status.
- **S1** Given Seed S live Fri 16:40, when you open Galleria Doria Pamphilj and tap "I was here", then the toast reads
  "Stamped: Galleria Doria Pamphilj · Museums & art 3/7", the card shows a stamp and `stamps['sight-galleria-doria-
  pamphilj'].on === true`; "Remove stamp" sets `on: false` and the set reads 2/7. Tapping Undo on the first toast
  instead leaves `on: null` and the set at 2/7.
- **S2** Given Seed S live Fri 17:20, when you tap Done on the Pantheon hero, then the toast reads "Done: Pantheon ·
  Stamped" with "Log €7" and "Undo", the Pantheon card is stamped and no `stamps` record was written; Undo removes
  the stamp.
- **S3** When you tap "Log €7", then "Added €7.00 · Sights · Pantheon" shows and Today is "€44.00"; ticking the
  Pantheon again later does not offer Log.
- **S4** Given Seed S live Fri 20:00, when you tick "Dinner at Armando al Pantheon", then Armando is stamped and
  neither Pantheon card is. Given live Sat 10 Oct 23:10, ticking "Trastevere bars" stamps nothing; Tonnarello can
  never be stamped.
- **S5** Given Seed S, when you remove the Vatican Museums stamp (from the plan), then `stamps` holds `{ on: false }`
  and it stays removed after unticking and ticking the Vatican stop again.
- **S6** Given Fresh live 30 Sep, then the place sheet shows "You can stamp places from Thu 8 Oct." and no stamp button.
- **S7** Stamping the Pantheon photo spot with "Got the shot" does not stamp the Pantheon sight, and the other way round.

### 9.4 Game (P0)

- **G1** Given Seed S on `/badges`, then the page reads "2 of 12 badges" with First stamp and Early bird earned,
  Top picks "2 of 8", Critic "3 of 10", Ready to go "16 of 26", Money diary "2 of 3", and the rank card "Viator",
  "the wayfarer", "3 stamps · 5 more to Explorator".
- **G2** Given Seed S on a device that never opened the trip, live Fri 18:40, then the first load shows no badge
  toast; when you tick "Top of the Spanish Steps for sunset (18:38)", then "Done: Top of the Spanish Steps for
  sunset (18:38) · 2 stamps" and exactly one "Badge earned: Golden hour" toast show; after a reload no badge toast
  shows.
- **G3** Given Seed S live Fri 16:40, when you stamp five more places by hand, then the fifth gives one "New rank:
  Explorator · the scout" toast.
- **G4** Given Seed S live Fri 16:40, when you stamp St Peter's Basilica, Santa Maria Maggiore, St John Lateran and
  Tempietto del Bramante, then "Set complete: Churches" shows once and the Churches header shows "Complete".
- **G5** Given a preview, then no celebration shows; after "Back to live", anything earned in the preview
  celebrates once.
- **G6** (unit) `gameBadges` and `gameRank` are pure; unticking lowers them; the same progress gives the same state
  whatever order two devices merged in; nothing about the game is written to `TripProgress`.
- **G7** Given `prefers-reduced-motion: reduce`, then a new stamp appears with no animation and toasts still show.
- **G8** Given Seed S on `/more`, then the card reads "6 of 41 stops done" and "Viator · 3 stamps · 2 badges", the
  strip shows earned badges first, and "All badges" opens `/badges`.

### 9.5 Now, Plan and the day tools (P0 unless marked)

- **L1** Given Seed S, then ticks in the Plan timeline, "Did it" in What's left and "Mark done" on the map card each
  show a toast with Undo.
- **L2** Given Seed S live Fri 22:30, then Now shows "Getting back to YellowSquare" with "Take me home", "Show the
  driver" and "Call a taxi · 060609" under the Next card; live Sat 10 Oct 01:45 it sits above "That's today done";
  live Mon 12 Oct 21:30 it does not show. "Show the driver" opens the full-screen card starting "Per favore, mi
  porti a:".
- **L3** Given Seed S live Fri 16:40 with the Colosseum day chosen, then Plan shows the Colosseum question as one
  row, the day's alerts folded under the first, and the first timeline row starting above 780 px.
- **L4** Then Plan's "Your day" shows "Spent this day: €37.00 of €171.50", "≈ ₺2,065" and "Add a cost", and no
  number input.
- **L5** When you type in the Day journal and switch day within 100 ms, then the text is saved on the first day.
- **L6** When you tap the 4th star twice on touch, then no star is lit.
- **L7** Given Seed S on `/packing`, then the 5 items to pack come first and the packed ones sit under "Packed · 12";
  ticking the last one shows "All packed. Buon viaggio!".
- **L8** Given 320 px, then Now has no sideways scroll and "Remind me when to leave" shows in full.
- **L9** Given Seed S live Fri 16:40, then "Today so far" includes "3 stamps today" and the Next card's leave-by line
  fits on one line at 390 px.

### 9.6 Offline map (P0)

- **O1** Given the generated site with its service worker, Settings → Map → OpenStreetMap and `/map?day=fri` viewed
  online, when the context goes offline and `/map` reloads, then map tiles show (responses larger than 5 KB, none
  from `basemaps.cartocdn.com`), and in dark mode they are dimmed.
- **O2** Given `/map?day=all&places=1`, then place pins show; tapping one opens the place sheet; stamped places have
  the `got` class. While previewing, the day chips are not covered by the preview bar (hit test).

### 9.7 Data and sync (unit unless marked, P0)

- **D1** `mergeProgress` keeps both devices' expenses and stamps; the newer `updatedAt` wins; a newer tombstone beats
  an older live copy and a newer live copy beats an older tombstone; on equal times the deletion wins; `merge(a, b)`
  deep-equals `merge(b, a)` for both maps; merging a copy with itself changes nothing.
- **D2** An unknown top-level field (`future: { x: 1 }`) survives `mergeProgress`.
- **D3** `isPristine` is false with only an expense tombstone, only a stamp record or only a `variant`; true for
  `emptyProgress()`.
- **D4** `decide()` with a newer cloud copy lacking both keys and an unchanged local copy holding expenses returns
  `merge`, and the merged JSON keeps the local expenses.
- **D5** A never-synced device holding only an expense, facing a cloud tombstone, uploads.
- **D6** (cloud e2e) A adds €5 and B adds €7 while offline: both show €12 after sync; A deletes €5 while B edits €7 to
  €8: both show only €8.
- **D7** Importing an older backup keeps newer local expenses and stamps.
- **D8** Two devices editing the same legacy row give one record under `legacy-stop-<id>` and never a double total.

### 9.8 Accessibility and copy (P0)

- **A1** On a coarse pointer, every button, link and `[role=button]` on Now, Plan, Places, Costs, More, Bookings and
  Packing has a hit box of at least 44 × 44 px (its `::after` counted), inline text links excepted.
- **A2** In dark mode, toast actions reach 4.5:1, text on Costs, Places, Badges and the place sheet reaches 4.5:1, and
  stamp ink, rims and seals reach 3:1 against their surface.
- **A3** The keypad works with a physical keyboard (digits, `.`, `,`, Backspace, Enter to save in edit mode, Escape to
  close); focus stays in an open sheet and returns to the opener.
- **A4** A search for U+2014 (the em dash) over new and changed files and the how-to note finds nothing
  (`grep -rnP '\x{2014}' <files>`).

### 9.9 On the phone (by hand, before the freeze)

- Add, edit and delete a cost on the iPhone in the installed app, online and in airplane mode; the keypad never
  raises the system keyboard and every button stays visible.
- Tick a stop with a fixed price and use "Log"; stamp a place; see a badge toast once.
- Open the map offline after looking around with OpenStreetMap on.
- Open the app on every signed-in device after the deploy, then log one pre-trip cost and see it on the others.

### 9.10 Docs (P0)

- **X1** Every statement in `content/notes/2026-09-30-how-to-use-travels.md` is true, and it mentions Costs, stamps
  and badges, the Getting back card and how to save the map for offline use.
- **X2** `README.md` and `docs/content-guide.md` describe the new tabs, Costs, the Places collection, badges and the
  optional `set` and `placeId` fields; the README credits OpenStreetMap for tiles; its screenshots show the new UI.
- **Q1** `npm test`, `npm run typecheck` and `npm run generate` pass; `package.json` dependencies are unchanged; the
  network log shows no new hosts except `tile.openstreetmap.org`.

---

## 10. Delivery

| Wave | Package | Scope |
|---|---|---|
| 0 | F · Foundation | types, `costs.ts`, `places.ts`, `plan.ts`, `sync.ts` and their tests; `useProgress`, `useTripView`, `useTripActions`; toasts; bottom sheet; tokens, hit areas, icons, UI helpers; `StampMark.vue`; the browser-check helpers; placeholders for `CostSheet.vue` and `PlaceSheet.vue` |
| 1 | W · Costs | Costs page, cost pad, cost sheet, cost rows; the stop sheet (costs and stamps); the feedback editor |
| 1 | P · Places and map | Places page, cards, place sheet; map page, markers, OpenStreetMap tiles and caching; stop editor |
| 1 | G · Navigation and game | the trip shell (tabs, header, mounts); More hub; Badges page; `game.ts`; celebrations; Progress; trip settings |
| 1 | N · Now, Plan and day tools | Now (money row, ticks, Getting back); Plan (ticks, compact top, Your day); SOS driver card; star rating; bookings; packing; app settings import |
| 2 | I · Integration and docs | how-to note, README and screenshots, content guide, the cross-screen checks (`tests/e2e/ui.e2e.mjs`), the two-device cost test in the cloud test, gates and fixes |

**Files by package.** Each file has one owner; nobody else edits it in the same wave.

| Package | Files (new ones in bold) |
|---|---|
| F | `shared/types/trip.ts`; **`shared/utils/costs.ts`**; **`shared/utils/places.ts`**; `shared/utils/plan.ts`; `shared/utils/sync.ts`; **`tests/costs.test.ts`**; **`tests/places.test.ts`**; `tests/sync.test.ts`; `tests/plan.test.ts`; `tests/seeds.test.ts`; `app/composables/useProgress.ts`; `app/composables/useTripView.ts`; **`app/composables/useTripActions.ts`**; `app/composables/useToast.ts`; `app/components/ToastHost.vue`; `app/components/BottomSheet.vue`; **`app/components/StampMark.vue`**; `app/assets/css/main.css`; `app/utils/icons.ts`; `app/utils/ui.ts`; **`tests/e2e/lib.mjs`**. It also writes the first, placeholder version of `CostSheet.vue` and `PlaceSheet.vue`, which belong to W and P. |
| W | **`app/pages/trips/[id]/costs.vue`**; **`app/components/CostSheet.vue`**; **`app/components/CostPad.vue`**; **`app/components/CostRow.vue`**; `app/components/StopSheet.vue`; `app/components/FeedbackEditor.vue`; **`tests/e2e/costs.e2e.mjs`** |
| P | `app/pages/trips/[id]/places.vue`; **`app/components/PlaceTile.vue`**; **`app/components/PlaceSheet.vue`**; `app/pages/trips/[id]/map.vue`; `app/components/MapView.vue`; `app/utils/mapdata.ts`; `app/components/StopEditor.vue`; `nuxt.config.ts`; **`tests/e2e/places.e2e.mjs`** |
| G | `app/pages/trips/[id].vue`; `app/pages/trips/[id]/more.vue`; **`app/pages/trips/[id]/badges.vue`**; `app/pages/trips/[id]/progress.vue`; `app/pages/trips/[id]/settings.vue`; **`app/components/BadgeSeal.vue`**; **`app/components/RankCard.vue`**; **`app/components/GameHost.vue`**; **`app/composables/useGame.ts`**; **`shared/utils/game.ts`**; **`tests/game.test.ts`**; **`tests/e2e/game.e2e.mjs`** |
| N | `app/pages/trips/[id]/now.vue`; `app/pages/trips/[id]/plan.vue`; **`app/components/HomeCard.vue`**; **`app/components/DriverCard.vue`**; `app/pages/trips/[id]/sos.vue`; `app/components/StarRating.vue`; `app/pages/trips/[id]/bookings.vue`; `app/pages/trips/[id]/packing.vue`; `app/pages/settings.vue`; **`tests/e2e/day.e2e.mjs`** |
| I | `content/notes/2026-09-30-how-to-use-travels.md`; `README.md`; `docs/content-guide.md`; `docs/screenshots/*.webp`; **`tests/e2e/ui.e2e.mjs`**; `tests/e2e/cloud.e2e.mjs`; after wave 1 is finished, the smallest fix in any file for a failing gate, each one named |

Left alone on purpose: `app/data/rome.ts` and `app/data/trips.ts` (D17); Home (`app/pages/index.vue`,
`TripCard.vue`), which gets ledger totals through `summarize()`; `StopRow.vue`, `DayStrip.vue` and `PreviewBar.vue`
(their parents change instead); the Firestore and Storage rules (progress is stored as JSON text); `package.json`
and the workflows.

Calendar: foundation Thu 1 Oct; wave 1 Fri 2 Oct; integration Sat 3 Oct; phone testing Sun 4 to Tue 6 Oct; code
freeze Wed 7 Oct 18:00, then fixes for broken things only. Deploys are the owner's push to `main`. Before the
deploy, export a backup; after it, open the app on every signed-in device.

Working model: no package commits, pushes or deploys; the work stays uncommitted on `ui-refresh` for the owner
to review and commit. Wave 1 shares that checkout and one dev server on port 3000; `npm run generate` runs only
in waves 0 and 2, because two Nuxt processes in one directory both rewrite `.nuxt`.

---

## 11. Later (not in this build; each is the owner's call)

- Costs: entering costs in lira; a "₺ first" switch; cash on hand ("Cash left: €85 of €150"); one-tap repeats
  ("Again: Espresso €1.20") and presets (Tap&Go €1.50); ≈ ₺ next to every price on cards and timeline rows;
  editable daily budget.
- Game and keepsakes: Taste of Rome (stamp the 9 dishes, try 5); a day recap card with a shareable postcard image
  made on the phone; the trip wrap and a lifetime passport on Home with "Where next?"; stamps lit by the moment
  you were there; arrival and departure stamps from the flights; set-complete seals on the Badges page.
- Places: "Near you now" row and "Collect nearby" on Now; "Good light now" for photo spots; rate and note a place;
  "On the spot" mark when the location is within 150 m; a "You're here, stamp it?" prompt (opt in).
- Plan and Now: day pills instead of the art strip on phones and a "Jump to now" pill; a start-the-day card with
  today's tickets and the two toggles; "€18 saved" on skips; a calmer Progress headline (stamps and money before
  "15% done") and a neutral "Tidy up" line after the trip.
- Home: stamps on the trip card and in the stats row; recompute once a minute instead of every 5 s.
- Sync: tombstones for unticking stops, bookings and packing, and field-level merges for feedback (the known
  limits M1 to M8 of the QA review).
- Data (one commit before a freeze, it shows "Update / Keep mine" once): `placeId` on stops the matcher misses
  (Pincio terrace, Vittoriano terrace photo spot, Gianicolo); `set` overrides for L'Arcangelo and Pastificio Guerra;
  the Friday pub crawl priced in euros; a `gettingHome` line per trip.
- Small: the em dash (U+2014) used as an empty option label in the trip form; explaining a deep link to a stop
  in the other Colosseum version; an Android home-screen shortcut "Add a cost".

---

## Appendix A. Place sets for Rome

Rules: 5.3. Scene map: ancient = colosseum, forum, ruins, appia, argentina, pantheon; art = spiral, borghese,
capitoline, gallery, perspective, castel; church = stpeters, church, tempietto; underground = catacomb (and the
name words of 5.3); views = trevi, steps, navona, keyhole, lake, market, skyline, vittoriano, alley;
pasta = rigatoni, carbonara, cacio, lasagna; street = taglio, tonda, pizzabianca, suppli, trapizzino, panino;
sweet = gelato, tiramisu, maritozzo, espresso.

| Set | Collectable / cards | Places |
|---|---|---|
| Ancient sites | 10 / 10 | Colosseum + Forum + Palatine (24h); Colosseum Full Experience; Forum Pass SUPER; Colosseum night tour; Pantheon; Largo Argentina walkway; Domus Aurea; Baths of Caracalla; Ostia Antica; Appian Way |
| Museums & art | 7 / 7 | Vatican Museums; Borghese Gallery; Castel Sant'Angelo; Capitoline Museums; Galleria Sciarra; Galleria Doria Pamphilj; Galleria Spada |
| Churches | 4 / 4 | St Peter's Basilica; Santa Maria Maggiore; St John Lateran; Tempietto del Bramante |
| Underground | 6 / 6 | San Callisto, Domitilla, San Sebastiano and Priscilla catacombs; San Clemente (underground levels); Vatican Necropolis (Scavi) |
| Piazzas & views | 8 / 8 | St Peter's dome; Trevi Fountain; Spanish Steps; Vittoriano + terrace; Aventine Keyhole; Giardino degli Aranci; Villa Borghese park + Pincio; Porta Portese flea market |
| Trattorias & pasta | 11 / 12 | Armando al Pantheon; Da Enzo al 29; La Tavernaccia da Bruno; Cesare al Casaletto; Flavio al Velavevodetto; Felice a Testaccio; La Taverna dei Fori Imperiali; Trattoria Monti; Pastificio Guerra; Salumeria Roscioli; Osteria da Fortunata; Tonnarello (tourist trap, not collectable) |
| Pizza & street food | 9 / 9 | L'Arcangelo; Bonci Pizzarium; Mercato di Testaccio; Mercato Centrale; Antico Forno Roscioli; Supplì Roma; Supplizio; Trapizzino; Seu Pizza |
| Coffee & sweets | 6 / 7 | Two Sizes; Sant'Eustachio il Caffè; Giolitti; Pompi; Gelato (Otaleg, Fatamorgana, Gracchi, Fassi); Pasticceria Regoli; Antico Caffè Greco (closed, not collectable) |
| Morning light | 10 / 10 | Trevi Fountain; Largo Gaetana Agnesi wall; Spanish Steps; Piazza Navona; Pantheon; Via della Conciliazione; Ponte Sant'Angelo + river steps; Trastevere lanes; Aventine Keyhole; Giardino degli Aranci |
| Golden hour | 5 / 5 | Vittoriano terrace; Capitoline terrace; Ponte Umberto I; Pincio terrace; Gianicolo terrace |
| Any time | 3 / 3 | Momo staircase; Galleria Sciarra; Galleria Spada |

Total 81 cards, 79 collectable.

## Appendix B. Stops that stamp places (default plan, Colosseum on Saturday)

| Day and time | Stop | Stamps |
|---|---|---|
| Fri 08:00 | Vatican Museums + Sistine Chapel | Vatican Museums |
| Fri 11:15 | Early lunch at Bonci Pizzarium | Bonci Pizzarium |
| Fri 12:15 | St Peter's Basilica + the free Grottoes | St Peter's Basilica |
| Fri 15:00 | Castel Sant'Angelo + the Angel's Terrace | Castel Sant'Angelo |
| Fri 17:15 | Pantheon | Pantheon (sight) |
| Fri 17:55 | Galleria Sciarra (a small step) | Galleria Sciarra (sight) |
| Fri 18:05 | Trevi Fountain | Trevi Fountain (sight) |
| Fri 18:20 | Top of the Spanish Steps for sunset (18:38) | Spanish Steps (sight and photo spot) |
| Fri 19:30 | Dinner at Armando al Pantheon | Armando al Pantheon |
| Sat 08:30 | Colosseum | Colosseum + Forum + Palatine (24h) |
| Sat 17:45 | Vittoriano: Terrazza delle Quadrighe for sunset (18:37) | Vittoriano + terrace |
| Sat 19:15 | Via dei Fori Imperiali past the floodlit Colosseum | Colosseum + Forum + Palatine (24h) |
| Sun 10:00 | Porta Portese flea market | Porta Portese flea market |
| Sun 10:45 | Trastevere lanes → Piazza di Santa Maria in Trastevere | Trastevere lanes (photo spot) |
| Sun 11:30 | Tempietto del Bramante (San Pietro in Montorio) | Tempietto del Bramante |
| Sun 13:00 | Sunday lunch: La Tavernaccia da Bruno | La Tavernaccia da Bruno |
| Sun 14:15 | Borghese Gallery, 15:00–17:00 (the default pick) | Borghese Gallery |
| Sun 17:00 | Villa Borghese park and its small lake | Villa Borghese park + Pincio |
| Sun 19:15 | Via Margutta → the Spanish Steps lit up | Spanish Steps (sight and photo spot) |
| Mon 07:00 | Spanish Steps, nearly empty (sunrise 07:19) | Spanish Steps (sight and photo spot) |
| Mon 07:25 | Trevi Fountain from the piazza | Trevi Fountain (sight and photo spot) |
| Mon 08:30 | Piazza Navona, almost empty | Piazza Navona (photo spot) |
| Mon 09:00 | Pantheon, first entry at 09:00 (the default pick) | Pantheon (sight) |

20 places, all 8 top picks among them. With the Colosseum on Sunday, "Lunch in Monti: Taverna dei Fori Imperiali"
also stamps La Taverna dei Fori Imperiali and "Queue for Da Enzo al 29" stamps Da Enzo al 29 (when picked).
Never stamped by the plan: Tonnarello, Capitoline Museums, the Pantheon photo spot, any place 43 m from a stop.

## Appendix C. Planned-cost texts and what they offer

One amount (Log): "€7.45", "€14", "€55", "€14 city tax", "€1.50 tap", "€25", "€18", "€7", "€94", "€10", "about €13",
"€24" (12 texts). Free, nothing to log: "Free", "Included", "Free, no ticket". Amounts to pick from (Add):
"~€10–15", "€10–22", "Piazza free · basin €2", "~€30–45", "€15 online · €20 door", "€15–20", "~€4–5", "€18 or €24",
"€10–25", "Drinks €8–16 · dinner €25–50", "€3–12 a drink", "Free RSVP · else €10 / €15", "€1.50 / ~€20",
"~€4–5 + €1.50", "Pasta €12–15", "€5–15", "€10–45", "€1.50 / from €3.50", "dorm ~€35–70/night + €3.50/night tax",
"€7 · €17/€22". Nothing (no euro amount): "Buy online", "≈US$40–56", "Price not out yet", "Cheap drinks",
"Tip-based", "Price not listed", "~$11–21".

## Appendix D. New icons, sets and cost categories

New icons for `app/utils/icons.ts` (24 × 24, stroked with `currentColor`, like the others):

```ts
column: '<path d="M4 4.5h16M5.5 4.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2M8 6.5v12M12 6.5v12M16 6.5v12M6 18.5h12M4.5 21h15"/>',
church: '<path d="M5 21v-8h14v8M3.5 21h17M6.5 13a5.5 5.5 0 0 1 11 0M12 3.5v4M10.2 5.3h3.6M10 21v-4a2 2 0 0 1 4 0v4"/>',
arch: '<path d="M4 21V10a8 8 0 0 1 16 0v11M2.5 21h19M9 21v-7a3 3 0 0 1 6 0v7"/>',
slice: '<path d="M3.5 6.5C9 3.8 15 3.8 20.5 6.5L12 21z"/><path d="M5.8 9.6c4-1.6 8.4-1.6 12.4 0"/><circle cx="10.5" cy="12.5" r="1.1"/><circle cx="13.6" cy="15.2" r="1"/>',
laurel: '<path d="M12 20.5c-4.5-.8-7.6-4.6-7.6-9.3 0-1.7.4-3.3 1.1-4.7M12 20.5c4.5-.8 7.6-4.6 7.6-9.3 0-1.7-.4-3.3-1.1-4.7"/><path d="M5.5 6.5c1.3.3 2 1.3 2 2.6-1.3-.1-2.2-1-2-2.6zM4.4 11c1.4 0 2.4.9 2.6 2.2-1.4.1-2.5-.8-2.6-2.2zM5.6 15.4c1.4-.3 2.6.4 3 1.6-1.3.4-2.6-.3-3-1.6zM18.5 6.5c-1.3.3-2 1.3-2 2.6 1.3-.1 2.2-1 2-2.6zM19.6 11c-1.4 0-2.4.9-2.6 2.2 1.4.1 2.5-.8 2.6-2.2zM18.4 15.4c-1.4-.3-2.6.4-3 1.6 1.3.4 2.6-.3 3-1.6z"/>',
stamp: '<path d="M9.5 3.5h5l-.8 5.5h-3.4z"/><path d="M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H5z"/><path d="M4 17.5h16M6 20.5h12"/>',
medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.6 10.2 6 3.5h4l2 4.5 2-4.5h4l-2.6 6.7"/>',
backspace: '<path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
```

`PLACE_SET_META` (labels and blurbs as in section 6):

| Set | Icon | Colour |
|---|---|---|
| ancient | `column` | `--c-sight` |
| art | `image` | `--c-sight` |
| church | `church` | `--c-sight` |
| underground | `arch` | `--c-sight` |
| views | `eye` | `--c-sight` |
| sight-other | `landmark` | `--c-sight` |
| pasta | `food` | `--c-food` |
| street | `slice` | `--c-food` |
| sweet | `coffee` | `--c-food` |
| food-other | `food` | `--c-food` |
| morning | `sunrise` | `--c-night` |
| golden | `sunset` | `--c-night` |
| anytime | `camera` | `--c-night` |

`COST_META`: Food `food` `--c-food`; Sights `ticket` `--c-sight`; Nightlife `glass` `--c-night`; Transport `metro`
`--c-move`; Stay `bed` `--c-rest`; Other `tag` `--c-task`.

---

## 12. Accounts and one home

Added on 30 Sep 2026, after the owner tried Google sign-in on the phone, and placed after the appendices so that
nothing above changes. It records decisions D30 to D41, the contract between the three packages that build them,
and their acceptance tests.

### 12.1 The request and what went wrong

The owner's words, verbatim:

> In the mobile side the popup was blocked also Unable to process request due to missing initial state. This may
> happen if browser sessionStorage is inaccessible or accidentally cleared. Some specific scenarios are - 1) Using
> IDP-Initiated SAML SSO. 2) Using signInWithRedirect in a storage-partitioned browser environment.
>
> I want you to deploy to only 1 place not multiple places. Also every trip detail needs to be user specific I think
> we can use firebase auth only right? Have a landing page for the app about telling the features and implement the
> features as I said so that everthing is recorded in the firestore

The diagnosis, from the code and Firebase's documentation:

- **"The popup was blocked."** Off the Firebase domain (the GitHub Pages copy), `signIn()` in
  `app/composables/useCloud.ts` awaited the dynamic Firebase import before `signInWithPopup`, so the popup no longer
  opened inside the tap's user gesture and Safari blocked it.
- **"Missing initial state."** Firebase's handler page on `travela-emre.firebaseapp.com` lost its sessionStorage
  state. That happens when the redirect starts on another domain (storage partitioning: the Pages copy) or when a Home
  Screen web app's Google page runs outside the app's browsing context. Firebase's guidance
  (https://firebase.google.com/docs/auth/web/redirect-best-practices): an app served from the `firebaseapp.com`
  domain that is its `authDomain` is not affected by the partitioning problem. Fixes for installed web apps use
  `signInWithRedirect` there, because popups fail in iOS Home Screen apps.
- **One account only.** The rules let only the first account (`meta/owner`) use the app, and a second account signing
  in on the same device would have merged the first account's device copy into its own account. Both change for
  per-account data.

### 12.2 Decisions

Numbered after D1 to D29 (section 2).

**D30. One home: https://travela-emre.firebaseapp.com.** CI deploys only to Firebase Hosting: the site, the Firestore
rules and the Storage rules. The GitHub Pages jobs and the `pages` permission go. `travela-emre.web.app` keeps
forwarding to `firebaseapp.com` (`app/plugins/cloud.client.ts` already does). The Pages-only "Travels has a new home"
block in `app/pages/index.vue` and `appConfig.firebaseLive` go. The copy already published on Pages stays online until
the owner unpublishes it in GitHub (Settings > Pages); the README says how. Why: the owner's "deploy to only 1 place",
and sign-in only works reliably on the address that is the app's `authDomain` (12.1).

**D31. How sign-in opens, on the app's own address** (`location.hostname === appConfig.firebase.authDomain`). An
installed Home Screen app (`navigator.standalone`, or `display-mode` `standalone`, `fullscreen` or `minimal-ui`) or a
touch device (`matchMedia('(pointer: coarse)')` or a mobile user agent) uses `signInWithRedirect`. A desktop browser
tab uses `signInWithPopup`, called synchronously inside the click (no `await` before it: Firebase is preloaded with
`cloud.prepare()` as soon as a sign-in button is on screen); on `auth/popup-blocked` it falls back to
`signInWithRedirect`. On any other host (localhost, tests) it uses the popup, as before. `getRedirectResult` runs at
start, as before, and its error shows where the sign-in button is. A failed return from Google says "Sign-in didn't
finish. Open travela-emre.firebaseapp.com in Safari or Chrome and try again." Why: 12.1. A redirect keeps a Home
Screen app in its own browsing context, and a popup opened inside the tap is not blocked.

**D32. Any Google account can sign in, and each one reads and writes only its own data.**
`firebase/firestore.rules`: `users/{uid}/items/{item}` is readable and writable only when `request.auth.uid == uid`,
keeping today's field checks and adding `json.size() < 1000000`; everything else is denied. `meta/owner` and `claim()`
go; the old owner document stays in the database untouched (cloud data is never deleted). `firebase/storage.rules`
stay (already per uid). The setup script's sign-up lock stays an optional tool that is not run, and its texts stop
saying that the first sign-in claims the app. Why: the owner's "every trip detail needs to be user specific", with
Firebase Auth only.

**D33. Sign-in is required.** A device with no account sees the landing page at `/`; every other route
(`/trips/...`, `/notes`, `/notes/...`, `/settings`, `/trips/new`) sends it to `/` (a global route middleware). The
signed-in home at `/` is today's trips list.

**D34. A device remembers the account it belongs to.** `localStorage` `travel:account:v1` holds
`{ uid, name, email, photo }`, written when someone signs in. With a remembered account the app opens straight into
the trips from the device's copy (offline too) while Firebase restores the session in the background. If Firebase
reports no session, the app stays usable and shows "Sign in again to keep saving to your account." with a Sign in
button on the home screen and in settings; it never throws the person out.

**D35. The device copy belongs to one account.** Signing in on a device whose copy has no remembered account (the app
as used before this change, for example the Rome trip seeded on the phone and its ticks) merges that copy into the
account, as before. Signing in with a different account than the remembered one first clears the device copy (trips,
progress, the cloud sync memory, the seeded and pending-update bookkeeping, photos in IndexedDB), then that account's
data arrives from Firestore. The decision (keep, adopt or clear) is a pure function in `shared/utils/account.ts` with
unit tests. Why: one account's trips must never reach another account (12.1).

**D36. Sign out returns to the landing page.** The device copy stays with the remembered account, so the same person
signing back in sees it at once (offline too); until then it is hidden behind the landing page. When changes haven't
reached the account yet (items this device hasn't agreed with the cloud, or photos waiting), sign-out first warns:
"{n} changes haven't reached your account yet. Stay signed in until you're online, or sign out anyway." with
[Stay signed in] and [Sign out anyway]. "Sign out and remove from this device" (the old forget) clears the device
copy and the remembered account.

**D37. Trips are per account: nothing is added to an account automatically.** The signed-in home with no trips
offers "Plan a trip" (`/trips/new`) and "Try the sample trip" (a copy of the Rome plan with its `seedId`, so updates
pushed to the repository still reach it through Update / Keep mine). Copies that already carry a `seedId` keep
receiving updates as before. The "seeded" bookkeeping that added seed trips by itself goes; the update check stays.

**D38. A landing page at `/` for a device with no account.** Mobile first, in the app's Roman look. The hero: the
app's name, a one-line promise, [Sign in with Google], and "Free · private to your Google account · works offline".
One feature card per job: Now (what to do this minute, when to leave), Plan (days, options, the Colosseum-style
switches), Places (collect stamps, sets), Costs (a 3-tap keypad, euros and your home currency), Badges and ranks
(Peregrinus to Imperator), Offline and on every device, and Private. "How it works" in three steps: sign in; plan a
trip or try the sample; open Now on the day. Visuals come only from the existing SVG art (`SceneArt`, `StampMark`,
`BadgeSeal` with sample props): no images and no external requests. Light and dark, 320 to 1280 px. It never shows
trip data from the device. Why: the owner's "Have a landing page for the app about telling the features".

**D39. Everything the traveller records is in Firestore.** Trips, and progress with ticks, ratings, notes, costs,
stamps, bookings, packing, day notes and choices, under `users/{uid}/items`; photos in Storage under
`users/{uid}/photos`; as before, once signed in. Device-only by design: the theme, the map choice, alert settings,
and which celebrations this device already showed. Why: the owner's "everthing is recorded in the firestore".

**D40. One deploy job.** On a push to `main` (and `workflow_dispatch`): checkout, Node 22, `npm ci`, unit tests,
typecheck, `generate` with `NUXT_APP_BASE_URL=/`, keyless Google auth (the same Workload Identity provider and service
account), then `firebase-tools@15 deploy --only hosting,firestore:rules,storage`. Billing is on, so the Storage rules
are no longer `continue-on-error`. The `firebase-ready` gate and `.github/firebase-ready` go.
`.github/workflows/cloud-tests.yml` stays.

**D41. Tests.** Unit tests for `shared/utils/account.ts`. `tests/e2e/cloud.e2e.mjs` (emulators): two accounts on two
devices can't read each other's items (the rules); on one device A signs out and B signs in, B never sees A's trips
and nothing of A's reaches B's account; A signs back in on that device and gets A's data back from the cloud;
sign-out with pending changes warns; every existing sync check keeps passing (the owner check becomes the isolation
check). `phone()` in `tests/e2e/lib.mjs` marks the device as signed in by default (a remembered account written
before any script runs, Firebase not loaded), so every existing browser suite keeps running;
`phone(browser, { signedOut: true })` opens as a device with no account.

### 12.3 Contract between the packages

`useCloud()` keeps its current fields and gains or changes these:

| Name | Type | What it is |
|---|---|---|
| `account` | `ComputedRef<CloudUser \| null>` | The remembered account (`travel:account:v1`): set at sign-in; after a sign-out it reads `null` (the landing page shows) while the device keeps the record, marked `out`, with its copy for the same account; cleared by `forget()` |
| `signedIn` | `ComputedRef<boolean>` | Firebase reports a user right now |
| `prepare()` | `Promise<void>` | Loads Firebase ahead of a tap where sign-in opens a popup (called when a sign-in button mounts); where it goes to Google's page, nothing loads before the tap (12.6) |
| `signIn()` | `Promise<void>` | D31 |
| `signOut(opts?: { force?: boolean })` | `Promise<'done' \| 'pending'>` | Returns `'pending'` and changes nothing when there are unsynced changes and `force` isn't true |
| `forget()` | `Promise<void>` | Signs out and clears the device copy and the remembered account |
| `pending` | `ComputedRef<number>` | Items not yet agreed with the cloud, plus photos waiting |
| `status` | `CloudStatus` | As before, without `'not-owner'` |

`useTrips().addSample(seedId?: string): Trip | undefined` adds a copy of a seed trip (the first seed by default) to
the device copy; the empty home calls it. A route middleware sends a device with no remembered account and no
signed-in user to `/` from every route except `/`.

### 12.4 Acceptance tests (browser unless marked)

- **W1** A fresh device at `/` sees the landing page, with no trip data; `/trips/rome-2026-10/now`, `/notes` and
  `/settings` go to `/`.
- **W2** The landing page at 390 × 844, 320 × 640 and 1280 px, light and dark: no sideways scroll, targets of at
  least 44 px, text contrast of 4.5:1, every feature card present, one primary [Sign in with Google] above the fold on
  a phone, and no network request except to the app's own origin.
- **W3** The sign-in method (unit, or browser with stubs): standalone or a coarse pointer on the app's own address
  uses the redirect; a desktop uses the popup inside the click; a blocked popup falls back to the redirect; other
  hosts use the popup.
- **W4** (emulators) Two accounts can't read each other's items. A signs out and B signs in on the same device: B's
  home shows none of A's trips and B's cloud gets none of A's items; A signs back in and gets A's trips back.
- **W5** (emulators) A device used before this change (Rome seeded, ticks) signs in for the first time: its trips and
  progress reach the account.
- **W6** Signed in with no trips: "Plan a trip" and "Try the sample trip"; the sample appears with its `seedId`, and
  the Update / Keep mine flow still works.
- **W7** Sign-out with pending changes shows the warning; [Stay signed in] keeps everything; [Sign out anyway] goes to
  the landing page.
- **W8** A remembered account whose session is gone: the app opens into the trips, and home and settings show "Sign in
  again to keep saving to your account."
- **W9** `.github/workflows/deploy.yml` has one job and no GitHub Pages step, and its YAML is valid.
- **W10** Every existing gate stays green: `npm test`, `npm run typecheck`, `npm run generate`,
  `node tests/e2e/lib.mjs --build` and all the browser suites (costs, places, game, day, ui) against the build; no em
  dash in any new or changed file; `package.json` and `package-lock.json` unchanged.

### 12.5 Delivery

Three packages work at the same time on disjoint files (new ones in bold), in one checkout as in section 10.
Nothing touches the real Firebase project, Google Cloud or GitHub: everything is tested locally or on the emulators.

| Package | Scope | Files |
|---|---|---|
| A · Accounts and sign-in | D31 to D37, D39 and D41 on its files; provides the contract (12.3) | `app/lib/firebase.ts`; `app/composables/useCloud.ts`; `app/plugins/cloud.client.ts`; `app/composables/useTrips.ts`; `app/lib/photoStore.ts`; `app/composables/usePhotos.ts`; **`app/middleware/auth.global.ts`**; **`shared/utils/account.ts`**; **`tests/account.test.ts`**; `firebase/firestore.rules`; `tests/e2e/cloud.e2e.mjs`; `tests/e2e/lib.mjs` |
| B · Landing page, home and account UI | D30's home and app config, D33, D34's messages, D36's warning, D37's empty home, D38, D39's settings copy; codes against the contract | `app/pages/index.vue`; **`app/components/LandingPage.vue`** (and any other new `Landing*.vue`); `app/components/AccountCard.vue`; `app/pages/settings.vue`; `app/app.config.ts`; `nuxt.config.ts` (title and description only); **`tests/e2e/landing.e2e.mjs`** |
| C · One deploy, the script's texts and the docs | D40; D32's setup-script texts; the README, the content guide, the how-to note and this section | `.github/workflows/deploy.yml`; `.github/firebase-ready` (deleted); `scripts/setup-google-cloud.sh` (texts and the lock step's wording); `README.md`; `docs/content-guide.md`; `content/notes/2026-09-30-how-to-use-travels.md`; `docs/design/2026-09-30-ui-refresh.md` (this section) |

### 12.6 As built: decisions taken while putting the packages together

- **The service worker leaves Firebase's pages under `/__/` to the network.** Its app-shell fallback answered every
  navigation, `/__/auth/handler` and `/__/auth/iframe` included, and on the app's own address both carry Google
  sign-in: once the service worker was installed, a redirect (and a desktop popup's first page) came back as the
  landing page, so sign-in did nothing. `navigateFallbackDenylist` in `nuxt.config.ts` now holds `/^\/__\//` beside
  the archive; O2 in `tests/e2e/ui.e2e.mjs` checks it on the build. (The emulator tests never saw this: the Auth
  emulator's pages live on another address.)
- **`prepare()` loads Firebase only where the popup is used.** On an iPhone, an Android phone or Safari, Firebase
  fetches Google's sign-in script (apis.google.com) as soon as it loads, so preloading it on every landing page broke
  W2 on real phones. A phone, a tablet or the Home Screen app on the app's own address goes to Google's page, which
  needs nothing ready before the tap, so there Firebase loads at the tap. A desktop browser still preloads it for the
  popup. Desktop Safari is the one place the landing page still asks Google before the tap (Firebase's own preload,
  which its popup needs).
- **A sign-in under way stays "Signing in…".** Firebase loaded by the tap first reports nobody signed in; that no
  longer turns the button back before the browser leaves for Google's page. `signIn()` sets the status once it ends.
- **A copy added after a deletion stays.** "Try the sample trip" dates the copy's `createdAt` to the moment it adds
  it, and sync's `decide()` keeps a trip this device never synced when it was made after the account's deletion of
  that trip (another copy, deleted on another device). A copy from before the deletion, like the sample a device from
  before accounts added by itself, still follows the deletion.
- **The rules check in `tests/e2e/cloud.e2e.mjs`** asks the Firestore emulator directly with each account's own
  token: no account reads or writes another's items, nobody reads or writes the old `meta/owner` document (the
  account it names included), and items of another kind, with a text `updatedAt` or of 1,000,000 characters are
  refused.
- **Open, for the owner:** signing in with a different account than the one a device remembers clears that device's
  copy first (D35), and changes of the remembered account that haven't reached it yet are lost with it. The sign-out
  warning (D36) doesn't cover this path ("Sign in again", where Google's account list lets you pick another account).
  Taken after review as D42 (12.7), for the owner to confirm.

### 12.7 After review: decisions taken while fixing (for the owner to confirm)

A security, a mobile and a design review ran on the build. These are the decisions taken alone while fixing what they
found; each has a check in `tests/e2e/cloud.e2e.mjs` (emulators), `tests/e2e/landing.e2e.mjs` or the unit tests.

**D42. Another account's sign-in asks before it clears changes the remembered account hasn't got yet.** Amends D35.
When the device's copy holds changes that haven't reached the remembered account (items and photos, as D36 counts
them), the sign-in of a different account first asks: "This device has {n} changes for {remembered} that haven't
reached that account yet. Remove them and continue as {new}? Cancel keeps them: sign in with {remembered} to save
them." Cancel (or closing the question) signs the new account out again and changes nothing on the device; the
sign-in button then says "Not signed in as {new}, so the {n} changes for {remembered} stay on this device. Sign in
with {remembered} to save them." OK clears the copy as D35 says. With nothing waiting, nothing is asked. Google's
account list picks out the remembered account (`login_hint`), and "Sign in again" adds "Your changes stay on this
device until then" with the account's address. The decision is `accountOnSignIn` (`'ask'`) in
`shared/utils/account.ts`. Why: "Sign in again", where Google lists every account in the browser, silently lost the
ticks, notes and photos made while the session was gone, and so did another account after a forced offline sign-out.
Left for the owner: keeping one device copy per account instead of clearing it (a larger change).

**D43. The notes lists follow the account's trips.** The home and Notes list the notes of the trips the account
holds, and the notes of no trip (the how-to). A new account sees only the how-to; "Try the sample trip" brings the
sample's research, planning chat and illustrated page with it. A note's own page still opens from its link, and the
landing page loads no notes. Why: on a stranger's private home the planning chat, which quotes the owner's messages,
read as someone else's diary. Left for the owner: taking the personal chat and research out of the public build.

**D44. A device's copy is one account's, down to the last write.** A trip screen opened on one copy writes nothing
once that copy is removed (another account came in, or it was removed from this device), and never brings back the
progress of a trip that is no longer on the device. A stop's note saves only what you type, and follows a newer note
from another device, as the day journal does. A photo being saved or fetched while the copy goes is dropped. Only the
photos a stop of the device's copy holds are backed up (a photo nothing holds stays on the device). "Sign out and
remove from this device" forgets the account only once its photos are gone, so the next account's sign-in removes
any left. Why: an open stop sheet copied one account's note into the next account, an untouched one wrote an older
note back over a newer one, and one account's photos reached another's Storage four ways.

Smaller changes, same review:

- **"Try the sample trip" opens the live guide** (amends D37): on the sample's own dates Now is live; otherwise it
  opens as a preview of the sample's second day at 16:40, the moment the landing page shows (before, a countdown;
  after 12 October, a finished trip).
- **A sign-in that never finished leaves nothing on.** At start, Firebase loads only for a remembered account or a
  sign-in coming back from Google's page (Firebase's pending-redirect note in the tab's session storage); when that
  return brings nobody, the device goes back to not loading it. A stalled network keeps the buttons busy for 12 s at
  most, and a page the browser restores from its back-forward cache after leaving for Google's page gets its buttons
  back.
- **The data is described as it is:** "stored under your Google sign-in" and "your account in the cloud" (the
  landing page's Private card, Settings, trip settings, the removal question, the how-to note), not "saved to your
  Google account": the data lives in the app's Firebase project, not in the person's Google account. The hero's
  "private to your Google account" stays (D38).
- **The Firestore rules check an item's name and fields:** an item is named `{kind}-{ref}` and holds only `kind`,
  `ref`, `json`, `updatedAt` and a boolean `deleted`. (Storage's content types stay `image/*`: a narrower list would
  turn one odd file into "photo backup isn't switched on" for the rest of the visit.)
- **The celebrations a device showed go with its copy** (D39's device-only record is removed with the copy).
- **The home's header** keeps its four buttons at 44 px on every phone; below 375 px the logo stands alone.
