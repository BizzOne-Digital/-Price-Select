import type { Metadata } from 'next'
import { LineReveal, Reveal, SplitText, Stagger, StaggerItem } from '@/components/motion/primitives'
import { ButtonLink, DemoNote, Eyebrow, PageHero, SectionHeading } from '@/components/site/ui'
import { IMAGES } from '@/lib/img'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Product prices on Price-Select are shown without applicable taxes and shipping. Both are calculated and shown as separate lines before you pay.',
  alternates: { canonical: '/pricing' },
}

const LINES = [
  { k: 'Product subtotal', v: 'The prices you see on every product page, multiplied by quantity.', tone: 'base' },
  { k: 'Shipping', v: 'Calculated at checkout for each shipment. Orders from several suppliers may include several shipments.', tone: 'add' },
  { k: 'Applicable taxes', v: 'Calculated at checkout where applicable, based on the delivery address and the product.', tone: 'add' },
  { k: 'Discounts', v: 'Seasonal pricing or promotions, where offered, shown as their own line.', tone: 'sub' },
  { k: 'Final total', v: 'The amount you confirm before paying. Nothing is added afterwards.', tone: 'total' },
]

const FAQ = [
  ['Why are taxes and shipping not included in product prices?', 'Price-Select works with suppliers who ship from different locations, and taxes depend on where an order is delivered. Showing them separately keeps product prices comparable and the final total accurate.'],
  ['When will I see the full amount?', 'Shipping and applicable taxes appear at checkout, before payment. The review step shows every line, including the final total.'],
  ['What if my order ships from more than one supplier?', 'Each supplier ships their items separately. Your checkout shows each shipment and its shipping charge, and you can track each one from your account.'],
  ['How does seasonal pricing work?', 'From time to time a small selection of products is offered at special pricing, such as our "Buy summer in winter" edit. The special price and the regular price are both shown.'],
  ['Which currencies and payment methods are accepted?', 'Launch currencies and the payment provider are being confirmed. This page will be updated before launch.'],
]

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title={'Clear from\nthe start.'}
        italic={['the', 'start']}
        image={IMAGES.architectureCurve}
        imageAlt="Curving white architectural bands against a blue sky"
        crumbs={[{ href: '/pricing', label: 'Pricing' }]}
        intro="Every product price on Price-Select is shown without taxes and shipping. Both are calculated and listed separately before you pay."
        size="md"
      />

      <section className="section-y bg-ivory">
        <div className="container-luxe grid gap-20 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow index="01">The anatomy of a total</Eyebrow>
            </Reveal>
            <SplitText text={'Prices without\ntax and shipping.'} italicWords={['without']} className="mt-10 text-display-2 text-obsidian" />
            <Reveal delay={0.2} className="mt-10 max-w-md text-base leading-relaxed text-slate">
              You always see what a product costs. Everything else is added transparently, line by line, at checkout.
            </Reveal>
          </div>

          {/* An editorial "receipt" */}
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="sel-frame border border-obsidian/12 bg-pearl/50 p-8 md:p-12">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow text-slate">Order summary</p>
                <p className="meta text-slate">Illustrative</p>
              </div>
              <Stagger as="ol" className="mt-8">
                {LINES.map((l, i) => (
                  <StaggerItem as="li" key={l.k} className={l.tone === 'total' ? 'mt-6 border-t-2 border-obsidian pt-6' : 'border-t border-obsidian/10 py-5'}>
                    <div className="flex items-baseline justify-between gap-6">
                      <span className={l.tone === 'total' ? 'font-display text-3xl font-light' : 'text-base font-medium'}>
                        <span className="mr-3 meta text-gold-deep">{l.tone === 'add' ? '+' : l.tone === 'sub' ? '−' : l.tone === 'total' ? '=' : String(i + 1).padStart(2, '0')}</span>
                        {l.k}
                      </span>
                      <span className="h-px flex-1 translate-y-[-4px] border-b border-dotted border-obsidian/20" aria-hidden />
                    </div>
                    <p className="mt-2 max-w-md pl-8 text-sm leading-relaxed text-slate">{l.v}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            </div>
            <DemoNote className="mt-6">Tax and shipping rates are calculated by providers being confirmed before launch</DemoNote>
          </div>
        </div>
      </section>

      <section className="section-y relative overflow-hidden bg-ivory text-obsidian">
        <div aria-hidden className="aurora opacity-50" />
        <div className="container-luxe relative">
          <SectionHeading light index="02" eyebrow="Seasonal pricing" title={'Special prices,\nthoughtfully timed.'} italic={['thoughtfully', 'timed']} aside={<ButtonLink href="/shop?seasonal=1" variant="gold">View the seasonal edit</ButtonLink>} />
          <div className="mt-16 grid gap-px bg-obsidian/10 md:grid-cols-3">
            {[
              ['Three to four products', 'Each season a small edit of products is selected for special pricing. Never a clearance aisle.'],
              ['Both prices shown', 'The special price appears alongside the regular price, so the saving is always visible.'],
              ['A limited window', 'Seasonal pricing runs for a defined period, set and published by our team.'],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 0.1} className="bg-ivory p-8 md:p-10">
                <p className="meta text-teal">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-8 font-display text-3xl font-light">{t}</h3>
                <p className="mt-4 text-sm leading-relaxed text-obsidian/60">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-y bg-ivory">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Reveal>
              <Eyebrow index="03">Questions</Eyebrow>
            </Reveal>
            <SplitText text={'Pricing,\nanswered.'} italicWords={['answered']} className="mt-10 text-display-3 text-obsidian" />
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <LineReveal />
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-b border-obsidian/12">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-7 text-lg font-medium text-obsidian marker:hidden [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="relative size-4 shrink-0" aria-hidden>
                    <span className="absolute top-1/2 h-px w-full bg-gold" />
                    <span className="absolute left-1/2 h-full w-px bg-gold transition-transform duration-500 group-open:rotate-90 group-open:scale-0" />
                  </span>
                </summary>
                <p className="max-w-2xl pb-8 text-base leading-relaxed text-slate">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
