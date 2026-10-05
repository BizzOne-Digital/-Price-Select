'use client'

import { Download } from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { orders, returnCases } from '@/lib/data/operations'
import { products } from '@/lib/data/products'
import { suppliers } from '@/lib/data/suppliers'
import { categoryName } from '@/lib/data/categories'
import { customerName, productName, supplierName } from './data'

type Cell = string | number | undefined
const csv = (rows: Cell[][]) => rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')

const REPORTS: { key: string; title: string; detail: string; build: () => Cell[][] }[] = [
  {
    key: 'sales',
    title: 'Sales',
    detail: 'Every order with totals, payment status and customer.',
    build: () => [['Order', 'Placed', 'Customer', 'Status', 'Payment', 'Subtotal', 'Shipping', 'Discount', 'Total'], ...orders.map((o) => [o.id, o.placedAt, customerName(o.customerId), o.status, o.payment, o.subtotal, o.shipping, o.discount, o.total])],
  },
  {
    key: 'suppliers',
    title: 'Suppliers',
    detail: 'Status, integration, feed health and performance metrics.',
    build: () => [
      ['Supplier', 'Status', 'Integration', 'Feed', 'Last sync', 'Ack hours', 'Tracking %', 'Fulfillment %', 'Response hours', 'Return %'],
      ...suppliers.map((s) => [s.name, s.status, s.integration, s.feed.status, s.feed.lastSync, s.metrics.acknowledgmentHours, s.metrics.trackingCompliance, s.metrics.fulfillmentRate, s.metrics.responseHours, s.metrics.returnRate]),
    ],
  },
  {
    key: 'inventory',
    title: 'Inventory',
    detail: 'Catalog by SKU with stock status, quantity and listing status.',
    build: () => [['SKU', 'Product', 'Category', 'Supplier', 'Stock status', 'Quantity', 'Price', 'Listing'], ...products.map((p) => [p.sku, p.name, categoryName(p.category), supplierName(p.supplierId), p.stock, p.stockQty, p.price, p.status])],
  },
  {
    key: 'returns',
    title: 'Returns',
    detail: 'Return, damage and replacement cases with outcomes.',
    build: () => [['Case', 'Order', 'Type', 'Product', 'Supplier', 'Reason', 'Status', 'Opened', 'Supplier responded', 'Outcome'], ...returnCases.map((r) => [r.id, r.orderId, r.type, productName(r.productSlug), supplierName(r.supplierId), r.reason, r.status, r.openedAt, r.supplierRespondedAt, r.outcome])],
  },
  {
    key: 'fulfillment',
    title: 'Order fulfillment',
    detail: 'Each supplier fulfillment with carrier, tracking and blind-ship flag.',
    build: () => [
      ['Fulfillment', 'Order', 'Supplier', 'Status', 'Carrier', 'Tracking', 'Shipping cost', 'Estimated delivery', 'Blind ship'],
      ...orders.flatMap((o) => o.fulfillments.map((f) => [f.id, o.id, supplierName(f.supplierId), f.status, f.carrier, f.tracking, f.shippingCost, f.estimatedDelivery, f.blindShip ? 'yes' : 'no'])),
    ],
  },
]

export function ReportCards() {
  const toast = useToast()
  const download = (r: (typeof REPORTS)[number]) => {
    const rows = r.build()
    const url = URL.createObjectURL(new Blob([csv(rows)], { type: 'text/csv;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `price-select-${r.key}-demo.csv` })
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: `${r.title} report downloaded`, body: `${rows.length - 1} rows from demonstration data.` })
  }
  return (
    <ul className="grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2 xl:grid-cols-3">
      {REPORTS.map((r, i) => (
        <li key={r.key} className="group flex flex-col bg-[#f6f3ed] p-6 md:p-8">
          <p className="meta text-[0.6rem] text-gold-deep">{String(i + 1).padStart(2, '0')} — CSV</p>
          <h2 className="mt-6 font-display text-4xl font-light tracking-[-0.02em]">{r.title}</h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-slate">{r.detail}</p>
          <p className="mt-6 meta text-[0.58rem] text-slate/80">{r.build().length - 1} rows · {r.build()[0].length} columns</p>
          <button onClick={() => download(r)} className="mt-4 inline-flex h-11 items-center justify-between border-t border-obsidian/15 pt-1 text-[0.66rem] font-semibold uppercase tracking-[0.16em] transition-colors hover:text-gold-deep">
            Download CSV <Download className="size-4 transition-transform group-hover:translate-y-0.5" strokeWidth={1.4} />
          </button>
        </li>
      ))}
      <li className="flex flex-col justify-end bg-obsidian p-6 text-ivory md:p-8">
        <p className="eyebrow text-champagne/80">Scheduled reports</p>
        <p className="mt-4 text-sm leading-relaxed text-ivory/60">Scheduled email delivery and date-range filters arrive with the reporting integration. Exports here use demonstration records.</p>
      </li>
    </ul>
  )
}
