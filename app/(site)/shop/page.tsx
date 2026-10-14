import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ShopCatalog } from '@/components/commerce/shop-catalog'
import { PageBand } from '@/components/site/ui'
import { listCategories, searchProducts, type SearchParams } from '@/lib/server/services/catalog'
import { Reveal } from '@/components/motion/primitives'

export const metadata: Metadata = {
  title: 'Shop the selection',
  description: 'Browse the Price-Select catalog across technology, construction, vehicles, mobility, energy, family, home and everyday essentials from approved suppliers.',
  alternates: { canonical: '/shop' },
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Filters live in the URL; results are server-rendered per request from the catalog service.
  const sp = await searchParams
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? ''
  const num = (k: string) => (one(k) && Number.isFinite(Number(one(k))) ? Number(one(k)) : undefined)
  const sort = one('sort')
  const band = /^\d*-\d*$/.test(one('price')) ? one('price').split('-') : []
  const params: SearchParams = {
    q: one('q').slice(0, 80) || undefined,
    category: one('category') || undefined,
    brands: one('brand') ? one('brand').split(',').filter(Boolean).slice(0, 20) : undefined,
    availability: one('availability') === 'in_stock' ? 'in_stock' : undefined,
    seasonal: one('seasonal') === '1' || undefined,
    // Price band `250-1000` (upper bound exclusive in the UI; the service treats it inclusively).
    min: band[0] ? Number(band[0]) || undefined : undefined,
    max: band[1] ? Number(band[1]) || undefined : undefined,
    sort: (['price-asc', 'price-desc', 'newest', 'name'] as const).find((s) => s === sort) ?? 'featured',
    page: num('page'),
    pageSize: 24,
  }
  const [result, categories] = await Promise.all([searchProducts(params), listCategories()])
  return (
    <>
      <PageBand eyebrow="The catalog" title="Shop the selection." italic={['selection.']} crumbs={[{ href: '/shop', label: 'Shop' }]}>
        <Reveal delay={0.4} className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-lg text-base leading-relaxed text-obsidian/70">
            Every product comes from an approved supplier and is reviewed before it is published. Prices exclude applicable taxes and shipping.
          </p>
        </Reveal>
      </PageBand>
      <section className="bg-ivory pb-28 pt-12 md:pb-40 md:pt-16">
        <div className="container-luxe">
          <Suspense>
            <ShopCatalog result={result} categories={categories} />
          </Suspense>
        </div>
      </section>
    </>
  )
}
