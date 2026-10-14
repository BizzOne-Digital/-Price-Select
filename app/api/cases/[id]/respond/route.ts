import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { supplierRespond } from '@/lib/server/services/cases'
import { requireActiveSupplier } from '@/lib/server/services/operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async (req, { params }) => {
  const a = await requireActor(['supplier'], req.headers)
  await requireActiveSupplier(a)
  return json(await supplierRespond(a, (await params).id, await req.json()))
})
