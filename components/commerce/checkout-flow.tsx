'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Check, Copy, LockKeyhole } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { api, ApiError, errorText, idempotencyKey } from '@/lib/client/api'
import { money } from '@/lib/format'
import type { CheckoutQuote } from '@/lib/types'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { SafeImage } from '@/components/ui/safe-image'
import { btnClass, BtnInner, ButtonLink } from '@/components/site/ui'
import { groupBySupplier, useCart } from './cart'
import { useSession } from './site-context'

// Checkout. The browser sends product ids, quantities and addresses; the server prices the order,
// reserves stock and takes payment. Nothing is treated as placed until the server confirms it.

const STEPS = ['Information', 'Shipping', 'Review'] as const

type Address = { line1: string; line2: string; city: string; region: string; postal: string; country: string }
const emptyAddress: Address = { line1: '', line2: '', city: '', region: '', postal: '', country: '' }
type Info = { email: string; phone: string; first: string; last: string; ship: Address; billingSame: boolean; bill: Address; save: boolean }
type Errors = Record<string, string>
type Placed = { orderId: string; status: string; paymentStatus: string; total: number; guestAccessToken?: string; email: string; shipments: number }
type AccountAddress = Address & { id: string; name: string; phone: string; isDefault: boolean }
type Account = { name: string; email: string; phone: string; addresses: AccountAddress[] }

function validate(i: Info): Errors {
  const e: Errors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim())) e.email = 'Enter a valid email address.'
  if (i.phone.trim() && !/^[+()\d\s.-]{7,}$/.test(i.phone.trim())) e.phone = 'Enter a valid phone number, or leave it blank.'
  if (!i.first.trim()) e.first = 'Enter your first name.'
  if (!i.last.trim()) e.last = 'Enter your last name.'
  const addr = (a: Address, p: string) => {
    if (a.line1.trim().length < 2) e[`${p}.line1`] = 'Enter a street address.'
    if (!a.city.trim()) e[`${p}.city`] = 'Enter a city.'
    if (!a.region.trim()) e[`${p}.region`] = 'Enter a state or region.'
    if (!a.postal.trim()) e[`${p}.postal`] = 'Enter a postal code.'
    if (a.country.trim().length < 2) e[`${p}.country`] = 'Enter a country.'
  }
  addr(i.ship, 'ship')
  if (!i.billingSame) addr(i.bill, 'bill')
  return e
}

const snapshot = (i: Info, a: Address) => ({ name: `${i.first.trim()} ${i.last.trim()}`.trim(), ...a, phone: i.phone.trim() })

