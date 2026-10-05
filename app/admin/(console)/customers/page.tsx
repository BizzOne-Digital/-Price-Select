import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { CustomerBoard } from '@/components/admin/customers'

export const metadata = adminMeta('Customers', 'Customer accounts, orders, lifetime value and support requests.', '/admin/customers')

export default function AdminCustomers() {
  return (
    <>
      <PageHeader eyebrow="Network" title="Customers" description="Accounts, order history and support load. Customer service staff can view and act on these records." />
      <DemoBanner>Placeholder customer records — no real personal data is shown.</DemoBanner>
      <CustomerBoard />
    </>
  )
}
