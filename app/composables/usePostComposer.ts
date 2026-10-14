import { createGlobalState } from '@vueuse/core'
import type { NewPost } from '#shared/types/social'

/** What the composer opens with: a draft, and photos on this device to offer (a stop's photos, by photo id). */
export interface PostPreset {
  draft: Partial<NewPost>
  /** Photo ids from usePhotos() to pick from (a stop's photos). */
  photoIds?: string[]
  /** The line under the composer's title ("From Pantheon"). */
  context?: string
}

const usePresetState = createGlobalState(() => shallowRef<PostPreset | null>(null))

/**
 * Opens the post composer (PostComposer.vue, ?compose=1) from anywhere, with a preset: a moment from a stop, a day
 * recap, a plan link or a meetup (docs/design/2026-10-14-together.md, 5.6). The preset lives in memory, the open state
 * in the URL (the back gesture closes it; after a reload it opens empty).
 */
export function usePostComposer() {
  const preset = usePresetState()
  const route = useRoute()
  const router = useRouter()
  const isOpen = computed(() => route.query.compose === '1')

  function open(p: PostPreset | null = null) {
    preset.value = p
    if (!isOpen.value) void router.push({ query: { ...route.query, compose: '1' } })
  }

  function close() {
    preset.value = null
    if (!isOpen.value) return
    const back = (window.history.state as { back?: string } | null)?.back
    if (back) {
      const r = router.resolve(back)
      if (r.path === route.path && !r.query.compose) {
        router.back()
        return
      }
    }
    const query = { ...route.query }
    delete query.compose
    void router.replace({ query })
  }

  return { preset, isOpen, open, close }
}
