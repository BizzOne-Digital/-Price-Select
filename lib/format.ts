const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const money = (n: number) => usd.format(n)
export const money0 = (n: number) => usd0.format(n)
export const date = (iso: string) => day.format(new Date(iso))
export const pad = (n: number, len = 2) => String(n).padStart(len, '0')
export const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
