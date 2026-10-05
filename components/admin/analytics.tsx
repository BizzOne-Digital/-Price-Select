'use client'

import Link from 'next/link'
import { AreaChart, BarList, Panel, Ring, StatusBadge } from '@/components/dashboard/kit'
import { analytics, returnCases } from '@/lib/data/operations'
import { suppliers } from '@/lib/data/suppliers'
import { money, money0 } from '@/lib/format'
import { lineTotals, TARGET_HOURS } from './data'

export function AnalyticsBoard() {
  const { byProduct } = lineTotals()
  const top = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6)
  const active = suppliers.filter((s) => s.status === 'approved')
  const reasons = Object.entries(returnCases.reduce<Record<string, number>>((m, r) => ({ ...m, [r.type]: (m[r.type] ?? 0) + 1 }), {})).map(([label, value]) => ({ label: label[0].toUpperCase() + label.slice(1), value }))

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Revenue over time · weekly">
          <AreaChart data={analytics.revenueByWeek} label="Revenue by week" format={(v) => money0(v)} />
        </Panel>
        <Panel title="Orders over time · weekly">
          <AreaChart data={analytics.ordersByWeek} label="Orders by week" format={(v) => `${v} orders`} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Top categories · share of revenue">
          <BarList data={analytics.byCategory.slice(0, 6)} />
        </Panel>
        <Panel title="Top products · demo orders">
          <BarList data={top.map((p) => ({ label: p.name, value: p.revenue }))} format={(v) => money(v)} />
        </Panel>
        <Panel title="Returns by type">
          <BarList data={reasons} format={(v) => `${v} case${v > 1 ? 's' : ''}`} />
        </Panel>
      </div>

      <Panel title="Fulfillment performance">
        <div className="grid grid-cols-1 gap-8 py-4 sm:grid-cols-3">
          {analytics.fulfillment.map((f) => (
            <Ring key={f.label} value={f.value} label={f.label} size={132} />
          ))}
        </div>
      </Panel>

      <Panel title="Supplier performance" pad={false}>
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Supplier performance</caption>
            <thead>
              <tr className="border-b border-obsidian/10">
                {['Supplier', 'Acknowledgment', 'Tracking on time', 'Fulfillment', 'Response', 'Returns'].map((h, i) => (
                  <th key={h} scope="col" className={`px-4 py-3 meta text-[0.62rem] font-semibold text-slate ${i ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((s) => (
                <tr key={s.id} className="border-b border-obsidian/[0.06] hover:bg-pearl/60">
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/suppliers/${s.id}`} className="hover:text-gold-deep">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {s.metrics.acknowledgmentHours} h {s.metrics.acknowledgmentHours > TARGET_HOURS.ack && <StatusBadge status="off" tone="bad" label="Off" />}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {s.metrics.trackingCompliance}% {s.metrics.trackingCompliance < 95 && <StatusBadge status="off" tone="warn" label="Watch" />}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{s.metrics.fulfillmentRate}%</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{s.metrics.responseHours} h</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">{s.metrics.returnRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
