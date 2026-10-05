'use client'

import { motion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { titleCase } from '@/lib/format'
import { Counter, EASE } from '@/components/motion/primitives'

/* ───────── Page header: serif title, hairline, actions ───────── */
export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-10 flex flex-col gap-6 border-b border-obsidian/10 pb-8 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="eyebrow text-gold-deep">{eyebrow}</p>}
        <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="mt-3 font-display text-4xl font-light leading-none tracking-[-0.02em] md:text-5xl">
          {title}
        </motion.h1>
        {description && <div className="mt-4 max-w-2xl text-sm leading-relaxed text-slate">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  )
}

/* ───────── Panel: the basic container. Hairline border, no rounded corners. ───────── */
export function Panel({ title, action, children, className, pad = true }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: EASE }}
      className={cn('border border-obsidian/10 bg-ivory/70', className)}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-4 border-b border-obsidian/10 px-5 py-4">
          {title && <h2 className="eyebrow text-slate">{title}</h2>}
          {action}
        </div>
      )}
      <div className={pad ? 'p-5' : ''}>{children}</div>
    </motion.section>
  )
}

/* ───────── Metric ───────── */
export function MetricCard({
  label,
  value,
  prefix,
  suffix,
  decimals = 0,
  delta,
  hint,
  tone = 'default',
  spark,
}: {
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals?: number
  delta?: number
  hint?: string
  tone?: 'default' | 'warning' | 'danger'
  spark?: number[]
}) {
  return (
    <div className="relative min-w-0 bg-ivory/70 p-4 sm:p-5 md:p-6">
      <span aria-hidden className={cn('absolute inset-x-0 top-0 h-px', tone === 'danger' ? 'bg-danger/70' : tone === 'warning' ? 'bg-warning/70' : 'bg-transparent')} />
      <p className="meta text-[0.64rem] text-slate">{label}</p>
      <p className="mt-4 font-display text-[1.9rem] font-light leading-none tracking-[-0.02em] sm:text-[2.6rem]">
        <Counter to={value} prefix={prefix} suffix={suffix} decimals={decimals} />
      </p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-xs text-slate">
          {delta !== undefined && (
            <span className={cn('mr-2 inline-flex items-center gap-0.5 font-medium', delta >= 0 ? 'text-success' : 'text-danger')}>
              {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(delta)}%
            </span>
          )}
          {hint}
        </p>
        {spark && <Sparkline data={spark} />}
      </div>
    </div>
  )
}

export function MetricGrid({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 | 5 }) {
  return <div className={cn('grid grid-cols-2 gap-px border border-obsidian/10 bg-obsidian/10', { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' }[cols])}>{children}</div>
}

/* ───────── Status badge: one vocabulary for every status in the system ───────── */
const TONES: Record<string, string> = {
  good: 'text-success border-success/30 bg-success/[0.07]',
  info: 'text-ocean border-ocean/25 bg-ocean/[0.06]',
  warn: 'text-[#9a6a24] border-warning/40 bg-warning/[0.08]',
  bad: 'text-danger border-danger/30 bg-danger/[0.06]',
  muted: 'text-slate border-obsidian/15 bg-obsidian/[0.03]',
  gold: 'text-gold-deep border-gold/40 bg-gold/[0.08]',
}
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  pending: 'warn', confirmed: 'info', processing: 'info', shipped: 'gold', delivered: 'good', canceled: 'muted', returned: 'muted',
  approved: 'good', published: 'good', active: 'good', healthy: 'good', resolved: 'good', captured: 'good', on_file: 'good', in_stock: 'good',
  applied: 'warn', under_review: 'warn', pending_review: 'warn', awaiting_supplier: 'warn', open: 'info', authorized: 'info', in_transit: 'gold', delayed: 'warn', low_stock: 'warn', manual: 'muted', guest: 'muted', made_to_order: 'muted',
  suspended: 'bad', rejected: 'bad', flagged: 'bad', failed: 'bad', escalated: 'bad', declined: 'muted', expired: 'bad', refunded: 'muted', partially_refunded: 'muted', urgent: 'bad', high: 'warn', normal: 'info', low: 'muted', required: 'bad', out_of_stock: 'bad',
}

export function StatusBadge({ status, label, tone }: { status: string; label?: string; tone?: keyof typeof TONES }) {
  const t = tone ?? STATUS_TONE[status] ?? 'muted'
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 whitespace-nowrap border px-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em]', TONES[t])}>
      <span className="size-1 rounded-full bg-current" aria-hidden />
      {label ?? titleCase(status)}
    </span>
  )
}

/* ───────── DataTable: sortable, accessible, horizontally scrollable on small screens ───────── */
export type Column<T> = { key: string; header: string; cell: (row: T) => ReactNode; sort?: (row: T) => string | number; align?: 'right'; className?: string }

