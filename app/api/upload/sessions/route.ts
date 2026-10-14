import { requireActor } from '@/lib/server/auth'
import { body, clientIp, handler, json, rateLimit } from '@/lib/server/http'
import { initUpload, zInit } from '@/lib/server/services/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Start a chunked upload (public image or private file). */
export const POST = handler(async (req) => {
  const a = await requireActor(undefined, req.headers)
  await rateLimit(`upload-init:${a.id}:${clientIp(req)}`, 60, 600)
  return json(await initUpload(a, await body(req, zInit)), 201)
})
