<script setup lang="ts">
import type { ResolvedStop } from '#shared/utils/plan'
import { groupErrorLine } from './GroupNotice.vue'
import { useShareWhere } from './GroupWhereButton.vue'

/**
 * The group chat's composer (docs/design/2026-10-14-together.md, 5.1), fixed above the tab bar: a line of text, and a
 * + menu for a photo, a stop of the plan, or where you are (one fix, never followed). Offline it is switched off.
 */
const emit = defineEmits<{ height: [px: number] }>()
const tg = useTripGroup()
const social = useSocial()
const picker = useQueryState('send')

const text = ref('')
const menu = ref(false)
const sending = ref(false)
const state = social.state
const ready = social.ready
const canSend = computed(() => ready.value && !sending.value && !!text.value.trim())
const placeholder = computed(() => {
  if (state.value === 'offline') return 'You\'re offline'
  if (state.value === 'signed-out') return 'Sign in again to chat'
  return 'Message'
})

/** Sends one message; false when it didn't go (a toast says why). */
async function send(m: Parameters<typeof tg.send>[0], what = 'Your message didn\'t send. Try again in a moment.'): Promise<boolean> {
  sending.value = true
  try {
    await tg.send(m)
    return true
  }
  catch (e) {
    toast(groupErrorLine(e, what), { tone: 'warn' })
    return false
  }
  finally {
    sending.value = false
  }
}

async function sendText() {
  const t = text.value.trim().slice(0, 1000)
  if (!t || !canSend.value) return
  if (await send({ kind: 'text', text: t })) text.value = ''
}

// ---------- a photo ----------
const fileEl = ref<HTMLInputElement | null>(null)
/** A photo on its way up. */
const photo = ref(false)
function pickPhoto() {
  menu.value = false
  fileEl.value?.click()
}
/** The picture made smaller (about 1280 px on its long side) and saved as a JPEG, as chats do. */
async function downscale(file: Blob, max = 1280): Promise<Blob> {
  const src = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = src
    await img.decode()
    const scale = Math.min(1, max / Math.max(img.naturalWidth || 1, img.naturalHeight || 1))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (!g) throw new Error('No canvas')
    // A JPEG has no transparency: a see-through picture goes on white.
    g.fillStyle = '#fff'
    g.fillRect(0, 0, w, h)
    g.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('Couldn’t make the photo'))), 'image/jpeg', 0.82))
  }
  finally {
    URL.revokeObjectURL(src)
  }
}
async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !ready.value) return
  if (!file.type.startsWith('image/')) {
    toast('That isn\'t a photo. Pick a picture.', { tone: 'warn' })
    return
  }
  sending.value = true
  photo.value = true
  try {
    const blob = await downscale(file)
    const image = await social.api().uploadPublicPhoto(blob)
    await tg.send({ kind: 'photo', text: text.value.trim().slice(0, 1000), image })
    text.value = ''
  }
  catch (err) {
    toast(groupErrorLine(err, 'Your photo didn\'t send. Try another one, or try again in a moment.'), { tone: 'warn' })
  }
  finally {
    sending.value = false
    photo.value = false
  }
}

// ---------- a stop ----------
function pickStop() {
  menu.value = false
  picker.open('stop')
}
async function sendStop(s: ResolvedStop, when: string) {
  picker.close()
  await send({ kind: 'stop', text: '', stopId: s.id, stopTitle: s.title, stopWhen: when })
}

// ---------- where I am ----------
const where = useShareWhere()
function shareWhere() {
  menu.value = false
  if (ready.value) void where.share()
}

