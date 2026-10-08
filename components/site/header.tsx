'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react'
import { ChevronDown, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NAV, SIGN_IN, SITE } from '@/lib/site'
import { categories } from '@/lib/data/categories'
import { publishedProducts } from '@/lib/data/products'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCart } from '@/components/commerce/cart'
import { CURTAIN, EASE } from '@/components/motion/primitives'

export function Wordmark({ className }: { className?: string }) {
  return <Image src="/pricelogo.png" alt="Price-Select" width={1672} height={941} priority className={cn('h-12 w-auto rounded-sm md:h-14', className)} />
}

export function Header() {
  const pathname = usePathname()
  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const [solid, setSolid] = useState(false)
  const [menu, setMenu] = useState(false)
  const [search, setSearch] = useState(false)
  const [signIn, setSignIn] = useState(false)
  const { count, setOpen } = useCart()

  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 40))
  useEffect(() => {
    setMenu(false)
    setSearch(false)
    setSignIn(false)
  }, [pathname])

  const active = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <a href="#main" className="sr-only z-[300] bg-ivory px-4 py-2 text-obsidian focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
        className={cn(
          'fixed inset-x-0 top-0 z-50 text-ivory transition-[background-color,backdrop-filter,padding] duration-700 ease-[var(--ease-luxe)]',
          solid || menu ? 'bg-obsidian/88 py-4 backdrop-blur-md' : 'bg-transparent py-6 md:py-8',
        )}
      >
        <div className="container-luxe flex items-center justify-between gap-6">
          <Link href="/" aria-label="Price-Select home" className="relative z-10 shrink-0">
            <Wordmark />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-8 xl:gap-10">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} aria-current={active(n.href) ? 'page' : undefined} className={cn('link-line text-[0.6875rem] font-medium uppercase tracking-[0.18em] transition-colors', active(n.href) ? 'text-champagne' : 'text-ivory/75 hover:text-ivory')}>
                    {n.label}
                  </Link>
                </li>
              ))}
              <li
                className="relative"
                onMouseEnter={() => setSignIn(true)}
                onMouseLeave={() => setSignIn(false)}
                onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setSignIn(false)}
              >
                <button
                  type="button"
                  aria-expanded={signIn}
                  aria-controls="sign-in-menu"
                  // Mouse/touch clicks only open (hover already opened it); keyboard (detail 0) toggles.
                  onClick={(e) => setSignIn((o) => (e.detail === 0 ? !o : true))}
                  onKeyDown={(e) => e.key === 'Escape' && setSignIn(false)}
                  className={cn('flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.18em] transition-colors', active('/sign-in') ? 'text-champagne' : 'text-ivory/75 hover:text-ivory')}
                >
                  Sign In <ChevronDown className={cn('size-3 transition-transform duration-300', signIn && 'rotate-180')} strokeWidth={1.5} aria-hidden />
                </button>
                <AnimatePresence>
                  {signIn && (
                    <motion.ul
                      id="sign-in-menu"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="absolute -left-5 top-full mt-3 min-w-48 border border-ivory/10 bg-obsidian/95 py-2 backdrop-blur-md before:absolute before:inset-x-0 before:-top-4 before:h-4"
                    >
                      {SIGN_IN.map((s) => (
                        <li key={s.href}>
                          <Link href={s.href} className="block px-5 py-3 text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-ivory/75 transition-colors hover:text-champagne focus-visible:text-champagne">
                            {s.label}
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            </ul>
          </nav>

          <div className="relative z-10 flex items-center gap-1 md:gap-2">
            <IconBtn label="Search" onClick={() => setSearch(true)}>
              <Search className="size-[18px]" strokeWidth={1.3} />
            </IconBtn>
            <IconBtn label="Account" href="/account" className="hidden sm:grid">
              <UserRound className="size-[18px]" strokeWidth={1.3} />
            </IconBtn>
            <IconBtn label={`Cart, ${count} item${count === 1 ? '' : 's'}`} onClick={() => setOpen(true)}>
              <ShoppingBag className="size-[18px]" strokeWidth={1.3} />
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center overflow-hidden rounded-full bg-champagne px-1 text-[9px] font-bold text-obsidian">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={count} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
                    {count}
                  </motion.span>
                </AnimatePresence>
              </span>
            </IconBtn>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-controls="mobile-menu"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              className="ml-2 flex h-11 items-center gap-3 lg:hidden"
            >
              <span className="eyebrow hidden sm:inline">{menu ? 'Close' : 'Menu'}</span>
              <span className="relative block h-3 w-7" aria-hidden>
                <span className={cn('absolute left-0 h-px w-full bg-ivory transition-all duration-500', menu ? 'top-1.5 rotate-45' : 'top-0')} />
                <span className={cn('absolute left-0 h-px bg-champagne transition-all duration-500', menu ? 'top-1.5 w-full -rotate-45' : 'top-3 w-4')} />
              </span>
            </button>
          </div>
        </div>
        {/* Signature selection line doubles as a reading-progress indicator. */}
        <motion.div aria-hidden style={{ scaleX: progress }} className={cn('absolute inset-x-0 bottom-0 h-px origin-left bg-champagne/70 transition-opacity duration-500', solid ? 'opacity-100' : 'opacity-0')} />
        <div aria-hidden className={cn('absolute inset-x-0 bottom-0 h-px bg-ivory/10 transition-opacity', solid ? 'opacity-100' : 'opacity-60')} />
      </motion.header>

      <MobileMenu open={menu} active={active} />
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </>
  )
}

function IconBtn({ label, children, onClick, href, className }: { label: string; children: React.ReactNode; onClick?: () => void; href?: string; className?: string }) {
  const cls = cn('relative grid size-11 place-items-center text-ivory/85 transition-colors hover:text-champagne', className)
  return href ? (
    <Link href={href} aria-label={label} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

function MobileMenu({ open, active }: { open: boolean; active: (h: string) => boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-obsidian pt-28 text-ivory lg:hidden"
          initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          exit={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          transition={{ duration: 0.9, ease: CURTAIN }}
        >
          <div aria-hidden className="aurora opacity-60" />
          <nav aria-label="Mobile" className="container-luxe relative flex-1">
            <ul>
              {[{ href: '/', label: 'Home' }, ...NAV].map((n, i) => (
                <motion.li key={n.href} className="border-b border-ivory/10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.05, duration: 0.8, ease: EASE }}>
                  <Link href={n.href} className="flex items-baseline justify-between py-4">
                    <span className={cn('font-display text-[2.6rem] font-light leading-none', active(n.href) && n.href !== '/' && 'italic text-champagne')}>{n.label}</span>
                    <span className="meta text-ivory/40">{String(i + 1).padStart(2, '0')}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
            <motion.div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 pb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              <p className="eyebrow col-span-2 mb-2 text-champagne">Sign In</p>
              {SIGN_IN.map((s) => (
                <Link key={s.href} href={s.href} className="py-1 text-sm text-ivory/80">
                  {s.label}
                </Link>
              ))}
              <p className="eyebrow col-span-2 mb-2 mt-6 text-champagne">Departments</p>
              {categories.map((c) => (
                <Link key={c.slug} href={`/categories/${c.slug}`} className="py-1 text-sm text-ivory/70">
                  {c.short}
                </Link>
              ))}
              <Link href="/account" className="col-span-2 mt-6 eyebrow text-ivory/80">Account →</Link>
              <a href={`mailto:${SITE.email}`} className="col-span-2 text-sm text-ivory/60 break-all">{SITE.email}</a>
            </motion.div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    setTimeout(() => input.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [open, onClose])

  const term = q.trim().toLowerCase()
  const hits = term
    ? publishedProducts.filter((p) => [p.name, p.brand, p.summary, p.category].join(' ').toLowerCase().includes(term)).slice(0, 6)
    : []
  const cats = term ? categories.filter((c) => (c.name + c.description).toLowerCase().includes(term)).slice(0, 4) : categories.slice(0, 4)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Search the selection"
          className="fixed inset-0 z-[120] overflow-y-auto bg-obsidian/96 text-ivory backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <div className="container-luxe pt-8">
            <div className="flex justify-end">
              <button onClick={onClose} aria-label="Close search" className="grid size-11 place-items-center text-ivory/70 hover:text-champagne">
                <X className="size-5" strokeWidth={1.2} />
              </button>
            </div>
            <form
              className="mt-10 md:mt-20"
              onSubmit={(e) => {
                e.preventDefault()
                router.push(`/shop${term ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
                onClose()
              }}
            >
              <label htmlFor="site-search" className="eyebrow text-champagne">
                Search the selection
              </label>
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.8, ease: EASE }} className="mt-6 flex items-center border-b border-ivory/20 focus-within:border-champagne">
                <input
                  ref={input}
                  id="site-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Products, brands, departments"
                  autoComplete="off"
                  className="w-full bg-transparent py-4 font-display text-[clamp(2rem,6vw,5rem)] font-light leading-none placeholder:text-ivory/25 focus:outline-none"
                />
                <button type="submit" aria-label="Search" className="grid size-12 shrink-0 place-items-center text-champagne">
                  <Search className="size-6" strokeWidth={1.2} />
                </button>
              </motion.div>
            </form>

            <div className="mt-14 grid gap-14 pb-20 md:grid-cols-12">
              <div className="md:col-span-7">
                <p className="eyebrow text-ivory/45">{term ? `${hits.length} product${hits.length === 1 ? '' : 's'}` : 'Begin typing to search'}</p>
                <ul className="mt-6">
                  {hits.map((p, i) => (
                    <motion.li key={p.slug} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, ease: EASE }} className="border-b border-ivory/10">
                      <Link href={`/products/${p.slug}`} onClick={onClose} className="group flex items-center justify-between gap-6 py-4">
                        <span>
                          <span className="block text-base group-hover:text-champagne">{p.name}</span>
                          <span className="meta text-ivory/40">{p.brand}</span>
                        </span>
                        <span className="text-sm tabular-nums text-ivory/70">{money(p.price)}</span>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-4 md:col-start-9">
                <p className="eyebrow text-ivory/45">Departments</p>
                <ul className="mt-6 space-y-3">
                  {cats.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/categories/${c.slug}`} onClick={onClose} className="font-display text-2xl font-light text-ivory/80 hover:text-champagne">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
