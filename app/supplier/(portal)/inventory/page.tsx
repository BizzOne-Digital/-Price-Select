import type { Metadata } from 'next'
import { SupplierInventory } from '@/components/supplier/inventory'
import { loadTargets, supplierContext } from '@/components/supplier/server'
import { myProducts } from '@/lib/server/services/products'

export const metadata: Metadata = {
  title: 'Inventory',
  description: 'Update stock levels manually or by CSV, and review API and EDI inventory feed options.',
  alternates: { canonical: '/supplier/inventory' },
}

export default async function SupplierInventoryPage() {
  const ctx = await supplierContext()
  if (!ctx) return null
  const [products, { targets }] = await Promise.all([myProducts(ctx.actor), loadTargets()])
  return (
    <SupplierInventory
      initial={products.map((p) => ({ sku: p.sku, name: p.name, onHand: p.inventory.onHand, reserved: p.inventory.reserved, available: p.inventory.available, madeToOrder: p.madeToOrder, handlingDays: p.handlingDays, status: p.status }))}
      integration={ctx.supplier.integration}
      feed={ctx.supplier.feed}
      inventoryTarget={targets.inventory}
      asOf={new Date().toISOString()}
    />
  )
}
