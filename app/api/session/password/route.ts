import { z } from 'zod'
import { getAuth, requireActor } from '@/lib/server/auth'
import { badRequest, body, handler, json, rateLimit } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Change password; every other session is revoked. */
export const POST = handler(async (req) => {
  const a = await requireActor(undefined, req.headers)
  const d = await body(req, z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(10).max(128) }))
  await rateLimit(`pwchange:${a.id}`, 5, 900)
  const auth = await getAuth()
  const res = await auth.api.changePassword({ body: { ...d, revokeOtherSessions: true }, headers: req.headers, asResponse: true })
  if (!res.ok) throw badRequest('Current password is incorrect.')
  const out = json({ ok: true })
  for (const c of res.headers.getSetCookie()) out.headers.append('set-cookie', c)
  return out
})
