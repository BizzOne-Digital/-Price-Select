'use client'

import { BarChart3, Boxes, LayoutGrid, Package, RotateCcw, Truck } from 'lucide-react'
import type { ReactNode } from 'react'
import { DashboardShell } from '@/components/dashboard/shell'
import { myCases, myFulfillments, supplier, supplierNotifications } from './data'

const initials = supplier.name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('')

/** Client wrapper so the server layout never has to pass icon components across the boundary. */
export function SupplierShell({ children }: { children: ReactNode }) {
  const pending = myFulfillments.filter((f) => ['pending', 'confirmed', 'processing'].includes(f.fulfillment.status)).length
  const openCases = myCases.filter((c) => ['open', 'awaiting_supplier', 'escalated'].includes(c.status)).length
  return (
    <DashboardShell
      product="Supplier portal"
      user={{ name: supplier.name, role: 'Supplier · demo account', initials }}
      notifications={supplierNotifications}
      nav={[
        {
          items: [
            { href: '/supplier', label: 'Overview', icon: LayoutGrid },
            { href: '/supplier/products', label: 'Products', icon: Package },
            { href: '/supplier/orders', label: 'Orders', icon: Truck, badge: pending },
            { href: '/supplier/inventory', label: 'Inventory', icon: Boxes },
            { href: '/supplier/returns', label: 'Returns', icon: RotateCcw, badge: openCases },
            { href: '/supplier/performance', label: 'Performance', icon: BarChart3 },
          ],
        },
      ]}
    >
      {children}
    </DashboardShell>
  )
}
