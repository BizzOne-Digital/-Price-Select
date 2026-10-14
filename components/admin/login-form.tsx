'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/site/ui'
import { api, errorText } from '@/lib/client/api'

/** Only same-site console paths are accepted as a post-sign-in destination. */
const safeNext = (n: string | null) => (n && n.startsWith('/admin') && !n.startsWith('//') && !n.startsWith('/admin/login') ? n : null)

export function AdminLoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mode, setMode] = useState<'sign-in' | 'reset'>('sign-in')
  const [email, setEmail] = useState('')

  const signIn = async (form: HTMLFormElement) => {
    const f = new FormData(form)
    setBusy(true)
    setError('')
    try {
      const r = await api<{ ok: true; role: string }>('/api/session/sign-in', { body: { email: String(f.get('email') ?? ''), password: String(f.get('password') ?? ''), portal: 'staff', remember: f.get('remember') === 'on' } })
      // Role comes from the stored account. Support staff land on their desk; admins on ?next or the dashboard.
      const dest = r.role === 'support' ? safeNext(params.get('next')) ?? '/admin/support' : safeNext(params.get('next')) ?? '/admin'
      router.replace(dest)
      router.refresh()
    } catch (e) {
      setError(errorText(e))
      setBusy(false)
    }
  }

  const reset = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const r = await api<{ message?: string }>('/api/session/password-reset', { body: { email } })
      setNotice(r.message ?? 'If an account exists for that address, a reset link is on its way.')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'reset')
    return (
      <form
        className="space-y-8"
        onSubmit={(e) => {
          e.preventDefault()
          void reset()
        }}
      >
        <p className="text-sm text-obsidian/60">Enter your work email. If email delivery is configured, a reset link will be sent.</p>
        <label className="block">
          <span className="meta text-[0.62rem] text-obsidian/45">Work email</span>
          <input type="email" name="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" />
        </label>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {notice && <p role="status" className="text-sm text-success">{notice}</p>}
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={() => (setMode('sign-in'), setError(''), setNotice(''))} className="link-line link-line--static text-sm text-obsidian/70 hover:text-teal">
            Back to sign in
          </button>
          <Button type="submit" variant="light" disabled={busy}>
            {busy ? 'Sending' : 'Send reset link'}
          </Button>
        </div>
      </form>
    )

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault()
        void signIn(e.currentTarget)
      }}
    >
      <label className="block">
        <span className="meta text-[0.62rem] text-obsidian/45">Work email</span>
        <input type="email" name="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@price-select.com" className="field" />
      </label>
      <label className="block">
        <span className="meta text-[0.62rem] text-obsidian/45">Password</span>
        <input type="password" name="password" autoComplete="current-password" required className="field" />
      </label>
      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-obsidian/70">
          <input type="checkbox" name="remember" defaultChecked className="size-4 accent-[#FF7A1A]" />
          Remember this device
        </label>
        <button type="button" onClick={() => (setMode('reset'), setError(''))} className="link-line link-line--static text-obsidian/70 hover:text-teal">
          Forgot password
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="light" className="w-full" disabled={busy}>
        {busy ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  )
}
