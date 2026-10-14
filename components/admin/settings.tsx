'use client'

import { useState, type ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'
import { ActionButton, Field, Panel, StatusBadge } from '@/components/dashboard/kit'
import { SafeImage } from '@/components/ui/safe-image'
import { useToast } from '@/components/ui/toast'
import { PERMISSIONS, ROLE_LABEL, type Permission } from '@/lib/auth'
import { api, errorText } from '@/lib/client/api'
import { money } from '@/lib/format'
import type { Capabilities, Category, ProductAdmin, Role } from '@/lib/types'
import type { SettingsData } from '@/lib/server/services/settings'
import { cn } from '@/lib/utils'
import { when } from './data'
import { inputCls } from './ui'

export type ContentEntry = { key: string; draft: unknown; draftBy?: string | null; draftAt?: string; published: unknown; version: number; publishedBy?: string | null; publishedAt?: string }
type SiteContent = { homeHeadline: string; campaignHeadline: string; campaignDescription: string; pricingNotice: string; contactEmail: string }
type AuditRow = { id: string; at: string; who: string; role: string; action: string; target: string; summary: string }

const SECTIONS = [
  ['targets', 'Service targets'],
  ['shipping', 'Shipping & tax'],
  ['fees', 'Fees & commission'],
  ['promotion', 'Seasonal promotion'],
  ['policies', 'Site policies'],
  ['content', 'Site content'],
  ['returns', 'Returns responsibility'],
  ['integrations', 'Integrations & security'],
  ['roles', 'Roles & permissions'],
  ['email', 'Notifications'],
  ['audit', 'Audit log'],
  ['confirm', 'Launch checklist'],
] as const

const EVENTS: { event: string; label: string; to: string }[] = [
  { event: 'order_confirmed', label: 'Order confirmed', to: 'Customer' },
  { event: 'order_shipped', label: 'Order shipped', to: 'Customer' },
  { event: 'order_delayed', label: 'Order delayed', to: 'Customer, support' },
  { event: 'order_delivered', label: 'Order delivered', to: 'Customer' },
  { event: 'order_canceled', label: 'Order canceled', to: 'Customer, supplier' },
  { event: 'return_approved', label: 'Return approved', to: 'Customer' },
  { event: 'refund_initiated', label: 'Refund initiated', to: 'Customer' },
  { event: 'supplier_ack', label: 'Supplier acknowledgment', to: 'Support' },
  { event: 'support_escalation', label: 'Support escalation', to: 'Support, administrator' },
]

const PERMISSION_LABEL: Record<Permission, string> = {
  'catalog:browse': 'Browse catalog',
  'orders:own': 'View own orders',
  'supplier:catalog': 'Manage own catalog',
  'supplier:fulfillment': 'Fulfill own orders',
  'admin:suppliers': 'Approve & manage suppliers',
  'admin:products': 'Review & publish products',
  'admin:orders': 'View & act on all orders',
  'admin:payments': 'Payments & refunds',
  'admin:settings': 'System settings',
  'support:cases': 'Returns & support cases',
  'support:customers': 'Customer accounts',
}
const ROLES: Role[] = ['admin', 'support', 'supplier', 'customer']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TBC = 'To be confirmed'
const area = 'w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none'

/** Optional number field: '' means "not set" (null). */
const num = (s: string) => (s.trim() === '' ? null : Number(s))
const str = (n: number | null | undefined) => (n == null ? '' : String(n))

function Section({ id, index, title, note, children }: { id: string; index: number; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28 border-t border-obsidian/10 pt-10">
      <div className="mb-6 grid gap-3 lg:grid-cols-[220px_1fr]">
        <p className="meta text-[0.6rem] text-gold-deep">{String(index).padStart(2, '0')}</p>
        <div>
          <h2 id={`${id}-h`} className="font-display text-3xl font-light tracking-[-0.01em]">
            {title}
          </h2>
          {note && <div className="mt-2 max-w-2xl text-sm text-slate">{note}</div>}
        </div>
      </div>
      <div className="lg:pl-[232px]">{children}</div>
    </section>
  )
}

/** Persist one section; success is reported only after the server confirms. */
function useSave() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async <T,>(path: string, body: unknown, title: string, method = 'PUT'): Promise<T | null> => {
    setBusy(true)
    setError('')
    try {
      const r = await api<T>(path, { method, body })
      toast({ title })
      return r
    } catch (e) {
      setError(errorText(e))
      return null
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, run }
}

const Err = ({ e }: { e: string }) => (e ? <p role="alert" className="text-sm text-danger">{e}</p> : null)

export function SettingsBoard({ settings, caps, content, audit, products, categories }: { settings: SettingsData; caps: Capabilities; content: Record<'policy:terms' | 'policy:privacy' | 'policy:returns' | 'content:site', ContentEntry>; audit: AuditRow[]; products: ProductAdmin[]; categories: Category[] }) {
  return (
    <div className="space-y-14">
      <nav aria-label="Settings sections" className="no-scrollbar -mt-4 flex gap-5 overflow-x-auto border-b border-obsidian/10 pb-3">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap py-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate hover:text-obsidian">
            {label}
          </a>
        ))}
      </nav>
      <Targets initial={settings.targets} />
      <ShippingTax shipping={settings.shipping} tax={settings.tax} />
      <Fees initial={settings.fees} />
      <Promotion initial={settings.promotion} products={products} stacking={settings.discounts.stacking} />
      <Policies content={content} />
      <SiteContentSection entry={content['content:site']} />
      <Returns initial={settings.returns} categories={categories} />
      <Integrations caps={caps} />
      <Roles />
      <Notifications initial={settings.notifications} emailConnected={caps.email} />
      <Section id="audit" index={11} title="Audit log" note="The latest administrative actions recorded by the server.">
        {audit.length ? (
          <ol className="border-l border-obsidian/10">
            {audit.map((a) => (
              <li key={a.id} className="relative pb-6 pl-6 last:pb-0">
                <span aria-hidden className="absolute -left-[3px] top-1.5 size-[5px] rounded-full bg-gold" />
                <p className="text-sm">{a.summary || a.action}</p>
                <p className="mt-1 meta text-[0.58rem] text-slate">
                  {a.who}
                  {a.role ? ` (${a.role})` : ''} · {when(a.at)} · {a.action}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate">No audit events yet.</p>
        )}
      </Section>
      <Checklist initial={settings.checklist} />
    </div>
  )
}

function Targets({ initial }: { initial: SettingsData['targets'] }) {
  const { busy, error, run } = useSave()
  const [items, setItems] = useState(initial.items.map((t) => ({ ...t, amount: String(t.amount) })))
  const [tz, setTz] = useState(initial.calendar.timezone)
  const [days, setDays] = useState(initial.calendar.businessDays)
  return (
    <Section id="targets" index={1} title="Supplier service targets" note="These targets drive monitoring warnings, supplier scorecards and case SLAs. Agree each with suppliers before launch.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void run('/api/admin/settings/targets', { items: items.map((t) => ({ ...t, amount: Number(t.amount) })), calendar: { timezone: tz.trim(), businessDays: [...days].sort() } }, 'Service targets saved')
        }}
        className="grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2"
      >
        {items.map((t, i) => (
          <div key={t.key} className="bg-ivory/70 p-5">
            <Field label={t.label} hint={t.detail}>
              <span className="flex gap-2">
                <input type="number" min="0.1" step="any" required value={t.amount} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} className={cn(inputCls, 'w-28')} aria-label={`${t.label} value`} />
                <select value={t.unit} onChange={(e) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, unit: e.target.value as typeof t.unit } : x)))} className={inputCls} aria-label={`${t.label} unit`}>
                  <option value="hours">hours</option>
                  <option value="business_days">business days</option>
                  <option value="days">days</option>
                </select>
              </span>
            </Field>
          </div>
        ))}
        <div className="bg-ivory/70 p-5">
          <Field label="Time zone" hint="IANA name, e.g. America/New_York. Used for business-day calculations.">
            <input value={tz} onChange={(e) => setTz(e.target.value)} required className={inputCls} />
          </Field>
        </div>
        <fieldset className="bg-ivory/70 p-5">
          <legend className="sr-only">Business days</legend>
          <p className="meta text-[0.62rem] text-slate">Business days</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {DAYS.map((d, i) => (
              <label key={d} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={days.includes(i)} onChange={(e) => setDays((ds) => (e.target.checked ? [...ds, i] : ds.filter((x) => x !== i)))} className="size-4 accent-[#5420C7]" />
                {d}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2 bg-ivory/70 p-5 md:col-span-2">
          <Err e={error} />
          <ActionButton type="submit" tone="primary" disabled={busy || !days.length}>
            {busy ? 'Saving' : 'Save targets'}
          </ActionButton>
        </div>
      </form>
    </Section>
  )
}

function ShippingTax({ shipping, tax }: { shipping: SettingsData['shipping']; tax: SettingsData['tax'] }) {
  const ship = useSave()
  const taxSave = useSave()
  const [s, setS] = useState({ ...shipping, flatRate: str(shipping.flatRate), freeThreshold: str(shipping.freeThreshold) })
  const [t, setT] = useState({ mode: tax.mode, ratePercent: str(tax.ratePercent) })
  return (
    <Section id="shipping" index={2} title="Shipping & tax" note="Checkout shows shipping and tax only when configured here; otherwise the storefront says they are calculated later.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void ship.run('/api/admin/settings/shipping', { ...s, flatRate: num(s.flatRate), freeThreshold: num(s.freeThreshold) }, 'Shipping rules saved')
        }}
        className="grid gap-6 sm:grid-cols-2"
      >
        <Field label="Shipping mode">
          <select value={s.mode} onChange={(e) => setS({ ...s, mode: e.target.value as typeof s.mode })} className={inputCls}>
            <option value="not_configured">Not configured</option>
            <option value="flat_per_shipment">Flat rate per supplier shipment</option>
          </select>
        </Field>
        <Field label="Flat rate per shipment (USD)" hint={s.mode === 'flat_per_shipment' ? 'Required for flat shipping' : 'Used when flat shipping is enabled'}>
          <input type="number" min="0" step="0.01" value={s.flatRate} onChange={(e) => setS({ ...s, flatRate: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Free-shipping threshold (USD)" hint="Leave empty for none">
          <input type="number" min="0" step="0.01" value={s.freeThreshold} onChange={(e) => setS({ ...s, freeThreshold: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Carriers" hint={s.carriers ? undefined : TBC}>
          <input value={s.carriers} onChange={(e) => setS({ ...s, carriers: e.target.value })} maxLength={200} placeholder={TBC} className={inputCls} />
        </Field>
        <Field label="Freight / oversized items">
          <select value={s.freight} onChange={(e) => setS({ ...s, freight: e.target.value as typeof s.freight })} className={inputCls}>
            <option value="supplier">Supplier quote</option>
            <option value="flat">Flat rate</option>
          </select>
        </Field>
        <Field label="Default packaging" hint="Neutral packaging and Price-Select documents where the supplier supports it">
          <select value={s.packaging} onChange={(e) => setS({ ...s, packaging: e.target.value as typeof s.packaging })} className={inputCls}>
            <option value="blind">Blind ship where possible</option>
            <option value="supplier">Supplier packaging</option>
          </select>
        </Field>
        <div className="space-y-2 sm:col-span-2">
          <Err e={ship.error} />
          <ActionButton type="submit" tone="primary" disabled={ship.busy}>
            {ship.busy ? 'Saving' : 'Save shipping rules'}
          </ActionButton>
        </div>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void taxSave.run('/api/admin/settings/tax', { mode: t.mode, ratePercent: num(t.ratePercent) }, 'Tax settings saved')
        }}
        className="mt-10 grid gap-6 border-t border-obsidian/10 pt-8 sm:grid-cols-2"
      >
        <Field label="Tax handling" hint="Confirm with a tax adviser before launch">
          <select value={t.mode} onChange={(e) => setT({ ...t, mode: e.target.value as typeof t.mode })} className={inputCls}>
            <option value="not_configured">Not configured</option>
            <option value="manual_rate">Manual rate</option>
            <option value="none_confirmed">No tax collected (confirmed)</option>
          </select>
        </Field>
        <Field label="Tax rate (%)" hint={t.mode === 'manual_rate' ? 'Required for a manual rate' : 'Used with a manual rate'}>
          <input type="number" min="0" max="100" step="0.001" value={t.ratePercent} onChange={(e) => setT({ ...t, ratePercent: e.target.value })} disabled={t.mode !== 'manual_rate'} className={inputCls} />
        </Field>
        <div className="space-y-2 sm:col-span-2">
          <Err e={taxSave.error} />
          <ActionButton type="submit" tone="primary" disabled={taxSave.busy}>
            {taxSave.busy ? 'Saving' : 'Save tax settings'}
          </ActionButton>
        </div>
      </form>
    </Section>
  )
}

function Fees({ initial }: { initial: SettingsData['fees'] }) {
  const { busy, error, run } = useSave()
  const [f, setF] = useState({ commissionPercent: str(initial.commissionPercent), marginPercent: str(initial.marginPercent), processingPassThrough: initial.processingPassThrough })
  return (
    <Section id="fees" index={3} title="Fees, commission & margin" note="Leave a field empty until the commercial model is agreed. When commission is set, Payments shows estimated supplier payouts.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void run('/api/admin/settings/fees', { commissionPercent: num(f.commissionPercent), marginPercent: num(f.marginPercent), processingPassThrough: f.processingPassThrough.trim() }, 'Fee settings saved')
        }}
        className="grid gap-6 sm:grid-cols-3"
      >
        <Field label="Supplier commission (%)" hint={f.commissionPercent ? undefined : TBC}>
          <input type="number" min="0" max="100" step="0.01" value={f.commissionPercent} onChange={(e) => setF({ ...f, commissionPercent: e.target.value })} placeholder={TBC} className={inputCls} />
        </Field>
        <Field label="Marketplace margin (%)" hint={f.marginPercent ? undefined : TBC}>
          <input type="number" min="0" max="100" step="0.01" value={f.marginPercent} onChange={(e) => setF({ ...f, marginPercent: e.target.value })} placeholder={TBC} className={inputCls} />
        </Field>
        <Field label="Payment processing pass-through" hint={f.processingPassThrough ? undefined : TBC}>
          <input value={f.processingPassThrough} onChange={(e) => setF({ ...f, processingPassThrough: e.target.value })} maxLength={120} placeholder={TBC} className={inputCls} />
        </Field>
        <div className="space-y-2 sm:col-span-3">
          <Err e={error} />
          <ActionButton type="submit" tone="primary" disabled={busy}>
            {busy ? 'Saving' : 'Save fees'}
          </ActionButton>
        </div>
      </form>
    </Section>
  )
}

function Promotion({ initial, products, stacking }: { initial: SettingsData['promotion']; products: ProductAdmin[]; stacking: SettingsData['discounts']['stacking'] }) {
  const disc = useSave()
  const [active, setActive] = useState(initial.active)
  const [headline, setHeadline] = useState(initial.headline)
  const [description, setDescription] = useState(initial.description)
  const [promo, setPromo] = useState<Record<string, string>>(() => Object.fromEntries(initial.items.map((i) => [i.productId, String(i.priceCents / 100)])))
  const [stack, setStack] = useState(stacking)
  const chosen = Object.keys(promo)
  const candidates = [...products].sort((a, b) => Number(b.id in promo) - Number(a.id in promo))
  // Per-product server errors: badRequest details are [{ productId, message }].
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})

  const toast = useToast()
  const [pBusy, setPBusy] = useState(false)
  const [pError, setPError] = useState('')
  const save = async () => {
    setItemErrors({})
    setPError('')
    setPBusy(true)
    try {
      await api('/api/admin/settings/promotion', { method: 'PUT', body: { active, headline: headline.trim(), description: description.trim(), items: chosen.map((id) => ({ productId: id, price: Number(promo[id]) })) } })
      toast({ title: active ? 'Seasonal campaign saved and live' : 'Seasonal campaign saved (inactive)' })
    } catch (e) {
      setPError(errorText(e))
      const d = (e as { details?: unknown }).details
      if (Array.isArray(d)) setItemErrors(Object.fromEntries(d.filter((x) => x && typeof x === 'object' && 'productId' in x).map((x) => [(x as { productId: string }).productId, (x as { message: string }).message])))
    } finally {
      setPBusy(false)
    }
  }

  return (
    <Section id="promotion" index={4} title="Seasonal promotion" note="Choose three or four published products and set a special price below the regular price for each. The campaign shows on the storefront only while active.">
      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        <Field label="Campaign headline">
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} required className={inputCls} />
        </Field>
        <label className="flex min-h-11 items-center gap-3 self-end text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-4 accent-[#5420C7]" /> Campaign active on the storefront
        </label>
        <Field label="Campaign description" className="sm:col-span-2">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={400} className={area} />
        </Field>
      </div>
      <Panel title={`${chosen.length} of 4 selected`} pad={false}>
        {candidates.length === 0 && <p className="p-5 text-sm text-slate">No published products yet.</p>}
        <ul className="max-h-[480px] divide-y divide-obsidian/[0.07] overflow-y-auto" data-lenis-prevent>
          {candidates.map((p) => {
            const on = p.id in promo
            const full = !on && chosen.length >= 4
            const price = Number(promo[p.id])
            const invalid = on && promo[p.id] !== '' && (!(price > 0) || price >= p.price)
            return (
              <li key={p.id} className={cn('flex flex-wrap items-center gap-4 px-5 py-3', full && 'opacity-50')}>
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-4">
                  <input type="checkbox" checked={on} disabled={full} onChange={() => setPromo((s) => (on ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== p.id)) : { ...s, [p.id]: '' }))} className="size-4 accent-[#5420C7]" />
                  <span className="relative size-10 shrink-0 overflow-hidden bg-pearl">{p.images[0] && <SafeImage src={p.images[0].src} alt="" fill sizes="40px" className="object-cover" />}</span>
                  <span className="text-sm">
                    {p.name}
                    <span className="block text-xs text-slate">Regular {money(p.price)}</span>
                    {itemErrors[p.id] && <span className="block text-xs text-danger">{itemErrors[p.id]}</span>}
                  </span>
                </label>
                {on && (
                  <label className="w-40">
                    <span className="sr-only">Special price for {p.name}</span>
                    <input type="number" step="0.01" min="0.01" value={promo[p.id]} onChange={(e) => setPromo((s) => ({ ...s, [p.id]: e.target.value }))} placeholder="Special price" aria-invalid={invalid} className={cn(inputCls, invalid && 'border-danger')} />
                  </label>
                )}
              </li>
            )
          })}
        </ul>
      </Panel>
      <div className="mt-4 space-y-2">
        <Err e={pError} />
        <div className="flex flex-wrap items-center gap-4">
          <ActionButton tone="primary" disabled={pBusy || (active && (chosen.length < 3 || chosen.some((k) => !(Number(promo[k]) > 0))))} onClick={save}>
            {pBusy ? 'Saving' : 'Save campaign'}
          </ActionButton>
          <p className="text-xs text-slate">An active campaign needs 3–4 products, each priced above $0 and below its regular price.</p>
        </div>
      </div>

      <form
        className="mt-10 grid gap-4 border-t border-obsidian/10 pt-8 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          void disc.run('/api/admin/settings/discounts', { stacking: stack }, 'Discount stacking saved')
        }}
      >
        <Field label="Seasonal + membership discounts" hint="To be confirmed with the client — listed on the launch checklist.">
          <select value={stack} onChange={(e) => setStack(e.target.value as typeof stack)} className={inputCls}>
            <option value="best_of">Best of the two (no stacking)</option>
            <option value="stack">Stack membership on top of the seasonal price</option>
          </select>
        </Field>
        <div className="flex flex-col justify-end gap-2">
          <Err e={disc.error} />
          <ActionButton type="submit" disabled={disc.busy} className="self-start">
            {disc.busy ? 'Saving' : 'Save stacking rule'}
          </ActionButton>
        </div>
      </form>
    </Section>
  )
}

