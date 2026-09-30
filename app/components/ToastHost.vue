<script setup lang="ts">
const { items, act, hold, release, clearOf } = useToasts()

const ICON = { ok: 'check', warn: 'alert', gold: 'medal', info: 'info' } as const

/** A toast stays while keyboard focus is in it, so you can reach its buttons with Tab. */
function focusOut(e: FocusEvent, id: number) {
  const to = e.relatedTarget as Node | null
  if (!to || !(e.currentTarget as HTMLElement).contains(to)) release(id)
}

// ---------- keeping clear of a cost pad ----------
// Toasts take taps, so one over a cost pad catches a tap meant for a key or a category (or lands it on Undo).
// While a pad is on screen they move out of its way: to the top, under the header, when the pad leaves room
// there; else to their usual place above the tab bar when that is clear of it. When not all of them fit, the
// oldest wait hidden until there is room (or their time is up). Everywhere else nothing changes.
const box = ref<HTMLElement | null>(null)
/** The top of the toasts in px when they sit at the top; null in their usual place. */
const top = ref<number | null>(null)
/** How many of the oldest toasts are hidden for lack of room. */
const hidden = ref(0)
const GAP = 8

/** How many of the newest toasts (heights oldest first) fit, one under the other, in `room` px. */
function newestThatFit(heights: number[], room: number): number {
  let used = -GAP
  let k = 0
  for (let i = heights.length - 1; i >= 0; i--) {
    used += heights[i]! + GAP
    if (used > room) break
    k++
  }
  return k
}

/** The bottom of the page's sticky bars (the header, and the preview bar under it). */
function barsBottom(): number {
  let y = 0
  for (const el of document.querySelectorAll<HTMLElement>('.shell > header.top, .shell > .pvbar')) {
    if (el.getClientRects().length) y = Math.max(y, el.getBoundingClientRect().bottom)
  }
  return y
}

function place() {
  const el = box.value
  const shown = clearOf.value.filter(p => p.isConnected && p.getClientRects().length > 0)
  // A pad in an open sheet covers the page behind it, whose own pad no longer counts.
  const inSheet = shown.filter(p => !!p.closest('[aria-modal="true"]'))
  const pads = (inSheet.length ? inSheet : shown).map(p => p.getBoundingClientRect())
  let nextTop: number | null = null
  let nextHidden = 0
  const toasts = el ? [...el.querySelectorAll<HTMLElement>(':scope > .toast:not(.toast-leave-active)')] : []
  if (el && pads.length && toasts.length) {
    const heights = toasts.map(t => t.offsetHeight)
    const upper = barsBottom() + GAP
    const tab = document.querySelector<HTMLElement>('.tabbar')
    const tabTop = tab && tab.getClientRects().length ? tab.getBoundingClientRect().top : 0
    const lower = tabTop > 0 ? tabTop - 14 : innerHeight - 24
    const padTop = Math.min(...pads.map(r => r.top))
    const padBottom = Math.max(...pads.map(r => r.bottom))
    const across = el.getBoundingClientRect()
    const sideBySide = Math.max(...pads.map(r => r.left)) >= across.right || Math.min(...pads.map(r => r.right)) <= across.left
    if (!sideBySide && padBottom > upper && padTop < lower) {
      const above = newestThatFit(heights, padTop - GAP - upper)
      const below = newestThatFit(heights, lower - GAP - padBottom)
      if (above >= heights.length || (above > 0 && above >= below)) {
        nextTop = upper
        nextHidden = heights.length - above
      }
      else if (below > 0) {
        nextHidden = heights.length - below
      }
      else {
        // No room anywhere (a very short screen): the newest one, at the top.
        nextTop = upper
        nextHidden = heights.length - 1
      }
    }
  }
  if (top.value !== nextTop) top.value = nextTop
  if (hidden.value !== nextHidden) hidden.value = nextHidden
}

// Measured again on every frame while toasts show beside a pad: scrolling, a sheet sliding in and new toasts
// all move things, and a few box reads per frame for a few seconds cost nothing.
let raf = 0
function tick() {
  place()
  raf = items.value.length && clearOf.value.length ? requestAnimationFrame(tick) : 0
}
watch([items, clearOf], () => {
  if (typeof window === 'undefined') return
  place()
  if (!raf && items.value.length && clearOf.value.length) raf = requestAnimationFrame(tick)
}, { flush: 'post' })
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
})
</script>

<template>
  <div
    ref="box"
    class="toasts"
    :class="{ 'at-top': top !== null }"
    :style="top !== null ? { top: `${Math.round(top)}px` } : undefined"
    aria-live="polite"
    role="status"
  >
    <TransitionGroup name="toast">
      <div
        v-for="(t, i) in items"
        :key="t.id"
        class="toast"
        :class="[t.tone ? `t-${t.tone}` : '', { off: i < hidden }]"
        @focusin="hold(t.id)"
        @focusout="focusOut($event, t.id)"
      >
        <AppIcon :name="ICON[t.tone ?? 'info']" size="sm" />
        <span class="txt">{{ t.text }}</span>
        <span v-if="t.actions?.length" class="acts">
          <button v-for="(a, j) in t.actions" :key="j" class="act hit" type="button" @click="act(t.id, a)">
            {{ a.label }}
          </button>
        </span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts { position: fixed; left: 50%; bottom: calc(var(--tab-h) + var(--safe-b) + 14px); transform: translateX(-50%); z-index: 3000; display: flex; flex-direction: column; gap: 8px; width: min(440px, calc(100vw - 24px)); pointer-events: none; }
@media (min-width: 900px) { .toasts { bottom: 24px; } }
/* Keeping clear of a cost pad, under the header: the newest comes first, nearest the header. */
.toasts.at-top { bottom: auto; flex-direction: column-reverse; }
.toast { pointer-events: auto; display: flex; flex-wrap: wrap; align-items: center; column-gap: 10px; row-gap: 2px; padding: 11px 12px 11px 14px; border-radius: 14px; background: var(--fg); color: var(--bg); box-shadow: var(--shadow-lg); font-size: 14px; font-weight: 550; }
/* Waiting for room: out of the flow and out of reach, at its own size so it can be measured. */
.toast.off { position: absolute; left: 0; right: 0; visibility: hidden; pointer-events: none; }
.toast.t-ok .i { color: var(--ok-soft); }
.toast.t-warn .i { color: var(--warn-soft); }
.toast.t-gold { box-shadow: inset 0 0 0 1.5px var(--toast-act), var(--shadow-lg); }
.toast.t-gold .i { color: var(--toast-act); }
/* Text keeps at least 150 px; with less room (two actions at 320 px) the actions wrap to a second line, on the right. */
.txt { flex: 1 1 150px; min-width: 0; overflow-wrap: anywhere; }
.acts { display: flex; gap: 6px; margin-left: auto; flex: none; }
.act { background: none; border: 0; color: var(--toast-act); font-weight: 700; padding: 5px 7px; border-radius: 8px; font-size: 14px; white-space: nowrap; }
.act:hover { background: color-mix(in srgb, var(--toast-act) 16%, transparent); }
.act:focus-visible { outline-color: var(--toast-act); }
.toast-enter-active, .toast-leave-active { transition: all .22s ease; }
/* Coming in, a toast takes no taps yet: the second tap of a double tap on a tick or a save goes through to the
   control under it (which ignores it) instead of landing on the new toast's Undo, "Log €7" or "See". */
.toast.toast-enter-active { pointer-events: none; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px) scale(.98); }
.at-top .toast-enter-from, .at-top .toast-leave-to { transform: translateY(-10px) scale(.98); }
</style>
