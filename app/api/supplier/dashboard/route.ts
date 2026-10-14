import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { supplierDashboard } from '@/lib/server/services/metrics'
import { requireActiveSupplier } from '@/lib/server/services/operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  const { supplierId } = await requireActiveSupplier(await requireActor(['supplier'], req.headers))
  return json(await supplierDashboard(supplierId))
})
