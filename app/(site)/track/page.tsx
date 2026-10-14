import type { Metadata } from 'next'
import { TrackForm } from '@/components/commerce/account-forms'
import { PageBand } from '@/components/site/ui'
import { currentActor } from '@/lib/server/page-auth'

export const metadata: Metadata = {
  title: 'Track an order',
  description: 'Track a Price-Select order with your order number and order access code.',
  alternates: { canonical: '/track' },
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

/** Guest tracking (order number + access code). Signed-in customers can look up their own orders by number. */
export default async function Page() {
  const actor = await currentActor()
  return (
    <>
      <PageBand eyebrow="Orders" title="Track an order." italic={['order.']} crumbs={[{ href: '/track', label: 'Track' }]} />
      <section className="bg-ivory pb-28 pt-14 md:pb-36 md:pt-20">
        <div className="container-luxe">
          <TrackForm signedIn={actor?.role === 'customer'} />
        </div>
      </section>
    </>
  )
}
