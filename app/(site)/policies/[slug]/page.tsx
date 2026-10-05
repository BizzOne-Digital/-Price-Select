import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Reveal } from '@/components/motion/primitives'
import { DemoNote, PageBand } from '@/components/site/ui'
import { SITE } from '@/lib/site'

// Policy text is managed by administrators and must be supplied by the client (legal review).
// These pages provide structure only and never invent legal content.
const POLICIES = {
  privacy: { title: 'Privacy policy', sections: ['Information we collect', 'How information is used', 'Sharing with suppliers and service providers', 'Data security and retention', 'Your choices and rights', 'Contact'] },
  terms: { title: 'Terms of use', sections: ['Using Price-Select', 'Accounts', 'Orders, pricing and payment', 'Shipping and multi-supplier fulfillment', 'Limitations', 'Changes to these terms'] },
  returns: { title: 'Returns & refunds', sections: ['Return windows by category', 'Damaged or defective items', 'Cancellations', 'Replacements', 'Refund timing', 'Return shipping responsibility'] },
} as const

type Slug = keyof typeof POLICIES

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = POLICIES[slug as Slug]
  return p ? { title: p.title, alternates: { canonical: `/policies/${slug}` } } : {}
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = POLICIES[slug as Slug]
  if (!p) notFound()
  return (
    <>
      <PageBand eyebrow="Policies" title={p.title} crumbs={[{ href: `/policies/${slug}`, label: p.title }]} />
      <section className="section-y bg-ivory">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <DemoNote>Content to be supplied</DemoNote>
            <p className="mt-6 text-sm leading-relaxed text-slate">
              This policy is being prepared and reviewed. Until it is published, please contact <a className="underline underline-offset-4" href={`mailto:${SITE.email}`}>{SITE.email}</a> with any question.
            </p>
          </aside>
          <ol className="lg:col-span-7 lg:col-start-5">
            {p.sections.map((s, i) => (
              <Reveal as="li" key={s} className="border-t border-obsidian/12 py-8">
                <h2 className="flex gap-6 font-display text-3xl font-light text-obsidian">
                  <span className="meta mt-3 text-gold-deep">{String(i + 1).padStart(2, '0')}</span>
                  {s}
                </h2>
                <p className="mt-4 pl-12 text-sm italic text-slate">Policy text to be supplied by Price-Select.</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}
