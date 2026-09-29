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
let lastFocus: HTMLElement | null = null

watch(() => props.open, async (v) => {
  if (typeof document === 'undefined') return
  if (v) {
    lastFocus = document.activeElement as HTMLElement | null
    document.documentElement.classList.add('sheet-open')
    await nextTick()
    panel.value?.focus({ preventScroll: true })
  }
  else {
    document.documentElement.classList.remove('sheet-open')
    drag.value = 0
    lastFocus?.focus?.({ preventScroll: true })
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') document.documentElement.classList.remove('sheet-open')
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
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
