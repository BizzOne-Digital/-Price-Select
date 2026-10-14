'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, FileCheck2, FileClock, FileX2, Trash2 } from 'lucide-react'
import { ActionButton, DataTable, Field, Panel, StatusBadge, Tabs, type Column } from '@/components/dashboard/kit'
import { SafeImage } from '@/components/ui/safe-image'
import { useToast } from '@/components/ui/toast'
import { api, ApiError, errorText } from '@/lib/client/api'
import { privateAssetUrl } from '@/lib/client/upload'
import { money } from '@/lib/format'
import type { Category, ProductAdmin, ProductImage, ProductStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { when } from './data'
import { LocalImageField } from './local-image-field'
import { Drawer, inputCls, KV } from './ui'

const TABS: { value: ProductStatus | 'all'; label: string }[] = [
  { value: 'pending_review', label: 'Pending review' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'published', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'draft', label: 'Supplier drafts' },
  { value: 'all', label: 'All' },
]
const TAGS = ['Selected', 'New arrival', 'Seasonal', 'Limited'] as const
const outstanding = (p: Pick<ProductAdmin, 'compliance'>) => p.compliance.filter((c) => c.required !== false && c.status !== 'on_file')

const DocIcon = ({ s }: { s: string }) => {
  const I = s === 'on_file' ? FileCheck2 : s === 'pending' ? FileClock : FileX2
  return <I className={s === 'on_file' ? 'size-4 text-success' : s === 'pending' ? 'size-4 text-warning' : 'size-4 text-danger'} strokeWidth={1.4} aria-hidden />
}

/** Message for a failed review call, including the server's publish blockers on 409. */
const failure = (e: unknown) => (e instanceof ApiError && Array.isArray(e.details) && e.details.length ? `${e.message} ${(e.details as unknown[]).map(String).join(' ')}` : errorText(e))

export function ProductReview({ initial, categories }: { initial: ProductAdmin[]; categories: (Category & { total: number; live: number })[] }) {
  const [rows, setRows] = useState(initial)
  const [tab, setTab] = useState<ProductStatus | 'all'>('pending_review')
  const [openId, setOpenId] = useState<string | null>(null)
  const open = rows.find((r) => r.id === openId)
  const replace = (p: ProductAdmin) => setRows((rs) => rs.map((r) => (r.id === p.id ? p : r)))
  const list = useMemo(() => (tab === 'all' ? rows : rows.filter((r) => r.status === tab)), [rows, tab])
  const cat = (slug: string) => categories.find((c) => c.slug === slug)

  const columns: Column<ProductAdmin>[] = [
    {
      key: 'name',
      header: 'Product',
      sort: (r) => r.name,
      cell: (r) => (
        <span className="flex items-center gap-3">
          <span className="relative size-11 shrink-0 overflow-hidden bg-pearl">{r.images[0] && <SafeImage src={r.images[0].src} alt="" fill sizes="44px" className="object-cover" />}</span>
          <span>
            <span className="block font-medium">{r.name}</span>
            <span className="text-xs text-slate">{r.sku}</span>
          </span>
        </span>
      ),
    },
    { key: 'supplier', header: 'Supplier', cell: (r) => <span className="text-slate">{r.supplierName ?? r.supplierId}</span> },
    {
      key: 'category',
      header: 'Category',
      cell: (r) => (
        <span className="flex items-center gap-2">
          {cat(r.category)?.short ?? r.category}
          {cat(r.category)?.reviewLevel === 'enhanced' && <StatusBadge status="enhanced" tone="gold" label="Enhanced" />}
        </span>
      ),
    },
    {
      key: 'docs',
      header: 'Documents',
      cell: (r) => {
        const b = outstanding(r)
        return b.length ? <StatusBadge status="missing" tone="warn" label={`${b.length} outstanding`} /> : <StatusBadge status="on_file" label="Complete" />
      },
    },
    { key: 'price', header: 'Price', align: 'right', sort: (r) => r.price, cell: (r) => money(r.price) },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'act',
      header: '',
      align: 'right',
      cell: (r) => (
        <ActionButton tone="default" className="h-9" onClick={() => setOpenId(r.id)}>
          Inspect
        </ActionButton>
      ),
    },
  ]

  return (
    <>
      <div className="mb-8 flex items-start gap-3 border border-danger/20 bg-danger/[0.04] px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={1.5} aria-hidden />
        <p>
          <span className="font-medium">Publishing rule.</span> <span className="text-slate">A listing goes live only when its supplier is approved, it has a published image and every required document is on file; enhanced-review categories also need reviewed files and a recorded sign-off. The server enforces these checks.</span>
        </p>
      </div>

      <Tabs value={tab} onChange={setTab} options={TABS.map((t) => ({ ...t, count: t.value === 'all' ? rows.length : rows.filter((r) => r.status === t.value).length }))} />
      <Panel pad={false} className="mt-6">
        <DataTable rows={list} columns={columns} rowKey={(r) => r.id} caption="Product review queue" empty="Nothing in this queue." />
      </Panel>

      <Drawer open={!!open} onClose={() => setOpenId(null)} eyebrow={open ? `${open.sku} · ${open.supplierName ?? open.supplierId}` : undefined} title={open?.name ?? ''}>
        {open && <ProductDetail key={open.id} p={open} category={cat(open.category)} categories={categories} onChange={replace} />}
      </Drawer>
    </>
  )
}

