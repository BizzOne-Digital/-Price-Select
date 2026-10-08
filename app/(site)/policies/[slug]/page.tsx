import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Reveal } from '@/components/motion/primitives'
import { DemoNote, PageBand } from '@/components/site/ui'
import { SITE } from '@/lib/site'
import { TERMS, TERMS_INTRO, type PolicySection } from '@/lib/terms'

// Policy text must be supplied by the client (legal review). Policies without supplied
// text show structure only and never invent legal content.
const placeholder = (titles: string[]): PolicySection[] => titles.map((title) => ({ title }))

const POLICIES: Record<string, { title: string; intro?: string; sections: PolicySection[] }> = {
  privacy: { title: 'Privacy policy', sections: placeholder(['Information we collect', 'How information is used', 'Sharing with suppliers and service providers', 'Data security and retention', 'Your choices and rights', 'Contact']) },
  terms: { title: 'Terms & Conditions', intro: TERMS_INTRO, sections: TERMS },
  returns: { title: 'Returns & refunds', sections: placeholder(['Return windows by category', 'Damaged or defective items', 'Cancellations', 'Replacements', 'Refund timing', 'Return shipping responsibility']) },
}

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
            {p.intro ? (
              <p className="text-sm leading-relaxed text-slate">
                Questions about these terms? Contact <a className="underline underline-offset-4 break-all" href={`mailto:${SITE.email}`}>{SITE.email}</a>.
              </p>
            ) : (
              <>
                <DemoNote>Content to be supplied</DemoNote>
                <p className="mt-6 text-sm leading-relaxed text-slate">
                  This policy is being prepared and reviewed. Until it is published, please contact <a className="underline underline-offset-4" href={`mailto:${SITE.email}`}>{SITE.email}</a> with any question.
                </p>
              </>
            )}
          </aside>
          <div className="lg:col-span-7 lg:col-start-5">
            {p.intro && <p className="mb-12 text-lg leading-relaxed text-obsidian/80">{p.intro}</p>}
            <ol>
              {p.sections.map((s, i) => (
                <Reveal as="li" key={s.title} className="border-t border-obsidian/12 py-8">
                  <h2 className="flex gap-6 font-display text-3xl font-light text-obsidian">
                    <span className="meta mt-3 text-gold-deep">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </h2>
                  <div className="space-y-5 pl-12 pt-4 text-base leading-relaxed text-slate">
                    {s.text && <p>{s.text}</p>}
                    {s.items && (
                      <ul className="space-y-5">
                        {s.items.map(([label, text]) => (
                          <li key={label}>
                            <span className="font-medium text-obsidian">{label}:</span> {text}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!s.text && !s.items && <p className="text-sm italic">Policy text to be supplied by Price-Select.</p>}
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  )
}