export function DataTable<T>({ rows, columns, rowKey, empty = 'Nothing to show yet.', caption }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; empty?: string; caption?: string }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key)
    if (!col?.sort || !sort) return rows
    return [...rows].sort((a, b) => (col.sort!(a) > col.sort!(b) ? 1 : -1) * sort.dir)
  }, [rows, columns, sort])

  return (
    <div className="overflow-x-auto" data-lenis-prevent>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-obsidian/10">
            {columns.map((c) => (
              <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined} className={cn('px-4 py-3 text-left meta text-[0.62rem] font-semibold text-slate', c.align === 'right' && 'text-right', c.className)}>
                {c.sort ? (
                  <button className="inline-flex items-center gap-1 uppercase hover:text-obsidian" onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === 1 ? -1 : 1 }))}>
                    {c.header}
                    {sort?.key === c.key ? sort.dir === 1 ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" /> : <ChevronDown className="size-3 opacity-30" />}
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-slate">
                {empty}
              </td>
            </tr>
          )}
          {sorted.map((r, i) => (
            <motion.tr
              key={rowKey(r)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.025, 0.4), duration: 0.5 }}
              className="border-b border-obsidian/[0.06] transition-colors hover:bg-pearl/60"
            >
              {columns.map((c) => (
                <td key={c.key} className={cn('px-4 py-3.5 align-middle', c.align === 'right' && 'text-right tabular-nums', c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ───────── Charts: dependency-free SVG, drawn on entry ───────── */
export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 80},${22 - ((v - min) / (max - min || 1)) * 20}`).join(' ')
  return (
    <svg viewBox="0 0 80 24" className={cn('h-6 w-20', className)} aria-hidden>
      <motion.polyline points={pts} fill="none" stroke="#b89a5a" strokeWidth="1.2" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE }} />
    </svg>
  )
}

export function AreaChart({ data, format = (v) => String(v), label }: { data: { label: string; value: number }[]; format?: (v: number) => string; label: string }) {
  const W = 640
  const H = 220
  const P = { t: 16, r: 8, b: 28, l: 8 }
  const max = Math.max(...data.map((d) => d.value)) * 1.1
  const x = (i: number) => P.l + (i / (data.length - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z`
  const [hover, setHover] = useState<number | null>(null)
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(', ')}`} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="area-g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#b89a5a" stopOpacity="0.28" />
            <stop offset="1" stopColor="#b89a5a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={P.l} x2={W - P.r} y1={y(max * f)} y2={y(max * f)} stroke="#0b0d10" strokeOpacity="0.06" />
        ))}
        <motion.path d={area} fill="url(#area-g)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.6 }} />
        <motion.path d={line} fill="none" stroke="#8a6c33" strokeWidth="1.5" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease: EASE }} />
        {data.map((d, i) => (
          <g key={d.label}>
            <rect x={x(i) - (W / data.length) / 2} y={0} width={W / data.length} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#66707c" fontFamily="var(--font-sans)">
              {d.label}
            </text>
          </g>
        ))}
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#b89a5a" strokeOpacity="0.5" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="4" fill="#f4f0e8" stroke="#8a6c33" />
            <text x={Math.min(Math.max(x(hover), 40), W - 40)} y={y(data[hover].value) - 12} textAnchor="middle" fontSize="11" fill="#0b0d10" fontFamily="var(--font-sans)" fontWeight="600">
              {format(data[hover].value)}
            </text>
          </g>
        )}
      </svg>
    </figure>
  )
}

export function BarList({ data, format = (v) => `${v}%` }: { data: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value))
  return (
    <ul className="space-y-4">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="flex justify-between text-sm">
            <span>{d.label}</span>
            <span className="tabular-nums text-slate">{format(d.value)}</span>
          </div>
          <div className="mt-2 h-px bg-obsidian/10">
            <motion.div className="h-px origin-left bg-gold" style={{ width: `${(d.value / max) * 100}%` }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: i * 0.06, ease: EASE }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Ring({ value, label, size = 120 }: { value: number; label: string; size?: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${label}: ${value}%`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#0b0d10" strokeOpacity="0.08" strokeWidth="2" />
        <motion.circle cx="60" cy="60" r={r} fill="none" stroke="#b89a5a" strokeWidth="2" strokeLinecap="round" transform="rotate(-90 60 60)" strokeDasharray={c} initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - value / 100) }} viewport={{ once: true }} transition={{ duration: 1.6, ease: EASE }} />
        <text x="60" y="66" textAnchor="middle" fontSize="22" fontFamily="var(--font-display)" fill="#0b0d10">
          {value}%
        </text>
      </svg>
      <figcaption className="mt-3 max-w-[12ch] text-center meta text-[0.6rem] text-slate">{label}</figcaption>
    </figure>
  )
}

/* ───────── Small form + action primitives for operational screens ───────── */
export function ActionButton({ children, tone = 'default', className, ...rest }: { children: ReactNode; tone?: 'default' | 'primary' | 'danger' | 'ghost' } & React.ComponentProps<'button'>) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 border px-4 text-[0.65rem] font-semibold uppercase tracking-[0.16em] transition-colors disabled:opacity-40',
        tone === 'primary' && 'border-obsidian bg-obsidian text-ivory hover:bg-midnight hover:text-champagne',
        tone === 'default' && 'border-obsidian/20 hover:border-obsidian',
        tone === 'danger' && 'border-danger/40 text-danger hover:bg-danger/5',
        tone === 'ghost' && 'border-transparent text-slate hover:text-obsidian',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div role="tablist" className="no-scrollbar flex gap-6 overflow-x-auto border-b border-obsidian/10">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={cn('relative whitespace-nowrap pb-3 text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors', value === o.value ? 'text-obsidian' : 'text-slate hover:text-obsidian')}>
          {o.label}
          {o.count !== undefined && <span className="ml-2 tabular-nums text-slate">{o.count}</span>}
          {value === o.value && <motion.span layoutId="tab-line" className="absolute inset-x-0 -bottom-px h-px bg-gold" />}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="meta text-[0.62rem] text-slate">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1.5 block text-xs text-slate/80">{hint}</span>}
    </label>
  )
}

export function DemoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mb-8 flex items-start gap-3 border-l-2 border-gold bg-gold/[0.06] px-4 py-3 text-xs leading-relaxed text-slate">
      <span className="eyebrow mt-0.5 shrink-0 text-gold-deep">Demo</span>
      <span>{children}</span>
    </div>
  )
}
