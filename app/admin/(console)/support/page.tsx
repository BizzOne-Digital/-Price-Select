import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { CaseDesk } from '@/components/admin/cases'
import { requirePage } from '@/lib/server/page-auth'
import { capabilities } from '@/lib/server/services/capabilities'
import { listCases, staffList } from '@/lib/server/services/cases'

export const metadata = adminMeta('Support', 'Customer support case queues with SLA tracking.', '/admin/support')

export default async function AdminSupport() {
  const actor = await requirePage(['admin', 'support'], '/admin/login')
  const [cases, staff, caps] = await Promise.all([listCases(actor, 'support'), staffList(), capabilities()])
  return (
    <>
      <PageHeader eyebrow="Care · Customer service" title="Support desk" description="Every customer request with its SLA, owner and history. Add internal notes, message the customer or supplier and record the resolution." />
      <CaseDesk kind="support" initial={cases} staff={staff} role={actor.role} now={Date.now()} paymentsConnected={caps.payments} />
    </>
  )
}
