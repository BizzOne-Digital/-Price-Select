import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { body, handler, json } from '@/lib/server/http'
import { applyInventory, rowsFromCsv } from '@/lib/server/services/products'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Manual edits ({rows}) or CSV text ({csv}). `apply: false` validates only (preview);
 * `apply: true` re-validates every row server-side and applies the valid ones.
 */
export const POST = handler(async (req) => {
  const a = await requireActor(['supplier'], req.headers)
  const d = await body(
    req,
    z.object({
      apply: z.boolean(),
      csv: z.string().max(1_000_000).optional(),
      rows: z.array(z.object({ sku: z.string().max(60), qty: z.string().max(20) })).max(5000).optional(),
    }),
  )
  const rows = d.csv != null ? rowsFromCsv(d.csv) : (d.rows ?? []).map((r, i) => ({ line: i + 1, ...r }))
  const out = await applyInventory(a, rows, d.apply)
  return json({ rows: out, valid: out.filter((r) => r.ok).length, invalid: out.filter((r) => !r.ok).length, applied: d.apply })
})
