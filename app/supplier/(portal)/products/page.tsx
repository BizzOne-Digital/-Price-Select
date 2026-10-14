import type { Metadata } from 'next'
import { SupplierProducts } from '@/components/supplier/products'
import { supplierContext } from '@/components/supplier/server'
import { myProducts } from '@/lib/server/services/products'
import { listCategoriesAdmin } from '@/lib/server/services/catalog'

export const metadata: Metadata = {
  title: 'Products',
  description: 'Manage your Price-Select listings, stock status and compliance documentation, and submit new products for review.',
  alternates: { canonical: '/supplier/products' },
}

export default async function SupplierProductsPage() {
  const ctx = await supplierContext()
  if (!ctx) return null
  const [products, all] = await Promise.all([myProducts(ctx.actor), listCategoriesAdmin()])
  const categories = all
    .filter((c) => ctx.supplier.categories.includes(c.slug))
    .map((c) => ({ slug: c.slug, name: c.name, reviewLevel: c.reviewLevel, reviewNote: c.reviewNote, requiredDocuments: c.requiredDocuments ?? [] }))
  return <SupplierProducts initial={products} categories={categories} />
}
