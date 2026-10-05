'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ActionButton, DataTable, MetricCard, MetricGrid, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { returnCases, tickets } from '@/lib/data/operations'
import { date } from '@/lib/format'
import type { CaseStatus, ReturnCase, Role } from '@/lib/types'
import { customerName, hoursSince, isOpenCase, NOW, productName, supplierName, TARGET_HOURS } from './data'
import { Drawer, inputCls, KV } from './ui'

type Note = { by: string; role: Role | 'internal'; at: string; text: string }
type Case = {
  id: string
  title: string
  type: string
  orderId?: string
  customerId: string
  supplierId?: string
  priority?: string
  status: CaseStatus
  openedAt: string
  due: string
  supplierRespondedAt?: string
  resolution?: string
  outcome?: ReturnCase['outcome']
  notes: Note[]
}

const H = 3_600_000
const plus = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * H).toISOString()
const stamp = () => new Date(NOW).toISOString()

const fromReturns = (): Case[] =>
  returnCases.map((r) => ({
    id: r.id,
    title: `${r.reason} — ${productName(r.productSlug)}`,
    type: r.type,
    orderId: r.orderId,
    customerId: r.customerId,
    supplierId: r.supplierId,
    status: r.status,
    openedAt: r.openedAt,
    due: plus(r.openedAt, TARGET_HOURS.response),
    supplierRespondedAt: r.supplierRespondedAt,
    resolution: r.resolution,
    outcome: r.outcome,
    notes: r.notes,
  }))

const fromTickets = (): Case[] =>
  tickets.map((t) => {
    const linked = returnCases.find((r) => r.orderId === t.orderId)
    return {
      id: t.id,
      title: t.subject,
      type: 'support',
      orderId: t.orderId,
      customerId: t.customerId,
      supplierId: linked?.supplierId,
      priority: t.priority,
      status: t.status,
      openedAt: t.openedAt,
      due: t.slaDue,
      notes: [{ by: 'System', role: 'support', at: t.openedAt, text: `Case opened${t.assignee ? `, assigned to ${t.assignee}` : ' — unassigned'}.` }],
    }
  })

const STATUSES: CaseStatus[] = ['open', 'awaiting_supplier', 'approved', 'in_transit', 'escalated', 'resolved', 'declined']

const QUEUES = {
  returns: [
    { value: 'pending', label: 'Pending returns', test: (c: Case) => isOpenCase(c.status) && c.type !== 'damage' && c.status !== 'escalated' },
    { value: 'damage', label: 'Damage claims', test: (c: Case) => c.type === 'damage' && isOpenCase(c.status) },
    { value: 'escalated', label: 'Escalated', test: (c: Case) => c.status === 'escalated' },
    { value: 'unresolved', label: 'All unresolved', test: (c: Case) => isOpenCase(c.status) },
    { value: 'closed', label: 'Resolved', test: (c: Case) => !isOpenCase(c.status) },
  ],
  support: [
    { value: 'open', label: 'Open', test: (c: Case) => c.status === 'open' },
    { value: 'awaiting', label: 'Awaiting supplier', test: (c: Case) => c.status === 'awaiting_supplier' },
    { value: 'escalated', label: 'Escalated', test: (c: Case) => c.status === 'escalated' },
    { value: 'unresolved', label: 'All unresolved', test: (c: Case) => isOpenCase(c.status) },
    { value: 'closed', label: 'Resolved', test: (c: Case) => !isOpenCase(c.status) },
  ],
}

const overdue = (c: Case) => isOpenCase(c.status) && !c.supplierRespondedAt && new Date(c.due).getTime() < NOW

