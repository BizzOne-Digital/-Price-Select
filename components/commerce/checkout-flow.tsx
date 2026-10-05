'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'motion/react'
import { Check, LockKeyhole } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { money } from '@/lib/format'
import { DEMO_SHIPPING_PER_SHIPMENT } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { btnClass, BtnInner, Button, ButtonLink, DemoNote } from '@/components/site/ui'
import { useCart, type ResolvedLine } from './cart'
import { groupBySupplier } from './cart-page'

// Provider-ready checkout. Nothing here is sent anywhere: payment, tax and carriers are not yet
// connected. Replace the demo shipping options and the payment mount with provider integrations.

const STEPS = ['Information', 'Shipping', 'Payment', 'Review'] as const
const SHIP_OPTIONS = [
  { id: 'standard', label: 'Standard', detail: 'Supplier’s standard service', price: DEMO_SHIPPING_PER_SHIPMENT },
  { id: 'priority', label: 'Priority', detail: 'Faster handling where the supplier offers it', price: DEMO_SHIPPING_PER_SHIPMENT + 20 },
] as const

type Address = { line1: string; line2: string; city: string; region: string; postal: string; country: string }
const emptyAddress: Address = { line1: '', line2: '', city: '', region: '', postal: '', country: '' }
type Info = { email: string; phone: string; first: string; last: string; ship: Address; billingSame: boolean; bill: Address }
type Errors = Record<string, string>

function validate(i: Info): Errors {
  const e: Errors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim())) e.email = 'Enter a valid email address.'
  if (i.phone.trim() && !/^[+()\d\s.-]{7,}$/.test(i.phone.trim())) e.phone = 'Enter a valid phone number, or leave it blank.'
  if (!i.first.trim()) e.first = 'Enter your first name.'
  if (!i.last.trim()) e.last = 'Enter your last name.'
  const addr = (a: Address, p: string) => {
    if (!a.line1.trim()) e[`${p}.line1`] = 'Enter a street address.'
    if (!a.city.trim()) e[`${p}.city`] = 'Enter a city.'
    if (!a.region.trim()) e[`${p}.region`] = 'Enter a state or region.'
    if (!a.postal.trim()) e[`${p}.postal`] = 'Enter a postal code.'
    if (!a.country.trim()) e[`${p}.country`] = 'Enter a country.'
  }
  addr(i.ship, 'ship')
  if (!i.billingSame) addr(i.bill, 'bill')
  return e
}

