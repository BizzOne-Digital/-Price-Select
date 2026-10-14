import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { submitApplication } from '@/lib/server/services/suppliers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => json(await submitApplication(await requireActor(['supplier'], req.headers), await req.json())))
