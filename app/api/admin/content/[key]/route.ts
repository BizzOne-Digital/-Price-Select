import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { CONTENT_KEYS, getContentAdmin, saveDraft } from '@/lib/server/services/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KEY = z.enum(CONTENT_KEYS)
const key = async (p: Promise<{ key: string }>) => KEY.parse(decodeURIComponent((await p).key))

export const GET = handler<{ key: string }>(async (req, { params }) => {
  await requireActor(['admin'], req.headers)
  return json(await getContentAdmin(await key(params)))
})
/** Save a draft. Drafts never reach the storefront until published. */
export const PUT = handler<{ key: string }>(async (req, { params }) => json(await saveDraft(await requireActor(['admin'], req.headers), await key(params), await req.json())))
