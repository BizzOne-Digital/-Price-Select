import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ShopCatalog } from '@/components/commerce/shop-catalog'
import { DemoNote, PageBand } from '@/components/site/ui'
import { Reveal } from '@/components/motion/primitives'

export const metadata: Metadata = {
  title: 'Shop the selection',
  description: 'Browse the Price-Select catalog across technology, construction, vehicles, mobility, energy, family, home and everyday essentials from approved suppliers.',
  alternates: { canonical: '/shop' },
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Awaiting makes the page render per request, so filtered URLs are server-rendered too.
  await searchParams
  return (
    <>
      <PageBand eyebrow="The catalog" title="Shop the selection." italic={['selection.']} crumbs={[{ href: '/shop', label: 'Shop' }]}>
        <Reveal delay={0.4} className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p className="max-w-lg text-base leading-relaxed text-ivory/70">
            Every product comes from an approved supplier and is reviewed before it is published. Prices exclude applicable taxes and shipping.
          </p>
          <DemoNote light>Catalog shown is demonstration data</DemoNote>
        </Reveal>
      </PageBand>
      <section className="bg-ivory pb-28 pt-12 md:pb-40 md:pt-16">
        <div className="container-luxe">
          <Suspense>
            <ShopCatalog />
          </Suspense>
        </div>
      </section>
    </>
  )
}
