import type { Metadata } from 'next'
import { AddressBook } from '@/components/commerce/account-forms'
import { SectionTitle } from '@/components/commerce/account-blocks'
import { requirePage } from '@/lib/server/page-auth'
import { getAccount } from '@/lib/server/services/customers'

export const metadata: Metadata = {
  title: 'Addresses',
  description: 'Manage your saved delivery addresses.',
  alternates: { canonical: '/account/addresses' },
  robots: { index: false },
}

export default async function Page() {
  const account = await getAccount(await requirePage(['customer'], '/sign-in/customers'))
  return (
    <div className="space-y-10">
      <SectionTitle title="Addresses" />
      <AddressBook initial={account.addresses} />
    </div>
  )
}
