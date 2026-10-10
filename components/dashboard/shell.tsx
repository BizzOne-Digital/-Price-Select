'use client'

import Link from 'next/link'
import { Wordmark } from '@/components/site/header'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, LogOut, Menu, Search, X, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'
import { ToastProvider } from '@/components/ui/toast'
import type { Notification } from '@/lib/types'
import { date } from '@/lib/format'

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number }

/**
 * Operations shell shared by the admin console and the supplier portal.
 * Dark architectural sidebar, quiet paper workspace, hairline structure.
 */
export function DashboardShell({
  product,
  nav,
  user,
  notifications = [],
  children,
}: {
  product: string
  nav: { group?: string; items: NavItem[] }[]
  user: { name: string; role: string; initials: string }
  notifications?: Notification[]
  children: ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [miss, setMiss] = useState(false)
  const [bell, setBell] = useState(false)
  const unread = notifications.filter((n) => !n.read).length
  const root = nav[0]?.items[0]?.href ?? '/'
  const isActive = (href: string) => (href === root ? pathname === href : pathname === href || pathname.startsWith(href + '/'))

  const sidebar = (
    <div className="flex h-full flex-col bg-ivory text-obsidian">
      <div className="flex h-20 items-center justify-between border-b border-obsidian/10 px-6">
        <Link href="/" className="shrink-0" aria-label="Price-Select storefront">
          <Wordmark className="h-10 md:h-12" />
        </Link>
        <button className="grid size-10 place-items-center lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation">
          <X className="size-4" />
        </button>
      </div>
      <p className="px-6 pt-6 eyebrow text-teal/80">{product}</p>
      <nav aria-label={product} className="mt-4 flex-1 overflow-y-auto px-3 pb-6" data-lenis-prevent>
        {nav.map((g, gi) => (
          <div key={gi} className={gi ? 'mt-6' : ''}>
            {g.group && <p className="px-3 pb-2 meta text-[0.62rem] text-obsidian/30">{g.group}</p>}
            <ul className="space-y-0.5">
              {g.items.map((n) => {
                const on = isActive(n.href)
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      aria-current={on ? 'page' : undefined}
                      className={cn('group relative flex h-10 items-center gap-3 px-3 text-[0.8rem] transition-colors', on ? 'text-obsidian' : 'text-obsidian/55 hover:text-obsidian')}
                    >
                      {on && <motion.span layoutId={`nav-${product}`} className="absolute inset-0 bg-ivory/[0.06]" transition={{ duration: 0.5, ease: EASE }} />}
                      {on && <span className="absolute inset-y-2 left-0 w-px bg-champagne" aria-hidden />}
                      <n.icon className={cn('relative size-4', on ? 'text-teal' : 'text-obsidian/40 group-hover:text-obsidian/70')} strokeWidth={1.4} aria-hidden />
                      <span className="relative flex-1">{n.label}</span>
                      {!!n.badge && <span className="relative min-w-5 rounded-full bg-champagne/15 px-1.5 text-center text-[10px] tabular-nums text-teal">{n.badge}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-obsidian/10 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full border border-champagne/40 font-display text-sm text-teal">{user.initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{user.name}</p>
            <p className="meta text-[0.6rem] text-obsidian/40">{user.role}</p>
          </div>
          <Link href="/" aria-label="Sign out" className="grid size-9 place-items-center text-obsidian/40 hover:text-teal">
            <LogOut className="size-4" strokeWidth={1.4} />
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <ToastProvider>
      <div className="min-h-svh bg-ivory text-obsidian lg:grid lg:grid-cols-[264px_1fr]">
        <a href="#workspace" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ivory focus:px-4 focus:py-2">
          Skip to content
        </a>
        <aside className="sticky top-0 hidden h-svh lg:block">{sidebar}</aside>
        <AnimatePresence>
          {open && (
            <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button className="absolute inset-0 bg-obsidian/50" aria-label="Close navigation" onClick={() => setOpen(false)} />
              <motion.aside className="absolute inset-y-0 left-0 w-[280px]" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.5, ease: EASE }}>
                {sidebar}
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-obsidian/10 bg-ivory/90 px-4 backdrop-blur md:h-20 md:px-8">
            <button className="grid size-10 place-items-center lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
              <Menu className="size-5" strokeWidth={1.4} />
            </button>
            {/* ponytail: quick-jump only (order numbers + section names); full-text search arrives with the data API. */}
            <form
              role="search"
              className="flex-1 md:max-w-md"
              onSubmit={(e) => {
                e.preventDefault()
                const term = q.trim().toLowerCase()
                const items = nav.flatMap((g) => g.items)
                const orders = items.find((n) => n.label === 'Orders')
                const hit = /^ps-\d+/.test(term) && orders ? `${orders.href}${orders.href.startsWith('/admin') ? '/' + term.toUpperCase().slice(0, 9) : ''}` : items.find((n) => n.label.toLowerCase().includes(term))?.href
                setMiss(!hit)
                if (hit) {
                  router.push(hit)
                  setQ('')
                }
              }}
            >
              <label className="flex h-10 items-center gap-3 border-b border-obsidian/15 focus-within:border-gold">
                <Search className="size-4 text-slate" strokeWidth={1.4} aria-hidden />
                <span className="sr-only">Jump to an order number or section</span>
                <input value={q} onChange={(e) => (setQ(e.target.value), setMiss(false))} placeholder="Jump to order no. or section" className="w-full bg-transparent text-sm placeholder:text-slate/70 focus:outline-none" />
                {miss && <span className="shrink-0 meta text-[0.6rem] text-danger" role="status">No match</span>}
              </label>
            </form>
            <span className="ml-auto hidden items-center gap-2 meta text-[0.62rem] text-slate md:flex">
              <span className="size-1.5 rounded-full bg-warning" aria-hidden /> Demonstration environment
            </span>
            <div className="relative">
              <button onClick={() => setBell((b) => !b)} aria-expanded={bell} aria-label={`Notifications, ${unread} unread`} className="relative grid size-10 place-items-center hover:text-gold-deep">
                <Bell className="size-[18px]" strokeWidth={1.4} />
                {unread > 0 && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-gold" />}
              </button>
              <AnimatePresence>
                {bell && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute right-0 top-12 z-40 w-[min(360px,90vw)] border border-obsidian/10 bg-ivory shadow-[0_30px_60px_-20px_rgba(7,17,31,0.35)]"
                  >
                    <p className="border-b border-obsidian/10 px-5 py-4 eyebrow text-slate">Notifications</p>
                    <ul className="max-h-96 overflow-y-auto" data-lenis-prevent>
                      {notifications.map((n) => (
                        <li key={n.id} className="border-b border-obsidian/5 px-5 py-4">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            {!n.read && <span className="size-1.5 rounded-full bg-gold" aria-label="Unread" />}
                            {n.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate">{n.body}</p>
                          <p className="mt-2 meta text-[0.6rem] text-slate/70">{date(n.at)}</p>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>
          <main id="workspace" className="flex-1 px-4 py-8 md:px-8 md:py-10">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
