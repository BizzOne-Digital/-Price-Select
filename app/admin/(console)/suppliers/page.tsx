import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { SupplierBoard } from '@/components/admin/suppliers'

export const metadata = adminMeta('Suppliers', 'Supplier applications, approvals, suspensions and feed status.', '/admin/suppliers')

export default function AdminSuppliers() {
  return (
    <>
      <PageHeader eyebrow="Network" title="Suppliers" description="Approve applicants, monitor approved partners and act on suspensions. Open a supplier for documents and performance." />
      <DemoBanner>Fictional suppliers for interface design. No real supplier relationship is implied.</DemoBanner>
      <SupplierBoard />
    </>
  )
}
