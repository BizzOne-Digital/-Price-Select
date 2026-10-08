import type { Metadata } from 'next'
import { PageBand } from '@/components/site/ui'
import { DocHeader, DocLabel, DocumentFrame } from '@/components/templates/document'
import { getOrder } from '@/lib/data/operations'
import { date } from '@/lib/format'

export const metadata: Metadata = { title: 'Packing slip template' }

export default function PackingSlipTemplate() {
  const o = getOrder('PS-240118')!
  const f = o.fulfillments[0]

  return (
    <>
      <div data-print-hide>
        <PageBand eyebrow="Templates · Documents" title={'Packing\nslip.'} italic={['slip.']}>
          <p className="mt-8 max-w-xl text-sm leading-relaxed text-ivory/60">
            Placed in every parcel. Suppliers print it with Price-Select branding only, so shipments arrive with no supplier names or prices (blind drop shipping).
          </p>
        </PageBand>
      </div>
      <DocumentFrame>
        <DocHeader
          title="Packing slip"
          meta={[
            ['Order no.', o.id],
            ['Shipment', f.id],
            ['Order date', date(o.placedAt)],
            ['Parcel', `1 of ${o.fulfillments.length}`],
          ]}
        />

        <div className="grid gap-8 py-8 sm:grid-cols-2">
          <div>
            <DocLabel>Ship to</DocLabel>
            <p className="mt-2 text-sm leading-relaxed">
              {o.shipTo.name}
              <br />
              {o.shipTo.city}, {o.shipTo.region}
            </p>
          </div>
          <div>
            <DocLabel>Carrier</DocLabel>
            <p className="mt-2 text-sm leading-relaxed">
              {f.carrier ?? '—'}
              <br />
              Tracking: {f.tracking ?? '—'}
            </p>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-[#e6e1d6] text-left text-[0.65rem] uppercase tracking-[0.16em] text-[#5f6b78]">
              <th className="w-12 py-3 font-semibold">✓</th>
              <th className="py-3 font-semibold">Item</th>
              <th className="py-3 text-right font-semibold">Qty</th>
            </tr>
          </thead>
          <tbody>
            {f.lines.map((l) => (
              <tr key={l.productSlug} className="border-b border-[#e6e1d6]">
                <td className="py-4">
                  <span className="block size-4 border border-[#14284a]" aria-hidden />
                </td>
                <td className="py-4 pr-4">
                  {l.name}
                  <span className="block text-xs text-[#5f6b78]">SKU {l.productSlug.toUpperCase()}</span>
                </td>
                <td className="py-4 text-right text-base font-semibold tabular-nums">{l.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {o.fulfillments.length > 1 && (
          <p className="mt-6 bg-[#f4f0e8] px-5 py-4 text-sm">
            Your order arrives in {o.fulfillments.length} shipments. Other items will be delivered separately.
          </p>
        )}

        <footer className="mt-12 grid gap-8 border-t border-[#e6e1d6] pt-6 text-xs leading-relaxed text-[#5f6b78] sm:grid-cols-2">
          <div>
            <DocLabel>Damaged or defective?</DocLabel>
            <p className="mt-2">Send photos within 48 hours of delivery from your Price-Select account so we can open a claim.</p>
          </div>
          <div>
            <DocLabel>Returns</DocLabel>
            <p className="mt-2">All returns must be initiated from your Price-Select account.</p>
          </div>
          <p className="font-semibold text-[#14284a] sm:col-span-2">Thank you for shopping with Price-Select.</p>
        </footer>
      </DocumentFrame>
    </>
  )
}
