'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Check, Lock } from 'lucide-react'
import { useState } from 'react'
import type { Category, CategorySlug, SupplierApplication } from '@/lib/types'
import { cn } from '@/lib/utils'
import { api, errorText } from '@/lib/client/api'
import { privateAssetUrl, uploadPrivate } from '@/lib/client/upload'
import { EASE } from '@/components/motion/primitives'
import { Button } from '@/components/site/ui'
import { SITE } from '@/lib/site'
import { DarkField } from './auth'
import { day } from './data'
import { FilePick, Tick } from './ui'

const STEPS = ['Business', 'Contact', 'Tax', 'Shipping', 'Documents', 'Review'] as const
/** Must match BUSINESS_TYPES in lib/server/services/suppliers.ts. */
const BUSINESS_TYPES = ['Manufacturer', 'Authorized distributor', 'Wholesaler', 'Brand owner', 'Specialist retailer']
const COUNTRIES = ['United States', 'Canada', 'Mexico', 'United Kingdom', 'Other']
const CARRIERS = ['National postal service', 'Parcel carrier', 'Express courier', 'LTL / freight', 'Own delivery fleet']
const HANDLING = ['Same business day', '1 business day', '2 business days', '3–5 business days', 'Made to order (6+ days)']
const DOC_KINDS = [
  { kind: 'registration', label: 'Business registration', hint: 'PDF or image' },
  { kind: 'insurance', label: 'Insurance certificate', hint: 'Product or general liability, PDF or image' },
  { kind: 'certificate', label: 'Product certificates', hint: 'Safety, electrical or material certificates' },
] as const

export type ApplyCategory = Pick<Category, 'slug' | 'name' | 'short' | 'reviewLevel' | 'reviewNote'>

type Form = {
  legalName: string; tradingName: string; businessType: string; website: string; categories: CategorySlug[]
  contactName: string; email: string; phone: string; password: string; confirm: string
  taxId: string; country: string
  shipFrom: string; carriers: string[]; handling: string; blindShip: '' | 'yes' | 'no'
  authentic: boolean; terms: boolean
}
const EMPTY: Form = {
  legalName: '', tradingName: '', businessType: '', website: '', categories: [],
  contactName: '', email: '', phone: '', password: '', confirm: '', taxId: '', country: '',
  shipFrom: '', carriers: [], handling: '', blindShip: '',
  authentic: false, terms: false,
}

type Errors = Partial<Record<keyof Form | 'registration' | 'insurance' | 'certificate', string>>

function validate(step: number, f: Form, app: SupplierApplication | null, enhanced: boolean): Errors {
  const e: Errors = {}
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
    if (f.password.length < 10) e.password = 'Use at least 10 characters.'
    else if (f.password !== f.confirm) e.confirm = 'Passwords do not match.'
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
    const has = (k: string) => !!app?.documents.some((d) => d.kind === k)
    if (!has('registration')) e.registration = 'Business registration is required.'
    if (!has('insurance')) e.insurance = 'Proof of insurance is required.'
    if (enhanced && !has('certificate')) e.certificate = 'Product certificates are required for enhanced-review categories.'
    if (!f.authentic) e.authentic = 'Confirmation is required to supply on Price-Select.'
    if (!f.terms) e.terms = 'Please accept the supplier terms to continue.'
  }
  return e
}

/**
 * Supplier application. Steps 1–4 are collected locally; finishing Shipping creates the supplier
 * login and a draft record (POST /api/supplier/apply). Documents upload as private files and the
 * Review step submits the application. A signed-in applicant with a draft/rejected record resumes
 * at Documents.
 */
