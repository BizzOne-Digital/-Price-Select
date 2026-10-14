'use client'

import Link from 'next/link'
import { AreaChart, BarList, Panel, Ring, StatusBadge } from '@/components/dashboard/kit'
import { money, money0 } from '@/lib/format'
import type { Supplier } from '@/lib/types'
import type { Dashboard } from './overview'

const UNIT: Record<string, string> = { hours: 'h', business_days: 'business day(s)', days: 'day(s)' }

export function AnalyticsBoard({ data, suppliers }: { data: Dashboard; suppliers: Supplier[] | null }) {
  const active = (suppliers ?? []).filter((s) => s.status === 'approved')
  const target = (key: string) => data.targets.items.find((t) => t.key === key)
  const ack = target('ack')
  const resp = target('response')
  // Hour-unit targets can be compared directly; business-day targets are shown but not flagged here.
  const ackLimit = ack?.unit === 'hours' ? ack.amount : null
  const respLimit = resp?.unit === 'hours' ? resp.amount : null

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Net revenue · weekly">
          {data.revenueByWeek.some((d) => d.value) ? <AreaChart data={data.revenueByWeek} label="Revenue by week" format={(v) => money0(v)} /> : <p className="py-10 text-center text-sm text-slate">No paid orders in the last ten weeks.</p>}
        </Panel>
        <Panel title="Paid orders · weekly">
          {data.ordersByWeek.some((d) => d.value) ? <AreaChart data={data.ordersByWeek} label="Orders by week" format={(v) => `${v} orders`} /> : <p className="py-10 text-center text-sm text-slate">No paid orders in the last ten weeks.</p>}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Top categories · share of revenue">
          <BarList data={data.byCategory.slice(0, 6)} empty="No sales recorded yet." />
        </Panel>
        <Panel title="Top products · revenue">
          <BarList data={data.topProducts} format={(v) => money(v)} empty="No sales recorded yet." />
        </Panel>
        <Panel title="Returns by type">
          <BarList data={data.returnsByType} format={(v) => `${v} case${v === 1 ? '' : 's'}`} empty="No return cases yet." />
        </Panel>
      </div>

      <Panel title="Fulfillment performance · against service targets">
        <div className="grid grid-cols-1 gap-8 py-4 sm:grid-cols-3">
          {data.fulfillment.map((f) =>
            f.n ? (
              <div key={f.label} className="flex flex-col items-center">
                <Ring value={f.value} label={f.label} size={132} />
                <p className="mt-2 text-xs text-slate">{f.n} measured</p>
              </div>
            ) : (
              <div key={f.label} className="flex flex-col items-center justify-center text-center">
                <p className="font-display text-3xl text-slate">—</p>
                <p className="mt-3 max-w-[14ch] meta text-[0.6rem] text-slate">{f.label}</p>
                <p className="mt-2 text-xs text-slate">No data yet</p>
              </div>
            ),
          )}
        </div>
      </Panel>

      {suppliers && (
        <Panel title="Supplier performance · last 180 days" pad={false}>
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">Supplier performance</caption>
              <thead>
                <tr className="border-b border-obsidian/10">
                  {['Supplier', `Acknowledgment${ack ? ` (target ${ack.amount} ${UNIT[ack.unit]})` : ''}`, 'Tracking on shipped', 'Fulfillment', `Response${resp ? ` (target ${resp.amount} ${UNIT[resp.unit]})` : ''}`, 'Returns'].map((h, i) => (
                    <th key={h} scope="col" className={`px-4 py-3 meta text-[0.62rem] font-semibold text-slate ${i ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate">
                      No approved suppliers yet.
                    </td>
                  </tr>
                )}
                {active.map((s) => (
                  <tr key={s.id} className="border-b border-obsidian/[0.06] hover:bg-pearl/60">
                    <td className="px-4 py-3.5">
                      <Link href={`/admin/suppliers/${s.id}`} className="hover:text-gold-deep">
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {s.metrics.acknowledgmentHours} h {ackLimit != null && s.metrics.acknowledgmentHours > ackLimit && <StatusBadge status="off" tone="bad" label="Off" />}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{s.metrics.trackingCompliance}%</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{s.metrics.fulfillmentRate}%</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      {s.metrics.responseHours} h {respLimit != null && s.metrics.responseHours > respLimit && <StatusBadge status="off" tone="bad" label="Off" />}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{s.metrics.returnRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-slate">Zero values mean no measured activity yet in the window, not perfect performance.</p>
        </Panel>
      )}
    </div>
  )
}
