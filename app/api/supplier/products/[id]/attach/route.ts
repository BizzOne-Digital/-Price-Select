import { requireActor } from '@/lib/server/auth'
import { handler, json, zId } from '@/lib/server/http'
import { attachToProduct } from '@/lib/server/services/products'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async (req, { params }) => json(await attachToProduct(await requireActor(['supplier'], req.headers), zId.parse((await params).id), await req.json())))
