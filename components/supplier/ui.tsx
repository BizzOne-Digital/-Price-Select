'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Check, Paperclip, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EASE } from '@/components/motion/primitives'

/** Right-hand sheet. role=dialog, aria-modal, Escape to close, focus moves in and returns. */
export function Drawer({ open, onClose, title, eyebrow, children, footer }: { open: boolean; onClose: () => void; title: string; eyebrow?: string; children: ReactNode; footer?: ReactNode }) {
  const id = useId()
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const html = document.documentElement
    const overflow = html.style.overflow
    html.style.overflow = 'hidden'
    panel.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      html.style.overflow = overflow
      prev?.focus()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-obsidian/45" aria-label="Close panel" tabIndex={-1} onClick={onClose} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            tabIndex={-1}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.6, ease: EASE }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col bg-[#f6f3ed] text-obsidian shadow-[-30px_0_80px_-30px_rgba(7,17,31,0.5)] focus:outline-none"
          >
            <header className="flex items-start justify-between gap-6 border-b border-obsidian/10 px-6 py-6 md:px-10">
              <div>
                {eyebrow && <p className="eyebrow text-gold-deep">{eyebrow}</p>}
                <h2 id={id} className="mt-2 font-display text-3xl font-light leading-tight tracking-[-0.02em] md:text-4xl">
                  {title}
                </h2>
              </div>
              <button onClick={onClose} aria-label="Close" className="grid size-11 shrink-0 place-items-center border border-obsidian/15 hover:border-obsidian">
                <X className="size-4" strokeWidth={1.4} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10" data-lenis-prevent>
              {children}
            </div>
            {footer && <footer className="border-t border-obsidian/10 bg-ivory/60 px-6 py-4 md:px-10">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Hairline file picker. Keeps filenames only; nothing is uploaded in the demo. */
export function FilePick({ label, hint, files, onChange, accept, multiple, error, dark }: { label: string; hint?: string; files: string[]; onChange: (f: FileList | null) => void; accept?: string; multiple?: boolean; error?: string; dark?: boolean }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className={cn('group flex min-h-14 cursor-pointer items-center gap-4 border border-dashed px-4 py-3 transition-colors', dark ? 'border-ivory/20 hover:border-champagne/70' : 'border-obsidian/20 hover:border-gold', error && 'border-danger/60')}>
        <Paperclip className={cn('size-4 shrink-0', dark ? 'text-champagne' : 'text-gold-deep')} strokeWidth={1.4} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm">{label}</span>
          <span className={cn('mt-0.5 block truncate text-xs', dark ? 'text-ivory/45' : 'text-slate')}>{files.length ? files.join(', ') : (hint ?? 'Select a file')}</span>
        </span>
        {files.length > 0 && <Check className="size-4 text-success" strokeWidth={1.6} aria-label="Attached" />}
        <input id={id} type="file" className="sr-only" accept={accept} multiple={multiple} onChange={(e) => onChange(e.target.files)} aria-invalid={!!error} />
      </label>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}

/** Square checkbox with a gold tick. */
export function Tick({ checked, onChange, children, error, dark }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string; dark?: boolean }) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 py-1 text-sm leading-relaxed">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" aria-invalid={!!error} />
        <span
          aria-hidden
          className={cn(
            'mt-0.5 grid size-5 shrink-0 place-items-center border transition-colors peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold',
            checked ? (dark ? 'border-champagne bg-champagne text-obsidian' : 'border-obsidian bg-obsidian text-champagne') : dark ? 'border-ivory/30' : 'border-obsidian/30',
          )}
        >
          {checked && <Check className="size-3" strokeWidth={2} />}
        </span>
        <span className={dark ? 'text-ivory/80' : ''}>{children}</span>
      </label>
      {error && <p className="ml-8 mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
}

/** Field error line, used under .field inputs. */
export const Err = ({ msg }: { msg?: string }) => (msg ? <span className="mt-1.5 block text-xs text-danger" role="alert">{msg}</span> : null)

/** Link styled as the kit's ActionButton. */
export function LinkButton({ href, children, tone = 'default' }: { href: string; children: ReactNode; tone?: 'default' | 'primary' }) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 border px-4 text-[0.65rem] font-semibold uppercase tracking-[0.16em] transition-colors',
        tone === 'primary' ? 'border-obsidian bg-obsidian text-ivory hover:bg-midnight hover:text-champagne' : 'border-obsidian/20 hover:border-obsidian',
      )}
    >
      {children}
    </Link>
  )
}

const dtf = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
/** Date + time in UTC, so server and client render identically. */
export const dateTime = (iso: string) => `${dtf.format(new Date(iso))} UTC`
/** "3.5 h" / "2 d 4 h" */
export const dur = (h: number) => (h < 48 ? `${Math.round(h * 10) / 10} h` : `${Math.floor(h / 24)} d ${Math.round(h % 24)} h`)
const df = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export const day = (iso: string) => df.format(new Date(iso))
