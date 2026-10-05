'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Scale } from 'lucide-react'
import { ActionButton, DataTable, MetricCard, MetricGrid, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { categories, getCategory } from '@/lib/data/categories'
import { products } from '@/lib/data/products'
import { ordersWithProduct, supplierName } from './data'
import { SubHead } from './ui'

type Doc = { id: string; slug: string; product: string; supplierId: string; label: string; status: 'on_file' | 'pending' | 'required'; kind: string }

const kindOf = (label: string) => (/authentic/i.test(label) ? 'Authenticity' : /manual/i.test(label) ? 'Manual' : /warrant/i.test(label) ? 'Warranty' : /certif|safety/i.test(label) ? 'Safety certificate' : 'Compliance')

const docs: Doc[] = products.flatMap((p) => p.compliance.map((c) => ({ id: `${p.slug}:${c.label}`, slug: p.slug, product: p.name, supplierId: p.supplierId, label: c.label, status: c.status, kind: kindOf(c.label) })))
const KINDS = ['All', 'Safety certificate', 'Manual', 'Warranty', 'Authenticity', 'Compliance'] as const

const STEPS = [
  ['Flag', 'Listing flagged by review, supplier notice or customer report.'],
  ['Suspend', 'Hidden from the storefront; open carts and orders held.'],
  ['Verify', 'Request documents and statement from the supplier.'],
  ['Remove', 'Listing removed if the issue is confirmed.'],
  ['Notify', 'Affected customers contacted with supplier guidance.'],
  ['Record', 'Outcome documented in the audit log.'],
]

export function ComplianceBoard() {
  const toast = useToast()
  const [kind, setKind] = useState<(typeof KINDS)[number]>('All')
  const flagged = products.filter((p) => p.status === 'flagged' || p.compliance.some((c) => c.status === 'required'))
  const columns: Column<Doc>[] = [
    { key: 'doc', header: 'Document', sort: (d) => d.label, cell: (d) => <span className="font-medium">{d.label}</span> },
    { key: 'kind', header: 'Type', cell: (d) => <span className="text-slate">{d.kind}</span> },
    { key: 'product', header: 'Product', sort: (d) => d.product, cell: (d) => d.product },
    { key: 'sup', header: 'Supplier', cell: (d) => <span className="text-slate">{supplierName(d.supplierId)}</span> },
    { key: 'status', header: 'Status', sort: (d) => d.status, cell: (d) => <StatusBadge status={d.status} /> },
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
        <MetricCard label="Pending documents" value={docs.filter((d) => d.status === 'pending').length} tone="warning" />
        <MetricCard label="Authenticity confirmations" value={docs.filter((d) => d.kind === 'Authenticity' && d.status === 'on_file').length} hint={`of ${products.length} products`} />
        <MetricCard label="Flagged products" value={flagged.length} tone={flagged.length ? 'danger' : 'default'} />
      </MetricGrid>

      <div>
        <SubHead note="Demonstration documents">Document register</SubHead>
        <div className="mb-6">
          <Tabs value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: k, count: k === 'All' ? docs.length : docs.filter((d) => d.kind === k).length }))} />
        </div>
        <Panel pad={false}>
          <DataTable rows={rows} columns={columns} rowKey={(d) => d.id} caption="Compliance documents" empty="No documents of this type on record yet." />
        </Panel>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Panel title="Flagged products">
          <ul>
            {flagged.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-center justify-between gap-3 border-b border-obsidian/[0.07] py-3 last:border-0">
                <span className="text-sm">
                  {p.name}
                  <span className="block text-xs text-slate">{p.compliance.filter((c) => c.status !== 'on_file').map((c) => c.label).join(', ') || 'Under review'}</span>
                </span>
                <Link href="/admin/products" className="inline-flex min-h-11 items-center meta text-[0.6rem] text-gold-deep hover:text-obsidian">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Category review requirements">
          <ul>
            {categories.map((c) => (
              <li key={c.slug} className="border-b border-obsidian/[0.07] py-3 last:border-0">
                <p className="flex items-center justify-between gap-3 text-sm">
                  {c.name} <StatusBadge status={c.reviewLevel} tone={c.reviewLevel === 'enhanced' ? 'gold' : 'muted'} />
                </p>
                {c.reviewNote && <p className="mt-1 text-xs text-slate">{c.reviewNote}</p>}
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
        <div className="mt-6 flex flex-wrap gap-3">
          {flagged.map((p) => (
            <ActionButton
              key={p.slug}
              tone="danger"
              onClick={() => toast({ title: `Removal workflow started: ${p.name} (demo)`, body: `${ordersWithProduct(p.slug).length} affected order(s). ${getCategory(p.category)?.short} review team notified once messaging is connected.` })}
            >
              Start removal · {p.name}
            </ActionButton>
          ))}
        </div>
      </div>
    </div>
  )
}
