import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SITE } from '@/lib/site'
import { ImageReveal, LineReveal, Reveal, SplitText } from '@/components/motion/primitives'

/* ───────── Buttons: rectangular, hairline, with a wipe fill and a travelling arrow ───────── */
type Variant = 'light' | 'dark' | 'outline-light' | 'outline-dark' | 'gold'
const VARIANTS: Record<Variant, { base: string; fill: string; hover: string }> = {
  // Primary buttons are deep teal on both dark and light surfaces.
  light: { base: 'bg-teal text-white border-teal', fill: 'bg-ivory', hover: 'group-hover:text-obsidian' },
  dark: { base: 'bg-teal text-white border-teal', fill: 'bg-obsidian', hover: 'group-hover:text-white' },
  'outline-light': { base: 'border-ivory/40 text-ivory', fill: 'bg-ivory', hover: 'group-hover:text-obsidian' },
  'outline-dark': { base: 'border-obsidian/30 text-obsidian', fill: 'bg-obsidian', hover: 'group-hover:text-ivory' },
  gold: { base: 'border-champagne/70 text-ivory', fill: 'bg-champagne', hover: 'group-hover:text-obsidian' },
}

export function btnClass(variant: Variant = 'light', className?: string) {
  return cn(
    'group relative inline-flex min-h-12 items-center justify-between gap-6 overflow-hidden border px-6 py-3.5 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] transition-colors duration-500 disabled:opacity-40',
    VARIANTS[variant].base,
    className,
  )
}

export function BtnInner({ children, variant = 'light', icon = true }: { children: ReactNode; variant?: Variant; icon?: boolean }) {
  const v = VARIANTS[variant]
  return (
    <>
      <span aria-hidden className={cn('absolute inset-0 translate-y-[101%] transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:translate-y-0 group-focus-visible:translate-y-0', v.fill)} />
      <span className={cn('relative z-10 transition-colors duration-500', v.hover)}>{children}</span>
      {icon && (
        <span className={cn('relative z-10 h-3.5 w-4 overflow-hidden transition-colors duration-500', v.hover)} aria-hidden>
          <ArrowRight className="absolute size-3.5 transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:translate-x-[160%]" strokeWidth={1.5} />
          <ArrowRight className="absolute size-3.5 -translate-x-[160%] transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:translate-x-0" strokeWidth={1.5} />
        </span>
      )}
    </>
  )
}

export function ButtonLink({ href, children, variant = 'light', className, icon = true, ...rest }: { href: string; children: ReactNode; variant?: Variant; className?: string; icon?: boolean } & Omit<ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={btnClass(variant, className)} {...rest}>
      <BtnInner variant={variant} icon={icon}>
        {children}
      </BtnInner>
    </Link>
  )
}

export function Button({ children, variant = 'dark', className, icon = true, ...rest }: { children: ReactNode; variant?: Variant; className?: string; icon?: boolean } & ComponentProps<'button'>) {
  return (
    <button className={btnClass(variant, className)} {...rest}>
      <BtnInner variant={variant} icon={icon}>
        {children}
      </BtnInner>
    </button>
  )
}

export function TextLink({ href, children, className, light }: { href: string; children: ReactNode; className?: string; light?: boolean }) {
  return (
    <Link href={href} className={cn('link-line link-line--static eyebrow', light ? 'text-ivory' : 'text-teal', className)}>
      {children}
      <ArrowRight className="size-3.5" strokeWidth={1.5} />
    </Link>
  )
}

