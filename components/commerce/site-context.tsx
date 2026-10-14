'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Category, Role } from '@/lib/types'

// Minimal, non-sensitive data the storefront shell needs on every page: who is signed in (name and
// role only) and the active categories. Both are read on the server in the (site) layout.

export type SessionLite = { name: string; role: Role } | null
type SiteCtx = { session: SessionLite; categories: Category[] }

const Ctx = createContext<SiteCtx>({ session: null, categories: [] })

export function SiteProvider({ session, categories, children }: SiteCtx & { children: ReactNode }) {
  return <Ctx.Provider value={{ session, categories }}>{children}</Ctx.Provider>
}

export const useSite = () => useContext(Ctx)
export const useSession = () => useContext(Ctx).session

export function useCategoryName() {
  const { categories } = useContext(Ctx)
  return (slug: string) => categories.find((c) => c.slug === slug)?.name ?? ''
}
