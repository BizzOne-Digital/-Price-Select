'use client'

import { AreaChart, BarList, DemoBanner, PageHeader, Panel, Ring, StatusBadge } from '@/components/dashboard/kit'
import { SERVICE_TARGETS } from '@/lib/site'
import { supplier } from './data'

// Demonstration series for chart layout only. Not real performance data.
const ACK_TREND = [7.4, 6.9, 8.1, 6.6, 6.2, 5.8, 6.4, 5.9, 6.1, 6.0].map((value, i) => ({ label: `W${32 + i}`, value }))
const RETURN_REASONS = [
  { label: 'Damaged in transit', value: 41 },
  { label: 'Not as expected', value: 24 },
  { label: 'Ordered by mistake', value: 19 },
  { label: 'Wrong item received', value: 9 },
  { label: 'Other', value: 7 },
]

export function SupplierPerformance() {
  const m = supplier.metrics
  const rows = [
    { metric: 'Order acknowledgment', yours: `${m.acknowledgmentHours} h avg`, target: `${SERVICE_TARGETS[0].value} ${SERVICE_TARGETS[0].unit}`, ok: m.acknowledgmentHours <= 24 },
    { metric: 'Tracking upload compliance', yours: `${m.trackingCompliance}%`, target: `Within ${SERVICE_TARGETS[1].value} ${SERVICE_TARGETS[1].unit} of dispatch`, ok: null },
    { metric: 'Fulfillment rate', yours: `${m.fulfillmentRate}%`, target: 'Benchmark to be agreed', ok: null },
    { metric: 'Case response time', yours: `${m.responseHours} h avg`, target: `${SERVICE_TARGETS[2].value} ${SERVICE_TARGETS[2].unit}`, ok: m.responseHours <= 24 },
    { metric: 'Return rate', yours: `${m.returnRate}%`, target: 'Benchmark to be agreed', ok: null },
    { metric: 'Inventory updates', yours: supplier.feed.status === 'healthy' ? 'Daily or better' : titleFeed(supplier.feed.status), target: `${SERVICE_TARGETS[3].value} ${SERVICE_TARGETS[3].unit}`, ok: supplier.feed.status === 'healthy' },
  ]

  return (
    <>
      <PageHeader eyebrow="Account" title="Performance" description="How your fulfillment compares with the placeholder service targets. Targets will be agreed with suppliers before launch." />
      <DemoBanner>Demonstration figures. These numbers illustrate the scorecard layout and are not a measurement of any real supplier.</DemoBanner>

      <Panel title="Scorecard · last 90 days (demonstration)">
        <div className="grid grid-cols-2 gap-y-10 py-4 md:grid-cols-3">
          <Ring value={m.trackingCompliance} label="Tracking uploaded within 24 h" />
          <Ring value={m.fulfillmentRate} label="Fulfillment rate" />
          <Ring value={Math.round((100 - m.returnRate) * 10) / 10} label="Orders without a return" />
        </div>
      </Panel>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <Panel title="Acknowledgment time · hours, weekly" className="lg:col-span-7">
          <AreaChart data={ACK_TREND} label="Average acknowledgment time in hours by week" format={(v) => `${v} h`} />
          <p className="mt-3 text-xs text-slate">Placeholder target: acknowledge within 1 business day (24 h).</p>
        </Panel>
        <Panel title="Return reasons · share of cases" className="lg:col-span-5">
          <BarList data={RETURN_REASONS} />
        </Panel>
      </div>

      <Panel title="Against placeholder targets" pad={false} className="mt-8">
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Performance against placeholder service targets</caption>
            <thead>
              <tr className="border-b border-obsidian/10">
                {['Measure', 'Yours', 'Placeholder target', 'Status'].map((h) => (
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
                  <td className="px-5 py-4">{r.ok === null ? <StatusBadge status="tbc" tone="muted" label="Target to agree" /> : r.ok ? <StatusBadge status="ok" tone="good" label="Within target" /> : <StatusBadge status="no" tone="bad" label="Needs attention" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  )
}

const titleFeed = (s: string) => `Feed ${s}`
