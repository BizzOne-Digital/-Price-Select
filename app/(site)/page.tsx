import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { Hero } from '@/components/home/hero'
import { FulfillmentDiagram, MarketplaceStory, PriceSelectAssembly } from '@/components/home/signature'
import { CategoryShowcase } from '@/components/commerce/category-showcase'
import { ProductCard } from '@/components/commerce/product-card'
import { ImageReveal, LineReveal, Parallax, Reveal, ScrollMarquee, SplitText, Stagger, StaggerItem } from '@/components/motion/primitives'
import { ButtonLink, DemoNote, Eyebrow, SectionHeading, TextLink } from '@/components/site/ui'
import { featuredProducts, seasonalProducts } from '@/lib/data/products'
import { categoryName } from '@/lib/data/categories'
import { IMAGES } from '@/lib/img'
import { money } from '@/lib/format'
import { SERVICE_TARGETS } from '@/lib/site'

export const metadata: Metadata = {
  title: { absolute: 'Price-Select — Selected for the way you buy' },
  alternates: { canonical: '/' },
}

export default function Home() {
  const [lead, ...rest] = featuredProducts
  return (
    <>
      <Hero />

      {/* 01 — Brand philosophy */}
      <section id="premise" className="section-y relative bg-ivory">
        <div className="container-luxe">
          <div className="grid gap-16 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <Reveal>
                <Eyebrow index="01">The premise</Eyebrow>
              </Reveal>
              <SplitText text={'Selected\nwith purpose.'} italicWords={['purpose']} className="mt-10 text-display-1 text-obsidian" />
            </div>
            <div className="flex flex-col justify-end lg:col-span-4 lg:col-start-9">
              <Reveal delay={0.15}>
                <p className="text-lg leading-relaxed text-obsidian/80">
                  Price-Select.com brings products from approved suppliers into one clear, considered purchasing experience. Fewer distractions. Better information. One place to buy across very different needs.
                </p>
              </Reveal>
              <Reveal delay={0.3} className="mt-10">
                <TextLink href="/about">Read our approach</TextLink>
              </Reveal>
            </div>
          </div>

          <div className="mt-24 grid gap-10 md:mt-36 lg:grid-cols-12">
            <ImageReveal
              src={IMAGES.architecture}
              alt="A white architectural facade with stepped, precise geometry"
              direction="diagonal"
              parallax={10}
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="sel-frame aspect-[16/11] lg:col-span-7"
            />
            <div className="flex flex-col justify-between lg:col-span-4 lg:col-start-9">
              <Parallax speed={30}>
                <p className="font-display text-[clamp(2rem,3.4vw,3.4rem)] font-light leading-[1.02] tracking-[-0.02em] text-obsidian">
                  &ldquo;Intelligent selection. <em className="text-gold-deep">Without the noise.</em>&rdquo;
                </p>
              </Parallax>
              <ol className="mt-16 lg:mt-0">
                {[
                  ['Curated, not crowded', 'A focused range across every department, so it is easier to find what fits.'],
                  ['Clear from the start', 'Product prices are shown without taxes and shipping, which appear as separate lines at checkout.'],
                  ['Built on relationships', 'Every listing comes from an approved supplier, reviewed before it is published.'],
                ].map(([t, d], i) => (
                  <Reveal as="li" key={t} delay={i * 0.1} className="grid grid-cols-[3rem_1fr] border-t border-obsidian/12 py-6">
                    <span className="meta text-gold-deep">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="block text-base font-medium text-obsidian">{t}</span>
                      <span className="mt-2 block text-sm leading-relaxed text-slate">{d}</span>
                    </span>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — Signature: PRICE · VALUE · QUALITY · SELECTION → PRICE—SELECT */}
      <PriceSelectAssembly />

      {/* 03 — The current selection */}
      <section className="section-y relative bg-pearl" aria-labelledby="selection-title">
        <div className="container-luxe">
          <SectionHeading
            index="03"
            eyebrow="Selected for you"
            title={'The current\nselection.'}
            italic={['selection']}
            aside={
              <div className="max-w-xs space-y-6">
                <p className="text-sm leading-relaxed">A small edit of products worth making room for, from technology to the outdoors.</p>
                <TextLink href="/shop">View the full catalog</TextLink>
              </div>
            }
          />
          <div className="mt-20 grid grid-cols-2 gap-x-4 gap-y-16 md:gap-x-6 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-24">
            <div className="col-span-2 lg:col-span-7">
              <ProductCard product={lead} aspect="aspect-[4/5] lg:aspect-[6/5]" sizes="(min-width: 1024px) 58vw, 100vw" />
            </div>
            {rest.slice(0, 3).map((p, i) => (
              <div key={p.slug} className={['lg:col-span-4 lg:col-start-9 lg:mt-48', 'lg:col-span-4 lg:col-start-2', 'col-span-2 sm:col-span-1 lg:col-span-5 lg:col-start-7 lg:mt-40'][i]}>
                <ProductCard product={p} index={i + 1} aspect={i === 2 ? 'aspect-[5/4]' : 'aspect-[4/5]'} sizes="(min-width: 1024px) 35vw, 50vw" />
              </div>
            ))}
          </div>
          <DemoNote className="mt-16">Demonstration products and sample pricing. Live inventory will be connected from approved suppliers.</DemoNote>
        </div>
      </section>

      {/* 04 — Immersive department exploration */}
      <section aria-labelledby="departments-title" className="relative">
        <h2 id="departments-title" className="sr-only">Departments</h2>
        <CategoryShowcase />
      </section>

      {/* 05 — Seasonal: Buy summer in winter. Save. */}
      <section className="section-y relative overflow-hidden bg-ivory" aria-labelledby="offer-title">
        <div className="container-luxe">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Reveal>
                <Eyebrow index="04">Seasonal selection</Eyebrow>
              </Reveal>
              <h2 id="offer-title" className="sr-only">Buy summer in winter. Save.</h2>
              <SplitText as="p" text={'Buy summer\nin winter.\nSave.'} italicWords={['Save']} className="mt-10 text-display-2 text-obsidian" />
              <Reveal delay={0.2} className="mt-10 max-w-sm text-base leading-relaxed text-slate">
                Price-Select, just for you: three to four products chosen for the season ahead, at special off-season pricing for a limited window. The edit changes with each season.
              </Reveal>
              <Reveal delay={0.3} className="mt-10">
                <ButtonLink href="/shop?seasonal=1" variant="dark">
                  Explore the offer
                </ButtonLink>
              </Reveal>
            </div>
            <div className="relative lg:col-span-6 lg:col-start-7">
              <ImageReveal
                src={IMAGES.lake}
                alt="A still alpine lake beneath mountains in soft summer light"
                direction="split"
                parallax={12}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="aspect-[3/4] md:aspect-[4/5]"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-midnight/80 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-ivory md:p-10">
                  <p className="eyebrow text-champagne">The seasonal edit</p>
                  <ul className="mt-5">
                    {seasonalProducts.map((p) => (
                      <li key={p.slug} className="border-t border-ivory/15">
                        <Link href={`/products/${p.slug}`} className="group flex items-baseline justify-between gap-4 py-3.5" data-cursor="View">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium group-hover:text-champagne">{p.name}</span>
                            <span className="meta text-ivory/45">{categoryName(p.category)}</span>
                          </span>
                          <span className="shrink-0 text-right text-sm tabular-nums">
                            {money(p.seasonalPrice!)} <s className="ml-2 text-xs text-ivory/40">{money(p.price)}</s>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <DemoNote light className="mt-5">Sample seasonal pricing</DemoNote>
                </div>
              </ImageReveal>
            </div>
          </div>
        </div>
      </section>

      {/* 06 — Marketplace / supplier story (horizontal) */}
      <MarketplaceStory />

      {/* 07 — Order & fulfillment explained */}
      <section className="section-y relative bg-ivory" aria-labelledby="fulfillment-title">
        <div className="container-luxe grid gap-16 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow index="06">One order, many suppliers</Eyebrow>
            </Reveal>
            <SplitText text={'Built for\nchoice.'} italicWords={['choice']} className="mt-10 text-display-2 text-obsidian" id="fulfillment-title" />
            <Reveal delay={0.2} className="mt-8 max-w-md space-y-5 text-base leading-relaxed text-slate">
              <p>When an order includes products from different suppliers, each supplier receives only their part of it. You still see one order, with a separate fulfillment and tracking number for each shipment.</p>
              <p>Shipments use neutral packaging and Price-Select documentation where it is legally and operationally possible.</p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:col-span-6 lg:col-start-7">
            <FulfillmentDiagram />
          </Reveal>
        </div>
      </section>

      {/* 08 — Trust & compliance */}
      <section className="section-y relative overflow-hidden bg-midnight text-ivory" aria-labelledby="trust-title">
        <div aria-hidden className="aurora opacity-50" />
        <div className="container-luxe relative">
          <SectionHeading
            light
            index="07"
            eyebrow="Trust, documented"
            title={'Reviewed before\nit reaches you.'}
            italic={['reaches', 'you']}
            aside={
              <p className="max-w-xs text-sm leading-relaxed">
                Price-Select supports documentation and review workflows. It is not a substitute for legal or regulatory advice; requirements are confirmed for each market where products are sold.
              </p>
            }
          />
          <Stagger as="ul" className="mt-20 grid gap-px bg-ivory/10 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Authentic and new', 'Suppliers confirm every product is authentic and new before it can be listed.'],
              ['Documentation on file', 'Safety certificates, manuals and warranties are collected and retained where applicable.'],
              ['Enhanced review', "Children's products, construction materials and regulated goods receive additional review."],
              ['Clear pricing', 'Prices exclude applicable taxes and shipping. Both are shown separately before you pay.'],
            ].map(([t, d], i) => (
              <StaggerItem as="li" key={t} className="group relative bg-midnight p-8 transition-colors duration-700 hover:bg-[#0b1828] md:p-10">
                <span className="meta text-champagne">{String(i + 1).padStart(2, '0')}</span>
                <ShieldCheck className="mt-10 size-6 text-champagne/70 transition-transform duration-700 group-hover:-translate-y-1" strokeWidth={1} aria-hidden />
                <h3 className="mt-6 font-display text-3xl font-light">{t}</h3>
                <p className="mt-4 text-sm leading-relaxed text-ivory/60">{d}</p>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-24">
            <LineReveal />
            <dl className="grid gap-10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICE_TARGETS.map((t) => (
                <Reveal key={t.label}>
                  <dt className="meta text-ivory/45">{t.label}</dt>
                  <dd className="mt-4">
                    <span className="font-display text-6xl font-light">{t.value}</span>
                    <span className="ml-2 text-sm text-ivory/55">{t.unit}</span>
                  </dd>
                </Reveal>
              ))}
            </dl>
            <DemoNote light className="mt-10">Initial service targets — to be agreed with suppliers before launch</DemoNote>
          </div>
        </div>
      </section>

      {/* 09 — Editorial call to action */}
      <section className="relative overflow-hidden bg-ivory pb-28 pt-28 md:pb-40 md:pt-40" aria-labelledby="cta-title">
        <ScrollMarquee from={6} to={-40}>
          <p aria-hidden className="font-display text-[clamp(5rem,17vw,19rem)] font-light leading-none tracking-[-0.05em] text-obsidian">
            Select better. <em className="text-gold-deep">Select better.</em> Select better.
          </p>
        </ScrollMarquee>
        <div className="container-luxe mt-16 grid gap-10 md:grid-cols-12 md:items-end">
          <h2 id="cta-title" className="font-display text-4xl font-light leading-tight text-obsidian md:col-span-6 md:text-5xl">
            You are not just browsing products. You are entering a carefully selected marketplace.
          </h2>
          <div className="flex flex-wrap gap-4 md:col-span-5 md:col-start-8 md:justify-end">
            <ButtonLink href="/shop" variant="dark">Shop the selection</ButtonLink>
            <ButtonLink href="/supplier/apply" variant="outline-dark">Become a supplier</ButtonLink>
          </div>
        </div>
      </section>
    </>
  )
}
