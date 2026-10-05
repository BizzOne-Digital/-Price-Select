import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { DemoBanner, PageHeader, Panel, StatusBadge } from '@/components/dashboard/kit'
import { adminMeta, hoursSince, TARGET_HOURS } from '@/components/admin/data'
import { SupplierHeaderActions } from '@/components/admin/suppliers'
import { KV } from '@/components/admin/ui'
import { categoryName } from '@/lib/data/categories'
import { fulfillmentsFor } from '@/lib/data/operations'
import { products } from '@/lib/data/products'
import { getSupplier, suppliers } from '@/lib/data/suppliers'
import { date, money } from '@/lib/format'
import { SERVICE_TARGETS } from '@/lib/site'
import { cn } from '@/lib/utils'

export const generateStaticParams = () => suppliers.map((s) => ({ id: s.id }))

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = getSupplier(id)
  return adminMeta(s?.name ?? 'Supplier', `Supplier profile, documents, performance and feed status for ${s?.name ?? id}.`, `/admin/suppliers/${id}`)
}

function Measure({ label, value, unit, target, lowerIsBetter, note }: { label: string; value: number; unit: string; target?: number; lowerIsBetter?: boolean; note: string }) {
  const ok = target === undefined ? undefined : lowerIsBetter ? value <= target : value >= target
  const pct = target === undefined ? Math.min(value, 100) : lowerIsBetter ? Math.min((value / (target * 2)) * 100, 100) : Math.min(value, 100)
  return (
    <li className="border-b border-obsidian/[0.07] py-4 last:border-0">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-sm">{label}</p>
        <p className="font-display text-2xl tabular-nums">
          {value}
          <span className="ml-1 text-sm text-slate">{unit}</span>
        </p>
      </div>
      <div className="relative mt-2 h-px bg-obsidian/10">
        <div className={cn('absolute inset-y-0 left-0', ok === false ? 'bg-danger' : 'bg-gold')} style={{ width: `${pct}%` }} />
        {target !== undefined && lowerIsBetter && <span aria-hidden className="absolute -top-1.5 left-1/2 h-3.5 w-px bg-obsidian/40" />}
      </div>
      <p className="mt-2 flex items-center justify-between gap-3 text-xs text-slate">
        <span>{note}</span>
        {ok !== undefined && <StatusBadge status={ok ? 'on_target' : 'off_target'} tone={ok ? 'good' : 'bad'} label={ok ? 'On target' : 'Off target'} />}
      </p>
    </li>
  )
}

export default async function AdminSupplier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = getSupplier(id)
  if (!s) notFound()
  const m = s.metrics
  const history = m.fulfillmentRate > 0
  const ff = fulfillmentsFor(s.id)
  const catalog = products.filter((p) => p.supplierId === s.id)

  return (
    <>
      <Link href="/admin/suppliers" className="mb-4 inline-flex min-h-11 items-center gap-2 meta text-[0.62rem] text-slate hover:text-obsidian">
        <ArrowLeft className="size-3.5" /> All suppliers
      </Link>
      <PageHeader eyebrow={`${s.region} · joined ${date(s.joined)}`} title={s.name} description={s.categories.map(categoryName).join(' · ')} actions={<SupplierHeaderActions supplier={s} />} />
      <DemoBanner>Fictional supplier for interface design. Service targets are placeholders to be agreed with suppliers before launch.</DemoBanner>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Performance vs service targets" className="xl:col-span-2">
          {history ? (
            <ul>
              <Measure label="Order acknowledgment" value={m.acknowledgmentHours} unit="h avg" target={TARGET_HOURS.ack} lowerIsBetter note={`Target: ${SERVICE_TARGETS[0].value} ${SERVICE_TARGETS[0].unit} (placeholder)`} />
              <Measure label="Tracking uploaded on time" value={m.trackingCompliance} unit="%" target={95} note={`Target: within ${SERVICE_TARGETS[1].value} ${SERVICE_TARGETS[1].unit} of dispatch · 95% threshold (placeholder)`} />
              <Measure label="Escalated case response" value={m.responseHours} unit="h avg" target={TARGET_HOURS.response} lowerIsBetter note={`Target: ${SERVICE_TARGETS[2].value} ${SERVICE_TARGETS[2].unit} (placeholder)`} />
              <Measure label="Fulfillment rate" value={m.fulfillmentRate} unit="%" note="Orders fulfilled without cancellation" />
              <Measure label="Return rate" value={m.returnRate} unit="%" note="Monitored; no target set" />
            </ul>
          ) : (
            <p className="py-6 text-sm text-slate">No order history yet. Performance appears after the first routed orders.</p>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Inventory feed">
            <dl>
              <KV k="Integration">{s.integration}</KV>
              <KV k="Status">
                <StatusBadge status={s.feed.status} />
              </KV>
              <KV k="Last sync">{`${date(s.feed.lastSync)} · ${Math.round(hoursSince(s.feed.lastSync))} h ago`}</KV>
              <KV k="Minimum cadence">{`${SERVICE_TARGETS[3].value} ${SERVICE_TARGETS[3].unit}`}</KV>
            </dl>
          </Panel>
          <Panel title="Documents">
            <ul>
              {s.documents.map((d) => (
                <li key={d.label} className="flex items-center justify-between gap-3 border-b border-obsidian/[0.07] py-3 text-sm last:border-0">
                  {d.label} <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Profile">
            <dl>
              <KV k="Contact">{s.contactName}</KV>
              <KV k="Email">{s.contactEmail}</KV>
              <KV k="Products">{catalog.length}</KV>
              <KV k="Routed fulfillments">{ff.length}</KV>
            </dl>
          </Panel>
        </div>
      </div>

      {catalog.length > 0 && (
        <Panel title="Catalog" className="mt-6" pad={false}>
          <ul className="divide-y divide-obsidian/[0.07]">
            {catalog.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>
                  {p.name} <span className="text-xs text-slate">· {p.sku}</span>
                </span>
                <span className="flex items-center gap-4">
                  <span className="tabular-nums text-slate">{money(p.price)}</span>
                  <StatusBadge status={p.status} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  )
}
