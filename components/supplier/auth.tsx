'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/site/ui'
import { Err } from './ui'

/** Labelled underline field for the dark auth panel. */
export function DarkField({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="meta text-[0.62rem] text-ivory/50">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-ivory/40">{hint}</span>}
      <Err msg={error} />
    </label>
  )
}

export function LoginForm({ to = '/supplier', emailLabel = 'Work email', cta = 'Sign in to portal', footer }: { to?: string; emailLabel?: string; cta?: string; footer?: ReactNode }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="mt-12 space-y-8"
      onSubmit={(e) => {
        e.preventDefault()
        setBusy(true)
        router.push(to)
      }}
    >
      <DarkField label={emailLabel}>
        <input type="email" name="email" autoComplete="username" placeholder="you@example.com" className="field" />
      </DarkField>
      <DarkField label="Password" hint="Demo only. Do not enter real credentials — nothing is sent.">
        <input type="password" name="password" autoComplete="current-password" className="field" />
      </DarkField>
      <div className="flex flex-col gap-6 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" variant="light" disabled={busy} className="sm:min-w-56">
          {busy ? 'Signing in' : cta}
        </Button>
        <span className="meta text-[0.62rem] text-ivory/40">Password reset arrives with the auth provider</span>
      </div>
      <div className="sel-line mt-4 text-ivory" aria-hidden />
      {footer ?? (
        <p className="text-sm text-ivory/60">
          Not yet a partner?{' '}
          <Link href="/supplier/apply" className="link-line link-line--static text-champagne">
            Apply to supply
          </Link>
        </p>
      )}
    </form>
  )
}