export function ApplyFlow({ categories, existing }: { categories: ApplyCategory[]; existing: SupplierApplication | null }) {
  const resumable = !!existing && (existing.status === 'draft' || existing.status === 'rejected')
  const [app, setApp] = useState<SupplierApplication | null>(existing)
  const [step, setStep] = useState(resumable ? 4 : 0)
  const [f, setF] = useState<Form>(EMPTY)
  const [shown, setShown] = useState<boolean[]>([])
  const [busy, setBusy] = useState(false)
  const [serverErr, setServerErr] = useState<string>()
  const created = !!app
  const chosen = created ? app.categories : f.categories
  const enhanced = categories.filter((c) => chosen.includes(c.slug) && c.reviewLevel === 'enhanced')
  const errors = shown[step] ? validate(step, f, app, enhanced.length > 0) : {}
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }))
  const toggle = (k: 'categories' | 'carriers', v: string) => setF((s) => ({ ...s, [k]: (s[k] as string[]).includes(v) ? (s[k] as string[]).filter((x) => x !== v) : [...s[k], v] }))

  if (existing && !resumable) return <ApplicationStatus app={existing} />
  if (app && !['draft', 'rejected'].includes(app.status)) return <ApplicationStatus app={app} />

  const start = async () => {
    const r = await api<{ supplier: string }>('/api/supplier/apply', {
      body: {
        legalName: f.legalName.trim(), tradingName: f.tradingName.trim(), businessType: f.businessType, website: f.website.trim(), categories: f.categories,
        contactName: f.contactName.trim(), email: f.email.trim(), password: f.password, phone: f.phone.trim(),
        taxId: f.taxId.trim(), country: f.country,
        shipFrom: f.shipFrom.trim(), carriers: f.carriers, handling: f.handling, blindShip: f.blindShip === 'yes',
      },
    })
    if (!r.supplier) throw new Error('Unexpected response')
    setApp(await api<SupplierApplication>('/api/supplier/me'))
    setF((s) => ({ ...s, password: '', confirm: '', taxId: '' }))
  }

  const next = async () => {
    const e = validate(step, f, app, enhanced.length > 0)
    if (Object.keys(e).length) {
      setShown((s) => Object.assign([...s], { [step]: true }))
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setServerErr(undefined)
    if (step === 3 && !created) {
      setBusy(true)
      try {
        await start()
      } catch (x) {
        setServerErr(errorText(x))
        setBusy(false)
        return
      }
      setBusy(false)
    }
    if (step === STEPS.length - 1) {
      setBusy(true)
      try {
        setApp(await api<SupplierApplication>('/api/supplier/submit', { body: { authentic: f.authentic, terms: f.terms } }))
        window.scrollTo({ top: 0 })
      } catch (x) {
        setServerErr(errorText(x))
      }
      setBusy(false)
      return
    }
    setStep(step + 1)
    window.scrollTo({ top: 0 })
  }

  const docUpload = (kind: (typeof DOC_KINDS)[number]['kind'], label: string) => async (file: File, onProgress: (p: number) => void) => {
    onProgress(0.05)
    const a = await uploadPrivate(file, 'supplier_document', `${label}: ${file.name}`.slice(0, 120), onProgress)
    setApp(await api<SupplierApplication>('/api/supplier/documents', { body: { assetId: a.id, kind } }))
  }

  const catNames = (slugs: string[]) => categories.filter((c) => slugs.includes(c.slug)).map((c) => c.name).join(', ') || slugs.join(', ')
  const review = app
    ? [
        { s: 0, rows: [['Legal name', app.legalName ?? '—'], ['Trading name', app.name], ['Business type', app.businessType ?? '—'], ['Website', app.website || '—'], ['Categories', catNames(app.categories)]] },
        { s: 1, rows: [['Contact', app.contactName], ['Email', app.contactEmail], ['Phone', app.phone ?? '—']] },
        { s: 2, rows: [['Tax ID', app.taxIdLast4 ? `•••• ${app.taxIdLast4}` : '—'], ['Country', app.taxCountry ?? '—']] },
        { s: 3, rows: [['Ships from', app.shipping?.shipFrom ?? '—'], ['Carriers', (app.shipping?.carriers ?? []).join(', ')], ['Handling', app.shipping?.handling ?? '—'], ['Neutral packaging', app.shipping?.blindShip ? 'Yes' : 'No']] },
        { s: 4, rows: [['Documents', app.documents.map((d) => d.label).join(', ') || '—'], ['Confirmations', f.authentic && f.terms ? 'Authentic & new; supplier terms' : 'Not yet confirmed']] },
      ]
    : []
  const locked = (i: number) => created && i < 4

  return (
    <div className="w-full max-w-2xl">
      <p className="eyebrow text-teal/80">Supplier application</p>
      <h1 className="mt-5 font-display text-[clamp(2.5rem,4.6vw,4rem)] font-light leading-[0.95] tracking-[-0.03em]">
        Apply to <em className="text-teal">supply</em>.
      </h1>
      <p className="mt-5 max-w-lg text-sm leading-relaxed text-obsidian/55">
        {created ? 'Your account is created. Upload your documents and submit the application for review.' : 'Six short steps. Finishing Shipping creates your supplier login; every application is reviewed by the Price-Select team before any listing can publish.'}
      </p>
      {app?.status === 'rejected' && app.statusReason && (
        <p className="mt-5 border-l-2 border-danger/50 pl-4 text-sm text-obsidian/70" role="status">
          Previous decision: {app.statusReason}
        </p>
      )}

      <nav aria-label="Application progress" className="mt-12">
        <ol className="hidden grid-cols-6 gap-2 sm:grid">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                disabled={i > step || locked(i)}
                onClick={() => setStep(i)}
                aria-current={i === step ? 'step' : undefined}
                className={cn('flex min-h-11 w-full flex-col items-start gap-1 text-left transition-colors disabled:cursor-default', i === step ? 'text-obsidian' : i < step ? 'text-teal/80 hover:text-teal' : 'text-obsidian/30')}
              >
                <span className="meta text-[0.6rem] tabular-nums">{i < step ? <Check className="size-3" strokeWidth={2} aria-label="Complete" /> : String(i + 1).padStart(2, '0')}</span>
                <span className="text-[0.72rem] font-medium tracking-wide">{s}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="meta text-[0.65rem] text-obsidian/60 sm:hidden">
          Step {step + 1} of {STEPS.length} <span className="text-teal">— {STEPS[step]}</span>
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
          if (!busy) next()
        }}
      >
        <AnimatePresence mode="wait">
          <motion.fieldset key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.45, ease: EASE }} className="space-y-8">
            <legend className="mb-8 font-display text-3xl font-light tracking-[-0.02em]">
              <span className="mr-3 align-middle meta text-[0.65rem] text-teal">{String(step + 1).padStart(2, '0')}</span>
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
                  <legend className="meta text-[0.62rem] text-obsidian/50">Categories you supply</legend>
                  {categories.length === 0 && <p className="mt-4 text-sm text-danger">No categories are open for applications right now. Please try again later.</p>}
                  <div className="mt-4 grid gap-px border border-obsidian/10 bg-obsidian/10 sm:grid-cols-2">
                    {categories.map((c) => {
                      const on = f.categories.includes(c.slug)
                      return (
                        <button key={c.slug} type="button" aria-pressed={on} onClick={() => toggle('categories', c.slug)} aria-invalid={!!errors.categories && !f.categories.length} className={cn('flex min-h-14 items-center justify-between gap-3 bg-ivory px-4 py-3 text-left text-sm transition-colors', on ? 'bg-ivory/[0.06] text-obsidian' : 'text-obsidian/60 hover:text-obsidian')}>
                          <span className="flex items-center gap-3">
                            <span className={cn('grid size-4 shrink-0 place-items-center border', on ? 'border-champagne bg-champagne text-obsidian' : 'border-obsidian/30')} aria-hidden>
                              {on && <Check className="size-2.5" strokeWidth={2.5} />}
                            </span>
                            {c.name}
                          </span>
                          {c.reviewLevel === 'enhanced' && <span className="meta shrink-0 text-[0.55rem] text-teal/70">Enhanced review</span>}
                        </button>
                      )
                    })}
                  </div>
                  {errors.categories && <p className="mt-2 text-xs text-danger" role="alert">{errors.categories}</p>}
                  {enhanced.length > 0 && <p className="mt-3 text-xs leading-relaxed text-obsidian/45">{enhanced.map((c) => c.reviewNote).filter(Boolean).join(' ')}</p>}
                </fieldset>
              </>
            )}

            {step === 1 && (
              <div className="grid gap-8 md:grid-cols-2">
                <DarkField label="Full name" error={errors.contactName}>
                  <input className="field" value={f.contactName} onChange={(e) => set('contactName', e.target.value)} autoComplete="name" aria-invalid={!!errors.contactName} />
                </DarkField>
                <DarkField label="Work email" error={errors.email} hint="This becomes your supplier portal sign-in.">
                  <input className="field" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" aria-invalid={!!errors.email} />
                </DarkField>
                <DarkField label="Phone" error={errors.phone} hint="Include the country code.">
                  <input className="field" type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} autoComplete="tel" aria-invalid={!!errors.phone} />
                </DarkField>
                <div className="hidden md:block" aria-hidden />
                <DarkField label="Portal password" error={errors.password} hint="At least 10 characters.">
                  <input className="field" type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" minLength={10} aria-invalid={!!errors.password} />
                </DarkField>
                <DarkField label="Confirm password" error={errors.confirm}>
                  <input className="field" type="password" value={f.confirm} onChange={(e) => set('confirm', e.target.value)} autoComplete="new-password" aria-invalid={!!errors.confirm} />
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
                        <Lock className="size-3 text-teal" strokeWidth={1.6} aria-hidden /> Only the last four digits are ever shown back.
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
                <p className="border-l border-champagne/40 pl-4 text-xs leading-relaxed text-obsidian/45">The number is stored with your application for the Price-Select review team. In the portal and in review screens only the last four digits are displayed. Launch countries and tax handling are still to be confirmed.</p>
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
                  <legend className="meta text-[0.62rem] text-obsidian/50">Carriers you use</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CARRIERS.map((c) => {
                      const on = f.carriers.includes(c)
                      return (
                        <button key={c} type="button" aria-pressed={on} onClick={() => toggle('carriers', c)} aria-invalid={!!errors.carriers && !f.carriers.length} className={cn('min-h-11 border px-4 text-[0.78rem] transition-colors', on ? 'border-champagne text-teal' : 'border-obsidian/15 text-obsidian/60 hover:border-obsidian/40 hover:text-obsidian')}>
                          {c}
                        </button>
                      )
                    })}
                  </div>
                  {errors.carriers && <p className="mt-2 text-xs text-danger" role="alert">{errors.carriers}</p>}
                </fieldset>
                <fieldset>
                  <legend className="meta text-[0.62rem] text-obsidian/50">Blind dropship: can you ship in neutral packaging?</legend>
                  <p className="mt-2 max-w-lg text-xs leading-relaxed text-obsidian/45">Price-Select orders ship without supplier branding or invoices where possible, with Price-Select documentation.</p>
                  <div className="mt-4 flex gap-2" role="radiogroup">
                    {(['yes', 'no'] as const).map((v) => (
                      <label key={v} className={cn('flex min-h-11 min-w-24 cursor-pointer items-center justify-center border px-5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-gold', f.blindShip === v ? 'border-champagne text-teal' : 'border-obsidian/15 text-obsidian/60 hover:text-obsidian')}>
                        <input type="radio" name="blind" value={v} checked={f.blindShip === v} onChange={() => set('blindShip', v)} className="sr-only" aria-invalid={!!errors.blindShip} />
                        {v === 'yes' ? 'Yes' : 'No'}
                      </label>
                    ))}
                  </div>
                  {errors.blindShip && <p className="mt-2 text-xs text-danger" role="alert">{errors.blindShip}</p>}
                </fieldset>
              </>
            )}

            {step === 4 && app && (
              <>
                <div className="grid gap-3">
                  {DOC_KINDS.map((d) => {
                    const required = d.kind !== 'certificate' || enhanced.length > 0
                    return (
                      <FilePick
                        key={d.kind}
                        dark
                        multiple={d.kind === 'certificate'}
                        label={`${d.label}${required ? '' : ' (optional)'}`}
                        hint={d.kind === 'certificate' && enhanced.length ? `Required for ${enhanced.map((c) => c.short).join(', ')}` : d.hint}
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        files={app.documents.filter((x) => x.kind === d.kind).map((x) => ({ id: x.id ?? x.label, name: x.label, href: x.assetId ? privateAssetUrl(x.assetId) : undefined, status: x.status }))}
                        onUpload={docUpload(d.kind, d.label)}
                        error={errors[d.kind]}
                      />
                    )
                  })}
                  <p className="text-xs text-obsidian/40">PDF, JPEG, PNG or WebP, up to 10 MB each. Files are private to you and the Price-Select review team.</p>
                </div>
                <div className="space-y-3 border-t border-obsidian/10 pt-8">
                  <Tick dark checked={f.authentic} onChange={(v) => set('authentic', v)} error={errors.authentic}>
                    I confirm all products I list are authentic and new.
                  </Tick>
                  <Tick dark checked={f.terms} onChange={(v) => set('terms', v)} error={errors.terms}>
                    I agree to the Price-Select supplier terms <span className="text-obsidian/40">(terms document to be provided before launch)</span>.
                  </Tick>
                </div>
              </>
            )}

            {step === 5 && (
              <dl className="border-t border-obsidian/10">
                {review.map((g) => (
                  <div key={g.s} className="grid gap-4 border-b border-obsidian/10 py-6 md:grid-cols-[10rem_1fr_auto]">
                    <p className="eyebrow text-teal/80">{STEPS[g.s]}</p>
                    <div className="space-y-2">
                      {g.rows.map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[8rem_1fr] gap-4 text-sm">
                          <dt className="text-obsidian/45">{k}</dt>
                          <dd className="break-words text-obsidian/90">{v}</dd>
                        </div>
                      ))}
                    </div>
                    {g.s === 4 ? (
                      <button type="button" onClick={() => setStep(4)} className="link-line self-start meta text-[0.62rem] text-obsidian/60 hover:text-teal">
                        Edit
                      </button>
                    ) : (
                      <span className="self-start meta text-[0.55rem] text-obsidian/35">Saved</span>
                    )}
                  </div>
                ))}
              </dl>
            )}
          </motion.fieldset>
        </AnimatePresence>

        {serverErr && (
          <p className="mt-8 border-l-2 border-danger/60 pl-4 text-sm text-danger" role="alert">
            {serverErr}
          </p>
        )}

        <div className="mt-14 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 && !locked(step - 1) ? (
            <button type="button" onClick={() => setStep(step - 1)} className="link-line min-h-11 meta text-[0.65rem] text-obsidian/60 hover:text-obsidian">
              <ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden /> Back
            </button>
          ) : created ? (
            <span />
          ) : (
            <Link href="/supplier/login" className="link-line min-h-11 meta text-[0.65rem] text-obsidian/60 hover:text-obsidian">
              Already a partner? Sign in
            </Link>
          )}
          <Button type="submit" disabled={busy} variant={step === STEPS.length - 1 ? 'gold' : 'light'} className="sm:min-w-60">
            {busy ? (step === 3 ? 'Creating account' : 'Submitting') : step === STEPS.length - 1 ? 'Submit application' : step === 3 && !created ? 'Create account & continue' : `Continue to ${STEPS[step + 1].toLowerCase()}`}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ApplicationStatus({ app }: { app: SupplierApplication }) {
  const s = app.status
  const decided = s === 'approved' || s === 'rejected' || s === 'suspended'
  const stages = [
    { label: 'Applied', detail: app.appliedAt ? `Received ${day(app.appliedAt)}` : 'Submitted', state: 'done' },
    { label: 'Under review', detail: 'Documents, categories and fulfillment capability are checked by the Price-Select team.', state: decided ? 'done' : 'current' },
    {
      label: s === 'approved' ? 'Approved' : s === 'rejected' ? 'Not approved' : s === 'suspended' ? 'Suspended' : 'Approved or rejected',
      detail: s === 'approved' ? 'Your supplier portal is open.' : decided ? (app.statusReason ?? `Contact ${SITE.email} for details.`) : 'You will be notified of the decision.',
      state: decided ? 'done' : 'todo',
    },
  ] as const
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="w-full max-w-2xl" role="status">
      <p className="eyebrow text-teal/80">Application status</p>
      <h1 className="mt-5 font-display text-[clamp(2.5rem,4.6vw,4rem)] font-light leading-[0.95] tracking-[-0.03em]">
        {s === 'approved' ? (
          <>Application <em className="text-teal">approved</em>.</>
        ) : s === 'rejected' ? (
          <>Application <em className="text-teal">not approved</em>.</>
        ) : s === 'suspended' ? (
          <>Account <em className="text-teal">suspended</em>.</>
        ) : (
          <>Application <em className="text-teal">received</em>.</>
        )}
      </h1>
      <p className="mt-5 max-w-lg text-sm leading-relaxed text-obsidian/55">
        {app.name}. {s === 'applied' || s === 'under_review' ? 'Typical review time is to be confirmed. You can sign in at any time to check progress.' : null}
      </p>
      <ol className="relative mt-14">
        <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-ivory/12" />
        {stages.map((st, i) => (
          <motion.li key={st.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15, duration: 0.7, ease: EASE }} className="relative grid grid-cols-[2rem_1fr] pb-10 last:pb-0">
            <span aria-hidden className={cn('relative mt-1.5 size-[11px] rounded-full border', st.state === 'done' && 'border-champagne bg-champagne', st.state === 'current' && 'border-champagne bg-ivory shadow-[0_0_0_4px_rgba(255,122,26,0.15)]', st.state === 'todo' && 'border-obsidian/30 bg-ivory')} />
            <div>
              <p className="flex flex-wrap items-center gap-3">
                <span className={cn('font-display text-2xl', st.state === 'todo' ? 'text-obsidian/45' : 'text-obsidian')}>{st.label}</span>
                <span className="meta text-[0.58rem] text-teal/80">{st.state === 'done' ? 'Complete' : st.state === 'current' ? 'In progress' : 'Pending'}</span>
              </p>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-obsidian/50">{st.detail}</p>
            </div>
          </motion.li>
        ))}
      </ol>
      <div className="sel-line--gold mt-14 h-px" aria-hidden />
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        {s === 'approved' && (
          <Link href="/supplier" className="link-line link-line--static min-h-11 eyebrow text-teal">
            Open the supplier portal
          </Link>
        )}
        {(s === 'rejected' || s === 'suspended') && (
          <a href={`mailto:${SITE.email}`} className="link-line link-line--static min-h-11 eyebrow text-teal">
            Contact {SITE.email}
          </a>
        )}
        <Link href="/" className="link-line min-h-11 eyebrow text-obsidian/60 hover:text-obsidian sm:ml-8">
          Back to the storefront
        </Link>
      </div>
    </motion.div>
  )
}
