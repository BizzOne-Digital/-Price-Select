'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { useState } from 'react'
import type { CategorySlug } from '@/lib/types'
import { categories } from '@/lib/data/categories'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { Button } from '@/components/site/ui'
import { DarkField } from './auth'
import { FilePick, Tick } from './ui'

const STEPS = ['Business', 'Contact', 'Tax', 'Shipping', 'Documents', 'Review'] as const
const BUSINESS_TYPES = ['Manufacturer', 'Authorized distributor', 'Wholesaler', 'Brand owner', 'Specialist retailer']
const COUNTRIES = ['United States', 'Canada', 'Mexico', 'United Kingdom', 'Other']
const CARRIERS = ['National postal service', 'Parcel carrier', 'Express courier', 'LTL / freight', 'Own delivery fleet']
const HANDLING = ['Same business day', '1 business day', '2 business days', '3–5 business days', 'Made to order (6+ days)']

type Form = {
  legalName: string; tradingName: string; businessType: string; website: string; categories: CategorySlug[]
  contactName: string; email: string; phone: string
  taxId: string; country: string
  shipFrom: string; carriers: string[]; handling: string; blindShip: '' | 'yes' | 'no'
  registration: string[]; insurance: string[]; certificates: string[]; authentic: boolean; terms: boolean
}
const EMPTY: Form = {
  legalName: '', tradingName: '', businessType: '', website: '', categories: [],
  contactName: '', email: '', phone: '', taxId: '', country: '',
  shipFrom: '', carriers: [], handling: '', blindShip: '',
  registration: [], insurance: [], certificates: [], authentic: false, terms: false,
}

function validate(step: number, f: Form): Partial<Record<keyof Form, string>> {
  const e: Partial<Record<keyof Form, string>> = {}
  const enhanced = f.categories.some((c) => categories.find((x) => x.slug === c)?.reviewLevel === 'enhanced')
  if (step === 0) {
    if (f.legalName.trim().length < 2) e.legalName = 'Enter the registered legal name.'
    if (!f.businessType) e.businessType = 'Choose a business type.'
    if (f.website && !/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(f.website.trim())) e.website = 'Enter a valid web address, e.g. company.com'
    if (!f.categories.length) e.categories = 'Select at least one category you supply.'
  }
  if (step === 1) {
    if (f.contactName.trim().length < 2) e.contactName = 'Enter a contact name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address.'
    if (!/^[+()\d\s.-]{7,20}$/.test(f.phone.trim())) e.phone = 'Enter a phone number with country code.'
  }
  if (step === 2) {
    if (f.taxId.replace(/\W/g, '').length < 5) e.taxId = 'Enter the business tax identification number.'
    if (!f.country) e.country = 'Choose the country of tax registration.'
  }
  if (step === 3) {
    if (f.shipFrom.trim().length < 2) e.shipFrom = 'Enter the region you ship from.'
    if (!f.carriers.length) e.carriers = 'Select at least one carrier type.'
    if (!f.handling) e.handling = 'Choose a typical handling time.'
    if (!f.blindShip) e.blindShip = 'Tell us whether you can ship in neutral packaging.'
  }
  if (step === 4) {
    if (!f.registration.length) e.registration = 'Business registration is required.'
    if (!f.insurance.length) e.insurance = 'Proof of insurance is required.'
    if (enhanced && !f.certificates.length) e.certificates = 'Product certificates are required for enhanced-review categories.'
    if (!f.authentic) e.authentic = 'Confirmation is required to supply on Price-Select.'
    if (!f.terms) e.terms = 'Please accept the supplier terms to continue.'
  }
  return e
}

