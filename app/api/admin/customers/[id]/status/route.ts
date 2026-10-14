import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { body, handler, json, zId } from '@/lib/server/http'
import { setCustomerStatus } from '@/lib/server/services/customers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async (req, { params }) => {
  const a = await requireActor(['admin', 'support'], req.headers)
  const d = await body(req, z.object({ status: z.enum(['active', 'suspended']), reason: z.string().trim().max(300).optional() }))
  return json(await setCustomerStatus(a, zId.parse((await params).id), d.status, d.reason))
})
