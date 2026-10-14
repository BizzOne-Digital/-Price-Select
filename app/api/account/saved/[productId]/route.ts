import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { body, handler, json, zId } from '@/lib/server/http'
import { setSaved } from '@/lib/server/services/customers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const PUT = handler<{ productId: string }>(async (req, { params }) => {
  const a = await requireActor(['customer'], req.headers)
  const d = await body(req, z.object({ saved: z.boolean() }))
  return json(await setSaved(a, zId.parse((await params).productId), d.saved))
})
