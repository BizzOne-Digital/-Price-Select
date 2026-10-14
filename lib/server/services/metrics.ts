import 'server-only'
import { assertCan, type Actor } from '../auth'
import { db } from '../db'
import { Category, Product } from '../models/catalog'
import { Supplier } from '../models/network'
import { Case, Order, type OrderDoc } from '../models/orders'
import { addTarget } from '../pricing'
import { dollars, iso } from './common'
import { getSettings, type SettingsData } from './settings'
import { users } from './users'

// Dashboard figures computed from stored records at request time. No demonstration series.
// ponytail: metrics scan a bounded window of recent orders in memory (fine at SMB volume);
// move to pre-aggregated daily rollups if order volume grows past ~50k per window.

const WINDOW_DAYS = 180
const H = 3_600_000
const PAID = ['authorized', 'captured', 'partially_refunded', 'refunded'] as const

const routedAt = (f: OrderDoc['fulfillments'][number]) => f.history.find((h) => h.status === 'pending')?.at ?? null

export function targetHours(s: SettingsData, key: 'ack' | 'tracking' | 'response' | 'inventory') {
  return s.targets.items.find((t) => t.key === key)!
}

export function deadline(s: SettingsData, key: 'ack' | 'tracking' | 'response', from: Date) {
  const t = targetHours(s, key)
  return addTarget(from, t.amount, t.unit as 'hours', s.targets.calendar)
}

async function recentOrders(filter: Record<string, unknown> = {}) {
  return Order.find({ placedAt: { $gte: new Date(Date.now() - WINDOW_DAYS * 86_400_000) }, paymentStatus: { $in: PAID }, ...filter }).limit(20_000).lean<OrderDoc[]>()
}

export type SupplierMetrics = { acknowledgmentHours: number; trackingCompliance: number; fulfillmentRate: number; responseHours: number; returnRate: number }

/** Per-supplier performance from fulfillments and cases (last 180 days). */
export async function supplierMetrics(ids: string[]): Promise<Map<string, SupplierMetrics>> {
  await db()
  const [orders, cases] = await Promise.all([recentOrders({ 'fulfillments.supplier': { $in: ids } }), Case.find({ supplier: { $in: ids }, openedAt: { $gte: new Date(Date.now() - WINDOW_DAYS * 86_400_000) } }, { supplier: 1, openedAt: 1, supplierRespondedAt: 1, kind: 1 }).lean()])
  const acc = new Map(ids.map((id) => [id, { ack: [] as number[], tracked: 0, shipped: 0, routed: 0, canceled: 0, delivered: 0, resp: [] as number[], returns: 0 }]))
  for (const o of orders)
    for (const f of o.fulfillments) {
      const a = acc.get(String(f.supplier))
      if (!a) continue
      const r = routedAt(f)
      if (!r) continue
      a.routed++
      if (f.status === 'canceled') a.canceled++
      if (f.acknowledgedAt) a.ack.push((new Date(f.acknowledgedAt).getTime() - new Date(r).getTime()) / H)
      // Dispatch time is not reported separately from the tracking upload, so compliance is the
      // share of shipped fulfillments that carry carrier tracking.
      if (f.shippedAt) {
        a.shipped++
        if (f.tracking) a.tracked++
      }
      if (f.status === 'delivered' || f.status === 'returned') a.delivered++
    }
  for (const c of cases) {
    const a = acc.get(String(c.supplier))
    if (!a) continue
    if (c.supplierRespondedAt) a.resp.push((new Date(c.supplierRespondedAt).getTime() - new Date(c.openedAt!).getTime()) / H)
    if (c.kind === 'return') a.returns++
  }
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((x, y) => x + y, 0) / xs.length) * 10) / 10 : 0)
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0)
  return new Map(
    [...acc].map(([id, a]) => [id, { acknowledgmentHours: avg(a.ack), trackingCompliance: pct(a.tracked, a.shipped), fulfillmentRate: pct(a.routed - a.canceled, a.routed), responseHours: avg(a.resp), returnRate: pct(a.returns, a.delivered) }]),
  )
}

const OPEN_CASE = ['open', 'awaiting_supplier', 'approved', 'in_transit', 'escalated']

function isoWeekLabel(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return `W${Math.ceil(((t.getTime() - y.getTime()) / 86_400_000 + 1) / 7)}`
}

