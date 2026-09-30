---
title: How to use the Travels app
date: 2026-09-30
kind: tips
summary: Getting the most out of the app on a trip, and how chats with Claude end up here.
tags: [app, how-to]
---

## On your phone

- Open https://travela-emre.firebaseapp.com (the app's only address) and **Add to Home Screen**. It then opens full screen and works offline.
- The first screen shows what the app does. Tap **Sign in with Google**: on the phone, Google's page opens and brings you back to the app (on a computer, a small window opens). Any Google account works, and each one sees only its own trips.
- A new account starts empty: **Plan a trip**, or **Try the sample trip** for the full Rome plan, ready to make your own.
- A trip has five tabs at the bottom: **Now**, **Plan**, **Places**, **Costs** and **More**.
- **Now** is the screen to keep open: the stop you should be at, time left, the next stop and when to leave. **Show me** turns on your location and the map follows you.
- **Remind me when to leave** gives a nudge while the app is open; **Keep screen on** helps while walking.
- **Preview** shows what the guide will say at any moment of the trip, so you can rehearse a day before it happens.
- Tap any stop to mark it done or skipped, rate it, tag it, write a note, add a cost and add photos.
- **Map** and **Progress** now live under **More**. The map is in *Find your way* (the maps on Now and Plan also open it full screen). **Progress & journal** is on the *Your trip* card at the top of More: planned vs done vs left, and a journal you can download.

## Costs

- **Costs** is the money page. Type the amount on its keypad, then tap what it was for (Food, Sights, Nightlife, Transport, Stay or Other): that tap saves it. Today's total, what's left of the day's plan and the lira amount (≈ ₺) update straight away.
- Quick add from anywhere: **Add a cost** in a stop's sheet (linked to that stop), under *Your day* on Plan, or, during the trip, **Add** on the money row at the top of Now. They open the same keypad in a sheet.
- Tick a stop that has a fixed price and the **Done** toast offers **Log €7**: one tap logs it. For a price range it offers **Add cost**, with the amounts to pick from. Ticking a booking offers **Log €25** the same way.
- The toast after each cost or tick has **Undo**. Tap a cost in the list to change or delete it.
- Before the trip a cost counts as *Before the trip* (a ticket bought ahead); **Counts for** picks the day it belongs to.
- Costs logged while previewing are real. The Costs page says so and offers to remove them.

## Stamps, sets and badges

- **Places** is your collection: 81 places in sets such as Ancient sites, Churches and Pizza & street food, with filters like Near me, Not stamped and Top picks.
- Tick a stop at one of those places and it gets a **stamp**. From Thu 8 Oct you can also stamp a place by hand: open it and tap **I was here**, **I ate here** or **Got the shot** (**Remove stamp** takes it back). Tourist traps and closed places aren't part of the collection.
- Stamp every place in a set and its header turns gold and reads **Complete**.
- Your stamps give you a **rank**, from Peregrinus to Imperator, and 12 **badges** reward things like an early start, a sunset, rating ten stops or logging costs on three days. A gold toast celebrates each new one once; they're all under **More → All badges** (or the **Top picks** chip on Places).

## Late at night

- From 21:00 until 05:00, every night of the trip but the last, once your day is done or while you're out, Now shows a **Getting back** card: **Take me home** opens directions to where you're staying, **Show the driver** puts its address up full screen in Italian for a taxi driver, and **Call a taxi** dials the taxi number from SOS.

## Maps and times

- Online, the map is Google Maps (switch in **Settings → Map**). Offline it shows OpenStreetMap, but only the areas you looked at with OpenStreetMap on.
- **Save the map for offline use before the trip:** in **Settings → Map** choose **OpenStreetMap**, then open the map and look around every area you'll visit, zooming in on the streets you'll walk. The app keeps what you looked at for 30 days, so it shows with no signal. You can switch back to Google Maps afterwards.
- "Leave by" uses Google's live walking and transit routes, including which metro or bus to catch. Without a connection it falls back to its own estimates.

## Your data

- Everything you tick, rate, write, log, stamp and photograph is saved to your account in the cloud (stored under your Google sign-in) and kept on the phone, so it works offline and is the same on every device you sign in on. Offline, it waits on the phone and syncs when you're back online; costs and stamps from two phones are merged one by one, so none are lost.
- Your trips are private to your account. Only the phone's own settings stay on the phone alone, such as the look, the map choice, alerts and which celebrations it already showed.
- **Sign out** (**Settings → Your account**) takes you back to the first screen, and the phone keeps your trips for when you sign back in, offline too. If some changes haven't reached your account yet, it warns you first: stay signed in until you're online. **Sign out and remove from this device** clears the phone.
- On a phone that used the app before accounts, the first sign-in brings its trips and ticks into your account.
- Signing in with another Google account on the same phone clears the phone's copy first; everything that reached the first account stays there. If some changes haven't reached the first account yet, the app asks before removing them: **Cancel** keeps them, so you can sign in with the first account and save them.
- If the app says **Sign in again to keep saving to your account**, tap **Sign in with Google** under it. Until then, your changes wait on the phone.
- **Settings → Export everything** still makes a backup file of your own. **Import a backup** merges the file's ticks, costs and stamps with the phone's instead of replacing them.
- These notes and the sample trip come from the GitHub repository. A trip's own notes (its research, its planning chat) show for the accounts that have that trip, for example after **Try the sample trip**.
- The old copy at mrshn.github.io/travel-app-website isn't updated any more and can't reach your account. If you logged anything there, use its **Settings → Export everything**, then **Import a backup** here.

## Saving chats with Claude

In a chat, ask Claude to:

- **"Save this chat to Travels"**: the findings become a note here (research, tips or a chat log), filed under the trip it belongs to.
- **"Add this trip to Travels"** or **"Update the Rome trip in Travels"**: the plan becomes (or updates) a trip in the app, with days, stops, map pins, bookings and packing.
- **"Plan a trip to …"**: Claude asks a few questions first, researches, and offers to save the result here.

After Claude pushes to GitHub, the site rebuilds in about two minutes. A trip saved here isn't added to your account by itself: add it in **Settings**, under **Try the sample trip**. A copy you took from it, like the sample trip, follows its updates: if you haven't changed its plan, it updates by itself; if you have, an **Update / Keep mine** banner asks first, and updating keeps your ticks, notes and own stops.

The repository is public: anything saved here can be read by anyone with the link, so personal details like passport numbers or your birth date are left out.
