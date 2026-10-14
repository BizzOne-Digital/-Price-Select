import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { CONTENT_KEYS, publishContent } from '@/lib/server/services/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler<{ key: string }>(async (req, { params }) => {
  const a = await requireActor(['admin'], req.headers)
  return json(await publishContent(a, z.enum(CONTENT_KEYS).parse(decodeURIComponent((await params).key))))
})
