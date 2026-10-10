import type { Metadata } from 'next'
import { ImageReveal, Reveal, SplitText, Stagger, StaggerItem } from '@/components/motion/primitives'
import { ButtonLink, DemoNote, Eyebrow, PageHero, SectionHeading } from '@/components/site/ui'
import { IMAGES } from '@/lib/img'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Our Team',
  description: 'The people behind Price-Select.com, a business of Jr-Procurement.com.',
  alternates: { canonical: '/team' },
}

// Placeholder structure: real names, roles, portraits and short bios to be supplied by the client.
const PEOPLE = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, name: 'Name to be supplied', role: 'Role to be supplied' }))

const FUNCTIONS = [
  ['Selection & procurement', 'Chooses what earns a place in the marketplace, and why.'],
  ['Supplier relations', 'Reviews applications, agrees service targets and supports approved suppliers.'],
  ['Customer care', 'Handles requests, returns, replacements and escalations from start to resolution.'],
  ['Operations & technology', 'Keeps orders routed, tracked and accountable across every supplier.'],
]

export default function TeamPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Team"
        title={'The people\nwho select.'}
        italic={['select']}
        image={IMAGES.office}
        imageAlt="A calm, light-filled office with plants and long desks"
        crumbs={[{ href: '/team', label: 'Our Team' }]}
        intro={`Price-Select is run by a small team within ${SITE.parent}, focused on selection, supplier relationships and the customer experience.`}
        size="md"
      />

      <section className="section-y bg-ivory">
        <div className="container-luxe">
          <SectionHeading index="01" eyebrow="Leadership" title={'Introductions,\ncoming soon.'} italic={['coming', 'soon']} aside={<p className="max-w-xs text-sm leading-relaxed">Team profiles will be published here once the team has supplied their details.</p>} />
          <Stagger className="mt-20 grid grid-cols-2 gap-x-4 gap-y-14 md:gap-x-8 lg:grid-cols-4">
            {PEOPLE.map((p, i) => (
              <StaggerItem key={p.id} className={i % 2 ? 'lg:mt-24' : ''}>
                <figure className="group">
                  <div className="sel-frame relative aspect-[3/4] overflow-hidden bg-pearl">
                    {/* Portrait placeholder: monogram on architectural ground. */}
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#e8e4db,#d9d4c8)]" />
                    <div className="absolute inset-0 grid place-items-center">
                      <span className="font-display text-[5rem] font-light italic text-obsidian/15 transition-transform duration-1000 ease-[var(--ease-luxe)] group-hover:scale-110">P/S</span>
                    </div>
                    <span className="absolute bottom-4 left-4 meta text-slate">Portrait to be supplied</span>
                  </div>
                  <figcaption className="mt-5 border-t border-obsidian/12 pt-4">
                    <p className="text-base font-medium text-obsidian/70">{p.name}</p>
                    <p className="mt-1 meta text-slate">{p.role}</p>
                  </figcaption>
                </figure>
              </StaggerItem>
            ))}
          </Stagger>
          <DemoNote className="mt-14">Placeholder profiles — content to be supplied</DemoNote>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ivory text-obsidian">
        <div className="grid lg:grid-cols-12">
          <div className="section-y px-5 md:px-16 lg:col-span-6 lg:px-20">
            <Reveal>
              <Eyebrow light index="02">How the team works</Eyebrow>
            </Reveal>
            <SplitText text={'Four disciplines,\none standard.'} italicWords={['one', 'standard']} className="mt-10 text-display-3" />
            <ol className="mt-14">
              {FUNCTIONS.map(([t, d], i) => (
                <Reveal as="li" key={t} delay={i * 0.08} className="grid grid-cols-[3rem_1fr] border-t border-obsidian/12 py-7">
                  <span className="meta text-teal">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block font-display text-2xl font-light">{t}</span>
                    <span className="mt-2 block text-sm leading-relaxed text-obsidian/60">{d}</span>
                  </span>
                </Reveal>
              ))}
            </ol>
          </div>
          <ImageReveal src={IMAGES.glassTower} alt="A sculptural glass and steel building against the sky" direction="left" sizes="(min-width:1024px) 50vw, 100vw" className="aspect-[4/3] lg:col-span-6 lg:aspect-auto" />
        </div>
      </section>

      <section className="section-y bg-pearl text-center">
        <div className="container-luxe">
          <SplitText text={'Work with us.'} italicWords={['us']} className="text-display-2 text-obsidian" />
          <Reveal delay={0.2} className="mx-auto mt-8 max-w-md text-base text-slate">
            For supplier partnerships or general enquiries, write to us.
          </Reveal>
          <Reveal delay={0.3} className="mt-10 flex justify-center">
            <ButtonLink href="/contact" variant="dark">Contact the team</ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  )
}
