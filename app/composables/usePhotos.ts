import { createStore, del, get, set } from 'idb-keyval'
import { uid } from '#shared/utils/plan'

/** Photos live in this browser's IndexedDB (they're too big for localStorage). */
let store: ReturnType<typeof createStore> | null = null
const db = () => (store ??= createStore('travels-photos', 'photos'))
const urls = new Map<string, string>()

async function shrink(file: Blob, max = 1600, quality = 0.82): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality),
    )
  }
  catch {
    return file
  }
}

export function usePhotos() {
  async function add(file: Blob): Promise<string> {
    const blob = await shrink(file)
    const id = uid('ph')
    await set(id, blob, db())
    return id
  }

  async function url(id: string): Promise<string | null> {
    const hit = urls.get(id)
    if (hit) return hit
    const blob = await get<Blob>(id, db())
    if (!blob) return null
    const u = URL.createObjectURL(blob)
    urls.set(id, u)
    return u
  }

  async function remove(id: string) {
    await del(id, db())
    const u = urls.get(id)
    if (u) URL.revokeObjectURL(u)
    urls.delete(id)
  }

  return { add, url, remove }
}
