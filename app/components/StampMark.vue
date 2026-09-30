<script setup lang="ts">
import type { PlaceCard } from '#shared/types/trip'
import { placeSetOf } from '#shared/utils/places'

/**
 * A place's stamp, drawn in SVG (spec 4.5). The shape reads without colour: sights are round, food is
 * oval, photo spots are a frame with a dashed inner frame. Top picks get a second, gold ring.
 */
const props = withDefaults(defineProps<{
  place: PlaceCard
  /** YYYY-MM-DD the stamp counts to (placeStampDate); no date in the middle without it. */
  date?: string
  size?: 58 | 72 | 96
  /** Play the press once (only when the stamp appeared while you were looking). */
  press?: boolean
}>(), { size: 58 })

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const LINKERS = new Set(['di', 'da', 'del', 'della', 'dei', 'degli', 'delle', 'al', 'alla', 'ai', 'il', 'la', 'lo', 'le', 'e', 'of', 'the', 'and', '&', 'a', 'in', 'on', 'at', 'to'])
const MAX_NAME = 20
/** Advance widths (em) of Cinzel 700 capitals with the .06em tracking below, measured in the browser; to fit text to its arc. */
const CINZEL: Record<string, number> = {
  'A': 0.78, 'B': 0.73, 'C': 0.84, 'D': 0.89, 'E': 0.69, 'F': 0.66, 'G': 0.9, 'H': 0.92, 'I': 0.45, 'J': 0.45, 'K': 0.82, 'L': 0.68, 'M': 1.01,
  'N': 0.93, 'O': 0.94, 'P': 0.72, 'Q': 0.94, 'R': 0.81, 'S': 0.64, 'T': 0.73, 'U': 0.88, 'V': 0.79, 'W': 1.03, 'X': 0.79, 'Y': 0.76, 'Z': 0.72,
  '0': 0.71, '1': 0.45, '2': 0.68, '3': 0.62, '4': 0.68, '5': 0.61, '6': 0.69, '7': 0.61, '8': 0.66, '9': 0.69,
  ' ': 0.31, '&': 0.87, '\'': 0.26, '’': 0.31, '.': 0.28, ',': 0.29, '·': 0.28, '…': 0.73, '-': 0.44,
  'À': 0.78, 'È': 0.69, 'É': 0.69, 'Ì': 0.45, 'Ò': 0.94, 'Ù': 0.88,
}
/** IBM Plex Mono: every character is 0.6 em. */
const MONO_EM = 0.6

/** Ids for the mask and the text paths, unique on the page. */
const uid = `stamp-${String(useId() ?? Math.random().toString(36).slice(2)).replace(/[^\w-]/g, '')}`

