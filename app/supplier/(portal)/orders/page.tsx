import type { Metadata } from 'next'
import { SupplierOrders } from '@/components/supplier/orders'

export const metadata: Metadata = {
  title: 'Orders',
  description: 'Fulfillments routed to your business: acknowledge, update status and submit carrier tracking.',
  alternates: { canonical: '/supplier/orders' },
}

export default function SupplierOrdersPage() {
  return <SupplierOrders />
}
