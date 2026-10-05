'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ActionButton, DataTable, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { getCategory } from '@/lib/data/categories'
import { suppliers as seed } from '@/lib/data/suppliers'
import type { Supplier, SupplierStatus } from '@/lib/types'

type Tab = 'all' | 'applications' | 'approved' | 'suspended'
const inTab = (s: SupplierStatus, t: Tab) => t === 'all' || (t === 'applications' ? s === 'applied' || s === 'under_review' : t === 'approved' ? s === 'approved' : s === 'suspended' || s === 'rejected')

/** Status transitions available to an administrator. */
export function SupplierStatusActions({ status, onChange, name }: { status: SupplierStatus; onChange: (s: SupplierStatus) => void; name: string }) {
  const toast = useToast()
  const go = (s: SupplierStatus, verb: string) => {
    onChange(s)
    toast({ title: `${name} ${verb} (demo)`, body: 'Status saved to this session only. The supplier would be emailed once email is connected.' })
  }
  if (status === 'applied' || status === 'under_review')
    return (
      <span className="flex flex-wrap gap-2">
        <ActionButton tone="primary" className="h-9" onClick={() => go('approved', 'approved')}>Approve</ActionButton>
        <ActionButton tone="danger" className="h-9" onClick={() => go('rejected', 'rejected')}>Reject</ActionButton>
      </span>
    )
  if (status === 'approved') return <ActionButton tone="danger" className="h-9" onClick={() => go('suspended', 'suspended')}>Suspend</ActionButton>
  return <ActionButton className="h-9" onClick={() => go('approved', 'reinstated')}>Reinstate</ActionButton>
}

export function SupplierHeaderActions({ supplier }: { supplier: Supplier }) {
  const [status, setStatus] = useState(supplier.status)
  return (
    <span className="flex flex-wrap items-center gap-3">
      <StatusBadge status={status} />
      <SupplierStatusActions status={status} onChange={setStatus} name={supplier.name} />
    </span>
  )
}

export function SupplierBoard() {
  const [rows, setRows] = useState(seed)
  const [tab, setTab] = useState<Tab>('all')
  const set = (id: string, status: SupplierStatus) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      sort: (s) => s.name,
      cell: (s) => (
        <Link href={`/admin/suppliers/${s.id}`} className="group">
          <span className="block font-medium group-hover:text-gold-deep">{s.name}</span>
          <span className="text-xs text-slate">{s.region}</span>
        </Link>
      ),
    },
    { key: 'cats', header: 'Categories', cell: (s) => <span className="text-slate">{s.categories.map((c) => getCategory(c)?.short).join(', ')}</span> },
    { key: 'int', header: 'Integration', sort: (s) => s.integration, cell: (s) => s.integration },
    { key: 'feed', header: 'Feed', cell: (s) => <StatusBadge status={s.feed.status} /> },
    { key: 'products', header: 'Products', align: 'right', sort: (s) => s.products, cell: (s) => s.products },
    { key: 'status', header: 'Status', sort: (s) => s.status, cell: (s) => <StatusBadge status={s.status} /> },
    { key: 'act', header: '', align: 'right', cell: (s) => <SupplierStatusActions status={s.status} name={s.name} onChange={(v) => set(s.id, v)} /> },
  ]
  const labels: Record<Tab, string> = { all: 'All', applications: 'Applications', approved: 'Approved', suspended: 'Suspended / rejected' }
  return (
    <>
      <Tabs value={tab} onChange={setTab} options={(Object.keys(labels) as Tab[]).map((t) => ({ value: t, label: labels[t], count: rows.filter((r) => inTab(r.status, t)).length }))} />
      <Panel pad={false} className="mt-6">
        <DataTable rows={rows.filter((r) => inTab(r.status, tab))} columns={columns} rowKey={(s) => s.id} caption="Suppliers" />
      </Panel>
    </>
  )
}
