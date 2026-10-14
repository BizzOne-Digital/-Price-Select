'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/site/ui'
import { api, errorText } from '@/lib/client/api'
import { Err } from './ui'

/** Labelled underline field for the dark auth panel. */
export function DarkField({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="meta text-[0.62rem] text-obsidian/50">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-obsidian/40">{hint}</span>}
      <Err msg={error} />
    </label>
  )
}

type Portal = 'customer' | 'staff' | 'supplier'
const portalFor = (to: string): Portal => (to.startsWith('/supplier') ? 'supplier' : to.startsWith('/admin') ? 'staff' : 'customer')
/** Only same-site relative paths are accepted as a post-sign-in destination. */
const safeNext = (n: string | null, fallback: string) => (n && n.startsWith('/') && !n.startsWith('//') ? n : fallback)

export function LoginForm({ to = '/supplier', portal, emailLabel = 'Work email', cta = 'Sign in to portal', footer }: { to?: string; portal?: Portal; emailLabel?: string; cta?: string; footer?: ReactNode }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>()
  const [reset, setReset] = useState<{ busy?: boolean; msg?: string; error?: boolean }>({})

  const forgot = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setReset({ msg: 'Enter your email above first.', error: true })
    setReset({ busy: true })
    try {
      const r = await api<{ message?: string }>('/api/session/password-reset', { body: { email: email.trim() } })
      setReset({ msg: r.message ?? 'If an account exists for that address, a reset link is on its way.' })
    } catch (e) {
      setReset({ msg: errorText(e), error: true })
    }
  }

  return (
    <form
      noValidate
      className="mt-12 space-y-8"
      onSubmit={async (e) => {
        e.preventDefault()
        if (!email.trim() || !password) return setErr('Enter your email and password.')
        setBusy(true)
        setErr(undefined)
        try {
          await api('/api/session/sign-in', { body: { email: email.trim(), password, portal: portal ?? portalFor(to) } })
          router.replace(safeNext(new URLSearchParams(window.location.search).get('next'), to))
          router.refresh()
        } catch (x) {
          setErr(errorText(x))
          setBusy(false)
        }
      }}
    >
      <DarkField label={emailLabel}>
        <input type="email" name="email" autoComplete="username" placeholder="you@example.com" className="field" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err} />
      </DarkField>
      <DarkField label="Password">
        <input type="password" name="password" autoComplete="current-password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!err} />
      </DarkField>
      {err && (
        <p className="text-sm text-danger" role="alert">
          {err}
        </p>
      )}
      <div className="flex flex-col gap-6 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" variant="light" disabled={busy} className="sm:min-w-56">
          {busy ? 'Signing in' : cta}
        </Button>
        <button type="button" onClick={forgot} disabled={reset.busy} className="link-line meta text-[0.62rem] text-obsidian/50 hover:text-teal disabled:opacity-50">
          {reset.busy ? 'Requesting…' : 'Forgot password?'}
        </button>
      </div>
      {reset.msg && (
        <p className={reset.error ? 'text-sm text-danger' : 'text-sm text-obsidian/60'} role={reset.error ? 'alert' : 'status'}>
          {reset.msg}
        </p>
      )}
      <div className="sel-line mt-4 text-obsidian" aria-hidden />
      {footer ?? (
        <p className="text-sm text-obsidian/60">
          Not yet a partner?{' '}
          <Link href="/supplier/apply" className="link-line link-line--static text-teal">
            Apply to supply
          </Link>
        </p>
      )}
    </form>
  )
}
