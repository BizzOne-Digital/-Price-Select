'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'
import type { CaseStatus, Fulfillment, OrderStatus } from '@/lib/types'
import { titleCase } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CURTAIN, EASE } from '@/components/motion/primitives'

export const ACCOUNT_NAV = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/track', label: 'Track' },
  { href: '/account/returns', label: 'Returns' },
  { href: '/account/saved', label: 'Saved' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/details', label: 'Details' },
]

/** Hairline tab bar with a travelling selection line. */
export function AccountNav() {
  const path = usePathname()
  const isActive = (href: string) => (href === '/account' ? path === href : path === href || path.startsWith(href + '/'))
  return (
    <nav aria-label="Account" className="border-b border-obsidian/10 bg-ivory">
      <div className="container-luxe">
        <ul className="no-scrollbar -mx-5 flex overflow-x-auto px-5 md:mx-0 md:gap-2 md:px-0">
          {ACCOUNT_NAV.map((n) => {
            const on = isActive(n.href)
            return (
              <li key={n.href} className="relative shrink-0">
                <Link
                  href={n.href}
                  aria-current={on ? 'page' : undefined}
                  className={cn('flex h-14 items-center px-4 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] transition-colors md:h-16 md:px-5', on ? 'text-obsidian' : 'text-slate hover:text-obsidian')}
                >
                  {n.label}
                </Link>
                {on && <motion.span layoutId="account-tab" aria-hidden className="absolute inset-x-4 bottom-0 h-px bg-gold md:inset-x-5" transition={{ duration: 0.6, ease: EASE }} />}
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

const TONE: Record<string, string> = {
  pending: 'bg-mist',
  confirmed: 'bg-ocean',
  processing: 'bg-warning',
  shipped: 'bg-gold',
  delivered: 'bg-success',
  canceled: 'bg-danger',
  returned: 'bg-slate',
  open: 'bg-gold',
  awaiting_supplier: 'bg-warning',
  approved: 'bg-success',
  in_transit: 'bg-ocean',
  resolved: 'bg-success',
  declined: 'bg-danger',
  escalated: 'bg-danger',
}

export function Status({ value, light, className }: { value: OrderStatus | CaseStatus; light?: boolean; className?: string }) {
  return (
    <span className={cn('meta inline-flex items-center gap-2', light ? 'text-obsidian/80' : 'text-obsidian/80', className)}>
      <span className={cn('size-1.5 rounded-full', TONE[value] ?? 'bg-mist')} aria-hidden />
      {titleCase(value)}
    </span>
  )
}

const FLOW: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']
const FLOW_LABEL: Record<OrderStatus, string> = {
  pending: 'Order placed',
  confirmed: 'Confirmed by supplier',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  canceled: 'Canceled',
  returned: 'Returned',
}
const when = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

type Row = { key: string; label: string; at?: string; note?: string; done: boolean; terminal?: boolean }

/** Completed events from history, then the steps still to come. Draws itself when scrolled into view. */
export function OrderTimeline({ history, status, light }: { history: Fulfillment['history']; status: OrderStatus; light?: boolean }) {
  const ref = useRef<HTMLOListElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  const rows: Row[] = history.map((h, i) => ({ key: `${h.status}-${i}`, label: FLOW_LABEL[h.status], at: h.at, note: h.note, done: true, terminal: h.status === 'canceled' || h.status === 'returned' }))
  if (!['delivered', 'canceled', 'returned'].includes(status)) {
    const reached = Math.max(...history.map((h) => FLOW.indexOf(h.status)), 0)
    FLOW.slice(reached + 1).forEach((s) => rows.push({ key: s, label: FLOW_LABEL[s], done: false }))
  }
  return (
    <ol ref={ref} className="relative" aria-label="Fulfillment timeline">
      {rows.map((r, i) => (
        <motion.li
          key={r.key}
          className="relative grid grid-cols-[1.5rem_1fr] gap-3 pb-6 last:pb-0"
          initial={{ opacity: 0, x: -8 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.22 }}
          aria-current={r.done && !rows[i + 1]?.done ? 'step' : undefined}
        >
          {i < rows.length - 1 && (
            <span aria-hidden className={cn('absolute left-[5px] top-3 h-full w-px', light ? 'bg-obsidian/15' : 'bg-obsidian/12')}>
              {r.done && rows[i + 1].done && (
                <motion.span
                  className="absolute inset-0 origin-top bg-gold"
                  initial={{ scaleY: 0 }}
                  animate={inView ? { scaleY: 1 } : {}}
                  transition={{ duration: 0.5, ease: CURTAIN, delay: 0.25 + i * 0.22 }}
                />
              )}
            </span>
          )}
          <span
            aria-hidden
            className={cn(
              'relative z-[1] mt-1.5 block size-[11px] rounded-full border',
              r.terminal ? 'border-danger bg-danger' : r.done ? 'border-gold bg-gold' : light ? 'border-obsidian/30 bg-ivory' : 'border-obsidian/25 bg-ivory',
            )}
          />
          <div>
            <p className={cn('flex flex-wrap items-baseline gap-x-3 text-sm', r.done ? (light ? 'text-obsidian' : 'text-obsidian') : light ? 'text-obsidian/40' : 'text-slate/60')}>
              <span className="font-medium">{r.label}</span>
              {r.at && <time dateTime={r.at} className={cn('text-xs tabular-nums', light ? 'text-obsidian/45' : 'text-slate')}>{when.format(new Date(r.at))}</time>}
              {!r.done && <span className="sr-only">(upcoming)</span>}
            </p>
            {r.note && <p className={cn('mt-1 text-xs leading-relaxed', light ? 'text-obsidian/55' : 'text-slate')}>{r.note}</p>}
          </div>
        </motion.li>
      ))}
    </ol>
  )
}
