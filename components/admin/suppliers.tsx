'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ActionButton, DataTable, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { api, ApiError, errorText } from '@/lib/client/api'
import { privateAssetUrl } from '@/lib/client/upload'
import type { Integration, Supplier, SupplierApplication, SupplierStatus } from '@/lib/types'
import { when } from './data'
import { inputCls } from './ui'

type Tab = 'all' | 'applications' | 'approved' | 'suspended' | 'draft'
const inTab = (s: SupplierStatus, t: Tab) => t === 'all' || (t === 'applications' ? s === 'applied' || s === 'under_review' : t === 'approved' ? s === 'approved' : t === 'draft' ? s === 'draft' : s === 'suspended' || s === 'rejected')

const DOC_LABEL: Record<string, string> = { registration: 'Business registration', insurance: 'Insurance', certificate: 'Certificate', tax: 'Tax document', agreement: 'Agreement', other: 'Other' }

/** Message for a failed decision, including server details such as documents still to review. */
const failure = (e: unknown) => (e instanceof ApiError && Array.isArray(e.details) && e.details.length ? `${e.message} Outstanding: ${(e.details as unknown[]).map((d) => DOC_LABEL[String(d)] ?? String(d)).join(', ')}.` : errorText(e))

function useDecision(code: string) {
  const router = useRouter()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const run = async (body: Record<string, unknown>, success: string, tag = String(body.action)) => {
    setBusy(tag)
    setError('')
    try {
      await api(`/api/admin/suppliers/${encodeURIComponent(code)}/decision`, { body })
      toast({ title: success })
      router.refresh()
      return true
    } catch (e) {
      setError(failure(e))
      return false
    } finally {
      setBusy(null)
    }
  }
  return { busy, error, run }
}

/** Status transitions available to an administrator. Reject and suspend require a reason. */
export function SupplierStatusActions({ supplier }: { supplier: Pick<Supplier, 'id' | 'name' | 'status'> }) {
  const { busy, error, run } = useDecision(supplier.id)
  const [reason, setReason] = useState('')
  const s = supplier.status
  const needsReason = s === 'applied' || s === 'under_review' || s === 'approved'
  const withReason = async (action: 'reject' | 'suspend', verb: string) => {
    if (reason.trim().length < 3) return
    if (await run({ action, reason: reason.trim() }, `${supplier.name} ${verb}`)) setReason('')
  }
  return (
    <div className="flex max-w-md flex-col items-end gap-2">
      <span className="flex flex-wrap items-center justify-end gap-2">
        <StatusBadge status={s} />
        {s === 'applied' && (
          <ActionButton className="h-9" disabled={!!busy} onClick={() => run({ action: 'review' }, `${supplier.name} moved to review`)}>
            Start review
          </ActionButton>
        )}
        {(s === 'applied' || s === 'under_review') && (
          <>
            <ActionButton tone="primary" className="h-9" disabled={!!busy} onClick={() => run({ action: 'approve' }, `${supplier.name} approved`)}>
              {busy === 'approve' ? 'Approving' : 'Approve'}
            </ActionButton>
            <ActionButton tone="danger" className="h-9" disabled={!!busy || reason.trim().length < 3} onClick={() => withReason('reject', 'rejected')}>
              Reject
            </ActionButton>
          </>
        )}
        {s === 'approved' && (
          <ActionButton tone="danger" className="h-9" disabled={!!busy || reason.trim().length < 3} onClick={() => withReason('suspend', 'suspended')}>
            Suspend
          </ActionButton>
        )}
        {s === 'suspended' && (
          <ActionButton className="h-9" disabled={!!busy} onClick={() => run({ action: 'reinstate' }, `${supplier.name} reinstated`)}>
            Reinstate
          </ActionButton>
        )}
      </span>
      {needsReason && (
        <label className="w-full">
          <span className="sr-only">Reason for {s === 'approved' ? 'suspension' : 'rejection'}</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder={s === 'approved' ? 'Reason required to suspend' : 'Reason required to reject'} className={inputCls} />
        </label>
      )}
      {error && <p role="alert" className="text-right text-xs text-danger">{error}</p>}
    </div>
  )
}

