import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Reveal } from '@/components/motion/primitives'
import { PageBand } from '@/components/site/ui'
import { DOC_TEMPLATES, TEMPLATES } from '@/components/templates/list'

export const metadata: Metadata = { title: 'Templates' }

export default function TemplatesIndex() {
  return (
    <>
      <PageBand eyebrow="For review" title={'Site\ntemplates.'} italic={['templates.']}>
        <p className="mt-8 max-w-xl text-sm leading-relaxed text-ivory/60">
          Four homepage directions built with the same products, departments and membership offer, plus customer emails and documents. Open each one, then tell us which direction to take forward. Elements can be mixed between templates.
        </p>
      </PageBand>
      <section className="bg-ivory pb-40 pt-14 md:pt-20">
        <div className="container-luxe grid gap-px bg-obsidian/12 md:grid-cols-2">
          {TEMPLATES.map((t, i) => (
            <Reveal key={t.href} delay={i * 0.06} className="bg-ivory">
              <Link href={t.href} className="group flex h-full flex-col justify-between gap-12 p-8 md:p-12">
                <div>
                  <p className="meta text-gold-deep">{t.key === 'Current' ? 'In place today' : `Template ${t.key}`}</p>
                  <h2 className="mt-5 font-display text-5xl font-light text-obsidian transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:translate-x-2">{t.name}</h2>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-slate">{t.summary}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-obsidian">
                  View template <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" strokeWidth={1.3} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="container-luxe mt-24">
          <p className="eyebrow text-gold-deep">Emails &amp; documents</p>
          <div className="mt-8 grid gap-px bg-obsidian/12 md:grid-cols-3">
            {DOC_TEMPLATES.map((t, i) => (
              <Reveal key={t.href} delay={i * 0.06} className="bg-ivory">
                <Link href={t.href} className="group flex h-full flex-col justify-between gap-10 p-8">
                  <div>
                    <h2 className="font-display text-4xl font-light text-obsidian transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:translate-x-2">{t.name}</h2>
                    <p className="mt-4 text-sm leading-relaxed text-slate">{t.summary}</p>
                  </div>
                  <span className="inline-flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-obsidian">
                    View <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" strokeWidth={1.3} />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
