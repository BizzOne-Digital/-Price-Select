'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { AlertTriangle, FileCheck2, FileClock, FileX2 } from 'lucide-react'
import { ActionButton, DataTable, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { categories, getCategory } from '@/lib/data/categories'
import { products as seed } from '@/lib/data/products'
import { money } from '@/lib/format'
import type { CategorySlug, Product } from '@/lib/types'
import { ordersWithProduct, supplierName } from './data'
import { Drawer, inputCls, KV } from './ui'

type Status = Product['status']
type Row = Product & { removed?: boolean }
const TABS: { value: Status; label: string }[] = [
  { value: 'pending_review', label: 'Pending review' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'published', label: 'Published' },
  { value: 'suspended', label: 'Suspended' },
]

/** A product can publish only when every compliance document is on file. */
export const publishBlockers = (p: Pick<Product, 'compliance'>) => p.compliance.filter((c) => c.status !== 'on_file')

const DocIcon = ({ s }: { s: string }) => {
  const I = s === 'on_file' ? FileCheck2 : s === 'pending' ? FileClock : FileX2
  return <I className={s === 'on_file' ? 'size-4 text-success' : s === 'pending' ? 'size-4 text-warning' : 'size-4 text-danger'} strokeWidth={1.4} aria-hidden />
}

export function ProductReview() {
  const toast = useToast()
  const [rows, setRows] = useState<Row[]>(seed)
  const [tab, setTab] = useState<Status>('pending_review')
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const open = rows.find((r) => r.slug === openSlug)
  const patch = (slug: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.slug === slug ? { ...r, ...p } : r)))
  const list = useMemo(() => rows.filter((r) => r.status === tab), [rows, tab])

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Product',
      sort: (r) => r.name,
      cell: (r) => (
        <span className="flex items-center gap-3">
          <span className="relative size-11 shrink-0 overflow-hidden bg-pearl">
            <Image src={r.images[0].src} alt="" fill sizes="44px" className="object-cover" />
          </span>
          <span>
            <span className="block font-medium">{r.name}</span>
            <span className="text-xs text-slate">{r.sku}</span>
          </span>
        </span>
      ),
    },
    { key: 'supplier', header: 'Supplier', cell: (r) => <span className="text-slate">{supplierName(r.supplierId)}</span> },
    {
      key: 'category',
      header: 'Category',
      cell: (r) => (
        <span className="flex items-center gap-2">
          {getCategory(r.category)?.short}
          {getCategory(r.category)?.reviewLevel === 'enhanced' && <StatusBadge status="enhanced" tone="gold" label="Enhanced" />}
        </span>
      ),
    },
    {
      key: 'docs',
      header: 'Documents',
      cell: (r) => {
        const b = publishBlockers(r)
        return b.length ? <StatusBadge status="missing" tone="warn" label={`${b.length} outstanding`} /> : <StatusBadge status="on_file" label="Complete" />
      },
    },
    { key: 'price', header: 'Price', align: 'right', sort: (r) => r.price, cell: (r) => money(r.price) },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.removed ? 'removed' : r.status} tone={r.removed ? 'bad' : undefined} /> },
    {
      key: 'act',
      header: '',
      align: 'right',
      cell: (r) => (
        <ActionButton tone="default" className="h-9" onClick={() => setOpenSlug(r.slug)}>
          Inspect
        </ActionButton>
      ),
    },
  ]

  const act = (r: Row, status: Status, title: string, body?: string) => {
    patch(r.slug, { status })
    toast({ title, body: body ?? 'Demo action — saved to this session only.' })
  }

  return (
    <>
      <div className="mb-8 flex items-start gap-3 border border-danger/20 bg-danger/[0.04] px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.5} aria-hidden />
        <p>
          <span className="font-medium">Publishing rule.</span> <span className="text-slate">Restricted or unapproved products cannot be published. A listing goes live only when every required document is on file; enhanced-review categories also need a reviewer&apos;s sign-off.</span>
        </p>
      </div>

      <Tabs value={tab} onChange={setTab} options={TABS.map((t) => ({ ...t, count: rows.filter((r) => r.status === t.value).length }))} />
      <Panel pad={false} className="mt-6">
        <DataTable rows={list} columns={columns} rowKey={(r) => r.slug} caption="Product review queue" empty="Nothing in this queue." />
      </Panel>

      <Drawer
        open={!!open}
        onClose={() => setOpenSlug(null)}
        eyebrow={open ? `${open.sku} · ${supplierName(open.supplierId)}` : undefined}
        title={open?.name ?? ''}
        footer={
          open && (
            <>
              <ActionButton
                tone="primary"
                disabled={publishBlockers(open).length > 0 || open.status === 'published'}
                title={publishBlockers(open).length ? 'Outstanding documents block publishing' : undefined}
                onClick={() => act(open, 'published', `${open.name} approved and published (demo)`)}
              >
                Approve &amp; publish
              </ActionButton>
              <ActionButton onClick={() => act(open, 'flagged', `${open.name} rejected (demo)`, 'Returned to the supplier with a request for corrections.')}>Reject</ActionButton>
              <ActionButton disabled={open.status === 'suspended'} onClick={() => act(open, 'suspended', `${open.name} suspended (demo)`, 'Hidden from the storefront pending review.')}>
                Suspend
              </ActionButton>
              <ActionButton
                tone="danger"
                disabled={open.removed}
                onClick={() => {
                  patch(open.slug, { status: 'suspended', removed: true })
                  toast({ title: `${open.name} removed (demo)`, body: 'Listing withdrawn. Use "Notify affected customers" for safety removals.' })
                }}
              >
                Remove
              </ActionButton>
            </>
          )
        }
      >
        {open && (
          <div className="space-y-8">
            <div className="relative aspect-[16/10] overflow-hidden bg-pearl">
              <Image src={open.images[0].src} alt={open.images[0].alt} fill sizes="560px" className="object-cover" />
            </div>
            <p className="text-sm leading-relaxed text-slate">{open.summary}</p>

            <section>
              <h3 className="eyebrow text-slate">Compliance documents</h3>
              <ul className="mt-3">
                {open.compliance.map((c) => (
                  <li key={c.label} className="flex items-center justify-between gap-3 border-b border-obsidian/[0.07] py-3 text-sm">
                    <span className="flex items-center gap-3">
                      <DocIcon s={c.status} /> {c.label}
                    </span>
                    <span className="flex items-center gap-3">
                      <StatusBadge status={c.status} />
                      {c.status === 'on_file' && (
                        <button className="min-h-11 meta text-[0.58rem] text-gold-deep hover:text-obsidian" onClick={() => toast({ title: `${c.label}`, body: 'Document viewer opens here once storage is connected (demo).' })}>
                          View
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {publishBlockers(open).length > 0 && <p className="mt-3 text-xs text-danger">Publishing blocked until {publishBlockers(open).length} document(s) are on file.</p>}
            </section>

            <section>
              <h3 className="eyebrow text-slate">Category</h3>
              <label className="mt-3 block">
                <span className="sr-only">Category</span>
                <select
                  className={inputCls}
                  value={open.category}
                  onChange={(e) => {
                    patch(open.slug, { category: e.target.value as CategorySlug })
                    toast({ title: 'Category updated (demo)', body: getCategory(e.target.value)?.name })
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                      {c.reviewLevel === 'enhanced' ? ' — enhanced review' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {getCategory(open.category)?.reviewNote && <p className="mt-2 text-xs text-slate">{getCategory(open.category)?.reviewNote}</p>}
            </section>

            <dl>
              <KV k="Price">{money(open.price)}</KV>
              <KV k="Stock">{open.stockQty} units</KV>
              <KV k="Handling">{open.handlingDays} days</KV>
              <KV k="UPC">{open.upc ?? '—'}</KV>
            </dl>

            <section className="border border-obsidian/10 p-5">
              <h3 className="eyebrow text-danger">Safety removal</h3>
              <p className="mt-2 text-sm text-slate">
                {ordersWithProduct(open.slug).length} demonstration order(s) include this product. For safety-related removals, notify those customers with guidance from the supplier.
              </p>
              <ActionButton
                tone="danger"
                className="mt-4"
                disabled={!ordersWithProduct(open.slug).length}
                onClick={() => toast({ title: `Notification prepared for ${ordersWithProduct(open.slug).length} customer(s) (demo)`, body: 'Email provider not connected — nothing was sent.' })}
              >
                Notify affected customers
              </ActionButton>
            </section>
          </div>
        )}
      </Drawer>
    </>
  )
}
