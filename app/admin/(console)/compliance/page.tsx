import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { ComplianceBoard } from '@/components/admin/compliance'

export const metadata = adminMeta('Compliance', 'Product documentation, flagged products and removal workflow.', '/admin/compliance')

export default function AdminCompliance() {
  return (
    <>
      <PageHeader eyebrow="Care" title="Compliance & documentation" description="Safety certificates, manuals, warranties and authenticity confirmations across the catalog — and the workflow for removing a product safely." />
      <DemoBanner>Demonstration documents. Nothing on this screen constitutes legal or regulatory advice.</DemoBanner>
      <ComplianceBoard />
    </>
  )
}
