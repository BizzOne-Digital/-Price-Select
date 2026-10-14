'use client'

import Image from 'next/image'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Category, ProductAdmin } from '@/lib/types'
import { STOCK_LABEL } from '@/lib/labels'
import { money } from '@/lib/format'
import { ApiError, api, errorText } from '@/lib/client/api'
import { privateAssetUrl, uploadPrivate } from '@/lib/client/upload'
import { ActionButton, DataTable, Field, PageHeader, Panel, StatusBadge, Tabs } from '@/components/dashboard/kit'
import { useToast } from '@/components/ui/toast'
import { dateTime } from './data'
import { Drawer, Err, FilePick, Tick } from './ui'

export type SupplierCategory = Pick<Category, 'slug' | 'name' | 'reviewLevel' | 'reviewNote'> & { requiredDocuments: string[] }

const EDITABLE = ['draft', 'rejected']
const ATTACHABLE = ['draft', 'rejected', 'pending_review', 'flagged']

const docsState = (c: ProductAdmin['compliance']) => {
  if (!c.length) return { status: 'muted', label: 'None required' }
  const on = c.filter((d) => d.status === 'on_file').length
  return on === c.length ? { status: 'on_file', label: `Complete · ${on}/${c.length}` } : { status: c.some((d) => d.status === 'required' || d.status === 'rejected') ? 'required' : 'pending', label: `${c.length - on} open · ${on}/${c.length}` }
}

export function SupplierProducts({ initial, categories }: { initial: ProductAdmin[]; categories: SupplierCategory[] }) {
  const [rows, setRows] = useState(initial)
  const [tab, setTab] = useState<'all' | 'draft' | 'pending_review' | 'published' | 'attention'>('all')
  const [open, setOpen] = useState<string | 'new' | null>(null)
  const attention = (r: ProductAdmin) => ['rejected', 'flagged', 'suspended'].includes(r.status) || r.compliance.some((d) => d.status === 'required' || d.status === 'rejected')
  const shown = rows.filter((r) => (tab === 'all' ? true : tab === 'attention' ? attention(r) : tab === 'draft' ? EDITABLE.includes(r.status) : r.status === tab))
  const catName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug
  const upsert = (p: ProductAdmin) => setRows((s) => (s.some((x) => x.id === p.id) ? s.map((x) => (x.id === p.id ? p : x)) : [p, ...s]))

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title="Products"
        description="Your listings on Price-Select. Drafts are reviewed by the Price-Select team, who publish approved listings and images. Live listings can only be changed through Price-Select."
        actions={
          <ActionButton tone="primary" onClick={() => setOpen('new')} disabled={!categories.length}>
            <Plus className="size-3.5" strokeWidth={1.6} aria-hidden /> New product
          </ActionButton>
        }
      />
      {!categories.length && <p className="mb-6 text-sm text-danger">No approved categories are on your account. Contact Price-Select before creating listings.</p>}

      <Panel pad={false}>
        <div className="px-5 pt-4">
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: 'All', count: rows.length },
              { value: 'draft', label: 'Drafts', count: rows.filter((r) => EDITABLE.includes(r.status)).length },
              { value: 'pending_review', label: 'Pending review', count: rows.filter((r) => r.status === 'pending_review').length },
              { value: 'published', label: 'Published', count: rows.filter((r) => r.status === 'published').length },
              { value: 'attention', label: 'Needs attention', count: rows.filter(attention).length },
            ]}
          />
        </div>
        <DataTable
          caption="Your products"
          rows={shown}
          rowKey={(r) => r.id}
          empty={rows.length ? 'No products in this view.' : 'No products yet. Create your first listing.'}
          columns={[
            {
              key: 'title',
              header: 'Product',
              sort: (r) => r.name,
              cell: (r) => (
                <button onClick={() => setOpen(r.id)} className="flex items-center gap-3 text-left">
                  <span className="relative size-11 shrink-0 overflow-hidden bg-pearl">
                    {r.images[0] ? (
                      <Image src={r.images[0].src} alt="" fill sizes="44px" className="object-cover" />
                    ) : r.stagedImages[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={privateAssetUrl(r.stagedImages[0].assetId)} alt="" className="size-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="link-line block font-medium">{r.name}</span>
                    <span className="block text-xs tabular-nums text-slate">{r.sku}</span>
                  </span>
                </button>
              ),
            },
            { key: 'cat', header: 'Category', cell: (r) => <span className="text-slate">{catName(r.category)}</span> },
            { key: 'price', header: 'Price', align: 'right', sort: (r) => r.price, cell: (r) => money(r.price) },
            { key: 'stock', header: 'Available', sort: (r) => r.inventory.available, cell: (r) => <span className="flex items-center gap-3"><span className="w-10 text-right tabular-nums">{r.inventory.available}</span><StatusBadge status={r.stock} label={STOCK_LABEL[r.stock]} /></span> },
            { key: 'status', header: 'Listing', cell: (r) => <span title={r.statusReason}><StatusBadge status={r.status} /></span> },
            { key: 'docs', header: 'Compliance docs', cell: (r) => { const d = docsState(r.compliance); return <span title={r.compliance.map((c) => `${c.label}: ${c.status.replace('_', ' ')}`).join('\n')}><StatusBadge status={d.status} label={d.label} /></span> } },
          ]}
        />
      </Panel>
      <p className="mt-4 text-xs text-slate">Compliance documentation supports the review workflow and is not legal advice. Enhanced-review categories need certificates on file and a Price-Select sign-off before publishing.</p>

      <ProductEditor key={open ?? 'closed'} open={!!open} product={open && open !== 'new' ? rows.find((r) => r.id === open) ?? null : null} categories={categories} onClose={() => setOpen(null)} onSaved={(p) => (upsert(p), setOpen(p.id))} />
    </>
  )
}

