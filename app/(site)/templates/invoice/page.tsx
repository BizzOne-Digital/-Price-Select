import type { Metadata } from 'next'
import { PageBand } from '@/components/site/ui'
import { DocHeader, DocLabel, DocumentFrame } from '@/components/templates/document'
import { customers, getOrder } from '@/lib/data/operations'
import { date, money } from '@/lib/format'

export const metadata: Metadata = { title: 'Invoice template' }

export default function InvoiceTemplate() {
  const o = getOrder('PS-240118')!
  const customer = customers.find((c) => c.id === o.customerId)!
  const paid = o.payment === 'captured'

  return (
    <>
      <div data-print-hide>
        <PageBand eyebrow="Templates · Documents" title="Invoice." italic={['Invoice.']}>
          <p className="mt-8 max-w-xl text-sm leading-relaxed text-obsidian/60">Customer invoice shown with a sample order. Use Print / Save as PDF to see how it prints.</p>
        </PageBand>
      </div>
      <DocumentFrame>
        <DocHeader
          title="Invoice"
          meta={[
            ['Invoice no.', `INV-${o.id.replace('PS-', '')}`],
            ['Order no.', o.id],
            ['Issue date', date(o.placedAt)],
            ['Status', paid ? 'Paid' : 'Payment pending'],
          ]}
        />

        <div className="grid gap-8 py-8 sm:grid-cols-2">
          <div>
            <DocLabel>Bill to</DocLabel>
            <p className="mt-2 text-sm leading-relaxed">
              {customer.name}
              <br />
              {customer.email}
            </p>
          </div>
          <div>
            <DocLabel>Ship to</DocLabel>
            <p className="mt-2 text-sm leading-relaxed">
              {o.shipTo.name}
              <br />
              {o.shipTo.city}, {o.shipTo.region}
            </p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[#e6e1d6] text-left text-[0.65rem] uppercase tracking-[0.16em] text-[#5f6b78]">
              <th className="py-3 font-semibold">Item</th>
              <th className="py-3 text-right font-semibold">Qty</th>
              <th className="py-3 text-right font-semibold">Unit price</th>
              <th className="py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          {o.fulfillments.map((f, i) => (
            <tbody key={f.id}>
              <tr>
                <td colSpan={4} className="pb-1 pt-5 text-xs font-semibold text-[#14284a]">
                  Shipment {i + 1} · {f.id}
                </td>
              </tr>
              {f.lines.map((l) => (
                <tr key={l.productSlug} className="border-b border-[#e6e1d6]">
                  <td className="py-3 pr-4">{l.name}</td>
                  <td className="py-3 text-right tabular-nums">{l.qty}</td>
                  <td className="py-3 text-right tabular-nums">{money(l.unitPrice)}</td>
                  <td className="py-3 text-right tabular-nums">{money(l.qty * l.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>

        <div className="mt-8 flex justify-end">
          <dl className="w-full max-w-xs text-sm">
            {[
              ['Subtotal', money(o.subtotal)],
              ['Member discount', o.discount ? `−${money(o.discount)}` : money(0)],
              ['Shipping', money(o.shipping)],
              ['Taxes', money(o.tax)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1.5">
                <dt className="text-[#5f6b78]">{k}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t-2 border-[#14284a] pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(o.total)}</dd>
            </div>
            <div className="flex justify-between py-1.5 text-[#5f6b78]">
              <dt>Amount paid</dt>
              <dd className="tabular-nums">{money(paid ? o.total : 0)}</dd>
            </div>
            <div className="flex justify-between py-1.5 font-semibold">
              <dt>Balance due</dt>
              <dd className="tabular-nums">{money(paid ? 0 : o.total)}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-12 space-y-2 border-t border-[#e6e1d6] pt-6 text-xs leading-relaxed text-[#5f6b78]">
          <p>Discounts associated with membership tiers apply only to the base price of products and do not reduce shipping costs, taxes, or duties.</p>
          <p>For international orders, the customer is the importer of record and is responsible for customs duties, import taxes and local fees. These are not included above.</p>
          <p>Returns are started from your Price-Select account. Terms &amp; Conditions: price-select.com/policies/terms</p>
          <p className="pt-2 font-semibold text-[#14284a]">Thank you for shopping with Price-Select.</p>
        </footer>
      </DocumentFrame>
    </>
  )
}
