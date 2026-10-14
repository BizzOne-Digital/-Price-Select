import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { getOrderAdmin } from '@/lib/server/services/operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler<{ id: string }>(async (req, { params }) => json(await getOrderAdmin(await requireActor(['admin', 'support'], req.headers), (await params).id)))
