// Photos live in this browser's IndexedDB (they're too big for localStorage).
import { clear, createStore, del, get, keys, set } from 'idb-keyval'

let store: ReturnType<typeof createStore> | null = null
const db = () => (store ??= createStore('travels-photos', 'photos'))

/** Object URLs of the photos shown in this visit, by photo id (usePhotos). */
export const photoUrls = new Map<string, string>()

export const readPhoto = (id: string) => get<Blob>(id, db())
export const writePhoto = (id: string, blob: Blob) => set(id, blob, db())
export const deletePhoto = (id: string) => del(id, db())
export const photoIds = async (): Promise<string[]> => (await keys(db())).map(String)

/**
 * Removes every photo from this device (IndexedDB and the URLs shown in this visit), never from the cloud: another
 * account's copy is about to arrive, or the device is being cleared.
 */
export async function clearPhotos(): Promise<void> {
  for (const u of photoUrls.values()) URL.revokeObjectURL(u)
  photoUrls.clear()
  await clear(db())
}
