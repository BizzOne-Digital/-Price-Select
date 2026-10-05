import type { Metadata } from 'next'
import { SupplierProducts } from '@/components/supplier/products'

export const metadata: Metadata = {
  title: 'Products',
  description: 'Manage your Price-Select listings, stock status and compliance documentation, and submit new products for review.',
  alternates: { canonical: '/supplier/products' },
}

export default function SupplierProductsPage() {
  return <SupplierProducts />
}
