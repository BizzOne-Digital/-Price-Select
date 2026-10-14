import type { Metadata } from 'next'
import { DetailsForm } from '@/components/commerce/account-forms'
import { requirePage } from '@/lib/server/page-auth'
import { capabilities } from '@/lib/server/services/capabilities'
import { getAccount } from '@/lib/server/services/customers'

export const metadata: Metadata = {
  title: 'Account details',
  description: 'Your personal details, password, membership and email preferences.',
  alternates: { canonical: '/account/details' },
  robots: { index: false },
}

export default async function Page() {
  const actor = await requirePage(['customer'], '/sign-in/customers')
  const [account, caps] = await Promise.all([getAccount(actor), capabilities()])
  return <DetailsForm account={account} paymentsAvailable={caps.payments} />
}
