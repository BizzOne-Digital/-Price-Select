'use client'

import { Cable, FileSpreadsheet, Network, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import type { ProductStatus, StockStatus, Supplier } from '@/lib/types'
import { STOCK_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { ActionButton, DataTable, PageHeader, Panel, StatusBadge } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { api, errorText } from '@/lib/client/api'
import { hoursBetween, targetHours, targetText, type Target } from './data'
import { dateTime, dur } from './ui'

type Item = { sku: string; name: string; onHand: number; reserved: number; available: number; madeToOrder: boolean; handlingDays: number; status: ProductStatus }
type Outcome = { line: number; sku: string; qty: string; ok: boolean; error?: string; previous?: number; reserved?: number }
type Result = { rows: Outcome[]; valid: number; invalid: number; applied: boolean }

const statusFor = (available: number, mto: boolean): StockStatus => (mto ? 'made_to_order' : available <= 0 ? 'out_of_stock' : available < 10 ? 'low_stock' : 'in_stock')

export function SupplierInventory({ initial, integration, feed, inventoryTarget, asOf }: { initial: Item[]; integration: Supplier['integration']; feed: Supplier['feed']; inventoryTarget: Target; asOf: string }) {
  const toast = useToast()
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(initial.map((p) => [p.sku, String(p.onHand)])))
  const [saving, setSaving] = useState(false)
  const [rowErr, setRowErr] = useState<Record<string, string>>({})
  const [csv, setCsv] = useState<{ name: string; text: string; result?: Result; error?: string; busy?: boolean } | null>(null)
  const dirty = items.filter((p) => draft[p.sku] !== String(p.onHand))
  const invalid = dirty.filter((p) => !/^\d{1,7}$/.test(draft[p.sku]) || Number(draft[p.sku]) < p.reserved)
  const template = useMemo(() => `data:text/csv;charset=utf-8,${encodeURIComponent(['sku,quantity', ...items.map((p) => `${p.sku},${p.onHand}`)].join('\n'))}`, [items])

  /** Apply outcomes from the server to local rows (only rows the server accepted). */
  const merge = (rows: Outcome[]) => {
    const ok = new Map(rows.filter((r) => r.ok).map((r) => [r.sku, Number(r.qty)]))
    setItems((s) => s.map((p) => (ok.has(p.sku) ? { ...p, onHand: ok.get(p.sku)!, available: ok.get(p.sku)! - p.reserved } : p)))
    setDraft((s) => ({ ...s, ...Object.fromEntries([...ok].map(([k, v]) => [k, String(v)])) }))
    setRowErr(Object.fromEntries(rows.filter((r) => !r.ok).map((r) => [r.sku, r.error ?? 'Not saved'])))
    router.refresh()
  }

  const save = async () => {
    setSaving(true)
    try {
      const r = await api<Result>('/api/supplier/inventory', { body: { apply: true, rows: dirty.map((p) => ({ sku: p.sku, qty: draft[p.sku] })) } })
      merge(r.rows)
      const ok = r.rows.filter((x) => x.ok).length
      toast(ok === r.rows.length ? { title: `${ok} stock level${ok === 1 ? '' : 's'} saved` } : { title: `${ok} saved, ${r.rows.length - ok} rejected`, body: 'See the highlighted rows.', tone: 'error' })
    } catch (e) {
      toast({ title: 'Stock not saved', body: errorText(e), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const readCsv = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 1_000_000) return setCsv({ name: file.name, text: '', error: 'File is larger than 1 MB.' })
    const text = await file.text()
    setCsv({ name: file.name, text, busy: true })
    try {
      const result = await api<Result>('/api/supplier/inventory', { body: { apply: false, csv: text } })
      setCsv({ name: file.name, text, result, error: result.rows.length ? undefined : 'No data rows found.' })
    } catch (e) {
      setCsv({ name: file.name, text, error: errorText(e) })
    }
  }

  const applyCsv = async () => {
    if (!csv) return
    setCsv({ ...csv, busy: true })
    try {
      const result = await api<Result>('/api/supplier/inventory', { body: { apply: true, csv: csv.text } })
      merge(result.rows)
      const ok = result.rows.filter((r) => r.ok).length
      toast({ title: `${ok} row${ok === 1 ? '' : 's'} applied`, body: `${result.rows.length - ok} row(s) skipped with errors.`, tone: ok ? 'success' : 'error' })
      setCsv(ok === result.rows.length ? null : { ...csv, result, busy: false })
    } catch (e) {
      setCsv({ ...csv, busy: false, error: errorText(e) })
    }
  }

  const feedAge = Math.max(0, hoursBetween(feed.lastSync, asOf))
  const feedLate = feedAge > targetHours(inventoryTarget)

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Inventory"
        description={`Keep availability accurate. Update stock at least every ${targetText(inventoryTarget)}, more often where an API or EDI feed is connected. On-hand can never go below units reserved by open orders.`}
        actions={
          <ActionButton tone="primary" disabled={!dirty.length || invalid.length > 0 || saving} onClick={save}>
            {saving ? 'Saving…' : dirty.length ? `Save ${dirty.length} change${dirty.length === 1 ? '' : 's'}` : 'No changes'}
          </ActionButton>
        }
      />

      <Panel title="Stock levels" action={<span className="meta text-[0.6rem] text-slate">Last update {dateTime(feed.lastSync)}</span>} pad={false}>
        <DataTable
          caption="Stock levels for your products"
          rows={items}
          rowKey={(p) => p.sku}
          empty="No products yet. Create a listing under Products first."
          columns={[
            { key: 'p', header: 'Product', sort: (p) => p.name, cell: (p) => <span><span className="block font-medium">{p.name}</span><span className="block text-xs tabular-nums text-slate">{p.sku}</span></span> },
            { key: 'saved', header: 'Saved on hand', align: 'right', cell: (p) => p.onHand },
            { key: 'res', header: 'Reserved', align: 'right', cell: (p) => <span className="text-slate">{p.reserved}</span> },
            {
              key: 'qty',
              header: 'New on hand',
              cell: (p) => {
                const v = draft[p.sku]
                const bad = !/^\d{1,7}$/.test(v) ? 'Whole number' : Number(v) < p.reserved ? `Min ${p.reserved} (reserved)` : rowErr[p.sku]
                const changed = v !== String(p.onHand)
                return (
                  <label className="flex items-center gap-3">
                    <span className="sr-only">On-hand quantity for {p.name}</span>
                    <input
                      type="number"
                      min={p.reserved}
                      inputMode="numeric"
                      value={v}
                      onChange={(e) => (setDraft((s) => ({ ...s, [p.sku]: e.target.value })), setRowErr((s) => ({ ...s, [p.sku]: '' })))}
                      aria-invalid={!!bad}
                      className={cn('h-10 w-24 border bg-ivory px-3 text-right tabular-nums focus:border-gold focus:outline-none', bad ? 'border-danger' : changed ? 'border-gold' : 'border-obsidian/15')}
                    />
                    {changed && !bad && <span className="meta text-[0.58rem] text-gold-deep">{Number(v) - p.onHand > 0 ? '+' : ''}{Number(v) - p.onHand}</span>}
                    {bad && <span className="text-xs text-danger">{bad}</span>}
                  </label>
                )
              },
            },
            { key: 'st', header: 'Availability', cell: (p) => { const s = statusFor((Number(draft[p.sku]) || 0) - p.reserved, p.madeToOrder); return <StatusBadge status={s} label={STOCK_LABEL[s]} /> } },
            { key: 'listing', header: 'Listing', cell: (p) => <StatusBadge status={p.status} /> },
            { key: 'h', header: 'Handling', align: 'right', cell: (p) => `${p.handlingDays} days` },
          ]}
        />
      </Panel>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <Panel title="CSV upload" className="self-start lg:col-span-7" action={items.length ? <a href={template} download="price-select-inventory.csv" className="link-line meta text-[0.6rem] text-slate hover:text-obsidian">Download template</a> : undefined}>
          <label className="group flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-obsidian/20 px-4 py-6 text-center transition-colors hover:border-gold focus-within:border-gold">
            <Upload className="size-5 text-gold-deep" strokeWidth={1.4} aria-hidden />
            <span className="text-sm">{csv ? csv.name : 'Choose a CSV file'}</span>
            <span className="text-xs text-slate">Columns: sku, quantity · one row per SKU · checked by the server before anything is applied</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" disabled={csv?.busy} onChange={(e) => { readCsv(e.target.files?.[0]); e.target.value = '' }} />
          </label>

          {!csv && (
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <p className="text-xs leading-relaxed text-slate">Rows are matched to SKUs in your catalog only. Unknown SKUs, duplicates, non-numeric quantities and quantities below reserved units are flagged before anything is applied.</p>
              {items[0] && <pre className="border border-obsidian/10 bg-pearl/60 px-4 py-3 text-xs leading-relaxed tabular-nums text-obsidian/80">{`sku,quantity\n${items[0].sku},${items[0].onHand}`}</pre>}
            </div>
          )}
          {csv?.busy && <p className="mt-4 text-sm text-slate" role="status">Checking…</p>}
          {csv?.error && <p className="mt-4 text-sm text-danger" role="alert">{csv.error}</p>}
          {csv?.result && csv.result.rows.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  <span className="font-medium">{csv.result.valid}</span> valid · <span className={cn(csv.result.invalid && 'text-danger')}>{csv.result.invalid} with errors</span>
                  {csv.result.applied && <span className="text-slate"> · applied</span>}
                </p>
                <div className="flex gap-2">
                  <ActionButton tone="ghost" onClick={() => setCsv(null)}>{csv.result.applied ? 'Close' : 'Discard'}</ActionButton>
                  {!csv.result.applied && (
                    <ActionButton tone="primary" disabled={!csv.result.valid || csv.busy} onClick={applyCsv}>
                      {csv.busy ? 'Applying…' : `Apply ${csv.result.valid} rows`}
                    </ActionButton>
                  )}
                </div>
              </div>
              <div className="max-h-72 overflow-auto border border-obsidian/10" data-lenis-prevent>
                <table className="w-full text-sm">
                  <caption className="sr-only">CSV check results</caption>
                  <thead className="sticky top-0 bg-pearl">
                    <tr>{['Line', 'SKU', 'Quantity', 'Current', 'Reserved', 'Result'].map((h) => <th key={h} scope="col" className="px-3 py-2 text-left meta text-[0.58rem] text-slate">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {csv.result.rows.map((r) => (
                      <tr key={r.line} className="border-t border-obsidian/[0.06]">
                        <td className="px-3 py-2 tabular-nums text-slate">{r.line}</td>
                        <td className="px-3 py-2 tabular-nums">{r.sku}</td>
                        <td className="px-3 py-2 tabular-nums">{r.qty}</td>
                        <td className="px-3 py-2 tabular-nums text-slate">{r.previous ?? '—'}</td>
                        <td className="px-3 py-2 tabular-nums text-slate">{r.reserved ?? '—'}</td>
                        <td className="px-3 py-2">{r.error ? <span className="text-xs text-danger">{r.error}</span> : <StatusBadge status="ok" tone="good" label={csv.result!.applied ? 'Applied' : 'Valid'} />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>

        <div className="grid gap-px self-start border border-obsidian/10 bg-obsidian/10 lg:col-span-5">
          {([
            { key: 'API', icon: Network, title: 'API integration', body: 'Push stock and price changes as they happen from your own system.' },
            { key: 'EDI', icon: Cable, title: 'EDI feed', body: 'Exchange inventory (846) and order documents through your existing EDI provider.' },
          ] as const).map((c) => {
            const live = integration === c.key
            return (
              <article key={c.key} className="bg-ivory/80 p-6">
                <div className="flex items-start justify-between gap-4">
                  <c.icon className="size-5 text-gold-deep" strokeWidth={1.3} aria-hidden />
                  {live ? <StatusBadge status={feed.status} /> : <StatusBadge status="available" tone="muted" label="Available on request" />}
                </div>
                <h3 className="mt-5 font-display text-2xl">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{c.body}</p>
                {live && (
                  <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-obsidian/[0.08] pt-4 text-sm">
                    <div><dt className="meta text-[0.58rem] text-slate">Last sync</dt><dd className="mt-1 tabular-nums">{dateTime(feed.lastSync)}</dd></div>
                    <div><dt className="meta text-[0.58rem] text-slate">Feed age</dt><dd className={cn('mt-1 tabular-nums', feedLate && 'text-danger')}>{dur(feedAge)}</dd></div>
                  </dl>
                )}
                <p className="mt-4 text-xs text-slate">Set up with the Price-Select team; contact us to connect.</p>
              </article>
            )
          })}
          <article className="flex items-start gap-4 bg-ivory/80 p-6">
            <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-gold-deep" strokeWidth={1.3} aria-hidden />
            <p className="text-sm leading-relaxed text-slate">
              No integration? Manual edits and CSV uploads count as updates. Current connection: <span className="text-obsidian">{integration}</span>
              {feedLate && <span className="text-danger"> · last update {dur(feedAge)} ago, past the {targetText(inventoryTarget)} target</span>}.
            </p>
          </article>
        </div>
      </div>
    </>
  )
}
