import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { handler, json, query } from '@/lib/server/http'
import { listOrders } from '@/lib/server/services/operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  const a = await requireActor(['admin', 'support'], req.headers)
  const q = query(req, z.object({ status: z.string().max(30).optional(), q: z.string().max(40).optional(), page: z.coerce.number().int().min(1).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() }))
  return json(await listOrders(a, q))
})
