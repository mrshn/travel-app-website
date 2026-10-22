<script setup lang="ts">
import { socialHandle, socialHandleValid } from '#shared/utils/social'
import { friendsError, useFriendsState, useMeFace } from './FriendsNotice.vue'

/**
 * Your card as friends see it (spec 5.5, You): photo (your Google photo in this version), name, @handle, a line about
 * you and your home city, edited in place.
 */
const social = useSocial()
const state = useFriendsState()
const ready = computed(() => state.value === 'ready')

const me = useMeFace()
const profile = computed(() => (me.value && social.profile.value?.uid === me.value.uid ? social.profile.value : null))
const name = computed(() => profile.value?.name || me.value?.name || '')
const handle = computed(() => profile.value?.handle ?? '')
const bio = computed(() => profile.value?.bio ?? '')
const homeCity = computed(() => profile.value?.homeCity ?? '')

const HANDLE_HELP = 'Use 3 to 20 lower-case letters, numbers, dots or underscores, not starting or ending with a dot or underscore.'
const BIO_MAX = 160
const editing = ref(false)
const saving = ref(false)
const form = reactive({ name: '', handle: '', bio: '', homeCity: '' })
const nameMsg = ref('')
const handleMsg = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const editBtn = ref<HTMLButtonElement | null>(null)
const ids = { name: useId(), handle: useId(), handleMsg: useId(), bio: useId(), bioLeft: useId(), city: useId() }

async function edit() {
  form.name = name.value
  form.handle = handle.value
  form.bio = bio.value
  form.homeCity = homeCity.value
  nameMsg.value = ''
  handleMsg.value = ''
  editing.value = true
  await nextTick()
  nameInput.value?.focus()
}
async function cancel() {
  editing.value = false
  await nextTick()
  editBtn.value?.focus()
}

async function save() {
  if (saving.value) return
  const p = profile.value
  const n = form.name.trim().replace(/\s+/g, ' ')
  const h = socialHandle(form.handle)
  nameMsg.value = n ? '' : 'Add the name your friends know you by.'
  handleMsg.value = h && !socialHandleValid(h) ? HANDLE_HELP : ''
  if (nameMsg.value || handleMsg.value) return
  saving.value = true
  try {
    if (h !== (p?.handle ?? '')) {
      const r = await social.claimHandle(h || null)
      if (r !== 'ok') {
        handleMsg.value = r === 'taken' ? `Someone else has @${h}. Try another.` : HANDLE_HELP
        return
      }
    }
    const patch: { name?: string, bio?: string, homeCity?: string } = {}
    if (n !== (p?.name ?? '')) patch.name = n
    if (form.bio.trim() !== (p?.bio ?? '')) patch.bio = form.bio.trim()
    if (form.homeCity.trim() !== (p?.homeCity ?? '')) patch.homeCity = form.homeCity.trim()
    if (Object.keys(patch).length) await social.saveProfile(patch)
    editing.value = false
    toast('Profile saved', { tone: 'ok' })
    await nextTick()
    editBtn.value?.focus()
  }
  catch (e) {
    toast(friendsError(e, 'Couldn’t save your profile.'), { tone: 'warn' })
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="card pad pcard" aria-labelledby="pc-h">
    <div class="top">
      <Avatar :person="me" :size="72" />
      <div class="grow who">
        <h2 id="pc-h" class="h3 ellipsis">
          {{ name || 'You' }}
        </h2>
        <p class="muted ellipsis">
          {{ handle ? `@${handle}` : 'No @handle yet' }}
        </p>
      </div>
    </div>

    <form v-if="editing" class="stack form" novalidate @submit.prevent="save">
      <div class="field">
        <label class="label" :for="ids.name">Name</label>
        <input
          :id="ids.name"
          ref="nameInput"
          v-model="form.name"
          class="input"
          type="text"
          maxlength="60"
          autocomplete="name"
          :aria-invalid="!!nameMsg"
          :aria-describedby="nameMsg ? `${ids.name}-msg` : undefined"
        >
        <span v-if="nameMsg" :id="`${ids.name}-msg`" class="err" role="alert">{{ nameMsg }}</span>
      </div>
      <div class="field">
        <label class="label" :for="ids.handle">@handle</label>
        <span class="at">
          <span class="sign" aria-hidden="true">@</span>
          <input
            :id="ids.handle"
            v-model="form.handle"
            class="input"
            type="text"
            maxlength="21"
            autocomplete="off"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            placeholder="your.handle"
            :aria-invalid="!!handleMsg"
            :aria-describedby="handleMsg ? ids.handleMsg : `${ids.handle}-hint`"
          >
        </span>
        <span v-if="handleMsg" :id="ids.handleMsg" class="err" role="alert">{{ handleMsg }}</span>
        <span v-else :id="`${ids.handle}-hint`" class="hint">So friends can find you</span>
      </div>
      <div class="field">
        <label class="label" :for="ids.bio">About you</label>
        <textarea :id="ids.bio" v-model="form.bio" class="textarea" rows="2" :maxlength="BIO_MAX" placeholder="Slow mornings, fast trains, any gelato" :aria-describedby="ids.bioLeft" />
        <span :id="ids.bioLeft" class="hint tnum" :class="{ near: form.bio.length > BIO_MAX - 20 }">{{ BIO_MAX - form.bio.length }} left</span>
      </div>
      <div class="field">
        <label class="label" :for="ids.city">Home city</label>
        <input :id="ids.city" v-model="form.homeCity" class="input" type="text" maxlength="60" autocomplete="address-level2" placeholder="Istanbul">
      </div>
      <div class="row wrap">
        <button class="btn primary" type="submit" :disabled="saving || !ready">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button class="btn ghost" type="button" :disabled="saving" @click="cancel">
          Cancel
        </button>
      </div>
    </form>

    <template v-else>
      <p v-if="bio" class="bio">
        {{ bio }}
      </p>
      <p v-if="homeCity" class="city small">
        <AppIcon name="home" size="sm" /><span>{{ homeCity }}</span>
      </p>
      <p v-if="!bio && !homeCity" class="small muted">
        Add a line about you and your home city, so friends know it’s you.
      </p>
      <div class="row wrap foot">
        <button ref="editBtn" class="btn sm ghost" type="button" :disabled="!ready" @click="edit">
          <AppIcon name="edit" size="sm" />Edit profile
        </button>
        <span class="tiny muted">Your photo is your Google photo.</span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.pcard { display: flex; flex-direction: column; gap: 12px; }
.top { display: flex; align-items: center; gap: 14px; min-width: 0; }
.who { display: flex; flex-direction: column; gap: 2px; }
.who .h3 { font-size: 19px; }
.bio { font-size: 15.5px; line-height: 1.5; overflow-wrap: anywhere; }
.city { display: flex; align-items: center; gap: 6px; color: var(--fg-2); font-weight: 600; }
.foot { gap: 8px 12px; }
.form { gap: 14px; }
.at { position: relative; display: block; font-size: 16px; font-weight: 400; color: var(--fg); }
.sign { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--fg-2); font-weight: 650; pointer-events: none; }
.at .input { padding-left: 28px; }
.err { font-size: 13px; font-weight: 600; color: var(--bad); }
.hint.near { color: var(--warn); font-weight: 650; }
</style>
