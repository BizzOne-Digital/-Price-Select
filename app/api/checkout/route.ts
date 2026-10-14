import { getActor } from '@/lib/server/auth'
import { body, clientIp, handler, json, rateLimit } from '@/lib/server/http'
import { checkout, zCheckout } from '@/lib/server/services/commerce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Place an order. The client sends product ids, quantities, addresses and an idempotency key;
 * every amount is computed on the server. Retrying with the same key returns the same order.
 */
export const POST = handler(async (req) => {
  const d = await body(req, zCheckout)
  await rateLimit(`checkout:${clientIp(req)}`, 10, 300)
  const r = await checkout(d, await getActor(req.headers))
  return json(r, r.replayed ? 200 : 201)
})
