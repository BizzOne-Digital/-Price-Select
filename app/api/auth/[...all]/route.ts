import { getAuth } from '@/lib/server/auth'
import { errorResponse } from '@/lib/server/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Better Auth endpoints (get-session, sign-out, reset-password, change-password, ...).
// Database-backed rate limits apply here.
async function handle(req: Request) {
  try {
    return await (await getAuth()).handler(req)
  } catch (e) {
    return errorResponse(e)
  }
}
export const GET = handle
export const POST = handle
