import { DemoBanner, PageHeader } from '@/components/dashboard/kit'
import { adminMeta } from '@/components/admin/data'
import { PaymentsBoard } from '@/components/admin/payments'

export const metadata = adminMeta('Payments', 'Payment status, refunds, failed payments, transactions and supplier payouts.', '/admin/payments')

export default function AdminPayments() {
  return (
    <>
      <PageHeader eyebrow="Commerce" title="Payments" description="Payment status, refunds, failures and the supplier payout model — structured for the payment provider." />
      <DemoBanner>No payment provider connected — figures derived from demonstration orders. Nothing here reflects real transactions.</DemoBanner>
      <PaymentsBoard />
    </>
  )
}
