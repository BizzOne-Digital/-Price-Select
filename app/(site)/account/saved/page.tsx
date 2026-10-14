import type { Metadata } from 'next'
import { SavedList } from '@/components/commerce/account-forms'
import { SectionTitle } from '@/components/commerce/account-blocks'
import { requirePage } from '@/lib/server/page-auth'
import { savedProducts } from '@/lib/server/services/customers'

export const metadata: Metadata = {
  title: 'Saved products',
  description: 'Products you have saved for later.',
  alternates: { canonical: '/account/saved' },
  robots: { index: false },
}

export default async function Page() {
  const items = await savedProducts(await requirePage(['customer'], '/sign-in/customers'))
  return (
    <div className="space-y-10">
      <SectionTitle title="Saved for later" />
      <SavedList initial={items} />
    </div>
  )
}
