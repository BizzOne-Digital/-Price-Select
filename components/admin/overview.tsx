'use client'

import Link from 'next/link'
import { AreaChart, BarList, DataTable, MetricCard, MetricGrid, Panel, StatusBadge } from '@/components/dashboard/kit'
import { date, money0 } from '@/lib/format'
import type { Order } from '@/lib/types'
import type { adminDashboard } from '@/lib/server/services/metrics'
import { orderColumns } from './orders'
import { WarnRow } from './ui'

export type Dashboard = Awaited<ReturnType<typeof adminDashboard>>

export function Overview({ data, recent, admin }: { data: Dashboard; recent: Order[]; admin: boolean }) {
  const { stats, monitoring: m } = data
  const feedIssues = m.feeds.filter((f) => f.status !== 'healthy')
  const attention = feedIssues.length + m.delayed.length + m.tracking.length + m.cases.length

  return (
    <div className="space-y-10">
      <MetricGrid cols={5}>
        <MetricCard label="Net sales · 180 days" value={stats.sales} prefix="$" hint="Captured minus refunded" spark={data.revenueByWeek.map((d) => d.value)} />
        <MetricCard label="Total orders" value={stats.orders} spark={data.ordersByWeek.map((d) => d.value)} />
        <MetricCard label="Customers" value={stats.customers} />
        <MetricCard label="Approved suppliers" value={stats.suppliers} hint={`${stats.suppliersPending} applying`} />
        <MetricCard label="Products" value={stats.products} hint={`${stats.productsPending} awaiting review`} />
        <MetricCard label="Pending orders" value={stats.pending} tone={stats.pending ? 'warning' : 'default'} hint="Pending + confirmed" />
        <MetricCard label="Return cases" value={stats.returns} hint={`${stats.openReturns} open`} />
        <MetricCard label="Refunded orders" value={stats.refunds} hint={`${stats.failedPayments} failed payments · 30 d`} tone={stats.failedPayments ? 'warning' : 'default'} />
        <MetricCard label="Open cases" value={stats.openCases} tone={stats.openCases ? 'danger' : 'default'} hint={`${stats.openSupport} support`} />
        <MetricCard label="Needs attention" value={attention} tone={attention ? 'danger' : 'default'} hint="Monitoring items below" />
      </MetricGrid>

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <Panel title="Net revenue by week · last 10 weeks" className="xl:col-span-2">
          {data.revenueByWeek.some((d) => d.value) ? <AreaChart data={data.revenueByWeek} label="Revenue by week" format={(v) => money0(v)} /> : <p className="py-10 text-center text-sm text-slate">No paid orders in the last ten weeks.</p>}
        </Panel>
        <Panel title="Share of revenue by category">
          <BarList data={data.byCategory} empty="No sales recorded yet." />
        </Panel>
      </div>

      <section aria-labelledby="monitoring">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 id="monitoring" className="font-display text-3xl font-light tracking-[-0.01em]">
            System monitoring
          </h2>
          <p className="meta text-[0.6rem] text-slate">As of {date(data.asOf)} · thresholds from Settings, service targets</p>
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Panel title={`Inventory feeds · ${feedIssues.length} need attention`}>
              {m.feeds.length ? (
                <ul>
                  {m.feeds.map((f) => (
                    <WarnRow
                      key={f.id}
                      tone={f.status === 'healthy' ? 'good' : f.status === 'failed' ? 'bad' : 'warn'}
                      title={
                        <span className="flex flex-wrap items-center gap-3">
                          {f.name} <StatusBadge status={f.status} />
                        </span>
                      }
                      detail={`${f.integration} · ${f.hours == null ? 'never synced' : `last sync ${f.hours} h ago`}`}
                      href={admin ? `/admin/suppliers/${f.id}` : undefined}
                      action={f.status === 'healthy' ? 'View' : 'Resolve'}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate">No approved suppliers yet.</p>
              )}
            </Panel>
            <Panel title={`Missing tracking · ${m.tracking.length}`}>
              {m.tracking.length ? (
                <ul>
                  {m.tracking.map((d) => (
                    <WarnRow key={d.fid} title={`${d.fid} · ${d.supplier}`} detail={d.reason} href={`/admin/orders/${d.order}`} action="Chase" />
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
                    <WarnRow key={d.fid} tone="bad" title={`${d.fid} · ${d.supplier}`} detail={d.reason} href={`/admin/orders/${d.order}`} action="Act" />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate">No delayed fulfillments.</p>
              )}
            </Panel>
            <Panel title={`Unresolved cases · ${m.cases.length}`}>
              {m.cases.length ? (
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
              ) : (
                <p className="text-sm text-slate">No open cases.</p>
              )}
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
        <DataTable rows={recent} columns={orderColumns} rowKey={(o) => o.id} caption="Recent orders" empty="No orders yet." />
      </Panel>
    </div>
  )
}
