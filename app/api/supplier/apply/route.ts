import { getAuth } from '@/lib/server/auth'
import { body, clientIp, handler, rateLimit } from '@/lib/server/http'
import { startApplication, zApplyStart } from '@/lib/server/services/suppliers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Start a supplier application: creates the applicant login and a draft supplier record, then signs in. */
export const POST = handler(async (req) => {
  const d = await body(req, zApplyStart)
  await rateLimit(`apply:${clientIp(req)}`, 5, 3600)
  const r = await startApplication(d)
  const auth = await getAuth()
  const res = await auth.api.signInEmail({ body: { email: d.email.trim().toLowerCase(), password: d.password }, headers: req.headers, asResponse: true })
  const out = Response.json({ ok: true, supplier: r.code }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  for (const c of res.headers.getSetCookie()) out.headers.append('set-cookie', c)
  return out
})
