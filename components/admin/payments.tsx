'use client'

import Link from 'next/link'
import { DataTable, MetricCard, MetricGrid, Panel, StatusBadge, type Column } from '@/components/dashboard/kit'
import { money } from '@/lib/format'
import type { Order, ReturnCase } from '@/lib/types'
import { plural, when } from './data'
import { SubHead } from './ui'

const cents = (d: number | undefined) => Math.round((d ?? 0) * 100)
const PAID = ['captured', 'partially_refunded', 'refunded']

export function PaymentsBoard({ orders, total, disputes, commissionPercent, paymentsConnected }: { orders: Order[]; total: number; disputes: ReturnCase[]; commissionPercent: number | null; paymentsConnected: boolean }) {
  const by = (p: Order['payment'][]) => orders.filter((o) => p.includes(o.payment))
  const sum = (os: Order[]) => os.reduce((s, o) => s + cents(o.total), 0) / 100
  const refunds = orders.filter((o) => (o.refunded ?? 0) > 0)
  const refundedTotal = refunds.reduce((s, o) => s + cents(o.refunded), 0) / 100
  const failed = by(['failed'])

  // Supplier payouts from paid, non-canceled fulfillments. All math in integer cents.
  const payouts = new Map<string, { name: string; gross: number; shipping: number; orders: Set<string> }>()
  for (const o of orders) {
    if (!PAID.includes(o.payment)) continue
    for (const f of o.fulfillments) {
      if (f.status === 'canceled') continue
      const p = payouts.get(f.supplierId) ?? { name: f.supplierName ?? f.supplierId, gross: 0, shipping: 0, orders: new Set<string>() }
      p.gross += f.lines.reduce((s, l) => s + cents(l.unitPrice) * l.qty, 0)
      p.shipping += cents(f.shippingCost)
      p.orders.add(o.id)
      payouts.set(f.supplierId, p)
    }
  }

  const txColumns: Column<Order>[] = [
    { key: 'id', header: 'Order', sort: (o) => o.id, cell: (o) => <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-gold-deep">{o.id}</Link> },
    { key: 'date', header: 'Date', sort: (o) => o.placedAt, cell: (o) => <span className="text-slate">{when(o.placedAt)}</span> },
    { key: 'cust', header: 'Customer', cell: (o) => o.customerName ?? <span className="text-slate">Guest</span> },
    { key: 'status', header: 'Payment status', sort: (o) => o.payment, cell: (o) => <StatusBadge status={o.payment} /> },
    { key: 'ref', header: 'Refunded', align: 'right', sort: (o) => o.refunded ?? 0, cell: (o) => ((o.refunded ?? 0) > 0 ? money(o.refunded!) : <span className="text-slate">—</span>) },
    { key: 'amt', header: 'Amount', align: 'right', sort: (o) => o.total, cell: (o) => money(o.total) },
  ]

  return (
    <div className="space-y-10">
      <p className="flex items-center gap-3 text-sm">
        Payment provider: {paymentsConnected ? <StatusBadge status="active" label="Connected" /> : <StatusBadge status="not_connected" tone="bad" label="Not connected" />}
        {!paymentsConnected && <span className="text-xs text-slate">Captures, voids and refunds are unavailable until a provider is configured.</span>}
      </p>

      <MetricGrid cols={5}>
        <MetricCard label="Captured" value={sum(by(['captured', 'partially_refunded']))} prefix="$" decimals={2} hint={plural(by(['captured', 'partially_refunded']).length, 'order')} />
        <MetricCard label="Authorized" value={sum(by(['authorized']))} prefix="$" decimals={2} hint={`${by(['authorized']).length} awaiting capture`} />
        <MetricCard label="Pending" value={sum(by(['pending']))} prefix="$" decimals={2} hint={plural(by(['pending']).length, 'order')} tone={by(['pending']).length ? 'warning' : 'default'} />
        <MetricCard label="Refunded" value={refundedTotal} prefix="$" decimals={2} hint={plural(refunds.length, 'order')} />
        <MetricCard label="Failed payments" value={failed.length} hint="Count" tone={failed.length ? 'danger' : 'default'} />
      </MetricGrid>
      {total > orders.length && <p className="-mt-6 text-xs text-slate">Figures cover the latest {orders.length} of {total} orders. Export the sales report for the full ledger.</p>}

      <div>
        <SubHead note={`${orders.length} most recent`}>Transactions</SubHead>
        <Panel pad={false}>
          <DataTable rows={orders} columns={txColumns} rowKey={(o) => o.id} caption="Transactions" empty="No orders yet." />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Refunds">
          {refunds.length ? (
            <ul>
              {refunds.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 border-b border-obsidian/[0.07] py-3 text-sm last:border-0">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-gold-deep">
                    {o.id} · <span className="text-slate">{o.payment.replace('_', ' ')}</span>
                  </Link>
                  <span className="tabular-nums">{money(o.refunded ?? 0)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate">No refunds.</p>
          )}
        </Panel>
        <Panel title="Failed payments">
          {failed.length ? (
            <ul>
              {failed.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 border-b border-obsidian/[0.07] py-3 text-sm last:border-0">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-gold-deep">
                    {o.id}
                  </Link>
                  <span className="text-xs text-slate">{when(o.placedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate">No failed payments.</p>
          )}
        </Panel>
        <Panel title="Disputes">
          {disputes.length ? (
            <ul>
              {disputes.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 border-b border-obsidian/[0.07] py-3 text-sm last:border-0">
                  <Link href={d.kind === 'return' ? '/admin/returns' : '/admin/support'} className="min-w-0 hover:text-gold-deep">
                    {d.id} · <span className="text-slate">{d.subject}</span>
                  </Link>
                  <StatusBadge status="escalated" label="Open" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate">No escalated cases.</p>
          )}
          <p className="mt-3 text-xs text-slate">Escalated customer disputes from returns and support. Card-network chargebacks are not reported by the payment integration.</p>
        </Panel>
      </div>

      <div>
        <SubHead note={commissionPercent == null ? 'Commission model to be confirmed' : `Commission ${commissionPercent}% · from Settings`}>Supplier payouts</SubHead>
        <Panel pad={false}>
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Supplier payouts</caption>
              <thead>
                <tr className="border-b border-obsidian/10">
                  {['Supplier', 'Orders', 'Gross merchandise', 'Shipping', 'Commission', 'Net payout'].map((h, i) => (
                    <th key={h} scope="col" className={`px-4 py-3 meta text-[0.62rem] font-semibold text-slate ${i ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.size === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate">
                      No paid fulfillments yet.
                    </td>
                  </tr>
                )}
                {[...payouts].map(([id, p]) => {
                  const commission = commissionPercent == null ? null : Math.round((p.gross * commissionPercent) / 100)
                  return (
                    <tr key={id} className="border-b border-obsidian/[0.06]">
                      <td className="px-4 py-3.5">{p.name}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{p.orders.size}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{money(p.gross / 100)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{money(p.shipping / 100)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{commission == null ? <span className="text-xs text-slate">To be confirmed</span> : money(commission / 100)}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums">{commission == null ? <span className="text-xs text-slate">Pending model</span> : money((p.gross + p.shipping - commission) / 100)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <p className="mt-3 text-xs text-slate">Gross is merchandise at charged unit prices before membership discounts and refunds. Payout figures are an internal estimate; actual settlement depends on the payment provider.</p>
      </div>
    </div>
  )
}
