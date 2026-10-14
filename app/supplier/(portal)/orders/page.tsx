import type { Metadata } from 'next'
import { SupplierOrders } from '@/components/supplier/orders'
import { ackDeadlines, loadTargets, supplierContext } from '@/components/supplier/server'
import { myFulfillments } from '@/lib/server/services/operations'

export const metadata: Metadata = {
  title: 'Orders',
  description: 'Fulfillments routed to your business: acknowledge, update status and submit carrier tracking.',
  alternates: { canonical: '/supplier/orders' },
}

export default async function SupplierOrdersPage() {
  const ctx = await supplierContext()
  if (!ctx) return null
  const [items, { settings, targets }] = await Promise.all([myFulfillments(ctx.actor), loadTargets()])
  return <SupplierOrders initial={items} ack={ackDeadlines(settings, items)} targets={targets} asOf={new Date().toISOString()} />
}
