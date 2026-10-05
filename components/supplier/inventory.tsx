'use client'

import { Cable, FileSpreadsheet, Network, Upload } from 'lucide-react'
import { useState } from 'react'
import type { StockStatus } from '@/lib/types'
import { STOCK_LABEL } from '@/lib/data/products'
import { cn } from '@/lib/utils'
import { ActionButton, DataTable, DemoBanner, PageHeader, Panel, StatusBadge } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { DEMO_NOW, hoursBetween, myProducts, parseCsv, supplier } from './data'
import { dateTime, dur } from './ui'

const statusFor = (qty: number, base: StockStatus): StockStatus => (base === 'made_to_order' ? base : qty <= 0 ? 'out_of_stock' : qty < 10 ? 'low_stock' : 'in_stock')
type CsvRow = { line: number; sku: string; qty: string; error?: string }
const TEMPLATE = `data:text/csv;charset=utf-8,${encodeURIComponent(['sku,quantity', ...myProducts.map((p) => `${p.sku},${p.stockQty}`)].join('\n'))}`

export function SupplierInventory() {
  const toast = useToast()
  const [saved, setSaved] = useState<Record<string, number>>(() => Object.fromEntries(myProducts.map((p) => [p.sku, p.stockQty])))
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(myProducts.map((p) => [p.sku, String(p.stockQty)])))
  const [csv, setCsv] = useState<{ name: string; rows: CsvRow[]; error?: string } | null>(null)
  const dirty = myProducts.filter((p) => draft[p.sku] !== String(saved[p.sku]))
  const invalid = dirty.filter((p) => !/^\d{1,6}$/.test(draft[p.sku]))

  const save = () => {
    setSaved((s) => ({ ...s, ...Object.fromEntries(dirty.map((p) => [p.sku, Number(draft[p.sku])])) }))
    toast({ title: `${dirty.length} stock level${dirty.length === 1 ? '' : 's'} saved (demo)`, body: 'Storefront availability would update on the next sync.' })
  }

  const readCsv = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 1_000_000) return setCsv({ name: file.name, rows: [], error: 'File is larger than 1 MB.' })
    const table = parseCsv(await file.text())
    const [head, ...body] = table
    const h = (head ?? []).map((c) => c.toLowerCase())
    const si = h.indexOf('sku')
    const qi = h.findIndex((c) => c === 'quantity' || c === 'qty' || c === 'stock')
    if (si < 0 || qi < 0) return setCsv({ name: file.name, rows: [], error: 'Header row must include "sku" and "quantity" columns.' })
    const seen = new Set<string>()
    const rows = body.map((r, i): CsvRow => {
      const sku = (r[si] ?? '').toUpperCase()
      const qty = r[qi] ?? ''
      let error: string | undefined
      if (!myProducts.some((p) => p.sku === sku)) error = 'SKU not in your catalog'
      else if (!/^\d{1,6}$/.test(qty)) error = 'Quantity must be a whole number'
      else if (seen.has(sku)) error = 'Duplicate SKU in file'
      seen.add(sku)
      return { line: i + 2, sku: sku || '—', qty: qty || '—', error }
    })
    setCsv({ name: file.name, rows, error: rows.length ? undefined : 'No data rows found.' })
  }

  const valid = csv?.rows.filter((r) => !r.error) ?? []
  const applyCsv = () => {
    const patch = Object.fromEntries(valid.map((r) => [r.sku, Number(r.qty)]))
    setSaved((s) => ({ ...s, ...patch }))
    setDraft((s) => ({ ...s, ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) }))
    toast({ title: `${valid.length} row${valid.length === 1 ? '' : 's'} applied (demo)`, body: `${csv!.rows.length - valid.length} row(s) skipped with errors.` })
    setCsv(null)
  }

  const feedAge = hoursBetween(supplier.feed.lastSync, DEMO_NOW)

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Inventory"
        description="Keep availability accurate. Inventory updates at least daily (placeholder target), more often where an API or EDI feed is connected."
        actions={<ActionButton tone="primary" disabled={!dirty.length || invalid.length > 0} onClick={save}>{dirty.length ? `Save ${dirty.length} change${dirty.length === 1 ? '' : 's'}` : 'No changes'}</ActionButton>}
      />
      <DemoBanner>Sample stock levels. Saves and uploads stay in this browser session.</DemoBanner>

      <Panel title="Stock levels" action={<span className="meta text-[0.6rem] text-slate">Last feed sync {dateTime(supplier.feed.lastSync)}</span>} pad={false}>
        <DataTable
          caption="Stock levels for your products"
          rows={myProducts}
          rowKey={(p) => p.sku}
          columns={[
            { key: 'p', header: 'Product', sort: (p) => p.name, cell: (p) => <span><span className="block font-medium">{p.name}</span><span className="block text-xs tabular-nums text-slate">{p.sku}</span></span> },
            { key: 'saved', header: 'Saved', align: 'right', cell: (p) => saved[p.sku] },
            {
              key: 'qty',
              header: 'On hand',
              cell: (p) => {
                const bad = !/^\d{1,6}$/.test(draft[p.sku])
                const changed = draft[p.sku] !== String(saved[p.sku])
                return (
                  <label className="flex items-center gap-3">
                    <span className="sr-only">On-hand quantity for {p.name}</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={draft[p.sku]}
                      onChange={(e) => setDraft((s) => ({ ...s, [p.sku]: e.target.value }))}
                      aria-invalid={bad}
                      className={cn('h-10 w-24 border bg-ivory px-3 text-right tabular-nums focus:border-gold focus:outline-none', bad ? 'border-danger' : changed ? 'border-gold' : 'border-obsidian/15')}
                    />
                    {changed && !bad && <span className="meta text-[0.58rem] text-gold-deep">{Number(draft[p.sku]) - saved[p.sku] > 0 ? '+' : ''}{Number(draft[p.sku]) - saved[p.sku]}</span>}
                    {bad && <span className="text-xs text-danger">Whole number</span>}
                  </label>
                )
              },
            },
            { key: 'st', header: 'Availability', cell: (p) => { const s = statusFor(Number(draft[p.sku]) || 0, p.stock); return <StatusBadge status={s} label={STOCK_LABEL[s]} /> } },
            { key: 'h', header: 'Handling', align: 'right', cell: (p) => `${p.handlingDays} days` },
          ]}
        />
      </Panel>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <Panel title="CSV upload" className="self-start lg:col-span-7" action={<a href={TEMPLATE} download="price-select-inventory-template.csv" className="link-line meta text-[0.6rem] text-slate hover:text-obsidian">Download template</a>}>
          <label className="group flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-obsidian/20 px-4 py-6 text-center transition-colors hover:border-gold focus-within:border-gold">
            <Upload className="size-5 text-gold-deep" strokeWidth={1.4} aria-hidden />
            <span className="text-sm">{csv ? csv.name : 'Choose a CSV file'}</span>
            <span className="text-xs text-slate">Columns: sku, quantity · one row per SKU · parsed in your browser</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { readCsv(e.target.files?.[0]); e.target.value = '' }} />
          </label>

          {!csv && (
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <p className="text-xs leading-relaxed text-slate">Rows are matched to SKUs in your catalog only. Unknown SKUs, duplicates and non-numeric quantities are flagged before anything is applied.</p>
              <pre className="border border-obsidian/10 bg-pearl/60 px-4 py-3 text-xs leading-relaxed tabular-nums text-obsidian/80">{`sku,quantity
${myProducts[0]?.sku},25`}</pre>
            </div>
          )}
          {csv?.error && <p className="mt-4 text-sm text-danger" role="alert">{csv.error}</p>}
          {csv && csv.rows.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm"><span className="font-medium">{valid.length}</span> valid · <span className={cn(csv.rows.length - valid.length && 'text-danger')}>{csv.rows.length - valid.length} with errors</span></p>
                <div className="flex gap-2">
                  <ActionButton tone="ghost" onClick={() => setCsv(null)}>Discard</ActionButton>
                  <ActionButton tone="primary" disabled={!valid.length} onClick={applyCsv}>Apply {valid.length} rows</ActionButton>
                </div>
              </div>
              <div className="max-h-72 overflow-auto border border-obsidian/10" data-lenis-prevent>
                <table className="w-full text-sm">
                  <caption className="sr-only">CSV preview</caption>
                  <thead className="sticky top-0 bg-pearl">
                    <tr>{['Line', 'SKU', 'Quantity', 'Result'].map((h) => <th key={h} scope="col" className="px-3 py-2 text-left meta text-[0.58rem] text-slate">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {csv.rows.map((r) => (
                      <tr key={r.line} className="border-t border-obsidian/[0.06]">
                        <td className="px-3 py-2 tabular-nums text-slate">{r.line}</td>
                        <td className="px-3 py-2 tabular-nums">{r.sku}</td>
                        <td className="px-3 py-2 tabular-nums">{r.qty}</td>
                        <td className="px-3 py-2">{r.error ? <span className="text-xs text-danger">{r.error}</span> : <StatusBadge status="ok" tone="good" label="Valid" />}</td>
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
            { key: 'API', icon: Network, title: 'API integration', body: 'Push stock and price changes as they happen. Price-Select would poll or receive updates from your system.' },
            { key: 'EDI', icon: Cable, title: 'EDI feed', body: 'Exchange inventory (846) and order documents through your existing EDI provider.' },
          ] as const).map((c) => {
            const live = supplier.integration === c.key
            return (
              <article key={c.key} className="bg-ivory/80 p-6">
                <div className="flex items-start justify-between gap-4">
                  <c.icon className="size-5 text-gold-deep" strokeWidth={1.3} aria-hidden />
                  {live ? <StatusBadge status={supplier.feed.status} label={`Concept · ${supplier.feed.status}`} /> : <StatusBadge status="available" tone="muted" label="Available on request" />}
                </div>
                <h3 className="mt-5 font-display text-2xl">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate">{c.body}</p>
                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-obsidian/[0.08] pt-4 text-sm">
                  <div><dt className="meta text-[0.58rem] text-slate">Last sync</dt><dd className="mt-1 tabular-nums">{live ? dateTime(supplier.feed.lastSync) : '—'}</dd></div>
                  <div><dt className="meta text-[0.58rem] text-slate">Feed age</dt><dd className={cn('mt-1 tabular-nums', live && feedAge > 24 && 'text-danger')}>{live ? dur(feedAge) : '—'}</dd></div>
                </dl>
                <p className="mt-4 text-xs text-slate">Credentials issued by Price-Select once connected.</p>
              </article>
            )
          })}
          <article className="flex items-start gap-4 bg-ivory/80 p-6">
            <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-gold-deep" strokeWidth={1.3} aria-hidden />
            <p className="text-sm leading-relaxed text-slate">No integration? Manual edits and daily CSV uploads meet the placeholder update target.</p>
          </article>
        </div>
      </div>
    </>
  )
}
