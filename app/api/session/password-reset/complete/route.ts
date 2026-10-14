import { z } from 'zod'
import { getAuth } from '@/lib/server/auth'
import { badRequest, body, clientIp, handler, json, rateLimit } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler(async (req) => {
  const d = await body(req, z.object({ token: z.string().min(10).max(200), newPassword: z.string().min(10).max(128) }))
  await rateLimit(`pwreset-complete:${clientIp(req)}`, 10, 900)
  const auth = await getAuth()
  const res = await auth.api.resetPassword({ body: d, headers: req.headers, asResponse: true })
  if (!res.ok) throw badRequest('This reset link is invalid or has expired.')
  return json({ ok: true })
})
