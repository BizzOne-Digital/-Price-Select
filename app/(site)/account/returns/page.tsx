import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ReturnsCenter } from '@/components/commerce/account-forms'
import { requirePage } from '@/lib/server/page-auth'
import { listCases } from '@/lib/server/services/cases'
import { myOrders } from '@/lib/server/services/commerce'

export const metadata: Metadata = {
  title: 'Returns & support',
  description: 'Request a cancellation, return, replacement or support for an order.',
  alternates: { canonical: '/account/returns' },
  robots: { index: false },
}

export default async function Page() {
  const actor = await requirePage(['customer'], '/sign-in/customers')
  const [cases, orders] = await Promise.all([listCases(actor), myOrders(actor)])
  return (
    <Suspense>
      <ReturnsCenter cases={cases} orders={orders} />
    </Suspense>
  )
}
