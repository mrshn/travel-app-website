/**
 * A value kept in the URL query (e.g. ?stop=pantheon) so sheets survive reloads
 * and the phone's back gesture closes them.
 */
export function useQueryState(key: string) {
  const route = useRoute()
  const router = useRouter()

  const value = computed(() => {
    const v = route.query[key]
    return typeof v === 'string' && v ? v : null
  })

  function open(v: string) {
    const query = { ...route.query, [key]: v }
    if (value.value) router.replace({ query })
    else router.push({ query })
  }

  function close() {
    if (!value.value) return
    const back = (typeof window !== 'undefined' ? (window.history.state as { back?: string } | null)?.back : undefined)
    if (back) {
      const r = router.resolve(back)
      if (r.path === route.path && !r.query[key]) {
        router.back()
        return
      }
    }
    const query = { ...route.query }
    delete query[key]
    router.replace({ query })
  }

  return { value, open, close }
}
