<script setup lang="ts">
import type { PlaceCard } from '#shared/types/trip'
import { GAME_BADGES, GAME_RANKS, gameNumeral, type BadgeId } from '#shared/utils/game'

/**
 * The front door ("/" on a device with no account, D38): what the app does, and Sign in with Google.
 * Everything shown is sample content drawn with the app's own parts; nothing comes from the device.
 */
const cloud = useCloud()
const busy = computed(() => cloud.status.value === 'signing-in' || cloud.status.value === 'starting')
/** Which sign-in button was used last: the sign-in message shows under it. */
const at = ref<'top' | 'end'>('top')

// Firebase loads now, so a desktop sign-in window can open inside the tap (D31).
onMounted(() => {
  void cloud.prepare()
})

function signIn(where: 'top' | 'end') {
  at.value = where
  void cloud.signIn()
}

const STAMPS: { place: PlaceCard, date: string }[] = [
  { place: { id: 'sample-colosseum', category: 'sight', name: 'Colosseum', text: '', scene: 'colosseum', set: 'ancient', top: true }, date: '2026-10-10' },
  { place: { id: 'sample-giolitti', category: 'food', name: 'Giolitti', text: '', scene: 'gelato', set: 'sweet' }, date: '2026-10-09' },
  { place: { id: 'sample-trevi', category: 'photo', name: 'Trevi Fountain', text: '', scene: 'trevi', set: 'morning' }, date: '2026-10-11' },
]

const firstRank = GAME_RANKS[0]!.name
const topRank = GAME_RANKS[GAME_RANKS.length - 1]!.name
const rank = GAME_RANKS[1]!
const badge = (id: BadgeId) => GAME_BADGES.find(b => b.id === id)!
const SEALS = [
  { ...badge('early-bird'), earned: true },
  { ...badge('golden-hour'), earned: true },
  { ...badge('night-owl'), earned: false, value: 0, goal: 1 },
]

useHead({ title: 'Travels: your trip, live' })
</script>

