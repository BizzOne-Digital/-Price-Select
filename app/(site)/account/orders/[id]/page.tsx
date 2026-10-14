import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { date, money, titleCase } from '@/lib/format'
import { HttpError } from '@/lib/server/http'
import { requirePage } from '@/lib/server/page-auth'
import { myOrder } from '@/lib/server/services/commerce'
import { OrderTimeline, Status } from '@/components/commerce/account-ui'
import { Reveal } from '@/components/motion/primitives'
import { SafeImage } from '@/components/ui/safe-image'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return { title: `Order ${id}`, alternates: { canonical: `/account/orders/${id}` }, robots: { index: false } }
}

const action = 'meta inline-flex h-11 items-center border border-obsidian/20 px-4 text-obsidian transition-colors hover:border-gold-deep hover:text-gold-deep'

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requirePage(['customer'], '/sign-in/customers')
  // Customers only ever see their own orders (the service scopes by owner).
  const o = await myOrder(actor, decodeURIComponent(id).toUpperCase()).catch((e) => {
    if (e instanceof HttpError && e.status === 404) return null
    throw e
  })
  if (!o) notFound()

  return (
    <div>
      <Link href="/account/orders" className="link-line eyebrow text-slate hover:text-obsidian">
        <ArrowLeft className="size-3.5" strokeWidth={1.4} aria-hidden />
        All orders
      </Link>

      <header className="mt-10 grid gap-8 border-b border-obsidian/15 pb-10 md:grid-cols-12 md:items-end">
        <div className="md:col-span-7">
          <p className="meta text-slate">Placed {date(o.placedAt)}</p>
          <h2 className="mt-3 font-display text-[clamp(2.8rem,6vw,5.5rem)] font-light leading-none tracking-[-0.03em] text-obsidian">{o.id}</h2>
          <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Status value={o.status} />
            <span className="text-sm text-slate">
              {o.fulfillments.length} shipment{o.fulfillments.length === 1 ? '' : 's'} · Payment {titleCase(o.payment).toLowerCase()}
            </span>
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-6 text-sm md:col-span-5">
          <div>
            <dt className="meta text-slate">Ship to</dt>
            <dd className="mt-2 text-obsidian">
              {o.shipTo.name}
              <br />
              {o.shipTo.city}, {o.shipTo.region}
            </dd>
          </div>
          <div>
            <dt className="meta text-slate">Order total</dt>
            <dd className="mt-2 font-display text-3xl font-light tabular-nums text-obsidian">{money(o.total)}</dd>
          </div>
        </dl>
      </header>

      {o.fulfillments.length > 1 && <p className="mt-8 border-l border-gold pl-4 text-sm text-slate">Products may ship separately when fulfilled by different suppliers. Each shipment below has its own tracking.</p>}

      <div className="mt-12 space-y-20">
        {o.fulfillments.map((f, i) => {
          const canCancel = ['pending', 'confirmed'].includes(f.status)
          const canReturn = f.status === 'delivered'
          const first = f.lines[0]?.lineId ?? ''
          return (
            <Reveal as="section" key={f.id} className="grid gap-10 lg:grid-cols-12" blur={false}>
              <div className="lg:col-span-7">
                <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-obsidian/15 pb-4">
                  <h3 className="eyebrow text-obsidian">
                    Shipment {i + 1} of {o.fulfillments.length} <span className="ml-2 text-slate">{f.id}</span>
                  </h3>
                  <Status value={f.status} />
                </div>
                <dl className="grid grid-cols-2 gap-6 border-b border-obsidian/10 py-6 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="meta text-slate">Carrier</dt>
                    <dd className="mt-2 text-obsidian">{f.carrier ?? 'Assigned at dispatch'}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="meta text-slate">Tracking</dt>
                    <dd className="mt-2 break-all tabular-nums text-obsidian">{f.tracking ?? 'Pending'}</dd>
                  </div>
                  <div>
                    <dt className="meta text-slate">{f.status === 'delivered' ? 'Estimated was' : 'Estimated delivery'}</dt>
                    <dd className="mt-2 text-obsidian">{f.estimatedDelivery ? date(f.estimatedDelivery) : 'To be confirmed'}</dd>
                  </div>
                  <div>
                    <dt className="meta text-slate">Shipping</dt>
                    <dd className="mt-2 tabular-nums text-obsidian">{money(f.shippingCost)}</dd>
                  </div>
                </dl>
                <ul>
                  {f.lines.map((l) => {
                    return (
                      <li key={l.lineId} className="flex items-center gap-5 border-b border-obsidian/8 py-5">
                        <span className="relative h-20 w-16 shrink-0 overflow-hidden bg-pearl">
                          <SafeImage src={l.image ?? ''} alt="" fill sizes="64px" className="object-cover" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link href={`/products/${l.productSlug}`} className="text-sm text-obsidian hover:text-gold-deep">
                            {l.name}
                          </Link>
                          <p className="mt-1 text-xs text-slate">
                            {l.qty} × {money(l.unitPrice)}
                            {!!l.returnedQty && ` · ${l.returnedQty} in a return request`}
                          </p>
                        </div>
                        <p className="text-sm tabular-nums text-obsidian">{money(l.qty * l.unitPrice)}</p>
                      </li>
                    )
                  })}
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/account/returns?type=support&order=${o.id}&line=${first}`} className={action}>
                    Request help
                  </Link>
                  {canCancel && (
                    <Link href={`/account/returns?type=cancellation&order=${o.id}&line=${first}`} className={action}>
                      Request cancellation
                    </Link>
                  )}
                  {canReturn && (
                    <Link href={`/account/returns?type=return&order=${o.id}&line=${first}`} className={action}>
                      Request a return
                    </Link>
                  )}
                </div>
              </div>
              <div className="lg:col-span-4 lg:col-start-9">
                <p className="meta mb-6 text-slate">Progress</p>
                <OrderTimeline history={f.history} status={f.status} />
              </div>
            </Reveal>
          )
        })}
      </div>

      <section aria-labelledby="totals" className="mt-24 grid gap-10 border-t border-obsidian/15 pt-10 lg:grid-cols-12">
        <h3 id="totals" className="font-display text-3xl font-light text-obsidian lg:col-span-4">
          Summary
        </h3>
        <dl className="space-y-3 text-sm lg:col-span-5 lg:col-start-8">
          {(
            [
              ['Product subtotal', money(o.subtotal)],
              ['Shipping', money(o.shipping)],
              ['Applicable taxes', money(o.tax)],
              ['Discounts', o.discount ? `−${money(o.discount)}` : money(0)],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6">
              <dt className="text-slate">{k}</dt>
              <dd className="text-right tabular-nums text-obsidian">{v}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-6 border-t border-obsidian/15 pt-4">
            <dt className="eyebrow text-obsidian">Total</dt>
            <dd className="font-display text-3xl font-light tabular-nums text-obsidian">{money(o.total)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
