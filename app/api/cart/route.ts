import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { body, handler, json } from '@/lib/server/http'
import { getCartItems, publicQuote, setCart, zCartItems } from '@/lib/server/services/commerce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  const a = await requireActor(['customer'], req.headers)
  return json(await publicQuote(await getCartItems(a.id), a))
})

export const PUT = handler(async (req) => {
  const a = await requireActor(['customer'], req.headers)
  const d = await body(req, z.object({ items: zCartItems }))
  return json(await publicQuote(await setCart(a.id, d.items), a))
})