<template>
  <main class="landing">
    <div class="cover-wrap">
      <section class="cover" aria-labelledby="landing-name">
        <h1 id="landing-name" class="brand">
          <AppLogo :size="40" />
          <span>Travels</span>
        </h1>

        <div class="cover-art">
          <div class="window">
            <SceneArt class="scene" scene="skyline" tod="golden" label="Rome's domes at golden hour" :lazy="false" />
          </div>
          <div class="ticket" role="img" aria-label="Example from the Now screen: next, the Pantheon at 17:15. Leave by 17:05.">
            <span class="tk-thumb art-frame"><SceneArt class="scene" scene="pantheon" tod="golden" :lazy="false" /></span>
            <span class="tk-text">
              <span class="kicker">Next · 17:15</span>
              <span class="tk-title">Pantheon</span>
              <span class="tk-leave tnum"><AppIcon name="clock" size="xs" /><span><span class="nowrap">Leave by 17:05</span> <span class="nowrap">· in 25 min</span></span></span>
            </span>
          </div>
        </div>

        <div class="cover-text">
          <p class="promise">
            Your trip, live.
          </p>
          <p class="lede">
            Your plan turns into a guide for every minute: what to do now, when to leave, and what you've spent.
          </p>
          <div class="cta">
            <button class="btn gold lg" type="button" :disabled="busy" @click="signIn('top')">
              <AppIcon name="person" />{{ busy ? 'Signing in…' : 'Sign in with Google' }}
            </button>
            <p class="fine">
              Free <span class="nowrap">· private to your Google account</span> <span class="nowrap">· works offline</span>
            </p>
            <p class="msg" role="status">{{ at === 'top' ? cloud.message.value : '' }}</p>
          </div>
        </div>
      </section>
    </div>

    <section class="wrap features" aria-labelledby="landing-what">
      <h2 id="landing-what" class="sec-title">
        What it does
      </h2>
      <div class="fgrid">
        <article class="card fcard wide" data-feature="now">
          <div class="ftext">
            <h3 class="fname">
              <AppIcon name="target" size="sm" />Now
            </h3>
            <p class="ftitle">
              What to do this minute
            </p>
            <p class="fbody">
              The stop you're at, what's next, and when to leave to get there on time. Late at night, the way home.
            </p>
          </div>
          <div class="demo demo-now" role="img" aria-label="Example: at 16:40 you are at Piazza Navona until 17:15, with 35 minutes left.">
            <p class="dn-clock">
              <b class="num">16:40</b><span>in Rome</span>
            </p>
            <div class="dn-card">
              <span class="dn-thumb art-frame"><SceneArt class="scene" scene="navona" tod="golden" /></span>
              <span class="dn-text">
                <span class="dn-top"><span class="chip t-accent-soft">Now</span><span class="num dn-range">16:30–17:15</span></span>
                <b class="dn-title">Piazza Navona</b>
                <span class="dn-left"><span class="bar thin"><i class="fill" style="width: 22%" /></span><span class="num">35 min left</span></span>
              </span>
            </div>
          </div>
        </article>

        <article class="card fcard" data-feature="plan">
          <div class="ftext">
            <h3 class="fname">
              <AppIcon name="list" size="sm" />Plan
            </h3>
            <p class="ftitle">
              Your days, stop by stop
            </p>
            <p class="fbody">
              Times, tickets and tips for each stop. Where there's a choice, like which day to see the Colosseum, switch it and the days follow.
            </p>
          </div>
          <div class="demo demo-plan" role="img" aria-label="Example: a day's plan. Castel Sant'Angelo at 13:00, done. Piazza Navona at 16:30, now. Pantheon at 17:15, next. The Colosseum ticket is on Saturday 10.">
            <ol class="dp-list">
              <li class="dp s-done">
                <span class="num dp-t">13:00</span><span class="dp-node"><AppIcon name="check" size="xs" /></span><span class="dp-name">Castel Sant'Angelo</span>
              </li>
              <li class="dp s-now">
                <span class="num dp-t">16:30</span><span class="dp-node"><AppIcon name="landmark" size="xs" /></span><span class="dp-name">Piazza Navona</span>
              </li>
              <li class="dp s-next">
                <span class="num dp-t">17:15</span><span class="dp-node"><AppIcon name="landmark" size="xs" /></span><span class="dp-name">Pantheon</span>
              </li>
            </ol>
            <div class="dp-switch">
              <span class="dp-q">Colosseum ticket</span>
              <span class="dp-seg"><span class="on">Sat 10</span><span>Sun 11</span></span>
            </div>
          </div>
        </article>

        <article class="card fcard" data-feature="places">
          <div class="ftext">
            <h3 class="fname">
              <AppIcon name="pin" size="sm" />Places
            </h3>
            <p class="ftitle">
              A stamp for every place
            </p>
            <p class="fbody">
              Places come in sets, like Ancient sites or Coffee &amp; sweets. Tick off a stop you visit and its place is stamped.
            </p>
          </div>
          <div class="demo demo-places" role="img" aria-label="Example: stamps for the Colosseum, Giolitti and the Trevi Fountain, and the Ancient sites set at 1 of 10.">
            <div class="dpl-stamps">
              <StampMark v-for="s in STAMPS" :key="s.place.id" :place="s.place" :date="s.date" :size="72" />
            </div>
            <div class="dpl-set">
              <span class="dpl-name">Ancient sites</span><span class="num">1/10</span>
              <span class="bar thin"><i class="gold" style="width: 10%" /></span>
            </div>
          </div>
        </article>

        <article class="card fcard" data-feature="costs">
          <div class="ftext">
            <h3 class="fname">
              <AppIcon name="wallet" size="sm" />Costs
            </h3>
            <p class="ftitle">
              Log a cost in three taps
            </p>
            <p class="fbody">
              Open Costs, type the amount, tap what it was for. Each day shows against your budget, in euros and your home currency.
            </p>
          </div>
          <div class="demo demo-costs" role="img" aria-label="Example: 3 euros 50 logged as Food, about 195 lira. Today 37 euros spent, 134 euros 50 left.">
            <div class="dc-top">
              <b class="num dc-amt">€3.50</b>
              <span class="num dc-home">≈ ₺195</span>
            </div>
            <div class="dc-cats">
              <span class="dc-cat on"><AppIcon name="food" class="c-food" />Food</span>
              <span class="dc-cat"><AppIcon name="ticket" class="c-sight" />Sights</span>
              <span class="dc-cat"><AppIcon name="metro" class="c-move" />Transport</span>
            </div>
            <p class="dc-day tnum">
              €37.00 today · €134.50 left
            </p>
          </div>
        </article>

        <article class="card fcard" data-feature="badges">
          <div class="ftext">
            <h3 class="fname">
              <AppIcon name="medal" size="sm" />Badges and ranks
            </h3>
            <p class="ftitle">
              From {{ firstRank }} to {{ topRank }}
            </p>
            <p class="fbody">
              Each stamp brings you closer to the next of seven Roman ranks. Badges mark real moments, like being out for sunset.
            </p>
          </div>
          <div class="demo demo-badges" role="img" :aria-label="`Example: rank ${gameNumeral(rank.n)}, ${rank.name}, ${rank.gloss}. ${SEALS[0]!.label} and ${SEALS[1]!.label} earned, ${SEALS[2]!.label} still to earn.`">
            <div class="db-rank">
              <span class="db-n">Rank {{ gameNumeral(rank.n) }}</span>
              <b class="db-name">{{ rank.name }}</b>
              <span class="db-gloss">{{ rank.gloss }}</span>
            </div>
            <ul class="db-seals">
              <li v-for="b in SEALS" :key="b.id">
                <BadgeSeal :badge="b" :size="48" />
                <span>{{ b.label }}</span>
              </li>
            </ul>
          </div>
        </article>

        <article class="card fcard lean" data-feature="offline">
          <div class="ftext">
            <h3 class="fname">
              <AppIcon name="signal-off" size="sm" />Offline and on every device
            </h3>
            <p class="ftitle">
              Works with no signal
            </p>
            <p class="fbody">
              Your trips are kept on your phone, so they work in the metro and abroad without data. Sign in on another phone or a laptop and they're there too.
            </p>
          </div>
        </article>

        <article class="card fcard lean" data-feature="private">
          <div class="ftext">
            <h3 class="fname">
              <AppIcon name="lock" size="sm" />Private
            </h3>
            <p class="ftitle">
              Private to your account
            </p>
            <p class="fbody">
              What you record is stored under your Google sign-in. No other account can open it, and there are no ads.
            </p>
          </div>
        </article>
      </div>
    </section>

    <section class="wrap how" aria-labelledby="landing-how">
      <h2 id="landing-how" class="sec-title">
        How it works
      </h2>
      <ol class="steps">
        <li class="step">
          <span class="numeral" aria-hidden="true">I</span>
          <div>
            <h3>Sign in with Google</h3>
            <p>It's free. What you add is saved to your account.</p>
          </div>
        </li>
        <li class="step">
          <span class="numeral" aria-hidden="true">II</span>
          <div>
            <h3>Plan a trip, or try the sample</h3>
            <p>Add your dates and stops, or start from the sample trip to Rome.</p>
          </div>
        </li>
        <li class="step">
          <span class="numeral" aria-hidden="true">III</span>
          <div>
            <h3>On the day, open Now</h3>
            <p>It shows what to do this minute, and when to leave for what's next.</p>
          </div>
        </li>
      </ol>
      <div class="cta end">
        <button class="btn primary lg" type="button" :disabled="busy" @click="signIn('end')">
          <AppIcon name="person" />{{ busy ? 'Signing in…' : 'Sign in with Google' }}
        </button>
        <p class="msg" role="status">{{ at === 'end' ? cloud.message.value : '' }}</p>
      </div>
    </section>

    <footer class="wrap foot">
      <p class="foot-brand">
        <AppLogo :size="22" /><span>Travels</span>
      </p>
      <p class="foot-credit">
        Map data © OpenStreetMap contributors and Google Maps.
      </p>
    </footer>
  </main>
