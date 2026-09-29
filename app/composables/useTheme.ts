import { createGlobalState, useColorMode } from '@vueuse/core'

/** Light, dark or follow the phone. */
export const useTheme = createGlobalState(() => {
  const mode = useColorMode({
    attribute: 'data-theme',
    storageKey: 'travel:theme',
    initialValue: 'auto',
    modes: { light: 'light', dark: 'dark' },
  })
  const dark = computed(() => mode.state.value === 'dark')
  const choice = computed({
    get: () => mode.store.value as 'auto' | 'light' | 'dark',
    set: (v) => {
      mode.value = v
    },
  })
  return { choice, dark }
})
