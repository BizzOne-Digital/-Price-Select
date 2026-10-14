import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { body, handler, json, zId } from '@/lib/server/http'
import { notifyAffectedCustomers, ordersWithProduct } from '@/lib/server/services/products'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler<{ id: string }>(async (req, { params }) => {
  const os = await ordersWithProduct(await requireActor(['admin'], req.headers), zId.parse((await params).id))
  return json({ orders: os.length })
})

/** Safety notice to customers who bought the product. Email is queued; sent only if a provider is configured. */
export const POST = handler<{ id: string }>(async (req, { params }) => {
  const d = await body(req, z.object({ message: z.string().trim().min(10).max(2000) }))
  return json(await notifyAffectedCustomers(await requireActor(['admin'], req.headers), zId.parse((await params).id), d.message))
})
