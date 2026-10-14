'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { FileText, Paperclip, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { api, ApiError, errorText, idempotencyKey } from '@/lib/client/api'
import { privateAssetUrl, uploadPrivate } from '@/lib/client/upload'
import type { CaseStatus, MembershipState, MembershipTier, Order, Product, ReturnCase, ReturnType } from '@/lib/types'
import { MEMBERSHIPS } from '@/lib/site'
import { date, money, titleCase } from '@/lib/format'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { useToast } from '@/components/ui/toast'
import { SafeImage } from '@/components/ui/safe-image'
import { btnClass, BtnInner } from '@/components/site/ui'
import { useCart } from './cart'
import { OrderTimeline, Status } from './account-ui'

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
function FormError({ msg }: { msg?: string }) {
  return msg ? (
    <p role="alert" className="border-l border-danger pl-4 text-sm text-danger">
      {msg}
    </p>
  ) : null
}
const submitCls = btnClass('dark', 'sm:min-w-56 disabled:cursor-not-allowed disabled:opacity-50')
const safeDate = (iso?: string) => (iso ? date(iso) : 'To be confirmed')

/* ───────── Track ───────── */
/** Signed-in customers track their own orders by number; guests also need the access code from checkout. */
export function TrackForm({ signedIn }: { signedIn: boolean }) {
  const [id, setId] = useState('')
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState<{ id?: string; code?: string }>({})
  const [result, setResult] = useState<Order | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')

  return (
    <div className="grid gap-14 lg:grid-cols-12">
      <form
        noValidate
        className="lg:col-span-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const er: typeof errors = {}
          if (!/^PS-\d{4,}$/i.test(id.trim())) er.id = 'Enter an order number like PS-240201.'
          if (!signedIn && code.trim().length < 10) er.code = 'Enter the access code shown when you placed the order.'
          setErrors(er)
          if (Object.keys(er).length) return
          setBusy(true)
          setFailure('')
          try {
            setResult(await api<Order>('/api/orders/track', { body: { orderId: id.trim().toUpperCase(), accessCode: code.trim() || undefined } }))
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) setResult(null)
            else {
              setResult(undefined)
              setFailure(errorText(err))
            }
          } finally {
            setBusy(false)
          }
        }}
      >
        <h2 className="font-display text-4xl font-light text-obsidian">Find an order</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate">
          {signedIn ? 'Enter the order number from your confirmation.' : 'Enter your order number and the order access code shown when you checked out.'}
        </p>
        <div className="mt-8">
          <Label htmlFor="tr-id">Order number</Label>
          <input id="tr-id" value={id} onChange={(e) => setId(e.target.value)} className="field uppercase" placeholder="PS-000000" autoComplete="off" aria-invalid={!!errors.id || undefined} aria-describedby={errors.id ? 'tr-id-err' : undefined} />
          <Err id="tr-id-err" msg={errors.id} />
        </div>
        <div className="mt-6">
          <Label htmlFor="tr-code">Order access code{signedIn && ' (guest orders only)'}</Label>
          <input id="tr-code" value={code} onChange={(e) => setCode(e.target.value)} className="field" autoComplete="off" spellCheck={false} aria-invalid={!!errors.code || undefined} aria-describedby={errors.code ? 'tr-code-err' : undefined} />
          <Err id="tr-code-err" msg={errors.code} />
        </div>
        <button type="submit" disabled={busy} className={cn(submitCls, 'mt-10 w-full')}>
          <BtnInner variant="dark">{busy ? 'Looking up…' : 'Track order'}</BtnInner>
        </button>
        {failure && <p role="alert" className="mt-4 text-sm text-danger">{failure}</p>}
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
              <p className="mt-2 text-sm text-slate">Check the order number and access code from your confirmation, or contact support.</p>
            </motion.div>
          )}
          {result && (
            <motion.div key={result.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-obsidian/15 pb-5">
                <div>
                  <p className="meta text-slate">Placed {safeDate(result.placedAt)}</p>
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
                          <li key={l.lineId}>
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
                          <dt className="meta text-slate">Tracking</dt>
                          <dd className="mt-1 break-all text-obsidian">{f.tracking ?? 'Added once shipped'}</dd>
                        </div>
                        <div>
                          <dt className="meta text-slate">Estimated</dt>
                          <dd className="mt-1 text-obsidian">{safeDate(f.estimatedDelivery)}</dd>
                        </div>
                      </dl>
                    </div>
                    <OrderTimeline history={f.history} status={f.status} />
                  </section>
                ))}
              </div>
              {signedIn && result.customerId !== 'guest' && (
                <Link href={`/account/orders/${result.id}`} className="link-line link-line--static eyebrow mt-10 text-obsidian">
                  Full order details
                </Link>
              )}
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
  const [qty, setQty] = useState<Record<string, number>>(() => (sp.get('line') ? { [sp.get('line')!]: 1 } : {}))
  const [reason, setReason] = useState('')
  const [desc, setDesc] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [submitted, setSubmitted] = useState<ReturnCase | null>(null)

  const order = orders.find((o) => o.id === orderId)
  const lines = (order?.fulfillments.flatMap((f) => f.lines) ?? []).map((l) => ({ ...l, left: Math.max(0, l.qty - (l.returnedQty ?? 0)) }))
  const chosen = lines.filter((l) => (qty[l.lineId] ?? 0) > 0)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (type !== 'support' && !order) e.order = 'Choose the order this concerns.'
    if (type !== 'support' && !chosen.length) e.lines = 'Choose at least one item and quantity.'
    if (!reason) e.reason = 'Choose a reason.'
    if (desc.trim().length < 10) e.desc = 'Add a short description (at least 10 characters).'
    setErrors(e)
    const k = Object.keys(e)[0]
    if (k) {
      document.getElementById(`rc-${k}`)?.focus()
      return
    }
    setBusy(true)
    setFailure('')
    try {
      // Evidence is uploaded privately first; only the asset ids are attached to the case.
      const attachments: string[] = []
      for (const f of files) attachments.push((await uploadPrivate(f, 'case_evidence', f.name)).id)
      const body =
        type === 'support'
          ? { kind: 'support', orderId: order?.id, subject: reason, message: desc.trim(), attachments }
          : { kind: 'return', orderId: order!.id, type, lines: chosen.map((l) => ({ lineId: l.lineId, qty: qty[l.lineId] })), reason, message: desc.trim(), attachments }
      const c = await api<ReturnCase>('/api/cases', { body })
      setCases((s) => [c, ...s])
      setSubmitted(c)
      setReason('')
      setDesc('')
      setFiles([])
      setQty({})
      toast({ title: `Case ${c.id} submitted`, body: 'Price-Select support has your request.' })
    } catch (err) {
      setFailure(errorText(err))
    } finally {
      setBusy(false)
    }
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
              {cases.map((c) => (
                <CaseRow key={c.id} c={c} onChange={(n) => setCases((s) => s.map((x) => (x.id === n.id ? n : x)))} />
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="mt-6 text-sm text-slate">No cases yet.</p>
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
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

          <div>
            <Label htmlFor="rc-order">Order{type === 'support' && ' (optional)'}</Label>
            <select
              id="rc-order"
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value)
                setQty({})
              }}
              className="field"
              aria-invalid={!!errors.order || undefined}
              aria-describedby={errors.order ? 'rc-order-err' : undefined}
            >
              <option value="">{orders.length ? 'Select an order' : 'No orders yet'}</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id} · {safeDate(o.placedAt)}
                </option>
              ))}
            </select>
            <Err id="rc-order-err" msg={errors.order} />
          </div>

          {type !== 'support' && order && (
            <fieldset id="rc-lines" tabIndex={-1} aria-describedby={errors.lines ? 'rc-lines-err' : undefined}>
              <legend className="meta text-slate">Items and quantities</legend>
              <ul className="mt-3">
                {lines.map((l) => (
                  <li key={l.lineId} className="flex items-center justify-between gap-4 border-b border-obsidian/8 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block text-obsidian">{l.name}</span>
                      <span className="text-xs text-slate">{l.left ? `${l.left} of ${l.qty} available to request` : 'Already covered by a request'}</span>
                    </span>
                    <select
                      aria-label={`Quantity of ${l.name}`}
                      value={qty[l.lineId] ?? 0}
                      disabled={!l.left}
                      onChange={(e) => setQty((s) => ({ ...s, [l.lineId]: Number(e.target.value) }))}
                      className="field w-20 py-2"
                    >
                      {Array.from({ length: l.left + 1 }, (_, n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
              <Err id="rc-lines-err" msg={errors.lines} />
            </fieldset>
          )}

          <div>
            <Label htmlFor="rc-reason">{type === 'support' ? 'Topic' : 'Reason'}</Label>
            <select id="rc-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="field" aria-invalid={!!errors.reason || undefined} aria-describedby={errors.reason ? 'rc-reason-err' : undefined}>
              <option value="">Select {type === 'support' ? 'a topic' : 'a reason'}</option>
              {REASONS[type].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <Err id="rc-reason-err" msg={errors.reason} />
          </div>

          <div>
            <Label htmlFor="rc-desc">Description</Label>
            <textarea id="rc-desc" rows={4} maxLength={4000} value={desc} onChange={(e) => setDesc(e.target.value)} className="field resize-y" aria-invalid={!!errors.desc || undefined} aria-describedby={errors.desc ? 'rc-desc-err' : undefined} />
            <Err id="rc-desc-err" msg={errors.desc} />
          </div>

          <div>
            <p className="meta text-slate" id="rc-files-label">
              Photos or documents (optional)
            </p>
            <label htmlFor="rc-files" className="mt-3 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-obsidian/20 p-6 text-center transition-colors hover:border-gold-deep focus-within:border-gold">
              <Paperclip className="size-4 text-gold-deep" strokeWidth={1.3} aria-hidden />
              <span className="text-sm text-obsidian">Choose files</span>
              <span className="text-xs text-slate">PDF, JPEG, PNG or WebP, up to 10 MB each. Shared privately with support.</span>
              <input
                id="rc-files"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf"
                aria-labelledby="rc-files-label"
                className="sr-only"
                onChange={(e) => setFiles((s) => [...s, ...Array.from(e.target.files ?? [])].slice(0, 8))}
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

          <FormError msg={failure} />
          <div className="flex justify-end border-t border-obsidian/10 pt-8">
            <button type="submit" disabled={busy} className={submitCls}>
              <BtnInner variant="dark">{busy ? 'Submitting…' : 'Submit request'}</BtnInner>
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

/** One case: summary row that expands into the message thread with a reply box. */
function CaseRow({ c, onChange }: { c: ReturnCase; onChange: (c: ReturnCase) => void }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const closed = c.status === 'resolved' || c.status === 'declined'
  const reply = async () => {
    if (!text.trim()) return
    setBusy(true)
    setFailure('')
    try {
      onChange(await api<ReturnCase>(`/api/cases/${encodeURIComponent(c.id)}`, { body: { text: text.trim(), attachments: [] } }))
      setText('')
    } catch (e) {
      setFailure(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <motion.li layout initial={{ opacity: 0, backgroundColor: 'rgb(214 195 154 / 0.35)' }} animate={{ opacity: 1, backgroundColor: 'rgb(214 195 154 / 0)' }} transition={{ duration: 1.6, ease: EASE }} className="border-b border-obsidian/10 py-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="meta text-slate">
            {c.id} · {titleCase(c.type)}
            {c.orderId && (
              <>
                {' '}
                · Order{' '}
                <Link href={`/account/orders/${c.orderId}`} className="text-gold-deep hover:underline">
                  {c.orderId}
                </Link>
              </>
            )}
          </p>
          <p className="mt-1.5 text-base text-obsidian">{c.lines.length ? c.lines.map((l) => `${l.name} × ${l.qty}`).join(', ') : c.subject}</p>
          <p className="mt-1 text-xs text-slate">
            {c.reason || c.subject} · Opened {safeDate(c.openedAt)}
            {c.resolution && ` · ${c.resolution}`}
            {c.refund && c.refund.status !== 'not_applicable' && ` · Refund ${money(c.refund.amount)} ${c.refund.status === 'succeeded' ? 'issued' : c.refund.status}`}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <Status value={c.status} />
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="meta h-11 text-gold-deep hover:underline">
            {open ? 'Hide' : 'Messages'} ({c.notes.length})
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-6 space-y-4 border-l border-gold/40 pl-5">
          {c.notes.map((m, i) => (
            <div key={i} className="text-sm">
              <p className="meta text-slate">
                {m.role === 'customer' ? 'You' : m.role === 'system' ? 'Price-Select' : m.by || 'Price-Select support'} · {safeDate(m.at)}
              </p>
              <p className="mt-1 whitespace-pre-line text-obsidian">{m.text}</p>
              {m.attachments.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-3">
                  {m.attachments.map((a) => (
                    <li key={a.id}>
                      <a href={privateAssetUrl(a.id)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-gold-deep hover:underline">
                        <FileText className="size-3" aria-hidden />
                        {a.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {closed ? (
            <p className="text-xs text-slate">This case is closed. Open a new request if you need more help.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void reply()
              }}
              className="space-y-3"
            >
              <label htmlFor={`reply-${c.id}`} className="meta text-slate">
                Reply
              </label>
              <textarea id={`reply-${c.id}`} rows={3} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} className="field resize-y" />
              {failure && <p role="alert" className="text-xs text-danger">{failure}</p>}
              <button type="submit" disabled={busy || !text.trim()} className="meta h-11 text-gold-deep hover:underline disabled:text-slate/50 disabled:no-underline">
                {busy ? 'Sending…' : 'Send reply'}
              </button>
            </form>
          )}
        </div>
      )}
    </motion.li>
  )
}

/* ───────── Saved products ───────── */
export function SavedList({ initial }: { initial: Product[] }) {
  const [items, setItems] = useState(initial)
  const [pending, setPending] = useState<string | null>(null)
  const { add, setOpen } = useCart()
  const toast = useToast()

  const unsave = async (p: Product) => {
    setPending(p.id)
    try {
      await api(`/api/account/saved/${p.id}`, { method: 'PUT', body: { saved: false } })
      setItems((s) => s.filter((x) => x.id !== p.id))
    } catch (e) {
      toast({ title: 'Could not remove', body: errorText(e), tone: 'error' })
    } finally {
      setPending(null)
    }
  }

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
          const live = p.stock !== 'out_of_stock'
          return (
            <motion.li key={p.id} layout exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.5, ease: EASE }}>
              <Link href={`/products/${p.slug}`} className="group block">
                <span className="relative block aspect-[4/5] overflow-hidden bg-pearl">
                  <SafeImage src={p.images[0]?.src ?? ''} alt={p.images[0]?.alt ?? p.name} fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105" />
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
                  onClick={async () => {
                    if (await add(p.id)) {
                      toast({ title: `${p.name} added`, body: 'Prices exclude applicable taxes and shipping.' })
                      setOpen(true)
                    } else toast({ title: 'Could not add to cart', body: 'Please try again.', tone: 'error' })
                  }}
                  className="meta h-11 text-gold-deep underline-offset-4 hover:underline disabled:text-slate/50 disabled:no-underline"
                >
                  {live ? 'Add to cart' : 'Out of stock'}
                </button>
                <button type="button" disabled={pending === p.id} onClick={() => void unsave(p)} className="meta h-11 text-slate hover:text-danger disabled:opacity-50" aria-label={`Remove ${p.name} from saved`}>
                  {pending === p.id ? 'Removing…' : 'Remove'}
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
export type AccountAddress = { id: string; label: string; name: string; line1: string; line2: string; city: string; region: string; postal: string; country: string; phone: string; isDefault: boolean }
type AccountDTO = { name: string; email: string; phone: string; marketingOptIn: boolean; addresses: AccountAddress[]; membership: MembershipState }
const blank: AccountAddress = { id: '', label: '', name: '', line1: '', line2: '', city: '', region: '', postal: '', country: '', phone: '', isDefault: false }
const body = ({ id: _id, ...a }: AccountAddress) => a

export function AddressBook({ initial }: { initial: AccountAddress[] }) {
  const [list, setList] = useState(initial)
  const [editing, setEditing] = useState<AccountAddress | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [failure, setFailure] = useState('')
  const toast = useToast()

  const call = async (key: string, req: () => Promise<AccountDTO>, done: string) => {
    setBusy(key)
    setFailure('')
    try {
      setList((await req()).addresses)
      toast({ title: done })
      return true
    } catch (e) {
      setFailure(errorText(e))
      return false
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    const a = editing!
    const e: Record<string, string> = {}
    for (const k of ['name', 'line1', 'city', 'country'] as const) if (a[k].trim().length < (k === 'city' ? 1 : 2)) e[k] = 'Required.'
    setErrors(e)
    const k = Object.keys(e)[0]
    if (k) return document.getElementById(`ad-${k}`)?.focus()
    if (await call('save', () => api<AccountDTO>(a.id ? `/api/account/addresses/${a.id}` : '/api/account/addresses', { method: a.id ? 'PATCH' : 'POST', body: body(a) }), 'Address saved')) setEditing(null)
  }

  const field = (k: Exclude<keyof AccountAddress, 'id' | 'isDefault'>, label: string, ac: string, cls = '') => (
    <div className={cls}>
      <Label htmlFor={`ad-${k}`}>{label}</Label>
      <input
        id={`ad-${k}`}
        value={editing?.[k] ?? ''}
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
      <div className="lg:col-span-7">
        {failure && !editing && <div className="mb-6"><FormError msg={failure} /></div>}
        <ul className="grid gap-6 sm:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className="flex flex-col border border-obsidian/12 p-6">
              <p className="flex items-center justify-between gap-3">
                <span className="eyebrow text-obsidian">{a.label || 'Address'}</span>
                {a.isDefault && <span className="meta text-gold-deep">Default</span>}
              </p>
              <address className="mt-4 text-sm not-italic leading-relaxed text-slate">
                {a.name}
                <br />
                {a.line1}
                {a.line2 && `, ${a.line2}`}
                <br />
                {[a.city, a.region].filter(Boolean).join(', ')} {a.postal}
                <br />
                {a.country}
              </address>
              <div className="mt-auto flex gap-6 pt-6">
                <button type="button" onClick={() => setEditing(a)} className="meta h-11 text-gold-deep hover:underline">
                  Edit
                </button>
                {!a.isDefault && (
                  <>
                    <button type="button" disabled={!!busy} onClick={() => void call(a.id, () => api<AccountDTO>(`/api/account/addresses/${a.id}`, { method: 'PATCH', body: { ...body(a), isDefault: true } }), 'Default address updated')} className="meta h-11 text-slate hover:text-obsidian disabled:opacity-50">
                      Make default
                    </button>
                    <button type="button" disabled={!!busy} onClick={() => void call(a.id, () => api<AccountDTO>(`/api/account/addresses/${a.id}`, { method: 'DELETE' }), 'Address removed')} className="meta h-11 text-slate hover:text-danger disabled:opacity-50">
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
      </div>

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
                void save()
              }}
              className="grid grid-cols-2 gap-x-6 gap-y-5"
              aria-label={editing.id ? 'Edit address' : 'New address'}
            >
              <p className="col-span-2 font-display text-3xl font-light text-obsidian">{editing.id ? 'Edit address' : 'New address'}</p>
              {field('label', 'Label (optional)', 'off', 'col-span-2')}
              {field('name', 'Full name', 'shipping name', 'col-span-2')}
              {field('line1', 'Street address', 'shipping address-line1', 'col-span-2')}
              {field('line2', 'Apartment, suite (optional)', 'shipping address-line2', 'col-span-2')}
              {field('city', 'City', 'shipping address-level2')}
              {field('region', 'State / region', 'shipping address-level1')}
              {field('postal', 'Postal code', 'shipping postal-code')}
              {field('country', 'Country', 'shipping country-name')}
              {field('phone', 'Phone (optional)', 'shipping tel', 'col-span-2')}
              {failure && <div className="col-span-2"><FormError msg={failure} /></div>}
              <div className="col-span-2 mt-4 flex items-center justify-between gap-4">
                <button type="button" onClick={() => setEditing(null)} className="meta h-11 text-slate hover:text-obsidian">
                  Cancel
                </button>
                <button type="submit" disabled={busy === 'save'} className={btnClass('dark', 'disabled:opacity-50')}>
                  <BtnInner variant="dark">{busy === 'save' ? 'Saving…' : 'Save address'}</BtnInner>
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
export function DetailsForm({ account, paymentsAvailable }: { account: AccountDTO; paymentsAvailable: boolean }) {
  const toast = useToast()
  const router = useRouter()
  const [v, setV] = useState({ name: account.name, phone: account.phone })
  const [optIn, setOptIn] = useState(account.marketingOptIn)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')

  return (
    <div className="grid gap-16 lg:grid-cols-12">
      <div className="space-y-16 lg:col-span-6">
        <form
          noValidate
          className="space-y-6"
          onSubmit={async (e) => {
            e.preventDefault()
            const er: Record<string, string> = {}
            if (v.name.trim().length < 2) er.name = 'Enter your name.'
            if (v.phone.trim() && !/^[+()\d\s.-]{7,30}$/.test(v.phone.trim())) er.phone = 'Enter a valid phone number, or leave it blank.'
            setErrors(er)
            if (Object.keys(er).length) return document.getElementById(`dt-${Object.keys(er)[0]}`)?.focus()
            setBusy(true)
            setFailure('')
            try {
              await api('/api/account', { method: 'PATCH', body: { name: v.name.trim(), phone: v.phone.trim(), marketingOptIn: optIn } })
              toast({ title: 'Details saved' })
              router.refresh()
            } catch (err) {
              setFailure(errorText(err))
            } finally {
              setBusy(false)
            }
          }}
        >
          <h2 className="font-display text-4xl font-light text-obsidian">Personal details</h2>
          <div>
            <Label htmlFor="dt-name">Full name</Label>
            <input id="dt-name" value={v.name} onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))} autoComplete="name" className="field" aria-invalid={!!errors.name || undefined} aria-describedby={errors.name ? 'dt-name-err' : undefined} />
            <Err id="dt-name-err" msg={errors.name} />
          </div>
          <div>
            <Label htmlFor="dt-email">Email</Label>
            <input id="dt-email" type="email" value={account.email} readOnly className="field text-slate" aria-describedby="dt-email-hint" />
            <p id="dt-email-hint" className="mt-1.5 text-xs text-slate/80">Contact support to change the email on your account.</p>
          </div>
          <div>
            <Label htmlFor="dt-phone">Phone (optional)</Label>
            <input id="dt-phone" type="tel" value={v.phone} onChange={(e) => setV((s) => ({ ...s, phone: e.target.value }))} autoComplete="tel" className="field" aria-invalid={!!errors.phone || undefined} aria-describedby={errors.phone ? 'dt-phone-err' : undefined} />
            <Err id="dt-phone-err" msg={errors.phone} />
          </div>

          <fieldset className="pt-6">
            <legend className="meta text-slate">Email preferences</legend>
            <p className="mt-3 text-xs leading-relaxed text-slate">Order, shipping, return and account emails are always sent.</p>
            <label className="mt-2 flex min-h-12 cursor-pointer items-center justify-between gap-6 border-b border-obsidian/8 text-sm text-obsidian">
              Seasonal selection and new arrivals
              <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="peer sr-only" />
              <span aria-hidden className="relative h-5 w-9 shrink-0 border border-obsidian/30 transition-colors peer-checked:border-gold-deep peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-gold">
                <span className={cn('absolute top-1/2 size-3 -translate-y-1/2 transition-all duration-500 ease-[var(--ease-luxe)]', optIn ? 'left-[1.1rem] bg-gold-deep' : 'left-1 bg-obsidian/40')} />
              </span>
            </label>
          </fieldset>

          <FormError msg={failure} />
          <button type="submit" disabled={busy} className={cn(submitCls, 'mt-4')}>
            <BtnInner variant="dark">{busy ? 'Saving…' : 'Save details'}</BtnInner>
          </button>
        </form>

        <PasswordForm />
      </div>

      <aside className="space-y-6 lg:col-span-5 lg:col-start-8">
        <MembershipPanel initial={account.membership} paymentsAvailable={paymentsAvailable} />
        <div className="border border-obsidian/12 p-6 md:p-8">
          <h2 className="eyebrow text-obsidian">Your data</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate">Requests to export or delete account data are handled through support.</p>
          <Link href="/contact" className="link-line link-line--static eyebrow mt-6 text-obsidian">
            Contact support
          </Link>
        </div>
      </aside>
    </div>
  )
}

function PasswordForm() {
  const toast = useToast()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!cur || next.length < 10) return setFailure('Enter your current password and a new password of at least 10 characters.')
        setBusy(true)
        setFailure('')
        try {
          await api('/api/session/password', { body: { currentPassword: cur, newPassword: next } })
          setCur('')
          setNext('')
          toast({ title: 'Password changed', body: 'Other devices have been signed out.' })
        } catch (err) {
          setFailure(errorText(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      <h2 className="font-display text-4xl font-light text-obsidian">Password</h2>
      <div>
        <Label htmlFor="pw-cur">Current password</Label>
        <input id="pw-cur" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" className="field" />
      </div>
      <div>
        <Label htmlFor="pw-new">New password</Label>
        <input id="pw-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={10} className="field" aria-describedby="pw-new-hint" />
        <p id="pw-new-hint" className="mt-1.5 text-xs text-slate/80">At least 10 characters.</p>
      </div>
      <FormError msg={failure} />
      <button type="submit" disabled={busy} className={submitCls}>
        <BtnInner variant="dark">{busy ? 'Updating…' : 'Change password'}</BtnInner>
      </button>
    </form>
  )
}

const TIERS: MembershipTier[] = ['member', 'member_plus']

/** Membership is shown as active only when the server says so; purchase needs a payment provider. */
function MembershipPanel({ initial, paymentsAvailable }: { initial: MembershipState; paymentsAvailable: boolean }) {
  const toast = useToast()
  const [m, setM] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')
  const [unavailable, setUnavailable] = useState(!paymentsAvailable)
  const [key] = useState(idempotencyKey)
  const active = m.status === 'active'
  const label = (t: MembershipTier | null) => (t === 'member_plus' ? MEMBERSHIPS[1][0] : MEMBERSHIPS[0][0])

  const run = async (req: () => Promise<{ membership: MembershipState }>, ok: string) => {
    setBusy(true)
    setFailure('')
    try {
      const r = await req()
      setM(r.membership)
      if (r.membership.status === 'active' || r.membership.cancelAtPeriodEnd) toast({ title: ok })
    } catch (e) {
      if (e instanceof ApiError && e.unavailable) setUnavailable(true)
      else setFailure(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border border-obsidian/12 p-6 md:p-8">
      <h2 className="eyebrow text-obsidian">Membership</h2>
      {active ? (
        <>
          <p className="mt-4 font-display text-3xl font-light text-obsidian">{label(m.tier)}</p>
          <p className="mt-2 text-sm text-slate">
            {m.cancelAtPeriodEnd ? `Ends ${safeDate(m.renewsAt)}. Auto-renewal is off.` : `Renews ${safeDate(m.renewsAt)}.`}
          </p>
          {!m.cancelAtPeriodEnd && (
            <button type="button" disabled={busy} onClick={() => void run(() => api('/api/account/membership', { method: 'DELETE' }), 'Auto-renewal turned off')} className="meta mt-6 h-11 text-slate hover:text-danger disabled:opacity-50">
              {busy ? 'Updating…' : 'Turn off auto-renewal'}
            </button>
          )}
        </>
      ) : (
        <>
          {m.status === 'pending_payment' && <p className="mt-4 text-sm text-warning">A membership payment is awaiting confirmation. Benefits start once it is confirmed.</p>}
          <ul className="mt-4 space-y-5">
            {TIERS.map((t, i) => (
              <li key={t} className="border-t border-obsidian/10 pt-4">
                <p className="flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium text-obsidian">{MEMBERSHIPS[i][0]}</span>
                  <span className="text-sm tabular-nums text-obsidian">{MEMBERSHIPS[i][1]}</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate">{MEMBERSHIPS[i][2]}</p>
                <button type="button" disabled={busy || unavailable || m.status === 'pending_payment'} onClick={() => void run(() => api('/api/account/membership', { body: { tier: t, idempotencyKey: `${key}-${t}` } }), `${MEMBERSHIPS[i][0]} is active`)} className="meta mt-3 h-11 text-gold-deep hover:underline disabled:text-slate/50 disabled:no-underline">
                  {busy ? 'Processing…' : `Join ${MEMBERSHIPS[i][0]}`}
                </button>
              </li>
            ))}
          </ul>
          {unavailable && <p role="status" className="mt-4 text-xs leading-relaxed text-slate">Membership purchase will open once online payment is connected.</p>}
        </>
      )}
      {failure && <p role="alert" className="mt-4 text-xs text-danger">{failure}</p>}
    </div>
  )
}
