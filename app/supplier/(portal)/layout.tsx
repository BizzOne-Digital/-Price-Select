import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SupplierShell } from '@/components/supplier/portal-shell'
import { AccountStatus } from '@/components/supplier/account-status'
import { requirePage } from '@/lib/server/page-auth'
import { getMySupplier } from '@/lib/server/services/suppliers'
import { listNotifications } from '@/lib/server/services/notify'
import { myFulfillments } from '@/lib/server/services/operations'
import { listCases } from '@/lib/server/services/cases'
import { OPEN_CASE } from '@/components/supplier/data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: { default: 'Supplier portal', template: '%s · Supplier portal · Price-Select' },
  robots: { index: false, follow: false },
}

export default async function SupplierPortalLayout({ children }: { children: ReactNode }) {
  const actor = await requirePage(['supplier'], '/supplier/login')
  const [supplier, notifications] = await Promise.all([getMySupplier(actor), listNotifications(actor)])
  const user = { name: actor.name, company: supplier.name }
  if (supplier.status !== 'approved')
    return (
      <SupplierShell user={user} notifications={notifications} limited>
        <AccountStatus supplier={supplier} />
      </SupplierShell>
    )
  const [fulfillments, cases] = await Promise.all([myFulfillments(actor), listCases(actor)])
  return (
    <SupplierShell
      user={user}
      notifications={notifications}
      badges={{
        orders: fulfillments.filter((f) => ['pending', 'confirmed', 'processing'].includes(f.fulfillment.status)).length,
        returns: cases.filter((c) => (OPEN_CASE as readonly string[]).includes(c.status)).length,
      }}
    >
      {children}
    </SupplierShell>
  )
}
