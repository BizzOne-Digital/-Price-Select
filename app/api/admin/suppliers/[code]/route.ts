import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { getSupplierAdmin } from '@/lib/server/services/suppliers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler<{ code: string }>(async (req, { params }) => json(await getSupplierAdmin(await requireActor(['admin'], req.headers), (await params).code)))
