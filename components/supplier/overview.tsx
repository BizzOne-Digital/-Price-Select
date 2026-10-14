'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { ProductStatus, Supplier, SupplierFulfillment } from '@/lib/types'
import { DataTable, MetricCard, MetricGrid, PageHeader, Panel, StatusBadge } from '@/components/dashboard/kit'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { hoursBetween, targetText, type Targets } from './data'
import type { AckDeadlines } from './server'
import { LinkButton, dateTime, dur } from './ui'

export type Action = { key: string; title: string; detail: string; href: string; start: string; due: string; targetLabel: string }

const units = (n: number) => `${n} unit${n === 1 ? '' : 's'}`

export function SupplierOverview({
  supplier,
  asOf,
  dash,
  fulfillments,
  ack,
  products,
  cases,
  actions,
  targets,
  feedDue,
}: {
  supplier: Pick<Supplier, 'name' | 'integration' | 'feed'>
  asOf: string
  dash: { metrics: Supplier['metrics']; awaitingAck: number; overdueAck: number; open: number }
  fulfillments: SupplierFulfillment[]
  ack: AckDeadlines
  products: { status: ProductStatus; available: number }[]
  cases: { total: number; open: number }
  actions: Action[]
  targets: Targets
  feedDue: string
}) {
  const shipped = fulfillments.filter((f) => ['shipped', 'delivered'].includes(f.fulfillment.status))
  const stockUnits = products.reduce((s, p) => s + p.available, 0)
  const ranked = actions
    .map((a) => ({ ...a, elapsed: hoursBetween(a.start, asOf), target: Math.max(hoursBetween(a.start, a.due), 0.01) }))
    .sort((a, b) => b.elapsed / b.target - a.elapsed / a.target)
  const feedLate = asOf > feedDue
  const ackCol = (r: SupplierFulfillment) => {
    const at = r.fulfillment.acknowledgedAt
    const d = ack[r.fulfillment.id]
    if (!at || !d) return <span className="text-slate">—</span>
    return <span className={at <= d.due ? 'text-success' : 'text-danger'}>{dur(hoursBetween(d.routed, at))}</span>
  }

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

      <MetricGrid>
        <MetricCard label="Orders routed" value={fulfillments.length} hint="Paid orders, most recent 200" />
        <MetricCard label="Awaiting acknowledgment" value={dash.awaitingAck} hint={dash.overdueAck ? `${dash.overdueAck} past target` : `Target: ${targetText(targets.ack)}`} tone={dash.overdueAck ? 'danger' : dash.awaitingAck ? 'warning' : 'default'} />
        <MetricCard label="Pending fulfillment" value={dash.open} hint="Not yet shipped" tone={dash.open ? 'warning' : 'default'} />
        <MetricCard label="Shipped" value={shipped.length} hint="Shipped or delivered" />
        <MetricCard label="Products" value={products.length} hint={`${products.filter((p) => p.status === 'published').length} published`} />
        <MetricCard label="Available units" value={stockUnits} hint="On hand minus reserved" />
        <MetricCard label="Open cases" value={cases.open} hint={`${cases.total} total`} tone={cases.open ? 'danger' : 'default'} />
        <MetricCard label="Avg. acknowledgment" value={dash.metrics.acknowledgmentHours} decimals={1} suffix=" h" hint={`Last 180 days · target ${targetText(targets.ack)}`} />
      </MetricGrid>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <Panel title="Action required" action={<span className="meta text-[0.6rem] text-slate">{ranked.length} items · sorted by urgency</span>} pad={false} className="lg:col-span-7">
          {ranked.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate">Nothing needs your attention right now.</p>
          ) : (
            <ul>
              {ranked.map((a) => {
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
              ['Connection', supplier.integration],
              ['Last update', dateTime(supplier.feed.lastSync)],
              ['Age', dur(Math.max(0, hoursBetween(supplier.feed.lastSync, asOf)))],
              ['SKUs', String(products.length)],
            ].map(([k, v]) => (
              <div key={k} className="bg-ivory/80 p-4">
                <dt className="meta text-[0.6rem] text-slate">{k}</dt>
                <dd className="mt-2 text-sm tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 flex items-start gap-3 text-xs leading-relaxed text-slate">
            <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', feedLate ? 'bg-warning' : 'bg-success')} aria-hidden />
            {feedLate ? `Older than the update target (${targetText(targets.inventory)}). Upload a CSV or update stock manually.` : `Within the update target (${targetText(targets.inventory)}).`}
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
            rows={fulfillments.slice(0, 10)}
            rowKey={(r) => r.fulfillment.id}
            empty="No orders have been routed to you yet."
            columns={[
              { key: 'id', header: 'Fulfillment', cell: (r) => <span className="font-medium tabular-nums">{r.fulfillment.id}</span> },
              { key: 'placed', header: 'Placed', cell: (r) => <span className="text-slate">{dateTime(r.placedAt)}</span>, sort: (r) => r.placedAt },
              { key: 'items', header: 'Items', cell: (r) => <span className="text-slate">{units(r.fulfillment.lines.reduce((s, l) => s + l.qty, 0))}</span> },
              { key: 'ship', header: 'Ship to', cell: (r) => <span className="text-slate">{r.shipTo.city}, {r.shipTo.region}</span> },
              { key: 'ack', header: 'Ack time', cell: ackCol },
              { key: 'value', header: 'Value', align: 'right', cell: (r) => money(r.fulfillment.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)) },
              { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.fulfillment.status} /> },
            ]}
          />
        </Panel>
      </div>
    </>
  )
}
