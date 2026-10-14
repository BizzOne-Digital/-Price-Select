'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { api, ApiError, errorText } from '@/lib/client/api'
import { cn } from '@/lib/utils'
import { btnClass, BtnInner } from '@/components/site/ui'

// Customer (and paid member) sign-in, registration and password reset. Members use the same
// customer login; membership is a property of the account, not a separate portal.

type Mode = 'sign-in' | 'sign-up' | 'forgot'

/** Only same-site relative paths are accepted as a post-sign-in destination. */
export const safeNext = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/account')

function Field({ id, label, hint, ...rest }: { id: string; label: string; hint?: string } & React.ComponentProps<'input'>) {
  return (
    <div className="pt-4">
      <label htmlFor={id} className="meta text-slate">
        {label}
      </label>
      <input id={id} name={id} className="field" aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate/80">
          {hint}
        </p>
      )}
    </div>
  )
}

export function CustomerAuth({ footer }: { footer?: ReactNode }) {
  const router = useRouter()
  const sp = useSearchParams()
  const next = safeNext(sp.get('next'))
  const [mode, setMode] = useState<Mode>('sign-in')
  const [v, setV] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }))
  const switchTo = (m: Mode) => {
    setMode(m)
    setError('')
    setNotice('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'forgot') {
        const r = await api<{ message: string }>('/api/session/password-reset', { body: { email: v.email.trim() } })
        setNotice(r.message)
        return
      }
      if (mode === 'sign-up') await api('/api/session/sign-up', { body: { name: v.name.trim(), email: v.email.trim(), password: v.password } })
      else await api('/api/session/sign-in', { body: { email: v.email.trim(), password: v.password, portal: 'customer' } })
      // The layout re-reads the session; the cart merges any guest cart from this browser.
      router.replace(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError && err.unavailable ? err.message : errorText(err))
    } finally {
      setBusy(false)
    }
  }

  const cta = { 'sign-in': 'Sign in', 'sign-up': 'Create account', forgot: 'Send reset link' }[mode]

  return (
    <div className="mt-8">
      {mode !== 'forgot' && (
        <div role="tablist" aria-label="Account access" className="flex gap-6 border-b border-obsidian/10">
          {(
            [
              ['sign-in', 'Sign in'],
              ['sign-up', 'Create account'],
            ] as const
          ).map(([m, l]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchTo(m)} className={cn('eyebrow -mb-px h-11 border-b', mode === m ? 'border-gold text-obsidian' : 'border-transparent text-slate hover:text-obsidian')}>
              {l}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="mt-2" noValidate={false}>
        {mode === 'forgot' && <p className="pt-4 text-sm leading-relaxed text-slate">Enter the email for your account and we will send a reset link.</p>}
        {mode === 'sign-up' && <Field id="au-name" label="Full name" value={v.name} onChange={set('name')} autoComplete="name" required minLength={2} maxLength={120} />}
        <Field id="au-email" label="Email" type="email" value={v.email} onChange={set('email')} autoComplete="email" required maxLength={200} />
        {mode !== 'forgot' && (
          <Field
            id="au-password"
            label="Password"
            type="password"
            value={v.password}
            onChange={set('password')}
            autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            required
            minLength={mode === 'sign-up' ? 10 : 1}
            maxLength={128}
            hint={mode === 'sign-up' ? 'At least 10 characters.' : undefined}
          />
        )}
        {error && (
          <p role="alert" className="mt-6 border-l border-danger pl-4 text-sm text-danger">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-6 border-l border-gold pl-4 text-sm text-obsidian">
            {notice}
          </p>
        )}
        <button type="submit" disabled={busy} className={btnClass('dark', 'mt-10 w-full disabled:cursor-not-allowed disabled:opacity-50')}>
          <BtnInner variant="dark">{busy ? 'Please wait…' : cta}</BtnInner>
        </button>
      </form>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
        {mode === 'forgot' ? (
          <button type="button" onClick={() => switchTo('sign-in')} className="link-line link-line--static text-teal">
            Back to sign in
          </button>
        ) : (
          <button type="button" onClick={() => switchTo('forgot')} className="link-line link-line--static text-teal">
            Forgot password?
          </button>
        )}
        <Link href="/track" className="text-obsidian/60 hover:text-teal">
          Track a guest order
        </Link>
      </div>
      {footer && <div className="mt-8">{footer}</div>}
    </div>
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token)
    return (
      <p role="alert" className="mt-8 border-l border-danger pl-4 text-sm text-danger">
        This reset link is incomplete. Request a new link from the sign-in page.
      </p>
    )

  if (done)
    return (
      <div role="status" className="mt-8">
        <p className="text-sm text-obsidian">Your password has been changed. You can now sign in.</p>
        <button type="button" onClick={() => router.push('/sign-in/customers')} className={btnClass('dark', 'mt-8')}>
          <BtnInner variant="dark">Sign in</BtnInner>
        </button>
      </div>
    )

  return (
    <form
      className="mt-8"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError('')
        try {
          await api('/api/session/password-reset/complete', { body: { token, newPassword: pw } })
          setDone(true)
        } catch (err) {
          setError(errorText(err))
        } finally {
          setBusy(false)
        }
      }}
    >
      <Field id="rs-password" label="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required minLength={10} maxLength={128} hint="At least 10 characters." />
      {error && (
        <p role="alert" className="mt-6 border-l border-danger pl-4 text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={btnClass('dark', 'mt-10 w-full disabled:cursor-not-allowed disabled:opacity-50')}>
        <BtnInner variant="dark">{busy ? 'Saving…' : 'Set new password'}</BtnInner>
      </button>
    </form>
  )
}
