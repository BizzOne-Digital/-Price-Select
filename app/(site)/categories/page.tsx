import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { categories } from '@/lib/data/categories'
import { productsIn } from '@/lib/data/products'
import { pad } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ImageReveal, Reveal } from '@/components/motion/primitives'
import { DemoNote, PageBand } from '@/components/site/ui'

export const metadata: Metadata = {
  title: 'Departments',
  description: 'Eight departments, one considered marketplace: electronics, construction, utility vehicles, e-bikes, solar energy, baby & kids, home & garden and general merchandise.',
  alternates: { canonical: '/categories' },
}

// Art-directed rhythm: each tile has its own span, offset and crop.
const LAYOUT = [
  { tile: 'lg:col-span-7', img: 'aspect-[16/11]' },
  { tile: 'lg:col-span-4 lg:col-start-9 lg:mt-40', img: 'aspect-[4/5]' },
  { tile: 'lg:col-span-5 lg:mt-8', img: 'aspect-[4/5]' },
  { tile: 'lg:col-span-6 lg:col-start-7 lg:mt-48', img: 'aspect-[16/11]' },
  { tile: 'lg:col-span-8 lg:col-start-3', img: 'aspect-[16/9] lg:aspect-[21/10]' },
  { tile: 'lg:col-span-4', img: 'aspect-[4/5]' },
  { tile: 'lg:col-span-7 lg:col-start-6 lg:mt-36', img: 'aspect-[16/11]' },
  { tile: 'lg:col-span-10 lg:col-start-2', img: 'aspect-[16/9] lg:aspect-[21/9]' },
]

export default function CategoriesPage() {
  return (
    <>
      <PageBand eyebrow="Departments" title={'Eight departments.\nOne selection.'} italic={['selection.']} crumbs={[{ href: '/categories', label: 'Categories' }]}>
        <Reveal delay={0.4} className="mt-8 max-w-xl text-base leading-relaxed text-obsidian/70">
          From the workshop to the nursery, each department is supplied by approved partners and reviewed to the standard its products require.
        </Reveal>
      </PageBand>

      <section className="section-y bg-ivory">
        <div className="container-luxe">
          <ul className="grid gap-x-8 gap-y-20 md:grid-cols-2 lg:grid-cols-12 lg:gap-y-28">
            {categories.map((c, i) => {
              const l = LAYOUT[i % LAYOUT.length]
              const count = productsIn(c.slug).length
              return (
                <li key={c.slug} className={cn(l.tile, i === 4 || i === 7 ? 'md:col-span-2' : '')}>
                  <Link href={`/categories/${c.slug}`} className="group block" data-cursor="Enter">
                    <ImageReveal
                      src={c.image}
                      alt={c.imageAlt}
                      direction={i % 2 ? 'up' : 'left'}
                      parallax={6}
                      sizes={i === 4 || i === 7 ? '(min-width: 1024px) 80vw, 100vw' : '(min-width: 1024px) 55vw, (min-width: 768px) 50vw, 100vw'}
                      className={cn('sel-frame', l.img)}
                      imgClassName="saturate-[0.85] transition-transform duration-[1.8s] ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
                    >
                      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ivory/55 via-transparent to-transparent opacity-60 transition-opacity duration-700 group-hover:opacity-100" />
                      <span className="absolute left-5 top-5 meta text-obsidian/85 md:left-7 md:top-7">{pad(i + 1)}</span>
                      {c.reviewLevel === 'enhanced' && (
                        <span className="absolute right-5 top-5 flex items-center gap-2 bg-ivory/95 px-2.5 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-teal md:right-7 md:top-7">
                          <ShieldCheck className="size-3" strokeWidth={1.4} aria-hidden />
                          Enhanced review
                        </span>
                      )}
                    </ImageReveal>
                    <Reveal className="relative mt-6 pt-5">
                      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-obsidian/12" />
                      <span aria-hidden className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-x-100" />
                      <div className="flex items-start justify-between gap-6">
                        <h2 className="text-display-4 text-obsidian transition-colors duration-500 group-hover:text-gold-deep">{c.name}</h2>
                        <ArrowUpRight className="mt-1 size-5 shrink-0 text-obsidian/40 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold-deep" strokeWidth={1.2} aria-hidden />
                      </div>
                      <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate">{c.description}</p>
                      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
                        <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label={`${c.name} includes`}>
                          {c.includes.map((x) => (
                            <li key={x} className="meta text-obsidian/45">
                              {x}
                            </li>
                          ))}
                        </ul>
                        <p className="meta shrink-0 text-gold-deep tabular-nums">
                          {pad(count)} {count === 1 ? 'product' : 'products'}
                        </p>
                      </div>
                    </Reveal>
                  </Link>
                </li>
              )
            })}
          </ul>
          <DemoNote className="mt-24">Product counts reflect the demonstration catalog</DemoNote>
        </div>
      </section>
    </>
  )
}
