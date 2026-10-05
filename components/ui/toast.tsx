'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { EASE } from '@/components/motion/primitives'

type Toast = { id: number; title: string; body?: string }
const Ctx = createContext<(t: Omit<Toast, 'id'>) => void>(() => {})

export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random()
    setItems((s) => [...s, { ...t, id }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4200)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[150] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="pointer-events-auto flex items-start gap-4 border border-champagne/25 bg-obsidian/95 px-5 py-4 text-ivory shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] backdrop-blur"
            >
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-champagne/50 text-champagne">
                <Check className="size-3" strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                {t.body && <p className="mt-1 text-xs leading-relaxed text-ivory/60">{t.body}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