// ---------- keeping toasts off the composer, and the chat's last line above it ----------
const box = ref<HTMLElement | null>(null)
const toasts = useToasts()
let release: (() => void) | undefined
let sizer: ResizeObserver | undefined
let sheets: MutationObserver | undefined
/** Toasts keep clear of the composer, except while a sheet covers it (they then stay in their usual place). */
function clearOfToasts() {
  const el = box.value
  const covered = document.documentElement.classList.contains('sheet-open')
  if (el && !covered && !release) release = toasts.keepClear(el)
  else if ((covered || !el) && release) {
    release()
    release = undefined
  }
}
onMounted(() => {
  const el = box.value
  if (!el) return
  clearOfToasts()
  sheets = new MutationObserver(clearOfToasts)
  sheets.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  emit('height', el.offsetHeight)
  if (typeof ResizeObserver !== 'undefined') {
    sizer = new ResizeObserver(() => emit('height', el.offsetHeight))
    sizer.observe(el)
  }
})
onBeforeUnmount(() => {
  release?.()
  release = undefined
  sheets?.disconnect()
  sizer?.disconnect()
})
</script>

<template>
  <div ref="box" class="composer">
    <div class="cp-in">
      <div v-if="menu" id="chat-more" class="tray" role="group" aria-label="Send something else">
        <button class="btn sm" type="button" :disabled="!ready" @click="pickPhoto">
          <AppIcon name="camera" size="sm" />Photo
        </button>
        <button class="btn sm" type="button" :disabled="!ready" @click="pickStop">
          <AppIcon name="calendar" size="sm" />A stop
        </button>
        <button class="btn sm" type="button" :disabled="!ready || where.busy.value" @click="shareWhere">
          <AppIcon name="locate" size="sm" />{{ where.busy.value ? 'Finding you…' : 'Where I am' }}
        </button>
      </div>
      <p v-if="where.busy.value" class="small muted finding" role="status">
        <AppIcon name="locate" size="sm" />Finding where you are…
      </p>
      <p v-if="photo" class="small muted finding" role="status">
        <AppIcon name="image" size="sm" />Sending your photo…
      </p>
      <p v-if="state === 'offline'" class="off small" role="status">
        <AppIcon name="signal-off" size="sm" />You're offline. Messages send when you're back.
      </p>
      <form class="cp-row" @submit.prevent="sendText">
        <button
          class="btn icon round plus"
          type="button"
          :aria-expanded="menu"
          :aria-controls="menu ? 'chat-more' : undefined"
          aria-label="Send a photo, a stop or where you are"
          :disabled="!ready"
          @click="menu = !menu"
        >
          <AppIcon :name="menu ? 'x' : 'plus'" />
        </button>
        <input
          v-model="text"
          class="input grow msg"
          type="text"
          maxlength="1000"
          enterkeyhint="send"
          autocomplete="off"
          aria-label="Message"
          :placeholder="placeholder"
          :disabled="!ready"
        >
        <button class="btn icon round primary" type="submit" aria-label="Send" :disabled="!canSend">
          <AppIcon name="send" />
        </button>
      </form>
    </div>
    <input ref="fileEl" class="sr-only" type="file" accept="image/*" tabindex="-1" aria-hidden="true" @change="onFile">
    <ChatStopPicker :open="picker.value.value === 'stop'" @close="picker.close()" @pick="sendStop" />
  </div>
</template>

<style scoped>
.composer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--tab-h) + var(--safe-b));
  z-index: 55;
  background: color-mix(in srgb, var(--bg) 94%, transparent);
  backdrop-filter: saturate(1.4) blur(14px);
  -webkit-backdrop-filter: saturate(1.4) blur(14px);
  border-top: 1px solid var(--line);
}
.cp-in { max-width: var(--page-max); margin: 0 auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; }
.cp-row { display: flex; align-items: center; gap: 8px; }
.msg { min-height: 44px; border-radius: 999px; padding: 10px 16px; }
.plus { flex: none; }
.cp-row .primary { flex: none; }
.tray { display: flex; flex-wrap: wrap; gap: 8px; }
.tray .btn { flex: 1 1 auto; min-height: 44px; }
.off { display: flex; align-items: center; gap: 8px; color: var(--warn); font-weight: 600; }
.finding { display: flex; align-items: center; gap: 8px; }
.off .i { flex: none; }
@media (min-width: 900px) {
  .composer { bottom: 0; padding-bottom: var(--safe-b); }
}
</style>