function Versions({ e }: { e: ContentEntry }) {
  return (
    <p className="mt-2 text-xs text-slate">
      {e.version ? `Published v${e.version}${e.publishedBy ? ` by ${e.publishedBy}` : ''} · ${when(e.publishedAt)}` : 'Not yet published — the storefront shows the default wording.'}
      {e.draftAt && <span className="block">Draft saved{e.draftBy ? ` by ${e.draftBy}` : ''} · {when(e.draftAt)}</span>}
    </p>
  )
}

function PolicyEditor({ label, entry: initial, fallback }: { label: string; entry: ContentEntry; fallback: string }) {
  const save = useSave()
  const pub = useSave()
  const [entry, setEntry] = useState(initial)
  const body = (x: unknown) => ((x as { body?: string } | null)?.body ?? null)
  const [text, setText] = useState(body(initial.draft) ?? body(initial.published) ?? fallback)
  const savedDraft = body(entry.draft)
  const dirty = text !== (savedDraft ?? body(entry.published) ?? fallback)
  const unpublished = savedDraft != null && savedDraft !== body(entry.published)
  return (
    <div className="flex flex-col bg-ivory/70 p-5">
      <p className="flex items-center justify-between gap-3 text-sm font-medium">
        {label} {entry.version ? <StatusBadge status="published" label={`v${entry.version}`} /> : <StatusBadge status="awaiting" tone="warn" label="Default wording" />}
      </p>
      <label className="mt-4 block flex-1">
        <span className="sr-only">{label} content</span>
        <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} maxLength={50000} className={cn(area, 'h-full')} />
      </label>
      <Versions e={entry} />
      <Err e={save.error || pub.error} />
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton disabled={save.busy || !dirty} onClick={async () => { const r = await save.run<ContentEntry>(`/api/admin/content/${encodeURIComponent(entry.key)}`, { body: text }, `${label} draft saved`); if (r) setEntry(r) }}>
          {save.busy ? 'Saving' : 'Save draft'}
        </ActionButton>
        <ActionButton tone="primary" disabled={pub.busy || dirty || !unpublished} title={dirty ? 'Save the draft first' : undefined} onClick={async () => { const r = await pub.run<ContentEntry>(`/api/admin/content/${encodeURIComponent(entry.key)}/publish`, {}, `${label} published`, 'POST'); if (r) setEntry(r) }}>
          {pub.busy ? 'Publishing' : 'Publish'}
        </ActionButton>
      </div>
    </div>
  )
}

