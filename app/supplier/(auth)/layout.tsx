import Link from 'next/link'
import { Wordmark } from '@/components/site/header'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { ImageReveal, LineReveal, Reveal } from '@/components/motion/primitives'
import { IMAGES } from '@/lib/img'
import { SITE } from '@/lib/site'

export default function SupplierAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-ivory text-obsidian lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative isolate flex min-h-[360px] flex-col justify-between overflow-hidden bg-ivory px-5 py-6 md:px-12 md:py-10 lg:sticky lg:top-0 lg:h-svh">
        <ImageReveal src={IMAGES.parcels} alt="Parcels stacked and ready for dispatch in a warehouse" priority direction="down" sizes="(min-width: 1024px) 42vw, 100vw" className="!absolute inset-0 -z-10" imgClassName="opacity-60" />
        <div aria-hidden className="absolute inset-0 -z-10 scrim-b" />
        <div aria-hidden className="absolute inset-0 -z-10 scrim-l opacity-60" />

        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="shrink-0" aria-label="Price-Select storefront">
            <Wordmark className="h-10 md:h-12" />
          </Link>
          <Link href="/" className="link-line meta text-[0.65rem] text-obsidian/70 hover:text-teal">
            <ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden /> Storefront
          </Link>
        </div>

        <div className="pt-24 lg:pt-0">
          <Reveal>
            <p className="eyebrow flex items-center gap-4 text-obsidian/60">
              <span className="sel-mark" aria-hidden /> Partner network
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-7 max-w-[13ch] font-display text-[clamp(2.6rem,5vw,5.25rem)] font-light leading-[0.92] tracking-[-0.035em]">
              Supply, held to a <em className="text-teal">higher</em> standard.
            </p>
          </Reveal>
          <LineReveal gold className="mt-10 max-w-md" delay={0.4} />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-obsidian/55">
            Approved partners list, fulfil and track their selection on {SITE.name}. A business of {SITE.parent}.
          </p>
        </div>
      </aside>

      <div className="relative flex min-h-svh flex-col overflow-hidden lg:min-h-0">
        <div aria-hidden className="aurora opacity-25" />
        <div className="relative flex flex-1 flex-col px-5 py-12 md:px-12 lg:px-20 lg:py-16">{children}</div>
        <p className="relative flex items-center gap-3 border-t border-obsidian/10 px-5 py-5 meta text-[0.62rem] text-obsidian/40 md:px-12 lg:px-20">
          <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
          Demo sign-in — authentication provider not yet connected
        </p>
      </div>
    </div>
  )
}
