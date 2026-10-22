<script lang="ts">
/**
 * A line for a toast when the social layer said no (docs/design/2026-10-14-together.md, 5.1 to 5.4): what happened
 * and what to do, never a raw code. `fallback` is for anything unexpected.
 */
export function groupErrorLine(e: unknown, fallback = 'That didn\'t work. Try again in a moment.'): string {
  const code = (e as { code?: string } | null)?.code
  switch (code) {
    case 'offline': return 'You\'re offline. Try again when you\'re back.'
    case 'auth': return 'Sign in again to use group trips.'
    case 'not-found': return 'That link was reset. Ask for a new one.'
    case 'denied': return 'You can\'t do that in this trip.'
    case 'invalid': return 'That\'s too long or not quite right. Try again.'
    default: return fallback
  }
}
</script>

<script setup lang="ts">
/**
 * Where group trips stand on this device, when they can't work right now: a remembered account whose session
 * lapsed (sign in again), no connection, or a backend that couldn't start. Renders nothing while all is well.
 */
withDefaults(defineProps<{
  /** Say nothing about being offline (the screen says so itself, as the chat's composer does). */
  quietOffline?: boolean
}>(), { quietOffline: false })

const social = useSocial()
const cloud = useCloud()
const state = social.state
const busy = computed(() => cloud.status.value === 'signing-in' || cloud.status.value === 'starting')
/** Still starting: the backend, or Firebase picking up a remembered session (not "signed out" yet). */
const starting = computed(() => state.value === 'loading' || (state.value === 'signed-out' && cloud.status.value === 'starting'))
const signIn = computed(() => state.value === 'signed-out' && cloud.status.value !== 'starting')
// Firebase loads ahead of the tap, so a desktop sign-in window opens inside it.
watch(signIn, (s) => {
  if (s) void cloud.prepare()
}, { immediate: true })
// "Getting ready…" only when it takes a while: a quick start shows nothing.
const slow = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(starting, (s) => {
  clearTimeout(timer)
  slow.value = false
  if (s) {
    timer = setTimeout(() => {
      slow.value = true
    }, 700)
  }
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section v-if="signIn" class="gn card pad" aria-label="Sign in">
    <p class="gn-l">
      <AppIcon name="cloudoff" size="sm" /><span>Sign in again to use group trips</span>
    </p>
    <p class="small muted">
      Your trip still works on this phone. The chat, votes and people come back when you're signed in.
    </p>
    <div>
      <button class="btn primary" type="button" :disabled="busy" @click="cloud.signIn()">
        <AppIcon name="person" size="sm" />{{ busy ? 'Signing in…' : 'Sign in with Google' }}
      </button>
    </div>
    <p class="msg small" role="status">{{ cloud.message.value }}</p>
  </section>
  <p v-else-if="state === 'offline' && !quietOffline" class="gn-line" role="status">
    <AppIcon name="signal-off" size="sm" /><span>You're offline. The group catches up when you're back.</span>
  </p>
  <p v-else-if="state === 'error'" class="gn-line" role="status">
    <AppIcon name="alert" size="sm" /><span>Group trips aren't working right now. Try again in a moment.</span>
  </p>
  <p v-else-if="starting && slow" class="gn-line quiet" role="status">
    <AppIcon name="cloud" size="sm" /><span>Getting ready…</span>
  </p>
</template>

<style scoped>
.gn { display: flex; flex-direction: column; gap: 8px; border-color: color-mix(in srgb, var(--warn) 40%, var(--line)); }
.gn-l { display: flex; align-items: flex-start; gap: 8px; font-weight: 650; }
.gn-l .i { flex: none; margin-top: 2px; color: var(--warn); }
.msg { padding: 8px 10px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); font-weight: 600; }
.msg:empty { display: none; }
.gn-line { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 12px; background: var(--warn-soft); color: var(--fg); font-size: 14px; font-weight: 550; }
.gn-line .i { flex: none; margin-top: 1px; color: var(--warn); }
.gn-line.quiet { background: var(--surface-2); color: var(--fg-2); }
.gn-line.quiet .i { color: var(--fg-3); }
</style>
