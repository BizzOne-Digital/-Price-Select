import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { body, handler, json } from '@/lib/server/http'
import { mergeCart, publicQuote, zCartItems } from '@/lib/server/services/commerce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Merge the browser's guest cart into the signed-in customer's cart (server-validated). */
export const POST = handler(async (req) => {
  const a = await requireActor(['customer'], req.headers)
  const d = await body(req, z.object({ items: zCartItems }))
  return json(await publicQuote(await mergeCart(a.id, d.items), a))
})
