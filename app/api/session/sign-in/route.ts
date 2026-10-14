import { z } from 'zod'
import { getAuth } from '@/lib/server/auth'
import { body, clientIp, handler, HttpError, rateLimit } from '@/lib/server/http'
import { users } from '@/lib/server/services/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PORTAL_ROLES = { customer: ['customer'], staff: ['admin', 'support'], supplier: ['supplier'] } as const

/**
 * Portal-aware sign-in. The role comes from the stored account, never from the form. An account
 * signing in at the wrong portal gets the same generic error as a wrong password.
 */
export const POST = handler(async (req) => {
  const d = await body(req, z.object({ email: z.email().max(200), password: z.string().min(1).max(128), portal: z.enum(['customer', 'staff', 'supplier']), remember: z.boolean().optional() }))
  await rateLimit(`signin:ip:${clientIp(req)}`, 20, 300)
  await rateLimit(`signin:email:${d.email.toLowerCase()}`, 8, 900)
  const generic = new HttpError(401, 'invalid_credentials', 'Email or password is incorrect.')
  const u = await (await users()).findOne({ email: d.email.trim().toLowerCase() }, { projection: { role: 1, status: 1 } })
  const role = u?.role ?? 'customer'
  if (!u || !(PORTAL_ROLES[d.portal] as readonly string[]).includes(role)) throw generic
  if (u.status === 'suspended') throw new HttpError(403, 'suspended', 'This account is suspended. Please contact Price-Select.')
  const auth = await getAuth()
  const res = await auth.api.signInEmail({ body: { email: d.email.trim().toLowerCase(), password: d.password, rememberMe: d.remember ?? true }, headers: req.headers, asResponse: true })
  if (!res.ok) throw generic
  const out = Response.json({ ok: true, role }, { headers: { 'Cache-Control': 'no-store' } })
  for (const c of res.headers.getSetCookie()) out.headers.append('set-cookie', c)
  return out
})
