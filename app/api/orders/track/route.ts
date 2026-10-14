import { z } from 'zod'
import { getActor } from '@/lib/server/auth'
import { body, clientIp, handler, json, rateLimit } from '@/lib/server/http'
import { guestOrder, myOrder } from '@/lib/server/services/commerce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Order tracking. Signed-in customers can track their own orders by number; guests need the
 * private access code issued at checkout. A number alone never reveals an order.
 */
export const POST = handler(async (req) => {
  const d = await body(req, z.object({ orderId: z.string().trim().toUpperCase().max(40), accessCode: z.string().trim().max(200).optional() }))
  await rateLimit(`track:${clientIp(req)}`, 20, 600)
  const a = await getActor(req.headers)
  if (d.accessCode) return json(await guestOrder(d.orderId, d.accessCode))
  if (a?.role === 'customer') return json(await myOrder(a, d.orderId))
  return json({ error: { code: 'not_found', message: 'Order not found. Sign in, or enter the access code from your confirmation.' } }, 404)
})
