'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { categories } from '@/lib/data/categories'
import { brands, publishedProducts, STOCK_LABEL } from '@/lib/data/products'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CURTAIN, EASE } from '@/components/motion/primitives'
import { ProductCard } from './product-card'
import { unitPriceOf } from './cart'

const PRICES = [
  { id: '0-250', label: 'Under $250', min: 0, max: 250 },
  { id: '250-1000', label: '$250 – $1,000', min: 250, max: 1000 },
  { id: '1000-5000', label: '$1,000 – $5,000', min: 1000, max: 5000 },
  { id: '5000-', label: '$5,000 and above', min: 5000, max: Infinity },
]
const SORTS = [
  ['featured', 'Featured'],
  ['price-asc', 'Price, low to high'],
  ['price-desc', 'Price, high to low'],
  ['name', 'Name, A – Z'],
] as const
const STOCKS = ['in_stock', 'low_stock', 'made_to_order'] as const

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

type Filters = { q: string; category: string[]; brand: string[]; price: string; stock: string[]; seasonal: boolean; sort: string }

function matches(p: Product, f: Filters, skip?: keyof Filters) {
  const term = f.q.trim().toLowerCase()
  const price = unitPriceOf(p)
  const band = PRICES.find((b) => b.id === f.price)
  return (
    (!term || [p.name, p.brand, p.summary, p.category, p.sku].join(' ').toLowerCase().includes(term)) &&
    (skip === 'category' || !f.category.length || f.category.includes(p.category)) &&
    (skip === 'brand' || !f.brand.length || f.brand.includes(p.brand)) &&
    (skip === 'price' || !band || (price >= band.min && price < band.max)) &&
    (skip === 'stock' || !f.stock.length || f.stock.includes(p.stock)) &&
    (skip === 'seasonal' || !f.seasonal || !!p.seasonal)
  )
}

