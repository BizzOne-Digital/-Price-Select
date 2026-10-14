import { timingSafeEqual } from 'node:crypto'
import { jobSecret } from '@/lib/server/env'
import { handler, HttpError, json } from '@/lib/server/http'
import { runJobs } from '@/lib/server/services/jobs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Scheduled maintenance: release expired stock holds, deliver queued email, clean abandoned
 * uploads, expire memberships. Call with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this).
 */
async function run(req: Request) {
  const secret = jobSecret()
  if (!secret) throw new HttpError(503, 'not_configured', 'CRON_SECRET is not set.')
  const got = Buffer.from(req.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw new HttpError(401, 'unauthenticated', 'Invalid job credentials.')
  return json(await runJobs())
}
export const GET = handler(run)
export const POST = handler(run)
