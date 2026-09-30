<script lang="ts">
/**
 * Every open sheet, the top one last. A sheet stacked on another (the cost sheet over a stop sheet)
 * keeps the page locked until the last one closes, and keys pressed with focus nowhere go to the top one.
 */
interface OpenSheet {
  panel: () => HTMLElement | null
  close: () => void
}
const openSheets: OpenSheet[] = []

const TABBABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])', 'select:not([disabled])',
  'textarea:not([disabled])', 'iframe', 'audio[controls]', 'video[controls]', 'summary', '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** What Tab can reach inside an element, in page order. */
function tabbables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(el =>
    el.tabIndex >= 0
    && !el.closest('[inert], [hidden]')
    && el.getClientRects().length > 0
    && getComputedStyle(el).visibility !== 'hidden',
  )
}

/** Focus somewhere else on purpose: another dialog (a photo viewer, a stacked sheet) or a toast's button. */
function allowedOutside(el: Element | null): boolean {
  return !!el?.closest('[role="dialog"], [aria-modal="true"], .toasts')
}

/**
 * The buttons of the toasts on screen (Undo, "Log €18"). A toast shown while a sheet is open sits outside it,
 * so Tab goes on to them after the sheet's last control, and from the last of them back into the sheet.
 */
function toastButtons(): HTMLElement[] {
  const box = document.querySelector<HTMLElement>('.toasts')
  return box ? tabbables(box) : []
}

// Phones don't focus a button you tap, so the opener is also taken from the last element pressed: the first
// sheet to open within 2 s takes it, and the next press replaces it (or clears it, off a control). The 2 s are
// timed with performance.now(), which keeps moving when a test freezes the date (Playwright's setFixedTime).
let pressed: { el: HTMLElement, at: number } | null = null
function onPress(e: PointerEvent) {
  const el = (e.target as Element | null)?.closest?.<HTMLElement>('button, a[href], [role="button"], [tabindex]')
  pressed = el ? { el, at: performance.now() } : null
}

/** The last item of a list (Array.prototype.at is too new for some phones). */
function lastOf<T>(list: readonly T[]): T | undefined {
  return list[list.length - 1]
}

/**
 * Keys pressed with focus on nothing (the body) or on a toast: Escape closes the top sheet, Tab goes into it
 * (from a toast, on through the toasts first).
 */
function onDocKey(e: KeyboardEvent) {
  const top = lastOf(openSheets)
  const target = e.target as Element | null
  const onToast = !!target?.closest?.('.toasts')
  if (!top || e.defaultPrevented || (target && target !== document.body && target !== document.documentElement && !onToast)) return
  if (e.key === 'Escape') {
    e.preventDefault()
    top.close()
  }
  else if (e.key === 'Tab') {
    const p = top.panel()
    if (!p) return
    e.preventDefault()
    const list = tabbables(p)
    const toasts = onToast ? toastButtons() : []
    const i = toasts.indexOf(target as HTMLElement)
    let to: HTMLElement | undefined
    if (i >= 0) to = e.shiftKey ? (i > 0 ? toasts[i - 1] : lastOf(list)) : (i < toasts.length - 1 ? toasts[i + 1] : list[0])
    else to = e.shiftKey ? lastOf(list) : list[0]
    if (to) to.focus()
    else p.focus({ preventScroll: true })
  }
}

/** Focus that lands on the page behind an open sheet goes back into the top sheet. */
function onDocFocus(e: FocusEvent) {
  const top = lastOf(openSheets)
  const p = top?.panel()
  const target = e.target as Element | null
  if (!p || !target || target === document.body || p.contains(target) || allowedOutside(target)) return
  ;(tabbables(p)[0] ?? p).focus({ preventScroll: true })
}

function register(s: OpenSheet) {
  if (!openSheets.length) {
    document.addEventListener('keydown', onDocKey)
    document.addEventListener('focusin', onDocFocus)
  }
  if (!openSheets.includes(s)) openSheets.push(s)
  document.documentElement.classList.add('sheet-open')
}

function unregister(s: OpenSheet) {
  const i = openSheets.indexOf(s)
  if (i >= 0) openSheets.splice(i, 1)
  if (openSheets.length) return
  document.documentElement.classList.remove('sheet-open')
  document.removeEventListener('keydown', onDocKey)
  document.removeEventListener('focusin', onDocFocus)
}

if (typeof document !== 'undefined') document.addEventListener('pointerdown', onPress, { capture: true, passive: true })
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  /** Hide the default header (e.g. when the content has its own picture header). */
  bare?: boolean
  size?: 'md' | 'lg'
}>(), { size: 'md' })
const emit = defineEmits<{ close: [] }>()

const panel = ref<HTMLElement | null>(null)
const drag = ref(0)
let startY = 0
let dragging = false
let opener: HTMLElement | null = null
const self: OpenSheet = { panel: () => panel.value, close: () => emit('close') }

/** The element that opened this sheet: the focused one, else the one just pressed (phones). A press opens one sheet. */
function findOpener(): HTMLElement | null {
  const press = pressed
  pressed = null
  const a = document.activeElement as HTMLElement | null
  if (a && a !== document.body && a !== document.documentElement) return a
  return press && performance.now() - press.at < 2000 ? press.el : null
}

/**
 * Focus goes into the panel as the sheet opens. On a direct load or a reload with the sheet in the URL, the
 * panel appears only once the page is ready, after the first tick: focus goes in when it appears, once, unless
 * something inside the sheet already has it.
 */
