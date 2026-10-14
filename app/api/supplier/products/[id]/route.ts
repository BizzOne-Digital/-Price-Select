import { requireActor } from '@/lib/server/auth'
import { handler, json, zId } from '@/lib/server/http'
import { updateDraft } from '@/lib/server/services/products'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const PATCH = handler<{ id: string }>(async (req, { params }) => json(await updateDraft(await requireActor(['supplier'], req.headers), zId.parse((await params).id), await req.json())))
