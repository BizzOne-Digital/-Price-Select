import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { getAccount, updateProfile } from '@/lib/server/services/customers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => json(await getAccount(await requireActor(['customer'], req.headers))))
export const PATCH = handler(async (req) => json(await updateProfile(await requireActor(['customer'], req.headers), await req.json())))
