import { requireActor } from '@/lib/server/auth'
import { handler, json, zSlug } from '@/lib/server/http'
import { upsertCategory } from '@/lib/server/services/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const PATCH = handler<{ slug: string }>(async (req, { params }) => json(await upsertCategory(await requireActor(['admin'], req.headers), zSlug.parse((await params).slug), await req.json())))
