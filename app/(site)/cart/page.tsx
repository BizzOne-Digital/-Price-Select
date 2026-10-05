import type { Metadata } from 'next'
import { CartPage } from '@/components/commerce/cart-page'
import { PageBand } from '@/components/site/ui'

export const metadata: Metadata = {
  title: 'Your cart',
  description: 'Review your selection, shipments and estimated totals before checkout.',
  alternates: { canonical: '/cart' },
  robots: { index: false },
}

export default function Cart() {
  return (
    <>
      <PageBand eyebrow="Your selection" title="Cart." crumbs={[{ href: '/cart', label: 'Cart' }]} />
      <section className="bg-ivory pb-28 pt-14 md:pb-40 md:pt-20">
        <div className="container-luxe">
          <CartPage />
        </div>
      </section>
    </>
  )
}
