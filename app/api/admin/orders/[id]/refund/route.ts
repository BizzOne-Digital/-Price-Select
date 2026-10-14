import { requireActor } from '@/lib/server/auth'
import { body, handler, json } from '@/lib/server/http'
import { refundOrder, zRefund } from '@/lib/server/services/operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Partial/full refund of captured funds (administrators only; needs a payment provider). */
export const POST = handler<{ id: string }>(async (req, { params }) => json(await refundOrder(await requireActor(['admin'], req.headers), (await params).id, await body(req, zRefund))))
