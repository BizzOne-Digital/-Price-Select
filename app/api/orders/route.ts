import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { myOrders } from '@/lib/server/services/commerce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => json(await myOrders(await requireActor(['customer'], req.headers))))
