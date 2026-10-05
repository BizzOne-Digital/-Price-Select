import type { Metadata } from 'next'
import { DetailsForm } from '@/components/commerce/account-forms'
import { customers, DEMO_CUSTOMER_ID } from '@/lib/data/operations'

export const metadata: Metadata = {
  title: 'Account details',
  description: 'Your personal details and notification preferences.',
  alternates: { canonical: '/account/details' },
  robots: { index: false },
}

export default function Page() {
  const me = customers.find((c) => c.id === DEMO_CUSTOMER_ID)!
  return (
    <DetailsForm name={me.name} email={me.email} />
  )
}
