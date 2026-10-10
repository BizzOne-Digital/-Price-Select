'use client'

import Image from 'next/image'
import { Plus, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CategorySlug, Product, StockStatus } from '@/lib/types'
import { categories, categoryName, getCategory } from '@/lib/data/categories'
import { STOCK_LABEL } from '@/lib/data/products'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ActionButton, DataTable, DemoBanner, Field, PageHeader, Panel, StatusBadge, Tabs } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { myProducts, supplier } from './data'
import { Drawer, Err, FilePick, Tick } from './ui'

type Row = Pick<Product, 'sku' | 'name' | 'category' | 'price' | 'stock' | 'stockQty' | 'status' | 'compliance' | 'handlingDays'> & { image?: string; local?: boolean }

const SHIPPING = ['Standard parcel', 'Expedited parcel', 'LTL / freight', 'Local delivery']

const docsState = (c: Row['compliance']) => {
  const on = c.filter((d) => d.status === 'on_file').length
  return on === c.length ? { status: 'on_file', label: `Complete · ${on}/${c.length}` } : { status: c.some((d) => d.status === 'required') ? 'required' : 'pending', label: `${c.length - on} pending · ${on}/${c.length}` }
}

export function SupplierProducts() {
  const [rows, setRows] = useState<Row[]>(() => myProducts.map((p) => ({ ...p, image: p.images[0]?.src })))
  const [tab, setTab] = useState<'all' | 'published' | 'pending_review' | 'attention'>('all')
  const [open, setOpen] = useState(false)
  const shown = rows.filter((r) => (tab === 'all' ? true : tab === 'attention' ? r.status === 'flagged' || r.status === 'suspended' || r.compliance.some((d) => d.status !== 'on_file') : r.status === tab))

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Your listings on Price-Select. New products and material changes are reviewed by the Price-Select team before they publish."
        actions={
          <ActionButton tone="primary" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" strokeWidth={1.6} aria-hidden /> New product
          </ActionButton>
        }
      />
      <DemoBanner>Sample catalog. Submissions stay in this browser session and are not sent for review.</DemoBanner>

      <Panel pad={false}>
        <div className="px-5 pt-4">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: 'All', count: rows.length },
              { value: 'published', label: 'Published', count: rows.filter((r) => r.status === 'published').length },
              { value: 'pending_review', label: 'Pending review', count: rows.filter((r) => r.status === 'pending_review').length },
              { value: 'attention', label: 'Needs documents', count: rows.filter((r) => r.compliance.some((d) => d.status !== 'on_file')).length },
            ]}
          />
        </div>
        <DataTable
          caption="Your products"
          rows={shown}
          rowKey={(r) => r.sku}
          empty="No products in this view."
          columns={[
            {
              key: 'title',
              header: 'Product',
              sort: (r) => r.name,
              cell: (r) => (
                <span className="flex items-center gap-3">
                  <span className="relative size-11 shrink-0 overflow-hidden bg-pearl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {r.image && (r.local ? <img src={r.image} alt="" className="size-full object-cover" /> : <Image src={r.image} alt="" fill sizes="44px" className="object-cover" />)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{r.name}</span>
                    <span className="block text-xs tabular-nums text-slate">{r.sku}</span>
                  </span>
                </span>
              ),
            },
            { key: 'cat', header: 'Category', cell: (r) => <span className="text-slate">{categoryName(r.category)}</span> },
            { key: 'price', header: 'Price', align: 'right', sort: (r) => r.price, cell: (r) => money(r.price) },
            { key: 'stock', header: 'Stock', sort: (r) => r.stockQty, cell: (r) => <span className="flex items-center gap-3"><span className="w-10 text-right tabular-nums">{r.stockQty}</span><StatusBadge status={r.stock} label={STOCK_LABEL[r.stock]} /></span> },
            { key: 'status', header: 'Listing', cell: (r) => <StatusBadge status={r.status} /> },
            { key: 'docs', header: 'Compliance docs', cell: (r) => { const d = docsState(r.compliance); return <span title={r.compliance.map((c) => `${c.label}: ${c.status.replace('_', ' ')}`).join('\n')}><StatusBadge status={d.status} label={d.label} /></span> } },
          ]}
        />
      </Panel>
      <p className="mt-4 text-xs text-slate">Compliance documentation supports the review workflow and is not legal advice. Enhanced-review categories need certificates on file before publishing.</p>

      <NewProduct open={open} onClose={() => setOpen(false)} skus={rows.map((r) => r.sku)} onSubmit={(r) => setRows((s) => [r, ...s])} />
    </>
  )
}

