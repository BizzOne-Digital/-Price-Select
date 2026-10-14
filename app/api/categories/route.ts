import { handler, json } from '@/lib/server/http'
import { listCategories } from '@/lib/server/services/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => json(await listCategories()))
