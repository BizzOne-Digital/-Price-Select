'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getProduct } from '@/lib/data/products'
import { quote, type Quote } from '@/lib/pricing'
import type { Product } from '@/lib/types'

// Client cart. Persists to localStorage per browser. Replace with a server cart (session/user)
// when accounts and checkout are wired to a backend.

export type CartLine = { slug: string; qty: number }
export type ResolvedLine = CartLine & { product: Product; unitPrice: number }

interface CartCtx {
  lines: ResolvedLine[]
  /** False until the saved cart has been read from this browser. */
  ready: boolean
  count: number
  totals: Quote
  open: boolean
  setOpen: (v: boolean) => void
  add: (slug: string, qty?: number) => void
  update: (slug: string, qty: number) => void
  remove: (slug: string) => void
  clear: () => void
}

const Ctx = createContext<CartCtx | null>(null)
const KEY = 'ps-cart-v1'

export const unitPriceOf = (p: Product) => p.seasonalPrice ?? p.price

export function CartProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<CartLine[]>([])
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartLine[]
      if (Array.isArray(saved)) setRaw(saved.filter((l) => getProduct(l.slug)))
    } catch {}
    setReady(true)
  }, [])

  const persist = useCallback((next: CartLine[]) => {
    setRaw(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {}
  }, [])

  const value = useMemo<CartCtx>(() => {
    const lines = raw.map((l) => {
      const product = getProduct(l.slug)!
      return { ...l, product, unitPrice: unitPriceOf(product) }
    })
    return {
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.qty, 0),
      totals: quote(lines.map((l) => ({ unitPrice: l.unitPrice, qty: l.qty, supplierId: l.product.supplierId }))),
      open,
      setOpen,
      add: (slug, qty = 1) => {
        const hit = raw.find((l) => l.slug === slug)
        persist(hit ? raw.map((l) => (l.slug === slug ? { ...l, qty: Math.min(l.qty + qty, 99) } : l)) : [...raw, { slug, qty }])
      },
      update: (slug, qty) => persist(qty <= 0 ? raw.filter((l) => l.slug !== slug) : raw.map((l) => (l.slug === slug ? { ...l, qty: Math.min(qty, 99) } : l))),
      remove: (slug) => persist(raw.filter((l) => l.slug !== slug)),
      clear: () => persist([]),
    }
  }, [raw, open, ready, persist])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart must be used inside CartProvider')
  return c
}
