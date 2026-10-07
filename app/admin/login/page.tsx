import Image from 'next/image'
import Link from 'next/link'
import { Wordmark } from '@/components/site/header'
import { adminMeta } from '@/components/admin/data'
import { AdminLoginForm } from '@/components/admin/login-form'
import { SplitText } from '@/components/motion/primitives'
import { IMAGES } from '@/lib/img'

export const metadata = adminMeta('Staff sign-in', 'Sign-in for Price-Select administrators and customer service staff.', '/admin/login')

export default function AdminLogin() {
  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-obsidian text-ivory">
      <Image src={IMAGES.darkStructure} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-[0.18]" />
      <div aria-hidden className="aurora -z-10 opacity-80" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(11_13_16/0.94),rgb(11_13_16/0.55)_60%,rgb(11_13_16/0.8))]" />

      <div className="container-luxe flex min-h-svh flex-col py-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="shrink-0" aria-label="Price-Select storefront">
            <Wordmark className="h-10 md:h-12" />
          </Link>
          <p className="meta text-[0.62rem] text-ivory/40">Staff access</p>
        </div>

        <div className="grid flex-1 items-center gap-16 py-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-4 text-ivory/50">
              <span className="sel-mark" aria-hidden /> Operations console
            </p>
            <SplitText as="h1" immediate delay={0.1} text={'Operations,\nin order.'} italicWords={['order']} className="mt-8 text-display-1" />
            <p className="mt-10 max-w-md text-sm leading-relaxed text-ivory/55">
              Staff accounts are <span className="text-ivory/85">Administrator</span> or <span className="text-ivory/85">Customer service</span>. Customer service staff see orders, returns, support and customer records; administrators see everything.
            </p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <div className="sel-frame border border-ivory/10 bg-obsidian/60 p-7 md:p-10">
              <h2 className="font-display text-3xl font-light">Sign in</h2>
              <p className="mt-2 mb-8 text-xs text-ivory/45">Restricted to Price-Select staff.</p>
              <AdminLoginForm />
            </div>
            <p className="mt-6 flex items-start gap-3 meta text-[0.6rem] leading-relaxed text-ivory/40">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-champagne/70" aria-hidden />
              Demo sign-in — authentication provider not yet connected. No credentials are checked or stored.
            </p>
          </div>
        </div>
        <div className="sel-line--gold h-px opacity-40" aria-hidden />
      </div>
    </main>
  )
}
