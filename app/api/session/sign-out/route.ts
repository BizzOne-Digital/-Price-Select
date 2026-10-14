import { getAuth } from '@/lib/server/auth'
import { handler } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Deletes the session record server-side and clears the cookie. */
export const POST = handler(async (req) => {
  const auth = await getAuth()
  const res = await auth.api.signOut({ headers: req.headers, asResponse: true })
  const out = Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  for (const c of res.headers.getSetCookie()) out.headers.append('set-cookie', c)
  return out
})
