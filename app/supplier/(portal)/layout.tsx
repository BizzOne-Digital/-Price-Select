import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SupplierShell } from '@/components/supplier/portal-shell'

export const metadata: Metadata = {
  title: { default: 'Supplier portal', template: '%s · Supplier portal · Price-Select' },
  robots: { index: false, follow: false },
}

export default function SupplierPortalLayout({ children }: { children: ReactNode }) {
  return <SupplierShell>{children}</SupplierShell>
}
