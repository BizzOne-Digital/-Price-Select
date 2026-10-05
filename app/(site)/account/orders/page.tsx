import type { Metadata } from 'next'
import { DEMO_CUSTOMER_ID, ordersFor } from '@/lib/data/operations'
import { OrderRow, SectionTitle } from '@/components/commerce/account-blocks'
import { DemoNote, TextLink } from '@/components/site/ui'

export const metadata: Metadata = {
  title: 'Orders',
  description: 'Your Price-Select orders and every shipment within them.',
  alternates: { canonical: '/account/orders' },
  robots: { index: false },
}

export default function OrdersPage() {
  const orders = [...ordersFor(DEMO_CUSTOMER_ID)].sort((a, b) => b.placedAt.localeCompare(a.placedAt))
  return (
    <section aria-label="Orders">
      <SectionTitle title="Orders" action={<TextLink href="/account/track">Track by number</TextLink>} />
      <div className="mt-2 hidden grid-cols-[10rem_1fr_8rem_7rem_1rem] gap-x-6 py-3 md:grid" aria-hidden>
        {['Order', 'Items', 'Status', 'Total', ''].map((h, i) => (
          <span key={i} className={`meta text-slate/70 ${h === 'Total' ? 'text-right' : ''}`}>
            {h}
          </span>
        ))}
      </div>
      <ul className="border-t border-obsidian/10 md:border-t-0">
        {orders.map((o) => (
          <OrderRow key={o.id} order={o} />
        ))}
      </ul>
      <DemoNote className="mt-10">Demonstration orders</DemoNote>
    </section>
  )
}
