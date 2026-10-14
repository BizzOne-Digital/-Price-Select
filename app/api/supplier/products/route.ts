import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { createDraft, myProducts } from '@/lib/server/services/products'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => json(await myProducts(await requireActor(['supplier'], req.headers))))
export const POST = handler(async (req) => json(await createDraft(await requireActor(['supplier'], req.headers), await req.json()), 201))