type Draft = {
  name: string; brand: string; category: string; price: string; sku: string; summary: string; description: string
  specs: { label: string; value: string }[]; upc: string; weightKg: string; dimensions: string; handlingDays: string
  deliveryEstimate: string; madeToOrder: boolean; onHand: string
}
const toDraft = (p: ProductAdmin | null, cat: string): Draft =>
  p
    ? { name: p.name, brand: p.brand, category: p.category, price: String(p.price), sku: p.sku, summary: p.summary, description: p.description, specs: p.specs.length ? p.specs : [{ label: '', value: '' }], upc: p.upc ?? '', weightKg: p.weightKg ? String(p.weightKg) : '', dimensions: p.dimensions, handlingDays: String(p.handlingDays), deliveryEstimate: p.deliveryEstimate, madeToOrder: p.madeToOrder, onHand: String(p.inventory.onHand) }
    : { name: '', brand: '', category: cat, price: '', sku: '', summary: '', description: '', specs: [{ label: '', value: '' }], upc: '', weightKg: '', dimensions: '', handlingDays: '2', deliveryEstimate: '', madeToOrder: false, onHand: '0' }

type Errs = Partial<Record<keyof Draft, string>>

function check(d: Draft): Errs {
  const e: Errs = {}
  if (d.name.trim().length < 2) e.name = 'Enter a product name.'
  if (!d.category) e.category = 'Choose a category.'
  if (!(Number(d.price) > 0)) e.price = 'Enter a price above zero.'
  if (!/^[A-Z0-9][A-Z0-9._-]{1,39}$/i.test(d.sku.trim())) e.sku = '2–40 letters, numbers, dot, dash or underscore.'
  if (d.upc && !/^\d{8,14}$/.test(d.upc)) e.upc = 'UPC/EAN is 8–14 digits.'
  if (d.weightKg && !(Number(d.weightKg) >= 0)) e.weightKg = 'Enter a weight in kg.'
  if (!/^\d{1,3}$/.test(d.handlingDays)) e.handlingDays = 'Whole business days (0–120).'
  if (!/^\d{1,7}$/.test(d.onHand)) e.onHand = 'Whole number.'
  if (d.specs.some((s) => (s.label.trim() && !s.value.trim()) || (!s.label.trim() && s.value.trim()))) e.specs = 'Each spec needs a label and a value.'
  return e
}

