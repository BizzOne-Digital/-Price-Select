import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { staffList } from '@/lib/server/services/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  await requireActor(['admin', 'support'], req.headers)
  return json(await staffList())
})