/** Catalog with URL-synced filters. The URL is the source of truth so results are shareable. */
export function ShopCatalog() {
  const sp = useSearchParams()
  const f: Filters = {
    q: sp.get('q') ?? '',
    category: list(sp.get('category')),
    brand: list(sp.get('brand')),
    price: sp.get('price') ?? '',
    stock: list(sp.get('stock')),
    seasonal: sp.get('seasonal') === '1',
    sort: sp.get('sort') ?? 'featured',
  }
  const [q, setQ] = useState(f.q)
  const [drawer, setDrawer] = useState(false)

  // Header search can change ?q= while we're mounted.
  useEffect(() => setQ(sp.get('q') ?? ''), [sp])

  const write = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString())
    for (const [k, v] of Object.entries(patch)) (v ? n.set(k, v) : n.delete(k))
    const s = n.toString()
    window.history.replaceState(null, '', `/shop${s ? `?${s}` : ''}`)
  }
  const toggle = (k: 'category' | 'brand' | 'stock', v: string) => {
    const cur = f[k]
    write({ [k]: (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(',') || null })
  }

  const results = useMemo(() => {
    const r = publishedProducts.filter((p) => matches(p, f))
    if (f.sort === 'price-asc') r.sort((a, b) => unitPriceOf(a) - unitPriceOf(b))
    else if (f.sort === 'price-desc') r.sort((a, b) => unitPriceOf(b) - unitPriceOf(a))
    else if (f.sort === 'name') r.sort((a, b) => a.name.localeCompare(b.name))
    else r.sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  // Facet counts respect every other active filter.
  const count = (k: keyof Filters, test: (p: Product) => boolean) => publishedProducts.filter((p) => matches(p, f, k) && test(p)).length

  const chips: { label: string; clear: () => void }[] = [
    ...(f.q ? [{ label: `“${f.q}”`, clear: () => write({ q: null }) }] : []),
    ...f.category.map((c) => ({ label: categories.find((x) => x.slug === c)?.short ?? c, clear: () => toggle('category', c) })),
    ...f.brand.map((b) => ({ label: b, clear: () => toggle('brand', b) })),
    ...(f.price ? [{ label: PRICES.find((p) => p.id === f.price)?.label ?? f.price, clear: () => write({ price: null }) }] : []),
    ...f.stock.map((s) => ({ label: STOCK_LABEL[s as Product['stock']] ?? s, clear: () => toggle('stock', s) })),
    ...(f.seasonal ? [{ label: 'Seasonal selection', clear: () => write({ seasonal: null }) }] : []),
  ]
  const clearAll = () => {
    setQ('')
    window.history.replaceState(null, '', f.sort !== 'featured' ? `/shop?sort=${f.sort}` : '/shop')
  }

  const body = (
    <div className="space-y-0">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          write({ q: q.trim() || null })
        }}
        className="pb-8"
      >
        <label htmlFor="shop-q" className="eyebrow text-slate">
          Search
        </label>
        <div className="mt-2 flex items-center border-b border-obsidian/20 focus-within:border-gold">
          <input
            id="shop-q"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              write({ q: e.target.value.trim() || null })
            }}
            placeholder="Products, brands, SKU"
            autoComplete="off"
            className="w-full bg-transparent py-3 text-[0.95rem] placeholder:text-slate/60 focus:outline-none"
          />
          <Search className="size-4 shrink-0 text-gold-deep" strokeWidth={1.4} aria-hidden />
        </div>
      </form>

      <Group legend="Department">
        {categories.map((c) => (
          <Check key={c.slug} checked={f.category.includes(c.slug)} onChange={() => toggle('category', c.slug)} count={count('category', (p) => p.category === c.slug)}>
            {c.name}
          </Check>
        ))}
      </Group>

      <Group legend="Price" note="Excludes taxes and shipping">
        {PRICES.map((b) => (
          <Check key={b.id} radio checked={f.price === b.id} onChange={() => write({ price: f.price === b.id ? null : b.id })} count={count('price', (p) => unitPriceOf(p) >= b.min && unitPriceOf(p) < b.max)}>
            {b.label}
          </Check>
        ))}
      </Group>

      <Group legend="Availability">
        {STOCKS.map((s) => (
          <Check key={s} checked={f.stock.includes(s)} onChange={() => toggle('stock', s)} count={count('stock', (p) => p.stock === s)}>
            {STOCK_LABEL[s]}
          </Check>
        ))}
      </Group>

      <Group legend="Seasonal">
        <Check checked={f.seasonal} onChange={() => write({ seasonal: f.seasonal ? null : '1' })} count={count('seasonal', (p) => !!p.seasonal)}>
          Seasonal selection
        </Check>
      </Group>

      <Group legend="Brand">
        {brands
          .filter((b) => publishedProducts.some((p) => p.brand === b))
          .map((b) => (
            <Check key={b} checked={f.brand.includes(b)} onChange={() => toggle('brand', b)} count={count('brand', (p) => p.brand === b)}>
              {b}
            </Check>
          ))}
      </Group>
    </div>
  )

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
      {/* Desktop rail */}
      <aside aria-label="Filters" className="hidden lg:col-span-3 lg:block">
        <div className="sticky top-28 max-h-[calc(100svh-8rem)] overflow-y-auto pr-6 no-scrollbar" data-lenis-prevent>
          {body}
        </div>
      </aside>

      <div className="lg:col-span-9">
        {/* Toolbar */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-obsidian/10 pb-6">
          <p className="flex items-baseline gap-3" aria-live="polite">
            <span className="relative inline-flex h-[1.1em] overflow-hidden font-display text-5xl font-light leading-none tabular-nums text-obsidian">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={results.length} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: 0.6, ease: EASE }}>
                  {String(results.length).padStart(2, '0')}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="meta text-slate">{results.length === 1 ? 'Product' : 'Products'}</span>
          </p>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setDrawer(true)} className="meta flex h-11 items-center gap-3 border border-obsidian/20 px-4 text-obsidian lg:hidden" aria-haspopup="dialog">
              <SlidersHorizontal className="size-4" strokeWidth={1.3} aria-hidden />
              Filter{chips.length ? ` (${chips.length})` : ''}
            </button>
            <label className="flex items-center gap-3">
              <span className="meta hidden text-slate sm:inline">Sort</span>
              <select value={f.sort} onChange={(e) => write({ sort: e.target.value === 'featured' ? null : e.target.value })} className="field min-w-[11.5rem] py-2 text-sm" aria-label="Sort products">
                {SORTS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Active filters */}
        <AnimatePresence initial={false}>
          {chips.length > 0 && (
            <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: EASE }} className="flex flex-wrap items-center gap-2 overflow-hidden pt-5" aria-label="Active filters">
              {chips.map((c) => (
                <li key={c.label}>
                  <button type="button" onClick={c.clear} className="group flex h-9 items-center gap-2 border border-obsidian/15 px-3 text-xs text-obsidian transition-colors hover:border-gold-deep" aria-label={`Remove filter ${c.label}`}>
                    {c.label}
                    <X className="size-3 text-slate group-hover:text-gold-deep" aria-hidden />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={clearAll} className="meta ml-2 h-9 text-gold-deep underline-offset-4 hover:underline">
                  Clear all
                </button>
              </li>
            </motion.ul>
          )}
        </AnimatePresence>

        {results.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="py-24 md:py-32">
            <p className="eyebrow text-gold-deep">No match</p>
            <p className="mt-6 max-w-[16ch] font-display text-[clamp(2.4rem,4.4vw,4rem)] font-light leading-[0.98] tracking-[-0.03em] text-obsidian">
              Nothing in the selection <em className="text-gold-deep">fits that brief.</em>
            </p>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-slate">Try a broader search or fewer filters. The catalog grows as approved suppliers publish new products.</p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <button type="button" onClick={clearAll} className="link-line link-line--static eyebrow text-obsidian">
                Clear all filters
              </button>
              {categories.slice(0, 3).map((c) => (
                <Link key={c.slug} href={`/categories/${c.slug}`} className="link-line eyebrow text-slate hover:text-obsidian">
                  {c.short}
                </Link>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.ul layout className="mt-12 grid grid-cols-2 gap-x-4 gap-y-14 md:gap-x-6 xl:grid-cols-3 xl:gap-x-8 xl:gap-y-20">
            <AnimatePresence mode="popLayout" initial={false}>
              {results.map((p, i) => (
                <motion.li
                  key={p.slug}
                  layout
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.3 } }}
                  transition={{ duration: 0.7, ease: EASE }}
                >
                  <ProductCard product={p} index={i} sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 37vw, 50vw" />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      {/* Mobile drawer */}
      <FilterDrawer open={drawer} onClose={() => setDrawer(false)} count={results.length} onClear={clearAll} active={chips.length}>
        {body}
      </FilterDrawer>
    </div>
  )
}

function Group({ legend, note, children }: { legend: string; note?: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-obsidian/10 py-7">
      <legend className="sr-only">{legend}</legend>
      <p aria-hidden className="eyebrow flex items-center justify-between text-obsidian">
        {legend}
        {note && <span className="text-[0.6rem] font-medium normal-case tracking-normal text-slate">{note}</span>}
      </p>
      <div className="mt-4 space-y-0.5">{children}</div>
    </fieldset>
  )
}

function Check({ checked, onChange, count, radio, children }: { checked: boolean; onChange: () => void; count: number; radio?: boolean; children: ReactNode }) {
  return (
    <label className={cn('group flex min-h-10 cursor-pointer items-center gap-3 text-sm transition-colors', count === 0 && !checked ? 'text-slate/50' : 'text-obsidian/85 hover:text-obsidian')}>
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'relative grid size-3.5 shrink-0 place-items-center border transition-colors duration-300 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-gold',
          radio && 'rounded-full',
          checked ? 'border-gold-deep' : 'border-obsidian/30 group-hover:border-obsidian/60',
        )}
      >
        <span className={cn('size-1.5 bg-gold-deep transition-transform duration-300 ease-[var(--ease-luxe)]', radio && 'rounded-full', checked ? 'scale-100' : 'scale-0')} />
      </span>
      <span className="flex-1">{children}</span>
      <span className="meta tabular-nums text-slate/70">{count}</span>
    </label>
  )
}

function FilterDrawer({ open, onClose, count, onClear, active, children }: { open: boolean; onClose: () => void; count: number; onClear: () => void; active: number; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <motion.button aria-label="Close filters" className="absolute inset-0 bg-ivory/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 left-0 flex w-full max-w-[420px] flex-col bg-ivory text-obsidian outline-none"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.7, ease: CURTAIN }}
          >
            <div className="flex items-center justify-between border-b border-obsidian/10 px-6 py-5">
              <p className="font-display text-3xl font-light">Refine</p>
              <div className="flex items-center gap-2">
                {active > 0 && (
                  <button type="button" onClick={onClear} className="meta h-11 px-2 text-gold-deep">
                    Clear
                  </button>
                )}
                <button type="button" onClick={onClose} aria-label="Close filters" className="grid size-11 place-items-center hover:text-gold-deep">
                  <X className="size-5" strokeWidth={1.2} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pt-6" data-lenis-prevent>
              {children}
            </div>
            <div className="sticky bottom-0 border-t border-obsidian/10 bg-ivory p-4">
              <button type="button" onClick={onClose} className="flex h-12 w-full items-center justify-between bg-ivory px-6 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-obsidian">
                Show {count} result{count === 1 ? '' : 's'}
                <span className="h-px w-8 bg-champagne" aria-hidden />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
