'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { FileText, Paperclip, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { CaseStatus, Order, ReturnCase, ReturnType } from '@/lib/types'
import { getProduct } from '@/lib/data/products'
import { date, money, titleCase } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { useToast } from '@/components/ui/toast'
import { btnClass, BtnInner, DemoNote } from '@/components/site/ui'
import { useCart } from './cart'
import { OrderTimeline, Status } from './account-ui'
import type { DemoAddress } from './account-data'

/* ───────── Shared form bits ───────── */
function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="meta text-slate">
      {children}
    </label>
  )
}
function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={id} className="mt-1.5 text-xs text-danger">
      {msg}
    </p>
  ) : null
}
const submitCls = btnClass('dark', 'sm:min-w-56')

/* ───────── Track ───────── */
export function TrackForm({ orders }: { orders: Order[] }) {
  const [id, setId] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ id?: string; email?: string }>({})
  const [result, setResult] = useState<Order | null | undefined>(undefined)

  return (
    <div className="grid gap-14 lg:grid-cols-12">
      <form
        noValidate
        className="lg:col-span-4"
        onSubmit={(e) => {
          e.preventDefault()
          const er: typeof errors = {}
          if (!/^PS-\d{6}$/i.test(id.trim())) er.id = 'Enter an order number like PS-240118.'
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) er.email = 'Enter the email used for the order.'
          setErrors(er)
          if (Object.keys(er).length) return
          setResult(orders.find((o) => o.id.toLowerCase() === id.trim().toLowerCase()) ?? null)
        }}
      >
        <h2 className="font-display text-4xl font-light text-obsidian">Find an order</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate">Enter your order number and the email used at checkout.</p>
        <div className="mt-8">
          <Label htmlFor="tr-id">Order number</Label>
          <input id="tr-id" value={id} onChange={(e) => setId(e.target.value)} className="field uppercase" placeholder="PS-000000" autoComplete="off" aria-invalid={!!errors.id || undefined} aria-describedby={errors.id ? 'tr-id-err' : 'tr-id-hint'} />
          {errors.id ? <Err id="tr-id-err" msg={errors.id} /> : <p id="tr-id-hint" className="mt-1.5 text-xs text-slate/80">Demo: try PS-240118 or PS-240131.</p>}
        </div>
        <div className="mt-6">
          <Label htmlFor="tr-email">Email</Label>
          <input id="tr-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" autoComplete="email" aria-invalid={!!errors.email || undefined} aria-describedby={errors.email ? 'tr-email-err' : undefined} />
          <Err id="tr-email-err" msg={errors.email} />
        </div>
        <button type="submit" className={cn(submitCls, 'mt-10 w-full')}>
          <BtnInner variant="dark">Track order</BtnInner>
        </button>
        <DemoNote className="mt-6">Demo lookup — email is verified once accounts are connected</DemoNote>
      </form>

      <div className="lg:col-span-7 lg:col-start-6" aria-live="polite">
        <AnimatePresence mode="wait">
          {result === undefined && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid min-h-64 place-items-center border border-dashed border-obsidian/15 p-10 text-center">
              <p className="max-w-xs text-sm text-slate">Status for every shipment in your order will appear here.</p>
            </motion.div>
          )}
          {result === null && (
            <motion.div key="none" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-l border-danger pl-5">
              <p className="font-display text-3xl font-light text-obsidian">We couldn’t find that order.</p>
              <p className="mt-2 text-sm text-slate">Check the number in your confirmation email, or contact support.</p>
            </motion.div>
          )}
          {result && (
            <motion.div key={result.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-obsidian/15 pb-5">
                <div>
                  <p className="meta text-slate">Placed {date(result.placedAt)}</p>
                  <p className="mt-2 font-display text-4xl font-light text-obsidian">{result.id}</p>
                </div>
                <Status value={result.status} />
              </div>
              <div className="mt-8 space-y-10">
                {result.fulfillments.map((f, i) => (
                  <section key={f.id} aria-label={`Shipment ${i + 1}`} className="grid gap-6 sm:grid-cols-[1fr_1.3fr]">
                    <div>
                      <p className="eyebrow text-obsidian">
                        Shipment {i + 1} of {result.fulfillments.length}
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-obsidian">
                        {f.lines.map((l) => (
                          <li key={l.productSlug}>
                            {l.name} <span className="text-slate">× {l.qty}</span>
                          </li>
                        ))}
                      </ul>
                      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <dt className="meta text-slate">Carrier</dt>
                          <dd className="mt-1 text-obsidian">{f.carrier ?? 'Assigned at dispatch'}</dd>
                        </div>
                        <div>
                          <dt className="meta text-slate">Estimated</dt>
                          <dd className="mt-1 text-obsidian">{date(f.estimatedDelivery)}</dd>
                        </div>
                      </dl>
                    </div>
                    <OrderTimeline history={f.history} status={f.status} />
                  </section>
                ))}
              </div>
              <Link href={`/account/orders/${result.id}`} className="link-line link-line--static eyebrow mt-10 text-obsidian">
                Full order details
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ───────── Returns & support cases ───────── */
const TYPES: { id: ReturnType; label: string; hint: string }[] = [
  { id: 'cancellation', label: 'Cancellation', hint: 'Before the item ships' },
  { id: 'return', label: 'Return', hint: 'Send an item back' },
  { id: 'damage', label: 'Damage', hint: 'Arrived damaged or faulty' },
  { id: 'replacement', label: 'Replacement', hint: 'Swap for another unit or size' },
  { id: 'support', label: 'Support', hint: 'Any other question' },
]
const REASONS: Record<ReturnType, string[]> = {
  cancellation: ['Ordered by mistake', 'Found a better fit', 'Delivery estimate too long', 'Other'],
  return: ['Not as expected', 'No longer needed', 'Wrong item received', 'Other'],
  damage: ['Arrived damaged', 'Missing parts', 'Does not work', 'Other'],
  replacement: ['Wrong size', 'Wrong colour or variant', 'Defective unit', 'Other'],
  support: ['Delivery question', 'Product question', 'Billing question', 'Other'],
}
const CASE_FLOW: { status: CaseStatus; label: string }[] = [
  { status: 'open', label: 'Submitted' },
  { status: 'awaiting_supplier', label: 'Supplier review' },
  { status: 'approved', label: 'Decision' },
  { status: 'resolved', label: 'Resolved' },
]

export function ReturnsCenter({ cases: initial, orders }: { cases: ReturnCase[]; orders: Order[] }) {
  const sp = useSearchParams()
  const toast = useToast()
  const [cases, setCases] = useState(initial)
  const [type, setType] = useState<ReturnType>((TYPES.find((t) => t.id === sp.get('type'))?.id ?? 'return') as ReturnType)
  const [orderId, setOrderId] = useState(orders.some((o) => o.id === sp.get('order')) ? sp.get('order')! : '')
  const [item, setItem] = useState(sp.get('item') ?? '')
  const [reason, setReason] = useState('')
  const [desc, setDesc] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<ReturnCase | null>(null)

  const order = orders.find((o) => o.id === orderId)
  const items = order?.fulfillments.flatMap((f) => f.lines.map((l) => ({ ...l, supplierId: f.supplierId }))) ?? []

  const submit = () => {
    const e: Record<string, string> = {}
    if (!order) e.order = 'Choose the order this concerns.'
    if (type !== 'support' && !items.some((i) => i.productSlug === item)) e.item = 'Choose the item.'
    if (!reason) e.reason = 'Choose a reason.'
    if (desc.trim().length < 10) e.desc = 'Add a short description (at least 10 characters).'
    setErrors(e)
    const k = Object.keys(e)[0]
    if (k) {
      document.getElementById(`rc-${k}`)?.focus()
      return
    }
    const line = items.find((i) => i.productSlug === item) ?? items[0]
    const c: ReturnCase = {
      id: `RC-${Math.floor(4000 + Math.random() * 5000)}`,
      orderId: order!.id,
      customerId: order!.customerId,
      supplierId: line.supplierId,
      productSlug: line.productSlug,
      type,
      reason,
      status: 'open',
      openedAt: new Date().toISOString(),
      notes: [{ by: 'You', role: 'customer', at: new Date().toISOString(), text: desc.trim() }],
    }
    setCases((s) => [c, ...s])
    setSubmitted(c)
    setReason('')
    setDesc('')
    setFiles([])
    toast({ title: `Case ${c.id} submitted`, body: 'Demo only — saved in this browser session, not sent to support.' })
  }

  return (
    <div className="space-y-24">
      <section aria-labelledby="cases-title">
        <h2 id="cases-title" className="font-display text-4xl font-light text-obsidian">
          Your cases
        </h2>
        {cases.length ? (
          <ul className="mt-8 border-t border-obsidian/15">
            <AnimatePresence initial={false}>
              {cases.map((c) => {
                const p = getProduct(c.productSlug)
                return (
                  <motion.li key={c.id} layout initial={{ opacity: 0, backgroundColor: 'rgb(214 195 154 / 0.35)' }} animate={{ opacity: 1, backgroundColor: 'rgb(214 195 154 / 0)' }} transition={{ duration: 1.6, ease: EASE }} className="grid gap-4 border-b border-obsidian/10 py-6 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
                    <span className="relative hidden aspect-[4/5] overflow-hidden bg-pearl sm:block">{p && <Image src={p.images[0].src} alt="" fill sizes="64px" className="object-cover" />}</span>
                    <div>
                      <p className="meta text-slate">
                        {c.id} · {titleCase(c.type)} · Order{' '}
                        <Link href={`/account/orders/${c.orderId}`} className="text-gold-deep hover:underline">
                          {c.orderId}
                        </Link>
                      </p>
                      <p className="mt-1.5 text-base text-obsidian">{p?.name ?? c.productSlug}</p>
                      <p className="mt-1 text-xs text-slate">
                        {c.reason} · Opened {date(c.openedAt)}
                        {c.resolution && ` · ${c.resolution}`}
                      </p>
                    </div>
                    <Status value={c.status} />
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="mt-6 text-sm text-slate">No open cases.</p>
        )}
      </section>

      <section aria-labelledby="new-case" className="grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 id="new-case" className="font-display text-4xl font-light text-obsidian">
            Open a request
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate">Requests are routed to the supplier that fulfilled the item, with Price-Select support overseeing each case. Return windows are confirmed per category before launch.</p>
          <AnimatePresence>
            {submitted && (
              <motion.div key={submitted.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }} className="mt-10 border border-gold/40 bg-pearl/60 p-6" role="status">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow text-gold-deep">Case submitted</p>
                    <p className="mt-2 font-display text-3xl font-light text-obsidian">{submitted.id}</p>
                  </div>
                  <button type="button" onClick={() => setSubmitted(null)} aria-label="Dismiss" className="grid size-11 place-items-center text-slate hover:text-obsidian">
                    <X className="size-4" strokeWidth={1.3} />
                  </button>
                </div>
                <ol className="mt-6">
                  {CASE_FLOW.map((s, i) => (
                    <li key={s.status} className="relative grid grid-cols-[1.5rem_1fr] pb-4 last:pb-0" aria-current={i === 0 ? 'step' : undefined}>
                      {i < CASE_FLOW.length - 1 && <span aria-hidden className="absolute left-[5px] top-3 h-full w-px bg-obsidian/12" />}
                      <span aria-hidden className={cn('relative mt-1 block size-[11px] rounded-full border', i === 0 ? 'border-gold bg-gold' : 'border-obsidian/25 bg-ivory')} />
                      <span className={cn('text-sm', i === 0 ? 'text-obsidian' : 'text-slate/60')}>{s.label}</span>
                    </li>
                  ))}
                </ol>
                <DemoNote className="mt-6">Demo — not sent to support</DemoNote>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="space-y-8 lg:col-span-7 lg:col-start-6"
        >
          <fieldset>
            <legend className="meta text-slate">Request type</legend>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {TYPES.map((t) => (
                <label key={t.id} className={cn('relative flex min-h-20 cursor-pointer flex-col justify-between border p-3.5 transition-colors', type === t.id ? 'border-gold-deep bg-pearl/60' : 'border-obsidian/15 hover:border-obsidian/40')}>
                  <input
                    type="radio"
                    name="rc-type"
                    value={t.id}
                    checked={type === t.id}
                    onChange={() => {
                      setType(t.id)
                      setReason('')
                    }}
                    className="peer sr-only"
                  />
                  <span aria-hidden className="absolute inset-0 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold" />
                  <span className="text-sm font-medium text-obsidian">{t.label}</span>
                  <span className="mt-2 text-[0.7rem] leading-snug text-slate">{t.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <Label htmlFor="rc-order">Order</Label>
              <select
                id="rc-order"
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value)
                  setItem('')
                }}
                className="field"
                aria-invalid={!!errors.order || undefined}
                aria-describedby={errors.order ? 'rc-order-err' : undefined}
              >
                <option value="">Select an order</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.id} · {date(o.placedAt)}
                  </option>
                ))}
              </select>
              <Err id="rc-order-err" msg={errors.order} />
            </div>
            <div>
              <Label htmlFor="rc-item">Item{type === 'support' && ' (optional)'}</Label>
              <select id="rc-item" value={item} onChange={(e) => setItem(e.target.value)} className="field" disabled={!order} aria-invalid={!!errors.item || undefined} aria-describedby={errors.item ? 'rc-item-err' : undefined}>
                <option value="">{order ? 'Select an item' : 'Choose an order first'}</option>
                {items.map((l) => (
                  <option key={l.productSlug} value={l.productSlug}>
                    {l.name} × {l.qty}
                  </option>
                ))}
              </select>
              <Err id="rc-item-err" msg={errors.item} />
            </div>
          </div>

          <div>
            <Label htmlFor="rc-reason">Reason</Label>
            <select id="rc-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="field" aria-invalid={!!errors.reason || undefined} aria-describedby={errors.reason ? 'rc-reason-err' : undefined}>
              <option value="">Select a reason</option>
              {REASONS[type].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <Err id="rc-reason-err" msg={errors.reason} />
          </div>

          <div>
            <Label htmlFor="rc-desc">Description</Label>
            <textarea id="rc-desc" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} className="field resize-y" aria-invalid={!!errors.desc || undefined} aria-describedby={errors.desc ? 'rc-desc-err' : undefined} />
            <Err id="rc-desc-err" msg={errors.desc} />
          </div>

          <div>
            <p className="meta text-slate" id="rc-files-label">
              Photos or documents (optional)
            </p>
            <label htmlFor="rc-files" className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-obsidian/20 p-6 text-center transition-colors hover:border-gold-deep focus-within:border-gold">
              <Paperclip className="size-4 text-gold-deep" strokeWidth={1.3} aria-hidden />
              <span className="text-sm text-obsidian">Choose files</span>
              <span className="text-xs text-slate">Images or PDF. Files stay in your browser in this demo.</span>
              <input
                id="rc-files"
                type="file"
                multiple
                accept="image/*,application/pdf"
                aria-labelledby="rc-files-label"
                className="sr-only"
                onChange={(e) => setFiles((s) => [...s, ...Array.from(e.target.files ?? [])].slice(0, 6))}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <li key={f.name + i} className="flex items-center justify-between gap-3 border-b border-obsidian/8 py-2 text-xs text-obsidian">
                    <span className="flex min-w-0 items-center gap-2">
                      <FileText className="size-3.5 shrink-0 text-slate" aria-hidden />
                      <span className="truncate">{f.name}</span>
                      <span className="text-slate">{Math.max(1, Math.round(f.size / 1024))} KB</span>
                    </span>
                    <button type="button" onClick={() => setFiles((s) => s.filter((_, n) => n !== i))} className="meta h-9 text-slate hover:text-danger" aria-label={`Remove ${f.name}`}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-4 border-t border-obsidian/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <DemoNote>Demo — requests are kept in this browser session</DemoNote>
            <button type="submit" className={submitCls}>
              <BtnInner variant="dark">Submit request</BtnInner>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

/* ───────── Saved products ───────── */
export function SavedList({ slugs }: { slugs: string[] }) {
  const [saved, setSaved] = useState(slugs)
  const { add, setOpen } = useCart()
  const toast = useToast()
  const items = saved.map((s) => getProduct(s)).filter((p): p is NonNullable<typeof p> => !!p)

  if (!items.length)
    return (
      <div className="py-16 text-center">
        <p className="font-display text-4xl font-light text-obsidian">Nothing saved yet.</p>
        <Link href="/shop" className="link-line link-line--static eyebrow mt-8 text-obsidian">
          Explore the selection
        </Link>
      </div>
    )

  return (
    <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
      <AnimatePresence initial={false}>
        {items.map((p) => {
          const live = p.status === 'published'
          return (
            <motion.li key={p.slug} layout exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.5, ease: EASE }}>
              <Link href={`/products/${p.slug}`} className="group block">
                <span className="relative block aspect-[4/5] overflow-hidden bg-pearl">
                  <Image src={p.images[0].src} alt={p.images[0].alt} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105" />
                </span>
                <span className="mt-4 flex items-start justify-between gap-4 border-t border-obsidian/10 pt-3">
                  <span className="text-sm font-medium text-obsidian group-hover:text-gold-deep">{p.name}</span>
                  <span className="text-sm tabular-nums text-obsidian">{money(p.seasonalPrice ?? p.price)}</span>
                </span>
              </Link>
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={!live}
                  onClick={() => {
                    add(p.slug)
                    toast({ title: `${p.name} added`, body: 'Prices exclude applicable taxes and shipping.' })
                    setOpen(true)
                  }}
                  className="meta h-11 text-gold-deep underline-offset-4 hover:underline disabled:text-slate/50 disabled:no-underline"
                >
                  {live ? 'Add to cart' : 'Under review'}
                </button>
                <button type="button" onClick={() => setSaved((s) => s.filter((x) => x !== p.slug))} className="meta h-11 text-slate hover:text-danger" aria-label={`Remove ${p.name} from saved`}>
                  Remove
                </button>
              </div>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

/* ───────── Addresses ───────── */
const blank: DemoAddress = { id: '', label: '', name: '', line1: '', line2: '', city: '', region: '', postal: '', country: '' }

export function AddressBook({ initial }: { initial: DemoAddress[] }) {
  const [list, setList] = useState(initial)
  const [editing, setEditing] = useState<DemoAddress | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const toast = useToast()

  const save = () => {
    const a = editing!
    const e: Record<string, string> = {}
    for (const k of ['label', 'name', 'line1', 'city', 'region', 'postal', 'country'] as const) if (!a[k]?.trim()) e[k] = 'Required.'
    setErrors(e)
    const k = Object.keys(e)[0]
    if (k) return document.getElementById(`ad-${k}`)?.focus()
    setList((s) => (a.id ? s.map((x) => (x.id === a.id ? a : x)) : [...s, { ...a, id: `a${Date.now()}` }]))
    setEditing(null)
    toast({ title: 'Address saved', body: 'Demo only — stored in this page session.' })
  }

  const field = (k: keyof DemoAddress, label: string, ac: string, cls = '') => (
    <div className={cls}>
      <Label htmlFor={`ad-${k}`}>{label}</Label>
      <input
        id={`ad-${k}`}
        value={String(editing?.[k] ?? '')}
        onChange={(e) => setEditing((s) => ({ ...s!, [k]: e.target.value }))}
        className="field"
        autoComplete={ac}
        aria-invalid={!!errors[k] || undefined}
        aria-describedby={errors[k] ? `ad-${k}-err` : undefined}
      />
      <Err id={`ad-${k}-err`} msg={errors[k]} />
    </div>
  )

  return (
    <div className="grid gap-14 lg:grid-cols-12">
      <ul className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
        {list.map((a) => (
          <li key={a.id} className="flex flex-col border border-obsidian/12 p-6">
            <p className="flex items-center justify-between gap-3">
              <span className="eyebrow text-obsidian">{a.label}</span>
              {a.isDefault && <span className="meta text-gold-deep">Default</span>}
            </p>
            <address className="mt-4 text-sm not-italic leading-relaxed text-slate">
              {a.name}
              <br />
              {a.line1}
              {a.line2 && `, ${a.line2}`}
              <br />
              {a.city}, {a.region} {a.postal}
              <br />
              {a.country}
            </address>
            <div className="mt-auto flex gap-6 pt-6">
              <button type="button" onClick={() => setEditing(a)} className="meta h-11 text-gold-deep hover:underline">
                Edit
              </button>
              {!a.isDefault && (
                <>
                  <button type="button" onClick={() => setList((s) => s.map((x) => ({ ...x, isDefault: x.id === a.id })))} className="meta h-11 text-slate hover:text-obsidian">
                    Make default
                  </button>
                  <button type="button" onClick={() => setList((s) => s.filter((x) => x.id !== a.id))} className="meta h-11 text-slate hover:text-danger">
                    Remove
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
        <li>
          <button type="button" onClick={() => setEditing({ ...blank })} className="grid h-full min-h-48 w-full place-items-center border border-dashed border-obsidian/20 text-sm text-obsidian transition-colors hover:border-gold-deep">
            <span>
              <span className="block font-display text-4xl font-light leading-none">+</span>
              <span className="meta mt-3 block text-slate">Add an address</span>
            </span>
          </button>
        </li>
      </ul>

      <div className="lg:col-span-4 lg:col-start-9">
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.form
              key={editing.id || 'new'}
              noValidate
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              onSubmit={(e) => {
                e.preventDefault()
                save()
              }}
              className="grid grid-cols-2 gap-x-6 gap-y-5"
              aria-label={editing.id ? 'Edit address' : 'New address'}
            >
              <p className="col-span-2 font-display text-3xl font-light text-obsidian">{editing.id ? 'Edit address' : 'New address'}</p>
              {field('label', 'Label', 'off', 'col-span-2')}
              {field('name', 'Full name', 'shipping name', 'col-span-2')}
              {field('line1', 'Street address', 'shipping address-line1', 'col-span-2')}
              {field('line2', 'Apartment, suite (optional)', 'shipping address-line2', 'col-span-2')}
              {field('city', 'City', 'shipping address-level2')}
              {field('region', 'State / region', 'shipping address-level1')}
              {field('postal', 'Postal code', 'shipping postal-code')}
              {field('country', 'Country', 'shipping country-name')}
              <div className="col-span-2 mt-4 flex items-center justify-between gap-4">
                <button type="button" onClick={() => setEditing(null)} className="meta h-11 text-slate hover:text-obsidian">
                  Cancel
                </button>
                <button type="submit" className={btnClass('dark')}>
                  <BtnInner variant="dark">Save address</BtnInner>
                </button>
              </div>
            </motion.form>
          ) : (
            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-l border-gold pl-4 text-sm leading-relaxed text-slate">
              Saved addresses speed up checkout. Each shipment in an order is delivered to the address you choose at checkout.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ───────── Details & preferences ───────── */
export function DetailsForm({ name, email }: { name: string; email: string }) {
  const toast = useToast()
  const [v, setV] = useState({ name, email, phone: '' })
  const [prefs, setPrefs] = useState({ orders: true, returns: true, offers: false })
  const [errors, setErrors] = useState<Record<string, string>>({})

  return (
    <div className="grid gap-16 lg:grid-cols-12">
      <form
        noValidate
        className="space-y-6 lg:col-span-6"
        onSubmit={(e) => {
          e.preventDefault()
          const er: Record<string, string> = {}
          if (!v.name.trim()) er.name = 'Enter your name.'
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) er.email = 'Enter a valid email address.'
          setErrors(er)
          if (Object.keys(er).length) return document.getElementById(`dt-${Object.keys(er)[0]}`)?.focus()
          toast({ title: 'Details saved', body: 'Demo only — accounts are not yet connected.' })
        }}
      >
        <h2 className="font-display text-4xl font-light text-obsidian">Personal details</h2>
        {(
          [
            ['name', 'Full name', 'name', 'text'],
            ['email', 'Email', 'email', 'email'],
            ['phone', 'Phone (optional)', 'tel', 'tel'],
          ] as const
        ).map(([k, l, ac, t]) => (
          <div key={k}>
            <Label htmlFor={`dt-${k}`}>{l}</Label>
            <input id={`dt-${k}`} type={t} value={v[k]} onChange={(e) => setV((s) => ({ ...s, [k]: e.target.value }))} autoComplete={ac} className="field" aria-invalid={!!errors[k] || undefined} aria-describedby={errors[k] ? `dt-${k}-err` : undefined} />
            <Err id={`dt-${k}-err`} msg={errors[k]} />
          </div>
        ))}

        <fieldset className="pt-6">
          <legend className="meta text-slate">Email notifications</legend>
          <div className="mt-3">
            {(
              [
                ['orders', 'Order confirmations, shipping and delivery updates'],
                ['returns', 'Return, refund and support case updates'],
                ['offers', 'Seasonal selection and new arrivals'],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="flex min-h-12 cursor-pointer items-center justify-between gap-6 border-b border-obsidian/8 text-sm text-obsidian">
                {l}
                <input type="checkbox" checked={prefs[k]} onChange={(e) => setPrefs((s) => ({ ...s, [k]: e.target.checked }))} className="peer sr-only" />
                <span aria-hidden className="relative h-5 w-9 shrink-0 border border-obsidian/30 transition-colors peer-checked:border-gold-deep peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-gold">
                  <span className={cn('absolute top-1/2 size-3 -translate-y-1/2 transition-all duration-500 ease-[var(--ease-luxe)]', prefs[k] ? 'left-[1.1rem] bg-gold-deep' : 'left-1 bg-obsidian/40')} />
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="submit" className={cn(submitCls, 'mt-4')}>
          <BtnInner variant="dark">Save details</BtnInner>
        </button>
      </form>

      <aside className="lg:col-span-5 lg:col-start-8">
        <div className="border border-obsidian/12 p-6 md:p-8">
          <h2 className="eyebrow text-obsidian">Sign-in & security</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate">Password, sign-in methods and two-step verification are managed by the authentication provider once it is connected. Price-Select never asks for your password by email.</p>
          <p className="meta mt-6 text-warning">Authentication not yet connected</p>
        </div>
        <div className="mt-6 border border-obsidian/12 p-6 md:p-8">
          <h2 className="eyebrow text-obsidian">Your data</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate">Requests to export or delete account data will be handled through support once the privacy policy and data processes are finalised.</p>
          <Link href="/contact" className="link-line link-line--static eyebrow mt-6 text-obsidian">
            Contact support
          </Link>
        </div>
      </aside>
    </div>
  )
}
