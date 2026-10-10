'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/site/ui'
import { ROLE_LABEL } from '@/lib/auth'
import { cn } from '@/lib/utils'

const ROLES = ['admin', 'support'] as const

export function AdminLoginForm() {
  const router = useRouter()
  const [role, setRole] = useState<(typeof ROLES)[number]>('admin')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault()
        setBusy(true)
        // Demo only: no credentials are checked or stored. Replace with the authentication provider.
        router.push(role === 'support' ? '/admin/support' : '/admin')
      }}
    >
      <fieldset>
        <legend className="meta text-[0.62rem] text-obsidian/45">Staff role</legend>
        <div className="mt-3 grid grid-cols-2 border border-obsidian/15">
          {ROLES.map((r) => (
            <label key={r} className={cn('relative flex min-h-12 cursor-pointer items-center justify-center px-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] transition-colors', role === r ? 'bg-ivory/[0.07] text-teal' : 'text-obsidian/50 hover:text-obsidian')}>
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="sr-only" />
              {role === r && <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-champagne" />}
              {ROLE_LABEL[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="meta text-[0.62rem] text-obsidian/45">Work email</span>
        <input type="email" name="email" autoComplete="username" required placeholder="name@price-select.com" className="field" />
      </label>
      <label className="block">
        <span className="meta text-[0.62rem] text-obsidian/45">Password</span>
        <input type="password" name="password" autoComplete="current-password" required className="field" />
      </label>
      <div className="flex items-center justify-between gap-4 text-sm">
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-obsidian/70">
          <input type="checkbox" name="remember" className="size-4 accent-[#f28b82]" />
          Remember this device
        </label>
        <Link href="/admin/login" className="link-line link-line--static text-obsidian/70 hover:text-teal">
          Forgot password
        </Link>
      </div>
      <Button type="submit" variant="light" className="w-full" disabled={busy}>
        {busy ? 'Opening console' : 'Sign in'}
      </Button>
    </form>
  )
}
