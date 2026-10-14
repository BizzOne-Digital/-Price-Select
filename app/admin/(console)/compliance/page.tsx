import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { ComplianceBoard } from '@/components/admin/compliance'
import { requirePage } from '@/lib/server/page-auth'
import { listCategoriesAdmin } from '@/lib/server/services/catalog'
import { listProductsAdmin } from '@/lib/server/services/products'
import { listSuppliers } from '@/lib/server/services/suppliers'

export const metadata = adminMeta('Compliance', 'Product documentation, flagged products and removal workflow.', '/admin/compliance')

export default async function AdminCompliance() {
  const actor = await requirePage(['admin'], '/admin/login')
  const [products, suppliers, categories] = await Promise.all([listProductsAdmin(actor), listSuppliers(actor), listCategoriesAdmin()])
  return (
    <>
      <PageHeader eyebrow="Care" title="Compliance & documentation" description="Safety certificates, manuals, warranties, authenticity confirmations and supplier documents — and the workflow for removing a product safely." />
      <ComplianceBoard products={products.items} suppliers={suppliers} categories={categories} />
    </>
  )
}