</template>

<style scoped>
.landing { min-height: 100dvh; padding-bottom: calc(28px + var(--safe-b)); }
.wrap { width: 100%; max-width: var(--page-max); margin: 0 auto; padding-left: 16px; padding-right: 16px; }
@media (min-width: 900px) {
  .wrap { padding-left: 24px; padding-right: 24px; }
}

/* ---------- the cover: the app's passport, porpora and gold ---------- */
.cover {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "brand" "art" "text";
  gap: 18px;
  padding: calc(18px + var(--safe-t)) 16px 26px;
  background: var(--rank-bg);
  color: var(--rank-ink);
  border-radius: 0 0 var(--r-xl) var(--r-xl);
}
/* The porpora of the page's focus ring would vanish on the cover. */
.cover :focus-visible { outline-color: var(--rank-ink); }
.cover .btn.gold:hover { background: color-mix(in srgb, var(--gold) 88%, #fff); }
.brand {
  grid-area: brand;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 26px;
  letter-spacing: .24em;
  text-transform: uppercase;
  line-height: 1;
}
.brand :deep(.logo) { flex: none; border-radius: 10px; box-shadow: 0 0 0 1px color-mix(in srgb, var(--rank-ink) 35%, transparent); }

.cover-art { grid-area: art; position: relative; display: flex; flex-direction: column; padding-bottom: 38px; }
.window {
  position: relative;
  flex: 1 1 auto;
  height: clamp(150px, 44vw, 230px);
  border-radius: var(--r-lg);
  overflow: hidden;
  background: #2A2F45;
  border: 1px solid color-mix(in srgb, var(--rank-ink) 35%, transparent);
  isolation: isolate;
}
.window > .scene { position: absolute; inset: 0; }
.ticket {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 0;
  max-width: 340px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 10px;
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--fg);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-lg);
}
.tk-thumb { width: 54px; height: 54px; border-radius: 10px; flex: none; }
.tk-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tk-title { font-weight: 700; font-size: 16px; line-height: 1.25; }
.tk-leave { display: flex; align-items: flex-start; gap: 5px; font-size: 13.5px; font-weight: 600; line-height: 1.3; color: var(--fg-2); }
.tk-leave .i { margin-top: 2px; }

