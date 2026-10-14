'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { ActionButton, DataTable, MetricCard, MetricGrid, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { api, ApiError, errorText, idempotencyKey } from '@/lib/client/api'
import { privateAssetUrl } from '@/lib/client/upload'
import { money } from '@/lib/format'
import type { CaseMessage, CaseStatus, ReturnCase, Role } from '@/lib/types'
import { H, isOpenCase, when } from './data'
import { Drawer, inputCls, KV } from './ui'

const STATUSES: Exclude<CaseStatus, 'resolved'>[] = ['open', 'awaiting_supplier', 'approved', 'in_transit', 'escalated', 'declined']
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
const VIS_LABEL: Record<CaseMessage['visibility'], string> = { staff: 'Internal note', customer: 'To customer', supplier: 'To supplier' }

const QUEUES = {
  returns: [
    { value: 'pending', label: 'Pending returns', test: (c: ReturnCase) => isOpenCase(c.status) && c.type !== 'damage' && c.status !== 'escalated' },
    { value: 'damage', label: 'Damage claims', test: (c: ReturnCase) => c.type === 'damage' && isOpenCase(c.status) },
    { value: 'escalated', label: 'Escalated', test: (c: ReturnCase) => c.status === 'escalated' },
    { value: 'unresolved', label: 'All unresolved', test: (c: ReturnCase) => isOpenCase(c.status) },
    { value: 'closed', label: 'Closed', test: (c: ReturnCase) => !isOpenCase(c.status) },
  ],
  support: [
    { value: 'open', label: 'Open', test: (c: ReturnCase) => c.status === 'open' },
    { value: 'awaiting', label: 'Awaiting supplier', test: (c: ReturnCase) => c.status === 'awaiting_supplier' },
    { value: 'escalated', label: 'Escalated', test: (c: ReturnCase) => c.status === 'escalated' },
    { value: 'unresolved', label: 'All unresolved', test: (c: ReturnCase) => isOpenCase(c.status) },
    { value: 'closed', label: 'Closed', test: (c: ReturnCase) => !isOpenCase(c.status) },
  ],
}

type Staff = { id: string; name: string; role?: string }

