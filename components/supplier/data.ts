// Pure helpers shared by the supplier portal client components. No demo data lives here.

export const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 36e5

export type Target = { amount: number; unit: 'hours' | 'business_days' | 'days'; label: string }
export type Targets = Record<'ack' | 'tracking' | 'response' | 'inventory', Target>

/** "1 business day", "24 hours". */
export const targetText = (t: Pick<Target, 'amount' | 'unit'>) => `${t.amount} ${t.unit === 'business_days' ? 'business day' : t.unit === 'days' ? 'day' : 'hour'}${t.amount === 1 ? '' : 's'}`

/** Upper bound in calendar hours (a business-day target is at least 24 h per day). */
export const targetHours = (t: Pick<Target, 'amount' | 'unit'>) => (t.unit === 'hours' ? t.amount : t.amount * 24)

export const OPEN_CASE = ['open', 'awaiting_supplier', 'escalated'] as const

const dtf = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
/** Date + time in UTC, so server and client render identically. */
export const dateTime = (iso: string) => `${dtf.format(new Date(iso))} UTC`
/** "3.5 h" / "2 d 4 h" */
export const dur = (h: number) => (h < 48 ? `${Math.round(h * 10) / 10} h` : `${Math.floor(h / 24)} d ${Math.round(h % 24)} h`)
const df = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
export const day = (iso: string) => df.format(new Date(iso))
