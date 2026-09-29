<script setup lang="ts">
const { items, dismiss } = useToasts()
</script>

<template>
  <div class="toasts" aria-live="polite" role="status">
    <TransitionGroup name="toast">
      <div v-for="t in items" :key="t.id" class="toast" :class="t.tone ? `t-${t.tone}` : ''">
        <AppIcon :name="t.tone === 'warn' ? 'alert' : t.tone === 'ok' ? 'check' : 'info'" size="sm" />
        <span class="grow">{{ t.text }}</span>
        <button v-if="t.action" class="act" type="button" @click="t.action.run(); dismiss(t.id)">
          {{ t.action.label }}
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts { position: fixed; left: 50%; bottom: calc(var(--tab-h) + var(--safe-b) + 14px); transform: translateX(-50%); z-index: 3000; display: flex; flex-direction: column; gap: 8px; width: min(440px, calc(100vw - 24px)); pointer-events: none; }
@media (min-width: 900px) { .toasts { bottom: 24px; } }
.toast { pointer-events: auto; display: flex; align-items: center; gap: 10px; padding: 11px 12px 11px 14px; border-radius: 14px; background: var(--fg); color: var(--bg); box-shadow: var(--shadow-lg); font-size: 14px; font-weight: 550; }
.toast.t-ok .i { color: var(--ok-soft); }
.toast.t-warn .i { color: var(--warn-soft); }
.act { background: none; border: 0; color: var(--gold); font-weight: 700; padding: 4px 6px; border-radius: 8px; font-size: 14px; }
.toast-enter-active, .toast-leave-active { transition: all .22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px) scale(.98); }
</style>
