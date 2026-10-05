'use client'

import type { ReactNode } from 'react'
import { BarChart3, ClipboardList, CreditCard, FileDown, FolderTree, Gauge, LifeBuoy, Package, RotateCcw, Settings, ShieldCheck, Truck, Users } from 'lucide-react'
import { DashboardShell } from '@/components/dashboard/shell'
import { notifications, orders, returnCases, tickets } from '@/lib/data/operations'
import { isOpenCase, stats } from './data'

export function AdminShell({ children }: { children: ReactNode }) {
  const nav = [
    { group: 'Overview', items: [
      { href: '/admin', label: 'Dashboard', icon: Gauge },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/reports', label: 'Reports', icon: FileDown },
    ] },
    { group: 'Commerce', items: [
      { href: '/admin/orders', label: 'Orders', icon: ClipboardList, badge: stats.pending },
      { href: '/admin/products', label: 'Products', icon: Package, badge: stats.productsPending },
      { href: '/admin/categories', label: 'Categories', icon: FolderTree },
      { href: '/admin/payments', label: 'Payments', icon: CreditCard, badge: orders.filter((o) => o.payment === 'failed').length },
    ] },
    { group: 'Network', items: [
      { href: '/admin/suppliers', label: 'Suppliers', icon: Truck, badge: stats.suppliersPending },
      { href: '/admin/customers', label: 'Customers', icon: Users },
    ] },
    { group: 'Care', items: [
      { href: '/admin/returns', label: 'Returns', icon: RotateCcw, badge: returnCases.filter((r) => isOpenCase(r.status)).length },
      { href: '/admin/support', label: 'Support', icon: LifeBuoy, badge: tickets.filter((t) => isOpenCase(t.status)).length },
      { href: '/admin/compliance', label: 'Compliance', icon: ShieldCheck },
    ] },
    { group: 'System', items: [{ href: '/admin/settings', label: 'Settings', icon: Settings }] },
  ]
  return (
    <DashboardShell product="Operations console" nav={nav} user={{ name: 'Demo administrator', role: 'Administrator', initials: 'DA' }} notifications={notifications}>
      {children}
    </DashboardShell>
  )
}
