<script lang="ts">
import { computed, type ComputedRef } from 'vue'
import type { PersonRef } from '#shared/types/social'
import { SocialError } from '~/lib/social/api'
import { useCloud } from '~/composables/useCloud'
import { useSocial, type SocialState } from '~/composables/useSocial'

/** You as the friends screens show you: as friends see you, else (signed out) the account this device remembers. */
export function useMeFace(): ComputedRef<PersonRef | null> {
  const social = useSocial()
  const cloud = useCloud()
  return computed<PersonRef | null>(() => {
    if (social.me.value) return social.me.value
    const a = cloud.user.value ?? cloud.account.value
    return a ? { uid: a.uid, name: a.name || a.email.split('@')[0] || 'You', photo: a.photo ?? null } : null
  })
}

/**
 * The social layer's state as the friends screens show it (docs/design/2026-10-14-together.md, T1). A remembered
 * account whose session Firebase is still picking up counts as getting ready, not as signed out, so "Sign in again"
 * never flashes while the app opens.
 */
export function useFriendsState(): ComputedRef<SocialState> {
  const social = useSocial()
  const cloud = useCloud()
  return computed<SocialState>(() => {
    const s = social.state.value
    if (s === 'signed-out' && (cloud.status.value === 'starting' || cloud.status.value === 'signing-in')) return 'loading'
    return s
  })
}

/** One line for a toast about something that didn't work (never a raw code). */
export function friendsError(e: unknown, fallback: string): string {
  const code = e instanceof SocialError ? e.code : (e as { code?: string } | null)?.code
  switch (code) {
    case 'offline': return 'You’re offline. Try again when you’re back.'
    case 'auth': return 'Sign in again to use friends.'
    case 'not-found': return 'That’s gone: it was removed, or the link was reset.'
    case 'denied': return 'That isn’t allowed. You may not be friends any more.'
    case 'invalid': return `${fallback} Check what you entered.`
    default: return fallback
  }
}
</script>

<script setup lang="ts">
/**
 * Why a friends screen can't do everything right now: signed out, offline, getting ready, or the social layer
 * couldn't start. Shows nothing while ready (or with no account at all). Cached data stays on the screen around it.
 */
const props = withDefaults(defineProps<{
  /** The offline line of this screen. */
  offline?: string
  /** The signed-out line of this screen. */
  signedOut?: string
  /** No placeholder while getting ready (the screen shows its own). */
  quietLoading?: boolean
}>(), {
  offline: 'You’re offline. New posts load when you’re back.',
  signedOut: 'Sign in again to use friends.',
  quietLoading: false,
})

const social = useSocial()
const cloud = useCloud()
const state = useFriendsState()
const busy = computed(() => cloud.status.value === 'signing-in' || cloud.status.value === 'starting')

// Firebase loads ahead of the tap, so a desktop sign-in window opens inside it (as on Home).
watch(() => state.value === 'signed-out', (out) => {
  if (out) void cloud.prepare()
}, { immediate: true })

const errorLine = computed(() => {
  const m = social.error.value.trim()
  return m ? `Friends aren’t available right now. ${m.endsWith('.') ? m : `${m}.`}` : 'Friends aren’t available right now.'
})

function retry() {
  location.reload()
}
</script>

<template>
  <section v-if="state === 'signed-out'" class="fnote card pad warnbox" aria-label="Signed out">
    <AppIcon name="cloudoff" class="ic warn" />
    <div class="stack tight grow">
      <p class="strong">
        {{ props.signedOut }}
      </p>
      <div>
        <button class="btn primary sm" type="button" :disabled="busy" @click="cloud.signIn()">
          <AppIcon name="person" size="sm" />{{ busy ? 'Signing in…' : 'Sign in with Google' }}
        </button>
      </div>
      <p class="msg small" role="status">{{ cloud.message.value }}</p>
    </div>
  </section>
  <p v-else-if="state === 'offline'" class="fnote line" role="status">
    <AppIcon name="signal-off" size="sm" class="warn" /><span>{{ props.offline }}</span>
  </p>
  <section v-else-if="state === 'error'" class="fnote card pad warnbox" role="status">
    <AppIcon name="cloudoff" class="ic warn" />
    <div class="stack tight grow">
      <p class="strong">
        {{ errorLine }}
      </p>
      <div>
        <button class="btn sm ghost" type="button" @click="retry">
          <AppIcon name="refresh" size="sm" />Try again
        </button>
      </div>
    </div>
  </section>
  <div v-else-if="state === 'loading' && !props.quietLoading" class="fnote quiet" aria-busy="true">
    <span class="sr-only" role="status">Getting ready…</span>
    <span class="bone wide" aria-hidden="true" />
    <span class="bone" aria-hidden="true" />
  </div>
</template>

<style scoped>
.fnote { margin: 0; }
.warnbox { display: flex; gap: 12px; align-items: flex-start; border-color: color-mix(in srgb, var(--warn) 40%, var(--line)); }
.ic { flex: none; margin-top: 2px; }
.warn { color: var(--warn); }
.line { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: var(--r-md); background: var(--warn-soft); color: var(--fg); font-size: 14px; font-weight: 600; line-height: 1.4; }
.line .i { margin-top: 2px; }
.msg { padding: 8px 10px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); font-weight: 600; }
.msg:empty { display: none; }
.quiet { display: flex; flex-direction: column; gap: 8px; padding: 6px 2px; }
.bone { display: block; height: 12px; width: 46%; border-radius: 6px; background: var(--surface-2); }
.bone.wide { width: 72%; }
</style>
