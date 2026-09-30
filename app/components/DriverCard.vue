<script lang="ts">
// Phones (Safari) don't focus a button you tap, so the card also takes its opener from the control pressed last,
// as BottomSheet does: the card that opens within 2 s gives focus back to it.
let pressed: { el: HTMLElement, at: number } | null = null
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>('button, a[href], [role="button"]')
    pressed = el ? { el, at: performance.now() } : null
  }, { capture: true, passive: true })
}
</script>

<script setup lang="ts">
/**
 * The full-screen card you hold up to a taxi driver: the trip's driverCard lines, big and black on white in
 * both themes. A dialog: it takes focus, and closes on a tap anywhere or Escape, giving focus back.
 */
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ lines?: string[] }>()

const box = ref<HTMLElement | null>(null)
const closer = ref<HTMLButtonElement | null>(null)
const shown = computed(() => open.value && !!props.lines?.length)
let opener: HTMLElement | null = null

/** What opened the card: the focused control, else the one pressed just before (phones). */
function findOpener(): HTMLElement | null {
  const press = pressed
  pressed = null
  const a = document.activeElement as HTMLElement | null
  if (a && a !== document.body && a !== document.documentElement) return a
  return press && performance.now() - press.at < 2000 ? press.el : null
}

function close() {
  open.value = false
}

function onKey(e: KeyboardEvent) {
  if (!shown.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
  else if (e.key === 'Tab') {
    // One control inside: focus stays on it.
    e.preventDefault()
    closer.value?.focus()
  }
}

watch(shown, async (on) => {
  if (typeof document === 'undefined') return
  if (on) {
    opener = findOpener()
    document.addEventListener('keydown', onKey)
    await nextTick()
    box.value?.focus({ preventScroll: true })
  }
  else {
    document.removeEventListener('keydown', onKey)
    const back = opener
    opener = null
    if (back?.isConnected) back.focus({ preventScroll: true })
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="shown"
      ref="box"
      class="driver"
      role="dialog"
      aria-modal="true"
      aria-label="Card for the taxi driver"
      tabindex="-1"
      @click="close"
    >
      <div class="dc">
        <p v-for="(l, i) in lines" :key="i" :class="{ first: i === 0 }">
          {{ l }}
        </p>
      </div>
      <button ref="closer" class="tap" type="button">
        Tap anywhere to close
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
/* Black on white whatever the theme: it is read by someone else, often at night. */
.driver {
  position: fixed;
  inset: 0;
  z-index: 5000;
  background: #fff;
  color: #111;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  justify-content: safe center;
  gap: 20px;
  padding: calc(24px + var(--safe-t)) 24px calc(24px + var(--safe-b));
  overflow-y: auto;
  overscroll-behavior: contain;
  outline: none;
}
.dc { text-align: center; max-width: 900px; }
.dc p { font-size: clamp(26px, 7vw, 44px); font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
.dc p.first { font-size: clamp(18px, 4.5vw, 26px); font-weight: 600; color: #555; margin-bottom: 10px; }
.tap { background: none; border: 0; min-height: 44px; padding: 0 16px; border-radius: 12px; color: #666; font-size: 14px; }
.tap:focus-visible { outline-color: #111; }
</style>
