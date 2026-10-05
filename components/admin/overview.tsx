'use client'

import Link from 'next/link'
import { AreaChart, BarList, DataTable, MetricCard, MetricGrid, Panel, StatusBadge } from '@/components/dashboard/kit'
import { analytics, orders } from '@/lib/data/operations'
import { money0 } from '@/lib/format'
import { monitoring, stats, supplierName } from './data'
import { orderColumns } from './orders'
import { WarnRow } from './ui'

export function Overview() {
  const m = monitoring()
  const feedIssues = m.feeds.filter((f) => f.s.feed.status !== 'healthy')
  const recent = [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt)).slice(0, 6)
  const attention = feedIssues.length + m.delayed.length + m.tracking.length + m.cases.length

  return (
    <div className="space-y-10">
      <MetricGrid cols={5}>
        <MetricCard label="Total sales" value={stats.sales} prefix="$" hint="Excl. canceled" spark={analytics.revenueByWeek.map((d) => d.value)} />
        <MetricCard label="Total orders" value={stats.orders} spark={analytics.ordersByWeek.map((d) => d.value)} />
        <MetricCard label="Customers" value={stats.customers} />
        <MetricCard label="Approved suppliers" value={stats.suppliers} hint={`${stats.suppliersPending} applying`} />
        <MetricCard label="Products" value={stats.products} hint={`${stats.productsPending} awaiting review`} />
        <MetricCard label="Pending orders" value={stats.pending} tone={stats.pending ? 'warning' : 'default'} hint="Pending + confirmed" />
        <MetricCard label="Return cases" value={stats.returns} />
        <MetricCard label="Refunds" value={stats.refunds} />
        <MetricCard label="Open support cases" value={stats.openCases} tone={stats.openCases ? 'danger' : 'default'} />
        <MetricCard label="Needs attention" value={attention} tone={attention ? 'danger' : 'default'} hint="Monitoring items below" />
      </MetricGrid>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Panel title="Revenue by week · demonstration series" className="xl:col-span-2">
          <AreaChart data={analytics.revenueByWeek} label="Revenue by week" format={(v) => money0(v)} />
        </Panel>
        <Panel title="Share of revenue by category">
          <BarList data={analytics.byCategory} />
        </Panel>
      </div>

      <section aria-labelledby="monitoring">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 id="monitoring" className="font-display text-3xl font-light tracking-[-0.01em]">
            System monitoring
          </h2>
          <p className="meta text-[0.6rem] text-slate">Demonstration snapshot · placeholder thresholds</p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Panel title={`Inventory feeds · ${feedIssues.length} need attention`}>
              <ul>
                {m.feeds.map(({ s, hours }) => (
                  <WarnRow
                    key={s.id}
                    tone={s.feed.status === 'healthy' ? 'good' : s.feed.status === 'failed' ? 'bad' : 'warn'}
                    title={
                      <span className="flex flex-wrap items-center gap-3">
                        {s.name} <StatusBadge status={s.feed.status} />
                      </span>
                    }
                    detail={`${s.integration} · last sync ${Math.round(hours)} h ago`}
                    href={`/admin/suppliers/${s.id}`}
                    action={s.feed.status === 'healthy' ? 'View' : 'Resolve'}
                  />
                ))}
              </ul>
            </Panel>
            <Panel title={`Missing tracking · ${m.tracking.length}`}>
              {m.tracking.length ? (
                <ul>
                  {m.tracking.map((d) => (
                    <WarnRow key={d.f.id} title={`${d.f.id} · ${supplierName(d.f.supplierId)}`} detail={d.reason} href={`/admin/orders/${d.order.id}`} action="Chase" />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate">All shipped fulfillments carry tracking.</p>
              )}
            </Panel>
          </div>
          <div className="space-y-6">
            <Panel title={`Delayed orders · ${m.delayed.length}`}>
              {m.delayed.length ? (
                <ul>
                  {m.delayed.map((d) => (
                    <WarnRow key={d.f.id} tone="bad" title={`${d.f.id} · ${supplierName(d.f.supplierId)}`} detail={d.reason} href={`/admin/orders/${d.order.id}`} action="Act" />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate">No delayed fulfillments.</p>
              )}
            </Panel>
            <Panel title={`Unresolved cases · ${m.cases.length}`}>
              <ul>
                {m.cases.map((c) => (
                  <WarnRow
                    key={c.id}
                    tone={c.overdue || c.status === 'escalated' ? 'bad' : 'warn'}
                    title={
                      <span className="flex flex-wrap items-center gap-3">
                        {c.id} <StatusBadge status={c.status} />
                        {c.overdue && <StatusBadge status="overdue" tone="bad" label="Past target" />}
                      </span>
                    }
                    detail={c.label}
                    href={c.href}
                    action="Open"
                  />
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </section>

      <Panel
        title="Recent orders"
        pad={false}
        action={
          <Link href="/admin/orders" className="meta text-[0.6rem] text-gold-deep hover:text-obsidian">
            All orders
          </Link>
        }
      >
        <DataTable rows={recent} columns={orderColumns} rowKey={(o) => o.id} caption="Recent orders" />
      </Panel>
    </div>
  )
}
