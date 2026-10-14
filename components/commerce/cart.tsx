'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, errorText } from '@/lib/client/api'
import type { CartLineView, CheckoutQuote } from '@/lib/types'

// Cart. Prices, availability and totals always come from the server (`CheckoutQuote`).
// Guests: only `{productId, qty}` is kept in this browser and re-quoted on every change.
// Signed-in customers: the server cart; a guest cart left in this browser is merged on sign-in.

export type CartItem = { productId: string; qty: number }

interface CartCtx {
  items: CartItem[]
  /** Server-priced lines (empty until the first quote arrives). */
  lines: CartLineView[]
  quote: CheckoutQuote | null
  /** False until the cart has been loaded for this browser/account. */
  ready: boolean
  /** A quote/cart request is in flight. */
  busy: boolean
  error: string
  count: number
  open: boolean
  setOpen: (v: boolean) => void
  /** Resolves true once the server accepted the change. */
  add: (productId: string, qty?: number) => Promise<boolean>
  update: (productId: string, qty: number) => Promise<boolean>
  remove: (productId: string) => Promise<boolean>
  /** Reload the server cart (after an order is placed the server cart is already cleared). */
  reload: () => Promise<void>
  clearLocal: () => void
}

const Ctx = createContext<CartCtx | null>(null)
const KEY = 'ps-cart-v2'
const ID = /^[a-f\d]{24}$/i

function readLocal(): CartItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartItem[]
    return Array.isArray(v) ? v.filter((l) => l && ID.test(l.productId) && Number.isInteger(l.qty) && l.qty > 0).map((l) => ({ productId: l.productId, qty: Math.min(l.qty, 99) })) : []
  } catch {
    return []
  }
}
function writeLocal(items: CartItem[]) {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items))
    else localStorage.removeItem(KEY)
  } catch {}
}
const fromQuote = (q: CheckoutQuote): CartItem[] => q.lines.map((l) => ({ productId: l.productId, qty: l.qty }))

export function CartProvider({ customer, children }: { customer: boolean; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const seq = useRef(0)
  const itemsRef = useRef(items)
  itemsRef.current = items

  /** Run a request; only the latest one may update state. */
  const run = useCallback(async (req: () => Promise<CheckoutQuote | null>, nextItems?: CartItem[]) => {
    const n = ++seq.current
    setBusy(true)
    try {
      const q = await req()
      if (n !== seq.current) return true
      setQuote(q)
      setItems(q && customer ? fromQuote(q) : (nextItems ?? []))
      setError('')
      return true
    } catch (e) {
      if (n === seq.current) setError(errorText(e))
      return false
    } finally {
      if (n === seq.current) setBusy(false)
    }
  }, [customer])

  const load = useCallback(async () => {
    if (customer) {
      const guest = readLocal()
      const ok = await run(() => (guest.length ? api<CheckoutQuote>('/api/cart/merge', { body: { items: guest } }) : api<CheckoutQuote>('/api/cart')))
      if (ok && guest.length) writeLocal([])
    } else {
      const local = readLocal()
      await run(() => (local.length ? api<CheckoutQuote>('/api/checkout/quote', { body: { items: local } }) : Promise.resolve(null)), local)
    }
    setReady(true)
  }, [customer, run])

  useEffect(() => {
    setReady(false)
    void load()
  }, [load])

  const commit = useCallback(
    async (next: CartItem[]) => {
      const prev = itemsRef.current
      setItems(next)
      if (customer) {
        const ok = await run(() => api<CheckoutQuote>('/api/cart', { method: 'PUT', body: { items: next } }))
        if (!ok) setItems(prev)
        return ok
      }
      writeLocal(next)
      return run(() => (next.length ? api<CheckoutQuote>('/api/checkout/quote', { body: { items: next } }) : Promise.resolve(null)), next)
    },
    [customer, run],
  )

  const value = useMemo<CartCtx>(() => {
    const cur = items
    return {
      items: cur,
      lines: quote?.lines ?? [],
      quote,
      ready,
      busy,
      error,
      count: cur.reduce((s, l) => s + l.qty, 0),
      open,
      setOpen,
      add: (productId, qty = 1) => {
        const hit = cur.find((l) => l.productId === productId)
        return commit(hit ? cur.map((l) => (l.productId === productId ? { ...l, qty: Math.min(l.qty + qty, 99) } : l)) : [...cur, { productId, qty: Math.min(qty, 99) }])
      },
      update: (productId, qty) => commit(qty <= 0 ? cur.filter((l) => l.productId !== productId) : cur.map((l) => (l.productId === productId ? { ...l, qty: Math.min(qty, 99) } : l))),
      remove: (productId) => commit(cur.filter((l) => l.productId !== productId)),
      reload: load,
      clearLocal: () => {
        writeLocal([])
        if (!customer) {
          setItems([])
          setQuote(null)
        }
      },
    }
  }, [items, quote, ready, busy, error, open, commit, load, customer])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart must be used inside CartProvider')
  return c
}

/** Lines grouped by fulfilling supplier, in cart order. Supplier identity is never shown (blind dropship). */
export function groupBySupplier(lines: CartLineView[]) {
  const map = new Map<string, CartLineView[]>()
  for (const l of lines) map.set(l.supplierId || l.productId, [...(map.get(l.supplierId || l.productId) ?? []), l])
  return [...map.entries()].map(([supplierId, items]) => ({ supplierId, items }))
}
