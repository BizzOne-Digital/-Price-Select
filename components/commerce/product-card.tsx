'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Plus } from 'lucide-react'
import type { Product } from '@/lib/types'
import { money } from '@/lib/format'
import { categoryName } from '@/lib/data/categories'
import { STOCK_LABEL } from '@/lib/data/products'
import { cn } from '@/lib/utils'
import { useCart } from './cart'
import { useToast } from '@/components/ui/toast'
import { EASE } from '@/components/motion/primitives'

export function ProductCard({ product: p, index = 0, dark, aspect = 'aspect-[4/5]', sizes = '(min-width: 1024px) 25vw, 50vw' }: { product: Product; index?: number; dark?: boolean; aspect?: string; sizes?: string }) {
  const { add, setOpen } = useCart()
  const toast = useToast()
  const price = p.seasonalPrice ?? p.price

  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1.1, delay: (index % 4) * 0.09, ease: EASE }}
      className="group relative"
    >
      <div className="relative">
      <Link href={`/products/${p.slug}`} data-cursor="Select" className="block" aria-label={`${p.name}, ${money(price)}`}>
        <div className={cn('sel-frame relative', aspect)}>
          <div className={cn('absolute inset-0 overflow-hidden', dark ? 'bg-ivory' : 'bg-pearl')}>
            <Image
              src={p.images[0].src}
              alt={p.images[0].alt}
              fill
              sizes={sizes}
              className="object-cover saturate-[0.85] transition-transform duration-[1.6s] ease-[var(--ease-luxe)] group-hover:scale-[1.07]"
            />
            {p.images[1] && (
              <Image
                src={p.images[1].src}
                alt=""
                aria-hidden
                fill
                sizes={sizes}
                className="object-cover [clip-path:inset(100%_0_0_0)] transition-[clip-path,transform] duration-[1.1s] ease-[var(--ease-curtain)] group-hover:scale-[1.03] group-hover:[clip-path:inset(0_0_0_0)]"
              />
            )}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ivory/50 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
          </div>
          {p.tag && (
            <span className="absolute left-4 top-4 z-[2] bg-coral px-2.5 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-obsidian">
              {p.tag}
            </span>
          )}
          <span className="absolute right-4 top-4 z-[2] meta text-obsidian/0 transition-colors duration-500 group-hover:text-obsidian/80">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
      </Link>

      {/* Quick add sits outside the link so it stays a real button. */}
      <button
        type="button"
        onClick={() => {
          add(p.slug)
          toast({ title: `${p.name} added`, body: 'Prices exclude applicable taxes and shipping.' })
          setOpen(true)
        }}
        className="absolute inset-x-4 bottom-4 z-[3] flex h-11 translate-y-3 items-center justify-between bg-ivory px-4 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-obsidian opacity-0 transition-all duration-500 ease-[var(--ease-luxe)] hover:bg-champagne focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden"
        aria-label={`Add ${p.name} to cart`}
      >
        Add to cart <Plus className="size-3.5" strokeWidth={1.5} />
      </button>
      </div>

      <div className={cn('relative mt-5 pt-4', dark ? 'text-obsidian' : 'text-obsidian')}>
        <span aria-hidden className={cn('absolute inset-x-0 top-0 h-px origin-left transition-transform duration-700 ease-[var(--ease-luxe)]', dark ? 'bg-obsidian/15' : 'bg-obsidian/12')} />
        <span aria-hidden className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-champagne transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-x-100" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:translate-x-1">
            <p className={cn('meta', dark ? 'text-obsidian/45' : 'text-slate')}>{categoryName(p.category)}</p>
            <h3 className="mt-2 text-[0.95rem] font-medium leading-snug">
              <Link href={`/products/${p.slug}`}>{p.name}</Link>
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.95rem] tabular-nums transition-[font-size,color] duration-500 group-hover:text-teal">{money(price)}</p>
            {p.seasonalPrice && <p className={cn('text-xs tabular-nums line-through', dark ? 'text-obsidian/35' : 'text-slate/70')}>{money(p.price)}</p>}
          </div>
        </div>
        <p className={cn('mt-3 flex items-center gap-2 text-xs', dark ? 'text-obsidian/45' : 'text-slate')}>
          <span className={cn('size-1.5 rounded-full', p.stock === 'in_stock' ? 'bg-success' : p.stock === 'low_stock' ? 'bg-warning' : 'bg-mist')} aria-hidden />
          {STOCK_LABEL[p.stock]} · {p.deliveryEstimate.split(',')[0]}
        </p>
      </div>
    </motion.article>
  )
}
