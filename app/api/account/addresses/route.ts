import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { saveAddress } from '@/lib/server/services/customers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => json(await saveAddress(await requireActor(['customer'], req.headers), null, await req.json()), 201))
