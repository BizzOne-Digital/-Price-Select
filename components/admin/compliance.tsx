'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Scale } from 'lucide-react'
import { ActionButton, DataTable, MetricCard, MetricGrid, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { api, errorText } from '@/lib/client/api'
import { privateAssetUrl } from '@/lib/client/upload'
import type { Category, ProductAdmin, Supplier } from '@/lib/types'
import { when } from './data'
import { inputCls, SubHead } from './ui'

type Doc = { id: string; owner: string; ownerHref: string; source: 'Product' | 'Supplier'; party: string; label: string; status: string; kind: string; assetId?: string; reviewer?: string; reviewedAt?: string }

const kindOf = (label: string) => (/authentic/i.test(label) ? 'Authenticity' : /manual/i.test(label) ? 'Manual' : /warrant/i.test(label) ? 'Warranty' : /certif|safety/i.test(label) ? 'Safety certificate' : /insur/i.test(label) ? 'Insurance' : /regist/i.test(label) ? 'Registration' : 'Compliance')
const KINDS = ['All', 'Safety certificate', 'Manual', 'Warranty', 'Authenticity', 'Registration', 'Insurance', 'Compliance'] as const

const STEPS = [
  ['Flag', 'Listing flagged by review, supplier notice or customer report.'],
  ['Suspend', 'Hidden from the storefront while it is checked.'],
  ['Verify', 'Request documents and a statement from the supplier.'],
  ['Withdraw', 'Listing withdrawn if the issue is confirmed.'],
  ['Notify', 'Affected customers contacted with supplier guidance.'],
  ['Record', 'Every step is written to the audit log.'],
]

export function ComplianceBoard({ products: initial, suppliers, categories }: { products: ProductAdmin[]; suppliers: Supplier[]; categories: Category[] }) {
  const [products, setProducts] = useState(initial)
  const [kind, setKind] = useState<(typeof KINDS)[number]>('All')
  const docs: Doc[] = [
    ...products.flatMap((p) =>
      p.compliance.map((c) => ({ id: `p:${p.id}:${c.label}`, owner: p.name, ownerHref: '/admin/products', source: 'Product' as const, party: p.supplierName ?? p.supplierId, label: c.label, status: c.status, kind: kindOf(c.label), assetId: c.assetId, reviewer: c.reviewedByName, reviewedAt: c.reviewedAt })),
    ),
    ...suppliers.flatMap((s) => s.documents.map((d, i) => ({ id: `s:${s.id}:${d.id ?? i}`, owner: s.name, ownerHref: `/admin/suppliers/${s.id}`, source: 'Supplier' as const, party: s.name, label: d.label, status: d.status, kind: kindOf(`${d.kind ?? ''} ${d.label}`), assetId: d.assetId }))),
  ]
  const flagged = products.filter((p) => p.status === 'flagged' || p.compliance.some((c) => c.status === 'rejected' || (c.required !== false && c.status === 'required' && p.status === 'published')))
  const columns: Column<Doc>[] = [
    { key: 'doc', header: 'Document', sort: (d) => d.label, cell: (d) => <span className="font-medium">{d.label}</span> },
    { key: 'kind', header: 'Type', cell: (d) => <span className="text-slate">{d.kind}</span> },
    {
      key: 'owner',
      header: 'For',
      sort: (d) => d.owner,
      cell: (d) => (
        <Link href={d.ownerHref} className="hover:text-gold-deep">
          {d.owner}
          <span className="block text-xs text-slate">{d.source === 'Product' ? d.party : 'Supplier record'}</span>
        </Link>
      ),
    },
    { key: 'rev', header: 'Reviewed', cell: (d) => (d.reviewer ? <span className="text-xs">{d.reviewer}<span className="block text-slate">{when(d.reviewedAt)}</span></span> : <span className="text-xs text-slate">—</span>) },
    { key: 'status', header: 'Status', sort: (d) => d.status, cell: (d) => <StatusBadge status={d.status} /> },
    {
      key: 'file',
      header: '',
      align: 'right',
      cell: (d) =>
        d.assetId ? (
          <a href={privateAssetUrl(d.assetId)} target="_blank" rel="noopener noreferrer" className="meta text-[0.58rem] text-gold-deep hover:text-obsidian">
            View
          </a>
        ) : (
          <span className="text-xs text-slate">No file</span>
        ),
    },
  ]
  const rows = kind === 'All' ? docs : docs.filter((d) => d.kind === kind)

  return (
    <div className="space-y-12">
      <div className="flex items-start gap-4 border border-obsidian/10 bg-ivory/70 p-5">
        <Scale className="mt-0.5 size-5 shrink-0 text-gold-deep" strokeWidth={1.3} aria-hidden />
        <p className="text-sm leading-relaxed text-slate">
          <span className="font-medium text-obsidian">Scope of this tool.</span> Compliance screens support documentation and review workflows. They are not legal or regulatory advice, and passing review here does not certify a product. Requirements must be confirmed per launch market with qualified advisers.
        </p>
      </div>

      <MetricGrid cols={4}>
        <MetricCard label="Documents on file" value={docs.filter((d) => d.status === 'on_file').length} hint={`of ${docs.length}`} />
        <MetricCard label="Pending documents" value={docs.filter((d) => d.status === 'pending').length} tone={docs.some((d) => d.status === 'pending') ? 'warning' : 'default'} />
        <MetricCard label="Rejected or missing" value={docs.filter((d) => ['rejected', 'required', 'expired'].includes(d.status)).length} tone={docs.some((d) => ['rejected', 'required', 'expired'].includes(d.status)) ? 'danger' : 'default'} />
        <MetricCard label="Flagged products" value={flagged.length} tone={flagged.length ? 'danger' : 'default'} />
      </MetricGrid>

      <div>
        <SubHead note="Products and suppliers">Document register</SubHead>
        <div className="mb-6">
          <Tabs value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: k, count: k === 'All' ? docs.length : docs.filter((d) => d.kind === k).length }))} />
        </div>
        <Panel pad={false}>
          <DataTable rows={rows} columns={columns} rowKey={(d) => d.id} caption="Compliance documents" empty="No documents of this type on record yet." />
        </Panel>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title="Flagged products">
          {flagged.length ? (
            <ul>
              {flagged.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-obsidian/[0.07] py-3 last:border-0">
                  <span className="text-sm">
                    {p.name} <StatusBadge status={p.status} />
                    <span className="block text-xs text-slate">{p.statusReason || p.compliance.filter((c) => c.status !== 'on_file').map((c) => c.label).join(', ') || 'Under review'}</span>
                  </span>
                  <Link href="/admin/products" className="inline-flex min-h-11 items-center meta text-[0.6rem] text-gold-deep hover:text-obsidian">
                    Review
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate">No flagged products.</p>
          )}
        </Panel>
        <Panel title="Category review requirements">
          <ul>
            {categories.map((c) => (
              <li key={c.slug} className="border-b border-obsidian/[0.07] py-3 last:border-0">
                <p className="flex items-center justify-between gap-3 text-sm">
                  {c.name} <StatusBadge status={c.reviewLevel} tone={c.reviewLevel === 'enhanced' ? 'gold' : 'muted'} />
                </p>
                {c.reviewNote && <p className="mt-1 text-xs text-slate">{c.reviewNote}</p>}
                {!!c.requiredDocuments?.length && <p className="mt-1 text-xs text-slate">Requires: {c.requiredDocuments.join(', ')}</p>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div>
        <SubHead>Removal &amp; customer notification workflow</SubHead>
        <ol className="grid gap-px border border-obsidian/10 bg-obsidian/10 sm:grid-cols-2 lg:grid-cols-6">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="bg-ivory/70 p-5">
              <p className="font-display text-3xl font-light text-gold-deep">{String(i + 1).padStart(2, '0')}</p>
              <p className="mt-3 text-sm font-semibold">{t}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate">{d}</p>
            </li>
          ))}
        </ol>
        {flagged.length > 0 && (
          <ul className="mt-6 space-y-4">
            {flagged.map((p) => (
              <RemovalRow key={p.id} p={p} onChange={(n) => setProducts((ps) => ps.map((x) => (x.id === n.id ? n : x)))} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function RemovalRow({ p, onChange }: { p: ProductAdmin; onChange: (p: ProductAdmin) => void }) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const decide = async (action: 'suspend' | 'withdraw') => {
    setBusy(true)
    setError('')
    try {
      onChange(await api<ProductAdmin>(`/api/admin/products/${p.id}/review`, { body: { action, reason: reason.trim() } }))
      toast({ title: `${p.name} ${action === 'suspend' ? 'suspended' : 'withdrawn'}` })
      setReason('')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const notify = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await api<{ orders: number; emailsQueued: number; emailsSent: number }>(`/api/admin/products/${p.id}/notify`, { body: { message: message.trim() } })
      toast({ title: `Notice recorded for ${r.orders} order(s)`, body: `${r.emailsSent} email(s) sent, ${r.emailsQueued - r.emailsSent} queued.` })
      setMessage('')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="border border-danger/20 p-5">
      <p className="text-sm font-medium">
        {p.name} <StatusBadge status={p.status} />
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="block">
            <span className="meta text-[0.6rem] text-slate">Reason (sent to the supplier)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} className={`${inputCls} mt-1`} />
          </label>
          <div className="mt-2 flex gap-2">
            <ActionButton disabled={busy || reason.trim().length < 3 || !['published', 'flagged', 'pending_review'].includes(p.status)} onClick={() => decide('suspend')}>
              Suspend
            </ActionButton>
            <ActionButton tone="danger" disabled={busy || reason.trim().length < 3 || p.status === 'withdrawn'} onClick={() => decide('withdraw')}>
              Withdraw
            </ActionButton>
          </div>
        </div>
        <div>
          <label className="block">
            <span className="meta text-[0.6rem] text-slate">Customer notice (min. 10 characters)</span>
            <input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} className={`${inputCls} mt-1`} />
          </label>
          <ActionButton className="mt-2" tone="danger" disabled={busy || message.trim().length < 10} onClick={notify}>
            Notify affected customers
          </ActionButton>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </li>
  )
}
