import { requireActor } from '@/lib/server/auth'
import { body, handler, json } from '@/lib/server/http'
import { updateFulfillment, zFulfillmentAction } from '@/lib/server/services/operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** acknowledge | status (processing/shipped/delivered) | tracking. Timestamps are set by the server. */
export const POST = handler<{ fid: string }>(async (req, { params }) => json(await updateFulfillment(await requireActor(['supplier'], req.headers), (await params).fid, await body(req, zFulfillmentAction))))
