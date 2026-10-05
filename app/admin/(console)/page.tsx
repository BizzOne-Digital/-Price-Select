import { PageHeader, DemoBanner } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { Overview } from '@/components/admin/overview'

export const metadata = adminMeta('Dashboard', 'Marketplace operations overview: sales, orders, suppliers and system monitoring.', '/admin')

export default function AdminDashboard() {
  return (
    <>
      <PageHeader eyebrow="Operations console" title="Today in operations" description="Marketplace health at a glance — sales, supplier routing, inventory feeds and open care cases, with every issue linked to where it is resolved." />
      <DemoBanner>All figures are computed from demonstration orders, suppliers and cases. No live sales, payment or carrier data is connected.</DemoBanner>
      <Overview />
    </>
  )
}
