import { AccountNav } from '@/components/commerce/account-ui'
import { PageBand } from '@/components/site/ui'
import { customers, DEMO_CUSTOMER_ID } from '@/lib/data/operations'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const me = customers.find((c) => c.id === DEMO_CUSTOMER_ID)!
  return (
    <>
      <PageBand eyebrow={`Welcome back, ${me.name}`} title="Your account." italic={['account.']}>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-obsidian/10 pt-6">
          <p role="note" className="meta flex items-center gap-3 text-teal">
            <span className="size-1.5 rounded-full bg-warning" aria-hidden />
            Demo account
          </p>
          <p className="text-xs text-obsidian/55">Authentication is not yet connected. Orders, cases and details shown are demonstration data.</p>
        </div>
      </PageBand>
      <AccountNav />
      <div className="bg-ivory pb-28 pt-14 md:pb-36 md:pt-20">
        <div className="container-luxe">{children}</div>
      </div>
    </>
  )
}
