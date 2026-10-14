import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { body, handler, json } from '@/lib/server/http'
import { cancelOrder } from '@/lib/server/services/operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async (req, { params }) => {
  const a = await requireActor(['admin', 'support'], req.headers)
  const d = await body(req, z.object({ reason: z.string().trim().min(3).max(300) }))
  return json(await cancelOrder(a, (await params).id, d.reason))
})
