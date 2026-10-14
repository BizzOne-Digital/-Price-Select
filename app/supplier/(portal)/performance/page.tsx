import type { Metadata } from 'next'
import { SupplierPerformance } from '@/components/supplier/performance'
import { loadTargets, supplierContext } from '@/components/supplier/server'
import { supplierDashboard } from '@/lib/server/services/metrics'
import { listCases } from '@/lib/server/services/cases'

export const metadata: Metadata = {
  title: 'Performance',
  description: 'Acknowledgment time, tracking compliance, fulfillment rate, response time and return rate against the configured service targets.',
  alternates: { canonical: '/supplier/performance' },
}

export default async function SupplierPerformancePage() {
  const ctx = await supplierContext()
  if (!ctx) return null
  const [dash, cases, { targets }] = await Promise.all([supplierDashboard(ctx.actor.supplierId), listCases(ctx.actor, 'return'), loadTargets()])
  const reasons = new Map<string, number>()
  for (const c of cases) reasons.set(c.reason || 'Not given', (reasons.get(c.reason || 'Not given') ?? 0) + 1)
  return (
    <SupplierPerformance
      metrics={dash.metrics}
      weekly={dash.weekly}
      targets={targets}
      feed={ctx.supplier.feed}
      reasons={[...reasons].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, n]) => ({ label, value: Math.round((n / cases.length) * 1000) / 10 }))}
      asOf={dash.asOf}
    />
  )
}
