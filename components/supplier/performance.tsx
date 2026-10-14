'use client'

import { AreaChart, BarList, PageHeader, Panel, Ring, StatusBadge } from '@/components/dashboard/kit'
import { money } from '@/lib/format'
import type { Supplier } from '@/lib/types'
import { dateTime, targetHours, targetText, type Targets } from './data'

type Row = { metric: string; yours: string; target: string; ok: boolean | null }

export function SupplierPerformance({ metrics: m, weekly, targets, feed, reasons, asOf }: { metrics: Supplier['metrics']; weekly: { label: string; value: number; orders: number }[]; targets: Targets; feed: Supplier['feed']; reasons: { label: string; value: number }[]; asOf: string }) {
  const hasOrders = weekly.some((w) => w.orders > 0) || m.fulfillmentRate > 0
  // A business-day target is never shorter than 24 h per day, so "within" is certain below that bound.
  const within = (h: number, t: Targets['ack']) => (h <= 0 ? null : h <= targetHours(t) ? true : t.unit === 'business_days' ? null : false)
  const rows: Row[] = [
    { metric: 'Order acknowledgment', yours: m.acknowledgmentHours ? `${m.acknowledgmentHours} h avg` : 'No data yet', target: targetText(targets.ack), ok: within(m.acknowledgmentHours, targets.ack) },
    { metric: 'Tracking on shipped orders', yours: hasOrders ? `${m.trackingCompliance}%` : 'No data yet', target: `Within ${targetText(targets.tracking)} of dispatch`, ok: null },
    { metric: 'Fulfillment rate', yours: hasOrders ? `${m.fulfillmentRate}%` : 'No data yet', target: 'Benchmark to be agreed', ok: null },
    { metric: 'Case response time', yours: m.responseHours ? `${m.responseHours} h avg` : 'No data yet', target: targetText(targets.response), ok: within(m.responseHours, targets.response) },
    { metric: 'Return rate', yours: hasOrders ? `${m.returnRate}%` : 'No data yet', target: 'Benchmark to be agreed', ok: null },
    { metric: 'Inventory updates', yours: `Last ${dateTime(feed.lastSync)}`, target: `At least every ${targetText(targets.inventory)}`, ok: null },
  ]

  return (
    <>
      <PageHeader eyebrow="Account" title="Performance" description={`Measured from your fulfillments and cases over the last 180 days, as of ${dateTime(asOf)}. Targets are set by Price-Select.`} />

      <Panel title="Scorecard · last 180 days">
        {hasOrders ? (
          <div className="grid grid-cols-2 gap-y-10 py-4 md:grid-cols-3">
            <Ring value={m.trackingCompliance} label="Shipped orders with tracking" />
            <Ring value={m.fulfillmentRate} label="Fulfillment rate" />
            <Ring value={Math.round((100 - m.returnRate) * 10) / 10} label="Delivered without a return" />
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-slate">No paid orders have been routed to you in this period yet.</p>
        )}
      </Panel>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <Panel title="Order value · weekly" className="lg:col-span-7">
          <AreaChart data={weekly.map((w) => ({ label: w.label, value: w.value }))} label="Value of orders routed to you by week" format={(v) => money(v)} />
          <p className="mt-3 text-xs text-slate">{weekly.reduce((s, w) => s + w.orders, 0)} orders in the last 8 weeks.</p>
        </Panel>
        <Panel title="Return reasons · share of cases" className="lg:col-span-5">
          {reasons.length ? <BarList data={reasons} /> : <p className="py-8 text-center text-sm text-slate">No returns yet.</p>}
        </Panel>
      </div>

      <Panel title="Against service targets" pad={false} className="mt-8">
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Performance against service targets</caption>
            <thead>
              <tr className="border-b border-obsidian/10">
                {['Measure', 'Yours', 'Target', 'Status'].map((h) => (
                  <th key={h} scope="col" className="px-5 py-3 text-left meta text-[0.6rem] text-slate">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.metric} className="border-b border-obsidian/[0.06] last:border-0">
                  <th scope="row" className="px-5 py-4 text-left font-medium">{r.metric}</th>
                  <td className="px-5 py-4 tabular-nums">{r.yours}</td>
                  <td className="px-5 py-4 text-slate">{r.target}</td>
                  <td className="px-5 py-4">{r.ok === null ? <StatusBadge status="tbc" tone="muted" label="Not scored" /> : r.ok ? <StatusBadge status="ok" tone="good" label="Within target" /> : <StatusBadge status="no" tone="bad" label="Needs attention" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}
