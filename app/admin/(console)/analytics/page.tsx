import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { AnalyticsBoard } from '@/components/admin/analytics'
import { requirePage } from '@/lib/server/page-auth'
import { adminDashboard } from '@/lib/server/services/metrics'
import { listSuppliers } from '@/lib/server/services/suppliers'

export const metadata = adminMeta('Analytics', 'Revenue, orders, categories, products, suppliers, returns and fulfillment performance.', '/admin/analytics')

export default async function AdminAnalytics() {
  const actor = await requirePage(['admin', 'support'], '/admin/login')
  const [data, suppliers] = await Promise.all([adminDashboard(actor), actor.role === 'admin' ? listSuppliers(actor) : Promise.resolve(null)])
  return (
    <>
      <PageHeader eyebrow="Overview" title="Analytics" description="Revenue, demand and fulfillment quality across the marketplace, computed from stored orders and cases." />
      <AnalyticsBoard data={data} suppliers={suppliers} />
    </>
  )
}
