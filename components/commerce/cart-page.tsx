'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { SafeImage } from '@/components/ui/safe-image'
import { money } from '@/lib/format'
import { EASE } from '@/components/motion/primitives'
import { btnClass, BtnInner, ButtonLink } from '@/components/site/ui'
import { groupBySupplier, useCart } from './cart'
import { Qty } from './cart-drawer'

export function CartPage() {
  const { lines, update, remove, ready, quote: q, busy, error, count } = useCart()
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState('')
  const groups = groupBySupplier(lines)

  if (!ready || (count > 0 && !q && !error)) return <div className="min-h-[50svh]" aria-busy="true" />

  if (!lines.length)
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="mx-auto max-w-2xl py-16 text-center md:py-24">
        <p className="eyebrow text-gold-deep">Your cart is empty</p>
        <p className="mt-6 font-display text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[0.98] tracking-[-0.03em] text-obsidian">
          Nothing <em className="text-gold-deep">selected</em> yet.
        </p>
        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-slate">Explore the catalog or browse by department. Products you add are kept in your cart.</p>
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

  if (!q)
    return (
      <p role="alert" className="mx-auto max-w-xl py-16 text-center text-sm text-danger">
        {error || 'Your cart could not be loaded.'}
      </p>
    )

  return (
    <div className="grid gap-16 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        {error && (
          <p role="alert" className="mb-8 border-l border-danger pl-4 text-sm text-danger">
            {error}
          </p>
        )}
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
                      key={l.productId}
                      layout
                      exit={{ opacity: 0, x: 30, transition: { duration: 0.35 } }}
                      className="grid grid-cols-[6rem_1fr] gap-5 border-b border-obsidian/10 py-7 sm:grid-cols-[8rem_1fr] md:gap-8"
                    >
                      <Link href={l.slug ? `/products/${l.slug}` : '/shop'} className="relative aspect-[4/5] overflow-hidden bg-pearl">
                        <SafeImage src={l.image?.src ?? ''} alt={l.image?.alt ?? ''} fill sizes="128px" className="object-cover" />
                      </Link>
                      <div className="flex min-w-0 flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="meta text-slate">{l.brand}</p>
                            <Link href={l.slug ? `/products/${l.slug}` : '/shop'} className="mt-1.5 block text-base font-medium text-obsidian hover:text-gold-deep">
                              {l.name}
                            </Link>
                            <p className="mt-1 text-xs text-slate">
                              {money(l.unitPrice)} each{l.seasonal && <span className="ml-2 text-gold-deep">Seasonal price</span>}
                            </p>
                          </div>
                          <p className="shrink-0 text-base tabular-nums text-obsidian">{money(l.unitPrice * l.qty)}</p>
                        </div>
                        {l.problem && (
                          <p role="alert" className="mt-2 text-xs text-danger">
                            {l.problem}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                          <Qty value={l.qty} onChange={(n) => void update(l.productId, n)} label={l.name} disabled={busy} />
                          <button type="button" disabled={busy} onClick={() => void remove(l.productId)} className="meta h-11 text-slate underline-offset-4 hover:text-danger hover:underline" aria-label={`Remove ${l.name}`}>
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
                  {q.shipments} shipment{q.shipments === 1 ? '' : 's'}
                </span>
              </dt>
              <dd className="tabular-nums text-obsidian">{q.shipping == null ? 'Not yet available' : money(q.shipping)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">
                Applicable taxes
              </dt>
              <dd className="tabular-nums text-obsidian">{q.tax == null ? 'Not yet available' : money(q.tax)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate">Discounts</dt>
              <dd className="tabular-nums text-obsidian">{q.discount ? `−${money(q.discount)}` : money(0)}</dd>
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
            <p className="font-display text-4xl font-light tabular-nums text-obsidian">{money(q.total ?? q.subtotal - q.discount)}</p>
          </div>
          {q.total == null && <p className="mt-2 text-xs text-slate">Products only — shipping and taxes are not yet available.</p>}

          <Link href="/checkout" className={btnClass('dark', 'mt-8 w-full')}>
            <BtnInner variant="dark">Proceed to checkout</BtnInner>
          </Link>
          {q.blockers.length > 0 && (
            <ul className="mt-6 space-y-2 border-l border-warning pl-4 text-xs leading-relaxed text-slate">
              {[...new Set(q.blockers.map((b) => b.message))].map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
