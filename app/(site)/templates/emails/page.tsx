import type { Metadata } from 'next'
import { PageBand } from '@/components/site/ui'
import { EmailPreview } from '@/components/templates/email-preview'
import { buildEmails } from '@/lib/emails'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Email templates' }

export default function EmailTemplatesPage() {
  return (
    <>
      <PageBand eyebrow="Templates · Customer emails" title={'Email\ntemplates.'} italic={['templates.']}>
        <p className="mt-8 max-w-xl text-sm leading-relaxed text-ivory/60">
          The emails customers receive from Price-Select, shown with sample order data. Each one is built to display correctly in Gmail, Outlook and Apple Mail. Use Copy HTML to load a template into your email platform.
        </p>
      </PageBand>
      <section className="bg-ivory pb-40 pt-14 md:pt-20">
        <div className="container-luxe">
          <EmailPreview emails={buildEmails()} siteUrl={SITE.url} />
        </div>
      </section>
    </>
  )
}
