import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { errorResponse, query } from '@/lib/server/http'
import { buildReport, REPORT_KEYS, toCsv } from '@/lib/server/services/reports'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** CSV export with optional ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive). Administrators only. */
export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    const a = await requireActor(['admin'], req.headers)
    const key = z.enum(REPORT_KEYS).parse((await params).key)
    const q = query(req, z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), format: z.enum(['csv', 'json']).optional() }))
    const to = q.to ? new Date(q.to.getTime() + 86_399_999) : undefined
    const rows = await buildReport(a, key, { from: q.from, to })
    if (q.format === 'json') return Response.json({ header: rows[0], count: rows.length - 1 }, { headers: { 'Cache-Control': 'no-store' } })
    const stamp = new Date().toISOString().slice(0, 10)
    return new Response('\ufeff' + toCsv(rows), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="price-select-${key}-${stamp}.csv"`, 'Cache-Control': 'private, no-store' },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
