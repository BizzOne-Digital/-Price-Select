import { errorResponse } from '@/lib/server/http'
import { getPublicImage } from '@/lib/server/services/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SLICE = 256 * 1024

/** Public catalog/content images stored in MongoDB, streamed in slices with immutable caching. */
export async function GET(_req: Request, { params }: { params: Promise<{ folder: string; filename: string }> }) {
  try {
    const { folder, filename } = await params
    const img = await getPublicImage(folder, filename)
    let offset = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= img.data.length) return controller.close()
        controller.enqueue(new Uint8Array(img.data.subarray(offset, offset + SLICE)))
        offset += SLICE
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': img.mimeType,
        'Content-Length': String(img.data.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
