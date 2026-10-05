'use client'

import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { Minus, Plus, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { money } from '@/lib/format'
import { categoryName } from '@/lib/data/categories'
import { useCart } from './cart'
import { btnClass, BtnInner } from '@/components/site/ui'
import { CURTAIN, EASE } from '@/components/motion/primitives'

export function CartDrawer() {
  const { open, setOpen, lines, totals, update, remove } = useCart()
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110]">
          <motion.button
            aria-label="Close cart"
            className="absolute inset-0 bg-obsidian/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Your cart"
            className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-ivory text-obsidian outline-none"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.8, ease: CURTAIN }}
          >
            <div className="flex items-center justify-between border-b border-obsidian/10 px-6 py-6 md:px-8">
              <div>
                <p className="eyebrow text-slate">Your selection</p>
                <p className="mt-1 font-display text-3xl font-light">Cart</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close cart" className="grid size-11 place-items-center hover:text-gold-deep">
                <X className="size-5" strokeWidth={1.2} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 md:px-8" data-lenis-prevent>
              {lines.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="font-display text-3xl font-light">Nothing selected yet.</p>
                  <p className="mt-3 text-sm text-slate">Explore the current selection to begin.</p>
                  <Link href="/shop" onClick={() => setOpen(false)} className={btnClass('dark', 'mt-8')}>
                    <BtnInner variant="dark">Shop the selection</BtnInner>
                  </Link>
                </div>
              ) : (
                <ul>
                  <AnimatePresence initial={false}>
                    {lines.map((l, i) => (
                      <motion.li
                        key={l.slug}
                        layout
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.05, duration: 0.7, ease: EASE } }}
                        exit={{ opacity: 0, x: 40, transition: { duration: 0.4 } }}
                        className="flex gap-5 border-b border-obsidian/10 py-6"
                      >
                        <Link href={`/products/${l.slug}`} onClick={() => setOpen(false)} className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden bg-pearl">
                          <Image src={l.product.images[0].src} alt={l.product.images[0].alt} fill sizes="96px" className="object-cover" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="meta text-slate">{categoryName(l.product.category)}</p>
                          <Link href={`/products/${l.slug}`} onClick={() => setOpen(false)} className="mt-1 text-sm font-medium hover:text-gold-deep">
                            {l.product.name}
                          </Link>
                          <div className="mt-auto flex items-center justify-between pt-4">
                            <Qty value={l.qty} onChange={(q) => update(l.slug, q)} label={l.product.name} />
                            <div className="text-right">
                              <p className="text-sm tabular-nums">{money(l.unitPrice * l.qty)}</p>
                              <button onClick={() => remove(l.slug)} className="meta mt-1 text-slate underline-offset-4 hover:text-danger hover:underline">
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {lines.length > 0 && (
              <div className="border-t border-obsidian/10 bg-pearl/60 px-6 py-6 md:px-8">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate">Product subtotal</dt>
                    <dd className="tabular-nums">{money(totals.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between text-slate">
                    <dt>Shipping & applicable taxes</dt>
                    <dd>Calculated at checkout</dd>
                  </div>
                </dl>
                {totals.shipments > 1 && (
                  <p className="mt-4 border-l border-gold pl-3 text-xs leading-relaxed text-slate">
                    Your selection is fulfilled by {totals.shipments} approved suppliers and may arrive in separate shipments.
                  </p>
                )}
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Link href="/cart" onClick={() => setOpen(false)} className={btnClass('outline-dark', 'justify-center')}>
                    <BtnInner variant="outline-dark" icon={false}>View cart</BtnInner>
                  </Link>
                  <Link href="/checkout" onClick={() => setOpen(false)} className={btnClass('dark')}>
                    <BtnInner variant="dark">Checkout</BtnInner>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function Qty({ value, onChange, label, dark }: { value: number; onChange: (n: number) => void; label: string; dark?: boolean }) {
  return (
    <div className={`inline-flex h-10 items-center border ${dark ? 'border-ivory/20' : 'border-obsidian/15'}`} role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease quantity" className="grid size-10 place-items-center hover:text-gold-deep">
        <Minus className="size-3" />
      </button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase quantity" className="grid size-10 place-items-center hover:text-gold-deep">
        <Plus className="size-3" />
      </button>
    </div>
  )
}
