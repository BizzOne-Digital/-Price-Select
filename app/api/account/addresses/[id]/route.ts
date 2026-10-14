import { requireActor } from '@/lib/server/auth'
import { handler, json, zId } from '@/lib/server/http'
import { deleteAddress, saveAddress } from '@/lib/server/services/customers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const PATCH = handler<{ id: string }>(async (req, { params }) => json(await saveAddress(await requireActor(['customer'], req.headers), zId.parse((await params).id), await req.json())))
export const DELETE = handler<{ id: string }>(async (req, { params }) => json(await deleteAddress(await requireActor(['customer'], req.headers), zId.parse((await params).id))))
