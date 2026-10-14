import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PageBand } from '@/components/site/ui'
import { CustomerAuth } from '@/components/commerce/customer-auth'
import { currentActor } from '@/lib/server/page-auth'

const TYPES = {
  members: {
    title: 'Paid Members',
    heading: 'Member sign in.',
    intro: 'Members sign in with their customer account. Member or Member Plus savings apply automatically to eligible purchases.',
    footer: (
      <p className="text-sm text-obsidian/60">
        Not a member yet?{' '}
        <Link href="/pricing" className="link-line link-line--static text-teal">
          See membership options
        </Link>
      </p>
    ),
  },
  customers: {
    title: 'Customers',
    heading: 'Customer sign in.',
    intro: 'Sign in to view your orders, track shipments and manage returns.',
    footer: (
      <p className="text-sm text-obsidian/60">
        New to Price-Select?{' '}
        <Link href="/shop" className="link-line link-line--static text-teal">
          Start shopping
        </Link>
      </p>
    ),
  },
}

type Type = keyof typeof TYPES

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params
  const t = TYPES[type as Type]
  return t ? { title: `Sign in · ${t.title}`, alternates: { canonical: `/sign-in/${type}` }, robots: { index: false } } : {}
}

export default async function SignInPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const t = TYPES[type as Type]
  if (!t) notFound()
  if ((await currentActor())?.role === 'customer') redirect('/account')
  return (
    <>
      <PageBand eyebrow={`Sign In · ${t.title}`} title={t.heading} italic={['in.']} />
      <section className="bg-ivory pb-28 pt-14 text-obsidian md:pb-36">
        <div className="container-luxe">
          <div className="max-w-xl">
          <p className="text-sm leading-relaxed text-obsidian/60">{t.intro}</p>
          <Suspense>
            <CustomerAuth footer={t.footer} />
          </Suspense>
          </div>
        </div>
      </section>
    </>
  )
}
