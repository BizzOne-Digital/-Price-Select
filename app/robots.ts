import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: ['/', '/supplier/apply'], disallow: ['/admin', '/supplier', '/account', '/checkout', '/cart'] },
    sitemap: `${SITE.url}/sitemap.xml`,
  }
}