export function CheckoutFlow() {
  const { items, lines, quote, ready, busy, error: cartError, reload, clearLocal } = useCart()
  const session = useSession()
  const customer = session?.role === 'customer'
  const [step, setStep] = useState(0)
  const [info, setInfo] = useState<Info>({ email: '', phone: '', first: '', last: '', ship: emptyAddress, billingSame: true, bill: emptyAddress, save: false })
  const [errors, setErrors] = useState<Errors>({})
  const [placing, setPlacing] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [placed, setPlaced] = useState<Placed | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)
  // One key per checkout attempt, kept across retries so a resubmission can never create a second order.
  const key = useRef('')
  if (!key.current) key.current = idempotencyKey()

  // Prefill from the signed-in customer's account (default address first).
  useEffect(() => {
    if (!customer) return
    let live = true
    api<Account>('/api/account')
      .then((a) => {
        if (!live) return
        const d = a.addresses.find((x) => x.isDefault) ?? a.addresses[0]
        const [fn, ...ln] = (d?.name || a.name).split(' ')
        setInfo((s) => ({
          ...s,
          email: s.email || a.email,
          phone: s.phone || d?.phone || a.phone,
          first: s.first || fn || '',
          last: s.last || ln.join(' '),
          ship: s.ship.line1 || !d ? s.ship : { line1: d.line1, line2: d.line2, city: d.city, region: d.region, postal: d.postal, country: d.country },
        }))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [customer])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    heading.current?.focus({ preventScroll: true })
    document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step, placed])

  if (placed) return <Confirmation order={placed} headingRef={heading} />

  if (!ready || (items.length > 0 && !quote && !cartError)) return <div className="min-h-[60svh]" aria-busy="true" />

  if (!items.length || !quote)
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="font-display text-5xl font-light text-obsidian">{cartError && items.length ? 'Your cart could not be loaded.' : 'Your cart is empty.'}</p>
        <p className="mt-4 text-sm text-slate">{cartError && items.length ? cartError : 'Add products to your cart to begin checkout.'}</p>
        <ButtonLink href="/shop" variant="dark" className="mt-10">
          Shop the selection
        </ButtonLink>
      </div>
    )

  const groups = groupBySupplier(lines)
  const blockers = [...new Map(quote.blockers.filter((b) => b.code !== 'empty').map((b) => [b.message, b])).values()]
  const unavailable = blockers.some((b) => b.code.endsWith('_not_configured'))

  const setField = (k: 'email' | 'phone' | 'first' | 'last') => (v: string) => setInfo((s) => ({ ...s, [k]: v }))
  const setAddr = (which: 'ship' | 'bill', k: keyof Address) => (v: string) => setInfo((s) => ({ ...s, [which]: { ...s[which], [k]: v } }))
  const err = (k: string) => errors[k]

  const continueInfo = () => {
    const e = validate(info)
    setErrors(e)
    const firstKey = Object.keys(e)[0]
    if (firstKey) {
      document.getElementById(`co-${firstKey.replace('.', '-')}`)?.focus()
      return
    }
    setStep(1)
  }

  const placeOrder = async () => {
    setPlacing(true)
    setSubmitError('')
    try {
      const r = await api<Omit<Placed, 'email' | 'shipments'>>('/api/checkout', {
        body: {
          items,
          email: info.email.trim(),
          shipTo: snapshot(info, info.ship),
          billTo: info.billingSame ? undefined : snapshot(info, info.bill),
          idempotencyKey: key.current,
          saveAddress: customer && info.save ? true : undefined,
        },
      })
      setPlaced({ ...r, email: info.email.trim(), shipments: quote.shipments })
      // The server cart is cleared by the server for customers; guests clear this browser only now.
      if (customer) void reload()
      else clearLocal()
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        // A declined payment closes that attempt; a fresh key lets the customer try again.
        key.current = idempotencyKey()
        setSubmitError(`${e.message} You have not been charged for this attempt.`)
      } else if (e instanceof ApiError && e.status === 409) {
        setSubmitError(errorText(e))
        void reload()
      } else setSubmitError(errorText(e))
    } finally {
      setPlacing(false)
    }
  }

  const addressFields = (which: 'ship' | 'bill') => {
    const a = info[which]
    const sec = which === 'ship' ? 'shipping' : 'billing'
    return (
      <div className="grid gap-x-6 gap-y-2 sm:grid-cols-6">
        <Field id={`co-${which}-line1`} label="Street address" error={err(`${which}.line1`)} className="sm:col-span-6" value={a.line1} onValue={setAddr(which, 'line1')} autoComplete={`${sec} address-line1`} />
        <Field id={`co-${which}-line2`} label="Apartment, suite (optional)" className="sm:col-span-6" value={a.line2} onValue={setAddr(which, 'line2')} autoComplete={`${sec} address-line2`} />
        <Field id={`co-${which}-city`} label="City" error={err(`${which}.city`)} className="sm:col-span-3" value={a.city} onValue={setAddr(which, 'city')} autoComplete={`${sec} address-level2`} />
        <Field id={`co-${which}-region`} label="State / region" error={err(`${which}.region`)} className="sm:col-span-3" value={a.region} onValue={setAddr(which, 'region')} autoComplete={`${sec} address-level1`} />
        <Field id={`co-${which}-postal`} label="Postal code" error={err(`${which}.postal`)} className="sm:col-span-2" value={a.postal} onValue={setAddr(which, 'postal')} autoComplete={`${sec} postal-code`} />
        <Field id={`co-${which}-country`} label="Country" error={err(`${which}.country`)} className="sm:col-span-4" value={a.country} onValue={setAddr(which, 'country')} autoComplete={`${sec} country-name`} hint="Launch countries are being confirmed." />
      </div>
    )
  }

  return (
    <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        <StepIndicator step={step} onGo={(n) => n < step && setStep(n)} />

        {unavailable && (
          <div role="status" className="mt-10 border border-warning/40 bg-warning/10 px-5 py-4 text-sm text-obsidian">
            <p className="eyebrow text-warning">Ordering is not open yet</p>
            <ul className="mt-2 space-y-1 text-obsidian/80">
              {blockers
                .filter((b) => b.code.endsWith('_not_configured'))
                .map((b) => (
                  <li key={b.code}>{b.message}</li>
                ))}
            </ul>
          </div>
        )}

        <div className="mt-12">
          <h2 ref={heading} tabIndex={-1} className="font-display text-4xl font-light text-obsidian outline-none md:text-5xl">
            {['Your information', 'Shipping', 'Review your order'][step]}
          </h2>

          {step === 0 && (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                continueInfo()
              }}
              className="mt-10 space-y-12"
            >
              <fieldset>
                <legend className="eyebrow text-obsidian">Contact</legend>
                {!customer && (
                  <p className="mt-2 text-sm text-slate">
                    Checking out as a guest.{' '}
                    <Link href="/sign-in/customers?next=/checkout" className="text-gold-deep underline underline-offset-4">
                      Sign in
                    </Link>{' '}
                    to use your saved details and see this order in your account.
                  </p>
                )}
                <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <Field id="co-email" type="email" label="Email" error={err('email')} value={info.email} onValue={setField('email')} autoComplete="email" inputMode="email" hint="For your order confirmation." />
                  <Field id="co-phone" type="tel" label="Phone (optional)" error={err('phone')} value={info.phone} onValue={setField('phone')} autoComplete="tel" hint="For delivery coordination." />
                  <Field id="co-first" label="First name" error={err('first')} value={info.first} onValue={setField('first')} autoComplete="given-name" />
                  <Field id="co-last" label="Last name" error={err('last')} value={info.last} onValue={setField('last')} autoComplete="family-name" />
                </div>
              </fieldset>

              <fieldset>
                <legend className="eyebrow text-obsidian">Shipping address</legend>
                <div className="mt-4">{addressFields('ship')}</div>
                {customer && (
                  <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-obsidian">
                    <input type="checkbox" checked={info.save} onChange={(e) => setInfo((s) => ({ ...s, save: e.target.checked }))} className="size-4 accent-[var(--color-gold-deep)]" />
                    Save this address to my account
                  </label>
                )}
              </fieldset>

              <fieldset>
                <legend className="eyebrow text-obsidian">Billing address</legend>
                <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-4 text-sm text-obsidian">
                  <input type="checkbox" className="peer sr-only" checked={info.billingSame} onChange={(e) => setInfo((s) => ({ ...s, billingSame: e.target.checked }))} />
                  <span aria-hidden className="relative h-5 w-9 shrink-0 border border-obsidian/30 transition-colors peer-checked:border-gold-deep peer-checked:bg-gold-deep/10 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-gold">
                    <span className={cn('absolute top-1/2 size-3 -translate-y-1/2 transition-all duration-500 ease-[var(--ease-luxe)]', info.billingSame ? 'left-[1.1rem] bg-gold-deep' : 'left-1 bg-obsidian/40')} />
                  </span>
                  Same as shipping address
                </label>
                {!info.billingSame && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4, ease: EASE }} className="mt-4 overflow-hidden">
                    {addressFields('bill')}
                  </motion.div>
                )}
              </fieldset>

              {Object.keys(errors).length > 0 && (
                <p role="alert" className="border-l border-danger pl-4 text-sm text-danger">
                  Please review the {Object.keys(errors).length} highlighted field{Object.keys(errors).length === 1 ? '' : 's'}.
                </p>
              )}
              <Actions next="Continue to shipping" />
            </form>
          )}

          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStep(2)
              }}
              className="mt-10 space-y-12"
            >
              <p className="text-sm leading-relaxed text-slate">Products may ship separately when fulfilled by different suppliers. Each shipment receives its own tracking.</p>
              {groups.map((g, gi) => (
                <fieldset key={g.supplierId}>
                  <legend className="flex w-full items-baseline justify-between gap-4 border-b border-obsidian/15 pb-3">
                    <span className="eyebrow text-obsidian">
                      Shipment {gi + 1} of {groups.length}
                    </span>
                  </legend>
                  <ul className="mt-4 space-y-3">
                    {g.items.map((l) => (
                      <li key={l.productId} className="flex items-center gap-4 text-sm">
                        <span className="relative size-12 shrink-0 overflow-hidden bg-pearl">
                          <SafeImage src={l.image?.src ?? ''} alt="" fill sizes="48px" className="object-cover" />
                        </span>
                        <span className="flex-1 text-obsidian">
                          {l.name} <span className="text-slate">× {l.qty}</span>
                          {l.problem && <span className="block text-xs text-danger">{l.problem}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ))}
              <p className="text-sm text-slate">
                Shipping: <span className="tabular-nums text-obsidian">{quote.shipping == null ? 'not yet available' : money(quote.shipping)}</span>
              </p>
              <Actions next="Continue to review" onBack={() => setStep(0)} />
            </form>
          )}

          {step === 2 && (
            <div className="mt-10 space-y-12">
              <dl className="grid gap-8 border-y border-obsidian/10 py-8 text-sm sm:grid-cols-3">
                <ReviewBlock title="Contact" onEdit={() => setStep(0)}>
                  {info.first} {info.last}
                  <br />
                  {info.email}
                  {info.phone && (
                    <>
                      <br />
                      {info.phone}
                    </>
                  )}
                </ReviewBlock>
                <ReviewBlock title="Ship to" onEdit={() => setStep(0)}>
                  {info.ship.line1}
                  {info.ship.line2 && `, ${info.ship.line2}`}
                  <br />
                  {info.ship.city}, {info.ship.region} {info.ship.postal}
                  <br />
                  {info.ship.country}
                </ReviewBlock>
                <ReviewBlock title="Bill to" onEdit={() => setStep(0)}>
                  {info.billingSame ? 'Same as shipping' : `${info.bill.line1}, ${info.bill.city}`}
                </ReviewBlock>
              </dl>

              {groups.map((g, gi) => (
                <section key={g.supplierId} aria-labelledby={`rv-${gi}`}>
                  <header className="flex items-baseline justify-between gap-4 border-b border-obsidian/15 pb-3">
                    <h3 id={`rv-${gi}`} className="eyebrow text-obsidian">
                      Shipment {gi + 1} of {groups.length}
                    </h3>
                  </header>
                  <ul>
                    {g.items.map((l) => (
                      <li key={l.productId} className="flex items-center gap-4 border-b border-obsidian/8 py-4 text-sm">
                        <span className="relative h-16 w-13 shrink-0 overflow-hidden bg-pearl">
                          <SafeImage src={l.image?.src ?? ''} alt="" fill sizes="52px" className="object-cover" />
                        </span>
                        <span className="flex-1">
                          <span className="block text-obsidian">{l.name}</span>
                          <span className="text-xs text-slate">
                            {l.qty} × {money(l.unitPrice)}
                          </span>
                          {l.problem && <span className="block text-xs text-danger">{l.problem}</span>}
                        </span>
                        <span className="tabular-nums text-obsidian">{money(l.unitPrice * l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <div className="max-w-md sm:ml-auto">
                <Totals quote={quote} />
              </div>

              {blockers.length > 0 && (
                <ul role="status" className="space-y-1 border-l border-warning pl-4 text-sm text-obsidian/80">
                  {blockers.map((b) => (
                    <li key={b.message}>{b.message}</li>
                  ))}
                </ul>
              )}
              {submitError && (
                <p role="alert" className="border-l border-danger pl-4 text-sm text-danger">
                  {submitError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setStep(1)} className="link-line eyebrow h-11 text-slate hover:text-obsidian">
                  Back
                </button>
                <button type="button" onClick={placeOrder} disabled={placing || busy || blockers.length > 0} aria-describedby="co-place-note" className={btnClass('dark', 'disabled:cursor-not-allowed disabled:opacity-50')}>
                  <BtnInner variant="dark">{placing ? 'Placing order…' : `Place order${quote.total != null ? ` · ${money(quote.total)}` : ''}`}</BtnInner>
                </button>
              </div>
              <p id="co-place-note" className="flex items-start gap-2 text-xs leading-relaxed text-slate">
                <LockKeyhole className="mt-0.5 size-3 shrink-0" aria-hidden />
                {blockers.length > 0 ? 'Placing an order is disabled until the items above are resolved.' : 'Payment is taken securely by the payment provider when you place the order. Card details never touch Price-Select servers.'}
              </p>
            </div>
          )}
        </div>
      </div>

      <aside className="lg:col-span-4 lg:col-start-9" aria-labelledby="co-summary">
        <div className="border border-obsidian/12 bg-pearl/50 p-6 md:p-8 lg:sticky lg:top-28">
          <h2 id="co-summary" className="eyebrow text-obsidian">
            Order summary
          </h2>
          <ul className="mt-6 space-y-4">
            {lines.map((l) => (
              <li key={l.productId} className="flex items-center gap-4 text-sm">
                <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-pearl">
                  <SafeImage src={l.image?.src ?? ''} alt="" fill sizes="44px" className="object-cover" />
                  <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center bg-ivory px-1 text-[9px] text-obsidian">{l.qty}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-obsidian">{l.name}</span>
                <span className="tabular-nums text-obsidian">{money(l.unitPrice * l.qty)}</span>
              </li>
            ))}
          </ul>
          <Totals quote={quote} />
          <Link href="/cart" className="link-line eyebrow mt-6 text-slate hover:text-obsidian">
            Edit cart
          </Link>
        </div>
      </aside>
    </div>
  )
}

export function Totals({ quote: q }: { quote: CheckoutQuote }) {
  const na = <span className="text-slate">Not yet available</span>
  return (
    <>
      <dl className="mt-6 space-y-3 border-t border-obsidian/10 pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate">Product subtotal</dt>
          <dd className="tabular-nums">{money(q.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate">
            Shipping <span className="text-xs text-slate/70">({q.shipments} shipment{q.shipments === 1 ? '' : 's'})</span>
          </dt>
          <dd className="tabular-nums">{q.shipping == null ? na : money(q.shipping)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate">Applicable taxes</dt>
          <dd className="tabular-nums">{q.tax == null ? na : money(q.tax)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate">Discounts{q.membershipTier && <span className="block text-xs text-slate/70">Membership pricing applied</span>}</dt>
          <dd className="tabular-nums">{q.discount ? `−${money(q.discount)}` : money(0)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex items-baseline justify-between border-t border-obsidian/15 pt-5">
        <p className="eyebrow">{q.total == null ? 'Products total' : 'Total'}</p>
        <p className="font-display text-3xl font-light tabular-nums">{money(q.total ?? q.subtotal - q.discount)}</p>
      </div>
    </>
  )
}

function StepIndicator({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="grid grid-cols-3">
        {STEPS.map((s, i) => {
          const done = i < step
          const cur = i === step
          return (
            <li key={s} className="relative">
              <button
                type="button"
                disabled={!done}
                onClick={() => onGo(i)}
                aria-current={cur ? 'step' : undefined}
                className={cn('flex min-h-11 w-full flex-col items-start gap-1 pb-4 text-left disabled:cursor-default', cur ? 'text-obsidian' : done ? 'text-obsidian/70 hover:text-gold-deep' : 'text-slate/50')}
              >
                <span className="meta flex items-center gap-2 tabular-nums">
                  {done ? <Check className="size-3 text-gold-deep" aria-hidden /> : `0${i + 1}`}
                  {done && <span className="sr-only">Completed:</span>}
                </span>
                <span className="max-w-full truncate pr-2 text-[0.6rem] font-semibold uppercase tracking-[0.06em] sm:text-xs sm:tracking-[0.14em]">{s}</span>
              </button>
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-obsidian/12" />
              {(done || cur) && <motion.span aria-hidden layoutId={done ? undefined : 'co-step'} className={cn('absolute inset-x-0 bottom-0 h-px', cur ? 'bg-gold' : 'bg-obsidian/50')} transition={{ duration: 0.6, ease: EASE }} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function Field({
  id,
  label,
  error,
  hint,
  className,
  onValue,
  ...rest
}: { id: string; label: string; error?: string; hint?: string; className?: string; onValue: (v: string) => void } & Omit<ComponentProps<'input'>, 'id' | 'className' | 'onChange'>) {
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('pt-4', className)}>
      <label htmlFor={id} className="meta text-slate">
        {label}
      </label>
      <input id={id} {...rest} onChange={(e) => onValue(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={desc} className={cn('field', error && 'border-b-danger')} />
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate/80">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

function Actions({ next, onBack }: { next: string; onBack?: () => void }) {
  return (
    <div className="flex flex-col-reverse gap-4 border-t border-obsidian/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
      {onBack ? (
        <button type="button" onClick={onBack} className="link-line eyebrow h-11 text-slate hover:text-obsidian">
          Back
        </button>
      ) : (
        <Link href="/cart" className="link-line eyebrow h-11 text-slate hover:text-obsidian">
          Return to cart
        </Link>
      )}
      <button type="submit" className={btnClass('dark', 'sm:min-w-64')}>
        <BtnInner variant="dark">{next}</BtnInner>
      </button>
    </div>
  )
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div>
      <dt className="flex items-center justify-between">
        <span className="meta text-slate">{title}</span>
        <button type="button" onClick={onEdit} className="meta text-gold-deep hover:underline" aria-label={`Edit ${title.toLowerCase()}`}>
          Edit
        </button>
      </dt>
      <dd className="mt-3 leading-relaxed text-obsidian">{children}</dd>
    </div>
  )
}

function Confirmation({ order, headingRef }: { order: Placed; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const [copied, setCopied] = useState(false)
  const paid = order.paymentStatus === 'captured' || order.paymentStatus === 'authorized'
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="mx-auto max-w-3xl">
      {!paid && (
        <p role="status" className="flex flex-wrap items-center gap-3 border border-warning/40 bg-warning/10 px-5 py-3 text-sm text-obsidian">
          <span className="eyebrow text-warning">Payment pending</span>
          Your order is reserved while the payment provider confirms the payment.
        </p>
      )}
      <p className="eyebrow mt-14 text-gold-deep">Order received</p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-display-3 text-obsidian outline-none">
        Thank you. <em className="text-gold-deep">Selected.</em>
      </h2>
      <dl className="mt-10 grid gap-6 border-y border-obsidian/10 py-8 sm:grid-cols-3">
        <div>
          <dt className="meta text-slate">Order number</dt>
          <dd className="mt-2 font-display text-3xl font-light tabular-nums text-obsidian">{order.orderId}</dd>
        </div>
        <div>
          <dt className="meta text-slate">Shipments</dt>
          <dd className="mt-2 font-display text-3xl font-light text-obsidian">{order.shipments}</dd>
        </div>
        <div>
          <dt className="meta text-slate">Total</dt>
          <dd className="mt-2 font-display text-3xl font-light tabular-nums text-obsidian">{money(order.total)}</dd>
        </div>
      </dl>

      {order.guestAccessToken && (
        <section aria-labelledby="access-title" className="mt-10 border border-gold/50 bg-pearl/60 p-6">
          <h3 id="access-title" className="eyebrow text-obsidian">
            Your order access code
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate">Copy and keep this code now — it is shown only once. You need it with your order number to track this order without an account.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="break-all border border-obsidian/15 bg-ivory px-3 py-2 text-sm text-obsidian">{order.guestAccessToken}</code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(order.guestAccessToken!)
                  setCopied(true)
                } catch {}
              }}
              className="meta flex h-11 items-center gap-2 border border-obsidian/20 px-4 text-obsidian hover:border-gold-deep"
            >
              {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? 'Copied' : 'Copy code'}
            </button>
          </div>
        </section>
      )}

      <h3 className="eyebrow mt-14 text-obsidian">What happens next</h3>
      <ol className="mt-6">
        {[
          ['Supplier acknowledgment', 'Each approved supplier confirms its part of your order.'],
          ['Prepared and shipped', `Your order ships in ${order.shipments} shipment${order.shipments === 1 ? '' : 's'}; each receives its own carrier and tracking number.`],
          ['Track every shipment', 'Follow each fulfillment from your account, and request help, a return or a cancellation there.'],
        ].map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[3rem_1fr] border-t border-obsidian/10 py-5">
            <span className="meta text-gold-deep">0{i + 1}</span>
            <span>
              <span className="block text-sm font-medium text-obsidian">{t}</span>
              <span className="mt-1 block text-sm text-slate">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-slate">
        Order updates for this order use <span className="text-obsidian">{order.email}</span>.
      </p>
      <div className="mt-12 flex flex-wrap gap-4">
        <ButtonLink href={order.guestAccessToken ? '/track' : `/account/orders/${order.orderId}`} variant="dark">
          {order.guestAccessToken ? 'Track this order' : 'View your order'}
        </ButtonLink>
        <ButtonLink href="/shop" variant="outline-dark">
          Continue shopping
        </ButtonLink>
      </div>
    </motion.div>
  )
}
