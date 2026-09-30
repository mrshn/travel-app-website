import { createGlobalState } from '@vueuse/core'

export interface ToastAction {
  label: string
  run: () => void
}

export interface Toast {
  id: number
  text: string
  /** 'gold' is for celebrations: a badge, a rank, a completed set. */
  tone?: 'ok' | 'info' | 'warn' | 'gold'
  /** One action. Still works; it comes after any `actions`. */
  action?: ToastAction
  /** At most two actions, in this order ("Log €7", then "Undo"). */
  actions?: ToastAction[]
}

export type ToastOptions = Omit<Toast, 'id' | 'text'> & { ms?: number }

/** How many toasts show at once; the oldest makes room. */
const MAX_SHOWN = 3

/** The actions of a toast: `actions` first, then `action`, at most two. */
function toastActions(t: Pick<Toast, 'action' | 'actions'>): ToastAction[] {
  const list = [...(Array.isArray(t.actions) ? t.actions : []), ...(t.action ? [t.action] : [])]
  return list.filter(a => !!a && typeof a.run === 'function' && !!a.label).slice(0, 2)
}

export const useToasts = createGlobalState(() => {
  const items = ref<Toast[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  const lengths = new Map<number, number>()
  let n = 0

  function arm(id: number, ms: number) {
    clearTimeout(timers.get(id))
    timers.set(id, setTimeout(() => dismiss(id), ms))
  }

  function forget(id: number) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    lengths.delete(id)
  }

  function push(text: string, opts: ToastOptions = {}) {
    const id = ++n
    const actions = toastActions(opts)
    const t: Toast = { id, text, tone: opts.tone }
    if (actions.length) t.actions = actions
    const kept = items.value.slice(-(MAX_SHOWN - 1))
    for (const old of items.value) {
      if (!kept.includes(old)) forget(old.id)
    }
    items.value = [...kept, t]
    // Two actions need a moment longer to read and reach.
    const ms = opts.ms ?? (actions.length > 1 ? 6000 : actions.length ? 5000 : 2600)
    lengths.set(id, ms)
    arm(id, ms)
    return id
  }

  function dismiss(id: number) {
    forget(id)
    items.value = items.value.filter(t => t.id !== id)
  }

  /** Keeps a toast on screen (while it has keyboard focus). */
  function hold(id: number) {
    clearTimeout(timers.get(id))
    timers.delete(id)
  }

  /** Lets a held toast go again after a short while. */
  function release(id: number) {
    if (timers.has(id) || !items.value.some(t => t.id === id)) return
    arm(id, Math.min(lengths.get(id) ?? 2600, 3000))
  }

  /** Runs an action, then closes its toast (a failing action still closes it). */
  function act(id: number, a: ToastAction) {
    try {
      a.run()
    }
    catch (e) {
      console.error(e)
    }
    finally {
      dismiss(id)
    }
  }

  /** Elements toasts must never cover while they are on the page: a cost pad, whose keys are tapped fast. */
  const clearOf = shallowRef<HTMLElement[]>([])

  /** Keeps toasts clear of an element until the returned function is called (ToastHost moves them). */
  function keepClear(el: HTMLElement): () => void {
    clearOf.value = [...clearOf.value, el]
    return () => {
      clearOf.value = clearOf.value.filter(x => x !== el)
    }
  }

  return { items, push, dismiss, hold, release, act, clearOf, keepClear }
})

export function toast(text: string, opts?: ToastOptions) {
  return useToasts().push(text, opts)
}
