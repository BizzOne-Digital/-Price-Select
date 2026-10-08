'use client'

import Image from 'next/image'
import { useState, type ReactNode } from 'react'
import { Check, Minus } from 'lucide-react'
import { ActionButton, Field, Panel, StatusBadge } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { PERMISSIONS, ROLE_LABEL, type Permission } from '@/lib/auth'
import { products } from '@/lib/data/products'
import { date, money } from '@/lib/format'
import { SERVICE_TARGETS, TO_CONFIRM } from '@/lib/site'
import { categories } from '@/lib/data/categories'
import type { Notification, Role } from '@/lib/types'
import { cn } from '@/lib/utils'
import { inputCls } from './ui'

const SECTIONS = [
  ['targets', 'Service targets'],
  ['shipping', 'Shipping rules'],
  ['fees', 'Fees & commission'],
  ['promotion', 'Seasonal promotion'],
  ['policies', 'Site policies'],
  ['content', 'Site content'],
  ['returns', 'Returns responsibility'],
  ['integrations', 'Integrations & security'],
  ['roles', 'Roles & permissions'],
  ['email', 'Notification emails'],
  ['audit', 'Audit log'],
  ['confirm', 'Launch checklist'],
] as const

const EVENTS: { event: Notification['event']; label: string; to: string }[] = [
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

const AUDIT = [
  { at: '2026-10-06T00:10:00Z', who: 'Support team', what: 'Escalated RC-3022 — supplier acknowledgment past target' },
  { at: '2026-10-05T18:00:00Z', who: 'Demo administrator', what: 'Moved Orbit Organic Crib Bedding Set to Flagged — certificate pending' },
  { at: '2026-10-03T10:20:00Z', who: 'Demo administrator', what: 'Set Brightline Tools application to Applied' },
  { at: '2026-10-02T09:00:00Z', who: 'Demo administrator', what: 'Updated E-Bikes & Mobility review level to Enhanced' },
  { at: '2026-09-29T10:00:00Z', who: 'System', what: 'Supplier application received: Meridian Outdoor Goods' },
]

function Section({ id, index, title, note, children }: { id: string; index: number; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-28 border-t border-obsidian/10 pt-10">
      <div className="mb-6 grid gap-3 lg:grid-cols-[220px_1fr]">
        <p className="meta text-[0.6rem] text-gold-deep">{String(index).padStart(2, '0')}</p>
        <div>
          <h2 id={`${id}-h`} className="font-display text-3xl font-light tracking-[-0.01em]">
            {title}
          </h2>
          {note && <p className="mt-2 max-w-2xl text-sm text-slate">{note}</p>}
        </div>
      </div>
      <div className="lg:pl-[232px]">{children}</div>
    </section>
  )
}

const TBC = 'To be confirmed'

export function SettingsBoard() {
  const toast = useToast()
  const saved = (what: string) => toast({ title: `${what} saved (demo)`, body: 'Stored in this session only until settings are connected to the database.' })
  const candidates = products.filter((p) => p.status === 'published').sort((a, b) => Number(!!b.seasonalPrice) - Number(!!a.seasonalPrice))
  const [promo, setPromo] = useState<Record<string, string>>(() => Object.fromEntries(products.filter((p) => p.seasonal && p.seasonalPrice).slice(0, 4).map((p) => [p.slug, String(p.seasonalPrice)])))
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const chosen = Object.keys(promo)

  return (
    <div className="space-y-14">
      <nav aria-label="Settings sections" className="no-scrollbar -mt-4 flex gap-5 overflow-x-auto border-b border-obsidian/10 pb-3">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="whitespace-nowrap py-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate hover:text-obsidian">
            {label}
          </a>
        ))}
      </nav>

      <Section id="targets" index={1} title="Supplier service targets" note="Initial placeholders. Each target must be agreed with suppliers before launch and is shown to suppliers in their portal.">
        <form onSubmit={(e) => (e.preventDefault(), saved('Service targets'))} className="grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2">
          {SERVICE_TARGETS.map((t) => (
            <div key={t.label} className="bg-ivory/70 p-5">
              <Field label={t.label} hint={`${t.detail} Placeholder — to agree with suppliers.`}>
                <span className="flex gap-2">
                  <input defaultValue={t.value} className={cn(inputCls, 'w-28')} aria-label={`${t.label} value`} />
                  <input defaultValue={t.unit} className={inputCls} aria-label={`${t.label} unit`} />
                </span>
              </Field>
            </div>
          ))}
          <div className="bg-ivory/70 p-5 md:col-span-2">
            <ActionButton type="submit" tone="primary">Save targets</ActionButton>
          </div>
        </form>
      </Section>

      <Section id="shipping" index={2} title="Shipping rules" note="Carriers and rates are not yet confirmed. Supplier-quoted freight applies to oversized items.">
        <form onSubmit={(e) => (e.preventDefault(), saved('Shipping rules'))} className="grid gap-6 sm:grid-cols-2">
          <Field label="Carriers" hint={TBC}>
            <input className={inputCls} placeholder={TBC} />
          </Field>
          <Field label="Free-shipping threshold (USD)" hint={TBC}>
            <input inputMode="decimal" className={inputCls} placeholder={TBC} />
          </Field>
          <Field label="Freight / oversized items" hint="Quoted by the supplier per order">
            <select className={inputCls} defaultValue="supplier">
              <option value="supplier">Supplier quote</option>
              <option value="flat">Flat rate (to be confirmed)</option>
            </select>
          </Field>
          <Field label="Default packaging" hint="Neutral packaging and Price-Select documents where the supplier supports it">
            <select className={inputCls} defaultValue="blind">
              <option value="blind">Blind ship where possible</option>
              <option value="supplier">Supplier packaging</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <ActionButton type="submit" tone="primary">Save shipping rules</ActionButton>
          </div>
        </form>
      </Section>

      <Section id="fees" index={3} title="Fees, commission & margin" note="No rates have been agreed. Fields are intentionally empty until the commercial model is confirmed.">
        <form onSubmit={(e) => (e.preventDefault(), saved('Fee settings'))} className="grid gap-6 sm:grid-cols-3">
          {['Supplier commission (%)', 'Marketplace margin (%)', 'Payment processing pass-through'].map((l) => (
            <Field key={l} label={l} hint={TBC}>
              <input className={inputCls} placeholder={TBC} inputMode="decimal" />
            </Field>
          ))}
          <div className="sm:col-span-3">
            <ActionButton type="submit" tone="primary">Save fees</ActionButton>
          </div>
        </form>
      </Section>

      <Section id="promotion" index={4} title="Seasonal promotion" note={<>Campaign: <em className="font-display text-base text-obsidian">“Buy summer in winter. Save.”</em> Choose three or four products and set a special price for each.</>}>
        <Panel title={`${chosen.length} of 4 selected`} pad={false}>
          <ul className="divide-y divide-obsidian/[0.07]">
            {candidates.map((p) => {
              const on = p.slug in promo
              const full = !on && chosen.length >= 4
              const price = Number(promo[p.slug])
              const invalid = on && promo[p.slug] !== '' && (!(price > 0) || price >= p.price)
              return (
                <li key={p.slug} className={cn('flex flex-wrap items-center gap-4 px-5 py-3', full && 'opacity-50')}>
                  <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-4">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={full}
                      onChange={() => setPromo((s) => (on ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== p.slug)) : { ...s, [p.slug]: '' }))}
                      className="size-4 accent-[#0f766e]"
                    />
                    <span className="relative size-10 shrink-0 overflow-hidden bg-pearl">
                      <Image src={p.images[0].src} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="text-sm">
                      {p.name}
                      <span className="block text-xs text-slate">Regular {money(p.price)}</span>
                    </span>
                  </label>
                  {on && (
                    <label className="w-40">
                      <span className="sr-only">Special price for {p.name}</span>
                      <input
                        inputMode="decimal"
                        value={promo[p.slug]}
                        onChange={(e) => setPromo((s) => ({ ...s, [p.slug]: e.target.value }))}
                        placeholder="Special price"
                        aria-invalid={invalid}
                        className={cn(inputCls, invalid && 'border-danger')}
                      />
                    </label>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <ActionButton
            tone="primary"
            disabled={chosen.length < 3 || chosen.some((k) => !(Number(promo[k]) > 0))}
            onClick={() => saved('Seasonal promotion')}
          >
            Save campaign
          </ActionButton>
          <p className="text-xs text-slate">Select 3–4 products with a special price below the regular price. Prices shown are demonstration values.</p>
        </div>
      </Section>

      <Section id="policies" index={5} title="Site policies" note="Policy text must be supplied and reviewed by the client before launch.">
        <div className="grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-3">
          {['Privacy policy', 'Terms of service', 'Returns policy'].map((p) => (
            <div key={p} className="flex flex-col bg-ivory/70 p-5">
              <p className="flex items-center justify-between gap-3 text-sm font-medium">
                {p} <StatusBadge status="awaiting" tone="warn" label="Content to be supplied" />
              </p>
              <label className="mt-4 block flex-1">
                <span className="sr-only">{p} content</span>
                <textarea rows={5} placeholder="Content to be supplied" className="h-full w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none" />
              </label>
              <ActionButton className="mt-3 self-start" onClick={() => saved(p)}>
                Save draft
              </ActionButton>
            </div>
          ))}
        </div>
      </Section>

      <Section id="content" index={6} title="Site content" note="Storefront copy managed by administrators. Saved drafts are demonstration only until the content store is connected.">
        <form onSubmit={(e) => (e.preventDefault(), saved('Site content'))} className="grid gap-6 sm:grid-cols-2">
          <Field label="Homepage headline">
            <input className={inputCls} defaultValue="Price-Select. Just for you." />
          </Field>
          <Field label="Seasonal campaign headline">
            <input className={inputCls} defaultValue="Buy summer in winter. Save." />
          </Field>
          <Field label="Seasonal campaign description" className="sm:col-span-2">
            <textarea rows={3} className="w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none" defaultValue="Price-Select, just for you: three to four products chosen for the season ahead, at special off-season pricing for a limited window." />
          </Field>
          <Field label="Pricing notice" hint="Shown on product pages, cart and footer">
            <input className={inputCls} defaultValue="Prices exclude applicable taxes and shipping." />
          </Field>
          <Field label="Contact email" hint="Contact page is email only">
            <input type="email" className={inputCls} defaultValue="julio.rivera.ht@gmail.com" />
          </Field>
          <div className="sm:col-span-2">
            <ActionButton type="submit" tone="primary">Save content</ActionButton>
          </div>
        </form>
      </Section>

      <Section id="returns" index={7} title="Returns responsibility" note="Return rules by category, and who pays for return shipping and defective or damaged items. Configurable by policy and supplier agreement; values are to be confirmed.">
        <form onSubmit={(e) => (e.preventDefault(), saved('Returns responsibility'))} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Return shipping (change of mind)" hint={TBC}>
              <select className={inputCls} defaultValue="">
                <option value="">{TBC}</option>
                <option>Customer</option>
                <option>Supplier</option>
                <option>Price-Select</option>
              </select>
            </Field>
            <Field label="Defective or damaged items" hint={TBC}>
              <select className={inputCls} defaultValue="">
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
                    <span className="sr-only">Return window for {c.name}</span>
                    <input className={inputCls} placeholder={`Days — ${TBC.toLowerCase()}`} inputMode="numeric" />
                  </label>
                </li>
              ))}
            </ul>
          </Panel>
          <ActionButton type="submit" tone="primary">Save return rules</ActionButton>
        </form>
      </Section>

      <Section id="integrations" index={8} title="Integrations & security" note="Status of the services the marketplace depends on. Nothing below is connected in this demonstration.">
        <div className="grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2">
          {[
            ['Payment provider', 'Secure hosted payments; raw card details are never stored'],
            ['Email provider', 'Order, shipping, delay, refund and escalation notifications'],
            ['Shipping carriers', 'Rates, labels and tracking'],
            ['Analytics', 'Storefront and operations analytics'],
            ['Accounting', 'Sales, refunds and supplier payouts'],
            ['Supplier API / EDI', 'Inventory and order exchange; secure manual upload as fallback'],
          ].map(([t, d]) => (
            <div key={t} className="flex items-start justify-between gap-4 bg-ivory/70 p-5">
              <span>
                <span className="block text-sm font-medium">{t}</span>
                <span className="mt-1 block text-xs text-slate">{d}</span>
              </span>
              <StatusBadge status="not_connected" tone="bad" label="Not connected" />
            </div>
          ))}
        </div>
        <ul className="mt-6 grid gap-px border border-obsidian/10 bg-obsidian/10 md:grid-cols-2">
          {[
            ['Encryption in transit and at rest', 'Configured at deployment (TLS + encrypted database storage)'],
            ['Role-based access control', 'Access model defined below; enforced server-side once auth is connected'],
            ['Audit logs', 'Administrative and supplier actions; see the audit log'],
            ['Backups & recovery', 'Scheduled backups and a tested recovery procedure, set up at deployment'],
            ['Error monitoring', 'Application error monitoring, set up at deployment'],
          ].map(([t, d]) => (
            <li key={t} className="flex items-start justify-between gap-4 bg-ivory/70 p-5">
              <span>
                <span className="block text-sm font-medium">{t}</span>
                <span className="mt-1 block text-xs text-slate">{d}</span>
              </span>
              <StatusBadge status="pending" label="At deployment" />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="roles" index={9} title="Roles & permissions" note="Defined in the access model. Enforcement is applied server-side once authentication is connected.">
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

      <Section id="email" index={10} title="Notification emails" note={<>Email provider: <StatusBadge status="not_connected" tone="bad" label="Not connected" /> — events are defined; nothing is sent.</>}>
        <ul className="border border-obsidian/10">
          {EVENTS.map((e) => (
            <li key={e.event} className="flex flex-wrap items-center justify-between gap-3 border-b border-obsidian/[0.07] bg-ivory/70 px-5 py-3 last:border-0">
              <span className="text-sm">
                {e.label}
                <span className="ml-3 font-mono text-[0.65rem] text-slate/70">{e.event}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className="text-xs text-slate">To: {e.to}</span>
                <StatusBadge status="template" tone="muted" label="Template pending" />
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="audit" index={11} title="Audit log" note="Demonstration entries. A persistent, tamper-evident log is created when the database is connected.">
        <ol className="border-l border-obsidian/10">
          {AUDIT.map((a) => (
            <li key={a.at} className="relative pb-6 pl-6 last:pb-0">
              <span aria-hidden className="absolute -left-[3px] top-1.5 size-[5px] rounded-full bg-gold" />
              <p className="text-sm">{a.what}</p>
              <p className="mt-1 meta text-[0.58rem] text-slate">
                {a.who} · {date(a.at)}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="confirm" index={12} title="Launch checklist" note="Open items the client must confirm before launch.">
        <ul className="grid gap-px border border-obsidian/10 bg-obsidian/10 sm:grid-cols-2">
          {TO_CONFIRM.map((t) => (
            <li key={t} className="bg-ivory/70">
              <label className="flex min-h-14 cursor-pointer items-center gap-4 px-5">
                <input type="checkbox" checked={!!checked[t]} onChange={() => setChecked((s) => ({ ...s, [t]: !s[t] }))} className="size-4 accent-[#0f766e]" />
                <span className={cn('text-sm', checked[t] && 'text-slate line-through')}>{t}</span>
                <span className="ml-auto">{checked[t] ? <StatusBadge status="resolved" label="Confirmed" /> : <StatusBadge status="pending" label="Open" />}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  )
}
