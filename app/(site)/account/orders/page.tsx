import type { Metadata } from 'next'
import { OrderRow, SectionTitle } from '@/components/commerce/account-blocks'
import { TextLink } from '@/components/site/ui'
import { requirePage } from '@/lib/server/page-auth'
import { myOrders } from '@/lib/server/services/commerce'

export const metadata: Metadata = {
  title: 'Orders',
  description: 'Your Price-Select orders and every shipment within them.',
  alternates: { canonical: '/account/orders' },
  robots: { index: false },
}

export default async function OrdersPage() {
  const orders = await myOrders(await requirePage(['customer'], '/sign-in/customers'))
  return (
    <section aria-label="Orders">
      <SectionTitle title="Orders" action={<TextLink href="/account/track">Track by number</TextLink>} />
      {orders.length ? (
        <>
          <div className="mt-2 hidden grid-cols-[10rem_1fr_8rem_7rem_1rem] gap-x-6 py-3 md:grid" aria-hidden>
            {['Order', 'Items', 'Status', 'Total', ''].map((h, i) => (
              <span key={i} className={h === 'Total' ? 'meta text-right text-slate/70' : 'meta text-slate/70'}>
                {h}
              </span>
            ))}
          </div>
          <ul className="border-t border-obsidian/10 md:border-t-0">
            {orders.map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
        </>
      ) : (
        <p className="py-10 text-sm text-slate">You have not placed any orders yet.</p>
      )}
    </section>
  )
}
