import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageBand } from '@/components/site/ui'
import { ResetPasswordForm } from '@/components/commerce/customer-auth'

export const metadata: Metadata = {
  title: 'Reset password',
  alternates: { canonical: '/sign-in/reset' },
  robots: { index: false },
}

export default function ResetPage() {
  return (
    <>
      <PageBand eyebrow="Sign In · Password" title="Choose a new password." italic={['password.']} />
      <section className="bg-ivory pb-28 pt-14 text-obsidian md:pb-36">
        <div className="container-luxe">
          <div className="max-w-xl">
            <p className="text-sm leading-relaxed text-obsidian/60">Reset links expire after a short time. If yours has expired, request a new one from the sign-in page.</p>
            <Suspense>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  )
}
