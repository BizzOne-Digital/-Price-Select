'use client'

import type { ReactNode } from 'react'
import { BarChart3, ClipboardList, CreditCard, FileDown, FolderTree, Gauge, LifeBuoy, Package, RotateCcw, Settings, ShieldCheck, Truck, Users } from 'lucide-react'
import { DashboardShell, type NavItem } from '@/components/dashboard/shell'
import type { Notification, Role } from '@/lib/types'

export type AdminBadges = { orders: number; returns: number; support: number; products: number; suppliers: number; failed: number }

export function AdminShell({ children, user, role, badges, notifications }: { children: ReactNode; user: { name: string; role: string; initials: string }; role: Role; badges: AdminBadges; notifications: Notification[] }) {
  const admin = role === 'admin'
  // Support staff only see what their API permissions allow (orders, customers, returns, support).
  const only = (items: (NavItem & { adminOnly?: boolean })[]) => items.filter((i) => admin || !i.adminOnly)
  const nav = [
    { group: 'Overview', items: only([
      { href: '/admin', label: 'Dashboard', icon: Gauge },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/reports', label: 'Reports', icon: FileDown, adminOnly: true },
    ]) },
    { group: 'Commerce', items: only([
      { href: '/admin/orders', label: 'Orders', icon: ClipboardList, badge: badges.orders },
      { href: '/admin/products', label: 'Products', icon: Package, badge: badges.products, adminOnly: true },
      { href: '/admin/categories', label: 'Categories', icon: FolderTree, adminOnly: true },
      { href: '/admin/payments', label: 'Payments', icon: CreditCard, badge: badges.failed, adminOnly: true },
    ]) },
    { group: 'Network', items: only([
      { href: '/admin/suppliers', label: 'Suppliers', icon: Truck, badge: badges.suppliers, adminOnly: true },
      { href: '/admin/customers', label: 'Customers', icon: Users },
    ]) },
    { group: 'Care', items: only([
      { href: '/admin/returns', label: 'Returns', icon: RotateCcw, badge: badges.returns },
      { href: '/admin/support', label: 'Support', icon: LifeBuoy, badge: badges.support },
      { href: '/admin/compliance', label: 'Compliance', icon: ShieldCheck, adminOnly: true },
    ]) },
    { group: 'System', items: only([{ href: '/admin/settings', label: 'Settings', icon: Settings, adminOnly: true }]) },
  ].filter((g) => g.items.length)
  return (
    <DashboardShell product="Operations console" nav={nav} user={user} notifications={notifications} signOutTo="/admin/login">
      {children}
    </DashboardShell>
  )
}
