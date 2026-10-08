import type { Metadata } from 'next'
import { ImageReveal, LineReveal, Parallax, Reveal, ScrollMarquee, SplitText } from '@/components/motion/primitives'
import { ButtonLink, Eyebrow, PageHero, SectionHeading } from '@/components/site/ui'
import { IMAGES } from '@/lib/img'
import { MEMBERSHIPS, SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'At Price-Select.com, we believe shoppers shouldn’t have to pay inflated prices to get the products they need. Membership options designed to help you save.',
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
        size="full"
      />

      <section className="section-y bg-ivory">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow index="01">About us</Eyebrow>
            </Reveal>
            <SplitText text={'A better way\nto shop.'} italicWords={['better']} className="mt-10 text-display-2 text-obsidian" />
          </div>
          <div className="space-y-6 text-lg leading-relaxed text-obsidian/80 lg:col-span-6 lg:col-start-7 lg:pt-24">
            <Reveal>
              <p>
                At Price-Select.com, we believe shoppers shouldn’t have to pay inflated prices to get the products they need. Our team was tired of seeing everyday goods marked up, so we set out to create a better way to shop.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>We offer products across categories including electronics, home and garden, construction supplies, mobility, solar energy, and more—with membership options designed to help you save:</p>
            </Reveal>
            <Reveal delay={0.15}>
              <ul className="border-y border-obsidian/12 text-base">
                {MEMBERSHIPS.map(([name, price, perk]) => (
                  <li key={name} className="border-b border-obsidian/12 py-5 last:border-b-0">
                    <span className="font-display text-2xl font-light text-obsidian">{name}</span> <span className="text-gold">— {price}:</span> <span className="text-slate">{perk}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.2}>
              <p>Our goal is simple: help you find what you need at a better price.</p>
            </Reveal>
            <Reveal delay={0.25}>
              <p className="font-display text-2xl font-light italic text-obsidian">Join Price-Select.com and make your membership work for you.</p>
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

      <section className="section-y bg-ivory">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow index="02">Our Vision</Eyebrow>
            </Reveal>
            <SplitText text={'Fairer, more\naffordable shopping.'} italicWords={['affordable']} className="mt-10 text-display-2 text-obsidian" />
          </div>
          <div className="space-y-6 text-lg leading-relaxed text-obsidian/80 lg:col-span-6 lg:col-start-7 lg:pt-24">
            <Reveal>
              <p>At Price-Select.com, our vision is to make shopping fairer and more affordable. We believe people deserve access to quality products without paying more than they should.</p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>
                We source products from factories, warehouses, and suppliers around the world, looking for ways to reduce costs and pass the savings on to our customers. Our marketplace brings together a broad range of products—from electronics and home and garden to construction supplies, mobility, and solar energy—so shoppers can find what they need in one place.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="font-display text-2xl font-light italic text-obsidian">Our aim is simple: offer more choice, better value, and a shopping experience that puts customers first.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section-y bg-pearl">
        <div className="container-luxe">
          <SectionHeading index="03" eyebrow="What we stand behind" title={'Eight commitments,\nquietly kept.'} italic={['quietly', 'kept']} />
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
            <ButtonLink href="/sign-in/members" variant="outline-light">Member sign in</ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  )
}
