import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { upsertCategory } from '@/lib/server/services/admin'
import { listCategoriesAdmin } from '@/lib/server/services/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  await requireActor(['admin', 'support'], req.headers)
  return json(await listCategoriesAdmin())
})
export const POST = handler(async (req) => json(await upsertCategory(await requireActor(['admin'], req.headers), null, await req.json()), 201))
