import type { Metadata } from 'next'
import { SavedList } from '@/components/commerce/account-forms'
import { SAVED_DEMO } from '@/components/commerce/account-data'
import { SectionTitle } from '@/components/commerce/account-blocks'

export const metadata: Metadata = {
  title: 'Saved products',
  description: 'Products you have saved for later.',
  alternates: { canonical: '/account/saved' },
  robots: { index: false },
}

export default function Page() {
  return (
    <div className="space-y-10">
      <SectionTitle title="Saved for later" />
      <SavedList slugs={SAVED_DEMO} />
    </div>
  )
}
