import type { Metadata } from 'next'
import Image from 'next/image'
import { Reveal, SplitText } from '@/components/motion/primitives'
import { Eyebrow } from '@/components/site/ui'
import { EmailCta } from '@/components/site/email-cta'
import { IMAGES } from '@/lib/img'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact Price-Select customer service by email at ${SITE.email}.`,
  alternates: { canonical: '/contact' },
}

export default function ContactPage() {
  return (
    <section className="relative isolate min-h-svh overflow-hidden bg-obsidian text-ivory">
      <Image src={IMAGES.darkStructure} alt="" aria-hidden fill priority sizes="100vw" className="-z-20 object-cover opacity-45" />
      <div aria-hidden className="absolute inset-0 -z-10 scrim-l" />
      <div aria-hidden className="aurora -z-10 opacity-70" />

      <div className="container-luxe flex min-h-svh flex-col justify-end pb-16 pt-40 md:pb-24">
        <Reveal>
          <Eyebrow light>Contact · Customer service</Eyebrow>
        </Reveal>
        <SplitText as="h1" immediate delay={0.2} text={"Let's select\nwhat's next."} italicWords={["what's", 'next.']} className="mt-10 text-display-1" />

        <Reveal delay={0.7} className="mt-16">
          <EmailCta email={SITE.email} />
        </Reveal>
      </div>
    </section>
  )
}