function Policies({ content }: { content: Record<string, ContentEntry> }) {
  return (
    <Section id="policies" index={5} title="Site policies" note="Edit a draft, then publish it explicitly. Drafts never reach the storefront. Have the client and their adviser review the wording before publishing.">
      <div className="grid gap-px border border-obsidian/10 bg-obsidian/10 xl:grid-cols-3">
        <PolicyEditor label="Privacy policy" entry={content['policy:privacy']!} fallback="" />
        <PolicyEditor label="Terms of service" entry={content['policy:terms']!} fallback="" />
        <PolicyEditor label="Returns policy" entry={content['policy:returns']!} fallback="" />
      </div>
    </Section>
  )
}

function SiteContentSection({ entry: initial }: { entry: ContentEntry }) {
  const save = useSave()
  const pub = useSave()
  const [entry, setEntry] = useState(initial)
  const start = (initial.draft ?? initial.published ?? {}) as Partial<SiteContent>
  const [c, setC] = useState<SiteContent>({ homeHeadline: start.homeHeadline ?? '', campaignHeadline: start.campaignHeadline ?? '', campaignDescription: start.campaignDescription ?? '', pricingNotice: start.pricingNotice ?? '', contactEmail: start.contactEmail ?? '' })
  const unpublished = JSON.stringify(entry.draft) !== JSON.stringify(entry.published) && entry.draft != null
  return (
    <Section id="content" index={6} title="Site content" note="Storefront copy. Save a draft, then publish it to replace the live wording.">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await save.run<ContentEntry>('/api/admin/content/content%3Asite', c, 'Site content draft saved')
          if (r) setEntry(r)
        }}
        className="grid gap-6 sm:grid-cols-2"
      >
        <Field label="Homepage headline">
          <input className={inputCls} required maxLength={120} value={c.homeHeadline} onChange={(e) => setC({ ...c, homeHeadline: e.target.value })} />
        </Field>
        <Field label="Seasonal campaign headline">
          <input className={inputCls} required maxLength={120} value={c.campaignHeadline} onChange={(e) => setC({ ...c, campaignHeadline: e.target.value })} />
        </Field>
        <Field label="Seasonal campaign description" className="sm:col-span-2">
          <textarea rows={3} className={area} maxLength={400} value={c.campaignDescription} onChange={(e) => setC({ ...c, campaignDescription: e.target.value })} />
        </Field>
        <Field label="Pricing notice" hint="Shown on product pages, cart and footer">
          <input className={inputCls} required maxLength={200} value={c.pricingNotice} onChange={(e) => setC({ ...c, pricingNotice: e.target.value })} />
        </Field>
        <Field label="Contact email" hint="Contact page is email only">
          <input type="email" className={inputCls} required value={c.contactEmail} onChange={(e) => setC({ ...c, contactEmail: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Versions e={entry} />
          <Err e={save.error || pub.error} />
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton type="submit" disabled={save.busy}>
              {save.busy ? 'Saving' : 'Save draft'}
            </ActionButton>
            <ActionButton type="button" tone="primary" disabled={pub.busy || !unpublished} onClick={async () => { const r = await pub.run<ContentEntry>('/api/admin/content/content%3Asite/publish', {}, 'Site content published', 'POST'); if (r) setEntry(r) }}>
              {pub.busy ? 'Publishing' : 'Publish'}
            </ActionButton>
          </div>
        </div>
      </form>
    </Section>
  )
}

function Returns({ initial, categories }: { initial: SettingsData['returns']; categories: Category[] }) {
  const { busy, error, run } = useSave()
  const [r, setR] = useState({ changeOfMind: initial.changeOfMind, damaged: initial.damaged })
  const [windows, setWindows] = useState<Record<string, string>>(() => Object.fromEntries(categories.map((c) => [c.slug, str(initial.windows[c.slug])])))
  return (
    <Section id="returns" index={7} title="Returns responsibility" note="Who pays for return shipping and damaged items, and the return window per category. Empty means to be confirmed.">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void run('/api/admin/settings/returns', { ...r, windows: Object.fromEntries(Object.entries(windows).map(([k, v]) => [k, num(v)])) }, 'Return rules saved')
        }}
        className="space-y-6"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Return shipping (change of mind)">
            <select className={inputCls} value={r.changeOfMind} onChange={(e) => setR({ ...r, changeOfMind: e.target.value as typeof r.changeOfMind })}>
              <option value="">{TBC}</option>
              <option>Customer</option>
              <option>Supplier</option>
              <option>Price-Select</option>
            </select>
          </Field>
          <Field label="Defective or damaged items">
            <select className={inputCls} value={r.damaged} onChange={(e) => setR({ ...r, damaged: e.target.value as typeof r.damaged })}>
              <option value="">{TBC}</option>
              <option>Supplier</option>
              <option>Price-Select</option>
              <option>Per supplier agreement</option>
            </select>
          </Field>
        </div>
        <Panel title="Return window by category" pad={false}>
          <ul className="divide-y divide-obsidian/[0.07]">
            {categories.map((c) => (
              <li key={c.slug} className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm">{c.name}</span>
                <label className="w-44">
                  <span className="sr-only">Return window in days for {c.name}</span>
                  <input type="number" min="0" max="365" step="1" className={inputCls} value={windows[c.slug] ?? ''} onChange={(e) => setWindows((w) => ({ ...w, [c.slug]: e.target.value }))} placeholder={`Days — ${TBC.toLowerCase()}`} />
                </label>
              </li>
            ))}
          </ul>
        </Panel>
        <Err e={error} />
        <ActionButton type="submit" tone="primary" disabled={busy}>
          {busy ? 'Saving' : 'Save return rules'}
        </ActionButton>
      </form>
    </Section>
  )
}

