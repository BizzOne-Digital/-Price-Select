import type { Metadata } from 'next'
import type { Fulfillment, Order } from '@/lib/types'
import { customers, orders, returnCases, tickets } from '@/lib/data/operations'
import { products } from '@/lib/data/products'
import { getSupplier, suppliers } from '@/lib/data/suppliers'

// Derived figures for the operations console. Everything here is computed from the demonstration
// records in lib/data, so swapping lib/data for an API keeps these views honest.

/** Fixed "as of" moment for the demonstration snapshot (keeps server and client renders identical). */
export const NOW = new Date('2026-10-06T18:00:00Z').getTime()
const H = 3_600_000
/** Placeholder thresholds mirroring SERVICE_TARGETS (1 business day ≈ 24 h, tracking 24 h). To be agreed with suppliers. */
export const TARGET_HOURS = { ack: 24, tracking: 24, response: 24 }

export const adminMeta = (title: string, description: string, path: string): Metadata => ({
  title,
  description,
  alternates: { canonical: path },
  robots: { index: false, follow: false },
})

export const supplierName = (id: string) => getSupplier(id)?.name ?? id
export const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? id
export const productName = (slug: string) => products.find((p) => p.slug === slug)?.name ?? slug
export const hoursSince = (iso: string) => (NOW - new Date(iso).getTime()) / H

const OPEN_CASE = new Set(['open', 'awaiting_supplier', 'approved', 'in_transit', 'escalated'])
export const isOpenCase = (s: string) => OPEN_CASE.has(s)

export const stats = {
  sales: orders.filter((o) => o.status !== 'canceled').reduce((s, o) => s + o.total, 0),
  orders: orders.length,
  customers: customers.length,
  suppliers: suppliers.filter((s) => s.status === 'approved').length,
  products: products.length,
  pending: orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length,
  returns: returnCases.length,
  refunds: orders.filter((o) => o.payment === 'refunded' || o.payment === 'partially_refunded').length,
  openCases: tickets.filter((t) => isOpenCase(t.status)).length + returnCases.filter((r) => isOpenCase(r.status)).length,
  productsPending: products.filter((p) => p.status === 'pending_review' || p.status === 'flagged').length,
  suppliersPending: suppliers.filter((s) => s.status === 'applied' || s.status === 'under_review').length,
}

type Flag = { order: Order; f: Fulfillment; reason: string }
const live = (f: Fulfillment) => !['delivered', 'canceled', 'returned'].includes(f.status)

/** System monitoring rules (demonstration thresholds). */
export function monitoring() {
  const delayed: Flag[] = []
  const tracking: Flag[] = []
  for (const order of orders)
    for (const f of order.fulfillments) {
      if (!live(f)) continue
      const placedH = hoursSince(order.placedAt)
      const lastH = hoursSince(f.history[f.history.length - 1].at)
      if (f.status === 'pending' && placedH > TARGET_HOURS.ack) delayed.push({ order, f, reason: `Not acknowledged after ${Math.round(placedH)} h` })
      else if (new Date(f.estimatedDelivery).getTime() < NOW) delayed.push({ order, f, reason: 'Past estimated delivery' })
      if (f.status === 'shipped' && !f.tracking) tracking.push({ order, f, reason: 'Shipped without tracking' })
      else if (f.status === 'processing' && !f.tracking && lastH > TARGET_HOURS.tracking) tracking.push({ order, f, reason: `Processing ${Math.round(lastH)} h, no tracking yet` })
    }
  const cases = [
    ...returnCases.filter((r) => isOpenCase(r.status)).map((r) => ({ id: r.id, href: '/admin/returns', label: `${r.reason} · ${r.orderId}`, status: r.status as string, overdue: !r.supplierRespondedAt && hoursSince(r.openedAt) > TARGET_HOURS.response })),
    ...tickets.filter((t) => isOpenCase(t.status)).map((t) => ({ id: t.id, href: '/admin/support', label: t.subject, status: t.status as string, overdue: new Date(t.slaDue).getTime() < NOW })),
  ]
  const feeds = suppliers.filter((s) => s.status === 'approved').map((s) => ({ s, hours: hoursSince(s.feed.lastSync) }))
  return { delayed, tracking, cases, feeds }
}

/** Revenue and units per product / supplier, from demonstration order lines. */
export function lineTotals() {
  const byProduct = new Map<string, { name: string; units: number; revenue: number }>()
  const bySupplier = new Map<string, { gross: number; shipping: number; orders: Set<string> }>()
  for (const o of orders) {
    if (o.status === 'canceled') continue
    for (const f of o.fulfillments) {
      const s = bySupplier.get(f.supplierId) ?? { gross: 0, shipping: 0, orders: new Set() }
      s.shipping += f.shippingCost
      s.orders.add(o.id)
      for (const l of f.lines) {
        const p = byProduct.get(l.productSlug) ?? { name: l.name, units: 0, revenue: 0 }
        p.units += l.qty
        p.revenue += l.qty * l.unitPrice
        byProduct.set(l.productSlug, p)
        s.gross += l.qty * l.unitPrice
      }
      bySupplier.set(f.supplierId, s)
    }
  }
  return { byProduct, bySupplier }
}

/** Orders that include a product — used for "notify affected customers". */
export const ordersWithProduct = (slug: string) => orders.filter((o) => o.fulfillments.some((f) => f.lines.some((l) => l.productSlug === slug)))
