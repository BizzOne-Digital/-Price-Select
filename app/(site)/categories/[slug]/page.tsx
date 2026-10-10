import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { categories, getCategory } from '@/lib/data/categories'
import { productsIn } from '@/lib/data/products'
import { pad } from '@/lib/format'
import { ProductCard } from '@/components/commerce/product-card'
import { LineReveal, Reveal, Stagger, StaggerItem } from '@/components/motion/primitives'
import { ButtonLink, DemoNote, Eyebrow, PageHero } from '@/components/site/ui'

export const generateStaticParams = () => categories.map((c) => ({ slug: c.slug }))

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = getCategory((await params).slug)
  if (!c) return {}
  return {
    title: c.name,
    description: `${c.description} Supplied by approved Price-Select partners.`,
    alternates: { canonical: `/categories/${c.slug}` },
    openGraph: { title: `${c.name} · Price-Select`, description: c.description, images: [{ url: c.image }] },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = getCategory((await params).slug)
  if (!c) notFound()
  const items = productsIn(c.slug)
  const index = categories.indexOf(c)
  const siblings = categories.filter((x) => x.slug !== c.slug)

  return (
    <>
      <PageHero
        eyebrow={`Department ${pad(index + 1)} / ${pad(categories.length)}`}
        title={c.name}
        image={c.image}
        imageAlt={c.imageAlt}
        size="md"
        crumbs={[
          { href: '/categories', label: 'Categories' },
          { href: `/categories/${c.slug}`, label: c.name },
        ]}
        intro={c.description}
      >
        <Reveal delay={0.85} className="mt-10">
          <ul className="flex flex-wrap gap-x-6 gap-y-2" aria-label={`${c.name} includes`}>
            {c.includes.map((x) => (
              <li key={x} className="meta flex items-center gap-2 text-obsidian/60">
                <span className="size-1 bg-champagne" aria-hidden />
                {x}
              </li>
            ))}
          </ul>
        </Reveal>
      </PageHero>

      {c.reviewLevel === 'enhanced' && (
        <section aria-labelledby="review-title" className="border-b border-obsidian/10 bg-pearl">
          <div className="container-luxe grid gap-6 py-10 md:grid-cols-12 md:items-center md:py-12">
            <div className="flex items-center gap-4 md:col-span-4">
              <span className="grid size-11 shrink-0 place-items-center border border-gold/50 text-gold-deep">
                <ShieldCheck className="size-5" strokeWidth={1.2} aria-hidden />
              </span>
              <h2 id="review-title" className="eyebrow text-obsidian">
                Enhanced review department
              </h2>
            </div>
            <div className="md:col-span-8">
              <p className="text-base leading-relaxed text-obsidian/85">{c.reviewNote}</p>
              <p className="mt-2 text-xs leading-relaxed text-slate">
                Price-Select supports documentation and review workflows. This is not legal advice; requirements are confirmed for each market where products are sold.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="section-y bg-ivory" aria-labelledby="dept-products">
        <div className="container-luxe">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Reveal>
                <Eyebrow index={pad(items.length)}>{items.length === 1 ? 'Product' : 'Products'} in this department</Eyebrow>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 id="dept-products" className="mt-6 text-display-3 text-obsidian">
                  The {c.short.toLowerCase()} <em className="text-gold-deep">selection.</em>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.2}>
              <ButtonLink href={`/shop?category=${c.slug}`} variant="outline-dark">
                Refine in the shop
              </ButtonLink>
            </Reveal>
          </div>

          {items.length ? (
            <ul className="mt-16 grid grid-cols-2 gap-x-4 gap-y-14 md:gap-x-6 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-20 xl:grid-cols-4">
              {items.map((p, i) => (
                <li key={p.slug}>
                  <ProductCard product={p} index={i} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-16 border-y border-obsidian/10 py-20 text-center">
              <p className="font-display text-4xl font-light text-obsidian">Being selected.</p>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-slate">Products for this department are in supplier review and will appear once they are approved for publication.</p>
            </div>
          )}
          <DemoNote className="mt-16">Demonstration products and sample pricing</DemoNote>
        </div>
      </section>

      <section className="bg-ivory pb-24 pt-20 text-obsidian md:pb-32 md:pt-28" aria-labelledby="siblings-title">
        <div className="container-luxe">
          <Eyebrow light>Continue exploring</Eyebrow>
          <h2 id="siblings-title" className="mt-6 text-display-3">
            Other <em className="text-teal">departments.</em>
          </h2>
          <LineReveal className="mt-14 text-obsidian" />
          <Stagger as="ul" className="grid sm:grid-cols-2 lg:grid-cols-4">
            {siblings.map((s) => (
              <StaggerItem as="li" key={s.slug} className="border-b border-obsidian/10 sm:odd:border-r lg:border-r lg:[&:nth-child(4n)]:border-r-0">
                <Link href={`/categories/${s.slug}`} className="group flex items-center gap-5 p-5 md:p-6">
                  <span className="relative block size-16 shrink-0 overflow-hidden bg-ivory">
                    <Image src={s.image} alt="" fill sizes="64px" className="object-cover opacity-80 transition-transform duration-1000 group-hover:scale-110" />
                  </span>
                  <span className="min-w-0">
                    <span className="meta block text-obsidian/40">{pad(categories.indexOf(s) + 1)}</span>
                    <span className="mt-1 block font-display text-xl font-light leading-tight transition-colors group-hover:text-teal">{s.name}</span>
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  )
}
