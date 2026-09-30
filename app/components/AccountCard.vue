<script setup lang="ts">
const cloud = useCloud()
const { user, status, message } = cloud
const { real } = useClock()
const busy = computed(() => status.value === 'signing-in' || status.value === 'starting')
/** Who this device belongs to: the account signed in now, else the one it remembers (D34). */
const me = computed(() => user.value ?? cloud.account.value)
/** A remembered account whose session is gone (D34). */
const signInAgain = computed(() => !!cloud.account.value && !cloud.signedIn.value && status.value === 'signed-out')
/** Nobody here at all (the route guard normally sends such a device to the landing page). */
const nobody = computed(() => !me.value)
// Firebase loads ahead of the tap, so a desktop sign-in window opens inside it (D31).
watch(() => signInAgain.value || nobody.value, (show) => {
  if (show) void cloud.prepare()
}, { immediate: true })

const initials = computed(() => (me.value?.name || me.value?.email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join(''))

function ago(t: number | null): string {
  if (!t) return ''
  const s = Math.round((real.value.getTime() - t) / 1000)
  if (s < 45) return 'just now'
  if (s < 3600) return `${Math.round(s / 60)} min ago`
  return `at ${new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

const state = computed(() => {
  if (signInAgain.value) return null
  switch (status.value) {
    case 'synced': return { icon: 'cloudok', tone: 'ok', text: `Synced ${ago(cloud.lastSynced.value)}` }
    case 'syncing': return { icon: 'cloud', tone: '', text: 'Syncing…' }
    case 'offline': return { icon: 'cloudoff', tone: 'warn', text: 'Offline. Changes stay on this phone and sync when you’re back online.' }
    case 'error': return { icon: 'cloudoff', tone: 'bad', text: 'Not syncing right now. Your changes are kept on this device.' }
    case 'starting': return me.value ? { icon: 'cloud', tone: '', text: 'Connecting…' } : null
    default: return null
  }
})

const photoLine = computed(() => {
  if (!user.value) return ''
  if (cloud.photoBackup.value === 'unavailable') return 'Photo backup isn’t switched on yet, so photos stay on the device they were taken on.'
  const n = cloud.photosWaiting.value
  if (n > 0) return `${n} ${n === 1 ? 'photo' : 'photos'} waiting to back up.`
  return 'Photos back up to your account too.'
})

// ---------- signing out (D36) ----------
/** Sign-out found changes that haven't reached the account: ask first. */
const warnOut = ref(false)
const leaving = ref(false)
const stayBtn = ref<HTMLButtonElement | null>(null)
const pendingText = computed(() => {
  const n = cloud.pending.value
  return `${n} ${n === 1 ? 'change hasn\'t' : 'changes haven\'t'} reached your account yet. Stay signed in until you're online, or sign out anyway.`
})

async function signOut(force = false) {
  if (leaving.value) return
  leaving.value = true
  try {
    const done = await cloud.signOut(force ? { force: true } : undefined)
    if (done === 'pending') {
      warnOut.value = true
      await nextTick()
      stayBtn.value?.focus()
      return
    }
    warnOut.value = false
    await navigateTo('/')
  }
  finally {
    leaving.value = false
  }
}

function stay() {
  warnOut.value = false
}

// Everything reached the account meanwhile: nothing left to warn about.
watch(() => cloud.pending.value, (n) => {
  if (!n) warnOut.value = false
})

/** Signs out and clears this device's copy and the remembered account (the account keeps its copy). */
async function removeHere() {
  const n = cloud.pending.value
  const lost = n ? ` ${n} ${n === 1 ? 'change hasn\'t' : 'changes haven\'t'} reached your account yet and will be lost.` : ''
  if (!confirm(`Sign out and remove your trips from this device?${lost} Your account in the cloud keeps its copy.`)) return
  warnOut.value = false
  await cloud.forget()
  await navigateTo('/')
}
</script>