let stopWaiting: (() => void) | undefined
function focusPanel() {
  stopWaiting?.()
  stopWaiting = undefined
  if (panel.value) {
    panel.value.focus({ preventScroll: true })
    return
  }
  const stop = watch(panel, (el) => {
    if (!el) return
    stop()
    stopWaiting = undefined
    const a = document.activeElement
    if (openSheets.includes(self) && !(a && a !== document.body && el.contains(a))) el.focus({ preventScroll: true })
  }, { flush: 'post' })
  stopWaiting = stop
}

watch(() => props.open, async (v) => {
  if (typeof document === 'undefined') return
  if (v) {
    if (openSheets.includes(self)) return
    opener = findOpener()
    register(self)
    await nextTick()
    // Still open (it may have closed again in the same moment).
    if (openSheets.includes(self)) focusPanel()
  }
  else {
    stopWaiting?.()
    stopWaiting = undefined
    if (!openSheets.includes(self)) return
    unregister(self)
    drag.value = 0
    const back = opener
    opener = null
    if (back?.isConnected) back.focus({ preventScroll: true })
    else lastOf(openSheets)?.panel()?.focus({ preventScroll: true })
  }
}, { immediate: true })

onBeforeUnmount(() => {
  stopWaiting?.()
  if (typeof document !== 'undefined') unregister(self)
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (e.defaultPrevented) return
    e.preventDefault()
    e.stopPropagation()
    emit('close')
  }
  else if (e.key === 'Tab') {
    trapTab(e)
  }
}

/** Tab and Shift+Tab go round inside the panel. */
function trapTab(e: KeyboardEvent) {
  const p = panel.value
  if (!p) return
  const list = tabbables(p)
  const first = list[0]
  const last = lastOf(list)
  if (!first || !last) {
    e.preventDefault()
    p.focus({ preventScroll: true })
    return
  }
  const active = document.activeElement as HTMLElement | null
  const inside = !!active && active !== p && p.contains(active)
  // The top sheet's round also takes in the toasts on screen, after its own last control (see toastButtons()).
  const toasts = inside && lastOf(openSheets) === self ? toastButtons() : []
  if (e.shiftKey) {
    if (!inside || active === first || !!(first.compareDocumentPosition(active!) & Node.DOCUMENT_POSITION_PRECEDING)) {
      e.preventDefault()
      ;(active === first ? lastOf(toasts) ?? last : last).focus()
    }
  }
  else if (!inside || active === last || !!(last.compareDocumentPosition(active!) & Node.DOCUMENT_POSITION_FOLLOWING)) {
    e.preventDefault()
    ;(active === last ? toasts[0] ?? first : first).focus()
  }
}

function down(e: PointerEvent) {
  if (window.matchMedia('(min-width: 900px)').matches) return
  dragging = true
  startY = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function move(e: PointerEvent) {
  if (!dragging) return
  drag.value = Math.max(0, e.clientY - startY)
}
function up() {
  if (!dragging) return
  dragging = false
  if (drag.value > 90) emit('close')
  else drag.value = 0
}
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-wrap" @click.self="emit('close')" @keydown="onKey">
        <div
          ref="panel"
          class="sheet"
          :class="[`size-${size}`, { dragging: drag > 0, bare }]"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
          :style="drag ? { transform: `translateY(${drag}px)` } : undefined"
        >
          <div class="handle" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
            <span class="grab" aria-hidden="true" />
            <header v-if="!bare" class="head">
              <h2 class="h3 grow">
                {{ title }}
              </h2>
              <button class="btn icon sm plain round" type="button" aria-label="Close" @click="emit('close')">
                <AppIcon name="x" />
              </button>
            </header>
          </div>
          <div class="body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-wrap {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: var(--scrim);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet {
  position: relative;
  width: 100%;
  max-width: 640px;
  max-height: calc(100dvh - 24px - var(--safe-t));
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border-radius: 22px 22px 0 0;
  box-shadow: var(--shadow-lg);
  outline: none;
  overflow: hidden;
  transition: transform .25s cubic-bezier(.2, .8, .2, 1);
}
.sheet.dragging { transition: none; }
.handle { flex: none; touch-action: none; position: relative; z-index: 3; }
.bare .handle { position: absolute; top: 0; left: 0; right: 0; height: 30px; }
.bare .grab { background: rgba(255, 255, 255, .75); box-shadow: 0 1px 4px rgba(0, 0, 0, .3); }
.grab { display: block; width: 40px; height: 5px; border-radius: 3px; background: var(--line); margin: 8px auto 0; }
.head { display: flex; align-items: center; gap: 10px; padding: 6px 12px 8px 18px; }
.body { flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; padding: 0 0 calc(18px + var(--safe-b)); }
.foot { flex: none; padding: 12px 16px calc(12px + var(--safe-b)); border-top: 1px solid var(--line); background: var(--surface); display: flex; gap: 10px; }

@media (min-width: 900px) {
  .sheet-wrap { justify-content: flex-end; align-items: stretch; }
  .sheet { max-width: 480px; max-height: none; height: 100dvh; border-radius: 0; }
  .sheet.size-lg { max-width: 620px; }
  .grab { display: none; }
  .head { padding-top: 12px; }
}

.sheet-enter-active, .sheet-leave-active { transition: background .25s ease; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform .28s cubic-bezier(.2, .8, .2, 1); }
.sheet-enter-from, .sheet-leave-to { background: transparent; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
@media (min-width: 900px) {
  .sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateX(100%); }
}
</style>

<style>
html.sheet-open, html.sheet-open body { overflow: hidden; }
</style>
