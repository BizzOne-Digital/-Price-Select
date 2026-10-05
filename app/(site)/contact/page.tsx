import type { Metadata } from 'next'
import Image from 'next/image'
import { Reveal, SplitText, Stagger, StaggerItem } from '@/components/motion/primitives'
import { Eyebrow } from '@/components/site/ui'
import { EmailCta } from '@/components/site/email-cta'
import { IMAGES } from '@/lib/img'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact Price-Select by email at ${SITE.email}.`,
  alternates: { canonical: '/contact' },
}

const TOPICS = [
  ['An existing order', 'Order help', 'Include your order number so we can find it quickly.'],
  ['Becoming a supplier', 'Supplier enquiry', 'Tell us what you make or distribute, and where you ship from.'],
  ['Everything else', 'General enquiry', 'Questions, partnerships or feedback on the selection.'],
]

export default function ContactPage() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-obsidian text-ivory">
      <Image src={IMAGES.darkStructure} alt="" aria-hidden fill priority sizes="100vw" className="-z-20 object-cover opacity-45" />
      <div aria-hidden className="absolute inset-0 -z-10 scrim-l" />
      <div aria-hidden className="aurora -z-10 opacity-70" />

      <div className="container-luxe flex min-h-svh flex-col justify-end pb-16 pt-40 md:pb-24">
        <Reveal>
          <Eyebrow light>Contact · Email only</Eyebrow>
        </Reveal>
        <SplitText as="h1" immediate delay={0.2} text={"Let's select\nwhat's next."} italicWords={["what's", 'next.']} className="mt-10 text-display-1" />

        <Reveal delay={0.7} className="mt-16">
          <EmailCta email={SITE.email} />
        </Reveal>

        <Stagger className="mt-20 grid gap-px bg-ivory/10 md:grid-cols-3">
          {TOPICS.map(([t, subject, d]) => (
            <StaggerItem key={t} className="bg-obsidian/80 backdrop-blur-sm">
              <a href={`mailto:${SITE.email}?subject=${encodeURIComponent(subject)}`} className="group block p-7 md:p-9" data-cursor="Write">
                <p className="eyebrow text-champagne">{subject}</p>
                <p className="mt-6 font-display text-3xl font-light transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:translate-x-2">{t}</p>
                <p className="mt-3 text-sm leading-relaxed text-ivory/55">{d}</p>
              </a>
            </StaggerItem>
          ))}
        </Stagger>
        <p className="mt-10 meta text-ivory/40">We reply by email. Price-Select does not operate a phone line or a public office.</p>
      </div>
    </section>
  )
}
