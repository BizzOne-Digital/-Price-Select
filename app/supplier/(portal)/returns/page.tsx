import type { Metadata } from 'next'
import { SupplierReturns } from '@/components/supplier/returns'

export const metadata: Metadata = {
  title: 'Returns',
  description: 'Respond to returns, damage reports, cancellations and replacement requests on items routed to you.',
  alternates: { canonical: '/supplier/returns' },
}

export default function SupplierReturnsPage() {
  return <SupplierReturns />
}
