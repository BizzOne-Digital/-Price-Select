import { requireActor } from '@/lib/server/auth'
import { handler, json, zId } from '@/lib/server/http'
import { getProductAdmin, updateProductAdmin } from '@/lib/server/services/products'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler<{ id: string }>(async (req, { params }) => json(await getProductAdmin(await requireActor(['admin'], req.headers), zId.parse((await params).id))))
export const PATCH = handler<{ id: string }>(async (req, { params }) => json(await updateProductAdmin(await requireActor(['admin'], req.headers), zId.parse((await params).id), await req.json())))
