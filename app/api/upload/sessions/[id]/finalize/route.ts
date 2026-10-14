import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { finalizeUpload } from '@/lib/server/services/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Reassemble and validate. Idempotent: repeating it returns the same saved result. */
export const POST = handler<{ id: string }>(async (req, { params }) => {
  const a = await requireActor(undefined, req.headers)
  const r = await finalizeUpload(a, (await params).id)
  return json(r.url ? { success: true, url: r.url, filename: r.filename, size: r.size, folder: r.folder } : { success: true, assetId: r.assetId, filename: r.filename, size: r.size })
})