export function CaseDesk({ kind, initial, staff, role, now, paymentsConnected }: { kind: 'returns' | 'support'; initial: ReturnCase[]; staff: Staff[]; role: Role; now: number; paymentsConnected: boolean }) {
  const [rows, setRows] = useState(initial)
  const queues = QUEUES[kind]
  const [tab, setTab] = useState(queues[0]!.value)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = rows.find((r) => r.id === openId)
  const replace = (c: ReturnCase) => setRows((rs) => rs.map((r) => (r.id === c.id ? c : r)))

  // SLA is the server-computed due time; a supplier response stops the clock on returns.
  const overdue = (c: ReturnCase) => isOpenCase(c.status) && !!c.slaDue && !(kind === 'returns' && c.supplierRespondedAt) && new Date(c.slaDue).getTime() < now
  const responded = rows.filter((r) => r.supplierRespondedAt)
  const avgResp = responded.length ? responded.reduce((s, r) => s + (new Date(r.supplierRespondedAt!).getTime() - new Date(r.openedAt).getTime()) / H, 0) / responded.length : 0
  const openRows = rows.filter((r) => isOpenCase(r.status))

  const columns: Column<ReturnCase>[] = [
    {
      key: 'id',
      header: 'Case',
      sort: (c) => c.id,
      cell: (c) => (
        <button onClick={() => setOpenId(c.id)} className="text-left">
          <span className="block font-medium hover:text-gold-deep">{c.id}</span>
          <span className="block max-w-[28ch] truncate text-xs text-slate">{c.subject}</span>
        </button>
      ),
    },
    { key: 'type', header: kind === 'returns' ? 'Type' : 'Priority', cell: (c) => (kind === 'returns' ? <span className="capitalize">{c.type}</span> : <StatusBadge status={c.priority} />) },
    { key: 'cust', header: 'Customer', cell: (c) => c.customerName ?? <span className="text-slate">—</span> },
    { key: 'sup', header: 'Supplier', cell: (c) => <span className="text-slate">{c.supplierName ?? '—'}</span> },
    { key: 'owner', header: 'Owner', cell: (c) => <span className="text-slate">{c.assignee ?? 'Unassigned'}</span> },
    { key: 'opened', header: 'Opened', sort: (c) => c.openedAt, cell: (c) => <span className="text-slate">{when(c.openedAt)}</span> },
    {
      key: 'sla',
      header: kind === 'returns' ? 'Supplier response' : 'SLA',
      sort: (c) => c.slaDue ?? '',
      cell: (c) =>
        kind === 'returns' && c.supplierRespondedAt ? (
          <span className="text-xs text-success">Responded in {Math.round((new Date(c.supplierRespondedAt).getTime() - new Date(c.openedAt).getTime()) / H)} h</span>
        ) : !isOpenCase(c.status) ? (
          <span className="text-xs text-slate">Closed</span>
        ) : overdue(c) ? (
          <StatusBadge status="overdue" tone="bad" label={`${Math.round((now - new Date(c.slaDue!).getTime()) / H)} h over`} />
        ) : c.slaDue ? (
          <span className="text-xs text-slate">Due {when(c.slaDue)}</span>
        ) : (
          <span className="text-xs text-slate">No target</span>
        ),
    },
    { key: 'status', header: 'Status', sort: (c) => c.status, cell: (c) => <StatusBadge status={c.status} /> },
  ]
  const current = queues.find((q) => q.value === tab)!

  return (
    <>
      <MetricGrid cols={4}>
        <MetricCard label="Open cases" value={openRows.length} />
        <MetricCard label="Past target" value={openRows.filter(overdue).length} tone={openRows.some(overdue) ? 'danger' : 'default'} hint="Against the response target in Settings" />
        <MetricCard label="Escalated" value={rows.filter((r) => r.status === 'escalated').length} tone={rows.some((r) => r.status === 'escalated') ? 'warning' : 'default'} />
        {kind === 'returns' ? <MetricCard label="Avg supplier response" value={avgResp} decimals={1} suffix=" h" hint={responded.length ? `${responded.length} responses` : 'No responses yet'} /> : <MetricCard label="Resolved" value={rows.filter((r) => r.status === 'resolved').length} />}
      </MetricGrid>

      <div className="mt-10">
        <Tabs value={tab} onChange={setTab} options={queues.map((q) => ({ value: q.value, label: q.label, count: rows.filter(q.test).length }))} />
        <Panel pad={false} className="mt-6">
          <DataTable rows={rows.filter(current.test)} columns={columns} rowKey={(c) => c.id} caption={current.label} empty="This queue is clear." />
        </Panel>
      </div>

      <Drawer open={!!open} onClose={() => setOpenId(null)} eyebrow={open ? `${open.type} · opened ${when(open.openedAt)}` : undefined} title={open?.id ?? ''}>
        {open && <CaseDetail key={open.id} c={open} kind={kind} staff={staff} role={role} overdue={overdue(open)} paymentsConnected={paymentsConnected} onChange={replace} />}
      </Drawer>
    </>
  )
}

