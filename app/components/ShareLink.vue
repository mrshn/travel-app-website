<script setup lang="ts">
/**
 * A link to hand on: the address, Copy, Share… (the phone's share sheet: WhatsApp, Messages, a hostel chat), and a QR
 * code to show someone in person.
 */
const props = withDefaults(defineProps<{
  url: string
  /** For the share sheet: a title and a line of text that goes before the link. */
  title?: string
  text?: string
  /** Offer the QR code. */
  qr?: boolean
  /** Open with the QR code showing. */
  qrOpen?: boolean
}>(), { title: 'Travels', text: '', qr: true, qrOpen: false })

const showQr = ref(props.qrOpen)
const short = computed(() => props.url.replace(/^https?:\/\//, ''))

async function copy() {
  if (await copyText(props.url)) toast('Link copied', { tone: 'ok' })
  else toast('Couldn’t copy. Press and hold the link to copy it.', { tone: 'warn' })
}
async function share() {
  const r = await shareLink({ title: props.title, text: props.text, url: props.url })
  if (r === 'copied') toast('Link copied', { tone: 'ok' })
}
</script>

<template>
  <div class="sl">
    <div class="addr">
      <AppIcon name="link" size="sm" />
      <span class="u ellipsis" :title="url">{{ short }}</span>
    </div>
    <div class="acts">
      <button class="btn sm" type="button" @click="copy">
        <AppIcon name="copy" size="sm" />Copy
      </button>
      <button class="btn sm primary" type="button" @click="share">
        <AppIcon name="share" size="sm" />Share…
      </button>
      <button v-if="qr" class="btn sm ghost" type="button" :aria-pressed="showQr" @click="showQr = !showQr">
        <AppIcon name="qr" size="sm" />{{ showQr ? 'Hide QR' : 'QR code' }}
      </button>
    </div>
    <div v-if="qr && showQr" class="qrbox">
      <QrCode :value="url" :size="200" />
      <p class="small muted">
        Point a phone's camera at it to open the link.
      </p>
    </div>
  </div>
</template>

<style scoped>
.sl { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.addr { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px; border-radius: var(--r-md); border: 1px solid var(--line); background: var(--surface-2); color: var(--fg-2); min-width: 0; }
.u { font-family: var(--font-data); font-size: 13px; }
.acts { display: flex; flex-wrap: wrap; gap: 8px; }
.acts .btn { flex: 1 1 auto; }
.qrbox { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 14px; border-radius: var(--r-lg); background: var(--surface-2); text-align: center; }
</style>