export function CheckoutFlow() {
  const { lines, ready, clear } = useCart()
  const [step, setStep] = useState(0)
  const [info, setInfo] = useState<Info>({ email: '', phone: '', first: '', last: '', ship: emptyAddress, billingSame: true, bill: emptyAddress })
  const [errors, setErrors] = useState<Errors>({})
  const [ship, setShip] = useState<Record<string, string>>({})
  const [placed, setPlaced] = useState<{ id: string; lines: ResolvedLine[]; total: number; email: string; shipments: number } | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    heading.current?.focus({ preventScroll: true })
    document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [step, placed])

  if (!ready) return <div className="min-h-[60svh]" aria-busy="true" />

  if (placed) return <Confirmation order={placed} headingRef={heading} />

  if (!lines.length)
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="font-display text-5xl font-light text-obsidian">Your cart is empty.</p>
        <p className="mt-4 text-sm text-slate">Add products to your cart to begin checkout.</p>
        <ButtonLink href="/shop" variant="dark" className="mt-10">
          Shop the selection
        </ButtonLink>
      </div>
    )

  const groups = groupBySupplier(lines)
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
  const shipping = groups.reduce((s, g) => s + (SHIP_OPTIONS.find((o) => o.id === (ship[g.supplierId] ?? 'standard'))?.price ?? 0), 0)
  const discount = 0
  const total = subtotal + shipping - discount

  const setField = (k: keyof Info) => (v: string) => setInfo((s) => ({ ...s, [k]: v }))
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

  const placeOrder = () => {
    // Demonstration only: no payment is authorized and nothing leaves the browser.
    const id = `PS-${Math.floor(100000 + Math.random() * 900000)}`
    setPlaced({ id, lines, total, email: info.email, shipments: groups.length })
    clear()
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

        <div className="mt-12">
          <h2 ref={heading} tabIndex={-1} className="font-display text-4xl font-light text-obsidian outline-none md:text-5xl">
            {['Your information', 'Shipping', 'Payment', 'Review your order'][step]}
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
                <p className="mt-2 text-sm text-slate">
                  Checking out as a guest.{' '}
                  <Link href="/account" className="text-gold-deep underline underline-offset-4">
                    Sign in
                  </Link>{' '}
                  for a faster checkout (accounts are not yet connected).
                </p>
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
              <p className="text-sm leading-relaxed text-slate">
                Products may ship separately when fulfilled by different suppliers. Choose a service for each shipment.
              </p>
              {groups.map((g, gi) => (
                <fieldset key={g.supplierId}>
                  <legend className="flex w-full items-baseline justify-between gap-4 border-b border-obsidian/15 pb-3">
                    <span className="eyebrow text-obsidian">
                      Shipment {gi + 1} of {groups.length}
                    </span>
                  </legend>
                  <ul className="mt-4 space-y-3">
                    {g.items.map((l) => (
                      <li key={l.slug} className="flex items-center gap-4 text-sm">
                        <span className="relative size-12 shrink-0 overflow-hidden bg-pearl">
                          <Image src={l.product.images[0].src} alt="" fill sizes="48px" className="object-cover" />
                        </span>
                        <span className="flex-1 text-obsidian">
                          {l.product.name} <span className="text-slate">× {l.qty}</span>
                        </span>
                        <span className="text-xs text-slate">Est. {l.product.deliveryEstimate}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {SHIP_OPTIONS.map((o) => {
                      const on = (ship[g.supplierId] ?? 'standard') === o.id
                      return (
                        <label key={o.id} className={cn('relative flex min-h-11 cursor-pointer items-start justify-between gap-4 border p-4 transition-colors', on ? 'border-gold-deep bg-pearl/60' : 'border-obsidian/15 hover:border-obsidian/40')}>
                          <input type="radio" name={`ship-${g.supplierId}`} value={o.id} checked={on} onChange={() => setShip((s) => ({ ...s, [g.supplierId]: o.id }))} className="peer sr-only" />
                          <span aria-hidden className="absolute inset-0 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold" />
                          <span>
                            <span className="block text-sm font-medium text-obsidian">{o.label}</span>
                            <span className="mt-1 block text-xs text-slate">{o.detail}</span>
                          </span>
                          <span className="text-right">
                            <span className="block text-sm tabular-nums text-obsidian">{money(o.price)}</span>
                            <span className="meta text-[0.6rem] text-slate">Demo rate</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              ))}
              <DemoNote>Demo rates — carriers are not yet connected</DemoNote>
              <Actions next="Continue to payment" onBack={() => setStep(0)} />
            </form>
          )}

          {step === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStep(3)
              }}
              className="mt-10 space-y-10"
            >
              <section aria-labelledby="pay-mount" className="border border-obsidian/15">
                <div className="flex items-center gap-3 border-b border-obsidian/10 px-6 py-4">
                  <LockKeyhole className="size-4 text-gold-deep" strokeWidth={1.3} aria-hidden />
                  <h3 id="pay-mount" className="eyebrow text-obsidian">
                    Secure payment field
                  </h3>
                </div>
                {/* The payment provider's hosted form mounts here. Card data never touches Price-Select servers. */}
                <div id="payment-provider-mount" data-provider="unconnected" className="m-6 grid min-h-48 place-items-center border border-dashed border-obsidian/20 bg-pearl/40 p-8 text-center">
                  <div className="max-w-sm">
                    <p className="text-sm leading-relaxed text-obsidian">Mounts the payment provider’s hosted form; no card data touches Price-Select servers.</p>
                    <p className="meta mt-4 text-warning">Provider not yet connected</p>
                  </div>
                </div>
              </section>
              <p className="text-sm text-slate">
                Billing address: {info.billingSame ? 'same as shipping' : `${info.bill.line1}, ${info.bill.city}`}.{' '}
                <button type="button" onClick={() => setStep(0)} className="text-gold-deep underline underline-offset-4">
                  Change
                </button>
              </p>
              <Actions next="Continue to review" onBack={() => setStep(1)} />
            </form>
          )}

          {step === 3 && (
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
                <ReviewBlock title="Payment" onEdit={() => setStep(2)}>
                  Provider not yet connected
                </ReviewBlock>
              </dl>

              {groups.map((g, gi) => {
                const opt = SHIP_OPTIONS.find((o) => o.id === (ship[g.supplierId] ?? 'standard'))!
                return (
                  <section key={g.supplierId} aria-labelledby={`rv-${gi}`}>
                    <header className="flex items-baseline justify-between gap-4 border-b border-obsidian/15 pb-3">
                      <h3 id={`rv-${gi}`} className="eyebrow text-obsidian">
                        Shipment {gi + 1} of {groups.length}
                      </h3>
                      <p className="meta text-slate">
                        {opt.label} · {money(opt.price)}
                      </p>
                    </header>
                    <ul>
                      {g.items.map((l) => (
                        <li key={l.slug} className="flex items-center gap-4 border-b border-obsidian/8 py-4 text-sm">
                          <span className="relative h-16 w-13 shrink-0 overflow-hidden bg-pearl">
                            <Image src={l.product.images[0].src} alt="" fill sizes="52px" className="object-cover" />
                          </span>
                          <span className="flex-1">
                            <span className="block text-obsidian">{l.product.name}</span>
                            <span className="text-xs text-slate">
                              {l.qty} × {money(l.unitPrice)}
                            </span>
                          </span>
                          <span className="tabular-nums text-obsidian">{money(l.unitPrice * l.qty)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}

              <div className="max-w-md sm:ml-auto">
                <Totals subtotal={subtotal} shipping={shipping} shipments={groups.length} discount={discount} total={total} />
              </div>

              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => setStep(2)} className="link-line eyebrow h-11 text-slate hover:text-obsidian">
                  Back
                </button>
                <Button type="button" onClick={placeOrder} variant="dark">
                  Place demonstration order · {money(total)}
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-slate">This is a demonstration environment. Placing this order does not take a payment or contact any supplier.</p>
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
              <li key={l.slug} className="flex items-center gap-4 text-sm">
                <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-pearl">
                  <Image src={l.product.images[0].src} alt="" fill sizes="44px" className="object-cover" />
                  <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center bg-obsidian px-1 text-[9px] text-ivory">{l.qty}</span>
                </span>
                <span className="min-w-0 flex-1 truncate text-obsidian">{l.product.name}</span>
                <span className="tabular-nums text-obsidian">{money(l.unitPrice * l.qty)}</span>
              </li>
            ))}
          </ul>
          <Totals subtotal={subtotal} shipping={step >= 1 ? shipping : null} shipments={groups.length} discount={discount} total={total} />
          <Link href="/cart" className="link-line eyebrow mt-6 text-slate hover:text-obsidian">
            Edit cart
          </Link>
        </div>
      </aside>
    </div>
  )
}

export function Totals({ subtotal, shipping, shipments, discount, total }: { subtotal: number; shipping: number | null; shipments: number; discount: number; total: number }) {
  return (
    <>
      <dl className="mt-6 space-y-3 border-t border-obsidian/10 pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate">Product subtotal</dt>
          <dd className="tabular-nums">{money(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate">
            Shipping <span className="text-xs text-slate/70">({shipments} shipment{shipments === 1 ? '' : 's'}, demo)</span>
          </dt>
          <dd className="tabular-nums">{shipping === null ? 'Next step' : money(shipping)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate">
            Applicable taxes
            <span className="block text-xs text-slate/70">Calculated by tax provider (not yet connected)</span>
          </dt>
          <dd className="text-slate">—</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate">Discounts</dt>
          <dd className="tabular-nums">{discount ? `−${money(discount)}` : money(0)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex items-baseline justify-between border-t border-obsidian/15 pt-5">
        <p className="eyebrow">Total</p>
        <p className="font-display text-3xl font-light tabular-nums">{money(shipping === null ? subtotal - discount : total)}</p>
      </div>
    </>
  )
}

function StepIndicator({ step, onGo }: { step: number; onGo: (n: number) => void }) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="grid grid-cols-4">
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

function Confirmation({ order, headingRef }: { order: { id: string; lines: ResolvedLine[]; total: number; email: string; shipments: number }; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="mx-auto max-w-3xl">
      <p role="status" className="flex items-center gap-3 border border-warning/40 bg-warning/10 px-5 py-3 text-sm text-obsidian">
        <span className="eyebrow text-warning">Demonstration order</span>
        No payment was taken and no supplier was contacted.
      </p>
      <p className="eyebrow mt-14 text-gold-deep">Order received</p>
      <h2 ref={headingRef} tabIndex={-1} className="mt-6 text-display-3 text-obsidian outline-none">
        Thank you. <em className="text-gold-deep">Selected.</em>
      </h2>
      <dl className="mt-10 grid gap-6 border-y border-obsidian/10 py-8 sm:grid-cols-3">
        <div>
          <dt className="meta text-slate">Order number</dt>
          <dd className="mt-2 font-display text-3xl font-light tabular-nums text-obsidian">{order.id}</dd>
        </div>
        <div>
          <dt className="meta text-slate">Shipments</dt>
          <dd className="mt-2 font-display text-3xl font-light text-obsidian">{order.shipments}</dd>
        </div>
        <div>
          <dt className="meta text-slate">Total before taxes</dt>
          <dd className="mt-2 font-display text-3xl font-light tabular-nums text-obsidian">{money(order.total)}</dd>
        </div>
      </dl>

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
        A confirmation email would be sent to <span className="text-obsidian">{order.email}</span> once email notifications are connected.
      </p>
      <div className="mt-12 flex flex-wrap gap-4">
        <ButtonLink href="/account/orders" variant="dark">
          View your orders
        </ButtonLink>
        <ButtonLink href="/shop" variant="outline-dark">
          Continue shopping
        </ButtonLink>
      </div>
    </motion.div>
  )
}
