<script setup lang="ts">
const props = defineProps<{ timezone: string }>()
const { previewing, now, live } = useClock()
const local = computed(() => zoned(now.value, props.timezone))
</script>

<template>
  <Transition name="pvb">
    <div v-if="previewing" class="pvbar" role="status">
      <AppIcon name="eye" size="sm" />
      <span class="grow">Preview · <b class="num">{{ fmtDate(local.date, 'short') }} {{ fmtClock(local.minutes) }}</b></span>
      <button class="btn xs gold" type="button" @click="live">
        Back to live
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.pvbar { position: sticky; top: calc(var(--top-h) + var(--safe-t)); z-index: 40; display: flex; align-items: center; gap: 10px; padding: 8px 12px 8px 16px; background: #16191C; color: #F2F3F0; font-size: 14px; border-bottom: 1px solid rgba(255, 255, 255, .08); }
.pvb-enter-active, .pvb-leave-active { transition: all .2s ease; }
.pvb-enter-from, .pvb-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