type Draft = {
  sku: string; title: string; description: string; category: CategorySlug | ''; price: string; upc: string
  weight: string; l: string; w: string; h: string; availability: StockStatus; qty: string; handling: string
  shipping: string[]; images: File[]; docs: string[]; authentic: boolean
}
const BLANK: Draft = { sku: '', title: '', description: '', category: supplier.categories[0] ?? '', price: '', upc: '', weight: '', l: '', w: '', h: '', availability: 'in_stock', qty: '', handling: '2', shipping: ['Standard parcel'], images: [], docs: [], authentic: false }

function check(d: Draft, skus: string[]) {
  const e: Partial<Record<keyof Draft | 'dims', string>> = {}
  if (!/^[A-Z0-9][A-Z0-9-]{3,23}$/i.test(d.sku)) e.sku = '4–24 letters, numbers or dashes.'
  else if (skus.includes(d.sku.toUpperCase())) e.sku = 'This SKU already exists in your catalog.'
  if (d.title.trim().length < 4) e.title = 'Enter a product title.'
  if (d.description.trim().length < 40) e.description = `At least 40 characters (${d.description.trim().length}/40).`
  if (!d.category) e.category = 'Choose a category.'
  if (!(Number(d.price) > 0)) e.price = 'Enter a price above zero.'
  if (d.upc && !/^(\d{8}|\d{12,14})$/.test(d.upc)) e.upc = 'UPC/EAN is 8, 12, 13 or 14 digits.'
  if (!d.images.length) e.images = 'Add at least one product image.'
  if (!(Number(d.weight) > 0)) e.weight = 'Enter the shipping weight.'
  if (![d.l, d.w, d.h].every((v) => Number(v) > 0)) e.dims = 'Enter length, width and height.'
  if (d.availability !== 'made_to_order' && d.availability !== 'out_of_stock' && !(Number(d.qty) >= 0 && d.qty !== '')) e.qty = 'Enter available quantity.'
  if (!(Number(d.handling) >= 0 && d.handling !== '')) e.handling = 'Enter handling time in business days.'
  if (!d.shipping.length) e.shipping = 'Select at least one shipping option.'
  if (d.category && getCategory(d.category)?.reviewLevel === 'enhanced' && !d.docs.length) e.docs = 'This category requires compliance documents.'
  if (!d.authentic) e.authentic = 'Required before a listing can be submitted.'
  return e
}