export function ApplyFlow() {
  const [step, setStep] = useState(0)
  const [f, setF] = useState<Form>(EMPTY)
  const [shown, setShown] = useState<boolean[]>([])
  const [submitted, setSubmitted] = useState<string | null>(null)
  const errors = shown[step] ? validate(step, f) : {}
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }))
  const toggle = (k: 'categories' | 'carriers', v: string) => setF((s) => ({ ...s, [k]: (s[k] as string[]).includes(v) ? (s[k] as string[]).filter((x) => x !== v) : [...s[k], v] }))
  const files = (k: 'registration' | 'insurance' | 'certificates') => (l: FileList | null) => set(k, l ? Array.from(l).map((x) => x.name) : [])
  const enhanced = categories.filter((c) => f.categories.includes(c.slug) && c.reviewLevel === 'enhanced')

  const next = () => {
    const e = validate(step, f)
    if (Object.keys(e).length) {
      setShown((s) => Object.assign([...s], { [step]: true }))
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    if (step === STEPS.length - 1) {
      setSubmitted(new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()))
      window.scrollTo({ top: 0 })
      return
    }
    setStep(step + 1)
    window.scrollTo({ top: 0 })
  }

  if (submitted) return <ApplicationStatus date={submitted} name={f.tradingName || f.legalName} />

  return (
    <div className="w-full max-w-2xl">
      <p className="eyebrow text-champagne/80">Supplier application</p>
      <h1 className="mt-5 font-display text-[clamp(2.5rem,4.6vw,4rem)] font-light leading-[0.95] tracking-[-0.03em]">
        Apply to <em className="text-champagne">supply</em>.
      </h1>
      <p className="mt-5 max-w-lg text-sm leading-relaxed text-ivory/55">Six short steps. Every application is reviewed by the Price-Select team before any listing can publish.</p>

      {/* Progress: numbered steps over the selection line */}
      <nav aria-label="Application progress" className="mt-12">
        <ol className="hidden grid-cols-6 gap-2 sm:grid">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                aria-current={i === step ? 'step' : undefined}
                className={cn('flex min-h-11 w-full flex-col items-start gap-1 text-left transition-colors disabled:cursor-default', i === step ? 'text-ivory' : i < step ? 'text-champagne/80 hover:text-champagne' : 'text-ivory/30')}
              >
                <span className="meta text-[0.6rem] tabular-nums">{i < step ? <Check className="size-3" strokeWidth={2} aria-label="Complete" /> : String(i + 1).padStart(2, '0')}</span>
                <span className="text-[0.72rem] font-medium tracking-wide">{s}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="meta text-[0.65rem] text-ivory/60 sm:hidden">
          Step {step + 1} of {STEPS.length} <span className="text-champagne">— {STEPS[step]}</span>
        </p>
        <div className="relative mt-4 h-px bg-ivory/12" aria-hidden>
          <motion.div className="sel-line--gold absolute inset-y-0 left-0 h-px" animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.9, ease: EASE }} />
        </div>
      </nav>

      <form
        noValidate
        className="mt-12"
        onSubmit={(e) => {
          e.preventDefault()
          next()
        }}
      >
        <AnimatePresence mode="wait">
          <motion.fieldset key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease: EASE }} className="space-y-8">
            <legend className="mb-8 font-display text-3xl font-light tracking-[-0.02em]">
              <span className="mr-3 align-middle meta text-[0.65rem] text-champagne">{String(step + 1).padStart(2, '0')}</span>
              {['Business details', 'Primary contact', 'Tax information', 'Shipping & fulfillment', 'Documentation', 'Review & submit'][step]}
            </legend>

            {step === 0 && (
              <>
                <div className="grid gap-8 md:grid-cols-2">
                  <DarkField label="Legal business name" error={errors.legalName}>
                    <input className="field" value={f.legalName} onChange={(e) => set('legalName', e.target.value)} autoComplete="organization" aria-invalid={!!errors.legalName} />
                  </DarkField>
                  <DarkField label="Trading name (optional)">
                    <input className="field" value={f.tradingName} onChange={(e) => set('tradingName', e.target.value)} />
                  </DarkField>
                  <DarkField label="Business type" error={errors.businessType}>
                    <select className="field [&>option]:text-obsidian" value={f.businessType} onChange={(e) => set('businessType', e.target.value)} aria-invalid={!!errors.businessType}>
                      <option value="">Select</option>
                      {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </DarkField>
                  <DarkField label="Website (optional)" error={errors.website}>
                    <input className="field" inputMode="url" value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="company.com" aria-invalid={!!errors.website} />
                  </DarkField>
                </div>
                <fieldset>
                  <legend className="meta text-[0.62rem] text-ivory/50">Categories you supply</legend>
                  <div className="mt-4 grid gap-px border border-ivory/10 bg-ivory/10 sm:grid-cols-2">
                    {categories.map((c) => {
                      const on = f.categories.includes(c.slug)
                      return (
                        <button key={c.slug} type="button" aria-pressed={on} onClick={() => toggle('categories', c.slug)} aria-invalid={!!errors.categories && !f.categories.length} className={cn('flex min-h-14 items-center justify-between gap-3 bg-obsidian px-4 py-3 text-left text-sm transition-colors', on ? 'bg-ivory/[0.06] text-ivory' : 'text-ivory/60 hover:text-ivory')}>
                          <span className="flex items-center gap-3">
                            <span className={cn('grid size-4 shrink-0 place-items-center border', on ? 'border-champagne bg-champagne text-obsidian' : 'border-ivory/30')} aria-hidden>
                              {on && <Check className="size-2.5" strokeWidth={2.5} />}
                            </span>
                            {c.name}
                          </span>
                          {c.reviewLevel === 'enhanced' && <span className="meta shrink-0 text-[0.55rem] text-champagne/70">Enhanced review</span>}
                        </button>
                      )
                    })}
                  </div>
                  {errors.categories && <p className="mt-2 text-xs text-danger" role="alert">{errors.categories}</p>}
                  {enhanced.length > 0 && <p className="mt-3 text-xs leading-relaxed text-ivory/45">{enhanced.map((c) => c.reviewNote).join(' ')}</p>}
                </fieldset>
              </>
            )}

            {step === 1 && (
              <div className="grid gap-8 md:grid-cols-2">
                <DarkField label="Full name" error={errors.contactName}>
                  <input className="field" value={f.contactName} onChange={(e) => set('contactName', e.target.value)} autoComplete="name" aria-invalid={!!errors.contactName} />
                </DarkField>
                <DarkField label="Work email" error={errors.email}>
                  <input className="field" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
                </DarkField>
                <DarkField label="Phone" error={errors.phone} hint="Include the country code.">
                  <input className="field" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" aria-invalid={!!errors.phone} />
                </DarkField>
              </div>
            )}

            {step === 2 && (
              <>
                <div className="grid gap-8 md:grid-cols-2">
                  <DarkField
                    label="Tax identification number"
                    error={errors.taxId}
                    hint={
                      <span className="flex items-center gap-2">
                        <Lock className="size-3 text-champagne" strokeWidth={1.6} aria-hidden /> Sensitive — encrypted in transit and at rest once connected.
                      </span>
                    }
                  >
                    <input className="field tracking-[0.12em]" value={f.taxId} onChange={(e) => set('taxId', e.target.value)} autoComplete="off" spellCheck={false} aria-invalid={!!errors.taxId} />
                  </DarkField>
                  <DarkField label="Country of tax registration" error={errors.country}>
                    <select className="field [&>option]:text-obsidian" value={f.country} onChange={(e) => set('country', e.target.value)} aria-invalid={!!errors.country}>
                      <option value="">Select</option>
                      {COUNTRIES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </DarkField>
                </div>
                <p className="border-l border-champagne/40 pl-4 text-xs leading-relaxed text-ivory/45">In this demonstration the number stays in your browser and is never sent or stored. Launch countries and tax handling are still to be confirmed.</p>
              </>
            )}

            {step === 3 && (
              <>
                <div className="grid gap-8 md:grid-cols-2">
                  <DarkField label="Ship-from region" error={errors.shipFrom} hint="City, state or region of your main dispatch location.">
                    <input className="field" value={f.shipFrom} onChange={(e) => set('shipFrom', e.target.value)} aria-invalid={!!errors.shipFrom} />
                  </DarkField>
                  <DarkField label="Typical handling time" error={errors.handling}>
                    <select className="field [&>option]:text-obsidian" value={f.handling} onChange={(e) => set('handling', e.target.value)} aria-invalid={!!errors.handling}>
                      <option value="">Select</option>
                      {HANDLING.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </DarkField>
                </div>
                <fieldset>
                  <legend className="meta text-[0.62rem] text-ivory/50">Carriers you use</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CARRIERS.map((c) => {
                      const on = f.carriers.includes(c)
                      return (
                        <button key={c} type="button" aria-pressed={on} onClick={() => toggle('carriers', c)} aria-invalid={!!errors.carriers && !f.carriers.length} className={cn('min-h-11 border px-4 text-[0.78rem] transition-colors', on ? 'border-champagne text-champagne' : 'border-ivory/15 text-ivory/60 hover:border-ivory/40 hover:text-ivory')}>
                          {c}
                        </button>
                      )
                    })}
                  </div>
                  {errors.carriers && <p className="mt-2 text-xs text-danger" role="alert">{errors.carriers}</p>}
                </fieldset>
                <fieldset>
                  <legend className="meta text-[0.62rem] text-ivory/50">Blind dropship: can you ship in neutral packaging?</legend>
                  <p className="mt-2 max-w-lg text-xs leading-relaxed text-ivory/45">Price-Select orders ship without supplier branding or invoices where possible, with Price-Select documentation.</p>
                  <div className="mt-4 flex gap-2" role="radiogroup">
                    {(['yes', 'no'] as const).map((v) => (
                      <label key={v} className={cn('flex min-h-11 min-w-24 cursor-pointer items-center justify-center border px-5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-gold', f.blindShip === v ? 'border-champagne text-champagne' : 'border-ivory/15 text-ivory/60 hover:text-ivory')}>
                        <input type="radio" name="blind" value={v} checked={f.blindShip === v} onChange={() => set('blindShip', v)} className="sr-only" aria-invalid={!!errors.blindShip} />
                        {v === 'yes' ? 'Yes' : 'No'}
                      </label>
                    ))}
                  </div>
                  {errors.blindShip && <p className="mt-2 text-xs text-danger" role="alert">{errors.blindShip}</p>}
                </fieldset>
              </>
            )}

            {step === 4 && (
              <>
                <div className="grid gap-3">
                  <FilePick dark label="Business registration" hint="PDF or image" accept=".pdf,image/*" files={f.registration} onChange={files('registration')} error={errors.registration} />
                  <FilePick dark label="Insurance certificate" hint="Product or general liability, PDF or image" accept=".pdf,image/*" files={f.insurance} onChange={files('insurance')} error={errors.insurance} />
                  <FilePick dark multiple label={`Product certificates${enhanced.length ? '' : ' (optional)'}`} hint={enhanced.length ? `Required for ${enhanced.map((c) => c.short).join(', ')}` : 'Safety, electrical or material certificates'} accept=".pdf,image/*" files={f.certificates} onChange={files('certificates')} error={errors.certificates} />
                  <p className="text-xs text-ivory/40">Files stay in your browser in this demonstration — nothing is uploaded.</p>
                </div>
                <div className="space-y-3 border-t border-ivory/10 pt-8">
                  <Tick dark checked={f.authentic} onChange={(v) => set('authentic', v)} error={errors.authentic}>
                    I confirm all products I list are authentic and new.
                  </Tick>
                  <Tick dark checked={f.terms} onChange={(v) => set('terms', v)} error={errors.terms}>
                    I agree to the Price-Select supplier terms <span className="text-ivory/40">(terms document to be provided before launch)</span>.
                  </Tick>
                </div>
              </>
            )}

            {step === 5 && (
              <dl className="border-t border-ivory/10">
                {[
                  { s: 0, rows: [['Legal name', f.legalName], ['Trading name', f.tradingName || '—'], ['Business type', f.businessType], ['Website', f.website || '—'], ['Categories', categories.filter((c) => f.categories.includes(c.slug)).map((c) => c.name).join(', ')]] },
                  { s: 1, rows: [['Contact', f.contactName], ['Email', f.email], ['Phone', f.phone]] },
                  { s: 2, rows: [['Tax ID', `•••• ${f.taxId.slice(-2)}`], ['Country', f.country]] },
                  { s: 3, rows: [['Ships from', f.shipFrom], ['Carriers', f.carriers.join(', ')], ['Handling', f.handling], ['Neutral packaging', f.blindShip === 'yes' ? 'Yes' : 'No']] },
                  { s: 4, rows: [['Documents', [...f.registration, ...f.insurance, ...f.certificates].join(', ')], ['Confirmations', 'Authentic & new; supplier terms']] },
                ].map((g) => (
                  <div key={g.s} className="grid gap-4 border-b border-ivory/10 py-6 md:grid-cols-[10rem_1fr_auto]">
                    <p className="eyebrow text-champagne/80">{STEPS[g.s]}</p>
                    <div className="space-y-2">
                      {g.rows.map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[8rem_1fr] gap-4 text-sm">
                          <dt className="text-ivory/45">{k}</dt>
                          <dd className="break-words text-ivory/90">{v}</dd>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => setStep(g.s)} className="link-line self-start meta text-[0.62rem] text-ivory/60 hover:text-champagne">
                      Edit
                    </button>
                  </div>
                ))}
              </dl>
            )}
          </motion.fieldset>
        </AnimatePresence>

        <div className="mt-14 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <button type="button" onClick={() => setStep(step - 1)} className="link-line min-h-11 meta text-[0.65rem] text-ivory/60 hover:text-ivory">
              <ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden /> Back
            </button>
          ) : (
            <Link href="/supplier/login" className="link-line min-h-11 meta text-[0.65rem] text-ivory/60 hover:text-ivory">
              Already a partner? Sign in
            </Link>
          )}
          <Button type="submit" variant={step === STEPS.length - 1 ? 'gold' : 'light'} className="sm:min-w-60">
            {step === STEPS.length - 1 ? 'Submit application' : `Continue to ${STEPS[step + 1].toLowerCase()}`}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ApplicationStatus({ date, name }: { date: string; name: string }) {
  const stages = [
    { label: 'Applied', detail: `Received ${date}`, state: 'done' },
    { label: 'Under review', detail: 'Documents, categories and fulfillment capability are checked by the Price-Select team.', state: 'current' },
    { label: 'Approved or rejected', detail: 'You will be notified by email. Approved partners receive portal access and onboarding.', state: 'todo' },
  ] as const
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="w-full max-w-2xl" role="status">
      <p className="eyebrow text-champagne/80">Application status</p>
      <h1 className="mt-5 font-display text-[clamp(2.5rem,4.6vw,4rem)] font-light leading-[0.95] tracking-[-0.03em]">
        Application <em className="text-champagne">received</em>.
      </h1>
      <p className="mt-5 max-w-lg text-sm leading-relaxed text-ivory/55">
        Thank you{name ? `, ${name}` : ''}. Typical review time is to be confirmed. This is a demonstration — no application was sent.
      </p>
      <ol className="relative mt-14">
        <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-ivory/12" />
        {stages.map((s, i) => (
          <motion.li key={s.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15, duration: 0.7, ease: EASE }} className="relative grid grid-cols-[2rem_1fr] pb-10 last:pb-0">
            <span aria-hidden className={cn('relative mt-1.5 size-[11px] rounded-full border', s.state === 'done' && 'border-champagne bg-champagne', s.state === 'current' && 'border-champagne bg-obsidian shadow-[0_0_0_4px_rgba(242,139,130,0.15)]', s.state === 'todo' && 'border-ivory/30 bg-obsidian')} />
            <div>
              <p className="flex flex-wrap items-center gap-3">
                <span className={cn('font-display text-2xl', s.state === 'todo' ? 'text-ivory/45' : 'text-ivory')}>{s.label}</span>
                <span className="meta text-[0.58rem] text-champagne/80">{s.state === 'done' ? 'Complete' : s.state === 'current' ? 'In progress' : 'Pending'}</span>
              </p>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ivory/50">{s.detail}</p>
            </div>
          </motion.li>
        ))}
      </ol>
      <div className="sel-line--gold mt-14 h-px" aria-hidden />
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Link href="/supplier" className="link-line link-line--static min-h-11 eyebrow text-champagne">
          Preview the supplier portal
        </Link>
        <Link href="/" className="link-line min-h-11 eyebrow text-ivory/60 hover:text-ivory sm:ml-8">
          Back to the storefront
        </Link>
      </div>
    </motion.div>
  )
}