/** A small stable number from a text (FNV-1a). */
function hash(s: string): number {
  let h = 0x811C9DC5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** A seeded random sequence (mulberry32), so a place always wears the same way. */
function seeded(seed: number): () => number {
  let a = seed || 1
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The name on the stamp: the core of the place's name, upper case, 20 characters at most. */
function stampName(name: string): string {
  const head = (String(name ?? '').split(/ \+ | \(|:| · | \/ /)[0] ?? '').trim()
  const words = head.split(/\s+/).filter(Boolean)
  if (words.length > 1 && /^(?:la|il|lo|le|i|gli|the)$/i.test(words[0]!)) words.shift()
  const full = words.join(' ').toLocaleUpperCase('en')
  if (full.length <= MAX_NAME) return full
  const fit: string[] = []
  for (const w of words) {
    if ([...fit, w].join(' ').length > MAX_NAME) break
    fit.push(w)
  }
  while (fit.length > 1 && LINKERS.has(fit[fit.length - 1]!.toLowerCase())) fit.pop()
  const short = fit.join(' ').toLocaleUpperCase('en')
  return short.length >= 5 ? short : `${full.slice(0, MAX_NAME - 1).trimEnd()}…`
}

const seed = computed(() => hash(props.place?.id ?? ''))
const kind = computed(() => props.place?.category ?? 'sight')
const set = computed(() => placeSetOf(props.place))
const meta = computed(() => PLACE_SET_META[set.value])
const name = computed(() => stampName(props.place?.name ?? ''))
const setName = computed(() => meta.value.label.toLocaleUpperCase('en'))
const roman = computed(() => (props.date ? romanDate(props.date) : ''))
/** −8° to +8°, the same every time for a place. */
const tilt = computed(() => ((seed.value % 1601) / 100) - 8)

const label = computed(() => {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(props.date ?? '')
  const when = m ? `, ${Number(m[2])} ${MONTHS[Number(m[1]) - 1] ?? ''}`.trimEnd() : ''
  return `Stamp: ${props.place?.name ?? ''}${when}`
})

/** 16 worn spots where the ink didn't take. */
const wear = computed(() => {
  const r = seeded(seed.value)
  return Array.from({ length: 16 }, () => ({
    x: +(12 + r() * 76).toFixed(2),
    y: +(12 + r() * 76).toFixed(2),
    r: +(0.6 + r() * 1.5).toFixed(2),
    o: +(0.5 + r() * 0.5).toFixed(2),
  }))
})

interface Shape {
  /** Top and bottom text: a path (arc or line), its usable length and the font size. */
  top: { d: string, len: number, fs: number }
  bottom: { d: string, len: number, fs: number }
  /** The icon's box with and without a date, and the date's baseline and size. */
  icon: { x: number, y: number, s: number }
  iconAlone: { x: number, y: number, s: number }
  date: { y: number, fs: number, len: number }
  /** Little dots between the top and bottom text. */
  dots: [number, number][]
}

const SHAPES: Record<PlaceCard['category'], Shape> = {
  sight: {
    top: { d: 'M 17.58 38.2 A 34.5 34.5 0 0 1 82.42 38.2', len: 82, fs: 8.4 },
    bottom: { d: 'M 11.66 63.95 A 40.8 40.8 0 0 0 88.34 63.95', len: 90, fs: 6.8 },
    icon: { x: 40, y: 34, s: 20 },
    iconAlone: { x: 38, y: 38, s: 24 },
    date: { y: 63.5, fs: 10, len: 48 },
    dots: [[12.25, 50], [87.75, 50]],
  },
  food: {
    top: { d: 'M 15.7 40.94 A 36.5 26.5 0 0 1 84.3 40.94', len: 78, fs: 8 },
    bottom: { d: 'M 10.53 60.94 A 42 32 0 0 0 89.47 60.94', len: 88, fs: 6.6 },
    icon: { x: 41, y: 33.5, s: 18 },
    iconAlone: { x: 39, y: 39, s: 22 },
    date: { y: 64, fs: 9.5, len: 46 },
    dots: [[10.5, 50], [89.5, 50]],
  },
  photo: {
    top: { d: 'M 13 23.4 H 87', len: 72, fs: 7.6 },
    bottom: { d: 'M 13 81.6 H 87', len: 72, fs: 6.4 },
    icon: { x: 41, y: 32.5, s: 18 },
    iconAlone: { x: 39, y: 39, s: 22 },
    date: { y: 65.5, fs: 10, len: 54 },
    dots: [[14.8, 50], [85.2, 50]],
  },
}

const shape = computed(() => SHAPES[kind.value] ?? SHAPES.sight)

/** Width of a text in em: Cinzel capitals from the table (0.72 for anything else), or mono. */
function ems(text: string, mono = false): number {
  let w = 0
  for (const c of text) w += mono ? MONO_EM : (CINZEL[c] ?? 0.72)
  return Math.max(w, 0.5)
}

/** The length a text gets on its path: its natural width, squeezed when that is more than the path holds. */
function fitLength(text: string, fs: number, room: number, mono = false): number {
  return +Math.min(room, ems(text, mono) * fs).toFixed(2)
}
const topLen = computed(() => fitLength(name.value, shape.value.top.fs, shape.value.top.len))
const bottomLen = computed(() => fitLength(setName.value, shape.value.bottom.fs, shape.value.bottom.len))
const dateLen = computed(() => fitLength(roman.value, shape.value.date.fs, shape.value.date.len, true))
const iconBox = computed(() => (roman.value ? shape.value.icon : shape.value.iconAlone))
const iconSvgHtml = computed(() => iconSvg(meta.value.icon))
</script>

<template>
  <svg
    class="stamp"
    :class="[`k-${kind}`, { top: place?.top, press }]"
    :width="size"
    :height="size"
    viewBox="0 0 100 100"
    role="img"
    :aria-label="label"
  >
    <defs>
      <mask :id="`${uid}-wear`" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
        <rect x="-10" y="-10" width="120" height="120" fill="#fff" />
        <circle v-for="(w, i) in wear" :key="i" :cx="w.x" :cy="w.y" :r="w.r" fill="#000" :fill-opacity="w.o" />
      </mask>
      <path :id="`${uid}-top`" :d="shape.top.d" />
      <path :id="`${uid}-bottom`" :d="shape.bottom.d" />
    </defs>
    <g :transform="`rotate(${tilt} 50 50)`" :mask="`url(#${uid}-wear)`">
      <!-- the frame -->
      <template v-if="kind === 'food'">
        <ellipse cx="50" cy="50" rx="46" ry="36" class="tint" />
        <ellipse v-if="place?.top" cx="50" cy="50" rx="49" ry="39" class="rim" />
        <ellipse cx="50" cy="50" rx="46" ry="36" class="ring" />
        <ellipse cx="50" cy="50" rx="33" ry="23" class="ring thin" />
      </template>
      <template v-else-if="kind === 'photo'">
        <rect x="9" y="15" width="82" height="70" rx="4" class="tint" />
        <rect v-if="place?.top" x="6" y="12" width="88" height="76" rx="6" class="rim" />
        <rect x="9" y="15" width="82" height="70" rx="4" class="ring" />
        <rect x="19" y="26" width="62" height="48" rx="2.5" class="ring thin dash" />
      </template>
      <template v-else>
        <circle cx="50" cy="50" r="44.5" class="tint" />
        <circle v-if="place?.top" cx="50" cy="50" r="48.2" class="rim" />
        <circle cx="50" cy="50" r="44.5" class="ring" />
        <circle cx="50" cy="50" r="31" class="ring thin" />
      </template>
      <circle v-for="(p, i) in shape.dots" :key="`d${i}`" :cx="p[0]" :cy="p[1]" r="1.4" class="ink" />

      <!-- the words -->
      <text class="name ink" text-anchor="middle" :font-size="shape.top.fs">
        <textPath :href="`#${uid}-top`" :xlink:href="`#${uid}-top`" startOffset="50%" :textLength="topLen" lengthAdjust="spacingAndGlyphs">{{ name }}</textPath>
      </text>
      <text class="set ink" text-anchor="middle" :font-size="shape.bottom.fs">
        <textPath :href="`#${uid}-bottom`" :xlink:href="`#${uid}-bottom`" startOffset="50%" :textLength="bottomLen" lengthAdjust="spacingAndGlyphs">{{ setName }}</textPath>
      </text>

      <!-- the middle: the set's icon and the Roman date -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <svg :x="iconBox.x" :y="iconBox.y" :width="iconBox.s" :height="iconBox.s" viewBox="0 0 24 24" class="icon" v-html="iconSvgHtml" />
      <text v-if="roman" class="date ink" x="50" :y="shape.date.y" text-anchor="middle" :font-size="shape.date.fs" :textLength="dateLen" lengthAdjust="spacingAndGlyphs">{{ roman }}</text>
    </g>
  </svg>
</template>

<style scoped>
.stamp { display: block; flex: none; overflow: visible; }
.k-sight { color: var(--c-sight); }
.k-food { color: var(--c-food); }
.k-photo { color: var(--c-night); }
.tint { fill: currentColor; fill-opacity: .07; stroke: none; }
.ring { fill: none; stroke: currentColor; stroke-width: 3.2; }
.ring.thin { stroke-width: 1.3; }
.ring.dash { stroke-dasharray: 3.2 2.4; }
.rim { fill: none; stroke: var(--gold-rim); stroke-width: 1.6; }
.ink { fill: currentColor; stroke: none; }
.name, .set { font-family: var(--font-display); font-weight: 700; letter-spacing: .06em; }
.date { font-family: var(--font-data); font-weight: 600; }
.icon { fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; overflow: visible; }
/* The press: down from above, a small turn, settle. Reduced motion (main.css) shows the end at once. */
.press { transform-origin: 50% 50%; animation: stamp-press 320ms cubic-bezier(.3, .7, .4, 1) both; }
@keyframes stamp-press {
  0% { transform: scale(1.6) rotate(-6deg); opacity: 0; }
  40% { opacity: 1; }
  70% { transform: scale(.94) rotate(1.5deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
</style>
