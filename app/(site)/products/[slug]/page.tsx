import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, PackageCheck, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { getCategory } from '@/lib/data/categories'
import { getProduct, products, productsIn, STOCK_LABEL } from '@/lib/data/products'
import { money } from '@/lib/format'
import { SITE } from '@/lib/site'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Accordion, BuyBox, ProductGallery } from '@/components/commerce/product-detail'
import { ProductCard } from '@/components/commerce/product-card'
import { Reveal } from '@/components/motion/primitives'
import { Breadcrumbs, DemoNote, Eyebrow, JsonLd, TextLink } from '@/components/site/ui'

export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }))

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = getProduct((await params).slug)
  if (!p) return {}
  return {
    title: p.name,
    description: p.summary,
    alternates: { canonical: `/products/${p.slug}` },
    // Unpublished listings render for review links but stay out of search.
    robots: p.status === 'published' ? undefined : { index: false, follow: false },
    openGraph: { title: `${p.name} · Price-Select`, description: p.summary, images: [{ url: p.images[0].src, alt: p.images[0].alt }] },
  }
}

const AVAILABILITY: Record<Product['stock'], string> = {
  in_stock: 'https://schema.org/InStock',
  low_stock: 'https://schema.org/LimitedAvailability',
  made_to_order: 'https://schema.org/MadeToOrder',
  out_of_stock: 'https://schema.org/OutOfStock',
}
const DOC_STATUS = { on_file: ['On file', 'bg-success'], pending: ['Pending review', 'bg-warning'], required: ['Required', 'bg-danger'] } as const

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = getProduct((await params).slug)
  if (!p) notFound()
  const cat = getCategory(p.category)!
  const live = p.status === 'published'
  const price = p.seasonalPrice ?? p.price
  const related = productsIn(p.category).filter((x) => x.slug !== p.slug).slice(0, 4)

  const facts: [string, string][] = [
    ['SKU', p.sku],
    ...(p.upc ? [['UPC', p.upc] as [string, string]] : []),
    ['Weight', `${p.weightKg} kg`],
    ['Dimensions', p.dimensions],
  ]

  return (
    <>
      {live && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.name,
            sku: p.sku,
            ...(p.upc ? { gtin12: p.upc } : {}),
            brand: { '@type': 'Brand', name: p.brand },
            category: cat.name,
            description: p.description,
            image: p.images.map((i) => i.src),
            weight: { '@type': 'QuantitativeValue', value: p.weightKg, unitCode: 'KGM' },
            offers: {
              '@type': 'Offer',
              url: `${SITE.url}/products/${p.slug}`,
              price: price.toFixed(2),
              priceCurrency: p.currency,
              availability: AVAILABILITY[p.stock],
              itemCondition: 'https://schema.org/NewCondition',
              seller: { '@type': 'Organization', name: SITE.name },
            },
          }}
        />
      )}

      <section className="relative bg-midnight pb-20 pt-28 text-ivory md:pt-32 dark-ui">
        <div className="container-luxe">
          <Breadcrumbs
            light
            className="mb-8"
            items={[
              { href: '/shop', label: 'Shop' },
              { href: `/categories/${cat.slug}`, label: cat.name },
              { href: `/products/${p.slug}`, label: p.name },
            ]}
          />

          {!live && (
            <div role="status" className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 border border-warning/40 bg-warning/10 px-5 py-4 text-sm">
              <span className="eyebrow text-warning">Under review</span>
              <span className="text-ivory/80">Not yet available to order. This listing is awaiting compliance review before it can be published.</span>
            </div>
          )}

          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
            <Reveal className="lg:col-span-7" blur={false}>
              <ProductGallery images={p.images} name={p.name} />
            </Reveal>

            <div className="lg:col-span-5 lg:row-span-2 lg:pl-6 xl:col-span-4 xl:col-start-9 xl:pl-0">
              <div className="lg:sticky lg:top-28">
                <Reveal delay={0.1}>
                  <p className="meta flex flex-wrap items-center gap-x-3 gap-y-1 text-ivory/50">
                    <Link href={`/categories/${cat.slug}`} className="hover:text-champagne">
                      {cat.name}
                    </Link>
                    <span className="sel-mark w-5" aria-hidden />
                    <span className="text-champagne">{p.brand}</span>
                  </p>
                  <h1 className="mt-5 font-display text-[clamp(2.4rem,4vw,3.75rem)] font-light leading-[0.98] tracking-[-0.03em]">{p.name}</h1>
                  <p className="mt-5 text-base leading-relaxed text-ivory/70">{p.summary}</p>
                </Reveal>

                <Reveal delay={0.2} className="mt-8 border-t border-ivory/12 pt-6">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p className="text-3xl font-light tabular-nums">
                      <span className="sr-only">{p.seasonalPrice ? 'Seasonal price ' : 'Price '}</span>
                      {money(price)}
                    </p>
                    {p.seasonalPrice && (
                      <>
                        <s className="text-base tabular-nums text-ivory/40">
                          <span className="sr-only">Original price </span>
                          {money(p.price)}
                        </s>
                        <span className="eyebrow text-champagne">Seasonal price</span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ivory/50">Price excludes applicable taxes and shipping.</p>

                  <dl className="mt-6 grid gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <dt className="sr-only">Availability</dt>
                      <span className={cn('size-1.5 rounded-full', p.stock === 'in_stock' ? 'bg-success' : p.stock === 'low_stock' ? 'bg-warning' : 'bg-mist')} aria-hidden />
                      <dd>
                        {STOCK_LABEL[p.stock]}
                        {p.stock === 'low_stock' && p.stockQty > 0 && <span className="text-ivory/50"> — {p.stockQty} available</span>}
                      </dd>
                    </div>
                    <div className="flex items-center gap-3">
                      <dt className="sr-only">Handling time</dt>
                      <Clock className="size-3.5 text-champagne/80" strokeWidth={1.3} aria-hidden />
                      <dd className="text-ivory/80">
                        Ships within {p.handlingDays} business day{p.handlingDays === 1 ? '' : 's'}
                      </dd>
                    </div>
                    <div className="flex items-center gap-3">
                      <dt className="sr-only">Delivery estimate</dt>
                      <Truck className="size-3.5 text-champagne/80" strokeWidth={1.3} aria-hidden />
                      <dd className="text-ivory/80">Estimated delivery {p.deliveryEstimate}</dd>
                    </div>
                  </dl>
                </Reveal>

                <Reveal delay={0.3} className="mt-8">
                  <BuyBox product={p} />
                </Reveal>

                <Reveal delay={0.35} className="mt-8 grid gap-4 border-y border-ivory/12 py-6 text-sm text-ivory/75">
                  <p className="flex gap-3">
                    <PackageCheck className="mt-0.5 size-4 shrink-0 text-champagne" strokeWidth={1.2} aria-hidden />
                    <span>
                      Fulfilled by an approved Price-Select supplier
                      <span className="block text-xs text-ivory/45">Shipped in neutral packaging with Price-Select documentation where possible.</span>
                    </span>
                  </p>
                  <p className="flex gap-3">
                    <RotateCcw className="mt-0.5 size-4 shrink-0 text-champagne" strokeWidth={1.2} aria-hidden />
                    <span>
                      Returns accepted
                      <span className="block text-xs text-ivory/45">Return window confirmed per category before launch.</span>
                    </span>
                  </p>
                </Reveal>

              </div>
            </div>
            <div className="lg:col-span-7 lg:row-start-2">
            <Reveal>
              <h2 className="sr-only">Product details</h2>
              <Accordion
                dark
                items={[
                  { title: 'Description', content: <p>{p.description}</p> },
                  {
                    title: 'Specifications',
                    content: (
                      <table className="w-full text-left">
                        <caption className="sr-only">{p.name} specifications</caption>
                        <tbody>
                          {[...p.specs.map((s) => [s.label, s.value] as [string, string]), ...facts].map(([k, v]) => (
                            <tr key={k} className="border-b border-ivory/8 last:border-0">
                              <th scope="row" className="w-2/5 py-2.5 pr-4 align-top font-normal text-ivory/45">
                                {k}
                              </th>
                              <td className="py-2.5 tabular-nums text-ivory/85">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ),
                  },
                  {
                    title: 'Shipping',
                    content: (
                      <div className="space-y-3">
                        <p>
                          Prepared by the supplier within {p.handlingDays} business day{p.handlingDays === 1 ? '' : 's'}; estimated delivery {p.deliveryEstimate}. A tracking number is added to your order once it ships.
                        </p>
                        <p>When an order contains products from different suppliers, items may arrive in separate shipments, each with its own tracking.</p>
                        <p className="text-xs text-ivory/45">Shipping cost is shown separately at checkout. Carriers are confirmed before launch.</p>
                      </div>
                    ),
                  },
                  {
                    title: 'Returns',
                    content: (
                      <div className="space-y-3">
                        <p>Return, damage and replacement requests are opened from your account and routed to the fulfilling supplier, with Price-Select support overseeing every case.</p>
                        <p className="text-xs text-ivory/45">Return window confirmed per category before launch.</p>
                      </div>
                    ),
                  },
                  {
                    title: 'Safety & compliance',
                    content: (
                      <div className="space-y-4">
                        {cat.reviewLevel === 'enhanced' && <p className="border-l border-champagne/60 pl-3 text-ivory/80">{cat.reviewNote}</p>}
                        <ul className="space-y-2.5">
                          {p.compliance.map((d) => (
                            <li key={d.label} className="flex items-center justify-between gap-4">
                              <span className="text-ivory/85">{d.label}</span>
                              <span className="meta flex shrink-0 items-center gap-2 text-ivory/50">
                                <span className={cn('size-1.5 rounded-full', DOC_STATUS[d.status][1])} aria-hidden />
                                {DOC_STATUS[d.status][0]}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-ivory/45">Price-Select supports documentation and review workflows. This is not legal advice.</p>
                      </div>
                    ),
                  },
                ]}
              />
            </Reveal>

            <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="meta text-ivory/35">{k}</dt>
                  <dd className="mt-1 text-xs tabular-nums text-ivory/70">{v}</dd>
                </div>
              ))}
            </dl>
            <DemoNote light className="mt-8">
              Demonstration product and sample pricing
            </DemoNote>
            </div>
          </div>
        </div>
      </section>

      <section className="section-y bg-ivory" aria-labelledby="related-title">
        <div className="container-luxe">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Reveal>
                <Eyebrow>From the same department</Eyebrow>
              </Reveal>
              <Reveal delay={0.1}>
                <h2 id="related-title" className="mt-6 text-display-3 text-obsidian">
                  Also <em className="text-gold-deep">selected.</em>
                </h2>
              </Reveal>
            </div>
            <TextLink href={`/categories/${cat.slug}`}>All {cat.short.toLowerCase()}</TextLink>
          </div>
          {related.length ? (
            <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-14 md:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
              {related.map((r, i) => (
                <li key={r.slug}>
                  <ProductCard product={r} index={i} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 text-sm text-slate">More products for this department are in supplier review.</p>
          )}
        </div>
      </section>
    </>
  )
}
