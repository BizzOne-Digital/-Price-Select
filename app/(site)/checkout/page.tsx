import type { Metadata } from 'next'
import { LockKeyhole } from 'lucide-react'
import { CheckoutFlow } from '@/components/commerce/checkout-flow'
import { DemoNote } from '@/components/site/ui'

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Secure, focused checkout for your Price-Select order.',
  alternates: { canonical: '/checkout' },
  robots: { index: false },
}

/** Quiet by design: no hero, no entrance choreography — just the task. */
export default function Checkout() {
  return (
    <>
      <section className="bg-ivory text-obsidian">
        <div className="container-luxe flex flex-wrap items-end justify-between gap-6 pb-10 pt-32 md:pt-36">
          <div>
            <p className="eyebrow flex items-center gap-3 text-obsidian/55">
              <LockKeyhole className="size-3.5 text-teal" strokeWidth={1.4} aria-hidden />
              Secure checkout
            </p>
            <h1 className="mt-4 font-display text-5xl font-light tracking-[-0.03em] md:text-6xl">Checkout</h1>
          </div>
          <DemoNote light>Demonstration environment — no payment is taken</DemoNote>
        </div>
        <div aria-hidden className="sel-line sel-line--gold" />
      </section>
      <section id="checkout" className="scroll-mt-24 bg-ivory pb-28 pt-12 md:pb-36 md:pt-16">
        <div className="container-luxe">
          <CheckoutFlow />
        </div>
      </section>
    </>
  )
}
