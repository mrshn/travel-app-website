import { uid } from '#shared/utils/plan'
import { deletePhoto, photoUrls as urls, readPhoto, writePhoto } from '~/lib/photoStore'

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

/**
 * Photos are kept on this device and, when you're signed in, backed up to your account. A photo being saved or fetched
 * while this device's copy is removed (another account signing in, spec D44) is dropped: it belonged to that copy.
 */
export function usePhotos() {
  const cloud = useCloud()
  const copy = useCopyEpoch()

  async function add(file: Blob): Promise<string> {
    const started = copy.value
    const blob = await shrink(file)
    if (copy.value !== started) throw new Error('This device changed accounts while the photo was being saved')
    const id = uid('ph')
    await writePhoto(id, blob)
    if (copy.value !== started) {
      await deletePhoto(id).catch(() => {})
      throw new Error('This device changed accounts while the photo was being saved')
    }
    cloud.photoAdded(id)
    return id
  }

  /** A URL to show the photo, fetching it from your account when it was taken on another device. */
  async function url(id: string): Promise<string | null> {
    const hit = urls.get(id)
    if (hit) return hit
    const started = copy.value
    let blob = await readPhoto(id)
    if (!blob) {
      const got = await cloud.fetchPhoto(id)
      if (!got || copy.value !== started) return null
      if (typeof got === 'string') return got
      blob = got
      await writePhoto(id, blob).catch(() => {})
      if (copy.value !== started) {
        await deletePhoto(id).catch(() => {})
        return null
      }
    }
    if (copy.value !== started) return null
    const u = URL.createObjectURL(blob)
    urls.set(id, u)
    return u
  }

  async function remove(id: string) {
    const started = copy.value
    await deletePhoto(id)
    if (copy.value !== started) return
    cloud.photoRemoved(id)
    const u = urls.get(id)
    if (u) URL.revokeObjectURL(u)
    urls.delete(id)
  }

  return { add, url, remove }
}
