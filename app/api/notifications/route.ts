import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { body, handler, json } from '@/lib/server/http'
import { listNotifications, markNotificationsRead } from '@/lib/server/services/notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => json(await listNotifications(await requireActor(undefined, req.headers))))

export const POST = handler(async (req) => {
  const a = await requireActor(undefined, req.headers)
  const d = await body(req, z.object({ ids: z.union([z.literal('all'), z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100)]) }))
  await markNotificationsRead(a, d.ids)
  return json({ ok: true })
})