export function SupplierDocuments({ supplier }: { supplier: SupplierApplication }) {
  const { busy, error, run } = useDecision(supplier.id)
  if (!supplier.documents.length) return <p className="text-sm text-slate">No documents uploaded yet.</p>
  return (
    <>
      <ul>
        {supplier.documents.map((d, i) => (
          <li key={d.id ?? i} className="border-b border-obsidian/[0.07] py-3 text-sm last:border-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                {d.label}
                {d.kind && <span className="block text-xs text-slate">{DOC_LABEL[d.kind] ?? d.kind}</span>}
              </span>
              <span className="flex items-center gap-3">
                <StatusBadge status={d.status} />
                {d.assetId ? (
                  <a href={privateAssetUrl(d.assetId)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center meta text-[0.58rem] text-gold-deep hover:text-obsidian">
                    View
                  </a>
                ) : (
                  <span className="text-xs text-slate">No file</span>
                )}
              </span>
            </div>
            {d.id && (
              <div className="mt-2 flex flex-wrap gap-2">
                <ActionButton className="h-8" disabled={!!busy || !d.assetId || d.status === 'on_file'} onClick={() => run({ action: 'document', documentId: d.id, decision: 'on_file' }, `${d.label} accepted`, `doc:${d.id}`)}>
                  Accept
                </ActionButton>
                <ActionButton className="h-8" tone="danger" disabled={!!busy || d.status === 'rejected'} onClick={() => run({ action: 'document', documentId: d.id, decision: 'rejected' }, `${d.label} rejected`, `doc:${d.id}`)}>
                  Reject
                </ActionButton>
                <ActionButton className="h-8" tone="ghost" disabled={!!busy || d.status === 'expired'} onClick={() => run({ action: 'document', documentId: d.id, decision: 'expired' }, `${d.label} marked expired`, `doc:${d.id}`)}>
                  Expired
                </ActionButton>
              </div>
            )}
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </>
  )
}

export function SupplierSettings({ supplier }: { supplier: SupplierApplication }) {
  const { busy, error, run } = useDecision(supplier.id)
  const [integration, setIntegration] = useState<Integration>(supplier.integration)
  const [excluded, setExcluded] = useState(!!supplier.membershipExcluded)
  const dirty = integration !== supplier.integration || excluded !== !!supplier.membershipExcluded
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void run({ action: 'settings', integration, membershipExcluded: excluded }, 'Supplier settings saved')
      }}
    >
      <label className="block">
        <span className="meta text-[0.6rem] text-slate">Integration</span>
        <select value={integration} onChange={(e) => setIntegration(e.target.value as Integration)} className={`${inputCls} mt-1`}>
          {(['API', 'EDI', 'CSV', 'Manual'] as const).map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={excluded} onChange={(e) => setExcluded(e.target.checked)} className="size-4 accent-[#5420C7]" /> Exclude from membership discounts
      </label>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      <ActionButton type="submit" disabled={!!busy || !dirty}>
        {busy ? 'Saving' : 'Save settings'}
      </ActionButton>
    </form>
  )
}

export function SupplierBoard({ rows, categoryName }: { rows: Supplier[]; categoryName: Record<string, string> }) {
  const [tab, setTab] = useState<Tab>('applications')
  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      sort: (s) => s.name,
      cell: (s) => (
        <Link href={`/admin/suppliers/${s.id}`} className="group">
          <span className="block font-medium group-hover:text-gold-deep">{s.name}</span>
          <span className="text-xs text-slate">{s.region || '—'}</span>
        </Link>
      ),
    },
    { key: 'cats', header: 'Categories', cell: (s) => <span className="text-slate">{s.categories.map((c) => categoryName[c] ?? c).join(', ') || '—'}</span> },
    { key: 'int', header: 'Integration', sort: (s) => s.integration, cell: (s) => s.integration },
    { key: 'feed', header: 'Feed', cell: (s) => <StatusBadge status={s.feed.status} /> },
    { key: 'joined', header: 'Joined', sort: (s) => s.joined, cell: (s) => <span className="text-slate">{when(s.joined)}</span> },
    { key: 'products', header: 'Products', align: 'right', sort: (s) => s.products, cell: (s) => s.products },
    { key: 'status', header: 'Status', sort: (s) => s.status, cell: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'act',
      header: '',
      align: 'right',
      cell: (s) => (
        <Link href={`/admin/suppliers/${s.id}`} className="inline-flex h-9 items-center border border-obsidian/20 px-4 text-[0.65rem] font-semibold uppercase tracking-[0.16em] hover:border-obsidian">
          {s.status === 'applied' || s.status === 'under_review' ? 'Review' : 'Open'}
        </Link>
      ),
    },
  ]
  const labels: Record<Tab, string> = { applications: 'Applications', approved: 'Approved', suspended: 'Suspended / rejected', draft: 'Incomplete', all: 'All' }
  return (
    <>
      <Tabs value={tab} onChange={setTab} options={(Object.keys(labels) as Tab[]).map((t) => ({ value: t, label: labels[t], count: rows.filter((r) => inTab(r.status, t)).length }))} />
      <Panel pad={false} className="mt-6">
        <DataTable rows={rows.filter((r) => inTab(r.status, tab))} columns={columns} rowKey={(s) => s.id} caption="Suppliers" empty="No suppliers in this list." />
      </Panel>
    </>
  )
}