/** Admin dashboard: headline stats, weekly series, category mix, monitoring warnings. */
export async function adminDashboard(actor: Actor) {
  assertCan(actor, 'admin:orders')
  await db()
  const s = await getSettings()
  const now = Date.now()
  const [orders, allCounts, customers, suppliers, products, cases, cats] = await Promise.all([
    recentOrders(),
    Order.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    (await users()).countDocuments({ $or: [{ role: 'customer' }, { role: { $exists: false } }] }),
    Supplier.find({}, { code: 1, name: 1, status: 1, integration: 1, feed: 1 }).lean(),
    Product.find({}, { status: 1, category: 1 }).lean(),
    Case.find({}, { number: 1, kind: 1, type: 1, status: 1, subject: 1, orderNumber: 1, openedAt: 1, slaDueAt: 1, supplierRespondedAt: 1 }).sort({ openedAt: -1 }).limit(2000).lean(),
    Category.find({}, { slug: 1, name: 1, short: 1 }).lean(),
  ])
  const counts = Object.fromEntries(allCounts.map((c) => [c._id, c.n])) as Record<string, number>
  const net = (o: OrderDoc) => (o.payment?.capturedCents ?? 0) - (o.payment?.refundedCents ?? 0)

  // Weekly series: last 10 ISO weeks, zero-filled.
  const weeks: { label: string; start: number }[] = []
  for (let i = 9; i >= 0; i--) weeks.push({ label: isoWeekLabel(new Date(now - i * 7 * 86_400_000)), start: now - (i + 1) * 7 * 86_400_000 })
  const revenueByWeek = weeks.map((w) => ({ label: w.label, value: dollars(orders.filter((o) => +o.placedAt! > w.start && +o.placedAt! <= w.start + 7 * 86_400_000).reduce((a, o) => a + net(o), 0)) }))
  const ordersByWeek = weeks.map((w) => ({ label: w.label, value: orders.filter((o) => +o.placedAt! > w.start && +o.placedAt! <= w.start + 7 * 86_400_000).length }))

  // Category share and top products from order line snapshots.
  const productCat = new Map(products.map((p) => [String(p._id), p.category]))
  const catName = new Map(cats.map((c) => [c.slug, c.short]))
  const byCat = new Map<string, number>()
  const byProduct = new Map<string, { name: string; units: number; revenue: number }>()
  for (const o of orders)
    for (const f of o.fulfillments) {
      if (f.status === 'canceled') continue
      for (const l of f.lines) {
        const rev = l.unitPriceCents * l.qty - (l.discountCents ?? 0)
        const c = productCat.get(String(l.product)) ?? 'other'
        byCat.set(c, (byCat.get(c) ?? 0) + rev)
        const p = byProduct.get(l.slug ?? '') ?? { name: l.name ?? '', units: 0, revenue: 0 }
        p.units += l.qty
        p.revenue += rev
        byProduct.set(l.slug ?? '', p)
      }
    }
  const catTotal = [...byCat.values()].reduce((a, b) => a + b, 0)
  const byCategory = [...byCat].sort((a, b) => b[1] - a[1]).map(([slug, v]) => ({ label: catName.get(slug) ?? slug, value: catTotal ? Math.round((v / catTotal) * 100) : 0 }))
  const topProducts = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6).map((p) => ({ label: p.name, value: dollars(p.revenue), units: p.units }))

  // Fulfillment performance against configured targets.
  let ackOn = 0, ackN = 0, trkOn = 0, trkN = 0, delOn = 0, delN = 0
  const delayed: { order: string; fid: string; supplier: string; reason: string }[] = []
  const tracking: { order: string; fid: string; supplier: string; reason: string }[] = []
  for (const o of orders)
    for (const f of o.fulfillments) {
      const r = routedAt(f)
      if (!r) continue
      const ackDue = deadline(s, 'ack', new Date(r))
      if (f.acknowledgedAt) (ackN++, new Date(f.acknowledgedAt) <= ackDue && ackOn++)
      if (f.shippedAt) (trkN++, f.tracking && trkOn++)
      if (f.deliveredAt) (delN++, f.estimatedDelivery && new Date(f.deliveredAt) <= new Date(f.estimatedDelivery) && delOn++)
      const live = !['delivered', 'canceled', 'returned'].includes(f.status)
      if (!live) continue
      const sup = f.supplierName ?? ''
      if (f.status === 'pending' && now > +ackDue) delayed.push({ order: o.number, fid: f.fid, supplier: sup, reason: `Not acknowledged ${Math.round((now - +new Date(r)) / H)} h after routing` })
      else if (f.estimatedDelivery && now > +new Date(f.estimatedDelivery)) delayed.push({ order: o.number, fid: f.fid, supplier: sup, reason: 'Past estimated delivery' })
      if (f.status === 'shipped' && !f.tracking) tracking.push({ order: o.number, fid: f.fid, supplier: sup, reason: 'Shipped without tracking' })
      else if (['confirmed', 'processing'].includes(f.status) && f.acknowledgedAt && now > +deadline(s, 'tracking', new Date(f.acknowledgedAt))) tracking.push({ order: o.number, fid: f.fid, supplier: sup, reason: `No tracking ${Math.round((now - +new Date(f.acknowledgedAt)) / H)} h after acknowledgment` })
    }
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

  const openCases = cases.filter((c) => OPEN_CASE.includes(c.status))
  const inv = targetHours(s, 'inventory')
  const feedLimitH = inv.unit === 'hours' ? inv.amount : inv.amount * 24
  const approved = suppliers.filter((x) => x.status === 'approved')
  const feeds = approved.map((x) => {
    const hours = x.feed?.lastSync ? (now - +new Date(x.feed.lastSync)) / H : null
    const status = x.feed?.status === 'failed' ? 'failed' : hours == null || hours > feedLimitH ? 'delayed' : x.feed?.status === 'manual' ? 'manual' : 'healthy'
    return { id: x.code, name: x.name, integration: x.integration ?? 'Manual', status, hours: hours == null ? null : Math.round(hours) }
  })

  return {
    asOf: new Date(now).toISOString(),
    stats: {
      sales: dollars(orders.reduce((a, o) => a + net(o), 0)),
      orders: Object.values(counts).reduce((a, b) => a + b, 0),
      customers,
      suppliers: approved.length,
      suppliersPending: suppliers.filter((x) => x.status === 'applied' || x.status === 'under_review').length,
      products: products.length,
      productsPending: products.filter((p) => p.status === 'pending_review' || p.status === 'flagged').length,
      pending: (counts.pending ?? 0) + (counts.confirmed ?? 0),
      returns: cases.filter((c) => c.kind === 'return').length,
      refunds: orders.filter((o) => (o.payment?.refundedCents ?? 0) > 0).length,
      openCases: openCases.length,
      openReturns: openCases.filter((c) => c.kind === 'return').length,
      openSupport: openCases.filter((c) => c.kind === 'support').length,
      failedPayments: await Order.countDocuments({ paymentStatus: 'failed', placedAt: { $gte: new Date(now - 30 * 86_400_000) } }),
    },
    revenueByWeek,
    ordersByWeek,
    byCategory,
    topProducts,
    returnsByType: Object.entries(cases.filter((c) => c.kind === 'return').reduce<Record<string, number>>((m, c) => ({ ...m, [c.type]: (m[c.type] ?? 0) + 1 }), {})).map(([label, value]) => ({ label: label[0].toUpperCase() + label.slice(1), value })),
    fulfillment: [
      { label: 'Acknowledged on target', value: pct(ackOn, ackN), n: ackN },
      { label: 'Tracking on target', value: pct(trkOn, trkN), n: trkN },
      { label: 'Delivered on estimate', value: pct(delOn, delN), n: delN },
    ],
    monitoring: {
      delayed,
      tracking,
      feeds,
      cases: openCases.slice(0, 50).map((c) => ({ id: c.number, href: c.kind === 'return' ? '/admin/returns' : '/admin/support', label: `${c.subject}${c.orderNumber ? ` · ${c.orderNumber}` : ''}`, status: c.status, overdue: !c.supplierRespondedAt && !!c.slaDueAt && now > +c.slaDueAt })),
    },
    targets: s.targets,
  }
}

