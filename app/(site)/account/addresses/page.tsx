import type { Metadata } from 'next'
import { AddressBook } from '@/components/commerce/account-forms'
import { DEMO_ADDRESSES } from '@/components/commerce/account-data'
import { SectionTitle } from '@/components/commerce/account-blocks'

export const metadata: Metadata = {
  title: 'Addresses',
  description: 'Manage your saved delivery addresses.',
  alternates: { canonical: '/account/addresses' },
  robots: { index: false },
}

export default function Page() {
  return (
    <div className="space-y-10">
      <SectionTitle title="Addresses" />
      <AddressBook initial={DEMO_ADDRESSES} />
    </div>
  )
}
