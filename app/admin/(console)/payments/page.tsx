import { PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { PaymentsBoard } from '@/components/admin/payments'
import { requirePage } from '@/lib/server/page-auth'
import { capabilities } from '@/lib/server/services/capabilities'
import { listCases } from '@/lib/server/services/cases'
import { listOrders } from '@/lib/server/services/operations'
import { getSettings } from '@/lib/server/services/settings'

export const metadata = adminMeta('Payments', 'Payment status, refunds, failed payments, transactions and supplier payouts.', '/admin/payments')

export default async function AdminPayments() {
  const actor = await requirePage(['admin'], '/admin/login')
  const [orders, cases, settings, caps] = await Promise.all([listOrders(actor, { pageSize: 200 }), listCases(actor), getSettings(), capabilities()])
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Payments" description="Payment status, refunds, failures and supplier payouts, derived from stored orders and payment operations." />
      <PaymentsBoard orders={orders.items} total={orders.total} disputes={cases.filter((c) => c.status === 'escalated')} commissionPercent={settings.fees.commissionPercent} paymentsConnected={caps.payments} />
    </>
  )
}
