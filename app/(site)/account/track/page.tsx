import type { Metadata } from 'next'
import { TrackForm } from '@/components/commerce/account-forms'
import { DEMO_CUSTOMER_ID, ordersFor } from '@/lib/data/operations'

export const metadata: Metadata = {
  title: 'Track an order',
  description: 'Track every shipment in a Price-Select order by order number.',
  alternates: { canonical: '/account/track' },
  robots: { index: false },
}

export default function Page() {
  return (
    <TrackForm orders={ordersFor(DEMO_CUSTOMER_ID)} />
  )
}
