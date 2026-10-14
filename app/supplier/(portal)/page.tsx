import type { Metadata } from 'next'
import { SupplierOverview, type Action } from '@/components/supplier/overview'
import { ackDeadlines, loadTargets, supplierContext } from '@/components/supplier/server'
import { targetText, OPEN_CASE } from '@/components/supplier/data'
import { supplierDashboard, deadline } from '@/lib/server/services/metrics'
import { myFulfillments } from '@/lib/server/services/operations'
import { myProducts } from '@/lib/server/services/products'
import { listCases } from '@/lib/server/services/cases'
import { addTarget } from '@/lib/server/pricing'

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Supplier operations overview: routed orders, pending fulfillment, inventory feed status and items needing action.',
  alternates: { canonical: '/supplier' },
}

export default async function SupplierHome() {
  const ctx = await supplierContext()
  if (!ctx) return null
  const { actor, supplier } = ctx
  const [dash, fulfillments, products, cases, { settings, targets }] = await Promise.all([supplierDashboard(actor.supplierId), myFulfillments(actor), myProducts(actor), listCases(actor), loadTargets()])
  const ack = ackDeadlines(settings, fulfillments)
  const handling = new Map(products.map((p) => [p.slug, p.handlingDays]))
  const cal = settings.targets.calendar
  const openCases = cases.filter((c) => (OPEN_CASE as readonly string[]).includes(c.status))

  const actions: Action[] = [
    ...fulfillments
      .filter((f) => f.fulfillment.status === 'pending')
      .map((f) => ({ key: f.fulfillment.id, title: `Acknowledge ${f.fulfillment.id}`, detail: `${f.fulfillment.lines.length} line(s) · ship to ${f.shipTo.city}, ${f.shipTo.region}`, href: '/supplier/orders', start: ack[f.fulfillment.id].routed, due: ack[f.fulfillment.id].due, targetLabel: `Acknowledge within ${targetText(targets.ack)}` })),
    ...fulfillments
      .filter((f) => ['confirmed', 'processing'].includes(f.fulfillment.status) && !f.fulfillment.tracking)
      .map((f) => {
        const days = Math.max(0, ...f.fulfillment.lines.map((l) => handling.get(l.productSlug) ?? 0))
        const start = f.fulfillment.acknowledgedAt ?? ack[f.fulfillment.id].routed
        return { key: f.fulfillment.id, title: `Dispatch & add tracking · ${f.fulfillment.id}`, detail: f.fulfillment.lines.map((l) => l.name).join(', '), href: '/supplier/orders', start, due: addTarget(new Date(start), Math.max(days, 1), 'business_days', cal).toISOString(), targetLabel: `Dispatch within handling time (${days} business day${days === 1 ? '' : 's'})` }
      }),
    ...openCases.map((c) => ({ key: c.id, title: `Respond to ${c.id}`, detail: `${c.type === 'damage' ? 'Damage report' : c.type === 'cancellation' ? 'Cancellation request' : 'Case'} — ${c.reason}`, href: '/supplier/returns', start: c.openedAt, due: deadline(settings, 'response', new Date(c.openedAt)).toISOString(), targetLabel: `Respond within ${targetText(targets.response)}` })),
  ]
  const inv = settings.targets.items.find((t) => t.key === 'inventory')!
  const feedDue = addTarget(new Date(supplier.feed.lastSync), inv.amount, inv.unit, cal).toISOString()

  return (
    <SupplierOverview
      supplier={{ name: supplier.name, integration: supplier.integration, feed: supplier.feed }}
      asOf={dash.asOf}
      dash={{ metrics: dash.metrics, awaitingAck: dash.awaitingAck, overdueAck: dash.overdueAck, open: dash.open }}
      fulfillments={fulfillments}
      ack={ack}
      products={products.map((p) => ({ status: p.status, available: p.inventory.available }))}
      cases={{ total: cases.length, open: openCases.length }}
      actions={actions}
      targets={targets}
      feedDue={feedDue}
    />
  )
}
