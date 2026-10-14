import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { savedIds, savedProducts } from '@/lib/server/services/customers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  const a = await requireActor(['customer'], req.headers)
  return json({ ids: await savedIds(a), products: await savedProducts(a) })
})
