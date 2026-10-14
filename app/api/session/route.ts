import { getActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { Supplier } from '@/lib/server/models/network'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (req) => {
  const a = await getActor(req.headers)
  if (!a) return json({ user: null })
  let supplier = null
  if (a.supplierId) {
    const s = await Supplier.findById(a.supplierId, 'code name status').lean()
    if (s) supplier = { id: s.code, name: s.name, status: s.status }
  }
  return json({ user: { id: a.id, name: a.name, email: a.email, role: a.role }, supplier })
})
