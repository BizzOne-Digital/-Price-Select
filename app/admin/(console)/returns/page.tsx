import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { CaseDesk } from '@/components/admin/cases'

export const metadata = adminMeta('Returns', 'Return, damage and replacement case queues for customer service.', '/admin/returns')

export default function AdminReturns() {
  return (
    <>
      <PageHeader eyebrow="Care · Customer service" title="Returns & claims" description="Pending returns, damage claims and escalations. Track the supplier's response against target and document every outcome." />
      <DemoBanner>Customer service staff can access this queue. Cases are demonstration records; targets are placeholders to agree with suppliers.</DemoBanner>
      <CaseDesk kind="returns" />
    </>
  )
}
