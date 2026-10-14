import { z } from 'zod'
import { handler, json, query } from '@/lib/server/http'
import { searchProducts } from '@/lib/server/services/catalog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Q = z.object({
  q: z.string().max(80).optional(),
  category: z.string().max(80).optional(),
  brand: z.string().max(400).optional(),
  availability: z.enum(['in_stock', 'any']).optional(),
  seasonal: z.enum(['1', 'true']).optional(),
  min: z.coerce.number().min(0).optional(),
  max: z.coerce.number().min(0).optional(),
  sort: z.enum(['featured', 'price-asc', 'price-desc', 'newest', 'name']).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
})

export const GET = handler(async (req) => {
  const p = query(req, Q)
  return json(await searchProducts({ ...p, seasonal: !!p.seasonal, brands: p.brand ? p.brand.split(',').filter(Boolean) : undefined }))
})
