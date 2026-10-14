import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { handler, json, query } from '@/lib/server/http'
import { listAudit } from '@/lib/server/services/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  const a = await requireActor(['admin'], req.headers)
  const q = query(req, z.object({ limit: z.coerce.number().int().min(1).max(200).optional(), targetType: z.string().max(40).optional(), targetId: z.string().max(80).optional() }))
  return json(await listAudit(a, q))
})
