import 'server-only'
import { HttpError } from '../http'
import type { Actor } from '../auth'
import { db } from '../db'
import { Category, Product } from '../models/catalog'
import { Supplier } from '../models/network'
import { Case, Order, type OrderDoc } from '../models/orders'
import { audit, dollars, iso } from './common'
import { supplierMetrics } from './metrics'
import { namesFor } from './users'

type Cell = string | number | boolean | null | undefined

/**
 * CSV encoding with spreadsheet formula-injection protection: any cell starting with = + - @ tab
 * or CR is prefixed with an apostrophe so it is shown as text instead of executed.
 */
export function toCsv(rows: Cell[][]) {
  const cell = (v: Cell) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@\t\r]/.test(s) && !(typeof v === 'number')) s = `'${s}`
    return `"${s.replace(/"/g, '""')}"`
  }
  return rows.map((r) => r.map(cell).join(',')).join('\r\n')
}

export const REPORT_KEYS = ['sales', 'suppliers', 'inventory', 'returns', 'fulfillment'] as const
export type ReportKey = (typeof REPORT_KEYS)[number]

export async function buildReport(actor: Actor, key: ReportKey, range: { from?: Date; to?: Date }): Promise<Cell[][]> {
  if (actor.role !== 'admin') throw new HttpError(403, 'forbidden', 'Reports are available to administrators only.')
  await db()
  const placed = range.from || range.to ? { placedAt: { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) } } : {}
  const opened = range.from || range.to ? { openedAt: { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lte: range.to } : {}) } } : {}
  let rows: Cell[][]
  if (key === 'sales') {
    const os = await Order.find(placed).sort({ placedAt: -1 }).limit(50_000).lean<OrderDoc[]>()
    const names = await namesFor(os.map((o) => o.customerUserId))
    rows = [
      ['Order', 'Placed', 'Customer', 'Email', 'Status', 'Payment', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total', 'Captured', 'Refunded'],
      ...os.map((o) => [o.number, iso(o.placedAt), o.customerUserId ? names.get(o.customerUserId) : 'Guest', o.email, o.status, o.paymentStatus, dollars(o.totals?.subtotalCents), dollars(o.totals?.discountCents), dollars(o.totals?.shippingCents), dollars(o.totals?.taxCents), dollars(o.totals?.totalCents), dollars(o.payment?.capturedCents), dollars(o.payment?.refundedCents)]),
    ]
  } else if (key === 'suppliers') {
    const ss = await Supplier.find().sort({ name: 1 }).lean()
    const m = await supplierMetrics(ss.map((s) => String(s._id)))
    rows = [
      ['Supplier', 'Code', 'Status', 'Integration', 'Feed', 'Last sync', 'Ack hours', 'Tracking %', 'Fulfillment %', 'Response hours', 'Return %'],
      ...ss.map((s) => {
        const x = m.get(String(s._id))!
        return [s.name, s.code, s.status, s.integration, s.feed?.status, iso(s.feed?.lastSync), x.acknowledgmentHours, x.trackingCompliance, x.fulfillmentRate, x.responseHours, x.returnRate]
      }),
    ]
  } else if (key === 'inventory') {
    const [ps, cats, ss] = await Promise.all([Product.find().sort({ sku: 1 }).limit(50_000).lean(), Category.find({}, { slug: 1, name: 1 }).lean(), Supplier.find({}, { name: 1 }).lean()])
    const cn = new Map(cats.map((c) => [c.slug, c.name]))
    const sn = new Map(ss.map((s) => [String(s._id), s.name]))
    rows = [
      ['SKU', 'Product', 'Category', 'Supplier', 'On hand', 'Reserved', 'Available', 'Made to order', 'Price', 'Listing'],
      ...ps.map((p) => [p.sku, p.name, cn.get(p.category) ?? p.category, sn.get(String(p.supplier)), p.inventory?.onHand ?? 0, p.inventory?.reserved ?? 0, Math.max(0, (p.inventory?.onHand ?? 0) - (p.inventory?.reserved ?? 0)), p.madeToOrder ? 'yes' : 'no', dollars(p.priceCents), p.status]),
    ]
  } else if (key === 'returns') {
    const cs = await Case.find({ kind: 'return', ...opened }).sort({ openedAt: -1 }).limit(50_000).lean()
    const ss = await Supplier.find({}, { name: 1 }).lean()
    const sn = new Map(ss.map((s) => [String(s._id), s.name]))
    rows = [
      ['Case', 'Order', 'Type', 'Items', 'Supplier', 'Reason', 'Status', 'Opened', 'Supplier responded', 'Outcome', 'Refund', 'Refund status'],
      ...cs.map((c) => [c.number, c.orderNumber, c.type, c.lines.map((l) => `${l.qty} x ${l.name}`).join('; '), sn.get(String(c.supplier)), c.reason, c.status, iso(c.openedAt), iso(c.supplierRespondedAt), c.resolution?.outcome, dollars(c.resolution?.refundCents), c.resolution?.refundStatus]),
    ]
  } else {
    const os = await Order.find({ ...placed, paymentStatus: { $nin: ['pending', 'failed'] } }).sort({ placedAt: -1 }).limit(50_000).lean<OrderDoc[]>()
    rows = [
      ['Fulfillment', 'Order', 'Supplier', 'Status', 'Carrier', 'Tracking', 'Shipping cost', 'Estimated delivery', 'Acknowledged', 'Shipped', 'Delivered', 'Blind ship'],
      ...os.flatMap((o) => o.fulfillments.map((f) => [f.fid, o.number, f.supplierName, f.status, f.carrier, f.tracking, dollars(f.shippingCents), iso(f.estimatedDelivery), iso(f.acknowledgedAt), iso(f.shippedAt), iso(f.deliveredAt), f.blindShip ? 'yes' : 'no'])),
    ]
  }
  await audit(actor, 'report.export', { type: 'report', id: key }, `Exported ${key} report (${rows.length - 1} rows)`, { from: range.from?.toISOString(), to: range.to?.toISOString() })
  return rows
}
