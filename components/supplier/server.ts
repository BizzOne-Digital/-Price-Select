import 'server-only'
import type { Actor } from '@/lib/server/auth'
import { deadline } from '@/lib/server/services/metrics'
import { getSettings } from '@/lib/server/services/settings'
import { requirePage } from '@/lib/server/page-auth'
import { getMySupplier } from '@/lib/server/services/suppliers'
import type { SupplierFulfillment } from '@/lib/types'
import type { Targets } from './data'

/**
 * Signed-in, approved supplier. Returns null otherwise: the portal layout renders the account
 * status page instead of the module, so pages simply render nothing.
 */
export async function supplierContext() {
  const actor = await requirePage(['supplier'], '/supplier/login')
  const supplier = await getMySupplier(actor)
  if (supplier.status !== 'approved') return null
  return { actor: actor as Actor & { supplierId: string }, supplier }
}

export async function loadTargets() {
  const s = await getSettings()
  const targets = Object.fromEntries(s.targets.items.map((t) => [t.key, { amount: t.amount, unit: t.unit, label: t.label }])) as Targets
  return { settings: s, targets }
}

/** When the fulfillment was routed (the 'pending' history entry), falling back to placement. */
export const routedAt = (f: SupplierFulfillment) => f.fulfillment.history.find((h) => h.status === 'pending')?.at ?? f.placedAt

/** Acknowledgment deadline per fulfillment id, from the configured targets and business calendar. */
export function ackDeadlines(settings: Awaited<ReturnType<typeof getSettings>>, rows: SupplierFulfillment[]) {
  return Object.fromEntries(rows.map((r) => [r.fulfillment.id, { routed: routedAt(r), due: deadline(settings, 'ack', new Date(routedAt(r))).toISOString() }]))
}
export type AckDeadlines = Record<string, { routed: string; due: string }>
