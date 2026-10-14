<script setup lang="ts">
import type { FriendRequest } from '#shared/types/social'
import { socialFirstName } from '#shared/utils/social'
import { SocialError } from '~/lib/social/api'
import { readRequestLines } from './FriendRow.vue'
import { friendsError } from './FriendsNotice.vue'

/**
 * Friend requests (spec 5.5): to you, with Accept and Decline; from you (with `outgoing`), Waiting with Cancel.
 * Answering one also marks its line in Activity as read.
 */
const props = withDefaults(defineProps<{ outgoing?: boolean, heading?: string }>(), { outgoing: false, heading: 'Requests' })
const emit = defineEmits<{ open: [uid: string] }>()

const social = useSocial()
const hid = useId()
const busy = ref<Record<string, boolean>>({})
const incoming = computed(() => [...social.incoming.value].sort((a, b) => b.at - a.at))
const outgoing = computed(() => (props.outgoing ? [...social.outgoing.value].sort((a, b) => b.at - a.at) : []))
const any = computed(() => incoming.value.length + outgoing.value.length > 0)
const nameOf = (uid: string, fallback?: string) => socialFirstName(social.personRef(uid, { name: fallback }).name)

const gone = (e: unknown) => e instanceof SocialError && e.code === 'not-found'

async function run(r: FriendRequest, what: () => Promise<unknown>, done: string, failed: string) {
  if (busy.value[r.id]) return
  busy.value = { ...busy.value, [r.id]: true }
  try {
    await what()
    toast(done, { tone: 'ok' })
  }
  catch (e) {
    toast(gone(e) ? 'That request isn’t there any more.' : friendsError(e, failed), { tone: 'warn' })
  }
  finally {
    const next = { ...busy.value }
    delete next[r.id]
    busy.value = next
  }
}

function accept(r: FriendRequest) {
  void run(r, async () => {
    await social.acceptRequest(r)
    readRequestLines(social, r.from)
  }, `You and ${nameOf(r.from, r.fromName)} are friends`, 'Couldn’t accept the request.')
}
function decline(r: FriendRequest) {
  void run(r, async () => {
    await social.api().dropRequest(r)
    readRequestLines(social, r.from)
  }, 'Request declined', 'Couldn’t decline the request.')
}
function cancel(r: FriendRequest) {
  void run(r, () => social.api().dropRequest(r), 'Request cancelled', 'Couldn’t cancel the request.')
}
</script>

<template>
  <section v-if="any" class="reqs" :aria-labelledby="hid">
    <h2 :id="hid" class="gh">
      {{ heading }}
    </h2>
    <div class="card rows">
      <FriendRow v-for="r in incoming" :key="r.id" :uid="r.from" :fallback="{ name: r.fromName, photo: r.fromPhoto }" line="Wants to be friends">
        <button class="btn sm primary" type="button" :disabled="busy[r.id]" @click="accept(r)">
          <AppIcon name="check" size="sm" />Accept
        </button>
        <button class="btn sm ghost" type="button" :disabled="busy[r.id]" @click="decline(r)">
          Decline
        </button>
        <button class="btn sm plain" type="button" :aria-label="`See ${nameOf(r.from, r.fromName)}`" @click="emit('open', r.from)">
          See
        </button>
      </FriendRow>
      <FriendRow v-for="r in outgoing" :key="r.id" :uid="r.to" line="Waiting">
        <button class="btn sm ghost" type="button" :disabled="busy[r.id]" :aria-label="`Cancel your request to ${nameOf(r.to)}`" @click="cancel(r)">
          Cancel
        </button>
      </FriendRow>
    </div>
  </section>
</template>

<style scoped>
.reqs { display: flex; flex-direction: column; }
.gh { font-family: var(--font-display); font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--gold-ink); margin: 0 4px 8px; }
.rows { overflow: hidden; }
</style>
