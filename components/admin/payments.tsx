'use client'

import Link from 'next/link'
import { DataTable, MetricCard, MetricGrid, Panel, StatusBadge, type Column } from '@/components/dashboard/kit'
import { orders, returnCases, tickets } from '@/lib/data/operations'
import { date, money } from '@/lib/format'
import type { Order } from '@/lib/types'
import { customerName, lineTotals, supplierName } from './data'
import { SubHead } from './ui'

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
const sum = (os: Order[]) => os.reduce((s, o) => s + o.total, 0)
const by = (p: Order['payment'][]) => orders.filter((o) => p.includes(o.payment))

export function PaymentsBoard() {
  const { bySupplier } = lineTotals()
  const refunds = by(['refunded', 'partially_refunded'])
  const failed = by(['failed'])
  const txColumns: Column<Order>[] = [
    { key: 'id', header: 'Order', sort: (o) => o.id, cell: (o) => <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-gold-deep">{o.id}</Link> },
    { key: 'date', header: 'Date', sort: (o) => o.placedAt, cell: (o) => <span className="text-slate">{date(o.placedAt)}</span> },
    { key: 'cust', header: 'Customer', cell: (o) => customerName(o.customerId) },
    { key: 'method', header: 'Method', cell: () => <span className="text-slate">Via provider</span> },
    { key: 'status', header: 'Payment status', sort: (o) => o.payment, cell: (o) => <StatusBadge status={o.payment} /> },
    { key: 'amt', header: 'Amount', align: 'right', sort: (o) => o.total, cell: (o) => money(o.total) },
  ]
  const payouts = [...bySupplier.entries()].map(([id, v]) => ({ id, ...v }))

  return (
    <div className="space-y-10">
      <MetricGrid cols={5}>
        <MetricCard label="Captured" value={sum(by(['captured']))} prefix="$" hint={plural(by(['captured']).length, 'order')} />
        <MetricCard label="Authorized" value={sum(by(['authorized']))} prefix="$" hint={`${by(['authorized']).length} awaiting capture`} />
        <MetricCard label="Pending" value={sum(by(['pending']))} prefix="$" hint={plural(by(['pending']).length, 'order')} tone="warning" />
        <MetricCard label="Refunded" value={sum(refunds)} prefix="$" hint={plural(refunds.length, 'order')} />
        <MetricCard label="Failed payments" value={failed.length} hint="Count" tone={failed.length ? 'danger' : 'default'} />
      </MetricGrid>

      <div>
        <SubHead note="Derived from demonstration orders">Transactions</SubHead>
        <Panel pad={false}>
          <DataTable rows={orders} columns={txColumns} rowKey={(o) => o.id} caption="Transactions" />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Refunds">
          {refunds.length ? (
            <ul>
              {refunds.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 border-b border-obsidian/[0.07] py-3 text-sm last:border-0">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-gold-deep">
                    {o.id} · <span className="text-slate">{o.status}</span>
                  </Link>
                  <span className="tabular-nums">{money(o.total)}</span>
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
                <li key={o.id} className="text-sm">{o.id}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate">No failed payments in demonstration data. Provider decline reasons and retries will appear here once a payment provider is connected.</p>
          )}
        </Panel>
        <Panel title="Disputes">
          <ul>
            {[...returnCases.filter((c) => c.status === 'escalated').map((c) => ({ id: c.id, order: c.orderId, what: c.reason, href: '/admin/returns' })), ...tickets.filter((t) => t.status === 'escalated').map((t) => ({ id: t.id, order: t.orderId, what: t.subject, href: '/admin/support' }))].map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 border-b border-obsidian/[0.07] py-3 text-sm last:border-0">
                <Link href={d.href} className="min-w-0 hover:text-gold-deep">
                  {d.id} · <span className="text-slate">{d.what}</span>
                </Link>
                <StatusBadge status="escalated" label="Open" />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate">Escalated customer disputes from returns and support. Payment chargebacks will appear here once a payment provider is connected.</p>
        </Panel>
      </div>

      <div>
        <SubHead note="Commission model to be confirmed">Supplier payouts</SubHead>
        <Panel pad={false}>
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Supplier payout concept</caption>
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
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-obsidian/[0.06]">
                    <td className="px-4 py-3.5">{supplierName(p.id)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{p.orders.size}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{money(p.gross)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums">{money(p.shipping)}</td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate">To be confirmed</td>
                    <td className="px-4 py-3.5 text-right text-xs text-slate">Pending model</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <p className="mt-3 text-xs text-slate">Commission or margin rates have not been agreed. Payouts will be calculated by the payment provider&apos;s marketplace settlement once connected.</p>
      </div>
    </div>
  )
}
