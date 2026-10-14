import { handler, json } from '@/lib/server/http'
import { capabilities } from '@/lib/server/services/capabilities'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => json(await capabilities()))
