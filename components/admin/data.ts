import type { Metadata } from 'next'
import { date } from '@/lib/format'

// Pure helpers for the operations console. All figures come from the server services; nothing here
// holds demonstration data or a frozen clock.

export const adminMeta = (title: string, description: string, path: string): Metadata => ({
  title,
  description,
  alternates: { canonical: path },
  robots: { index: false, follow: false },
})

const OPEN_CASE = new Set(['open', 'awaiting_supplier', 'approved', 'in_transit', 'escalated'])
export const isOpenCase = (s: string) => OPEN_CASE.has(s)

export const H = 3_600_000
/** Hours between an ISO timestamp and `now` (passed from the server render to keep hydration stable). */
export const hoursSince = (iso: string, now: number) => (now - new Date(iso).getTime()) / H

/** Date or a dash for missing timestamps (services return '' for unset dates). */
export const when = (iso?: string | null) => (iso ? date(iso) : '—')

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`
