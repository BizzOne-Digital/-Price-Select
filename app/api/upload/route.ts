import { requireActor } from '@/lib/server/auth'
import { badRequest, clientIp, handler, json, rateLimit } from '@/lib/server/http'
import { savePublicImage } from '@/lib/server/services/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Single-request public image upload (admin only): multipart FormData with `file` and `folder`.
 * Images larger than ~3.5 MB must use the chunked session routes on hosts with a 4.5 MB body limit.
 */
export const POST = handler(async (req) => {
  const a = await requireActor(['admin'], req.headers)
  await rateLimit(`upload:${a.id}:${clientIp(req)}`, 60, 600)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const folder = form?.get('folder')
  if (!(file instanceof File) || typeof folder !== 'string') throw badRequest('Send multipart form data with "file" and "folder".')
  return json(await savePublicImage(a, folder, Buffer.from(await file.arrayBuffer())), 201)
})
