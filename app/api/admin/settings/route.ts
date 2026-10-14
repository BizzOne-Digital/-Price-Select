import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { capabilities } from '@/lib/server/services/capabilities'
import { getSettings } from '@/lib/server/services/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  await requireActor(['admin'], req.headers)
  return json({ settings: await getSettings(), capabilities: await capabilities() })
})
