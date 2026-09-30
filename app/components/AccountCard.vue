<script setup lang="ts">
const cloud = useCloud()
const { user, status, message } = cloud
const { real } = useClock()
const busy = computed(() => status.value === 'signing-in' || status.value === 'starting')

const initials = computed(() => (user.value?.name || user.value?.email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join(''))

function ago(t: number | null): string {
  if (!t) return ''
  const s = Math.round((real.value.getTime() - t) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return `at ${new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

const state = computed(() => {
  switch (status.value) {
    case 'synced': return { icon: 'cloudok', tone: 'ok', text: `Synced ${ago(cloud.lastSynced.value)}` }
    case 'syncing': return { icon: 'cloud', tone: '', text: 'Syncing…' }
    case 'offline': return { icon: 'cloudoff', tone: 'warn', text: 'Offline. Changes stay on this phone and sync when you’re back online.' }
    case 'not-owner': return { icon: 'lock', tone: 'bad', text: 'This app belongs to another Google account. Sign out and use that one.' }
    case 'error': return { icon: 'cloudoff', tone: 'bad', text: 'Not syncing right now. Your changes are kept on this device.' }
    case 'starting': return { icon: 'cloud', tone: '', text: 'Connecting…' }
    default: return null
  }
})

const photoLine = computed(() => {
  if (!user.value || status.value === 'not-owner') return ''
  if (cloud.photoBackup.value === 'unavailable') return 'Photo backup isn’t switched on yet, so photos stay on the device they were taken on.'
  const n = cloud.photosWaiting.value
  if (n > 0) return `${n} ${n === 1 ? 'photo' : 'photos'} waiting to back up.`
  return 'Photos back up to your account too.'
})
</script>

<template>
  <section id="account" class="card pad stack account">
    <h2 class="h3">
      Your account
    </h2>

    <template v-if="user">
      <div class="who">
        <img v-if="user.photo" :src="user.photo" class="avatar" alt="" referrerpolicy="no-referrer">
        <span v-else class="avatar init" aria-hidden="true">{{ initials }}</span>
        <div class="body">
          <b class="nm">{{ user.name || 'Signed in' }}</b>
          <span class="small muted em">{{ user.email }}</span>
        </div>
        <button class="btn sm ghost" type="button" @click="cloud.signOut()">
          <AppIcon name="logout" size="sm" />Sign out
        </button>
      </div>
      <p v-if="state" class="state small" :class="state.tone">
        <AppIcon :name="state.icon" size="sm" />{{ state.text }}
      </p>
      <p v-if="photoLine" class="small muted">
        {{ photoLine }}
      </p>
    </template>

    <template v-else>
      <p class="small muted">
        Sign in with Google to keep your trips, ticks, notes and photos in your account: safe if you lose your phone, and the same on every device. Everything still works offline.
      </p>
      <div>
        <button class="btn primary" type="button" :disabled="busy" @click="cloud.signIn()">
          <AppIcon name="person" size="sm" />{{ busy ? 'Signing in…' : 'Sign in with Google' }}
        </button>
      </div>
    </template>

    <p v-if="message" class="small msg" role="status">
      {{ message }}
    </p>
  </section>
</template>

<style scoped>
.who { display: flex; align-items: center; gap: 12px; }
.avatar { width: 44px; height: 44px; border-radius: 999px; object-fit: cover; flex: none; background: var(--surface-2); }
.avatar.init { display: grid; place-items: center; font-weight: 700; color: var(--accent); }
.nm { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.em { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.body { flex: 1; min-width: 0; }
.state { display: flex; align-items: flex-start; gap: 8px; margin: 0; font-weight: 600; }
.state :deep(.i) { flex: none; margin-top: 1px; }
.state.ok { color: var(--ok); }
.state.warn { color: var(--warn); }
.state.bad { color: var(--bad); }
.msg { margin: 0; padding: 10px 12px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); font-weight: 600; }
</style>
