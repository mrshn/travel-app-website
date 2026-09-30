import { createGlobalState } from '@vueuse/core'
import { notesFor, type Note, type NoteKind } from '#shared/utils/notes'

export const NOTE_META: Record<NoteKind, { label: string, plural: string, icon: string }> = {
  chat: { label: 'Chat', plural: 'Chats', icon: 'chat' },
  research: { label: 'Research', plural: 'Research', icon: 'search' },
  tips: { label: 'Tips', plural: 'Tips', icon: 'sparkle' },
  note: { label: 'Note', plural: 'Notes', icon: 'doc' },
  page: { label: 'Page', plural: 'Pages', icon: 'image' },
}

/** Notes saved from chats. Loaded on first use (they live in their own bundle). */
export const useNotes = createGlobalState(() => {
  const notes = shallowRef<Note[]>([])
  const ready = ref(false)
  let loading: Promise<void> | null = null

  function load() {
    loading ??= import('~/data/notes').then((m) => {
      notes.value = m.NOTES
      ready.value = true
    })
    return loading
  }

  const forTrip = (tripId: string) => computed(() => notes.value.filter(n => n.trip === tripId))
  const get = (slug: string) => notes.value.find(n => n.slug === slug)
  /** What the lists show this account: the notes of its trips, and those of no trip (spec D43). */
  const { trips } = useTrips()
  const visible = computed(() => notesFor(notes.value, trips.value.map(t => t.id)))

  return { notes, visible, ready, load, forTrip, get }
})

export function githubEditUrl(file: string): string {
  const { repo, branch } = useAppConfig()
  return `https://github.com/${repo}/edit/${branch}/${file}`
}

export function githubFileUrl(file: string): string {
  const { repo, branch } = useAppConfig()
  return `https://github.com/${repo}/blob/${branch}/${file}`
}
