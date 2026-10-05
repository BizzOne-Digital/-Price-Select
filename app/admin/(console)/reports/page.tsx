import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { ReportCards } from '@/components/admin/reports'

export const metadata = adminMeta('Reports', 'CSV exports for sales, suppliers, inventory, returns and fulfillment.', '/admin/reports')

export default function AdminReports() {
  return (
    <>
      <PageHeader eyebrow="Overview" title="Reports" description="Export operational data as CSV for finance, procurement and supplier reviews." />
      <DemoBanner>Exports are generated in your browser from demonstration records.</DemoBanner>
      <ReportCards />
    </>
  )
}
