import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { handler, json, query } from '@/lib/server/http'
import { listProductsAdmin } from '@/lib/server/services/products'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  const a = await requireActor(['admin'], req.headers)
  const q = query(req, z.object({ status: z.enum(['all', 'draft', 'pending_review', 'published', 'rejected', 'flagged', 'suspended', 'withdrawn']).optional() }))
  return json(await listProductsAdmin(a, q))
})
