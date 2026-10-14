'use client'

import { useState } from 'react'
import { ActionButton, DataTable, Panel, StatusBadge, type Column } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { api, errorText } from '@/lib/client/api'
import { money } from '@/lib/format'
import type { Customer } from '@/lib/types'
import { when } from './data'

type Row = Customer & { requests: number }

export function CustomerBoard({ initial }: { initial: Row[] }) {
  const toast = useToast()
  const [rows, setRows] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)

  const set = async (c: Row, status: 'active' | 'suspended') => {
    let reason: string | undefined
    if (status === 'suspended') {
      const r = window.prompt(`Reason for suspending ${c.name} (kept in the audit log):`)
      if (r === null) return
      reason = r.trim() || undefined
    }
    setBusy(c.id)
    try {
      const r = await api<{ id: string; status: 'active' | 'suspended' }>(`/api/admin/customers/${c.id}/status`, { body: { status, reason } })
      setRows((rs) => rs.map((x) => (x.id === c.id ? { ...x, status: r.status } : x)))
      toast({ title: `${c.name} ${r.status === 'suspended' ? 'suspended' : 'reinstated'}`, body: r.status === 'suspended' ? 'All of their sessions were signed out.' : undefined })
    } catch (e) {
      toast({ title: 'Status not changed', body: errorText(e), tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const columns: Column<Row>[] = [
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
    { key: 'joined', header: 'Joined', sort: (c) => c.joined, cell: (c) => <span className="text-slate">{when(c.joined)}</span> },
    { key: 'member', header: 'Membership', cell: (c) => (c.membership?.status === 'active' ? <StatusBadge status="active" label={c.membership.tier === 'member_plus' ? 'Member Plus' : 'Member'} /> : <span className="text-slate">—</span>) },
    { key: 'status', header: 'Status', sort: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
    { key: 'orders', header: 'Paid orders', align: 'right', sort: (c) => c.orders, cell: (c) => c.orders },
    { key: 'ltv', header: 'Lifetime value', align: 'right', sort: (c) => c.lifetimeValue, cell: (c) => money(c.lifetimeValue) },
    { key: 'req', header: 'Cases', align: 'right', sort: (c) => c.requests, cell: (c) => c.requests || <span className="text-slate">—</span> },
    {
      key: 'act',
      header: '',
      align: 'right',
      cell: (c) =>
        c.status === 'suspended' ? (
          <ActionButton className="h-9" disabled={busy === c.id} onClick={() => set(c, 'active')}>
            Reinstate
          </ActionButton>
        ) : (
          <ActionButton tone="danger" className="h-9" disabled={busy === c.id} onClick={() => set(c, 'suspended')}>
            Suspend
          </ActionButton>
        ),
    },
  ]
  return (
    <Panel pad={false}>
      <DataTable rows={rows} columns={columns} rowKey={(c) => c.id} caption="Customer accounts" empty="No customer accounts yet." />
    </Panel>
  )
}
