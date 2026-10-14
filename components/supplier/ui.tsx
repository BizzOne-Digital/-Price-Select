'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Check, Paperclip, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { errorText } from '@/lib/client/api'
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
            className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col bg-teal text-white shadow-[-30px_0_80px_-30px_rgba(7,17,31,0.5)] focus:outline-none"
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

/**
 * Hairline file picker that uploads each chosen file through `onUpload` and shows per-file progress
 * and errors. `files` lists what the server already holds (links open the private file).
 */
export function FilePick({ label, hint, files, onUpload, accept, multiple, error, dark, disabled }: { label: string; hint?: string; files: { id: string; name: string; href?: string; status?: string }[]; onUpload: (f: File, onProgress: (p: number) => void) => Promise<void>; accept?: string; multiple?: boolean; error?: string; dark?: boolean; disabled?: boolean }) {
  const id = useId()
  const [jobs, setJobs] = useState<{ key: string; name: string; p: number; error?: string }[]>([])
  const busy = jobs.some((j) => !j.error)
  const pick = async (list: FileList | null) => {
    for (const f of Array.from(list ?? [])) {
      const key = `${f.name}-${Date.now()}-${Math.random()}`
      setJobs((s) => [...s, { key, name: f.name, p: 0 }])
      try {
        await onUpload(f, (p) => setJobs((s) => s.map((j) => (j.key === key ? { ...j, p } : j))))
        setJobs((s) => s.filter((j) => j.key !== key))
      } catch (e) {
        setJobs((s) => s.map((j) => (j.key === key ? { ...j, error: errorText(e) } : j)))
      }
    }
  }
  return (
    <div>
      <label htmlFor={id} className={cn('group flex min-h-14 items-center gap-4 border border-dashed px-4 py-3 transition-colors', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', dark ? 'border-obsidian/20 hover:border-champagne/70' : 'border-obsidian/20 hover:border-gold', error && 'border-danger/60')}>
        <Paperclip className={cn('size-4 shrink-0', dark ? 'text-teal' : 'text-gold-deep')} strokeWidth={1.4} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm">{label}</span>
          <span className={cn('mt-0.5 block truncate text-xs', dark ? 'text-obsidian/45' : 'text-slate')}>{busy ? 'Uploading…' : (hint ?? 'Select a file')}</span>
        </span>
        {files.length > 0 && <Check className="size-4 text-success" strokeWidth={1.6} aria-label="Uploaded" />}
        <input id={id} type="file" className="sr-only" accept={accept} multiple={multiple} disabled={disabled || busy} onChange={(e) => (pick(e.target.files), (e.target.value = ''))} aria-invalid={!!error} />
      </label>
      {(files.length > 0 || jobs.length > 0) && (
        <ul className="mt-2 space-y-1 text-xs" aria-live="polite">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-3">
              {f.href ? <a href={f.href} target="_blank" rel="noreferrer" className="link-line truncate">{f.name}</a> : <span className="truncate">{f.name}</span>}
              {f.status && <span className="meta shrink-0 text-[0.55rem] text-slate">{f.status.replace('_', ' ')}</span>}
            </li>
          ))}
          {jobs.map((j) => (
            <li key={j.key} className="flex items-center justify-between gap-3">
              <span className="truncate">{j.name}</span>
              {j.error ? (
                <span className="flex shrink-0 items-center gap-2 text-danger" role="alert">
                  {j.error}
                  <button type="button" aria-label={`Dismiss ${j.name}`} onClick={() => setJobs((s) => s.filter((x) => x.key !== j.key))}><X className="size-3" /></button>
                </span>
              ) : (
                <span className="shrink-0 tabular-nums text-slate">{Math.round(j.p * 100)}%</span>
              )}
            </li>
          ))}
        </ul>
      )}
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
            checked ? (dark ? 'border-champagne bg-champagne text-obsidian' : 'border-obsidian bg-ivory text-teal') : dark ? 'border-obsidian/30' : 'border-obsidian/30',
          )}
        >
          {checked && <Check className="size-3" strokeWidth={2} />}
        </span>
        <span className={dark ? 'text-obsidian/80' : ''}>{children}</span>
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
        tone === 'primary' ? 'border-teal bg-teal text-white hover:bg-teal/90 hover:text-white' : 'border-obsidian/20 hover:border-obsidian',
      )}
    >
      {children}
    </Link>
  )
}

export { dateTime, dur, day } from './data'
