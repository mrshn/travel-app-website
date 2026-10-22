<script lang="ts">
import { SocialError } from '~/lib/social/api'

/**
 * A toast line for something the social layer refused (docs/design/2026-10-14-together.md, P4): what happened in
 * words, never a raw code. `fallback` says what failed ("Couldn't make the link.").
 */
export function meetErrorLine(e: unknown, fallback = 'That didn\'t work. Try again in a moment.'): string {
  const err = e instanceof SocialError ? e : null
  switch (err?.code) {
    case 'auth': return 'Sign in again to use meetups and plan links.'
    case 'offline': return 'You\'re offline. Try again when you\'re back online.'
    case 'not-found': return 'That isn\'t there any more.'
    case 'denied': return 'Only the person who made it can change that.'
    case 'invalid': return `${fallback} Something in it is too long or missing.`
    default: return /^Still getting ready/.test(err?.message ?? '') ? err!.message : fallback
  }
}
</script>

<script setup lang="ts">
/**
 * Why meetups and plan links don't work right now, when they don't (P4's rule: say why): signed out ("Sign in again
 * to use meetups and plan links." and a sign-in button), offline, still connecting, or an error. Nothing when ready.
 */
withDefaults(defineProps<{ what?: string }>(), { what: 'meetups and plan links' })

const social = useSocial()
const cloud = useCloud()
const busy = computed(() => cloud.status.value === 'signing-in' || cloud.status.value === 'starting')
const kind = computed<'signin' | 'offline' | 'loading' | 'error' | null>(() => {
  const s = social.state.value
  if (s === 'ready') return null
  // A remembered account whose session Firebase is still picking up isn't signed out yet.
  if (s === 'signed-out' || s === 'off') return busy.value && cloud.status.value === 'starting' ? 'loading' : 'signin'
  return s
})
// Firebase loads ahead of the tap, so a desktop sign-in window opens inside it (D31).
watch(() => kind.value === 'signin', (show) => {
  if (show) void cloud.prepare()
}, { immediate: true })
const ICON = { signin: 'cloudoff', offline: 'signal-off', loading: 'cloud', error: 'alert' } as const
</script>

<template>
  <div v-if="kind" class="ms" :class="`k-${kind}`" role="status">
    <AppIcon :name="ICON[kind]" size="sm" class="ms-i" />
    <div class="ms-b">
      <template v-if="kind === 'signin'">
        <p class="strong">
          Sign in again to use {{ what }}.
        </p>
        <div>
          <button class="btn primary sm" type="button" :disabled="busy" @click="cloud.signIn()">
            <AppIcon name="person" size="sm" />{{ busy ? 'Signing in…' : 'Sign in with Google' }}
          </button>
        </div>
      </template>
      <p v-else-if="kind === 'offline'">
        <b>You're offline.</b> Connect to use {{ what }}.
      </p>
      <p v-else-if="kind === 'loading'">
        Connecting…
      </p>
      <p v-else>
        {{ social.error.value || 'Something went wrong.' }} Try again in a moment.
      </p>
    </div>
  </div>
</template>

<style scoped>
.ms { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: var(--r-md); background: var(--surface-2); color: var(--fg); font-size: 14.5px; line-height: 1.45; }
.ms.k-signin, .ms.k-offline, .ms.k-error { background: var(--warn-soft); }
.ms-i { flex: none; margin-top: 2px; color: var(--fg-2); }
.k-signin .ms-i, .k-offline .ms-i, .k-error .ms-i { color: var(--warn); }
.ms-b { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
</style>
