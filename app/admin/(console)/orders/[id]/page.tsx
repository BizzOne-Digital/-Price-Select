import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, PackageCheck } from 'lucide-react'
import { PageHeader, Panel, StatusBadge } from '@/components/dashboard/kit'
import { adminMeta, when } from '@/components/admin/data'
import { OrderActions, RefundForm } from '@/components/admin/order-actions'
import { KV } from '@/components/admin/ui'
import { money } from '@/lib/format'
import { HttpError } from '@/lib/server/http'
import { requirePage } from '@/lib/server/page-auth'
import { capabilities } from '@/lib/server/services/capabilities'
import { listCases } from '@/lib/server/services/cases'
import { getOrderAdmin } from '@/lib/server/services/operations'
import { getSupplierAdmin } from '@/lib/server/services/suppliers'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return adminMeta(`Order ${id}`, `Order ${id}: customer, payment and supplier routing.`, `/admin/orders/${id}`)
}

async function load<T>(p: Promise<T>) {
  try {
    return await p
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound()
    throw e
  }
}

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requirePage(['admin', 'support'], '/admin/login')
  const admin = actor.role === 'admin'
  const { order, history, paymentOperations } = await load(getOrderAdmin(actor, decodeURIComponent(id)))
  const [allCases, caps, contacts] = await Promise.all([
    listCases(actor),
    capabilities(),
    // Supplier contact details are on the supplier record (administrators only).
    admin ? Promise.all([...new Set(order.fulfillments.map((f) => f.supplierId))].map((code) => getSupplierAdmin(actor, code).then((s) => [code, s.contactEmail] as const).catch(() => [code, ''] as const))) : Promise.resolve([] as (readonly [string, string])[]),
  ])
  const contact = new Map(contacts)
  const cases = allCases.filter((c) => c.orderId === order.id)

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex min-h-11 items-center gap-2 meta text-[0.62rem] text-slate hover:text-obsidian">
        <ArrowLeft className="size-3.5" /> All orders
      </Link>
      <PageHeader
        eyebrow={`Placed ${when(order.placedAt)}`}
        title={`Order ${order.id}`}
        description={`${order.fulfillments.length} supplier ${order.fulfillments.length === 1 ? 'fulfillment' : 'fulfillments'} · ${money(order.total)}`}
        actions={<OrderActions order={order} />}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <h2 className="font-display text-3xl font-light">Supplier routing</h2>
          {order.fulfillments.map((f, i) => (
            <Panel
              key={f.id}
              title={`${String(i + 1).padStart(2, '0')} — ${f.supplierName ?? f.supplierId}`}
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
                      <li key={l.lineId} className="flex justify-between gap-4 border-b border-obsidian/[0.07] py-2.5 text-sm">
                        <span>
                          {l.name} <span className="text-slate">× {l.qty}</span>
                          {!!l.returnedQty && <span className="block text-xs text-slate">{l.returnedQty} in return cases</span>}
                        </span>
                        <span className="tabular-nums">{money(l.qty * l.unitPrice)}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="mt-4">
                    <KV k="Carrier">{f.carrier ?? <span className="text-slate">Not yet assigned</span>}</KV>
                    <KV k="Tracking">{f.tracking ? <span className="font-mono text-xs">{f.tracking}</span> : <span className="text-[#9a6a24]">Awaiting upload</span>}</KV>
                    <KV k="Acknowledged">{when(f.acknowledgedAt)}</KV>
                    <KV k="Shipping cost">{money(f.shippingCost)}</KV>
                    <KV k="Est. delivery">{when(f.estimatedDelivery)}</KV>
                    <KV k="Packaging">{f.blindShip ? 'Neutral, Price-Select documents' : 'Supplier packaging'}</KV>
                  </dl>
                  {contact.get(f.supplierId) && (
                    <a href={`mailto:${contact.get(f.supplierId)}?subject=${encodeURIComponent(`Order ${order.id} · ${f.id}`)}`} className="mt-3 inline-flex min-h-11 items-center meta text-[0.6rem] text-gold-deep hover:text-obsidian">
                      Email supplier contact
                    </a>
                  )}
                </div>
                <div>
                  <p className="meta text-[0.6rem] text-slate">History</p>
                  <ol className="mt-3 border-l border-obsidian/10">
                    {[...f.history].reverse().map((h, hi) => (
                      <li key={h.at + h.status + hi} className="relative pb-5 pl-5 last:pb-0">
                        <span aria-hidden className={`absolute -left-[3px] top-1.5 size-[5px] rounded-full ${hi === 0 ? 'bg-gold' : 'bg-obsidian/25'}`} />
                        <p className="text-sm font-medium capitalize">{h.status.replace('_', ' ')}</p>
                        <p className="mt-0.5 text-xs text-slate">{h.note}</p>
                        <p className="mt-1 meta text-[0.58rem] text-slate/70">{when(h.at)}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </Panel>
          ))}

          <Panel title="Order history">
            {history.length ? (
              <ol className="border-l border-obsidian/10">
                {[...history].reverse().map((h, i) => (
                  <li key={h.at + i} className="relative pb-5 pl-5 last:pb-0">
                    <span aria-hidden className={`absolute -left-[3px] top-1.5 size-[5px] rounded-full ${i === 0 ? 'bg-gold' : 'bg-obsidian/25'}`} />
                    <p className="text-sm font-medium capitalize">{h.status.replace('_', ' ') || 'Update'}</p>
                    {h.note && <p className="mt-0.5 text-xs text-slate">{h.note}</p>}
                    <p className="mt-1 meta text-[0.58rem] text-slate/70">{when(h.at)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate">No history recorded.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6 xl:pt-[3.25rem]">
          <Panel title="Customer">
            <p className="font-display text-2xl">{order.customerName ?? 'Guest checkout'}</p>
            <dl className="mt-3">
              <KV k="Email">{order.email ?? '—'}</KV>
              <KV k="Ship to">{[order.shipTo.name, order.shipTo.line1, order.shipTo.line2, `${order.shipTo.city}, ${order.shipTo.region} ${order.shipTo.postal ?? ''}`.trim(), order.shipTo.country].filter(Boolean).join(' · ')}</KV>
              {order.shipTo.phone && <KV k="Phone">{order.shipTo.phone}</KV>}
            </dl>
          </Panel>
          <Panel title="Payment">
            <dl>
              <KV k="Status">
                <StatusBadge status={order.payment} />
              </KV>
              <KV k="Subtotal">{money(order.subtotal)}</KV>
              <KV k="Shipping">{money(order.shipping)}</KV>
              <KV k="Tax">{money(order.tax)}</KV>
              <KV k="Discount">{money(order.discount)}</KV>
              <KV k="Total">
                <span className="font-semibold">{money(order.total)}</span>
              </KV>
              <KV k="Refunded">{money(order.refunded ?? 0)}</KV>
            </dl>
            {!caps.payments && <p className="mt-4 text-xs text-slate">Payment provider not connected.</p>}
            {admin ? <RefundForm order={order} paymentsConnected={caps.payments} /> : <p className="mt-4 text-xs text-slate">Refunds are issued by administrators.</p>}
          </Panel>
          <Panel title="Payment operations">
            {paymentOperations.length ? (
              <ul>
                {paymentOperations.map((p) => (
                  <li key={p.id} className="border-b border-obsidian/[0.07] py-3 text-sm last:border-0">
                    <p className="flex items-center justify-between gap-3">
                      <span className="capitalize">
                        {p.kind} · {money(p.amount)}
                      </span>
                      <StatusBadge status={p.status === 'succeeded' ? 'captured' : p.status} label={p.status} />
                    </p>
                    <p className="mt-1 text-xs text-slate">
                      {[p.by, when(p.at), p.reason].filter(Boolean).join(' · ')}
                    </p>
                    {p.error && <p className="mt-1 text-xs text-danger">{p.error}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate">No captures, voids or refunds recorded.</p>
            )}
          </Panel>
          <Panel title="Linked cases">
            {cases.length ? (
              <ul className="space-y-3">
                {cases.map((c) => (
                  <li key={c.id}>
                    <Link href={c.kind === 'return' ? '/admin/returns' : '/admin/support'} className="flex min-h-11 items-center justify-between gap-3 text-sm hover:text-gold-deep">
                      <span>
                        {c.id} · {c.subject}
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
