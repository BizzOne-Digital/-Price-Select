import type { Metadata } from 'next'
import { ImageReveal, LineReveal, Parallax, Reveal, ScrollMarquee, SplitText } from '@/components/motion/primitives'
import { ButtonLink, Eyebrow, PageHero, SectionHeading } from '@/components/site/ui'
import { IMAGES } from '@/lib/img'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Price-Select.com is a curated, multi-supplier marketplace and a business of Jr-Procurement.com: selected products, approved suppliers and transparent pricing in one considered experience.',
  alternates: { canonical: '/about' },
}

const PILLARS = [
  ['Product selection', 'A focused range across very different departments, chosen so every listing earns its place.'],
  ['Approved suppliers', 'Suppliers apply and are reviewed before they can list. Their documentation stays on file.'],
  ['Streamlined purchasing', 'One account, one cart and one checkout across every department and every supplier.'],
  ['Transparent pricing', 'Product prices are shown without taxes and shipping. Both appear as separate lines before you pay.'],
  ['Customer convenience', 'Order tracking, returns, replacements and support requests handled in one place.'],
  ['Fulfillment coordination', 'Orders are routed to the supplier responsible for each item and tracked through to delivery.'],
  ['Supplier relationships', 'Clear service targets, agreed in advance, so customers and suppliers know what to expect.'],
  ['Marketplace technology', 'Built for API, EDI and manual catalog workflows, with audit trails and role-based access.'],
]

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={`About Us · A business of ${SITE.parent}`}
        title={'A new standard\nfor selected\ncommerce.'}
        italic={['selected']}
        image={IMAGES.towers}
        imageAlt="Glass towers seen from below, converging into the sky"
        crumbs={[{ href: '/about', label: 'About Us' }]}
        intro="Price-Select.com is a marketplace built on a simple idea: buying should feel considered. Fewer products, chosen with care, from suppliers who have been approved to sell them."
        size="full"
      />

      <section className="section-y bg-ivory">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow index="01">Who we are</Eyebrow>
            </Reveal>
            <SplitText text={'More than\na marketplace.'} italicWords={['marketplace']} className="mt-10 text-display-2 text-obsidian" />
          </div>
          <div className="space-y-6 text-lg leading-relaxed text-obsidian/80 lg:col-span-5 lg:col-start-8 lg:pt-24">
            <Reveal>
              <p>
                Price-Select.com is a business of {SITE.parent}. It brings together products from approved suppliers across technology, construction, utility vehicles, mobility, energy, family, home and everyday essentials, and presents them as one clear, considered purchasing experience.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-base text-slate">
                Customers browse, compare and order in one place. Approved suppliers fulfill directly. Behind the scenes, every order is routed, tracked and supported, so a broad assortment never has to feel complicated.
              </p>
            </Reveal>
          </div>
        </div>

        {/* Layered composition */}
        <div className="container-luxe relative mt-28 grid grid-cols-12 md:mt-40">
          <ImageReveal src={IMAGES.logistics} alt="An aerial view of a container port arranged in precise rows" direction="left" parallax={6} sizes="(min-width:768px) 66vw, 100vw" className="col-span-12 aspect-[16/9] md:col-span-8" />
          <div className="col-span-8 col-start-5 -mt-20 md:col-span-4 md:col-start-8 md:-mt-48">
            <Parallax speed={50}>
              <ImageReveal src={IMAGES.parcels} alt="Parcels stacked and labelled, ready for dispatch" direction="up" delay={0.2} sizes="(min-width:768px) 33vw, 66vw" className="sel-frame aspect-[4/5] border-[10px] border-ivory" />
            </Parallax>
          </div>
        </div>
      </section>

      <section className="bg-obsidian py-16 text-ivory md:py-24">
        <ScrollMarquee from={0} to={-35}>
          <p aria-hidden className="font-display text-[clamp(4rem,12vw,13rem)] font-light leading-none tracking-[-0.04em]">
            Selection <em className="text-champagne">·</em> Value <em className="text-champagne">·</em> Trust <em className="text-champagne">·</em> Precision <em className="text-champagne">·</em> Selection
          </p>
        </ScrollMarquee>
      </section>

      <section className="section-y bg-pearl">
        <div className="container-luxe">
          <SectionHeading index="02" eyebrow="What we stand behind" title={'Eight commitments,\nquietly kept.'} italic={['quietly', 'kept']} />
          <div className="mt-20 grid gap-x-16 lg:grid-cols-12">
            <div className="hidden lg:col-span-4 lg:block">
              <div className="sticky top-32">
                <ImageReveal src={IMAGES.plan} alt="Architectural drawings on a drafting table" direction="down" sizes="33vw" className="aspect-[3/4]" />
              </div>
            </div>
            <ol className="lg:col-span-7 lg:col-start-6">
              {PILLARS.map(([t, d], i) => (
                <Reveal as="li" key={t} className="group grid grid-cols-[4rem_1fr] gap-4 border-t border-obsidian/12 py-10 md:grid-cols-[6rem_1fr]">
                  <span className="font-display text-5xl font-light text-obsidian/15 transition-colors duration-700 group-hover:text-gold">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-display text-3xl font-light text-obsidian md:text-4xl">{t}</h3>
                    <p className="mt-3 max-w-lg text-base leading-relaxed text-slate">{d}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section-y relative overflow-hidden bg-midnight text-ivory">
        <div aria-hidden className="aurora opacity-60" />
        <div className="container-luxe relative text-center">
          <Reveal>
            <Eyebrow light className="justify-center">
              Price-Select, just for you
            </Eyebrow>
          </Reveal>
          <SplitText text={'Commerce,\nconsidered.'} italicWords={['considered']} className="mx-auto mt-10 text-display-1" />
          <LineReveal gold origin="center" className="mx-auto mt-14 max-w-sm" />
          <Reveal delay={0.3} className="mt-14 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/shop">Shop the selection</ButtonLink>
            <ButtonLink href="/services" variant="outline-light">Our services</ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  )
}
