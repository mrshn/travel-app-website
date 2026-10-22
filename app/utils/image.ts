/** A picture the browser can draw: what createImageBitmap gives, or an <img> where it can't decode the file. */
interface Drawable {
  source: CanvasImageSource
  width: number
  height: number
  done: () => void
}

async function decodeImage(blob: Blob): Promise<Drawable> {
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() }
  }
  catch {
    // Older browsers: decode through an <img> (it applies the photo's orientation by itself).
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) }
    }
    catch (e) {
      URL.revokeObjectURL(url)
      throw e
    }
  }
}

/**
 * A photo made ready to share (posts, chat): at most `max` px on its longer side, as a JPEG, upright, on white where
 * it was see-through. Rejects when the file isn't a picture the browser can open.
 */
export async function downscaleImage(blob: Blob, max = 1600, quality = 0.85): Promise<Blob> {
  const pic = await decodeImage(blob)
  try {
    if (!pic.width || !pic.height) throw new Error('empty image')
    const scale = Math.min(1, max / Math.max(pic.width, pic.height))
    const w = Math.max(1, Math.round(pic.width * scale))
    const h = Math.max(1, Math.round(pic.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(pic.source, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality),
    )
  }
  finally {
    pic.done()
  }
}