function CaseDetail({ c, kind, staff, role, overdue, paymentsConnected, onChange }: { c: ReturnCase; kind: 'returns' | 'support'; staff: Staff[]; role: Role; overdue: boolean; paymentsConnected: boolean; onChange: (c: ReturnCase) => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [visibility, setVisibility] = useState<CaseMessage['visibility']>('staff')
  const [outcome, setOutcome] = useState<NonNullable<ReturnCase['outcome']>>('refund')
  const [summary, setSummary] = useState('')
  const [amount, setAmount] = useState('')
  const [refundKey, setRefundKey] = useState(idempotencyKey)
  const closed = c.status === 'resolved' || c.status === 'declined'
  const admin = role === 'admin'

  const act = async (body: Record<string, unknown>, success: string | ((c: ReturnCase) => string), tag = String(body.action)) => {
    setBusy(tag)
    setError('')
    try {
      const next = await api<ReturnCase>(`/api/cases/${encodeURIComponent(c.id)}/actions`, { body })
      onChange(next)
      toast({ title: typeof success === 'string' ? success : success(next) })
      return true
    } catch (e) {
      setError(e instanceof ApiError && e.unavailable ? 'Unavailable: payment provider not connected. No refund was issued and the case was not resolved.' : errorText(e))
      return false
    } finally {
      setBusy(null)
    }
  }

  const send = async () => {
    setBusy('message')
    setError('')
    try {
      const next = await api<ReturnCase>(`/api/cases/${encodeURIComponent(c.id)}`, { body: { text: text.trim(), visibility, attachments: [] } })
      onChange(next)
      setText('')
      toast({ title: visibility === 'staff' ? 'Internal note added' : `Message sent ${visibility === 'customer' ? 'to the customer' : 'to the supplier'}` })
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  const resolve = async () => {
    const body: Record<string, unknown> = { action: 'resolve', outcome, summary: summary.trim() }
    if (outcome === 'refund') Object.assign(body, { refundAmount: Math.round(Number(amount) * 100) / 100, idempotencyKey: refundKey })
    const ok = await act(body, (n) => (n.refund?.status === 'pending' ? 'Refund submitted — awaiting provider confirmation' : n.refund?.status === 'succeeded' ? `Resolved · refund of ${money(n.refund.amount)} confirmed` : `${c.id} resolved`))
    if (ok) {
      setSummary('')
      setAmount('')
      setRefundKey(idempotencyKey())
    }
  }

  const refundBlocked = outcome === 'refund' && (!admin || !paymentsConnected || !c.orderId)
  const canResolve = !closed && summary.trim().length >= 3 && !(outcome === 'refund' && (refundBlocked || !(Number(amount) > 0)))

  return (
    <div className="space-y-8">
      <div>
        <p className="font-display text-xl leading-snug">{c.subject}</p>
        {c.reason && c.reason !== c.subject && <p className="mt-2 text-sm text-slate">{c.reason}</p>}
        <dl className="mt-4">
          {c.orderId && (
            <KV k="Order">
              <Link href={`/admin/orders/${c.orderId}`} className="underline-offset-4 hover:text-gold-deep hover:underline">
                {c.orderId}
              </Link>
            </KV>
          )}
          <KV k="Customer">{c.customerName ?? '—'}</KV>
          <KV k="Supplier">{c.supplierName ?? '—'}</KV>
          {c.lines.length > 0 && <KV k="Items">{c.lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}</KV>}
          <KV k={kind === 'returns' ? 'Response due' : 'SLA due'}>
            <span className={overdue ? 'text-danger' : ''}>
              {when(c.slaDue)}
              {overdue ? ' · past target' : ''}
            </span>
          </KV>
          {c.supplierRespondedAt && <KV k="Supplier responded">{when(c.supplierRespondedAt)}</KV>}
          {c.resolution && <KV k="Resolution">{`${c.outcome?.replace('_', ' ') ?? ''} — ${c.resolution}`}</KV>}
          {c.refund && c.refund.status !== 'not_applicable' && (
            <KV k="Refund">
              {money(c.refund.amount)} · <StatusBadge status={c.refund.status === 'succeeded' ? 'captured' : c.refund.status} label={c.refund.status} />
            </KV>
          )}
        </dl>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="meta text-[0.6rem] text-slate">Status</span>
          <select className={`${inputCls} mt-1`} value={c.status} disabled={!!busy || c.status === 'resolved'} onChange={(e) => act({ action: 'status', status: e.target.value }, `${c.id} → ${e.target.value.replace('_', ' ')}`)}>
            {c.status === 'resolved' && <option value="resolved">resolved</option>}
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="meta text-[0.6rem] text-slate">Owner</span>
          <select className={`${inputCls} mt-1`} value={c.assigneeId ?? ''} disabled={!!busy} onChange={(e) => act({ action: 'assign', assigneeId: e.target.value || null }, e.target.value ? `Assigned to ${staff.find((s) => s.id === e.target.value)?.name}` : 'Unassigned')}>
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="meta text-[0.6rem] text-slate">Priority</span>
          <select className={`${inputCls} mt-1`} value={c.priority} disabled={!!busy} onChange={(e) => act({ action: 'priority', priority: e.target.value }, `Priority set to ${e.target.value}`)}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </section>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <section>
        <h3 className="eyebrow text-slate">Conversation</h3>
        {c.notes.length === 0 && <p className="mt-3 text-sm text-slate">No messages yet.</p>}
        <ol className="mt-4 border-l border-obsidian/10">
          {c.notes.map((n, i) => (
            <li key={n.at + i} className="relative pb-5 pl-5 last:pb-0">
              <span aria-hidden className={`absolute -left-[3px] top-1.5 size-[5px] rounded-full ${n.visibility === 'staff' ? 'bg-gold' : 'bg-obsidian/30'}`} />
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold">{n.by}</span>
                <span className="meta text-[0.56rem] text-slate">{n.role === 'system' ? 'System' : n.role} · {VIS_LABEL[n.visibility]}</span>
                <span className="text-slate/70">{when(n.at)}</span>
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-obsidian/85">{n.text}</p>
              {n.attachments.length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-3">
                  {n.attachments.map((a) => (
                    <li key={a.id}>
                      <a href={privateAssetUrl(a.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-gold-deep hover:text-obsidian">
                        <Paperclip className="size-3" aria-hidden /> {a.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) void send()
          }}
        >
          <fieldset className="flex flex-wrap gap-4">
            <legend className="meta text-[0.6rem] text-slate">Visibility</legend>
            {(['staff', 'customer', 'supplier'] as const).map((v) => (
              <label key={v} className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="visibility" value={v} checked={visibility === v} disabled={v === 'supplier' && !c.supplierId} onChange={() => setVisibility(v)} className="accent-[#5420C7]" />
                {VIS_LABEL[v]}
              </label>
            ))}
          </fieldset>
          <label className="mt-2 block">
            <span className="sr-only">Message</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={4000} className="w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none" placeholder={visibility === 'staff' ? 'Visible to staff only' : `Visible to the ${visibility}`} />
          </label>
          <ActionButton type="submit" className="mt-2" disabled={!text.trim() || !!busy}>
            {busy === 'message' ? 'Sending' : visibility === 'staff' ? 'Add note' : 'Send message'}
          </ActionButton>
        </form>
      </section>

      {kind === 'returns' && (
        <section className="border-t border-obsidian/10 pt-6">
          <h3 className="eyebrow text-slate">Return logistics</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ActionButton disabled={!!busy || !!c.logistics?.labelIssuedAt || closed} onClick={() => act({ action: 'label_issued' }, 'Return label recorded')}>
              {c.logistics?.labelIssuedAt ? `Label issued ${when(c.logistics.labelIssuedAt)}` : 'Record label issued'}
            </ActionButton>
            <ActionButton disabled={!!busy || !!c.logistics?.receivedAt || closed} onClick={() => act({ action: 'received' }, 'Item receipt recorded')}>
              {c.logistics?.receivedAt ? `Received ${when(c.logistics.receivedAt)}` : 'Mark item received'}
            </ActionButton>
          </div>
          <p className="mt-2 text-xs text-slate">Carrier labels are not generated automatically; this records a label sent manually.</p>
        </section>
      )}

      <section className="border-t border-obsidian/10 pt-6">
        <h3 className="eyebrow text-slate">Resolution</h3>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (canResolve) void resolve()
          }}
        >
          <label className="block">
            <span className="meta text-[0.6rem] text-slate">Outcome</span>
            <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} disabled={closed} className={`${inputCls} mt-1`}>
              <option value="refund">Refund</option>
              <option value="replacement">Replacement</option>
              <option value="store_credit">Store credit</option>
              <option value="none">No action</option>
            </select>
          </label>
          {outcome === 'refund' && (
            <>
              <label className="block">
                <span className="meta text-[0.6rem] text-slate">Refund amount (USD)</span>
                <input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={closed || refundBlocked} className={`${inputCls} mt-1`} />
              </label>
              {!admin && <p className="text-xs text-slate">Refunds are issued by administrators. Escalate the case or choose another outcome.</p>}
              {admin && !paymentsConnected && <p className="text-xs text-[#9a6a24]">Payment provider not connected — refunds are unavailable.</p>}
              {!c.orderId && <p className="text-xs text-slate">This case has no order, so it cannot be refunded.</p>}
            </>
          )}
          <label className="block">
            <span className="meta text-[0.6rem] text-slate">Resolution summary (sent to the customer)</span>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} maxLength={2000} disabled={closed} className="mt-1 w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none" />
          </label>
          <ActionButton type="submit" tone="primary" disabled={!!busy || !canResolve}>
            {busy === 'resolve' ? 'Resolving' : 'Document & resolve'}
          </ActionButton>
        </form>
      </section>
    </div>
  )
}
