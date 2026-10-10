import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import Script from 'next/script'
import { SITE } from '@/lib/site'
import './globals.css'

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})
const sans = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'Price-Select — Selected for the way you buy', template: '%s · Price-Select' },
  description: SITE.description,
  applicationName: 'Price-Select',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Price-Select',
    title: 'Price-Select — Selected for the way you buy',
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: 'summary_large_image', title: 'Price-Select', description: SITE.description },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }], apple: '/apple-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#FAF7F2',
  colorScheme: 'dark light',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>
        {/* Before paint: skip the storefront intro for returning visitors, without a flash. */}
        <Script id="ps-intro" strategy="beforeInteractive">
          {"try{if(sessionStorage.getItem('ps-intro')==='1'||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.intro='seen'}catch(e){}"}
        </Script>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
