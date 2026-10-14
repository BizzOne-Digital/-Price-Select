import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { cancelMembership, purchaseMembership } from '@/lib/server/services/customers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Purchase requires a configured payment provider; benefits activate only on confirmed payment. */
export const POST = handler(async (req) => json(await purchaseMembership(await requireActor(['customer'], req.headers), await req.json())))
/** Turn off auto-renewal; benefits last until the paid period ends. */
export const DELETE = handler(async (req) => json(await cancelMembership(await requireActor(['customer'], req.headers))))