function Integrations({ caps }: { caps: Capabilities }) {
  const state = (ok: boolean, on = 'Connected', off = 'Not connected') => <StatusBadge status={ok ? 'active' : 'not_connected'} tone={ok ? 'good' : 'bad'} label={ok ? on : off} />
  return (
    <Section id="integrations" index={8} title="Integrations & security" note="Live status of the services the marketplace depends on.">
      <div className="grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2">
        {(
          [
            ['Payment provider', 'Authorization, capture, voids and refunds; raw card details are never stored', state(caps.payments)],
            ['Email provider', 'Order, shipping, delay, refund and escalation emails; queued until connected', state(caps.email)],
            ['Shipping rates', 'Flat per-shipment rate from Shipping settings', state(caps.shippingConfigured, 'Configured', 'Not configured')],
            ['Tax', 'Tax handling from Tax settings', state(caps.taxConfigured, 'Configured', 'Not configured')],
            ['Carrier labels', 'Return labels are recorded manually', state(caps.labels)],
          ] as const
        ).map(([t, d, s]) => (
          <div key={t} className="flex items-start justify-between gap-4 bg-ivory/70 p-5">
            <span>
              <span className="block text-sm font-medium">{t}</span>
              <span className="mt-1 block text-xs text-slate">{d}</span>
            </span>
            {s}
          </div>
        ))}
      </div>
      <ul className="mt-6 grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2">
        {[
          ['Role-based access control', 'Enforced server-side on every page and API route', 'Enforced'],
          ['Audit logs', 'Administrative actions are recorded; see the audit log below', 'Recording'],
          ['Encryption in transit and at rest', 'TLS and encrypted database storage, configured at deployment', 'At deployment'],
          ['Backups & recovery', 'Scheduled backups and a tested recovery procedure, set up at deployment', 'At deployment'],
          ['Error monitoring', 'Application error monitoring, set up at deployment', 'At deployment'],
        ].map(([t, d, s]) => (
          <li key={t} className="flex items-start justify-between gap-4 bg-ivory/70 p-5">
            <span>
              <span className="block text-sm font-medium">{t}</span>
              <span className="mt-1 block text-xs text-slate">{d}</span>
            </span>
            <StatusBadge status={s === 'At deployment' ? 'pending' : 'active'} label={s} />
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Roles() {
  return (
    <Section id="roles" index={9} title="Roles & permissions" note="The access model enforced by the server. Roles are assigned to accounts by administrators, never chosen at sign-in.">
      <Panel pad={false}>
        <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Permissions by role</caption>
            <thead>
              <tr className="border-b border-obsidian/10">
                <th scope="col" className="px-4 py-3 text-left meta text-[0.62rem] font-semibold text-slate">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} scope="col" className="px-4 py-3 text-center meta text-[0.62rem] font-semibold text-slate">
                    {ROLE_LABEL[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PERMISSION_LABEL) as Permission[]).map((p) => (
                <tr key={p} className="border-b border-obsidian/[0.06]">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    {PERMISSION_LABEL[p]} <span className="ml-2 font-mono text-[0.65rem] text-slate/70">{p}</span>
                  </th>
                  {ROLES.map((r) => (
                    <td key={r} className="px-4 py-3 text-center">
                      {PERMISSIONS[r].includes(p) ? <Check className="mx-auto size-4 text-gold-deep" strokeWidth={1.6} aria-label="Allowed" /> : <Minus className="mx-auto size-3.5 text-obsidian/20" aria-label="Not allowed" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </Section>
  )
}

function Notifications({ initial, emailConnected }: { initial: SettingsData['notifications']; emailConnected: boolean }) {
  const { busy, error, run } = useSave()
  const [prefs, setPrefs] = useState(() => Object.fromEntries(EVENTS.map((e) => [e.event, initial[e.event as keyof typeof initial] ?? { email: true, inApp: true }])))
  return (
    <Section
      id="email"
      index={10}
      title="Notifications"
      note={
        <>
          Email provider: {emailConnected ? <StatusBadge status="active" label="Connected" /> : <StatusBadge status="not_connected" tone="bad" label="Not connected" />} {!emailConnected && '— emails are queued and sent once a provider is configured.'}
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void run('/api/admin/settings/notifications', prefs, 'Notification preferences saved')
        }}
      >
        <ul className="border border-obsidian/10">
          {EVENTS.map((e) => (
            <li key={e.event} className="flex flex-wrap items-center justify-between gap-3 border-b border-obsidian/[0.07] bg-ivory/70 px-5 py-3 last:border-0">
              <span className="text-sm">
                {e.label}
                <span className="ml-3 font-mono text-[0.65rem] text-slate/70">{e.event}</span>
                <span className="block text-xs text-slate">To: {e.to}</span>
              </span>
              <span className="flex items-center gap-5">
                {(['email', 'inApp'] as const).map((ch) => (
                  <label key={ch} className="flex min-h-11 items-center gap-2 text-xs">
                    <input type="checkbox" checked={prefs[e.event]![ch]} onChange={(x) => setPrefs((p) => ({ ...p, [e.event]: { ...p[e.event]!, [ch]: x.target.checked } }))} className="size-4 accent-[#5420C7]" />
                    {ch === 'email' ? 'Email' : 'In-app'}
                  </label>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2">
          <Err e={error} />
          <ActionButton type="submit" tone="primary" disabled={busy}>
            {busy ? 'Saving' : 'Save notification preferences'}
          </ActionButton>
        </div>
      </form>
    </Section>
  )
}

function Checklist({ initial }: { initial: SettingsData['checklist'] }) {
  const { busy, error, run } = useSave()
  const [items, setItems] = useState(initial)
  const toggle = async (key: string) => {
    const body = Object.fromEntries(Object.entries(items).map(([k, v]) => [k, { done: k === key ? !v.done : v.done }]))
    const r = await run<SettingsData['checklist']>('/api/admin/settings/checklist', body, items[key]!.done ? `Reopened: ${key}` : `Confirmed: ${key}`)
    if (r) setItems(r)
  }
  return (
    <Section id="confirm" index={12} title="Launch checklist" note="Open commercial items the client must confirm before launch. Each confirmation records who and when.">
      <ul className="grid gap-px border border-obsidian/10 bg-obsidian/10 sm:grid-cols-2">
        {Object.entries(items).map(([t, v]) => (
          <li key={t} className="bg-ivory/70">
            <label className="flex min-h-14 cursor-pointer items-center gap-4 px-5 py-2">
              <input type="checkbox" checked={v.done} disabled={busy} onChange={() => toggle(t)} className="size-4 accent-[#5420C7]" />
              <span className="text-sm">
                <span className={cn(v.done && 'text-slate line-through')}>{t}</span>
                {v.done && v.byName && <span className="block text-xs text-slate">{v.byName} · {when(v.at)}</span>}
              </span>
              <span className="ml-auto">{v.done ? <StatusBadge status="resolved" label="Confirmed" /> : <StatusBadge status="pending" label="Open" />}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <Err e={error} />
      </div>
    </Section>
  )
}
