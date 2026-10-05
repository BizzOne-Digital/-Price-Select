import { Experience } from '@/components/motion/experience'
import { CartProvider } from '@/components/commerce/cart'
import { CartDrawer } from '@/components/commerce/cart-drawer'
import { ToastProvider } from '@/components/ui/toast'
import { Header } from '@/components/site/header'
import { Footer } from '@/components/site/footer'
import { JsonLd } from '@/components/site/ui'
import { SITE } from '@/lib/site'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CartProvider>
        <Experience>
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Price-Select',
              url: SITE.url,
              email: SITE.email,
              parentOrganization: { '@type': 'Organization', name: SITE.parent, url: SITE.parentUrl },
            }}
          />
          <Header />
          <CartDrawer />
          <main id="main" className="relative">
            {children}
          </main>
          <Footer />
        </Experience>
      </CartProvider>
    </ToastProvider>
  )
}
