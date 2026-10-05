import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { CaseDesk } from '@/components/admin/cases'

export const metadata = adminMeta('Support', 'Customer support case queues with SLA tracking.', '/admin/support')

export default function AdminSupport() {
  return (
    <>
      <PageHeader eyebrow="Care · Customer service" title="Support desk" description="Every customer request with its SLA, owner and history. Add internal notes, chase suppliers and record the resolution." />
      <DemoBanner>Customer service staff can access this desk. Cases are demonstration records; response targets are placeholders.</DemoBanner>
      <CaseDesk kind="support" />
    </>
  )
}
