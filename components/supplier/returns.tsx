'use client'

import { Paperclip } from 'lucide-react'
import { useState } from 'react'
import type { ReturnCase } from '@/lib/types'
import { titleCase } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ActionButton, DataTable, Field, MetricCard, MetricGrid, PageHeader, Panel, StatusBadge, Tabs } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { api, errorText } from '@/lib/client/api'
import { privateAssetUrl } from '@/lib/client/upload'
import { OPEN_CASE, hoursBetween, targetText, type Target } from './data'
import { Drawer, Err, dateTime, dur } from './ui'

const isOpen = (c: ReturnCase) => (OPEN_CASE as readonly string[]).includes(c.status)
const CLOSED = ['resolved', 'declined']
type Decision = 'approve' | 'decline' | 'info'

export function SupplierReturns({ initial, due, responseTarget, returnRate, asOf }: { initial: ReturnCase[]; due: Record<string, string>; responseTarget: Target; returnRate: number; asOf: string }) {
  const toast = useToast()
  const [cases, setCases] = useState(initial)
  const [view, setView] = useState<'open' | 'all'>('open')
  const [active, setActive] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [noteErr, setNoteErr] = useState<string>()
  const [busy, setBusy] = useState<string | null>(null)
  const current = cases.find((c) => c.id === active)
  const rows = cases.filter((c) => view === 'all' || isOpen(c))
  const responded = cases.filter((c) => c.supplierRespondedAt)
  const avg = responded.length ? responded.reduce((s, c) => s + hoursBetween(c.openedAt, c.supplierRespondedAt!), 0) / responded.length : 0

  const send = async (kind: Decision | 'reply') => {
    if (!current) return
    const text = note.trim()
    if (text.length < 3) return setNoteErr('Add a note for the support team (at least 3 characters).')
    setNoteErr(undefined)
    setBusy(kind)
    try {
      const r =
        kind === 'reply'
          ? await api<ReturnCase>(`/api/cases/${encodeURIComponent(current.id)}`, { body: { text, attachments: [] } })
          : await api<ReturnCase>(`/api/cases/${encodeURIComponent(current.id)}/respond`, { body: { decision: kind, message: text } })
      setCases((s) => s.map((c) => (c.id === r.id ? r : c)))
      setNote('')
      toast({ title: `${r.id}: ${kind === 'reply' ? 'reply sent' : kind === 'approve' ? 'approved' : kind === 'decline' ? 'declined — sent to Price-Select for review' : 'information sent'}` })
    } catch (e) {
      toast({ title: 'Not sent', body: errorText(e), tone: 'error' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader eyebrow="After sales" title="Returns & cases" description="Returns, damage reports, cancellations and replacement requests on items routed to you. A decline goes to the Price-Select team for review, never straight to the customer." />

      <MetricGrid cols={4}>
        <MetricCard label="Open cases" value={cases.filter(isOpen).length} tone={cases.some(isOpen) ? 'warning' : 'default'} hint="Awaiting your response" />
        <MetricCard label="Avg. response" value={Math.round(avg * 10) / 10} decimals={1} suffix=" h" hint={`Target: ${targetText(responseTarget)}`} />
        <MetricCard label="Resolved" value={cases.filter((c) => c.status === 'resolved').length} hint="All time" />
        <MetricCard label="Return rate" value={returnRate} decimals={1} suffix="%" hint="Returns per delivered order, 180 days" />
      </MetricGrid>

      <Panel pad={false} className="mt-8">
        <div className="px-5 pt-4">
          <Tabs value={view} onChange={setView} options={[{ value: 'open', label: 'Needs response', count: cases.filter(isOpen).length }, { value: 'all', label: 'All cases', count: cases.length }]} />
        </div>
        <DataTable
          caption="Return and support cases"
          rows={rows}
          rowKey={(c) => c.id}
          empty={cases.length ? 'No open cases.' : 'No cases have been opened on your items.'}
          columns={[
            { key: 'id', header: 'Case', cell: (c) => <button onClick={() => setActive(c.id)} className="link-line font-medium tabular-nums hover:text-gold-deep">{c.id}</button> },
            { key: 'type', header: 'Type', cell: (c) => titleCase(c.type) },
            { key: 'item', header: 'Item', cell: (c) => <span><span className="block">{c.lines.map((l) => `${l.name} × ${l.qty}`).join(', ') || c.subject}</span><span className="block text-xs text-slate">{c.orderId} · {c.reason}</span></span> },
            { key: 'opened', header: 'Opened', sort: (c) => c.openedAt, cell: (c) => <span className="text-slate">{dateTime(c.openedAt)}</span> },
            { key: 'resp', header: 'Response vs target', cell: (c) => <ResponseTime c={c} due={due[c.id]} asOf={asOf} target={targetText(responseTarget)} /> },
            { key: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
            { key: 'open', header: '', align: 'right', cell: (c) => <ActionButton tone="ghost" onClick={() => setActive(c.id)}>Open</ActionButton> },
          ]}
        />
      </Panel>

      <Drawer
        open={!!current}
        onClose={() => { setActive(null); setNote(''); setNoteErr(undefined) }}
        eyebrow={current ? `${titleCase(current.type)} · ${current.orderId ?? ''}` : ''}
        title={current ? `${current.id} — ${current.reason || current.subject}` : ''}
        footer={
          current && !CLOSED.includes(current.status) ? (
            <div className="flex flex-wrap justify-end gap-3">
              <ActionButton tone="ghost" disabled={!!busy} onClick={() => send('reply')}>{busy === 'reply' ? 'Sending…' : 'Reply only'}</ActionButton>
              {isOpen(current) && (
                <>
                  <ActionButton tone="ghost" disabled={!!busy} onClick={() => send('info')}>{busy === 'info' ? 'Sending…' : 'Need information'}</ActionButton>
                  <ActionButton tone="danger" disabled={!!busy} onClick={() => send('decline')}>{busy === 'decline' ? 'Sending…' : 'Decline'}</ActionButton>
                  <ActionButton tone="primary" disabled={!!busy} onClick={() => send('approve')}>{busy === 'approve' ? 'Sending…' : 'Approve'}</ActionButton>
                </>
              )}
            </div>
          ) : undefined
        }
      >
        {current && (
          <div className="space-y-10">
            <dl className="grid grid-cols-2 gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-4">
              {[
                ['Status', <StatusBadge key="s" status={current.status} />],
                ['Items', current.lines.map((l) => `${l.name} × ${l.qty}`).join(', ') || '—'],
                ['Opened', dateTime(current.openedAt)],
                ['Response', <ResponseTime key="r" c={current} due={due[current.id]} asOf={asOf} target={targetText(responseTarget)} />],
              ].map(([k, v]) => (
                <div key={String(k)} className="bg-ivory/80 p-4">
                  <dt className="meta text-[0.58rem] text-slate">{k}</dt>
                  <dd className="mt-2 text-sm">{v}</dd>
                </div>
              ))}
            </dl>
            {current.resolution && <p className="border-l-2 border-success bg-success/[0.06] px-4 py-3 text-sm">{current.resolution}</p>}

            <section>
              <h3 className="eyebrow text-slate">Messages</h3>
              {current.notes.length === 0 && <p className="mt-4 text-sm text-slate">No messages yet.</p>}
              <ol className="mt-5 space-y-4">
                {current.notes.map((n, i) => (
                  <li key={i} className={cn('max-w-[85%] border px-4 py-3', n.role === 'supplier' ? 'ml-auto border-gold/30 bg-gold/[0.06]' : 'border-obsidian/10 bg-ivory')}>
                    <p className="flex flex-wrap items-center justify-between gap-2 meta text-[0.58rem] text-slate">
                      <span className={n.role === 'supplier' ? 'text-gold-deep' : ''}>{n.role === 'customer' ? 'Customer' : n.role === 'system' ? 'System' : n.by}</span>
                      <span className="tabular-nums">{dateTime(n.at)}</span>
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{n.text}</p>
                    {n.attachments.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {n.attachments.map((a) => (
                          <li key={a.id}>
                            <a href={privateAssetUrl(a.id)} target="_blank" rel="noreferrer" className="link-line inline-flex items-center gap-1.5 text-xs">
                              <Paperclip className="size-3" strokeWidth={1.4} aria-hidden /> {a.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {!CLOSED.includes(current.status) ? (
              <Field label="Your response" hint="Visible to you and the Price-Select support team. Do not include personal contact details.">
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

function ResponseTime({ c, due, asOf, target }: { c: ReturnCase; due?: string; asOf: string; target: string }) {
  const end = c.supplierRespondedAt ?? asOf
  const h = Math.max(0, hoursBetween(c.openedAt, end))
  const over = due ? end > due : false
  return (
    <span className={cn('tabular-nums', over ? 'text-danger' : c.supplierRespondedAt ? 'text-success' : 'text-[#9a6a24]')}>
      {c.supplierRespondedAt ? dur(h) : `${dur(h)} waiting`} <span className="text-xs text-slate">/ {target}</span>
    </span>
  )
}
