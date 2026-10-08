import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Reveal, ScrollMarquee, Stagger, StaggerItem } from '@/components/motion/primitives'
import { ButtonLink, Eyebrow, TextLink } from '@/components/site/ui'
import { ProductCard } from '@/components/commerce/product-card'
import { PlanCards, SavingsEstimator } from '@/components/templates/blocks'
import { categories } from '@/lib/data/categories'
import { featuredProducts, productsIn } from '@/lib/data/products'

export const metadata: Metadata = { title: 'Template C · Bold Savings' }

export default function BoldTemplate() {
  return (
    <div className="bg-obsidian text-ivory">
      {/* Typographic hero */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="aurora opacity-40" />
        <div className="container-luxe relative pb-16 pt-40 md:pb-24 md:pt-48">
          <Reveal>
            <Eyebrow light>Member pricing · up to 25% off</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-8 text-[clamp(3.2rem,10vw,10.5rem)] font-extrabold uppercase leading-[0.85] tracking-[-0.045em]">
              Stop paying
              <br />
              <span className="text-champagne">inflated</span> prices.
            </h1>
          </Reveal>
          <div className="mt-12 grid gap-10 border-t border-ivory/15 pt-10 md:grid-cols-12 md:items-end">
            <Reveal delay={0.2} className="md:col-span-6">
              <p className="text-lg leading-relaxed text-ivory/70">
                Our team was tired of seeing everyday goods marked up, so we set out to create a better way to shop.
              </p>
            </Reveal>
            <Reveal delay={0.3} className="flex flex-wrap gap-4 md:col-span-6 md:justify-end">
              <ButtonLink href="/sign-in/members">Become a member</ButtonLink>
              <ButtonLink href="/shop" variant="outline-light">Shop now</ButtonLink>
            </Reveal>
          </div>
        </div>
        <div className="border-y border-ivory/10 py-6">
          <ScrollMarquee from={0} to={-30}>
            <p aria-hidden className="whitespace-nowrap text-[clamp(2rem,5vw,4.5rem)] font-extrabold uppercase tracking-[-0.03em] text-ivory/15">
              {categories.map((c) => c.short).join('  ·  ')}  ·  {categories.map((c) => c.short).join('  ·  ')}
            </p>
          </ScrollMarquee>
        </div>
      </section>

      {/* Savings estimate */}
      <section className="section-y">
        <div className="container-luxe grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Eyebrow light index="01">Do the maths</Eyebrow>
            <h2 className="mt-8 text-[clamp(2.4rem,5vw,4.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em]">
              See what your <span className="text-champagne">membership</span> saves.
            </h2>
            <p className="mt-8 max-w-md text-base leading-relaxed text-ivory/60">Move the slider to your typical yearly spend. The estimate subtracts the membership fee, so you see what you actually keep.</p>
          </div>
          <div className="lg:col-span-7">
            <SavingsEstimator />
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="section-y border-t border-ivory/10">
        <div className="container-luxe">
          <Eyebrow light index="02">Membership</Eyebrow>
          <h2 className="mt-8 text-[clamp(2.4rem,5vw,4.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em]">Pick your plan.</h2>
          <div className="mt-14">
            <PlanCards dark />
          </div>
        </div>
      </section>

      {/* Departments as big rows */}
      <section className="section-y border-t border-ivory/10">
        <div className="container-luxe">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow light index="03">Departments</Eyebrow>
              <h2 className="mt-8 text-[clamp(2.4rem,5vw,4.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em]">Everything, one place.</h2>
            </div>
            <TextLink href="/categories" light>
              All departments
            </TextLink>
          </div>
          <Stagger as="ul" className="mt-14 border-t border-ivory/15">
            {categories.map((c) => (
              <StaggerItem as="li" key={c.slug} className="border-b border-ivory/15">
                <Link href={`/categories/${c.slug}`} className="group grid grid-cols-[4.5rem_1fr_auto] items-center gap-5 py-5 md:grid-cols-[7rem_1fr_auto_auto] md:gap-8">
                  <span className="relative block aspect-square overflow-hidden">
                    <Image src={c.image} alt="" aria-hidden fill sizes="112px" className="object-cover grayscale transition duration-700 group-hover:scale-110 group-hover:grayscale-0" />
                  </span>
                  <span className="text-[clamp(1.4rem,3vw,2.6rem)] font-extrabold uppercase leading-none tracking-[-0.03em] transition-colors group-hover:text-champagne">{c.name}</span>
                  <span className="meta hidden text-ivory/45 md:block">{productsIn(c.slug).length} products</span>
                  <ArrowUpRight className="size-6 text-champagne transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1" strokeWidth={1.3} aria-hidden />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Products */}
      <section className="section-y border-t border-ivory/10">
        <div className="container-luxe">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Eyebrow light index="04">Featured</Eyebrow>
              <h2 className="mt-8 text-[clamp(2.4rem,5vw,4.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em]">Top picks.</h2>
            </div>
            <TextLink href="/shop" light>
              Shop all products
            </TextLink>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-x-5 gap-y-12 lg:grid-cols-4">
            {featuredProducts.slice(0, 8).map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} dark />
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-champagne py-24 text-obsidian md:py-32">
        <div className="container-luxe flex flex-wrap items-end justify-between gap-10">
          <h2 className="max-w-4xl text-[clamp(2.4rem,6vw,5.5rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.045em]">Join Price-Select.com and make your membership work for you.</h2>
          <ButtonLink href="/sign-in/members" variant="dark">Join now</ButtonLink>
        </div>
      </section>
    </div>
  )
}
