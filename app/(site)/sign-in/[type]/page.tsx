import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageBand } from '@/components/site/ui'
import { LoginForm } from '@/components/supplier/auth'

const TYPES = {
  members: {
    title: 'Paid Members',
    heading: 'Member sign in.',
    intro: 'Sign in to use your Member or Member Plus savings on eligible purchases.',
    footer: (
      <p className="text-sm text-obsidian/60">
        Not a member yet?{' '}
        <Link href="/about" className="link-line link-line--static text-teal">
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

export function generateStaticParams() {
  return Object.keys(TYPES).map((type) => ({ type }))
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params
  const t = TYPES[type as Type]
  return t ? { title: `Sign in · ${t.title}`, alternates: { canonical: `/sign-in/${type}` }, robots: { index: false } } : {}
}

export default async function SignInPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  const t = TYPES[type as Type]
  if (!t) notFound()
  return (
    <>
      <PageBand eyebrow={`Sign In · ${t.title}`} title={t.heading} italic={['in.']} />
      <section className="bg-ivory pb-28 pt-14 text-obsidian md:pb-36">
        <div className="container-luxe">
          <div className="max-w-xl">
          <p className="text-sm leading-relaxed text-obsidian/60">{t.intro}</p>
          <LoginForm to="/account" emailLabel="Email" cta="Sign in" footer={t.footer} />
          <p className="mt-10 flex items-center gap-3 meta text-[0.62rem] text-obsidian/40">
            <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
            Demo sign-in — authentication provider not yet connected
          </p>
          </div>
        </div>
      </section>
    </>
  )
}
