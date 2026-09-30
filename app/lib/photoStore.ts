// Photos live in this browser's IndexedDB (they're too big for localStorage).
import { createStore, del, get, keys, set } from 'idb-keyval'

let store: ReturnType<typeof createStore> | null = null
const db = () => (store ??= createStore('travels-photos', 'photos'))

export const readPhoto = (id: string) => get<Blob>(id, db())
export const writePhoto = (id: string, blob: Blob) => set(id, blob, db())
export const deletePhoto = (id: string) => del(id, db())
export const photoIds = async (): Promise<string[]> => (await keys(db())).map(String)
