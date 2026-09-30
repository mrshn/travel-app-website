<script lang="ts">
/** What this device has celebrated, per trip id. Never part of the trip's progress (it isn't synced). */
const SEEN_KEY = 'travel:game:seen:v1'

interface Seen {
  badges: string[]
  /** The highest rank number celebrated. */
  rank: number
  sets: string[]
}

/** For a browser that refuses storage: then each thing celebrates once per visit instead. */
const memory = new Map<string, Seen>()
/**
 * Storage refused a read or a write in this visit, so `memory` stands in for it. While storage works, it alone counts:
 * the record goes with the device's copy when another account's copy replaces it (useCloud).
 */
let refused = false

/** The most a celebration says at once; beyond that it ends "And 5 more". */
const MAX_PARTS = 3

const own = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key)
const strings = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : [])

function readAll(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    const all: unknown = raw ? JSON.parse(raw) : null
    return all && typeof all === 'object' && !Array.isArray(all) ? all as Record<string, unknown> : {}
  }
  catch {
    refused = true
    return {}
  }
}

/** What this device has seen of a trip, or null when it never worked the game out for it. */
function loadSeen(tripId: string): Seen | null {
  const all = readAll()
  const s = own(all, tripId) ? all[tripId] as Partial<Seen> | null : null
  if (s && typeof s === 'object') {
    const rank = Number(s.rank)
    return { badges: strings(s.badges), rank: Number.isFinite(rank) ? rank : 1, sets: strings(s.sets) }
  }
  return refused ? memory.get(tripId) ?? null : null
}

function saveSeen(tripId: string, seen: Seen) {
  memory.set(tripId, seen)
  try {
    const all = readAll()
    all[tripId] = seen
    localStorage.setItem(SEEN_KEY, JSON.stringify(all))
  }
  catch {
    refused = true // storage refused: memory keeps it for this visit
  }
}
</script>

<script setup lang="ts">
/**
 * Celebrations (spec 4.5), mounted once in the trip shell; it shows nothing itself.
 * The first time this device works out the game of a trip, it notes what is already earned, silently.
 * After that, a new badge, a higher rank or a completed set gives one gold toast (several at once share
 * one toast) with "See". Nothing celebrates or is noted while previewing; back to live, it catches up.
 * What was celebrated stays noted, so unticking and ticking again doesn't celebrate twice.
 */
const v = useTripView()
const game = useGame()
const router = useRouter()

function celebrate() {
  const g = game.value
  const id = v.id.value
  if (!g || !id || v.clock.previewing.value) return
  const badges = g.badges.filter(b => b.earned)
  const sets = g.sets.filter(s => s.complete).map(s => s.set)
  const seen = loadSeen(id)
  if (!seen) {
    saveSeen(id, { badges: badges.map(b => b.id), rank: g.rank.n, sets })
    return
  }
  const newBadges = badges.filter(b => !seen.badges.includes(b.id))
  const newRank = g.rank.n > seen.rank
  const newSets = sets.filter(s => !seen.sets.includes(s))
  if (!newBadges.length && !newRank && !newSets.length) return
  saveSeen(id, {
    badges: [...seen.badges, ...newBadges.map(b => b.id)],
    rank: Math.max(seen.rank, g.rank.n),
    sets: [...seen.sets, ...newSets],
  })
  const badgeParts = newBadges.map(b => `Badge earned: ${b.label}`)
  const rankParts = newRank ? [`New rank: ${g.rank.name} · ${g.rank.gloss}`] : []
  const setParts = newSets.map(s => `Set complete: ${PLACE_SET_META[s]?.label ?? s}`)
  let parts = [...badgeParts, ...rankParts, ...setParts]
  // A big catch-up (another device's day arriving by sync) stays a short toast: the rank first, then the rest.
  if (parts.length > MAX_PARTS) {
    const first = [...rankParts, ...badgeParts, ...setParts]
    parts = [...first.slice(0, MAX_PARTS - 1), `And ${first.length - (MAX_PARTS - 1)} more`]
  }
  const to = `/trips/${id}/${newBadges.length || newRank ? 'badges' : 'places'}`
  toast(parts.join('. '), { tone: 'gold', actions: [{ label: 'See', run: () => void router.push(to) }] })
}

watch([game, () => v.clock.previewing.value, () => v.id.value], celebrate, { immediate: true })
</script>

<template>
  <!-- Nothing to show: celebrations are toasts. -->
</template>
