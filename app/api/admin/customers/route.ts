import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { listCustomers } from '@/lib/server/services/customers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => json(await listCustomers(await requireActor(['admin', 'support'], req.headers))))
