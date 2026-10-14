import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { Overview } from '@/components/admin/overview'
import { requirePage } from '@/lib/server/page-auth'
import { adminDashboard } from '@/lib/server/services/metrics'
import { listOrders } from '@/lib/server/services/operations'

export const metadata = adminMeta('Dashboard', 'Marketplace operations overview: sales, orders, suppliers and system monitoring.', '/admin')

export default async function AdminDashboard() {
  const actor = await requirePage(['admin', 'support'], '/admin/login')
  const [data, recent] = await Promise.all([adminDashboard(actor), listOrders(actor, { pageSize: 6 })])
  return (
    <>
      <PageHeader eyebrow="Operations console" title="Today in operations" description="Marketplace health at a glance — sales, supplier routing, inventory feeds and open care cases, with every issue linked to where it is resolved." />
      <Overview data={data} recent={recent.items} admin={actor.role === 'admin'} />
    </>
  )
}
