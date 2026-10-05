import type { Metadata } from 'next'
import { ImageReveal, LineReveal, Reveal, SplitText, Stagger, StaggerItem } from '@/components/motion/primitives'
import { ButtonLink, DemoNote, Eyebrow, PageHero, SectionHeading } from '@/components/site/ui'
import { ServiceIndex } from '@/components/site/service-index'
import { IMAGES } from '@/lib/img'
import { SERVICE_TARGETS } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Services',
  description: 'Marketplace shopping, supplier onboarding, catalog management, order routing, customer support, supplier performance, inventory integration and returns — the services behind Price-Select.',
  alternates: { canonical: '/services' },
}

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Services"
        title={'The work behind\nevery selection.'}
        italic={['every', 'selection']}
        image={IMAGES.parcels}
        imageAlt="Labelled parcels stacked in a fulfillment warehouse"
        crumbs={[{ href: '/services', label: 'Services' }]}
        intro="Price-Select is a storefront for customers and an operating platform for suppliers. These are the services that connect the two."
      />

      <section className="section-y bg-ivory">
        <div className="container-luxe">
          <SectionHeading
            index="01"
            eyebrow="Eight services, one platform"
            title={'For customers.\nFor suppliers.'}
            italic={['For', 'suppliers']}
            aside={<p className="max-w-xs text-sm leading-relaxed">Select a service to read how it works. Each one is designed to keep orders clear, accountable and easy to follow.</p>}
          />
          <ServiceIndex />
        </div>
      </section>

      <section className="relative overflow-hidden bg-midnight text-ivory">
        <div className="grid lg:grid-cols-2">
          <ImageReveal src={IMAGES.handoff} alt="A parcel being handed over at a doorway" direction="right" sizes="(min-width:1024px) 50vw, 100vw" className="aspect-[4/3] lg:aspect-auto lg:min-h-[90svh]" />
          <div className="section-y relative px-5 md:px-16 lg:px-20">
            <div aria-hidden className="aurora opacity-50" />
            <div className="relative">
              <Reveal>
                <Eyebrow light index="02">Service targets</Eyebrow>
              </Reveal>
              <SplitText text={'Accountability,\nagreed in advance.'} italicWords={['agreed']} className="mt-8 text-display-3" />
              <Stagger as="ul" className="mt-14">
                {SERVICE_TARGETS.map((t) => (
                  <StaggerItem as="li" key={t.label} className="grid grid-cols-[1fr_auto] items-end gap-6 border-t border-ivory/12 py-6">
                    <div>
                      <p className="text-base">{t.label}</p>
                      <p className="mt-1 text-sm text-ivory/55">{t.detail}</p>
                    </div>
                    <p className="text-right">
                      <span className="font-display text-5xl font-light">{t.value}</span>
                      <span className="ml-2 meta text-ivory/50">{t.unit}</span>
                    </p>
                  </StaggerItem>
                ))}
              </Stagger>
              <DemoNote light className="mt-8">Initial placeholder targets, to be agreed with suppliers before launch</DemoNote>
            </div>
          </div>
        </div>
      </section>

      <section className="section-y bg-pearl">
        <div className="container-luxe grid gap-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow index="03">Become a supplier</Eyebrow>
            </Reveal>
            <SplitText text={'Sell through a\nselected marketplace.'} italicWords={['selected']} className="mt-10 text-display-2 text-obsidian" />
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <Reveal className="text-base leading-relaxed text-slate">
              Approved suppliers manage their catalog, pricing, inventory and fulfillment from a dedicated portal, with API, EDI or secure manual uploads.
            </Reveal>
            <Reveal delay={0.15} className="mt-10 flex flex-wrap gap-4">
              <ButtonLink href="/supplier/apply" variant="dark">Apply to sell</ButtonLink>
              <ButtonLink href="/supplier/login" variant="outline-dark" icon={false}>Supplier login</ButtonLink>
            </Reveal>
          </div>
        </div>
        <div className="container-luxe">
          <LineReveal className="mt-24" />
        </div>
      </section>
    </>
  )
}
