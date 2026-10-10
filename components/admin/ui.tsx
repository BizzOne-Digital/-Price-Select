'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { EASE } from '@/components/motion/primitives'
import { cn } from '@/lib/utils'

/** Side drawer for case / product detail. role=dialog, Escape closes, focus moves in. */
export function Drawer({ open, onClose, title, eyebrow, children, footer }: { open: boolean; onClose: () => void; title: string; eyebrow?: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
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
        <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-obsidian/40" aria-label="Close panel" onClick={onClose} tabIndex={-1} />
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-ivory shadow-[-40px_0_80px_-30px_rgba(7,17,31,0.35)] focus:outline-none"
          >
            <div className="flex items-start justify-between gap-4 border-b border-obsidian/10 px-6 py-6 md:px-8">
              <div className="min-w-0">
                {eyebrow && <p className="eyebrow text-gold-deep">{eyebrow}</p>}
                <h2 className="mt-2 font-display text-3xl font-light leading-tight tracking-[-0.02em]">{title}</h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="grid size-11 shrink-0 place-items-center border border-obsidian/15 hover:border-obsidian">
                <X className="size-4" strokeWidth={1.4} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8" data-lenis-prevent>
              {children}
            </div>
            {footer && <div className="flex flex-wrap gap-3 border-t border-obsidian/10 px-6 py-4 md:px-8">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** One monitoring warning: tone rule on the left, what's wrong, where to act. */
export function WarnRow({ tone = 'warn', title, detail, href, action = 'Review' }: { tone?: 'warn' | 'bad' | 'good'; title: ReactNode; detail?: ReactNode; href?: string; action?: string }) {
  return (
    <li className="group relative flex items-center gap-4 border-b border-obsidian/[0.07] py-3.5 pl-4 last:border-0">
      <span aria-hidden className={cn('absolute inset-y-3 left-0 w-px', tone === 'bad' ? 'bg-danger' : tone === 'good' ? 'bg-success' : 'bg-warning')} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{title}</p>
        {detail && <p className="mt-0.5 text-xs text-slate">{detail}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 meta text-[0.6rem] text-gold-deep hover:text-obsidian">
          {action} <ArrowUpRight className="size-3" />
        </Link>
      )}
    </li>
  )
}

/** Definition list row. */
export function KV({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-obsidian/[0.07] py-3 text-sm last:border-0">
      <dt className="meta text-[0.62rem] text-slate">{k}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

/** Small serif section title inside a page. */
export function SubHead({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-5 mt-14 flex flex-wrap items-end justify-between gap-3 first:mt-0">
      <h2 className="font-display text-2xl font-light tracking-[-0.01em] md:text-3xl">{children}</h2>
      {note && <p className="meta text-[0.6rem] text-slate">{note}</p>}
    </div>
  )
}

export const inputCls = 'h-11 w-full border border-obsidian/15 bg-ivory/60 px-3 text-sm focus:border-gold focus:outline-none'