/** Supplier portal overview, scoped to one supplier. */
export async function supplierDashboard(supplierId: string) {
  await db()
  const s = await getSettings()
  const m = (await supplierMetrics([supplierId])).get(supplierId)!
  const orders = await recentOrders({ 'fulfillments.supplier': supplierId })
  const mine = orders.flatMap((o) => o.fulfillments.filter((f) => String(f.supplier) === supplierId).map((f) => ({ o, f })))
  const now = Date.now()
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const start = now - (8 - i) * 7 * 86_400_000
    const inWeek = mine.filter(({ o }) => +o.placedAt! > start && +o.placedAt! <= start + 7 * 86_400_000)
    return { label: isoWeekLabel(new Date(start + 7 * 86_400_000)), value: dollars(inWeek.reduce((a, { f }) => a + f.lines.reduce((x, l) => x + l.unitPriceCents * l.qty, 0), 0)), orders: inWeek.length }
  })
  return {
    metrics: m,
    targets: s.targets,
    open: mine.filter(({ f }) => ['pending', 'confirmed', 'processing'].includes(f.status)).length,
    awaitingAck: mine.filter(({ f }) => f.status === 'pending').length,
    overdueAck: mine.filter(({ f }) => f.status === 'pending' && routedAt(f) && now > +deadline(s, 'ack', new Date(routedAt(f)!))).length,
    weekly,
    asOf: iso(new Date(now)),
  }
}
