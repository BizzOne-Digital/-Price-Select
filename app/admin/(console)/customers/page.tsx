import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { CustomerBoard } from '@/components/admin/customers'
import { requirePage } from '@/lib/server/page-auth'
import { listCustomers } from '@/lib/server/services/customers'

export const metadata = adminMeta('Customers', 'Customer accounts, orders, lifetime value and support requests.', '/admin/customers')

export default async function AdminCustomers() {
  const actor = await requirePage(['admin', 'support'], '/admin/login')
  const rows = await listCustomers(actor)
  return (
    <>
      <PageHeader eyebrow="Network" title="Customers" description="Accounts, order history and support load. Customer service staff can view and act on these records." />
      <CustomerBoard initial={rows} />
    </>
  )
}