/* ───────── Eyebrow with index: "03 — The current selection" ───────── */
export function Eyebrow({ index, children, light, className }: { index?: string; children: ReactNode; light?: boolean; className?: string }) {
  return (
    <p className={cn('eyebrow flex items-center gap-4', light ? 'text-ivory/60' : 'text-slate', className)}>
      {index && <span className={light ? 'text-champagne' : 'text-gold-deep'}>{index}</span>}
      <span className="sel-mark" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

export function SectionHeading({
  index,
  eyebrow,
  title,
  italic = [],
  aside,
  light,
  className,
  as = 'h2',
}: {
  index?: string
  eyebrow: string
  title: string
  italic?: string[]
  aside?: ReactNode
  light?: boolean
  className?: string
  as?: 'h1' | 'h2'
}) {
  return (
    <header className={cn('grid gap-10 md:grid-cols-12 md:items-end', className)}>
      <div className="md:col-span-8">
        <Reveal>
          <Eyebrow index={index} light={light}>
            {eyebrow}
          </Eyebrow>
        </Reveal>
        <SplitText as={as} text={title} italicWords={italic} className={cn('mt-8 text-display-2', light ? 'text-ivory' : 'text-obsidian')} />
      </div>
      {aside && (
        <Reveal delay={0.2} className={cn('md:col-span-4 md:justify-self-end', light ? 'text-ivory/70' : 'text-slate')}>
          {aside}
        </Reveal>
      )}
    </header>
  )
}

/* ───────── Page hero: full-bleed image, scrim, split headline ───────── */
export function PageHero({
  eyebrow,
  title,
  italic = [],
  intro,
  image,
  imageAlt,
  crumbs,
  size = 'lg',
  children,
}: {
  eyebrow: string
  title: string
  italic?: string[]
  intro?: ReactNode
  image: string
  imageAlt: string
  crumbs?: { href: string; label: string }[]
  size?: 'md' | 'lg' | 'full'
  children?: ReactNode
}) {
  const h = { md: 'min-h-[68svh]', lg: 'min-h-[86svh]', full: 'min-h-svh' }[size]
  return (
    <section className={cn('relative isolate flex items-end overflow-hidden bg-midnight text-ivory', h)}>
      <ImageReveal src={image} alt={imageAlt} priority direction="down" parallax={8} cursor={false} className="!absolute inset-0 -z-10" imgClassName="opacity-80" />
      <div aria-hidden className="absolute inset-0 -z-10 scrim-b" />
      <div aria-hidden className="absolute inset-0 -z-10 scrim-l opacity-70" />
      <div className="container-luxe relative w-full pb-14 pt-40 md:pb-20">
        {crumbs && <Breadcrumbs items={crumbs} light className="mb-10" />}
        <Reveal>
          <Eyebrow light>{eyebrow}</Eyebrow>
        </Reveal>
        <SplitText as="h1" immediate delay={0.25} text={title} italicWords={italic} className="mt-8 max-w-[14ch] text-display-1" />
        {intro && (
          <Reveal delay={0.7} className="mt-10 max-w-xl text-base leading-relaxed text-ivory/75 md:text-lg">
            {intro}
          </Reveal>
        )}
        {children}
      </div>
      <LineReveal gold className="absolute inset-x-0 bottom-0" delay={0.5} />
    </section>
  )
}

/* ───────── Compact dark band for functional pages (shop, cart, account) ───────── */
export function PageBand({ eyebrow, title, italic = [], crumbs, children }: { eyebrow: string; title: string; italic?: string[]; crumbs?: { href: string; label: string }[]; children?: ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-midnight text-ivory">
      <div aria-hidden className="aurora opacity-70" />
      <div className="container-luxe relative pb-12 pt-36 md:pb-16 md:pt-44">
        {crumbs && <Breadcrumbs items={crumbs} light className="mb-8" />}
        <Eyebrow light>{eyebrow}</Eyebrow>
        <SplitText as="h1" immediate delay={0.15} text={title} italicWords={italic} className="mt-6 text-display-2" />
        {children}
      </div>
      <LineReveal gold className="absolute inset-x-0 bottom-0" />
    </section>
  )
}

/* ───────── Breadcrumbs + BreadcrumbList structured data ───────── */
export function Breadcrumbs({ items, light, className }: { items: { href: string; label: string }[]; light?: boolean; className?: string }) {
  const all = [{ href: '/', label: 'Home' }, ...items]
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: all.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.label, item: `${SITE.url}${c.href}` })),
        }}
      />
      <ol className={cn('meta flex flex-wrap items-center gap-2', light ? 'text-ivory/50' : 'text-slate')}>
        {all.map((c, i) => (
          <li key={c.href} className="flex items-center gap-2">
            {i < all.length - 1 ? (
              <Link href={c.href} className={cn('transition-colors', light ? 'hover:text-champagne' : 'hover:text-obsidian')}>
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className={light ? 'text-ivory/85' : 'text-obsidian'}>
                {c.label}
              </span>
            )}
            {i < all.length - 1 && <ChevronRight className="size-3 opacity-50" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

/** Honest labelling for sample content. */
export function DemoNote({ children, light, className }: { children: ReactNode; light?: boolean; className?: string }) {
  return (
    <p className={cn('meta flex items-center gap-3', light ? 'text-ivory/45' : 'text-slate/80', className)}>
      <span className={cn('size-1.5 rounded-full', light ? 'bg-champagne/70' : 'bg-gold')} aria-hidden />
      {children}
    </p>
  )
}
