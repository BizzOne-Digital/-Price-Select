'use client'

import { BarChart3, Boxes, LayoutGrid, LogOut, Package, RotateCcw, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import type { Notification } from '@/lib/types'
import { DashboardShell } from '@/components/dashboard/shell'
import { api, errorText } from '@/lib/client/api'

const initialsOf = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')

/** Client wrapper so the server layout never has to pass icon components across the boundary. */
export function SupplierShell({ user, notifications, badges, limited, children }: { user: { name: string; company: string }; notifications: Notification[]; badges?: { orders: number; returns: number }; limited?: boolean; children: ReactNode }) {
  const items = [
    { href: '/supplier', label: 'Overview', icon: LayoutGrid },
    ...(limited
      ? []
      : [
          { href: '/supplier/products', label: 'Products', icon: Package },
          { href: '/supplier/orders', label: 'Orders', icon: Truck, badge: badges?.orders },
          { href: '/supplier/inventory', label: 'Inventory', icon: Boxes },
          { href: '/supplier/returns', label: 'Returns', icon: RotateCcw, badge: badges?.returns },
          { href: '/supplier/performance', label: 'Performance', icon: BarChart3 },
        ]),
  ]
  return (
    <DashboardShell product="Supplier portal" user={{ name: user.company, role: user.name, initials: initialsOf(user.company) }} notifications={notifications} nav={[{ items }]} signOutTo="/supplier/login">
      {children}
    </DashboardShell>
  )
}
