import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'
import { sitemapData } from '@/lib/server/services/catalog'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/shop', '/categories', '/about', '/services', '/pricing', '/team', '/contact', '/supplier/apply', '/policies/privacy', '/policies/terms', '/policies/returns']
  const fixed = pages.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 }))
  // Only published listings from approved suppliers in active categories; a database outage
  // degrades to the static routes instead of failing the build or the request.
  try {
    const d = await sitemapData()
    return [
      ...fixed,
      ...d.categories.map((c) => ({ url: `${SITE.url}/categories/${c.slug}`, lastModified: c.updatedAt || undefined, changeFrequency: 'weekly' as const, priority: 0.8 })),
      ...d.products.map((p) => ({ url: `${SITE.url}/products/${p.slug}`, lastModified: p.updatedAt || undefined, changeFrequency: 'daily' as const, priority: 0.6 })),
    ]
  } catch {
    return fixed
  }
}
