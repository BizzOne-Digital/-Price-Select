import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { listSuppliers } from '@/lib/server/services/suppliers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => json(await listSuppliers(await requireActor(['admin'], req.headers))))
