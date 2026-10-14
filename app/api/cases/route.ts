import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { body, handler, json, query } from '@/lib/server/http'
import { listCases, openCase, zNewCase } from '@/lib/server/services/cases'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  const a = await requireActor(undefined, req.headers)
  const q = query(req, z.object({ kind: z.enum(['return', 'support']).optional() }))
  return json(await listCases(a, q.kind))
})

export const POST = handler(async (req) => json(await openCase(await requireActor(['customer'], req.headers), await body(req, zNewCase)), 201))
