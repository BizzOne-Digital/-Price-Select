'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DOC_TEMPLATES, TEMPLATES } from './list'

/** Floating bar on template previews so the client can flip between homepage options. */
export function TemplateSwitcher() {
  const pathname = usePathname()
  return (
    <nav aria-label="Homepage templates" className="fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4">
      <ul className="flex max-w-full items-center gap-1 overflow-x-auto border border-obsidian/15 bg-ivory/95 p-1.5 text-obsidian shadow-2xl backdrop-blur-md">
        <li>
          <Link href="/templates" className={cn('block whitespace-nowrap px-3 py-2 text-[0.625rem] font-semibold uppercase tracking-[0.18em]', pathname === '/templates' ? 'text-teal' : 'text-obsidian/60 hover:text-obsidian')}>
            All templates
          </Link>
        </li>
        {TEMPLATES.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={pathname === t.href ? 'page' : undefined}
              className={cn(
                'block whitespace-nowrap px-3 py-2 text-[0.625rem] font-semibold uppercase tracking-[0.18em] transition-colors',
                pathname === t.href ? 'bg-champagne text-obsidian' : 'text-obsidian/75 hover:text-teal',
              )}
            >
              {t.key === 'Current' ? 'Current' : `${t.key} · ${t.name}`}
            </Link>
          </li>
        ))}
        <li aria-hidden className="mx-1 h-5 w-px shrink-0 bg-obsidian/20" />
        {DOC_TEMPLATES.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={pathname === t.href ? 'page' : undefined}
              className={cn(
                'block whitespace-nowrap px-3 py-2 text-[0.625rem] font-semibold uppercase tracking-[0.18em] transition-colors',
                pathname === t.href ? 'bg-champagne text-obsidian' : 'text-obsidian/75 hover:text-teal',
              )}
            >
              {t.name === 'Email templates' ? 'Emails' : t.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
