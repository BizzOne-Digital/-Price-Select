import { z } from 'zod'
import { getAuth } from '@/lib/server/auth'
import { body, clientIp, conflict, handler, rateLimit } from '@/lib/server/http'
import { users } from '@/lib/server/services/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Customer registration. Accounts created here are always customers (role is server-assigned). */
export const POST = handler(async (req) => {
  const d = await body(req, z.object({ name: z.string().trim().min(2).max(120), email: z.email().max(200), password: z.string().min(10, 'Use at least 10 characters').max(128) }))
  await rateLimit(`signup:ip:${clientIp(req)}`, 5, 3600)
  const email = d.email.trim().toLowerCase()
  if (await (await users()).findOne({ email })) throw conflict('An account with this email already exists. Sign in instead.')
  const auth = await getAuth()
  const res = await auth.api.signUpEmail({ body: { name: d.name, email, password: d.password }, headers: req.headers, asResponse: true })
  if (!res.ok) throw conflict('We could not create the account. Check the details and try again.')
  const out = Response.json({ ok: true, role: 'customer' }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  for (const c of res.headers.getSetCookie()) out.headers.append('set-cookie', c)
  return out
})
