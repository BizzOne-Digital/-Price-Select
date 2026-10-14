import { z } from 'zod'
import { getActor } from '@/lib/server/auth'
import { body, clientIp, handler, json, rateLimit } from '@/lib/server/http'
import { getCartItems, publicQuote, zCartItems } from '@/lib/server/services/commerce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Price a cart. Signed-in customers may omit items to quote their saved cart. */
export const POST = handler(async (req) => {
  const d = await body(req, z.object({ items: zCartItems.optional() }))
  await rateLimit(`quote:${clientIp(req)}`, 120, 60)
  const a = await getActor(req.headers)
  const items = d.items ?? (a?.role === 'customer' ? await getCartItems(a.id) : [])
  return json(await publicQuote(items, a))
})
