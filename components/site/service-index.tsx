'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'

const SERVICES = [
  {
    t: 'Marketplace Shopping', who: 'Customers',
    s: 'Browse and purchase products across every department in one account, one cart and one checkout.',
    p: ['Search by keyword, category, brand, price and availability', 'Product detail with specifications, shipping estimates and return information', 'Guest checkout or a customer account'],
  },
  {
    t: 'Supplier Marketplace', who: 'Suppliers',
    s: 'Approved suppliers submit products and manage fulfillment directly, under one consistent storefront.',
    p: ['Application with business, contact, tax and shipping details', 'Review before any listing is published', 'Authenticity and new-condition confirmation for every product'],
  },
  {
    t: 'Product Catalog Management', who: 'Suppliers',
    s: 'Suppliers manage pricing, inventory, product details and documentation from a dedicated portal.',
    p: ['SKU, UPC/EAN, images, weight and dimensions', 'Availability, handling time and shipping options', 'Safety certificates, manuals and warranties on file'],
  },
  {
    t: 'Order & Fulfillment Coordination', who: 'Operations',
    s: 'Every order is routed to the supplier responsible for each item, with split shipments where needed.',
    p: ['Supplier sees only the items routed to them', 'Tracking required after dispatch', 'Blind dropshipping in neutral packaging where possible'],
  },
  {
    t: 'Customer Support', who: 'Customers',
    s: 'Customers can request help, cancellations, returns, replacements and escalations from their account.',
    p: ['Requests routed to the right supplier and support staff', 'Full case history with notes and outcomes', 'Email notifications at every important step'],
  },
  {
    t: 'Supplier Performance Management', who: 'Administrators',
    s: 'Administrators review fulfillment and service performance against targets agreed with each supplier.',
    p: ['Acknowledgment time and tracking compliance', 'Fulfillment rate, response time and return rate', 'Approve, suspend or reinstate supplier accounts'],
  },
  {
    t: 'Inventory Integration', who: 'Suppliers',
    s: 'Inventory and orders exchanged by API or EDI where available, with a secure manual upload option.',
    p: ['API and EDI integration concepts', 'CSV and manual inventory updates', 'Feed monitoring with alerts for delays and failures'],
  },
  {
    t: 'Returns & Resolution', who: 'Customers & suppliers',
    s: 'Return requests, damaged items, replacements and refunds tracked from request to resolution.',
    p: ['Clear return rules by product and category', 'Approvals, labels, received items and outcomes recorded', 'Supplier response and resolution times tracked'],
  },
]

export function ServiceIndex() {
  const [open, setOpen] = useState(0)
  const s = SERVICES[open]
  return (
    <div className="mt-20 grid gap-12 lg:grid-cols-12">
      <ol className="lg:col-span-6">
        {SERVICES.map((x, i) => (
          <li key={x.t} className="border-t border-obsidian/12 last:border-b">
            <button
              onClick={() => setOpen(i)}
              onMouseEnter={() => window.matchMedia('(hover: hover)').matches && setOpen(i)}
              aria-expanded={open === i}
              aria-controls={`svc-${i}`}
              className="group grid w-full grid-cols-[3rem_1fr_auto] items-center gap-4 py-6 text-left md:grid-cols-[4rem_1fr_auto]"
            >
              <span className={cn('meta tabular-nums transition-colors', open === i ? 'text-gold-deep' : 'text-slate')}>{String(i + 1).padStart(2, '0')}</span>
              <span className={cn('font-display text-[1.75rem] font-light leading-tight transition-all duration-700 ease-[var(--ease-luxe)] md:text-[2.2rem]', open === i ? 'translate-x-2 text-obsidian' : 'text-obsidian/45 group-hover:text-obsidian/80')}>
                {x.t}
              </span>
              <Plus className={cn('size-4 transition-transform duration-500', open === i ? 'rotate-45 text-gold-deep' : 'text-slate')} strokeWidth={1.3} aria-hidden />
            </button>
            {/* Mobile: inline detail */}
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div id={`svc-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.6, ease: EASE }} className="overflow-hidden lg:hidden">
                  <Detail s={x} />
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ol>
      <div className="hidden lg:col-span-5 lg:col-start-8 lg:block">
        <div className="sticky top-32 border-l border-obsidian/12 pl-12">
          <AnimatePresence mode="wait">
            <motion.div key={s.t} initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.6, ease: EASE }}>
              <p className="font-display text-[8rem] font-light leading-none text-obsidian/[0.07]">{String(open + 1).padStart(2, '0')}</p>
              <Detail s={s} large />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Detail({ s, large }: { s: (typeof SERVICES)[number]; large?: boolean }) {
  return (
    <div className={large ? '-mt-8' : 'pb-8 pl-[3rem] md:pl-[4rem]'}>
      <p className="eyebrow text-gold-deep">For {s.who.toLowerCase()}</p>
      <p className={cn('mt-4 leading-relaxed text-obsidian/80', large ? 'text-xl' : 'text-base')}>{s.s}</p>
      <ul className="mt-6 space-y-3">
        {s.p.map((p) => (
          <li key={p} className="flex gap-4 text-sm text-slate">
            <span className="mt-2.5 h-px w-5 shrink-0 bg-gold" aria-hidden />
            {p}
          </li>
        ))}
      </ul>
    </div>
  )
}
