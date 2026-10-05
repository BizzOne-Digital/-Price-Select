'use client'

import { useState } from 'react'
import { ActionButton, DataTable, Panel, StatusBadge, type Column } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { customers as seed, ordersFor, returnCases, tickets } from '@/lib/data/operations'
import { date, money } from '@/lib/format'
import type { Customer } from '@/lib/types'

const requests = (id: string) => tickets.filter((t) => t.customerId === id).length + returnCases.filter((r) => r.customerId === id).length

export function CustomerBoard() {
  const toast = useToast()
  const [rows, setRows] = useState(seed)
  const set = (c: Customer, status: Customer['status']) => {
    setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, status } : r)))
    toast({ title: `${c.name} ${status === 'suspended' ? 'suspended' : 'reinstated'} (demo)`, body: 'Account status saved to this session only.' })
  }
  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      sort: (c) => c.name,
      cell: (c) => (
        <span>
          <span className="block font-medium">{c.name}</span>
          <span className="text-xs text-slate">{c.email}</span>
        </span>
      ),
    },
    { key: 'joined', header: 'Joined', sort: (c) => c.joined, cell: (c) => <span className="text-slate">{date(c.joined)}</span> },
    { key: 'status', header: 'Status', sort: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'orders', header: 'Orders', align: 'right', sort: (c) => c.orders, cell: (c) => <span title={`${ordersFor(c.id).length} in demo data`}>{c.orders}</span> },
    { key: 'ltv', header: 'Lifetime value', align: 'right', sort: (c) => c.lifetimeValue, cell: (c) => money(c.lifetimeValue) },
    { key: 'req', header: 'Support requests', align: 'right', sort: (c) => requests(c.id), cell: (c) => requests(c.id) || <span className="text-slate">—</span> },
    {
      key: 'act',
      header: '',
      align: 'right',
      cell: (c) =>
        c.status === 'suspended' ? (
          <ActionButton className="h-9" onClick={() => set(c, 'active')}>Reinstate</ActionButton>
        ) : c.status === 'guest' ? (
          <span className="meta text-[0.58rem] text-slate">Guest</span>
        ) : (
          <ActionButton tone="danger" className="h-9" onClick={() => set(c, 'suspended')}>Suspend</ActionButton>
        ),
    },
  ]
  return (
    <Panel pad={false}>
      <DataTable rows={rows} columns={columns} rowKey={(c) => c.id} caption="Customer accounts" />
    </Panel>
  )
}
