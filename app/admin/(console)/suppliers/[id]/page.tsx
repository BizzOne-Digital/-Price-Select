import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader, Panel, StatusBadge } from '@/components/dashboard/kit'
import { adminMeta, when } from '@/components/admin/data'
import { SupplierDocuments, SupplierSettings, SupplierStatusActions } from '@/components/admin/suppliers'
import { KV } from '@/components/admin/ui'
import { money } from '@/lib/format'
import { HttpError } from '@/lib/server/http'
import { requirePage } from '@/lib/server/page-auth'
import { listCategoriesAdmin } from '@/lib/server/services/catalog'
import { listProductsAdmin } from '@/lib/server/services/products'
import { getSettings } from '@/lib/server/services/settings'
import { getSupplierAdmin } from '@/lib/server/services/suppliers'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return adminMeta('Supplier', `Supplier profile, documents, performance and feed status for ${id}.`, `/admin/suppliers/${id}`)
}

const UNIT: Record<string, string> = { hours: 'hours', business_days: 'business day(s)', days: 'day(s)' }

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
  const actor = await requirePage(['admin'], '/admin/login')
  let s
  try {
    s = await getSupplierAdmin(actor, decodeURIComponent(id))
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound()
    throw e
  }
  const [settings, products, categories] = await Promise.all([getSettings(), listProductsAdmin(actor), listCategoriesAdmin()])
  const catName = new Map(categories.map((c) => [c.slug, c.name]))
  const catalog = products.items.filter((p) => p.supplierId === s.id)
  const t = (k: string) => settings.targets.items.find((x) => x.key === k)!
  const hoursTarget = (k: string) => (t(k).unit === 'hours' ? t(k).amount : undefined)
  const m = s.metrics
  const history = m.fulfillmentRate > 0 || m.acknowledgmentHours > 0
  const feedH = s.feed.lastSync ? Math.round((Date.now() - new Date(s.feed.lastSync).getTime()) / 3_600_000) : null

  return (
    <>
      <Link href="/admin/suppliers" className="mb-4 inline-flex min-h-11 items-center gap-2 meta text-[0.62rem] text-slate hover:text-obsidian">
        <ArrowLeft className="size-3.5" /> All suppliers
      </Link>
      <PageHeader eyebrow={`${s.region || 'Region not given'} · ${s.appliedAt ? `applied ${when(s.appliedAt)}` : `joined ${when(s.joined)}`}`} title={s.name} description={s.categories.map((c) => catName.get(c) ?? c).join(' · ') || 'No categories selected'} actions={<SupplierStatusActions supplier={s} />} />
      {s.statusReason && <p className="-mt-4 mb-8 border-l-2 border-warning bg-warning/[0.06] px-4 py-3 text-sm">Status reason: {s.statusReason}</p>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title="Application">
            <dl className="grid gap-x-8 md:grid-cols-2">
              <div>
                <KV k="Legal name">{s.legalName || '—'}</KV>
                <KV k="Business type">{s.businessType || '—'}</KV>
                <KV k="Website">{s.website ? <a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:text-gold-deep">{s.website}</a> : '—'}</KV>
                <KV k="Phone">{s.phone || '—'}</KV>
                <KV k="Tax country">{s.taxCountry || '—'}</KV>
                <KV k="Tax ID">{s.taxIdLast4 ? `•••• ${s.taxIdLast4}` : '—'}</KV>
              </div>
              <div>
                <KV k="Contact">{s.contactName || '—'}</KV>
                <KV k="Email">{s.contactEmail ? <a href={`mailto:${s.contactEmail}`} className="hover:text-gold-deep">{s.contactEmail}</a> : '—'}</KV>
                <KV k="Ships from">{s.shipping?.shipFrom || '—'}</KV>
                <KV k="Carriers">{s.shipping?.carriers?.join(', ') || '—'}</KV>
                <KV k="Handling">{s.shipping?.handling || '—'}</KV>
                <KV k="Blind ship">{s.shipping?.blindShip == null ? '—' : s.shipping.blindShip ? 'Supported' : 'Not supported'}</KV>
              </div>
            </dl>
            <p className="mt-4 text-xs text-slate">
              Declarations: authenticity {s.declarations?.authentic ? 'confirmed' : 'not confirmed'} · terms {s.declarations?.terms ? 'accepted' : 'not accepted'}
              {s.declarations?.at ? ` · ${when(s.declarations.at)}` : ''}
            </p>
          </Panel>

          <Panel title="Performance vs service targets · last 180 days">
            {history ? (
              <ul>
                <Measure label="Order acknowledgment" value={m.acknowledgmentHours} unit="h avg" target={hoursTarget('ack')} lowerIsBetter note={`Target: ${t('ack').amount} ${UNIT[t('ack').unit]}`} />
                <Measure label="Shipped with tracking" value={m.trackingCompliance} unit="%" note={`Tracking target: within ${t('tracking').amount} ${UNIT[t('tracking').unit]}`} />
                <Measure label="Escalated case response" value={m.responseHours} unit="h avg" target={hoursTarget('response')} lowerIsBetter note={`Target: ${t('response').amount} ${UNIT[t('response').unit]}`} />
                <Measure label="Fulfillment rate" value={m.fulfillmentRate} unit="%" note="Routed fulfillments not canceled" />
                <Measure label="Return rate" value={m.returnRate} unit="%" note="Monitored; no target set" />
              </ul>
            ) : (
              <p className="py-6 text-sm text-slate">No order history yet. Performance appears after the first routed orders.</p>
            )}
          </Panel>

          <Panel title="Review history">
            {s.review.length ? (
              <ol className="border-l border-obsidian/10">
                {[...s.review].reverse().map((r, i) => (
                  <li key={r.at + i} className="relative pb-4 pl-5 last:pb-0">
                    <span aria-hidden className="absolute -left-[3px] top-1.5 size-[5px] rounded-full bg-obsidian/30" />
                    <p className="text-sm capitalize">{r.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate">{[r.byName, when(r.at), r.reason].filter(Boolean).join(' · ')}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate">No decisions recorded yet.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Documents">
            <SupplierDocuments supplier={s} />
          </Panel>
          <Panel title="Inventory feed">
            <dl>
              <KV k="Integration">{s.integration}</KV>
              <KV k="Status">
                <StatusBadge status={s.feed.status} />
              </KV>
              <KV k="Last sync">{feedH == null ? 'Never' : `${when(s.feed.lastSync)} · ${feedH} h ago`}</KV>
              <KV k="Minimum cadence">{`${t('inventory').amount} ${UNIT[t('inventory').unit]}`}</KV>
            </dl>
          </Panel>
          <Panel title="Settings">
            <SupplierSettings supplier={s} />
          </Panel>
        </div>
      </div>

      <Panel title={`Catalog · ${catalog.length}`} className="mt-6" pad={false}>
        {catalog.length ? (
          <ul className="divide-y divide-obsidian/[0.07]">
            {catalog.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
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
        ) : (
          <p className="p-5 text-sm text-slate">No listings yet.</p>
        )}
      </Panel>
    </>
  )
}