<template>
  <section id="account" class="card pad stack account">
    <h2 class="h3">
      Your account
    </h2>

    <template v-if="me">
      <div class="who">
        <img v-if="me.photo" :src="me.photo" class="avatar" alt="" referrerpolicy="no-referrer">
        <span v-else class="avatar init" aria-hidden="true">{{ initials }}</span>
        <div class="body">
          <b class="nm">{{ me.name || 'Your Google account' }}</b>
          <span class="small muted em">{{ me.email }}</span>
        </div>
        <button class="btn sm ghost" type="button" :disabled="leaving" @click="signOut()">
          <AppIcon name="logout" size="sm" />Sign out
        </button>
      </div>
      <p v-if="state" class="state small" :class="state.tone">
        <AppIcon :name="state.icon" size="sm" />{{ state.text }}
      </p>
      <p v-if="photoLine" class="small muted">
        {{ photoLine }}
      </p>

      <div v-if="warnOut" class="warnout" role="alert">
        <p class="small">
          <AppIcon name="alert" size="sm" /><span>{{ pendingText }}</span>
        </p>
        <div class="row wrap">
          <button ref="stayBtn" class="btn primary sm" type="button" @click="stay">
            Stay signed in
          </button>
          <button class="btn ghost sm" type="button" :disabled="leaving" @click="signOut(true)">
            Sign out anyway
          </button>
        </div>
      </div>

      <div v-if="signInAgain" class="again">
        <p class="small strong">
          <AppIcon name="cloudoff" size="sm" /><span>Sign in again to keep saving to your account.</span>
        </p>
        <p class="small muted plain">
          Your changes stay on this device until then.
        </p>
        <div>
          <button class="btn primary" type="button" :disabled="busy" @click="cloud.signIn()">
            <AppIcon name="person" size="sm" />{{ busy ? 'Signing in…' : 'Sign in with Google' }}
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <p class="small muted">
        Sign in with Google to save your trips, ticks, notes and photos to your account. Everything still works offline.
      </p>
      <div>
        <button class="btn primary" type="button" :disabled="busy" @click="cloud.signIn()">
          <AppIcon name="person" size="sm" />{{ busy ? 'Signing in…' : 'Sign in with Google' }}
        </button>
      </div>
    </template>

    <p class="small msg" role="status">{{ message }}</p>

    <div v-if="me" class="remove">
      <button class="btn sm plain rm" type="button" @click="removeHere">
        <AppIcon name="trash" size="sm" />Sign out and remove from this device
      </button>
    </div>
  </section>
</template>

<style scoped>
.who { display: flex; align-items: center; gap: 12px; }
.avatar { width: 44px; height: 44px; border-radius: 999px; object-fit: cover; flex: none; background: var(--surface-2); }
.avatar.init { display: grid; place-items: center; font-weight: 700; color: var(--accent); }
.nm { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* Which account this device belongs to decides what signing in keeps (D35, D42): the whole address shows. */
.em { display: block; overflow-wrap: anywhere; }
.body { flex: 1; min-width: 0; }
.state { display: flex; align-items: flex-start; gap: 8px; margin: 0; font-weight: 600; }
.state :deep(.i) { flex: none; margin-top: 1px; }
.state.ok { color: var(--ok); }
.state.warn { color: var(--warn); }
.state.bad { color: var(--bad); }
.warnout, .again { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 12px; background: var(--warn-soft); }
.warnout p, .again p { display: flex; align-items: flex-start; gap: 8px; color: var(--fg); font-weight: 600; }
.warnout p :deep(.i), .again p :deep(.i) { flex: none; margin-top: 1px; color: var(--warn); }
.again p.plain { display: block; color: var(--fg-2); font-weight: 500; margin-top: -4px; }
.msg { margin: 0; padding: 10px 12px; border-radius: 10px; background: var(--warn-soft); color: var(--warn); font-weight: 600; }
.msg:empty { display: none; }
.remove { padding-top: 12px; border-top: 1px solid var(--line); }
.remove .btn { white-space: normal; text-align: left; }
/* A quiet text action under the card: Sign out stays the main way out (the question before removing stays too). */
.remove .rm { color: var(--bad); padding-left: 4px; }
</style>
