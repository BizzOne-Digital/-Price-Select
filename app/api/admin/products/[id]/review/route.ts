import { requireActor } from '@/lib/server/auth'
import { handler, json, zId } from '@/lib/server/http'
import { reviewProduct } from '@/lib/server/services/products'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** approve | reject | flag | suspend | withdraw | signoff | document | publish_image */
export const POST = handler<{ id: string }>(async (req, { params }) => json(await reviewProduct(await requireActor(['admin'], req.headers), zId.parse((await params).id), await req.json())))
