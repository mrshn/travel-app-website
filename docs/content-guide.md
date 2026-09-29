# Content guide: saving chats and trips to Travels

Everything the app shows comes from this repository. There are two kinds of content:

| What | Where | Shows up as |
|---|---|---|
| **Notes**: research, tips, chat logs, links to pages | `content/notes/*.md` | *Notes & chats* (home screen, `/notes`, and each trip's **More → Notes & chats**) |
| **Trips**: a full plan with days, stops, bookings… | `app/data/<trip>.ts`, listed in `app/data/trips.ts` | A trip on the home screen with Now, Plan, Map, Progress |

Pushing to `main` rebuilds the site (GitHub Actions → Pages) in about two minutes: https://mrshn.github.io/travel-app-website/

> **The repository is public.** Never save birth dates, passport or ID numbers, visa numbers, booking references, card details, personal phone numbers or emails, or a home address. Businesses' public contacts are fine. Ask before saving anything that feels private.

---

## 1. Notes

One Markdown file per note: `content/notes/YYYY-MM-DD-short-slug.md` (lowercase, hyphens; the date is when it was saved). The file name becomes the URL: `/notes/2026-09-30-rome-trip-chat`.

```md
---
title: "Rome: our planning chat"      # quote it if it contains a colon
date: 2026-09-30                      # YYYY-MM-DD
kind: chat                            # chat | research | tips | note | page
trip: rome-2026-10                    # optional: the trip id it belongs to
summary: One or two sentences shown on the card.
tags: [rome, chat]
link: archive/some-page.html          # only for kind: page (a file in public/ or a full URL)
---

Markdown body…
```

| kind | Use it for |
|---|---|
| `chat` | A log of a conversation: the questions, the answers, the decisions |
| `research` | Findings with sources (a report, a comparison, a checklist) |
| `tips` | Reusable advice not tied to one plan (packing, money, apps) |
| `note` | Anything else |
| `page` | A pointer to a standalone page kept in `public/archive/` |

Markdown supports headings, lists, tables, quotes, bold/italic, code and links (GitHub style). Raw HTML is shown as text. Link another note by its file name, e.g. `[the report](2026-09-28-rome-research-report.md)`. Images must be `https://` URLs. Notes with four or more `##` headings get a table of contents.

**A good chat log**: a short summary at the top, a *Decisions* table, then the conversation with the person's messages quoted as written and Claude's replies summarised (or quoted when short). Link the research note instead of repeating it.

**Updating**: edit the existing file rather than adding a near-duplicate; keep its file name (links and URLs depend on it).

---

## 2. Trips

The data model is in `shared/types/trip.ts`; `app/data/rome.ts` is a complete example.

### Rules that matter

- **`id` and `seedId`**: the same string, `<destination>-<yyyy>-<mm>`, e.g. `lisbon-2026-11`. Never change them after publishing.
- **Stop ids never change once published.** Ticks, ratings, notes and photos on people's phones are stored by stop id. When updating a trip keep every existing id; give new stops new ids (a slug of the title, unique within the trip). An option stop keeps its id when its choices change; choice ids should stay stable too.
- **Times** are minutes after midnight of the day's date: 09:30 → `570`. After midnight add 1440: 01:30 the same night → `1530`. `timeLabel` is the text shown ("09:30", "~23:40", "Before 18:45").
- **`timezone`** is an IANA name (`Europe/Lisbon`). Days are consecutive dates from `start` to `end`.
- **Coordinates must be real.** Look them up; don't guess. `place: { name, lat, lng, query }` where `query` is a Google Maps search string ("Pantheon, Rome").
- **`minor: true`** marks small logistics steps (queue, security, "gate closes"): shown compact, not counted in progress.
- **`kind`**: `sight | food | night | move | rest | task`. For `move` stops, `place` is where the ride takes you and `via` can be `'walk'`, `'ride'` or `{ line, from, to }` (a metro line id from `overlay.lines`).
- **Options**: a stop with `options: { label, default, helper?, note?, choices: [{ id, label, title, lines[], place?, cost?, kind?, icon?, scene?, tod? }] }` lets the person pick one.
- **Variants** (optional): `variant` on the trip plus `days[i].variants[optionId]` for days that change when the person picks another option (see the Colosseum Saturday/Sunday swap in `rome.ts`).
- **`home`**: where they sleep; the first walk of each day starts there.

### Pictures and icons

Each day has `cover: { scene, tod }`; stops, places and bookings can have a `scene` (and `tod`). Scenes are original illustrations:

`alley aperitivo appia argentina borghese bus cacio capitoline carbonara castel catacomb church club colosseum crawl espresso forum gallery gelato hostel keyhole lake lasagna maritozzo market monti navona panino pantheon perspective pizzabianca plane rigatoni ruins skyline spiral spritz stadium steps stpeters suppli taglio taxi tempietto theatre tiramisu tonda train trapizzino trevi vittoriano`

Most are Rome-flavoured; for other cities prefer the generic ones (`plane train bus taxi alley lake market perspective steps church gallery ruins club crawl aperitivo spritz espresso gelato hostel skyline`) and dishes that fit. `tod` is `dawn | day | golden | sunset | blue | night`.

Icon names for `icon` fields: `sun sunset sunrise moon metro train bus taxi walk ticket food camera glass bed plane shield alert check clock shirt speaker bag euro users landmark doc signal chat book info star map pin phone task coffee` (plus the stop hints `sight night photo flight rest move`).

### Optional sections

`bookings` (with `due` dates and `asap`), `bookingTips`, `packing` (strings), `places` (sights/food/photo spots, with `open` per `openDays`), `dishes`, `info` (guide sections made of blocks: `p`, `list`, `table`, `callout`, `tags`, `special`), `sos`, `sosSteps`, `driverCard`, `phrases` (`[local, say it like, meaning]`), `budget` (per day: sights, food, night, transport), `overlay.lines` (metro lines with stations), `fx` (`{ homeCurrency, rate, source }`), `nightCards`, `airport`.

### Adding or updating a trip

1. Write `app/data/<destination>.ts`:
   ```ts
   import type { Trip } from '#shared/types/trip'

   export const lisbonTrip: Trip = { id: 'lisbon-2026-11', seedId: 'lisbon-2026-11', … }
   ```
2. Add it to `SEED_TRIPS` in `app/data/trips.ts`.
3. Run the checks (below). `tests/seeds.test.ts` checks every trip: unique ids, sane times and coordinates, valid options.

How updates reach phones: the app fingerprints each trip. A copy nobody changed updates by itself; a copy changed on the phone gets an **Update / Keep mine** banner, and updating keeps the person's ticks, ratings, notes, photos, own stops and packing items. A new trip in `SEED_TRIPS` appears on every device.

---

## 3. Checks and publishing

```bash
npm ci
npm test            # unit tests, including checks of every trip's data
npm run typecheck
npm run generate    # must build
git add -A && git commit -m "…" && git push origin main
```

Then watch the run: `https://api.github.com/repos/mrshn/travel-app-website/actions/runs?per_page=1` (status `completed`, conclusion `success`), and open https://mrshn.github.io/travel-app-website/notes or the trip.
