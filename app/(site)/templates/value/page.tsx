import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, PackageSearch, ShoppingBag, Tag } from 'lucide-react'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/primitives'
import { ButtonLink, Eyebrow, SectionHeading, TextLink } from '@/components/site/ui'
import { ProductCard } from '@/components/commerce/product-card'
import { DISCOUNT_NOTE, PlanCards } from '@/components/templates/blocks'
import { categories } from '@/lib/data/categories'
import { featuredProducts, productsIn } from '@/lib/data/products'

export const metadata: Metadata = { title: 'Template A · Value Market' }

const STEPS = [
  { icon: Tag, title: 'Choose a membership', text: 'Member at $10 per year for 10% off, or Member Plus at $25 per year for 25% off eligible purchases.' },
  { icon: ShoppingBag, title: 'Shop every department', text: 'Electronics, home and garden, construction supplies, mobility, solar energy, and more, in one place.' },
  { icon: PackageSearch, title: 'Ask us to find it', text: 'Member Plus: send any product you try to buy and we will find the same or similar at 25% less.' },
]

export default function ValueTemplate() {
  return (
    <>
      {/* Hero: offer on the left, departments on the right */}
      <section className="relative isolate overflow-hidden bg-midnight text-ivory">
        <div aria-hidden className="aurora opacity-50" />
        <div className="container-luxe relative grid gap-12 pb-16 pt-36 md:pt-44 lg:grid-cols-12 lg:items-center lg:pb-24">
          <div className="lg:col-span-6">
            <Reveal>
              <Eyebrow light>Members save up to 25%</Eyebrow>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="mt-8 font-display text-[clamp(3rem,6.5vw,6.5rem)] font-light leading-[0.92] tracking-[-0.03em]">
                What you need. <em className="text-champagne">Without</em> the markup.
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-8 max-w-lg text-lg leading-relaxed text-ivory/70">
                At Price-Select.com, we believe shoppers shouldn’t have to pay inflated prices to get the products they need.
              </p>
            </Reveal>
            <Reveal delay={0.3} className="mt-10 flex flex-wrap gap-4">
              <ButtonLink href="/shop">Shop now</ButtonLink>
              <ButtonLink href="#membership" variant="gold">See memberships</ButtonLink>
            </Reveal>
          </div>
          <Stagger className="grid grid-cols-2 gap-3 lg:col-span-6">
            {categories.slice(0, 4).map((c) => (
              <StaggerItem key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="group relative block aspect-[4/3] overflow-hidden">
                  <Image src={c.image} alt={c.imageAlt} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105" />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/85 via-obsidian/10 to-transparent" />
                  <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-2">
                    <span className="font-display text-xl font-light leading-none sm:text-2xl md:text-3xl">{c.short}</span>
                    <ArrowUpRight className="size-4 shrink-0 text-champagne" strokeWidth={1.5} aria-hidden />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Membership plans */}
      <section id="membership" className="section-y scroll-mt-24 bg-ivory">
        <div className="container-luxe grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading index="01" eyebrow="Membership" title={'Make your\nmembership\nwork for you.'} italic={['work']} />
            <p className="mt-8 text-sm leading-relaxed text-slate">{DISCOUNT_NOTE}</p>
          </div>
          <div className="lg:col-span-8">
            <PlanCards />
          </div>
        </div>
      </section>

      {/* Every department */}
      <section className="section-y bg-pearl">
        <div className="container-luxe">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading index="02" eyebrow="Departments" title={'Shop by\ndepartment.'} italic={['department.']} />
            <TextLink href="/categories">All departments</TextLink>
          </div>
          <Stagger className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <StaggerItem key={c.slug}>
                <Link href={`/categories/${c.slug}`} className="group block">
                  <div className="relative aspect-square overflow-hidden bg-stone">
                    <Image src={c.image} alt={c.imageAlt} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105" />
                  </div>
                  <p className="mt-4 font-display text-2xl font-light text-obsidian group-hover:text-gold-deep">{c.name}</p>
                  <p className="meta mt-1 text-slate">{productsIn(c.slug).length} products</p>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Featured products */}
      <section className="section-y bg-ivory">
        <div className="container-luxe">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading index="03" eyebrow="Featured" title={'Popular\nright now.'} italic={['now.']} />
            <TextLink href="/shop">Shop all products</TextLink>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
            {featuredProducts.slice(0, 8).map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section-y bg-obsidian text-ivory">
        <div className="container-luxe">
          <SectionHeading index="04" eyebrow="How it works" title={'A better way\nto shop.'} italic={['better']} light />
          <Stagger className="mt-16 grid gap-px bg-ivory/10 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <StaggerItem key={title} className="bg-obsidian p-8 md:p-10">
                <div className="flex items-center justify-between">
                  <Icon className="size-6 text-champagne" strokeWidth={1.3} aria-hidden />
                  <span className="meta text-ivory/35">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="mt-10 font-display text-3xl font-light">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ivory/60">{text}</p>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal className="mt-16 flex flex-wrap items-center justify-between gap-8 border-t border-ivory/10 pt-10">
            <p className="max-w-xl font-display text-3xl font-light">Our goal is simple: help you find what you need at a <em className="text-champagne">better price.</em></p>
            <ButtonLink href="/sign-in/members">Join Price-Select</ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  )
}
