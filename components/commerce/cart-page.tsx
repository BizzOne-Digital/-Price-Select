'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { categoryName } from '@/lib/data/categories'
import { money } from '@/lib/format'
import { quote } from '@/lib/pricing'
import { EASE } from '@/components/motion/primitives'
import { btnClass, BtnInner, ButtonLink, DemoNote } from '@/components/site/ui'
import { useCart, type ResolvedLine } from './cart'
import { Qty } from './cart-drawer'

/** Lines grouped by fulfilling supplier, in cart order. Supplier identity is never shown (blind dropship). */
export function groupBySupplier(lines: ResolvedLine[]) {
  const map = new Map<string, ResolvedLine[]>()
  for (const l of lines) map.set(l.product.supplierId, [...(map.get(l.product.supplierId) ?? []), l])
  return [...map.entries()].map(([supplierId, items]) => ({ supplierId, items }))
}

export function CartPage() {
  const { lines, update, remove, ready } = useCart()
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState('')
  const groups = groupBySupplier(lines)
  const q = quote(
    lines.map((l) => ({ unitPrice: l.unitPrice, qty: l.qty, supplierId: l.product.supplierId })),
    { estimateShipping: true },
  )

  if (!ready) return <div className="min-h-[50svh]" aria-busy="true" />

  if (!lines.length)
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="mx-auto max-w-2xl py-16 text-center md:py-24">
        <p className="eyebrow text-gold-deep">Your cart is empty</p>
        <p className="mt-6 font-display text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[0.98] tracking-[-0.03em] text-obsidian">
          Nothing <em className="text-gold-deep">selected</em> yet.
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-slate">Explore the catalog or browse by department. Products you add will be kept here on this device.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/shop" variant="dark">
            Shop the selection
          </ButtonLink>
          <ButtonLink href="/categories" variant="outline-dark">
            Browse departments
          </ButtonLink>
        </div>
      </motion.div>
    )

  return (
    <div className="grid gap-16 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        {groups.length > 1 && (
          <p className="mb-10 border-l border-gold pl-4 text-sm leading-relaxed text-slate">
            Products may ship separately when fulfilled by different suppliers. Your order will arrive in {groups.length} shipments, each with its own tracking.
          </p>
        )}
        <div className="space-y-14">
          {groups.map((g, gi) => (
            <section key={g.supplierId} aria-labelledby={`ship-${gi}`}>
              <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-obsidian/15 pb-4">
                <h2 id={`ship-${gi}`} className="eyebrow whitespace-nowrap text-obsidian">
                  Shipment {gi + 1} of {groups.length}
                </h2>
                <p className="meta text-slate">Fulfilled by an approved supplier</p>
              </header>
              <ul>
                <AnimatePresence initial={false}>
                  {g.items.map((l) => (
                    <motion.li
                      key={l.slug}
                      layout
                      exit={{ opacity: 0, x: 30, transition: { duration: 0.35 } }}
                      className="grid grid-cols-[6rem_1fr] gap-5 border-b border-obsidian/10 py-7 sm:grid-cols-[8rem_1fr] md:gap-8"
                    >
                      <Link href={`/products/${l.slug}`} className="relative aspect-[4/5] overflow-hidden bg-pearl">
                        <Image src={l.product.images[0].src} alt={l.product.images[0].alt} fill sizes="128px" className="object-cover" />
                      </Link>
                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="meta text-slate">{categoryName(l.product.category)}</p>
                            <Link href={`/products/${l.slug}`} className="mt-1.5 block text-base font-medium text-obsidian hover:text-gold-deep">
                              {l.product.name}
                            </Link>
                            <p className="mt-1 text-xs text-slate">
                              {money(l.unitPrice)} each{l.product.seasonalPrice && <span className="ml-2 text-gold-deep">Seasonal price</span>}
                            </p>
                          </div>
                          <p className="shrink-0 text-base tabular-nums text-obsidian">{money(l.unitPrice * l.qty)}</p>
                        </div>
                        <p className="mt-2 text-xs text-slate">Estimated delivery {l.product.deliveryEstimate}</p>
                        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                          <Qty value={l.qty} onChange={(n) => update(l.slug, n)} label={l.product.name} />
                          <button type="button" onClick={() => remove(l.slug)} className="meta h-11 text-slate underline-offset-4 hover:text-danger hover:underline" aria-label={`Remove ${l.product.name}`}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
        <Link href="/shop" className="link-line eyebrow mt-10 text-obsidian">
          Continue shopping
        </Link>
      </div>

      <aside className="lg:col-span-4 lg:col-start-9" aria-labelledby="summary-title">
        <div className="border border-obsidian/12 bg-pearl/50 p-6 md:p-8 lg:sticky lg:top-28">
          <h2 id="summary-title" className="font-display text-3xl font-light text-obsidian">
            Summary
          </h2>
          <dl className="mt-8 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Product subtotal</dt>
              <dd className="tabular-nums text-obsidian">{money(q.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">
                Shipping
                <span className="block text-xs text-slate/70">
                  {q.shipments} shipment{q.shipments === 1 ? '' : 's'} · Demo estimate
                </span>
              </dt>
              <dd className="tabular-nums text-obsidian">{money(q.shipping ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">
                Applicable taxes
                <span className="block max-w-[15rem] text-xs text-slate/70">Calculated at checkout by tax provider — not yet connected</span>
              </dt>
              <dd className="text-slate">—</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Discounts</dt>
              <dd className="tabular-nums text-obsidian">{money(q.discount)}</dd>
            </div>
          </dl>

          <form
            className="mt-6 border-t border-obsidian/10 pt-6"
            onSubmit={(e) => {
              e.preventDefault()
              setCodeMsg(code.trim() ? 'That code could not be applied. Promotions are configured by administrators.' : 'Enter a code to apply.')
            }}
          >
            <label htmlFor="promo" className="eyebrow text-slate">
              Discount code
            </label>
            <div className="mt-1 flex items-end gap-3">
              <input id="promo" value={code} onChange={(e) => setCode(e.target.value)} className="field" autoComplete="off" aria-describedby="promo-note" />
              <button type="submit" className="meta h-11 shrink-0 border-b border-obsidian px-1 text-obsidian hover:text-gold-deep">
                Apply
              </button>
            </div>
            <p id="promo-note" className="mt-2 text-xs text-slate" aria-live="polite">
              {codeMsg || 'Promotions are configured by administrators.'}
            </p>
          </form>

          <div className="mt-6 flex items-baseline justify-between border-t border-obsidian/15 pt-6">
            <p className="eyebrow text-obsidian">Estimated total</p>
            <p className="font-display text-4xl font-light tabular-nums text-obsidian">{money(q.total)}</p>
          </div>
          <p className="mt-2 text-xs text-slate">Before applicable taxes.</p>

          <Link href="/checkout" className={btnClass('dark', 'mt-8 w-full')}>
            <BtnInner variant="dark">Proceed to checkout</BtnInner>
          </Link>
          <DemoNote className="mt-6">Demonstration environment — no payment is taken</DemoNote>
        </div>
      </aside>
    </div>
  )
}
