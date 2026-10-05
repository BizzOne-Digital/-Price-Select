import type { Metadata } from 'next'
import { SupplierOverview } from '@/components/supplier/overview'

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Supplier operations overview: routed orders, pending fulfillment, inventory feed status and items needing action.',
  alternates: { canonical: '/supplier' },
}

export default function SupplierHome() {
  return <SupplierOverview />
}
