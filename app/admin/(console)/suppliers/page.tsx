import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { SupplierBoard } from '@/components/admin/suppliers'
import { requirePage } from '@/lib/server/page-auth'
import { listCategoriesAdmin } from '@/lib/server/services/catalog'
import { listSuppliers } from '@/lib/server/services/suppliers'

export const metadata = adminMeta('Suppliers', 'Supplier applications, approvals, suspensions and feed status.', '/admin/suppliers')

export default async function AdminSuppliers() {
  const actor = await requirePage(['admin'], '/admin/login')
  const [rows, categories] = await Promise.all([listSuppliers(actor), listCategoriesAdmin()])
  return (
    <>
      <PageHeader eyebrow="Network" title="Suppliers" description="Review applications, monitor approved partners and act on suspensions. Open a supplier for documents, performance and decisions." />
      <SupplierBoard rows={rows} categoryName={Object.fromEntries(categories.map((c) => [c.slug, c.short]))} />
    </>
  )
}
