import type { Metadata } from 'next'
import { SupplierReturns } from '@/components/supplier/returns'
import { loadTargets, supplierContext } from '@/components/supplier/server'
import { listCases } from '@/lib/server/services/cases'
import { deadline } from '@/lib/server/services/metrics'

export const metadata: Metadata = {
  title: 'Returns',
  description: 'Respond to returns, damage reports, cancellations and replacement requests on items routed to you.',
  alternates: { canonical: '/supplier/returns' },
}

export default async function SupplierReturnsPage() {
  const ctx = await supplierContext()
  if (!ctx) return null
  const [cases, { settings, targets }] = await Promise.all([listCases(ctx.actor), loadTargets()])
  const due = Object.fromEntries(cases.map((c) => [c.id, deadline(settings, 'response', new Date(c.openedAt)).toISOString()]))
  return <SupplierReturns initial={cases} due={due} responseTarget={targets.response} returnRate={ctx.supplier.metrics.returnRate} asOf={new Date().toISOString()} />
}
