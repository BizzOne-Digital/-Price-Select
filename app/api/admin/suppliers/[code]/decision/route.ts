import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { decideSupplier } from '@/lib/server/services/suppliers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** review | approve | reject | suspend | reinstate | document | settings */
export const POST = handler<{ code: string }>(async (req, { params }) => json(await decideSupplier(await requireActor(['admin'], req.headers), (await params).code, await req.json())))
