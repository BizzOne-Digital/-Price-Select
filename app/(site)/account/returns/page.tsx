import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ReturnsCenter } from '@/components/commerce/account-forms'
import { DEMO_CUSTOMER_ID, ordersFor, returnCases } from '@/lib/data/operations'

export const metadata: Metadata = {
  title: 'Returns & support',
  description: 'Request a cancellation, return, replacement or support for an order.',
  alternates: { canonical: '/account/returns' },
  robots: { index: false },
}

export default function Page() {
  return (
    <Suspense>
      <ReturnsCenter cases={returnCases.filter((c) => c.customerId === DEMO_CUSTOMER_ID)} orders={ordersFor(DEMO_CUSTOMER_ID)} />
    </Suspense>
  )
}
