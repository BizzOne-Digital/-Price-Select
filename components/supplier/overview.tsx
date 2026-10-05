'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { DataTable, DemoBanner, MetricCard, MetricGrid, PageHeader, Panel, StatusBadge } from '@/components/dashboard/kit'
import { money } from '@/lib/format'
import { getProduct } from '@/lib/data/products'
import { cn } from '@/lib/utils'
import { DEMO_NOW, TARGET_HOURS, hoursBetween, myCases, myFulfillments, myProducts, supplier, type MyFulfillment } from './data'
import { LinkButton, dateTime, dur } from './ui'

const ackHours = (f: MyFulfillment['fulfillment']) => {
  const placed = f.history[0]?.at
  const ack = f.history.find((h) => h.status === 'confirmed')?.at
  return placed && ack ? hoursBetween(placed, ack) : null
}

const units = (n: number) => `${n} unit${n === 1 ? '' : 's'}`

type Action = { key: string; title: string; detail: string; href: string; elapsed: number; target: number; targetLabel: string }

export function SupplierOverview() {
  const active = myFulfillments.filter((f) => ['pending', 'confirmed', 'processing'].includes(f.fulfillment.status))
  const shipped = myFulfillments.filter((f) => ['shipped', 'delivered'].includes(f.fulfillment.status))
  const openCases = myCases.filter((c) => ['open', 'awaiting_supplier', 'escalated'].includes(c.status))
  const stockUnits = myProducts.reduce((s, p) => s + p.stockQty, 0)

  const actions: Action[] = [
    ...myFulfillments
      .filter((f) => f.fulfillment.status === 'pending')
      .map((f) => ({ key: f.fulfillment.id, title: `Acknowledge ${f.fulfillment.id}`, detail: `${f.fulfillment.lines.length} line(s) · ship to ${f.shipTo.city}, ${f.shipTo.region}`, href: '/supplier/orders', elapsed: hoursBetween(f.placedAt, DEMO_NOW), target: TARGET_HOURS.acknowledgment, targetLabel: 'Acknowledge within 1 business day' })),
    ...myFulfillments
      .filter((f) => ['confirmed', 'processing', 'shipped'].includes(f.fulfillment.status) && !f.fulfillment.tracking)
      .map((f) => {
        const since = [...f.fulfillment.history].reverse()[0]?.at ?? f.placedAt
        const detail = f.fulfillment.lines.map((l) => l.name).join(', ')
        if (f.fulfillment.status === 'shipped') return { key: f.fulfillment.id, title: `Missing tracking · ${f.fulfillment.id}`, detail, href: '/supplier/orders', elapsed: hoursBetween(since, DEMO_NOW), target: TARGET_HOURS.tracking, targetLabel: 'Tracking within 24 h of dispatch' }
        const days = Math.max(...f.fulfillment.lines.map((l) => getProduct(l.productSlug)?.handlingDays ?? 2))
        return { key: f.fulfillment.id, title: `Dispatch & add tracking · ${f.fulfillment.id}`, detail, href: '/supplier/orders', elapsed: hoursBetween(since, DEMO_NOW), target: days * 24, targetLabel: `Dispatch within handling time (${days} days)` }
      }),
    ...openCases.map((c) => ({ key: c.id, title: `Respond to ${c.id}`, detail: `${c.type === 'damage' ? 'Damage report' : c.type === 'cancellation' ? 'Cancellation request' : 'Case'} — ${c.reason}`, href: '/supplier/returns', elapsed: hoursBetween(c.openedAt, DEMO_NOW), target: TARGET_HOURS.response, targetLabel: 'Respond within 1 business day' })),
  ].sort((a, b) => b.elapsed / b.target - a.elapsed / a.target)

  const feedAge = hoursBetween(supplier.feed.lastSync, DEMO_NOW)

  return (
    <>
      <PageHeader
        eyebrow={supplier.name}
        title="Today’s operations"
        description="Everything routed to your business, in one view. You only see items routed to you."
        actions={
          <>
            <LinkButton href="/supplier/products">New product</LinkButton>
            <LinkButton href="/supplier/orders" tone="primary">Open orders</LinkButton>
          </>
        }
      />
      <DemoBanner>Demonstration environment. Orders, stock and cases are sample records for interface design. Service targets are placeholders to be agreed with suppliers.</DemoBanner>

      <MetricGrid>
        <MetricCard label="Orders routed" value={myFulfillments.length} hint="All time, this account" />
        <MetricCard label="Pending fulfillment" value={active.length} hint="Awaiting dispatch" tone={active.length ? 'warning' : 'default'} />
        <MetricCard label="Shipped" value={shipped.length} hint="Shipped or delivered" />
        <MetricCard label="Products" value={myProducts.length} hint={`${myProducts.filter((p) => p.status === 'published').length} published`} />
        <MetricCard label="Inventory units" value={stockUnits} hint="Across all SKUs" />
        <MetricCard label="Returns & cases" value={myCases.length} hint={`${openCases.length} open`} />
        <MetricCard label="Support issues" value={openCases.length} hint="Needing your response" tone={openCases.length ? 'danger' : 'default'} />
        <MetricCard label="Avg. acknowledgment" value={supplier.metrics.acknowledgmentHours} decimals={1} suffix=" h" hint="Target: 1 business day" />
      </MetricGrid>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <Panel title="Action required" action={<span className="meta text-[0.6rem] text-slate">{actions.length} items · sorted by urgency</span>} pad={false} className="lg:col-span-7">
          {actions.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate">Nothing needs your attention. All routed items are within target.</p>
          ) : (
            <ul>
              {actions.map((a) => {
                const ratio = a.elapsed / a.target
                const tone = ratio >= 1 ? 'bad' : ratio >= 0.6 ? 'warn' : 'info'
                return (
                  <li key={a.key + a.title} className="border-b border-obsidian/[0.06] last:border-0">
                    <Link href={a.href} className="group grid gap-3 px-5 py-4 transition-colors hover:bg-pearl/50 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          {a.title}
                          <ArrowUpRight className="size-3.5 text-slate opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                        </p>
                        <p className="mt-1 truncate text-xs text-slate">{a.detail}</p>
                        <div className="mt-3 h-px max-w-xs bg-obsidian/10" aria-hidden>
                          <div className={cn('h-px', tone === 'bad' ? 'bg-danger' : tone === 'warn' ? 'bg-warning' : 'bg-gold')} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
                        <StatusBadge status={tone} tone={tone} label={ratio >= 1 ? `Over by ${dur(a.elapsed - a.target)}` : `${dur(a.target - a.elapsed)} left`} />
                        <span className="meta text-[0.58rem] text-slate">{a.targetLabel}</span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Inventory feed" action={<StatusBadge status={supplier.feed.status} />} className="lg:col-span-5">
          <dl className="grid grid-cols-2 gap-px border border-obsidian/10 bg-obsidian/10">
            {[
              ['Connection', `${supplier.integration} (concept)`],
              ['Last sync', dateTime(supplier.feed.lastSync)],
              ['Feed age', dur(feedAge)],
              ['SKUs in feed', String(myProducts.length)],
            ].map(([k, v]) => (
              <div key={k} className="bg-ivory/80 p-4">
                <dt className="meta text-[0.6rem] text-slate">{k}</dt>
                <dd className="mt-2 text-sm tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 flex items-start gap-3 text-xs leading-relaxed text-slate">
            <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', feedAge <= 24 ? 'bg-success' : 'bg-warning')} aria-hidden />
            {feedAge <= 24 ? 'Within the daily update target (placeholder).' : 'Older than the daily update target (placeholder). Upload a CSV or update stock manually.'}
          </p>
          <Link href="/supplier/inventory" className="link-line link-line--static mt-6 eyebrow text-obsidian">
            Manage inventory
          </Link>
        </Panel>
      </div>

      <div className="mt-8">
        <Panel title="Recent fulfillments" action={<Link href="/supplier/orders" className="link-line meta text-[0.6rem] text-slate hover:text-obsidian">View all</Link>} pad={false}>
          <DataTable
            caption="Recent fulfillments routed to you"
            rows={[...myFulfillments].sort((a, b) => b.placedAt.localeCompare(a.placedAt))}
            rowKey={(r) => r.fulfillment.id}
            columns={[
              { key: 'id', header: 'Fulfillment', cell: (r) => <span className="font-medium tabular-nums">{r.fulfillment.id}</span> },
              { key: 'placed', header: 'Placed', cell: (r) => <span className="text-slate">{dateTime(r.placedAt)}</span>, sort: (r) => r.placedAt },
              { key: 'items', header: 'Items', cell: (r) => <span className="text-slate">{units(r.fulfillment.lines.reduce((s, l) => s + l.qty, 0))}</span> },
              { key: 'ship', header: 'Ship to', cell: (r) => <span className="text-slate">{r.shipTo.city}, {r.shipTo.region}</span> },
              { key: 'ack', header: 'Ack time', cell: (r) => { const h = ackHours(r.fulfillment); return h === null ? <span className="text-slate">—</span> : <span className={h <= TARGET_HOURS.acknowledgment ? 'text-success' : 'text-danger'}>{dur(h)}</span> } },
              { key: 'value', header: 'Value', align: 'right', cell: (r) => money(r.fulfillment.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)) },
              { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.fulfillment.status} /> },
            ]}
          />
        </Panel>
      </div>
    </>
  )
}
