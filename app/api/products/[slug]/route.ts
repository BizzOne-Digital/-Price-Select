import { getActor } from '@/lib/server/auth'
import { handler, json, notFound } from '@/lib/server/http'
import { getProductPreview, getPublicProduct } from '@/lib/server/services/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler<{ slug: string }>(async (req, { params }) => {
  const { slug } = await params
  const p = (await getPublicProduct(slug)) ?? (await getProductPreview(slug, await getActor(req.headers)))
  if (!p) throw notFound('Product')
  return json(p)
})
