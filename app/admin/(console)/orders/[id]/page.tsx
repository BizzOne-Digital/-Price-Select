import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, PackageCheck } from 'lucide-react'
import { DemoBanner, PageHeader, Panel, StatusBadge } from '@/components/dashboard/kit'
import { adminMeta, supplierName } from '@/components/admin/data'
import { ContactSupplier, OrderActions } from '@/components/admin/order-actions'
import { KV } from '@/components/admin/ui'
import { customers, getOrder, orders, returnCases, tickets } from '@/lib/data/operations'
import { date, money } from '@/lib/format'

export const generateStaticParams = () => orders.map((o) => ({ id: o.id }))

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return adminMeta(`Order ${id}`, `Order ${id}: customer, payment and supplier routing.`, `/admin/orders/${id}`)
}

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const order = getOrder(id)
  if (!order) notFound()
  const customer = customers.find((c) => c.id === order.customerId)
  const cases = [
    ...returnCases.filter((r) => r.orderId === id).map((r) => ({ id: r.id, label: r.reason, status: r.status as string, href: '/admin/returns' })),
    ...tickets.filter((t) => t.orderId === id).map((t) => ({ id: t.id, label: t.subject, status: t.status as string, href: '/admin/support' })),
  ]

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex min-h-11 items-center gap-2 meta text-[0.62rem] text-slate hover:text-obsidian">
        <ArrowLeft className="size-3.5" /> All orders
      </Link>
      <PageHeader
        eyebrow={`Placed ${date(order.placedAt)}`}
        title={`Order ${order.id}`}
        description={`${order.fulfillments.length} supplier ${order.fulfillments.length > 1 ? 'fulfillments' : 'fulfillment'} · ${money(order.total)}`}
        actions={<OrderActions order={order} />}
      />
      <DemoBanner>Demonstration order. Actions update this screen only — no supplier, customer or payment provider is contacted.</DemoBanner>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <h2 className="font-display text-3xl font-light">Supplier routing</h2>
          {order.fulfillments.map((f, i) => (
            <Panel
              key={f.id}
              title={`${String(i + 1).padStart(2, '0')} — ${supplierName(f.supplierId)}`}
              action={
                <span className="flex flex-wrap items-center justify-end gap-2">
                  {f.blindShip && <StatusBadge status="blind" tone="gold" label="Blind ship" />}
                  <StatusBadge status={f.status} />
                </span>
              }
            >
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <p className="meta text-[0.6rem] text-slate">Items · {f.id}</p>
                  <ul className="mt-3">
                    {f.lines.map((l) => (
                      <li key={l.productSlug} className="flex justify-between gap-4 border-b border-obsidian/[0.07] py-2.5 text-sm">
                        <span>
                          {l.name} <span className="text-slate">× {l.qty}</span>
                        </span>
                        <span className="tabular-nums">{money(l.qty * l.unitPrice)}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-4">
                    <KV k="Carrier">{f.carrier ?? <span className="text-slate">Not yet assigned</span>}</KV>
                    <KV k="Tracking">{f.tracking ? <span className="font-mono text-xs">{f.tracking}</span> : <span className="text-[#9a6a24]">Awaiting upload</span>}</KV>
                    <KV k="Shipping cost">{money(f.shippingCost)}</KV>
                    <KV k="Est. delivery">{date(f.estimatedDelivery)}</KV>
                    <KV k="Packaging">{f.blindShip ? 'Neutral, Price-Select documents' : 'Supplier packaging'}</KV>
                  </dl>
                  <div className="mt-3">
                    <ContactSupplier supplier={supplierName(f.supplierId)} fulfillmentId={f.id} />
                  </div>
                </div>
                <div>
                  <p className="meta text-[0.6rem] text-slate">History</p>
                  <ol className="mt-3 border-l border-obsidian/10">
                    {[...f.history].reverse().map((h, hi) => (
                      <li key={h.at + h.status} className="relative pb-5 pl-5 last:pb-0">
                        <span aria-hidden className={`absolute -left-[3px] top-1.5 size-[5px] rounded-full ${hi === 0 ? 'bg-gold' : 'bg-obsidian/25'}`} />
                        <p className="text-sm font-medium capitalize">{h.status}</p>
                        <p className="mt-0.5 text-xs text-slate">{h.note}</p>
                        <p className="mt-1 meta text-[0.58rem] text-slate/70">{date(h.at)}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </Panel>
          ))}
        </div>

        <div className="space-y-6 xl:pt-[3.25rem]">
          <Panel title="Customer">
            <p className="font-display text-2xl">{customer?.name ?? 'Unknown'}</p>
            <dl className="mt-3">
              <KV k="Email">{customer?.email}</KV>
              <KV k="Account">{customer && <StatusBadge status={customer.status} />}</KV>
              <KV k="Ship to">{`${order.shipTo.city}, ${order.shipTo.region}`}</KV>
              <KV k="Orders">{customer?.orders}</KV>
            </dl>
          </Panel>
          <Panel title="Payment">
            <dl>
              <KV k="Status">
                <StatusBadge status={order.payment} />
              </KV>
              <KV k="Subtotal">{money(order.subtotal)}</KV>
              <KV k="Shipping">{money(order.shipping)}</KV>
              <KV k="Tax">
                <span className="text-xs text-slate">Tax provider not connected</span>
              </KV>
              <KV k="Discount">{money(order.discount)}</KV>
              <KV k="Total">
                <span className="font-semibold">{money(order.total)}</span>
              </KV>
            </dl>
            <p className="mt-4 text-xs text-slate">No payment provider connected. Status shown is from demonstration data.</p>
          </Panel>
          <Panel title="Linked cases">
            {cases.length ? (
              <ul className="space-y-3">
                {cases.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} className="flex min-h-11 items-center justify-between gap-3 text-sm hover:text-gold-deep">
                      <span>
                        {c.id} · {c.label}
                      </span>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 text-sm text-slate">
                <PackageCheck className="size-4" strokeWidth={1.4} /> No returns or support cases.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
