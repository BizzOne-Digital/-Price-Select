import type { Metadata } from 'next'
import { SupplierInventory } from '@/components/supplier/inventory'

export const metadata: Metadata = {
  title: 'Inventory',
  description: 'Update stock levels manually or by CSV, and review API and EDI inventory feed options.',
  alternates: { canonical: '/supplier/inventory' },
}

export default function SupplierInventoryPage() {
  return <SupplierInventory />
}
