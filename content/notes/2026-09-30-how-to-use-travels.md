---
title: How to use the Travels app
date: 2026-09-30
kind: tips
summary: Getting the most out of the app on a trip, and how chats with Claude end up here.
tags: [app, how-to]
---

## On your phone

- Open https://travela-emre.firebaseapp.com and **Add to Home Screen**. It then opens full screen and works offline.
- **Sign in with Google** (the prompt on the home screen, or Settings → Your account) so everything is kept in your account and on every device.
- **Now** is the screen to keep open: the stop you should be at, time left, the next stop and when to leave. **Show me** turns on your location and the map follows you.
- **Remind me when to leave** gives a nudge while the app is open; **Keep screen on** helps while walking.
- **Preview** shows what the guide will say at any moment of the trip, so you can rehearse a day before it happens.
- Tap any stop to rate it, tag it, write a note, log what you spent and add photos. **Progress** turns all of that into planned vs done vs left, money vs budget and a journal.

## Your data

- Signed in, what you tick, rate, write and photograph is kept on the phone and in your Google account, and synced between your devices. Offline, it waits on the phone and syncs when you're back online.
- Only your account can use the app: the first sign-in claims it.
- **Settings → Export everything** still makes a backup file of your own.
- The plans and these notes come from the GitHub repository, so they're the same on every device.
- The old address (mrshn.github.io/travel-app-website) now points here. Sign in there once so what you logged there comes along.

## Maps and times

- Online, the map is Google Maps (switch in **Settings → Map**); offline it's the saved OpenStreetMap map.
- "Leave by" uses Google's live walking and transit routes, including which metro or bus to catch. Without a connection it falls back to its own estimates.

## Saving chats with Claude

In a chat, ask Claude to:

- **"Save this chat to Travels"**: the findings become a note here (research, tips or a chat log), filed under the trip it belongs to.
- **"Add this trip to Travels"** or **"Update the Rome trip in Travels"**: the plan becomes (or updates) a trip in the app, with days, stops, map pins, bookings and packing.
- **"Plan a trip to …"**: Claude asks a few questions first, researches, and offers to save the result here.

After Claude pushes to GitHub, the site rebuilds in about two minutes. A trip you haven't changed on your phone updates by itself; if you have, the app asks before replacing anything and keeps your ticks, notes and own stops.

The repository is public: anything saved here can be read by anyone with the link, so personal details like passport numbers or your birth date are left out.
