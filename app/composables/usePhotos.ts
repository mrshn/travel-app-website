import { uid } from '#shared/utils/plan'
import { deletePhoto, readPhoto, writePhoto } from '~/lib/photoStore'

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

/** Photos are kept on this device and, when you're signed in, backed up to your account. */
export function usePhotos() {
  const cloud = useCloud()

  async function add(file: Blob): Promise<string> {
    const blob = await shrink(file)
    const id = uid('ph')
    await writePhoto(id, blob)
    cloud.photoAdded(id)
    return id
  }

  /** A URL to show the photo, fetching it from your account when it was taken on another device. */
  async function url(id: string): Promise<string | null> {
    const hit = urls.get(id)
    if (hit) return hit
    let blob = await readPhoto(id)
    if (!blob) {
      const got = await cloud.fetchPhoto(id)
      if (!got) return null
      if (typeof got === 'string') return got
      blob = got
      await writePhoto(id, blob).catch(() => {})
    }
    const u = URL.createObjectURL(blob)
    urls.set(id, u)
    return u
  }

  async function remove(id: string) {
    await deletePhoto(id)
    cloud.photoRemoved(id)
    const u = urls.get(id)
    if (u) URL.revokeObjectURL(u)
    urls.delete(id)
  }

  return { add, url, remove }
}
