import type { Metadata } from 'next'
import { LoginForm } from '@/components/supplier/auth'

export const metadata: Metadata = {
  title: 'Supplier sign in',
  description: 'Sign in to the Price-Select supplier portal to manage listings, fulfillments, inventory and returns.',
  alternates: { canonical: '/supplier/login' },
  robots: { index: false },
}

export default function SupplierLogin() {
  return (
    <div className="my-auto w-full max-w-lg">
      <p className="eyebrow text-champagne/80">Supplier portal</p>
      <h1 className="mt-5 font-display text-[clamp(2.75rem,5vw,4.25rem)] font-light leading-[0.95] tracking-[-0.03em]">
        Sign in to your <em className="text-champagne">workspace</em>.
      </h1>
      <p className="mt-6 max-w-md text-sm leading-relaxed text-ivory/55">Acknowledge routed orders, upload tracking, keep inventory current and respond to cases — only for the items routed to you.</p>
      <LoginForm />
    </div>
  )
}
