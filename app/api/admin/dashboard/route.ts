import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { adminDashboard } from '@/lib/server/services/metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => json(await adminDashboard(await requireActor(['admin', 'support'], req.headers))))