function ProductDetail({ p, category, categories, onChange }: { p: ProductAdmin; category?: Category; categories: Category[]; onChange: (p: ProductAdmin) => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [signNote, setSignNote] = useState('')
  const enhanced = category?.reviewLevel === 'enhanced'

  const review = async (body: Record<string, unknown>, success: string, tag = String(body.action)) => {
    setBusy(tag)
    setError('')
    try {
      const next = await api<ProductAdmin>(`/api/admin/products/${p.id}/review`, { body })
      onChange(next)
      toast({ title: success })
      return true
    } catch (e) {
      setError(failure(e))
      return false
    } finally {
      setBusy(null)
    }
  }
  const decide = async (action: 'reject' | 'flag' | 'suspend' | 'withdraw', label: string) => {
    if (reason.trim().length < 3) return setError('Enter a reason (at least 3 characters). It is sent to the supplier.')
    if (await review({ action, reason: reason.trim() }, `${p.name} ${label}`)) setReason('')
  }

  return (
    <div className="space-y-10">
      {p.statusReason && (
        <p className="border-l-2 border-warning bg-warning/[0.06] px-3 py-2 text-sm">
          <span className="meta text-[0.58rem] text-slate">Status reason</span>
          <span className="mt-1 block">{p.statusReason}</span>
        </p>
      )}

      <section>
        <h3 className="eyebrow text-slate">Decision</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton tone="primary" disabled={!!busy || p.status === 'published'} onClick={() => review({ action: 'approve' }, `${p.name} approved and published`)}>
            {busy === 'approve' ? 'Publishing' : 'Approve & publish'}
          </ActionButton>
        </div>
        <label className="mt-4 block">
          <span className="meta text-[0.6rem] text-slate">Reason (required to reject, flag, suspend or withdraw; sent to the supplier)</span>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none" />
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <ActionButton disabled={!!busy || !['pending_review', 'flagged'].includes(p.status)} onClick={() => decide('reject', 'rejected')}>Reject</ActionButton>
          <ActionButton disabled={!!busy || !['pending_review', 'published'].includes(p.status)} onClick={() => decide('flag', 'flagged')}>Flag</ActionButton>
          <ActionButton disabled={!!busy || !['published', 'flagged', 'pending_review'].includes(p.status)} onClick={() => decide('suspend', 'suspended')}>Suspend</ActionButton>
          <ActionButton tone="danger" disabled={!!busy || p.status === 'withdrawn'} onClick={() => decide('withdraw', 'withdrawn')}>Withdraw</ActionButton>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </section>

      <section>
        <h3 className="eyebrow text-slate">Compliance documents</h3>
        {p.compliance.length === 0 && <p className="mt-3 text-sm text-slate">No documents required for this listing.</p>}
        <ul className="mt-3">
          {p.compliance.map((c) => (
            <li key={c.label} className="border-b border-obsidian/[0.07] py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <DocIcon s={c.status} /> {c.label}
                  {c.required === false && <span className="text-xs text-slate">(optional)</span>}
                </span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={c.status} />
                  {c.assetId ? (
                    <a href={privateAssetUrl(c.assetId)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center meta text-[0.58rem] text-gold-deep hover:text-obsidian">
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-slate">No file</span>
                  )}
                </span>
              </div>
              {c.reviewedByName && <p className="mt-1 text-xs text-slate">Reviewed by {c.reviewedByName} · {when(c.reviewedAt)}</p>}
              <div className="mt-2 flex gap-2">
                <ActionButton className="h-8" disabled={!!busy || !c.assetId || c.status === 'on_file'} onClick={() => review({ action: 'document', label: c.label, decision: 'on_file' }, `${c.label} marked on file`, `doc:${c.label}`)}>
                  Accept
                </ActionButton>
                <ActionButton className="h-8" tone="danger" disabled={!!busy || c.status === 'rejected'} onClick={() => review({ action: 'document', label: c.label, decision: 'rejected' }, `${c.label} rejected`, `doc:${c.label}`)}>
                  Reject
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
        {p.supportingDocs.length > 0 && (
          <p className="mt-3 text-xs text-slate">
            Supporting files:{' '}
            {p.supportingDocs.map((id, i) => (
              <a key={id} href={privateAssetUrl(id)} target="_blank" rel="noopener noreferrer" className="mr-2 text-gold-deep hover:text-obsidian">
                File {i + 1}
              </a>
            ))}
          </p>
        )}
      </section>

      {enhanced && (
        <section className="border border-gold/30 p-5">
          <h3 className="eyebrow text-gold-deep">Enhanced-review sign-off</h3>
          {category?.reviewNote && <p className="mt-2 text-xs text-slate">{category.reviewNote}</p>}
          {p.enhancedSignoff?.at ? (
            <p className="mt-3 text-sm">
              Signed off by <span className="font-medium">{p.enhancedSignoff.byName ?? 'unknown reviewer'}</span> · {when(p.enhancedSignoff.at)}
              {p.enhancedSignoff.note && <span className="block text-xs text-slate">{p.enhancedSignoff.note}</span>}
            </p>
          ) : (
            <>
              <label className="mt-3 block">
                <span className="meta text-[0.6rem] text-slate">Sign-off note</span>
                <input value={signNote} onChange={(e) => setSignNote(e.target.value)} maxLength={500} className={`${inputCls} mt-1`} />
              </label>
              <ActionButton className="mt-2" disabled={!!busy} onClick={() => review({ action: 'signoff', note: signNote.trim() }, 'Sign-off recorded')}>
                Record sign-off as reviewer
              </ActionButton>
            </>
          )}
        </section>
      )}

      {p.stagedImages.length > 0 && (
        <section>
          <h3 className="eyebrow text-slate">Supplier images awaiting publication</h3>
          <ul className="mt-3 space-y-3">
            {p.stagedImages.map((s) => (
              <StagedImage key={s.assetId} assetId={s.assetId} alt={s.alt ?? ''} disabled={!!busy} onPublish={(alt) => review({ action: 'publish_image', assetId: s.assetId, alt }, 'Image published to the listing', `img:${s.assetId}`)} />
            ))}
          </ul>
        </section>
      )}

      <ImagesEditor p={p} onSaved={onChange} />
      <EditForm p={p} categories={categories} onSaved={onChange} />

      <dl>
        <KV k="Inventory">{p.madeToOrder ? 'Made to order' : `${p.inventory.available} available · ${p.inventory.onHand} on hand · ${p.inventory.reserved} reserved`}</KV>
        <KV k="UPC">{p.upc || '—'}</KV>
        <KV k="Submitted">{when(p.submittedAt)}</KV>
        <KV k="Published">{when(p.publishedAt)}</KV>
      </dl>

      <section>
        <h3 className="eyebrow text-slate">Review history</h3>
        {p.reviewHistory.length ? (
          <ol className="mt-3 border-l border-obsidian/10">
            {[...p.reviewHistory].reverse().map((h, i) => (
              <li key={h.at + i} className="relative pb-4 pl-5 last:pb-0">
                <span aria-hidden className="absolute -left-[3px] top-1.5 size-[5px] rounded-full bg-obsidian/30" />
                <p className="text-sm capitalize">{h.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate">{[h.byName, when(h.at), h.reason].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-slate">No review actions yet.</p>
        )}
      </section>

      <SafetyNotice p={p} />
    </div>
  )
}

function StagedImage({ assetId, alt: initialAlt, disabled, onPublish }: { assetId: string; alt: string; disabled: boolean; onPublish: (alt: string) => Promise<boolean> }) {
  const [alt, setAlt] = useState(initialAlt)
  return (
    <li className="flex items-center gap-4 border border-obsidian/10 p-3">
      <a href={privateAssetUrl(assetId)} target="_blank" rel="noopener noreferrer" className="relative size-20 shrink-0 overflow-hidden bg-pearl" aria-label="Open staged image">
        {/* Private, staff-only file: rendered unoptimized so the session cookie applies. */}
        <SafeImage src={privateAssetUrl(assetId)} alt={alt} fill sizes="80px" className="object-cover" unoptimized />
      </a>
      <div className="flex-1">
        <label className="block">
          <span className="meta text-[0.6rem] text-slate">Alt text</span>
          <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} className={`${inputCls} mt-1`} />
        </label>
        <ActionButton className="mt-2 h-9" disabled={disabled} onClick={() => onPublish(alt.trim())}>
          Publish image
        </ActionButton>
      </div>
    </li>
  )
}

function ImagesEditor({ p, onSaved }: { p: ProductAdmin; onSaved: (p: ProductAdmin) => void }) {
  const toast = useToast()
  const [images, setImages] = useState<ProductImage[]>(p.images)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dirty = JSON.stringify(images) !== JSON.stringify(p.images)
  const set = (i: number, patch: Partial<ProductImage>) => setImages((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, d: -1 | 1) =>
    setImages((xs) => {
      const ys = [...xs]
      ;[ys[i], ys[i + d]] = [ys[i + d]!, ys[i]!]
      return ys
    })

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const next = await api<ProductAdmin>(`/api/admin/products/${p.id}`, { method: 'PATCH', body: { images: images.filter((x) => x.src) } })
      onSaved(next)
      setImages(next.images)
      toast({ title: 'Images saved', body: 'Removed images are cleaned up once nothing references them.' })
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h3 className="eyebrow text-slate">Published images</h3>
      <ul className="mt-3 space-y-4">
        {images.map((img, i) => (
          <li key={i} className="border border-obsidian/10 p-3">
            <LocalImageField value={img.src} onChange={(src) => (src ? set(i, { src }) : setImages((xs) => xs.filter((_, j) => j !== i)))} folder="products" label={i === 0 ? 'Image 1 · primary' : `Image ${i + 1}`} alt={img.alt} disabled={busy} />
            <label className="mt-2 block">
              <span className="meta text-[0.6rem] text-slate">Alt text</span>
              <input value={img.alt} onChange={(e) => set(i, { alt: e.target.value })} maxLength={200} className={`${inputCls} mt-1`} />
            </label>
            <div className="mt-2 flex gap-2">
              <ActionButton type="button" className="h-8 px-3" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move image ${i + 1} up`}>
                <ArrowUp className="size-3.5" />
              </ActionButton>
              <ActionButton type="button" className="h-8 px-3" disabled={busy || i === images.length - 1} onClick={() => move(i, 1)} aria-label={`Move image ${i + 1} down`}>
                <ArrowDown className="size-3.5" />
              </ActionButton>
              <ActionButton type="button" tone="danger" className="h-8 px-3" disabled={busy} onClick={() => setImages((xs) => xs.filter((_, j) => j !== i))} aria-label={`Remove image ${i + 1}`}>
                <Trash2 className="size-3.5" />
              </ActionButton>
            </div>
          </li>
        ))}
        {images.length < 12 && (
          <li className="border border-dashed border-obsidian/15 p-3">
            <LocalImageField key={images.length} value="" onChange={(src) => src && setImages((xs) => [...xs, { src, alt: p.name }])} folder="products" label="Add image" disabled={busy} />
          </li>
        )}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <ActionButton tone="primary" disabled={busy || !dirty} onClick={save}>
          {busy ? 'Saving' : 'Save images'}
        </ActionButton>
        {dirty && (
          <ActionButton tone="ghost" disabled={busy} onClick={() => setImages(p.images)}>
            Discard
          </ActionButton>
        )}
      </div>
    </section>
  )
}

const specsToText = (s: ProductAdmin['specs']) => s.map((x) => `${x.label}: ${x.value}`).join('\n')
const textToSpecs = (t: string) =>
  t
    .split('\n')
    .map((l) => l.split(':'))
    .filter((parts) => parts.length >= 2 && parts[0]!.trim() && parts.slice(1).join(':').trim())
    .map((parts) => ({ label: parts[0]!.trim(), value: parts.slice(1).join(':').trim() }))

function EditForm({ p, categories, onSaved }: { p: ProductAdmin; categories: Category[]; onSaved: (p: ProductAdmin) => void }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const area = 'w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none'

  const save = async (f: FormData) => {
    setBusy(true)
    setError('')
    try {
      const body = {
        name: String(f.get('name')).trim(),
        brand: String(f.get('brand')).trim(),
        category: String(f.get('category')),
        price: Number(f.get('price')),
        summary: String(f.get('summary')).trim(),
        description: String(f.get('description')).trim(),
        specs: textToSpecs(String(f.get('specs'))),
        tag: (String(f.get('tag')) || null) as ProductAdmin['tag'] | null,
        featured: f.get('featured') === 'on',
        membershipEligible: f.get('membershipEligible') === 'on',
        handlingDays: Number(f.get('handlingDays')),
        deliveryEstimate: String(f.get('deliveryEstimate')).trim(),
      }
      const next = await api<ProductAdmin>(`/api/admin/products/${p.id}`, { method: 'PATCH', body })
      onSaved(next)
      toast({ title: 'Listing saved' })
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h3 className="eyebrow text-slate">Edit listing</h3>
      <form
        className="mt-3 grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault()
          void save(new FormData(e.currentTarget))
        }}
      >
        <Field label="Name" className="sm:col-span-2">
          <input name="name" defaultValue={p.name} required minLength={2} maxLength={160} className={inputCls} />
        </Field>
        <Field label="Brand">
          <input name="brand" defaultValue={p.brand} maxLength={80} className={inputCls} />
        </Field>
        <Field label="Category">
          <select name="category" defaultValue={p.category} className={inputCls}>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
                {c.reviewLevel === 'enhanced' ? ' — enhanced review' : ''}
                {c.active === false ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Price (USD)">
          <input name="price" type="number" step="0.01" min="0.01" defaultValue={p.price} required className={inputCls} />
        </Field>
        <Field label="Tag">
          <select name="tag" defaultValue={p.tag ?? ''} className={inputCls}>
            <option value="">None</option>
            {TAGS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Handling (days)">
          <input name="handlingDays" type="number" min="0" max="120" step="1" defaultValue={p.handlingDays} className={inputCls} />
        </Field>
        <Field label="Delivery estimate">
          <input name="deliveryEstimate" defaultValue={p.deliveryEstimate} maxLength={120} className={inputCls} />
        </Field>
        <Field label="Summary" className="sm:col-span-2">
          <textarea name="summary" defaultValue={p.summary} rows={2} maxLength={300} className={area} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea name="description" defaultValue={p.description} rows={5} maxLength={10000} className={area} />
        </Field>
        <Field label="Specifications" hint="One per line, as Label: Value" className="sm:col-span-2">
          <textarea name="specs" defaultValue={specsToText(p.specs)} rows={4} className={cn(area, 'font-mono text-xs')} />
        </Field>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="featured" defaultChecked={!!p.featured} className="size-4 accent-[#5420C7]" /> Featured on storefront
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="membershipEligible" defaultChecked={p.membershipEligible !== false} className="size-4 accent-[#5420C7]" /> Membership discount eligible
        </label>
        {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <ActionButton type="submit" tone="primary" disabled={busy}>
            {busy ? 'Saving' : 'Save listing'}
          </ActionButton>
        </div>
      </form>
    </section>
  )
}

function SafetyNotice({ p }: { p: ProductAdmin }) {
  const toast = useToast()
  const [count, setCount] = useState<number | null>(null)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctl = new AbortController()
    api<{ orders: number }>(`/api/admin/products/${p.id}/notify`, { signal: ctl.signal })
      .then((r) => setCount(r.orders))
      .catch((e) => !ctl.signal.aborted && setLoadError(errorText(e)))
    return () => ctl.abort()
  }, [p.id, attempt])

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await api<{ orders: number; emailsQueued: number; emailsSent: number }>(`/api/admin/products/${p.id}/notify`, { body: { message: message.trim() } })
      toast({ title: `Notice recorded for ${r.orders} order(s)`, body: `${r.emailsSent} email(s) sent, ${r.emailsQueued - r.emailsSent} queued${r.emailsSent < r.emailsQueued ? ' (delivered when email is configured)' : ''}. In-app notices go to signed-in customers.` })
      setMessage('')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="border border-obsidian/10 p-5">
      <h3 className="eyebrow text-danger">Safety removal</h3>
      <p className="mt-2 text-sm text-slate" aria-live="polite">
        {loadError ? (
          <>
            Could not load affected orders: {loadError}{' '}
            <button className="text-gold-deep underline" onClick={() => (setLoadError(''), setAttempt((a) => a + 1))}>
              Retry
            </button>
          </>
        ) : count === null ? (
          'Checking affected orders…'
        ) : (
          `${count} paid order(s) include this product. For safety-related removals, withdraw the listing above, then notify those customers with guidance from the supplier.`
        )}
      </p>
      <label className="mt-4 block">
        <span className="meta text-[0.6rem] text-slate">Customer notice</span>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} minLength={10} maxLength={2000} className="mt-1 w-full border border-obsidian/15 bg-ivory/60 p-3 text-sm focus:border-gold focus:outline-none" />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      <ActionButton tone="danger" className="mt-3" disabled={busy || !count || message.trim().length < 10} onClick={send}>
        {busy ? 'Sending' : 'Notify affected customers'}
      </ActionButton>
    </section>
  )
}