function NewProduct({ open, onClose, skus, onSubmit }: { open: boolean; onClose: () => void; skus: string[]; onSubmit: (r: Row) => void }) {
  const toast = useToast()
  const [d, setD] = useState<Draft>(BLANK)
  const [tried, setTried] = useState(false)
  const [done, setDone] = useState<Row | null>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const e = tried ? check(d, skus) : {}
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }))
  const cat = d.category ? getCategory(d.category) : undefined

  useEffect(() => {
    const urls = d.images.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [d.images])

  const reset = () => {
    setD(BLANK)
    setTried(false)
    setDone(null)
  }
  const close = () => {
    onClose()
    if (done) reset()
  }

  const submit = () => {
    setTried(true)
    const errs = check(d, skus)
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus())
      return
    }
    const row: Row = {
      sku: d.sku.toUpperCase(), name: d.title.trim(), category: d.category as CategorySlug, price: Number(d.price),
      stock: d.availability, stockQty: Number(d.qty) || 0, handlingDays: Number(d.handling), status: 'pending_review',
      compliance: [{ label: 'Authenticity & new-condition confirmation', status: 'on_file' }, ...d.docs.map((n) => ({ label: n, status: 'pending' as const }))],
      image: d.images[0] ? URL.createObjectURL(d.images[0]) : undefined, local: true,
    }
    onSubmit(row)
    setDone(row)
    toast({ title: 'Submitted for review (demo)', body: `${row.sku} is pending review by the Price-Select team.` })
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      eyebrow={done ? 'Submitted' : 'New listing'}
      title={done ? 'Pending review' : 'New product'}
      footer={
        done ? (
          <div className="flex flex-wrap justify-end gap-3">
            <ActionButton onClick={reset}>Add another</ActionButton>
            <ActionButton tone="primary" onClick={close}>Done</ActionButton>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate">{tried && Object.keys(e).length ? `${Object.keys(e).length} field(s) need attention` : 'Listings publish only after admin review.'}</p>
            <div className="flex gap-3">
              <ActionButton tone="ghost" onClick={close}>Cancel</ActionButton>
              <ActionButton tone="primary" onClick={submit}>Submit for review</ActionButton>
            </div>
          </div>
        )
      }
    >
      {done ? (
        <div className="space-y-8">
          <p className="max-w-lg text-sm leading-relaxed text-slate">
            <span className="font-medium text-obsidian">{done.name}</span> ({done.sku}) has status <StatusBadge status="pending_review" />. The Price-Select team checks the description, images, pricing and documentation before the listing publishes. You will be notified of the decision.
          </p>
          {getCategory(done.category)?.reviewLevel === 'enhanced' && (
            <div className="border-l-2 border-warning bg-warning/[0.07] px-4 py-3 text-sm leading-relaxed">
              <p className="eyebrow text-[#9a6a24]">Enhanced review</p>
              <p className="mt-1 text-slate">{getCategory(done.category)?.reviewNote}</p>
            </div>
          )}
          <p className="text-xs text-slate">Demonstration only — nothing was uploaded or sent.</p>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-12"
          onSubmit={(ev) => {
            ev.preventDefault()
            submit()
          }}
        >
          <Section n="01" title="Identity">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="SKU"><input className="field uppercase tabular-nums" value={d.sku} onChange={(x) => set('sku', x.target.value)} aria-invalid={!!e.sku} placeholder="HEL-PS-3000" /><Err msg={e.sku} /></Field>
              <Field label="UPC / EAN (optional)"><input className="field tabular-nums" inputMode="numeric" value={d.upc} onChange={(x) => set('upc', x.target.value.replace(/\D/g, ''))} aria-invalid={!!e.upc} /><Err msg={e.upc} /></Field>
              <Field label="Title" className="md:col-span-2"><input className="field" value={d.title} onChange={(x) => set('title', x.target.value)} aria-invalid={!!e.title} /><Err msg={e.title} /></Field>
              <Field label="Description" className="md:col-span-2"><textarea rows={4} className="field resize-y" value={d.description} onChange={(x) => set('description', x.target.value)} aria-invalid={!!e.description} /><Err msg={e.description} /></Field>
              <Field label="Category">
                <select className="field" value={d.category} onChange={(x) => set('category', x.target.value as CategorySlug)} aria-invalid={!!e.category}>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}{c.reviewLevel === 'enhanced' ? ' — enhanced review' : ''}</option>
                  ))}
                </select>
                <Err msg={e.category} />
              </Field>
              <Field label="Price (USD, before tax & shipping)"><input className="field tabular-nums" type="number" min="0" step="0.01" value={d.price} onChange={(x) => set('price', x.target.value)} aria-invalid={!!e.price} /><Err msg={e.price} /></Field>
            </div>
            {cat?.reviewLevel === 'enhanced' && (
              <p className="mt-5 flex items-start gap-3 border-l-2 border-warning bg-warning/[0.07] px-4 py-3 text-xs leading-relaxed text-slate">
                <span className="eyebrow shrink-0 text-[#9a6a24]">Enhanced</span> {cat.reviewNote}
              </p>
            )}
            {cat && !supplier.categories.includes(cat.slug) && <p className="mt-3 text-xs text-slate">This category is outside your approved categories and will need approval first.</p>}
          </Section>

          <Section n="02" title="Images">
            <FilePick label="Product images" hint="JPG or PNG, at least 1600 px on the long edge" accept="image/*" multiple files={d.images.map((f) => f.name)} onChange={(l) => set('images', l ? Array.from(l) : [])} error={e.images} />
            {previews.length > 0 && (
              <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {previews.map((src, i) => (
                  <li key={src} className={cn('relative aspect-square overflow-hidden bg-pearl', i === 0 && 'sel-frame')}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Preview ${i + 1}: ${d.images[i]?.name}`} className="size-full object-cover" />
                    {i === 0 && <span className="absolute bottom-1 left-1 bg-ivory/95 px-1.5 py-0.5 meta text-[0.55rem] text-obsidian">Primary</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section n="03" title="Logistics">
            <div className="grid gap-6 md:grid-cols-4">
              <Field label="Weight (kg)"><input className="field tabular-nums" type="number" min="0" step="0.1" value={d.weight} onChange={(x) => set('weight', x.target.value)} aria-invalid={!!e.weight} /><Err msg={e.weight} /></Field>
              {(['l', 'w', 'h'] as const).map((k) => (
                <Field key={k} label={`${{ l: 'Length', w: 'Width', h: 'Height' }[k]} (cm)`}><input className="field tabular-nums" type="number" min="0" value={d[k]} onChange={(x) => set(k, x.target.value)} aria-invalid={!!e.dims && !(Number(d[k]) > 0)} /></Field>
              ))}
            </div>
            <Err msg={e.dims} />
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <Field label="Availability">
                <select className="field" value={d.availability} onChange={(x) => set('availability', x.target.value as StockStatus)}>
                  {(Object.keys(STOCK_LABEL) as StockStatus[]).map((s) => <option key={s} value={s}>{STOCK_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Quantity available"><input className="field tabular-nums" type="number" min="0" value={d.qty} onChange={(x) => set('qty', x.target.value)} aria-invalid={!!e.qty} disabled={d.availability === 'made_to_order' || d.availability === 'out_of_stock'} /><Err msg={e.qty} /></Field>
              <Field label="Handling time (business days)"><input className="field tabular-nums" type="number" min="0" value={d.handling} onChange={(x) => set('handling', x.target.value)} aria-invalid={!!e.handling} /><Err msg={e.handling} /></Field>
            </div>
            <fieldset className="mt-8">
              <legend className="meta text-[0.62rem] text-slate">Shipping options</legend>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {SHIPPING.map((o) => (
                  <Tick key={o} checked={d.shipping.includes(o)} onChange={(v) => set('shipping', v ? [...d.shipping, o] : d.shipping.filter((x) => x !== o))}>{o}</Tick>
                ))}
              </div>
              <Err msg={e.shipping} />
            </fieldset>
          </Section>

          <Section n="04" title="Compliance">
            <FilePick label={`Compliance documents${cat?.reviewLevel === 'enhanced' ? '' : ' (optional)'}`} hint="Certificates, manuals, warranty terms — PDF" accept=".pdf,image/*" multiple files={d.docs} onChange={(l) => set('docs', l ? Array.from(l).map((f) => f.name) : [])} error={e.docs} />
            <div className="mt-6 border-t border-obsidian/10 pt-6">
              <Tick checked={d.authentic} onChange={(v) => set('authentic', v)} error={e.authentic}>
                <span className="inline-flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-deep" strokeWidth={1.4} aria-hidden /> I confirm this product is authentic and new, and the information above is accurate.</span>
              </Tick>
            </div>
          </Section>
          <button type="submit" className="sr-only">Submit for review</button>
        </form>
      )}
    </Drawer>
  )
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-6 flex items-baseline gap-3 border-b border-obsidian/10 pb-3">
        <span className="meta text-[0.6rem] text-gold-deep">{n}</span>
        <span className="font-display text-2xl font-light">{title}</span>
      </h3>
      {children}
    </section>
  )
}
