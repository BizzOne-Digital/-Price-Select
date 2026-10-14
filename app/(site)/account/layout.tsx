import { AccountNav } from '@/components/commerce/account-ui'
import { PageBand } from '@/components/site/ui'
import { requirePage } from '@/lib/server/page-auth'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const me = await requirePage(['customer'], '/sign-in/customers')
  return (
    <>
      <PageBand eyebrow={`Welcome back, ${me.name}`} title="Your account." italic={['account.']} />
      <AccountNav />
      <div className="bg-ivory pb-28 pt-14 md:pb-36 md:pt-20">
        <div className="container-luxe">{children}</div>
      </div>
    </>
  )
}
