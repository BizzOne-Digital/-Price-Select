import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Order } from '@/lib/types'
import { getProduct } from '@/lib/data/products'
import { date, money } from '@/lib/format'
import { Status } from './account-ui'

/** One order as an editorial row: number, date, thumbnails, shipments, status, total. */
export function OrderRow({ order: o }: { order: Order }) {
  const lines = o.fulfillments.flatMap((f) => f.lines)
  const items = lines.reduce((s, l) => s + l.qty, 0)
  return (
    <li className="border-b border-obsidian/10">
      <Link href={`/account/orders/${o.id}`} className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-4 py-6 md:grid-cols-[10rem_1fr_8rem_7rem_1rem]">
        <span>
          <span className="block font-display text-2xl font-light text-obsidian transition-colors group-hover:text-gold-deep">{o.id}</span>
          <span className="meta mt-1 block text-slate">{date(o.placedAt)}</span>
        </span>
        <span className="order-last col-span-2 flex items-center gap-4 md:order-none md:col-span-1">
          <span className="flex -space-x-3">
            {lines.slice(0, 4).map((l) => {
              const p = getProduct(l.productSlug)
              return (
                <span key={l.productSlug} className="relative h-14 w-11 overflow-hidden border-2 border-ivory bg-pearl">
                  {p && <Image src={p.images[0].src} alt="" fill sizes="44px" className="object-cover" />}
                </span>
              )
            })}
          </span>
          <span className="text-xs text-slate">
            {items} item{items === 1 ? '' : 's'} · {o.fulfillments.length} shipment{o.fulfillments.length === 1 ? '' : 's'}
          </span>
        </span>
        <Status value={o.status} className="hidden md:inline-flex" />
        <span className="text-right">
          <span className="block text-sm tabular-nums text-obsidian">{money(o.total)}</span>
          <Status value={o.status} className="mt-1 md:hidden" />
        </span>
        <ArrowUpRight className="hidden size-4 text-slate transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-gold-deep md:block" strokeWidth={1.3} aria-hidden />
      </Link>
    </li>
  )
}

export function SectionTitle({ title, action, as: H = 'h2' }: { title: string; action?: ReactNode; as?: 'h2' | 'h3' }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-obsidian/15 pb-4">
      <H className="font-display text-3xl font-light text-obsidian md:text-4xl">{title}</H>
      {action}
    </div>
  )
}