.cover-text { grid-area: text; display: flex; flex-direction: column; gap: 10px; }
.promise { font-size: clamp(30px, 8vw, 46px); font-weight: 700; letter-spacing: -.02em; line-height: 1.05; }
.lede { font-size: 16.5px; line-height: 1.5; max-width: 32em; color: color-mix(in srgb, var(--rank-ink) 86%, var(--rank-bg)); }
.cta { display: flex; flex-direction: column; align-items: stretch; gap: 10px; margin-top: 8px; max-width: 400px; }
.fine { font-size: 13.5px; font-weight: 600; color: color-mix(in srgb, var(--rank-ink) 86%, var(--rank-bg)); }
.msg { padding: 10px 12px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); font-weight: 600; font-size: 14px; }
.msg:empty { display: none; }

@media (min-width: 900px) {
  .cover-wrap { width: 100%; max-width: var(--page-max); margin: 0 auto; padding: 24px 24px 0; }
  .cover {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.12fr);
    grid-template-rows: auto 1fr;
    grid-template-areas: "brand art" "text art";
    column-gap: 52px;
    row-gap: 30px;
    padding: 40px 44px 44px;
    border-radius: var(--r-xl);
  }
  .brand { font-size: 30px; align-self: start; }
  .cover-text { align-self: center; }
  .promise { font-size: 58px; }
  .lede { font-size: 18.5px; }
  .window { height: auto; min-height: 380px; }
  .ticket { left: 24px; }
}

/* ---------- what it does ---------- */
.sec-title { font-size: clamp(22px, 5.6vw, 28px); font-weight: 700; letter-spacing: -.015em; margin-bottom: 14px; }
.features { padding-top: 36px; }
.fgrid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.fcard { display: flex; flex-direction: column; gap: 14px; padding: 16px; }
.fname { display: flex; align-items: center; gap: 7px; font-size: 14.5px; font-weight: 700; color: var(--accent); }
.ftitle { font-size: 18.5px; font-weight: 700; letter-spacing: -.01em; line-height: 1.25; margin-top: 6px; }
.fbody { font-size: 15px; color: var(--fg-2); margin-top: 4px; }
.demo { border-radius: var(--r-md); background: var(--surface-2); padding: 12px; min-width: 0; }
@media (min-width: 640px) {
  .fgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fcard.wide { grid-column: 1 / -1; }
  /* A sample fills what its card has left beside a taller neighbour, its content in the middle. */
  .fcard > .demo { flex: 1 1 auto; display: flex; flex-direction: column; justify-content: center; }
}
@media (min-width: 900px) {
  .fgrid { gap: 18px; }
  .fcard { padding: 20px; }
  .fcard.wide { flex-direction: row; align-items: center; gap: 32px; padding: 24px; }
  .fcard.wide > * { flex: 1 1 0; min-width: 0; }
  .fcard.wide .ftitle { font-size: 22px; }
}

/* Now */
.dn-clock { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.dn-clock b { font-size: 30px; font-weight: 600; line-height: 1; }
.dn-clock span { font-size: 14px; color: var(--fg-2); }
.dn-card { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); }
.dn-thumb { width: 60px; height: 60px; border-radius: 10px; flex: none; }
.dn-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1 1 auto; }
.dn-top { display: flex; align-items: center; gap: 8px; }
.dn-range { font-size: 12.5px; font-weight: 600; color: var(--fg-2); white-space: nowrap; }
.dn-title { font-size: 16px; line-height: 1.2; }
.dn-left { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--fg-2); white-space: nowrap; }
.dn-left .bar { flex: 1 1 auto; min-width: 40px; }

