import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { OrdersBoard } from '@/components/admin/orders'

export const metadata = adminMeta('Orders', 'All marketplace orders with supplier routing and status.', '/admin/orders')

export default function AdminOrders() {
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Orders" description="Every customer order, split by supplier fulfillment. Open an order to see routing, tracking and payment." />
      <DemoBanner>Demonstration orders. Customer names and carriers are placeholders.</DemoBanner>
      <OrdersBoard />
    </>
  )
}
