import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { DEMO_CUSTOMER_ID, notifications, ordersFor, returnCases } from '@/lib/data/operations'
import { getProduct } from '@/lib/data/products'
import { date, money, pad, titleCase } from '@/lib/format'
import { cn } from '@/lib/utils'
import { OrderRow, SectionTitle } from '@/components/commerce/account-blocks'
import { Status } from '@/components/commerce/account-ui'
import { SAVED_DEMO } from '@/components/commerce/account-data'
import { Reveal } from '@/components/motion/primitives'
import { TextLink } from '@/components/site/ui'

export const metadata: Metadata = {
  title: 'Your account',
  description: 'Orders, shipments, returns, saved products and notifications.',
  alternates: { canonical: '/account' },
  robots: { index: false },
}

export default function AccountOverview() {
  const orders = [...ordersFor(DEMO_CUSTOMER_ID)].sort((a, b) => b.placedAt.localeCompare(a.placedAt))
  const cases = returnCases.filter((c) => c.customerId === DEMO_CUSTOMER_ID)
  const open = cases.filter((c) => !['resolved', 'declined'].includes(c.status))
  const inTransit = orders.flatMap((o) => o.fulfillments).filter((f) => f.status === 'shipped').length
  const saved = SAVED_DEMO.map(getProduct).filter((p) => !!p)
  const unread = notifications.filter((n) => !n.read).length

  const stats = [
    ['Orders', orders.length, '/account/orders'],
    ['Shipments in transit', inTransit, '/account/track'],
    ['Open requests', open.length, '/account/returns'],
    ['Saved products', saved.length, '/account/saved'],
  ] as const

  return (
    <div className="space-y-24">
      <ul className="grid grid-cols-2 border-y border-obsidian/10 md:grid-cols-4">
        {stats.map(([l, v, href], i) => (
          <Reveal as="li" key={l} delay={i * 0.06} className={cn('border-obsidian/10 py-8', i % 2 ? 'border-l pl-6' : 'pr-6', i > 1 && 'border-t md:border-t-0', i === 2 && 'md:border-l md:pl-8', i > 0 && 'md:px-8')}>
            <Link href={href} className="group block">
              <span className="meta block text-slate transition-colors group-hover:text-gold-deep">{l}</span>
              <span className="mt-4 block font-display text-6xl font-light tabular-nums leading-none text-obsidian">{pad(v)}</span>
            </Link>
          </Reveal>
        ))}
      </ul>

      <div className="grid gap-16 lg:grid-cols-12">
        <section className="lg:col-span-7" aria-label="Recent orders">
          <SectionTitle title="Recent orders" action={<TextLink href="/account/orders">All orders</TextLink>} />
          <ul>
            {orders.slice(0, 3).map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
        </section>

        <section className="lg:col-span-4 lg:col-start-9" aria-label="Notifications">
          <SectionTitle title="Notifications" action={<span className="meta text-gold-deep">{unread} new</span>} />
          <ul>
            {notifications.slice(0, 4).map((n) => (
              <li key={n.id} className="grid grid-cols-[0.75rem_1fr] gap-3 border-b border-obsidian/10 py-5">
                <span className={cn('mt-1.5 size-1.5 rounded-full', n.read ? 'bg-obsidian/15' : 'bg-gold')} aria-hidden />
                <div>
                  <p className="text-sm font-medium text-obsidian">
                    {n.title}
                    {!n.read && <span className="sr-only"> (unread)</span>}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate">{n.body}</p>
                  <p className="meta mt-2 text-slate/70">{date(n.at)}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate">Email delivery of notifications begins once the email provider is connected.</p>
        </section>
      </div>

      <section aria-label="Open requests">
        <SectionTitle title="Open requests" action={<TextLink href="/account/returns">Returns &amp; support</TextLink>} />
        {open.length ? (
          <ul className="grid md:grid-cols-2">
            {open.map((c, i) => {
              const p = getProduct(c.productSlug)
              return (
                <li key={c.id} className={cn('flex items-center gap-5 border-b border-obsidian/10 py-6', i % 2 ? 'md:pl-8' : 'md:border-r md:pr-8')}>
                  <span className="relative h-16 w-13 shrink-0 overflow-hidden bg-pearl">{p && <Image src={p.images[0].src} alt="" fill sizes="52px" className="object-cover" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="meta text-slate">
                      {c.id} · {titleCase(c.type)}
                    </p>
                    <p className="mt-1 truncate text-sm text-obsidian">{p?.name}</p>
                    <p className="text-xs text-slate">{c.reason}</p>
                  </div>
                  <Status value={c.status} />
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="py-8 text-sm text-slate">No open requests.</p>
        )}
      </section>

      <section aria-label="Saved products">
        <SectionTitle title="Saved for later" action={<TextLink href="/account/saved">All saved</TextLink>} />
        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          {saved.map((p) => (
            <li key={p.slug}>
              <Link href={`/products/${p.slug}`} className="group block">
                <span className="relative block aspect-[4/5] overflow-hidden bg-pearl">
                  <Image src={p.images[0].src} alt={p.images[0].alt} fill sizes="(min-width: 768px) 25vw, 50vw" className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105" />
                </span>
                <span className="mt-3 block text-sm text-obsidian group-hover:text-gold-deep">{p.name}</span>
                <span className="text-xs tabular-nums text-slate">{money(p.seasonalPrice ?? p.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
