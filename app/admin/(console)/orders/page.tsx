import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { OrdersBoard } from '@/components/admin/orders'
import { requirePage } from '@/lib/server/page-auth'
import { listOrders } from '@/lib/server/services/operations'

export const metadata = adminMeta('Orders', 'All marketplace orders with supplier routing and status.', '/admin/orders')

export default async function AdminOrders() {
  const actor = await requirePage(['admin', 'support'], '/admin/login')
  const { items, counts, total } = await listOrders(actor, { pageSize: 200 })
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Orders" description="Every customer order, split by supplier fulfillment. Open an order to see routing, tracking and payment." />
      <OrdersBoard orders={items} counts={counts} total={total} />
    </>
  )
}
