import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { myOrder } from '@/lib/server/services/commerce'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler<{ id: string }>(async (req, { params }) => json(await myOrder(await requireActor(['customer'], req.headers), (await params).id)))
