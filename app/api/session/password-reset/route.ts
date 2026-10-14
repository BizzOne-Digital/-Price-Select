import { z } from 'zod'
import { getAuth } from '@/lib/server/auth'
import { body, clientIp, handler, json, notConfigured, rateLimit } from '@/lib/server/http'
import { email } from '@/lib/server/integrations'
import { siteUrl } from '@/lib/server/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Request a reset link. Without an email provider we say so instead of pretending a message was
 * sent. With one, the response is identical whether or not the account exists.
 */
export const POST = handler(async (req) => {
  const d = await body(req, z.object({ email: z.email().max(200) }))
  await rateLimit(`pwreset:ip:${clientIp(req)}`, 5, 900)
  if (!email()) throw notConfigured('email', 'Password reset by email is not available yet because email delivery is not configured. Contact Price-Select support.')
  const auth = await getAuth()
  await auth.api.requestPasswordReset({ body: { email: d.email.trim().toLowerCase(), redirectTo: `${siteUrl()}/sign-in/reset` }, headers: req.headers }).catch(() => undefined)
  return json({ ok: true, message: 'If an account exists for that address, a reset link is on its way.' })
})
