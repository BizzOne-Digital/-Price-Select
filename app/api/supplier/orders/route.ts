import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { myFulfillments } from '@/lib/server/services/operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => json(await myFulfillments(await requireActor(['supplier'], req.headers))))
