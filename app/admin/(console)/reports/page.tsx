import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { ReportCards } from '@/components/admin/reports'
import { requirePage } from '@/lib/server/page-auth'

export const metadata = adminMeta('Reports', 'CSV exports for sales, suppliers, inventory, returns and fulfillment.', '/admin/reports')

export default async function AdminReports() {
  await requirePage(['admin'], '/admin/login')
  return (
    <>
      <PageHeader eyebrow="Overview" title="Reports" description="Export operational data as CSV for finance, procurement and supplier reviews." />
      <ReportCards />
    </>
  )
}
