import { Experience } from '@/components/motion/experience'
import { CartProvider } from '@/components/commerce/cart'
import { CartDrawer } from '@/components/commerce/cart-drawer'
import { ToastProvider } from '@/components/ui/toast'
import { Header } from '@/components/site/header'
import { Footer } from '@/components/site/footer'
import { JsonLd } from '@/components/site/ui'
import { SITE } from '@/lib/site'
import { SiteProvider } from '@/components/commerce/site-context'
import { currentActor } from '@/lib/server/page-auth'
import { listCategories } from '@/lib/server/services/catalog'
import { getSiteContent } from '@/lib/server/services/settings'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [actor, categories, content] = await Promise.all([currentActor(), listCategories().catch(() => []), getSiteContent()])
  // Only the display name and role reach the browser.
  const session = actor ? { name: actor.name, role: actor.role } : null
  return (
    <SiteProvider session={session} categories={categories}>
    <ToastProvider>
      <CartProvider customer={actor?.role === 'customer'}>
        <Experience>
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Price-Select',
              url: SITE.url,
              email: content.contactEmail,
              parentOrganization: { '@type': 'Organization', name: SITE.parent, url: SITE.parentUrl },
            }}
          />
          <Header />
          <CartDrawer />
          <main id="main" className="relative">
            {children}
          </main>
          <Footer email={content.contactEmail} />
        </Experience>
      </CartProvider>
    </ToastProvider>
    </SiteProvider>
  )
}
