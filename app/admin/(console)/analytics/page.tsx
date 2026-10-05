import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { AnalyticsBoard } from '@/components/admin/analytics'

export const metadata = adminMeta('Analytics', 'Revenue, orders, categories, products, suppliers, returns and fulfillment performance.', '/admin/analytics')

export default function AdminAnalytics() {
  return (
    <>
      <PageHeader eyebrow="Overview" title="Analytics" description="Revenue, demand and fulfillment quality across the marketplace." />
      <DemoBanner>Prepared for analytics integration. Weekly series and percentages are demonstration values, not measured performance.</DemoBanner>
      <AnalyticsBoard />
    </>
  )
}