const payload = (d: Draft) => ({
  name: d.name.trim(), brand: d.brand.trim(), category: d.category, price: Number(d.price), sku: d.sku.trim().toUpperCase(),
  summary: d.summary.trim(), description: d.description.trim(),
  specs: d.specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
  upc: d.upc, weightKg: Number(d.weightKg) || 0, dimensions: d.dimensions.trim(), handlingDays: Number(d.handlingDays),
  deliveryEstimate: d.deliveryEstimate.trim(), madeToOrder: d.madeToOrder, onHand: Number(d.onHand),
})

/** Map Zod issue paths from the server onto form fields. */
const fieldErrors = (e: unknown): Errs => {
  if (!(e instanceof ApiError) || !Array.isArray(e.details)) return {}
  const out: Errs = {}
  for (const x of e.details as { path?: string; message?: string }[]) {
    const k = x?.path?.split('.')[0] as keyof Draft | undefined
    if (k && x.message && !out[k]) out[k] = x.message
  }
  return out
}

function ProductEditor({ open, product, categories, onClose, onSaved }: { open: boolean; product: ProductAdmin | null; categories: SupplierCategory[]; onClose: () => void; onSaved: (p: ProductAdmin) => void }) {
  const toast = useToast()
  const [d, setD] = useState<Draft>(() => toDraft(product, categories[0]?.slug ?? ''))
  const [tried, setTried] = useState(false)
  const [serverErrs, setServerErrs] = useState<Errs>({})
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState<'save' | 'submit' | null>(null)
  const [alt, setAlt] = useState('')
  const editable = !product || EDITABLE.includes(product.status)
  const attachable = !!product && ATTACHABLE.includes(product.status)
  const e = { ...(tried ? check(d) : {}), ...serverErrs }
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => (setD((s) => ({ ...s, [k]: v })), setServerErrs((s) => ({ ...s, [k]: undefined })))
  const cat = categories.find((c) => c.slug === d.category)

  const save = async (): Promise<ProductAdmin | null> => {
    setTried(true)
    setError(undefined)
    if (Object.keys(check(d)).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus())
      return null
    }
    try {
      const p = product ? await api<ProductAdmin>(`/api/supplier/products/${product.id}`, { method: 'PATCH', body: payload(d) }) : await api<ProductAdmin>('/api/supplier/products', { body: payload(d) })
      setServerErrs({})
      onSaved(p)
      return p
    } catch (x) {
      setServerErrs(fieldErrors(x))
      setError(errorText(x))
      return null
    }
  }

  const attach = async (body: Record<string, unknown>, file: File, purpose: 'product_image' | 'product_document', onProgress: (p: number) => void, label?: string) => {
    if (!product) return
    onProgress(0.05)
    const a = await uploadPrivate(file, purpose, label?.slice(0, 120), onProgress)
    onSaved(await api<ProductAdmin>(`/api/supplier/products/${product.id}/attach`, { body: { assetId: a.id, ...body } }))
  }

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-slate">{editable ? 'Only Price-Select can publish a listing.' : `This listing is ${product?.status.replace('_', ' ')}; details are locked.`}</p>
      <div className="flex gap-3">
        <ActionButton tone="ghost" onClick={onClose}>Close</ActionButton>
        {editable && (
          <ActionButton disabled={!!busy} onClick={async () => { setBusy('save'); const p = await save(); setBusy(null); if (p) toast({ title: product ? 'Draft saved' : 'Draft created', body: product ? undefined : 'Add images and documents, then submit for review.' }) }}>
            {busy === 'save' ? 'Saving…' : product ? 'Save draft' : 'Create draft'}
          </ActionButton>
        )}
        {editable && product && (
          <ActionButton
            tone="primary"
            disabled={!!busy}
            onClick={async () => {
              setBusy('submit')
              const p = await save()
              if (p) {
                try {
                  onSaved(await api<ProductAdmin>(`/api/supplier/products/${p.id}/submit`, { method: 'POST' }))
                  toast({ title: 'Submitted for review', body: `${p.sku} is pending review by the Price-Select team.` })
                } catch (x) {
                  setError(errorText(x))
                }
              }
              setBusy(null)
            }}
          >
            {busy === 'submit' ? 'Submitting…' : 'Submit for review'}
          </ActionButton>
        )}
      </div>
    </div>
  )

  return (
    <Drawer open={open} onClose={onClose} eyebrow={product ? `${product.sku} · ${product.status.replace('_', ' ')}` : 'New listing'} title={product ? product.name : 'New product'} footer={footer}>
      <form noValidate className="space-y-12" onSubmit={(ev) => ev.preventDefault()}>
        {product?.statusReason && ['rejected', 'flagged', 'suspended', 'withdrawn'].includes(product.status) && (
          <p className="border-l-2 border-danger/60 bg-danger/[0.05] px-4 py-3 text-sm" role="status">
            <span className="eyebrow mr-2 text-danger">Price-Select note</span>
            {product.statusReason}
          </p>
        )}
        {error && <p className="border-l-2 border-danger/60 px-4 py-2 text-sm text-danger" role="alert">{error}</p>}

        <fieldset disabled={!editable} className="space-y-12">
          <Section n="01" title="Identity">
            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Product name" className="md:col-span-2"><input className="field" value={d.name} onChange={(x) => set('name', x.target.value)} aria-invalid={!!e.name} /><Err msg={e.name} /></Field>
              <Field label="Brand"><input className="field" value={d.brand} onChange={(x) => set('brand', x.target.value)} /><Err msg={e.brand} /></Field>
              <Field label="SKU"><input className="field uppercase tabular-nums" value={d.sku} onChange={(x) => set('sku', x.target.value)} aria-invalid={!!e.sku} /><Err msg={e.sku} /></Field>
              <Field label="Category">
                <select className="field" value={d.category} onChange={(x) => set('category', x.target.value)} aria-invalid={!!e.category}>
                  {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}{c.reviewLevel === 'enhanced' ? ' — enhanced review' : ''}</option>)}
                </select>
                <Err msg={e.category} />
              </Field>
              <Field label="Price (USD, before tax & shipping)"><input className="field tabular-nums" type="number" min="0" step="0.01" value={d.price} onChange={(x) => set('price', x.target.value)} aria-invalid={!!e.price} /><Err msg={e.price} /></Field>
              <Field label="UPC / EAN (optional)"><input className="field tabular-nums" inputMode="numeric" value={d.upc} onChange={(x) => set('upc', x.target.value.replace(/\D/g, ''))} aria-invalid={!!e.upc} /><Err msg={e.upc} /></Field>
            </div>
            {cat?.reviewLevel === 'enhanced' && (
              <p className="mt-5 flex items-start gap-3 border-l-2 border-warning bg-warning/[0.07] px-4 py-3 text-xs leading-relaxed text-slate">
                <span className="eyebrow shrink-0 text-[#9a6a24]">Enhanced</span> {cat.reviewNote ?? 'Certificates and a Price-Select sign-off are required before publishing.'}
              </p>
            )}
          </Section>

          <Section n="02" title="Description">
            <div className="grid gap-6">
              <Field label="Summary (one or two sentences)"><textarea rows={2} maxLength={300} className="field resize-y" value={d.summary} onChange={(x) => set('summary', x.target.value)} aria-invalid={!!e.summary} /><Err msg={e.summary} /></Field>
              <Field label="Description"><textarea rows={5} className="field resize-y" value={d.description} onChange={(x) => set('description', x.target.value)} aria-invalid={!!e.description} /><Err msg={e.description} /></Field>
              <fieldset>
                <legend className="meta text-[0.62rem] text-slate">Specifications</legend>
                <ul className="mt-3 space-y-2">
                  {d.specs.map((s, i) => (
                    <li key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                      <label><span className="sr-only">Spec {i + 1} label</span><input className="field text-sm" placeholder="Label, e.g. Power" value={s.label} onChange={(x) => set('specs', d.specs.map((y, j) => (j === i ? { ...y, label: x.target.value } : y)))} /></label>
                      <label><span className="sr-only">Spec {i + 1} value</span><input className="field text-sm" placeholder="Value, e.g. 400 W" value={s.value} onChange={(x) => set('specs', d.specs.map((y, j) => (j === i ? { ...y, value: x.target.value } : y)))} /></label>
                      <button type="button" aria-label={`Remove spec ${i + 1}`} onClick={() => set('specs', d.specs.filter((_, j) => j !== i))} className="grid size-10 place-items-center text-slate hover:text-danger"><Trash2 className="size-4" strokeWidth={1.4} /></button>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => set('specs', [...d.specs, { label: '', value: '' }])} disabled={d.specs.length >= 40} className="link-line mt-3 meta text-[0.6rem] text-slate hover:text-obsidian">Add specification</button>
                <Err msg={e.specs} />
              </fieldset>
            </div>
          </Section>

          <Section n="03" title="Logistics & stock">
            <div className="grid gap-6 md:grid-cols-3">
              <Field label="Weight (kg)"><input className="field tabular-nums" type="number" min="0" step="0.1" value={d.weightKg} onChange={(x) => set('weightKg', x.target.value)} aria-invalid={!!e.weightKg} /><Err msg={e.weightKg} /></Field>
              <Field label="Dimensions" className="md:col-span-2"><input className="field" placeholder="e.g. 172 × 113 × 3 cm" value={d.dimensions} onChange={(x) => set('dimensions', x.target.value)} /><Err msg={e.dimensions} /></Field>
              <Field label="Handling time (business days)"><input className="field tabular-nums" type="number" min="0" max="120" value={d.handlingDays} onChange={(x) => set('handlingDays', x.target.value)} aria-invalid={!!e.handlingDays} /><Err msg={e.handlingDays} /></Field>
              <Field label="Delivery estimate"><input className="field" placeholder="e.g. 4–7 business days" value={d.deliveryEstimate} onChange={(x) => set('deliveryEstimate', x.target.value)} /><Err msg={e.deliveryEstimate} /></Field>
              <Field label="On hand"><input className="field tabular-nums" type="number" min="0" value={d.onHand} onChange={(x) => set('onHand', x.target.value)} aria-invalid={!!e.onHand} /><Err msg={e.onHand} /></Field>
            </div>
            <div className="mt-6">
              <Tick checked={d.madeToOrder} onChange={(v) => set('madeToOrder', v)}>Made to order (sold without stock on hand)</Tick>
            </div>
            {product && <p className="mt-3 text-xs text-slate">Reserved by open orders: {product.inventory.reserved}. Available: {product.inventory.available}.</p>}
          </Section>
        </fieldset>

        <Section n="04" title="Images">
          {!product ? (
            <p className="text-sm text-slate">Create the draft first, then add images.</p>
          ) : (
            <>
              {product.images.length > 0 && (
                <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {product.images.map((im) => (
                    <li key={im.src} className="relative aspect-square overflow-hidden bg-pearl">
                      <Image src={im.src} alt={im.alt} fill sizes="120px" className="object-cover" />
                      <span className="absolute bottom-1 left-1 bg-ivory/95 px-1.5 py-0.5 meta text-[0.5rem] text-obsidian">Published</span>
                    </li>
                  ))}
                </ul>
              )}
              {product.stagedImages.length > 0 && (
                <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {product.stagedImages.map((im) => (
                    <li key={im.assetId} className="relative aspect-square overflow-hidden bg-pearl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={privateAssetUrl(im.assetId)} alt={im.alt || 'Staged product image'} className="size-full object-cover" />
                      <span className="absolute inset-x-1 bottom-1 bg-ivory/95 px-1.5 py-0.5 meta text-[0.5rem] leading-tight text-obsidian">Awaiting Price-Select publication</span>
                    </li>
                  ))}
                </ul>
              )}
              {attachable && (
                <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
                  <Field label="Alt text for next image"><input className="field text-sm" maxLength={200} value={alt} onChange={(x) => setAlt(x.target.value)} placeholder="What the image shows" /></Field>
                  <FilePick label="Add product images" hint="JPEG, PNG or WebP, up to 10 MB" accept="image/png,image/jpeg,image/webp" multiple files={[]} onUpload={(f, p) => attach({ as: 'image', alt: alt.trim() || d.name }, f, 'product_image', p)} />
                </div>
              )}
            </>
          )}
        </Section>

        <Section n="05" title="Compliance documents">
          {!product ? (
            <p className="text-sm text-slate">Required documents for {cat?.name ?? 'this category'}: {['Authenticity & new-condition confirmation', ...(cat?.requiredDocuments ?? [])].join(', ')}. Upload them after creating the draft.</p>
          ) : (
            <div className="space-y-4">
              {product.compliance.map((c) => (
                <div key={c.label} className="border-b border-obsidian/[0.06] pb-4 last:border-0">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>{c.label}{c.required ? '' : ' (optional)'}</span>
                    <span className="flex items-center gap-3">
                      {c.assetId && <a href={privateAssetUrl(c.assetId)} target="_blank" rel="noreferrer" className="link-line text-xs">View file</a>}
                      <StatusBadge status={c.status} label={c.status.replace('_', ' ')} />
                    </span>
                  </div>
                  {c.reviewedAt && <p className="mb-2 text-xs text-slate">Reviewed {c.reviewedByName ? `by ${c.reviewedByName} ` : ''}{dateTime(c.reviewedAt)}</p>}
                  {attachable && c.status !== 'on_file' && <FilePick label={c.assetId ? 'Replace file' : 'Upload file'} hint="PDF or image, up to 10 MB" accept=".pdf,image/png,image/jpeg,image/webp" files={[]} onUpload={(f, p) => attach({ as: 'document', label: c.label }, f, 'product_document', p, `${c.label}: ${f.name}`)} />}
                </div>
              ))}
              <div className="pt-2">
                <p className="mb-2 text-sm">Supporting documents <span className="text-slate">(manuals, warranty terms — optional)</span></p>
                {attachable ? (
                  <FilePick label="Add supporting documents" accept=".pdf,image/png,image/jpeg,image/webp" multiple files={product.supportingDocs.map((id, i) => ({ id, name: `Document ${i + 1}`, href: privateAssetUrl(id) }))} onUpload={(f, p) => attach({ as: 'supporting' }, f, 'product_document', p, f.name)} />
                ) : (
                  <ul className="space-y-1 text-xs">{product.supportingDocs.map((id, i) => <li key={id}><a href={privateAssetUrl(id)} target="_blank" rel="noreferrer" className="link-line">Document {i + 1}</a></li>)}</ul>
                )}
              </div>
            </div>
          )}
        </Section>

        {product && product.reviewHistory.length > 0 && (
          <Section n="06" title="Review history">
            <ol className="space-y-2">
              {[...product.reviewHistory].reverse().map((h, i) => (
                <li key={h.at + i} className="grid grid-cols-[10rem_1fr] gap-4 text-sm">
                  <span className="text-xs tabular-nums text-slate">{dateTime(h.at)}</span>
                  <span>
                    {h.action.replace(/_/g, ' ')}
                    {h.byName && <span className="text-slate"> · {h.byName}</span>}
                    {h.reason && <span className="block text-xs text-slate">{h.reason}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
        )}
      </form>
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
