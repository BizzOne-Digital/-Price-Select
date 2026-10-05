'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { DataTable, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { orders } from '@/lib/data/operations'
import { date, money } from '@/lib/format'
import type { Order, OrderStatus } from '@/lib/types'
import { customerName, supplierName } from './data'

export const orderColumns: Column<Order>[] = [
  { key: 'id', header: 'Order', sort: (o) => o.id, cell: (o) => <Link href={`/admin/orders/${o.id}`} className="font-medium underline-offset-4 hover:text-gold-deep hover:underline">{o.id}</Link> },
  { key: 'placed', header: 'Placed', sort: (o) => o.placedAt, cell: (o) => <span className="text-slate">{date(o.placedAt)}</span> },
  { key: 'customer', header: 'Customer', cell: (o) => customerName(o.customerId) },
  {
    key: 'suppliers',
    header: 'Routed to',
    cell: (o) => (
      <span className="text-slate">
        {o.fulfillments.length > 1 ? `${o.fulfillments.length} suppliers` : supplierName(o.fulfillments[0].supplierId)}
      </span>
    ),
  },
  { key: 'payment', header: 'Payment', cell: (o) => <StatusBadge status={o.payment} /> },
  { key: 'status', header: 'Status', sort: (o) => o.status, cell: (o) => <StatusBadge status={o.status} /> },
  { key: 'total', header: 'Total', align: 'right', sort: (o) => o.total, cell: (o) => money(o.total) },
]

const TABS: (OrderStatus | 'all')[] = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled', 'returned']

export function OrdersBoard() {
  const [tab, setTab] = useState<OrderStatus | 'all'>('all')
  const rows = useMemo(() => (tab === 'all' ? orders : orders.filter((o) => o.status === tab)), [tab])
  return (
    <>
      <Tabs value={tab} onChange={setTab} options={TABS.map((t) => ({ value: t, label: t === 'all' ? 'All orders' : t, count: t === 'all' ? orders.length : orders.filter((o) => o.status === t).length }))} />
      <Panel pad={false} className="mt-6">
        <DataTable rows={rows} columns={orderColumns} rowKey={(o) => o.id} caption="Orders" empty="No orders with this status." />
      </Panel>
    </>
  )
}
