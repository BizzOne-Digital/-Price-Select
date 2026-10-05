'use client'

import { useState } from 'react'
import type { CaseStatus, ReturnCase } from '@/lib/types'
import { getProduct } from '@/lib/data/products'
import { titleCase } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ActionButton, DataTable, DemoBanner, Field, MetricCard, MetricGrid, PageHeader, Panel, StatusBadge, Tabs } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { DEMO_NOW, TARGET_HOURS, hoursBetween, myCases, supplier } from './data'
import { Drawer, Err, dateTime, dur } from './ui'

const OPEN: CaseStatus[] = ['open', 'awaiting_supplier', 'escalated']
const responseHours = (c: ReturnCase) => hoursBetween(c.openedAt, c.supplierRespondedAt ?? DEMO_NOW)

export function SupplierReturns() {
  const toast = useToast()
  const [cases, setCases] = useState(myCases)
  const [view, setView] = useState<'open' | 'all'>('open')
  const [active, setActive] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteErr, setNoteErr] = useState<string>()
  const current = cases.find((c) => c.id === active)
  const rows = cases.filter((c) => view === 'all' || OPEN.includes(c.status))
  const responded = cases.filter((c) => c.supplierRespondedAt)
  const avg = responded.length ? responded.reduce((s, c) => s + responseHours(c), 0) / responded.length : 0

  const act = (status: CaseStatus | null, text: string, label: string) => {
    if (!current) return
    if (!text.trim()) return setNoteErr('Add a note for the customer and support team.')
    setNoteErr(undefined)
    const now = new Date().toISOString()
    setCases((s) => s.map((c) => (c.id !== current.id ? c : { ...c, status: status ?? c.status, supplierRespondedAt: c.supplierRespondedAt ?? now, notes: [...c.notes, { by: supplier.name, role: 'supplier', at: now, text: text.trim() }] })))
    setNote('')
    toast({ title: `${current.id}: ${label} (demo)`, body: 'Support and the customer would be notified once connected.' })
  }

  return (
    <>
      <PageHeader eyebrow="After sales" title="Returns & cases" description="Returns, damage reports, cancellations and replacement requests on items routed to you." />
      <DemoBanner>Sample cases. Responses update this page only. Return windows are still to be confirmed.</DemoBanner>

      <MetricGrid cols={4}>
        <MetricCard label="Open cases" value={cases.filter((c) => OPEN.includes(c.status)).length} tone={cases.some((c) => OPEN.includes(c.status)) ? 'warning' : 'default'} hint="Awaiting your response" />
        <MetricCard label="Avg. response" value={avg} decimals={1} suffix=" h" hint="Target: 1 business day" />
        <MetricCard label="Resolved" value={cases.filter((c) => c.status === 'resolved').length} hint="All time" />
        <MetricCard label="Return rate" value={supplier.metrics.returnRate} decimals={1} suffix="%" hint="Demonstration figure" />
      </MetricGrid>

      <Panel pad={false} className="mt-8">
        <div className="px-5 pt-4">
          <Tabs value={view} onChange={setView} options={[{ value: 'open', label: 'Needs response', count: cases.filter((c) => OPEN.includes(c.status)).length }, { value: 'all', label: 'All cases', count: cases.length }]} />
        </div>
        <DataTable
          caption="Return and support cases"
          rows={rows}
          rowKey={(c) => c.id}
          empty="No open cases."
          columns={[
            { key: 'id', header: 'Case', cell: (c) => <button onClick={() => setActive(c.id)} className="link-line font-medium tabular-nums hover:text-gold-deep">{c.id}</button> },
            { key: 'type', header: 'Type', cell: (c) => titleCase(c.type) },
            { key: 'item', header: 'Item', cell: (c) => <span><span className="block">{getProduct(c.productSlug)?.name}</span><span className="block text-xs text-slate">{c.orderId} · {c.reason}</span></span> },
            { key: 'opened', header: 'Opened', sort: (c) => c.openedAt, cell: (c) => <span className="text-slate">{dateTime(c.openedAt)}</span> },
            { key: 'resp', header: 'Response vs target', sort: (c) => responseHours(c), cell: (c) => <ResponseTime c={c} /> },
            { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
            { key: 'open', header: '', align: 'right', cell: (c) => <ActionButton tone="ghost" onClick={() => setActive(c.id)}>Open</ActionButton> },
          ]}
        />
      </Panel>

      <Drawer
        open={!!current}
        onClose={() => { setActive(null); setNote(''); setNoteErr(undefined) }}
        eyebrow={current ? `${titleCase(current.type)} · ${current.orderId}` : ''}
        title={current ? `${current.id} — ${current.reason}` : ''}
        footer={
          current && OPEN.includes(current.status) ? (
            <div className="flex flex-wrap justify-end gap-3">
              <ActionButton tone="ghost" onClick={() => act(null, note, 'reply sent')}>Reply only</ActionButton>
              <ActionButton tone="danger" onClick={() => act('declined', note, 'declined')}>Decline</ActionButton>
              <ActionButton tone="primary" onClick={() => act('approved', note, 'approved')}>Approve</ActionButton>
            </div>
          ) : undefined
        }
      >
        {current && (
          <div className="space-y-10">
            <dl className="grid grid-cols-2 gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-4">
              {[
                ['Status', <StatusBadge key="s" status={current.status} />],
                ['Item', getProduct(current.productSlug)?.name ?? current.productSlug],
                ['Opened', dateTime(current.openedAt)],
                ['Response', <ResponseTime key="r" c={current} />],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-ivory/80 p-4">
                  <dt className="meta text-[0.58rem] text-slate">{k}</dt>
                  <dd className="mt-2 text-sm">{v}</dd>
                </div>
              ))}
            </dl>
            {current.resolution && <p className="border-l-2 border-success bg-success/[0.06] px-4 py-3 text-sm">{current.resolution}</p>}

            <section>
              <h3 className="eyebrow text-slate">Notes</h3>
              <ol className="mt-5 space-y-4">
                {current.notes.map((n, i) => (
                  <li key={i} className={cn('max-w-[85%] border px-4 py-3', n.role === 'supplier' ? 'ml-auto border-gold/30 bg-gold/[0.06]' : 'border-obsidian/10 bg-ivory')}>
                    <p className="flex flex-wrap items-center justify-between gap-2 meta text-[0.58rem] text-slate">
                      <span className={n.role === 'supplier' ? 'text-gold-deep' : ''}>{n.role === 'customer' ? 'Customer' : n.by}</span>
                      <span className="tabular-nums">{dateTime(n.at)}</span>
                    </p>
                    <p className="mt-2 text-sm leading-relaxed">{n.text}</p>
                  </li>
                ))}
              </ol>
            </section>

            {OPEN.includes(current.status) ? (
              <Field label="Your response" hint="Visible to the support team and the customer. Do not include personal contact details.">
                <textarea rows={4} className="field resize-y" value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!noteErr} placeholder="e.g. Replacement approved — dispatching within 2 business days." />
                <Err msg={noteErr} />
              </Field>
            ) : (
              <p className="text-sm text-slate">This case is {titleCase(current.status).toLowerCase()}. No further action needed.</p>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}

function ResponseTime({ c }: { c: ReturnCase }) {
  const h = responseHours(c)
  const over = h > TARGET_HOURS.response
  return (
    <span className={cn('tabular-nums', over ? 'text-danger' : c.supplierRespondedAt ? 'text-success' : 'text-[#9a6a24]')}>
      {c.supplierRespondedAt ? dur(h) : `${dur(h)} waiting`} <span className="text-xs text-slate">/ 24 h</span>
    </span>
  )
}
