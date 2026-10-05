import type { Role } from '@/lib/types'

// Role-based access model. Authentication is NOT connected yet: the login screens route into
// demo sessions. Wire `can()` to a real session (and enforce it server-side in proxy.ts and
// route handlers) before any real data is loaded.

export type Permission =
  | 'catalog:browse'
  | 'orders:own'
  | 'supplier:catalog'
  | 'supplier:fulfillment'
  | 'admin:suppliers'
  | 'admin:products'
  | 'admin:orders'
  | 'admin:payments'
  | 'admin:settings'
  | 'support:cases'
  | 'support:customers'

export const PERMISSIONS: Record<Role, Permission[]> = {
  customer: ['catalog:browse', 'orders:own'],
  supplier: ['supplier:catalog', 'supplier:fulfillment'],
  support: ['support:cases', 'support:customers', 'admin:orders'],
  admin: ['admin:suppliers', 'admin:products', 'admin:orders', 'admin:payments', 'admin:settings', 'support:cases', 'support:customers'],
}

export const can = (role: Role, p: Permission) => PERMISSIONS[role].includes(p)

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Customer',
  supplier: 'Supplier',
  admin: 'Administrator',
  support: 'Customer service',
}
