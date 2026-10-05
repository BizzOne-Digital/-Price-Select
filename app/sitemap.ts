import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'
import { categories } from '@/lib/data/categories'
import { publishedProducts } from '@/lib/data/products'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/shop', '/categories', '/about', '/services', '/pricing', '/team', '/contact', '/supplier/apply', '/policies/privacy', '/policies/terms', '/policies/returns']
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}`, changeFrequency: 'weekly' as const, priority: p === '' ? 1 : 0.7 })),
    ...categories.map((c) => ({ url: `${SITE.url}/categories/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...publishedProducts.map((p) => ({ url: `${SITE.url}/products/${p.slug}`, changeFrequency: 'daily' as const, priority: 0.6 })),
  ]
}