export function CaseDesk({ kind }: { kind: 'returns' | 'support' }) {
  const toast = useToast()
  const [rows, setRows] = useState<Case[]>(kind === 'returns' ? fromReturns : fromTickets)
  const queues = QUEUES[kind]
  const [tab, setTab] = useState(queues[0].value)
  const [openId, setOpenId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const open = rows.find((r) => r.id === openId)
  const patch = (id: string, p: Partial<Case>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)))
  const log = (c: Case, text: string, extra: Partial<Case> = {}) => patch(c.id, { ...extra, notes: [...c.notes, { by: 'Demo administrator', role: 'internal', at: stamp(), text }] })

  const responded = rows.filter((r) => r.supplierRespondedAt)
  const avgResp = responded.length ? responded.reduce((s, r) => s + (new Date(r.supplierRespondedAt!).getTime() - new Date(r.openedAt).getTime()) / H, 0) / responded.length : 0
  const openRows = rows.filter((r) => isOpenCase(r.status))

  const columns: Column<Case>[] = [
    {
      key: 'id',
      header: 'Case',
      sort: (c) => c.id,
      cell: (c) => (
        <button onClick={() => setOpenId(c.id)} className="text-left">
          <span className="block font-medium hover:text-gold-deep">{c.id}</span>
          <span className="block max-w-[28ch] truncate text-xs text-slate">{c.title}</span>
        </button>
      ),
    },
    { key: 'type', header: kind === 'returns' ? 'Type' : 'Priority', cell: (c) => (kind === 'returns' ? <span className="capitalize">{c.type}</span> : <StatusBadge status={c.priority ?? 'normal'} />) },
    { key: 'cust', header: 'Customer', cell: (c) => customerName(c.customerId) },
    { key: 'sup', header: 'Supplier', cell: (c) => <span className="text-slate">{c.supplierId ? supplierName(c.supplierId) : '—'}</span> },
    { key: 'opened', header: 'Opened', sort: (c) => c.openedAt, cell: (c) => <span className="text-slate">{date(c.openedAt)}</span> },
    {
      key: 'sla',
      header: kind === 'returns' ? 'Supplier response' : 'SLA',
      sort: (c) => c.due,
      cell: (c) =>
        c.supplierRespondedAt ? (
          <span className="text-xs text-success">Responded in {Math.round((new Date(c.supplierRespondedAt).getTime() - new Date(c.openedAt).getTime()) / H)} h</span>
        ) : !isOpenCase(c.status) ? (
          <span className="text-xs text-slate">Closed</span>
        ) : overdue(c) ? (
          <StatusBadge status="overdue" tone="bad" label={`${Math.round(hoursSince(c.due))} h over`} />
        ) : (
          <span className="text-xs text-slate">Due {date(c.due)}</span>
        ),
    },
    { key: 'status', header: 'Status', sort: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
  ]

  const current = queues.find((q) => q.value === tab)!

  return (
    <>
      <MetricGrid cols={4}>
        <MetricCard label="Open cases" value={openRows.length} />
        <MetricCard label="Past target" value={openRows.filter(overdue).length} tone={openRows.some(overdue) ? 'danger' : 'default'} hint={`Target ${TARGET_HOURS.response} h (placeholder)`} />
        <MetricCard label="Escalated" value={rows.filter((r) => r.status === 'escalated').length} tone="warning" />
        <MetricCard label={kind === 'returns' ? 'Avg supplier response' : 'Resolved'} value={kind === 'returns' ? avgResp : rows.filter((r) => r.status === 'resolved').length} decimals={kind === 'returns' ? 1 : 0} suffix={kind === 'returns' ? ' h' : ''} hint={kind === 'returns' ? `vs ${TARGET_HOURS.response} h target` : undefined} />
      </MetricGrid>

      <div className="mt-10">
        <Tabs value={tab} onChange={setTab} options={queues.map((q) => ({ value: q.value, label: q.label, count: rows.filter(q.test).length }))} />
        <Panel pad={false} className="mt-6">
          <DataTable rows={rows.filter(current.test)} columns={columns} rowKey={(c) => c.id} caption={current.label} empty="This queue is clear." />
        </Panel>
      </div>

      <Drawer open={!!open} onClose={() => setOpenId(null)} eyebrow={open ? `${open.type} · opened ${date(open.openedAt)}` : undefined} title={open?.id ?? ''}>
        {open && (
          <div key={open.id} className="space-y-8">
            <div>
              <p className="font-display text-xl leading-snug">{open.title}</p>
              <dl className="mt-4">
                {open.orderId && (
                  <KV k="Order">
                    <Link href={`/admin/orders/${open.orderId}`} className="underline-offset-4 hover:text-gold-deep hover:underline">
                      {open.orderId}
                    </Link>
                  </KV>
                )}
                <KV k="Customer">{customerName(open.customerId)}</KV>
                <KV k="Supplier">{open.supplierId ? supplierName(open.supplierId) : '—'}</KV>
                <KV k={kind === 'returns' ? 'Response due' : 'SLA due'}>
                  <span className={overdue(open) ? 'text-danger' : ''}>{date(open.due)}{overdue(open) ? ' · past target' : ''}</span>
                </KV>
              </dl>
            </div>

            <section className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="meta text-[0.6rem] text-slate">Status</span>
                <select
                  className={`${inputCls} mt-1`}
                  value={open.status}
                  onChange={(e) => {
                    const s = e.target.value as CaseStatus
                    log(open, `Status changed to ${s.replace('_', ' ')}.`, { status: s })
                    toast({ title: `${open.id} → ${s.replace('_', ' ')} (demo)` })
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="meta text-[0.6rem] text-slate">Supplier response</span>
                {open.supplierRespondedAt ? (
                  <p className="mt-1 flex h-11 items-center text-sm text-success">Received {date(open.supplierRespondedAt)}</p>
                ) : (
                  <ActionButton
                    className="mt-1 w-full"
                    disabled={!open.supplierId}
                    onClick={() => {
                      log(open, 'Supplier response recorded.', { supplierRespondedAt: stamp() })
                      toast({ title: 'Supplier response recorded (demo)' })
                    }}
                  >
                    Record response
                  </ActionButton>
                )}
              </div>
            </section>

            <section>
              <h3 className="eyebrow text-slate">History</h3>
              <ol className="mt-4 border-l border-obsidian/10">
                {open.notes.map((n, i) => (
                  <li key={i} className="relative pb-5 pl-5 last:pb-0">
                    <span aria-hidden className={`absolute -left-[3px] top-1.5 size-[5px] rounded-full ${n.role === 'internal' ? 'bg-gold' : 'bg-obsidian/30'}`} />
                    <p className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold">{n.by}</span>
                      <span className="meta text-[0.56rem] text-slate">{n.role === 'internal' ? 'Internal note' : n.role}</span>
                      <span className="text-slate/70">{date(n.at)}</span>
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-obsidian/85">{n.text}</p>
                  </li>
                ))}
              </ol>
              <form
                className="mt-5"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!note.trim()) return
                  log(open, note.trim())
                  setNote('')
                  toast({ title: 'Internal note added (demo)', body: 'Visible to staff only.' })
                }}
              >
                <label className="block">
                  <span className="meta text-[0.6rem] text-slate">Add internal note</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1 w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none" placeholder="Visible to staff only" />
                </label>
                <ActionButton type="submit" className="mt-2" disabled={!note.trim()}>
                  Add note
                </ActionButton>
              </form>
            </section>

            {kind === 'returns' && (
              <section className="border-t border-obsidian/10 pt-6">
                <h3 className="eyebrow text-slate">Return logistics</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Issue return label', 'Return label issued to customer.', 'Label issued'],
                    ['Mark item received', 'Returned item received and inspected.', 'Item received'],
                  ].map(([label, text, doneLabel]) => {
                    const done = open.notes.some((n) => n.text === text)
                    return (
                      <ActionButton
                        key={label}
                        disabled={done || open.status === 'resolved'}
                        onClick={() => {
                          log(open, text)
                          toast({ title: `${label} (demo)`, body: label === 'Issue return label' ? 'Labels are generated by the shipping carrier once connected.' : undefined })
                        }}
                      >
                        {done ? doneLabel : label}
                      </ActionButton>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="border-t border-obsidian/10 pt-6">
              <h3 className="eyebrow text-slate">Resolution</h3>
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  const f = new FormData(e.currentTarget)
                  const outcome = f.get('outcome') as Case['outcome']
                  const resolution = String(f.get('resolution') ?? '').trim()
                  log(open, `Resolved — outcome: ${outcome?.replace('_', ' ')}. ${resolution}`, { status: 'resolved', outcome, resolution })
                  toast({ title: `${open.id} resolved (demo)`, body: outcome === 'refund' ? 'Refund would be initiated via the payment provider (not connected).' : undefined })
                }}
              >
                <label className="block">
                  <span className="meta text-[0.6rem] text-slate">Outcome</span>
                  <select name="outcome" defaultValue={open.outcome ?? 'refund'} className={`${inputCls} mt-1`}>
                    <option value="refund">Refund</option>
                    <option value="replacement">Replacement</option>
                    <option value="store_credit">Store credit</option>
                    <option value="none">No action</option>
                  </select>
                </label>
                <label className="block">
                  <span className="meta text-[0.6rem] text-slate">Resolution summary</span>
                  <textarea name="resolution" defaultValue={open.resolution} rows={3} required className="mt-1 w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none" />
                </label>
                <ActionButton type="submit" tone="primary" disabled={open.status === 'resolved'}>
                  Document &amp; resolve
                </ActionButton>
              </form>
            </section>
          </div>
        )}
      </Drawer>
    </>
  )
}
