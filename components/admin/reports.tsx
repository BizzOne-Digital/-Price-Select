'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { ActionButton, Field } from '@/components/dashboard/kit'
import { api, errorText } from '@/lib/client/api'
import { inputCls } from './ui'

const REPORTS = [
  { key: 'sales', title: 'Sales', detail: 'Every order with totals, payment status, captured and refunded amounts.', dated: true },
  { key: 'suppliers', title: 'Suppliers', detail: 'Status, integration, feed health and 180-day performance metrics.', dated: false },
  { key: 'inventory', title: 'Inventory', detail: 'Catalog by SKU with on-hand, reserved and available stock and listing status.', dated: false },
  { key: 'returns', title: 'Returns', detail: 'Return, damage and replacement cases with outcomes and refunds.', dated: true },
  { key: 'fulfillment', title: 'Order fulfillment', detail: 'Each supplier fulfillment with carrier, tracking, timestamps and blind-ship flag.', dated: true },
] as const

export function ReportCards() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [counts, setCounts] = useState<Record<string, { count: number; cols: number } | string>>({})
  const [busy, setBusy] = useState(false)
  const qs = (extra?: string) => {
    const p = new URLSearchParams()
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    if (extra) p.set('format', extra)
    const s = p.toString()
    return s ? `?${s}` : ''
  }
  const invalid = !!from && !!to && from > to

  const preview = async () => {
    setBusy(true)
    const out: typeof counts = {}
    await Promise.all(
      REPORTS.map(async (r) => {
        try {
          const j = await api<{ header: unknown[]; count: number }>(`/api/admin/reports/${r.key}${qs('json')}`)
          out[r.key] = { count: j.count, cols: j.header.length }
        } catch (e) {
          out[r.key] = errorText(e)
        }
      }),
    )
    setCounts(out)
    setBusy(false)
  }

  return (
    <>
      <form
        className="mb-8 flex flex-wrap items-end gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          void preview()
        }}
      >
        <Field label="From">
          <input type="date" value={from} max={to || undefined} onChange={(e) => (setFrom(e.target.value), setCounts({}))} className={inputCls} />
        </Field>
        <Field label="To (inclusive)">
          <input type="date" value={to} min={from || undefined} onChange={(e) => (setTo(e.target.value), setCounts({}))} className={inputCls} />
        </Field>
        <ActionButton type="submit" disabled={busy || invalid}>
          {busy ? 'Counting' : 'Preview row counts'}
        </ActionButton>
        {invalid && <p role="alert" className="text-xs text-danger">The start date must be before the end date.</p>}
      </form>
      <ul className="grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((r, i) => {
          const c = counts[r.key]
          return (
            <li key={r.key} className="group flex flex-col bg-ivory p-6 md:p-8">
              <p className="meta text-[0.6rem] text-gold-deep">{String(i + 1).padStart(2, '0')} — CSV</p>
              <h2 className="mt-6 font-display text-4xl font-light tracking-[-0.02em]">{r.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate">{r.detail}</p>
              <p className="mt-6 meta text-[0.58rem] text-slate/80" aria-live="polite">
                {typeof c === 'string' ? <span className="text-danger">{c}</span> : c ? `${c.count} rows · ${c.cols} columns` : r.dated ? (from || to ? 'Filtered by date' : 'All dates') : 'Current snapshot (date filter not applied)'}
              </p>
              <a href={invalid ? undefined : `/api/admin/reports/${r.key}${qs()}`} aria-disabled={invalid} download className="mt-4 inline-flex h-11 items-center justify-between border-t border-obsidian/15 pt-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] transition-colors hover:text-gold-deep aria-disabled:pointer-events-none aria-disabled:opacity-40">
                Download CSV <Download className="size-4 transition-transform group-hover:translate-y-0.5" strokeWidth={1.4} />
              </a>
            </li>
          )
        })}
        <li className="flex flex-col justify-end bg-ivory p-6 text-obsidian md:p-8">
          <p className="eyebrow text-teal/80">About exports</p>
          <p className="mt-4 text-sm leading-relaxed text-obsidian/60">Exports are generated on the server from live records, protected against spreadsheet formula injection, and each download is recorded in the audit log.</p>
        </li>
      </ul>
    </>
  )
}
