import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { CaseDesk } from '@/components/admin/cases'
import { requirePage } from '@/lib/server/page-auth'
import { capabilities } from '@/lib/server/services/capabilities'
import { listCases, staffList } from '@/lib/server/services/cases'

export const metadata = adminMeta('Returns', 'Return, damage and replacement case queues for customer service.', '/admin/returns')

export default async function AdminReturns() {
  const actor = await requirePage(['admin', 'support'], '/admin/login')
  const [cases, staff, caps] = await Promise.all([listCases(actor, 'return'), staffList(), capabilities()])
  return (
    <>
      <PageHeader eyebrow="Care · Customer service" title="Returns &amp; claims" description="Pending returns, damage claims and escalations. Track the supplier's response against target and document every outcome." />
      <CaseDesk kind="returns" initial={cases} staff={staff} role={actor.role} now={Date.now()} paymentsConnected={caps.payments} />
    </>
  )
}
