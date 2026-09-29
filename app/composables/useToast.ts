import { createGlobalState } from '@vueuse/core'

export interface Toast {
  id: number
  text: string
  tone?: 'ok' | 'info' | 'warn'
  action?: { label: string, run: () => void }
}

export const useToasts = createGlobalState(() => {
  const items = ref<Toast[]>([])
  let n = 0
  function push(text: string, opts: Omit<Toast, 'id' | 'text'> & { ms?: number } = {}) {
    const id = ++n
    items.value = [...items.value.slice(-2), { id, text, tone: opts.tone, action: opts.action }]
    setTimeout(() => dismiss(id), opts.ms ?? (opts.action ? 5000 : 2600))
    return id
  }
  function dismiss(id: number) {
    items.value = items.value.filter(t => t.id !== id)
  }
  return { items, push, dismiss }
})

export function toast(text: string, opts?: Omit<Toast, 'id' | 'text'> & { ms?: number }) {
  return useToasts().push(text, opts)
}
