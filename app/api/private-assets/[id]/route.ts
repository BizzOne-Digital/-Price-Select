import { requireActor } from '@/lib/server/auth'
import { errorResponse } from '@/lib/server/http'
import { readPrivateAsset } from '@/lib/server/services/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Authorized download of a private document. Never cached by shared caches. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const a = await requireActor(undefined, req.headers)
    const f = await readPrivateAsset(a, (await params).id)
    const name = f.name.replace(/[^\w.\- ]+/g, '_')
    return new Response(new Uint8Array(f.data), {
      headers: {
        'Content-Type': f.mimeType,
        'Content-Length': String(f.size),
        'Content-Disposition': `${f.mimeType === 'application/pdf' || f.mimeType.startsWith('image/') ? 'inline' : 'attachment'}; filename="${name}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
