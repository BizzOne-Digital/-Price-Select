'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { DataTable, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { money } from '@/lib/format'
import type { Order, OrderStatus } from '@/lib/types'
import { when } from './data'

export const orderColumns: Column<Order>[] = [
  { key: 'id', header: 'Order', sort: (o) => o.id, cell: (o) => <Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:text-gold-deep hover:underline">{o.id}</Link> },
  { key: 'placed', header: 'Placed', sort: (o) => o.placedAt, cell: (o) => <span className="text-slate">{when(o.placedAt)}</span> },
  { key: 'customer', header: 'Customer', cell: (o) => o.customerName ?? <span className="text-slate">{o.email ? `Guest · ${o.email}` : 'Guest'}</span> },
  {
    key: 'suppliers',
    header: 'Routed to',
    cell: (o) => <span className="text-slate">{o.fulfillments.length > 1 ? `${o.fulfillments.length} suppliers` : (o.fulfillments[0]?.supplierName ?? o.fulfillments[0]?.supplierId ?? '—')}</span>,
  },
  { key: 'payment', header: 'Payment', cell: (o) => <StatusBadge status={o.payment} /> },
  { key: 'status', header: 'Status', sort: (o) => o.status, cell: (o) => <StatusBadge status={o.status} /> },
  { key: 'total', header: 'Total', align: 'right', sort: (o) => o.total, cell: (o) => money(o.total) },
]

const TABS: (OrderStatus | 'all')[] = ['all', 'awaiting_payment', 'pending', 'confirmed', 'processing', 'partially_shipped', 'shipped', 'delivered', 'canceled', 'returned']

/** Server-loaded orders (most recent first). Tabs filter the loaded page; counts are store-wide. */
export function OrdersBoard({ orders, counts, total }: { orders: Order[]; counts: Record<string, number>; total: number }) {
  const [tab, setTab] = useState<OrderStatus | 'all'>('all')
  const rows = useMemo(() => (tab === 'all' ? orders : orders.filter((o) => o.status === tab)), [orders, tab])
  const all = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <>
      <Tabs value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t, label: t === 'all' ? 'All orders' : t.replace('_', ' '), count: t === 'all' ? all : (counts[t] ?? 0) }))} />
      <Panel pad={false} className="mt-6">
        <DataTable rows={rows} columns={orderColumns} rowKey={(o) => o.id} caption="Orders" empty={total === 0 ? 'No orders yet.' : 'No orders with this status in the latest page.'} />
      </Panel>
      {total > orders.length && <p className="mt-3 text-xs text-slate">Showing the latest {orders.length} of {total} orders. Use the order number search above to jump to an older order, or export the sales report.</p>}
    </>
  )
}
