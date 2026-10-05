'use client'

import Image from 'next/image'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import type { Product } from '@/lib/types'
import { pad } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { useToast } from '@/components/ui/toast'
import { btnClass, BtnInner } from '@/components/site/ui'
import { useCart } from './cart'
import { Qty } from './cart-drawer'

/** Main image with crossfading plates and thumbnails. Arrow keys move between images. */
export function ProductGallery({ images, name }: { images: Product['images']; name: string }) {
  const [i, setI] = useState(0)
  const go = (n: number) => setI((n + images.length) % images.length)
  const img = images[i]

  return (
    <div
      className="flex flex-col-reverse gap-4 lg:flex-row lg:gap-6"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${name} images`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(i + 1)
        if (e.key === 'ArrowLeft') go(i - 1)
      }}
    >
      {images.length > 1 && (
        <ul className="flex gap-3 lg:w-20 lg:flex-col">
          {images.map((m, n) => (
            <li key={m.src} className="w-20 lg:w-full">
              <button
                type="button"
                onClick={() => setI(n)}
                aria-label={`Show image ${n + 1} of ${images.length}`}
                aria-current={n === i ? 'true' : undefined}
                className={cn('relative block aspect-[4/5] w-full overflow-hidden bg-obsidian transition-opacity duration-500', n === i ? 'opacity-100' : 'opacity-45 hover:opacity-80')}
              >
                <Image src={m.src} alt="" fill sizes="80px" className="object-cover" />
                <span aria-hidden className={cn('absolute inset-x-0 bottom-0 h-px origin-left bg-champagne transition-transform duration-700 ease-[var(--ease-luxe)]', n === i ? 'scale-x-100' : 'scale-x-0')} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="sel-frame relative aspect-[4/5] flex-1 lg:aspect-auto lg:min-h-[78svh]">
        <div className="absolute inset-0 overflow-hidden bg-obsidian">
          <AnimatePresence initial={false}>
            <motion.div
              key={img.src}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: EASE }}
            >
              <Image src={img.src} alt={img.alt} fill priority={i === 0} sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
            </motion.div>
          </AnimatePresence>
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 z-[2] flex items-center justify-between p-4 text-ivory md:p-6">
            <p className="meta tabular-nums text-ivory/80" aria-live="polite">
              {pad(i + 1)} <span className="text-ivory/40">/ {pad(images.length)}</span>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => go(i - 1)} aria-label="Previous image" className="grid size-11 place-items-center border border-ivory/30 bg-midnight/30 transition-colors hover:border-champagne hover:text-champagne">
                <ArrowLeft className="size-4" strokeWidth={1.3} />
              </button>
              <button type="button" onClick={() => go(i + 1)} aria-label="Next image" className="grid size-11 place-items-center border border-ivory/30 bg-midnight/30 transition-colors hover:border-champagne hover:text-champagne">
                <ArrowRight className="size-4" strokeWidth={1.3} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function BuyBox({ product: p }: { product: Product }) {
  const { add, setOpen } = useCart()
  const toast = useToast()
  const [qty, setQty] = useState(1)
  const orderable = p.status === 'published' && p.stock !== 'out_of_stock'

  return (
    <div className="flex flex-wrap items-stretch gap-3">
      <div className={cn(!orderable && 'pointer-events-none opacity-40')} aria-hidden={!orderable || undefined}>
        <Qty value={qty} onChange={(n) => setQty(Math.max(1, Math.min(n, 99)))} label={p.name} dark />
      </div>
      <button
        type="button"
        disabled={!orderable}
        onClick={() => {
          add(p.slug, qty)
          toast({ title: `${p.name} added${qty > 1 ? ` × ${qty}` : ''}`, body: 'Prices exclude applicable taxes and shipping.' })
          setOpen(true)
        }}
        className={btnClass('light', 'min-w-0 flex-1 disabled:cursor-not-allowed')}
      >
        <BtnInner variant="light" icon={orderable}>{orderable ? 'Add to cart' : 'Not yet available'}</BtnInner>
      </button>
    </div>
  )
}

export function Accordion({ items, dark }: { items: { title: string; content: ReactNode }[]; dark?: boolean }) {
  const [open, setOpen] = useState<number | null>(0)
  const id = useId()
  return (
    <div className={cn('border-b', dark ? 'border-ivory/12' : 'border-obsidian/10')}>
      {items.map((it, n) => {
        const isOpen = open === n
        return (
          <div key={it.title} className={cn('border-t', dark ? 'border-ivory/12' : 'border-obsidian/10')}>
            <h3>
              <button
                type="button"
                id={`${id}-h${n}`}
                aria-expanded={isOpen}
                aria-controls={`${id}-p${n}`}
                onClick={() => setOpen(isOpen ? null : n)}
                className={cn('group flex min-h-14 w-full items-center justify-between gap-6 py-4 text-left', dark ? 'text-ivory' : 'text-obsidian')}
              >
                <span className="eyebrow">{it.title}</span>
                <Plus className={cn('size-4 shrink-0 transition-transform duration-500 ease-[var(--ease-luxe)]', isOpen ? 'rotate-45 text-champagne' : dark ? 'text-ivory/50' : 'text-slate')} strokeWidth={1.2} aria-hidden />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${id}-p${n}`}
                  role="region"
                  aria-labelledby={`${id}-h${n}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className={cn('pb-7 text-sm leading-relaxed', dark ? 'text-ivory/70' : 'text-slate')}>{it.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
