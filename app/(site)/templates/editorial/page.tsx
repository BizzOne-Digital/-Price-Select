import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ImageReveal, LineReveal, Reveal, SplitText } from '@/components/motion/primitives'
import { ButtonLink, Eyebrow, TextLink } from '@/components/site/ui'
import { ProductCard } from '@/components/commerce/product-card'
import { DISCOUNT_NOTE } from '@/components/templates/blocks'
import { categories } from '@/lib/data/categories'
import { featuredProducts, seasonalProducts } from '@/lib/data/products'
import { IMAGES } from '@/lib/img'
import { MEMBERSHIPS } from '@/lib/site'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Template B · Editorial' }

export default function EditorialTemplate() {
  const features = categories.slice(0, 3)
  const rail = [...seasonalProducts, ...featuredProducts.filter((p) => !seasonalProducts.includes(p))].slice(0, 8)

  return (
    <>
      {/* Full-bleed cover with a department index */}
      <section className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-midnight text-ivory">
        <Image src={IMAGES.heroWarehouse} alt="Rows of shelving in a large, orderly warehouse" fill priority sizes="100vw" className="-z-20 object-cover opacity-60" />
        <div aria-hidden className="absolute inset-0 -z-10 scrim-b" />
        <div aria-hidden className="absolute inset-0 -z-10 scrim-l opacity-70" />
        <div className="container-luxe grid gap-12 pb-24 pt-40 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Reveal>
              <Eyebrow light>Issue 01 · The better-price edit</Eyebrow>
            </Reveal>
            <SplitText as="h1" immediate delay={0.2} text={'Fairer prices.\nMore choice.'} italicWords={['Fairer']} className="mt-8 text-display-1" />
            <Reveal delay={0.6} className="mt-10 flex flex-wrap gap-4">
              <ButtonLink href="/shop">Shop the edit</ButtonLink>
              <ButtonLink href="/about" variant="outline-light">Our story</ButtonLink>
            </Reveal>
          </div>
          <Reveal delay={0.5} as="div" className="lg:col-span-3 lg:col-start-10">
            <p className="meta text-ivory/50">In this issue</p>
            <ol className="mt-4 border-t border-ivory/15">
              {categories.slice(0, 6).map((c, i) => (
                <li key={c.slug} className="border-b border-ivory/15">
                  <Link href={`/categories/${c.slug}`} className="flex items-baseline justify-between py-3 text-sm text-ivory/80 hover:text-champagne">
                    {c.short}
                    <span className="meta text-ivory/35">{String(i + 1).padStart(2, '0')}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Vision statement */}
      <section className="section-y bg-ivory">
        <div className="container-luxe text-center">
          <Reveal>
            <Eyebrow className="justify-center">Our vision</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <blockquote className="mx-auto mt-12 max-w-5xl font-display text-[clamp(2rem,4.4vw,4.5rem)] font-light leading-[1.05] tracking-[-0.02em] text-obsidian">
              “Our aim is simple: offer more choice, <em className="text-gold-deep">better value,</em> and a shopping experience that puts customers first.”
            </blockquote>
          </Reveal>
          <LineReveal gold origin="center" className="mx-auto mt-14 max-w-xs" />
        </div>
      </section>

      {/* Department features, alternating */}
      <section className="bg-ivory pb-28 md:pb-40">
        <div className="container-luxe space-y-24 md:space-y-36">
          {features.map((c, i) => (
            <article key={c.slug} className="grid items-center gap-10 lg:grid-cols-12">
              <ImageReveal
                src={c.image}
                alt={c.imageAlt}
                direction={i % 2 ? 'right' : 'left'}
                sizes="(min-width:1024px) 58vw, 100vw"
                className={cn('aspect-[4/3] lg:col-span-7', i % 2 && 'lg:order-2 lg:col-start-6')}
              />
              <div className={cn('lg:col-span-4', i % 2 ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-9')}>
                <p className="meta text-gold-deep">Feature {String(i + 1).padStart(2, '0')}</p>
                <h2 className="mt-5 font-display text-5xl font-light leading-none text-obsidian md:text-6xl">{c.name}</h2>
                <p className="mt-6 text-base leading-relaxed text-slate">{c.description}</p>
                <TextLink href={`/categories/${c.slug}`} className="mt-8">
                  Explore {c.short}
                </TextLink>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Product rail */}
      <section className="section-y overflow-hidden bg-midnight text-ivory">
        <div className="container-luxe flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow light>Selected this season</Eyebrow>
            <h2 className="mt-6 font-display text-display-3 font-light">The shortlist.</h2>
          </div>
          <TextLink href="/shop" light>
            Shop all
          </TextLink>
        </div>
        <div className="container-luxe mt-14">
          <ul className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 [scrollbar-width:thin]">
            {rail.map((p, i) => (
              <li key={p.slug} className="w-[72vw] shrink-0 snap-start sm:w-[42vw] lg:w-[24vw]">
                <ProductCard product={p} index={i} dark sizes="(min-width:1024px) 24vw, 72vw" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Membership as an editorial comparison */}
      <section className="section-y bg-pearl">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow index="02">Membership</Eyebrow>
            <SplitText text={'Join and\nsave more.'} italicWords={['save']} className="mt-10 text-display-2 text-obsidian" />
            <p className="mt-8 max-w-sm text-sm leading-relaxed text-slate">{DISCOUNT_NOTE}</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            {MEMBERSHIPS.map(([name, price, perk]) => (
              <Reveal key={name} className="grid gap-4 border-t border-obsidian/15 py-10 sm:grid-cols-[10rem_1fr]">
                <div>
                  <p className="font-display text-3xl font-light text-obsidian">{name}</p>
                  <p className="meta mt-2 text-gold-deep">{price}</p>
                </div>
                <p className="text-base leading-relaxed text-obsidian/75">{perk}</p>
              </Reveal>
            ))}
            <div className="border-t border-obsidian/15 pt-10">
              <ButtonLink href="/sign-in/members" variant="dark">Become a member</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Sourcing story */}
      <section className="relative isolate overflow-hidden bg-obsidian py-32 text-ivory md:py-44">
        <Image src={IMAGES.logistics} alt="An aerial view of a container port arranged in precise rows" fill sizes="100vw" className="-z-20 object-cover opacity-35" />
        <div aria-hidden className="absolute inset-0 -z-10 scrim-l" />
        <div className="container-luxe">
          <Reveal className="max-w-2xl">
            <Eyebrow light>Global sourcing</Eyebrow>
            <p className="mt-8 font-display text-[clamp(1.8rem,3.4vw,3.2rem)] font-light leading-[1.1]">
              We source products from factories, warehouses, and suppliers around the world, looking for ways to reduce costs and pass the savings on to our customers.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  )
}