/* Plan */
.dp-list { list-style: none; display: flex; flex-direction: column; }
.dp { position: relative; display: grid; grid-template-columns: 44px 26px minmax(0, 1fr); align-items: center; column-gap: 8px; min-height: 40px; }
.dp::before { content: ""; position: absolute; left: 64px; top: 0; bottom: 0; width: 2px; background: var(--line); }
.dp:first-child::before { top: 50%; }
.dp:last-child::before { bottom: 50%; }
.dp-t { font-size: 13px; font-weight: 600; text-align: right; color: var(--fg); }
.dp-node { position: relative; width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; background: var(--surface); color: var(--c-sight); border: 2px solid color-mix(in srgb, var(--c-sight) 55%, var(--line)); }
.dp-name { font-weight: 650; font-size: 14.5px; line-height: 1.25; padding: 6px 8px; border-radius: 9px; min-width: 0; }
.s-done .dp-node { background: var(--ok); border-color: var(--ok); color: var(--ok-ink); }
.s-done .dp-name { color: var(--fg-2); }
.s-done .dp-t { color: var(--fg-3); }
.s-now .dp-node { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.s-now .dp-name { background: var(--accent-soft); }
.s-next .dp-node { background: var(--gold-soft); border-color: var(--gold); color: var(--gold-ink); }
.dp-switch { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
.dp-q { font-size: 13.5px; font-weight: 650; color: var(--fg-2); }
.dp-seg { display: inline-flex; padding: 3px; gap: 3px; border-radius: 10px; background: var(--surface-3); }
.dp-seg span { padding: 5px 10px; border-radius: 8px; font-size: 13px; font-weight: 620; color: var(--fg-2); }
.dp-seg .on { background: var(--surface); color: var(--fg); box-shadow: 0 1px 3px rgba(0, 0, 0, .12); }

/* Places */
.dpl-stamps { display: flex; justify-content: center; gap: clamp(4px, 2vw, 14px); padding: 4px 0 2px; }
.dpl-set { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 6px 10px; margin-top: 10px; font-size: 13.5px; font-weight: 650; }
.dpl-set .num { font-size: 13px; color: var(--fg-2); }
.dpl-set .bar { grid-column: 1 / -1; background: color-mix(in srgb, var(--fg) 12%, transparent); }

/* Costs */
.dc-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.dc-amt { font-size: 32px; font-weight: 600; line-height: 1.05; }
.dc-home { font-size: 14px; color: var(--fg-2); }
.dc-cats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.dc-cat { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 9px 2px; border-radius: 10px; background: var(--surface); border: 1.5px solid var(--line); font-size: 12.5px; font-weight: 650; min-width: 0; }
.dc-cat.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent-soft) 60%, var(--surface)); }
.c-food { color: var(--c-food); }
.c-sight { color: var(--c-sight); }
.c-move { color: var(--c-move); }
.dc-day { margin-top: 10px; font-size: 13.5px; font-weight: 600; color: var(--fg-2); }

/* Badges and ranks */
.demo-badges { display: flex; flex-direction: column; gap: 12px; }
.db-rank { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; padding: 10px 14px; border-radius: 12px; background: var(--rank-bg); color: var(--rank-ink); }
.db-n { font-family: var(--font-display); font-weight: 700; font-size: 11.5px; letter-spacing: .2em; text-transform: uppercase; }
.db-name { font-family: var(--font-display); font-weight: 700; font-size: 22px; letter-spacing: .12em; text-transform: uppercase; line-height: 1.1; }
.db-gloss { font-size: 14px; }
.db-seals { list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.db-seals li { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; font-size: 12.5px; font-weight: 650; line-height: 1.2; }

/* ---------- how it works ---------- */
.how { padding-top: 40px; }
.steps { list-style: none; display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
.step { display: flex; align-items: flex-start; gap: 14px; }
.numeral {
  flex: none;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  letter-spacing: .04em;
  color: var(--gold-ink);
  background: var(--gold-soft);
  border: 1.5px solid var(--gold-rim);
}
.step h3 { font-size: 17px; font-weight: 700; margin-top: 2px; }
.step p { font-size: 15px; color: var(--fg-2); margin-top: 3px; }
.cta.end { margin-top: 26px; }
@media (min-width: 900px) {
  .steps { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px; }
  .step { flex-direction: column; gap: 12px; }
}

/* ---------- footer ---------- */
.foot { margin-top: 44px; padding-top: 18px; padding-bottom: 8px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; }
.foot-brand { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 700; font-size: 14px; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
.foot-credit { font-size: 13px; color: var(--fg-3); }
</style>
