import type { Going, MemberStatus, NewMessage, PersonRef, Role } from '#shared/types/social'
import { socialCanEdit, socialGoing, socialLeading, socialVotes } from '#shared/utils/social'

/**
 * The group of the trip on screen (docs/design/2026-10-14-together.md, 5.1 and 5.4), for any component inside a trip
 * page: who's in it, your role, votes, who's in for each stop, statuses, and with `chat` the messages, live while the
 * component is mounted. On a solo trip everything is empty and `isGroup` is false.
 */
export function useTripGroup(opts: { chat?: boolean } = {}) {
  const v = useTripView()
  const groups = useGroups()
  const social = useSocial()

  const gid = computed(() => v.trip.value?.group?.id ?? null)
  const role = computed<Role | null>(() => v.trip.value?.group?.role ?? null)
  const isGroup = computed(() => !!gid.value)
  const doc = computed(() => (gid.value ? groups.docs.value.get(gid.value) ?? null : null))
  const members = computed(() => groups.membersOf(gid.value))
  /** You can change the plan (always on a solo trip). */
  const canEdit = computed(() => !gid.value || socialCanEdit(role.value))
  const isOwner = computed(() => role.value === 'owner')
  const live = groups.useLive(gid, opts)
  const me = social.me
  const unread = computed(() => groups.unreadOf(gid.value))
  /** How the shared plan stands with the cloud (null on a solo trip). */
  const sync = computed(() => (gid.value ? groups.sync.value[gid.value] ?? 'syncing' : null))
  /** Social features work right now (signed in, online). */
  const ready = social.ready

  /** A member's name and photo (from the group, else what the app knows). */
  function member(uid: string): PersonRef {
    const m = members.value.find(x => x.uid === uid)
    return m ? { uid, name: m.name, photo: m.photo } : social.personRef(uid)
  }

  function need(): string {
    if (!gid.value) throw new Error('Not a group trip')
    return gid.value
  }

  // ---------- options ----------
  /** Votes on an option stop: choice id → voters. */
  const votesFor = (stopId: string) => socialVotes(live.value.votes, stopId)
  const leadingFor = (stopId: string) => socialLeading(votesFor(stopId))
  const myVote = (stopId: string) => live.value.votes.find(x => x.stopId === stopId && x.uid === me.value?.uid)?.choiceId ?? null
  async function vote(stopId: string, choiceId: string | null) {
    await groups.vote(need(), stopId, choiceId)
  }
  /**
   * Makes a choice the group's pick: the option's default in the shared plan, which everyone without a pick of their
   * own follows. Editors only.
   */
  function makeGroupPick(stopId: string, choiceId: string) {
    const t = v.trip.value
    if (!t || !canEdit.value) return
    const hit = v.locate(stopId)
    const choice = hit?.stop.base.options?.choices.find(c => c.id === choiceId)
    v.trips.updateStop(t.id, stopId, (s) => {
      if (s.options) s.options.default = choiceId
    })
    if (choice && me.value) groups.announce(t.id, `${me.value.name} made “${choice.label}” the group pick for ${hit?.stop.base.options?.label ?? hit?.stop.title ?? 'an option'}`)
  }

  // ---------- who's in ----------
  const goingFor = (stopId: string) => socialGoing(live.value.rsvps, stopId)
  const myGoing = (stopId: string): Going | null => live.value.rsvps.find(x => x.stopId === stopId && x.uid === me.value?.uid)?.going ?? null
  async function rsvp(stopId: string, going: Going | null) {
    await groups.rsvp(need(), stopId, going)
  }

  // ---------- statuses and chat ----------
  const statusOf = (uid: string): MemberStatus | null => live.value.statuses.find(s => s.uid === uid) ?? null
  async function setStatus(s: Omit<MemberStatus, 'uid' | 'at'> | null, o?: { tell?: boolean }) {
    await groups.setStatus(need(), s, o)
  }
  async function send(m: NewMessage) {
    return groups.send(need(), m)
  }
  function markRead() {
    if (gid.value) groups.markRead(gid.value)
  }
  /** Says in the chat what changed in the plan (group trips only; never fails). */
  function announce(text: string) {
    const t = v.trip.value
    if (t?.group) groups.announce(t.id, text)
  }

  return {
    gid, role, isGroup, doc, members, canEdit, isOwner, live, me, unread, sync, ready, member,
    votesFor, leadingFor, myVote, vote, makeGroupPick, goingFor, myGoing, rsvp, statusOf, setStatus, send, markRead, announce,
  }
}
