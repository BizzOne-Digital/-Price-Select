import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Wordmark } from '@/components/site/header'
import { ButtonLink } from '@/components/site/ui'
import { NotFoundDigits } from '@/components/site/not-found-digits'
import { IMAGES } from '@/lib/img'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } }

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ivory text-obsidian">
      <Image src={IMAGES.storm} alt="" aria-hidden fill sizes="100vw" className="-z-20 object-cover opacity-30" />
      <div aria-hidden className="aurora -z-10 opacity-70" />
      <div aria-hidden className="grain-wrap">
        <div className="grain" />
      </div>
      <header className="container-luxe flex items-center justify-between py-8">
        <Link href="/" className="shrink-0" aria-label="Price-Select home">
          <Wordmark className="h-10 md:h-12" />
        </Link>
        <span className="eyebrow text-obsidian/40">Error 404</span>
      </header>
      <div className="container-luxe flex flex-1 flex-col justify-center py-16">
        <NotFoundDigits />
        <h1 className="mt-10 max-w-[14ch] text-display-2">
          The selection <em className="text-teal">has moved.</em>
        </h1>
        <p className="mt-8 max-w-md text-base leading-relaxed text-obsidian/65">
          The page you were looking for could not be found. It may have been renamed, retired from the selection, or the address may be mistyped.
        </p>
        <div className="mt-12 flex flex-wrap gap-4">
          <ButtonLink href="/">Return home</ButtonLink>
          <ButtonLink href="/shop" variant="outline-light">Explore products</ButtonLink>
        </div>
      </div>
    </main>
  )
}
