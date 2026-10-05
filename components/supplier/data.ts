import type { Notification, ReturnCase } from '@/lib/types'
import { DEMO_SUPPLIER_ID, getSupplier } from '@/lib/data/suppliers'
import { products } from '@/lib/data/products'
import { fulfillmentsFor, returnCases } from '@/lib/data/operations'

// Supplier-scoped selectors for the portal. Every read is filtered by the signed-in supplier id,
// so swapping lib/data for an API keeps isolation in one place.

export const SUPPLIER_ID = DEMO_SUPPLIER_ID
export const supplier = getSupplier(SUPPLIER_ID)!
export const myProducts = products.filter((p) => p.supplierId === SUPPLIER_ID)
export const myFulfillments = fulfillmentsFor(SUPPLIER_ID)
export type MyFulfillment = (typeof myFulfillments)[number]

/** Fixed "now" for the demonstration so server and client render identical elapsed times. */
export const DEMO_NOW = '2026-10-06T09:00:00Z'
export const hoursBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 36e5

/** Placeholder targets in hours (SERVICE_TARGETS: 1 business day, 24 hours). To be agreed with suppliers. */
export const TARGET_HOURS = { acknowledgment: 24, tracking: 24, response: 24 }

export const myCases: ReturnCase[] = [...returnCases.filter((c) => c.supplierId === SUPPLIER_ID)]

export const supplierNotifications: Notification[] = [
  { id: 'sn1', event: 'supplier_ack', title: 'New fulfillment routed', body: 'PS-240135-C was routed to you. Acknowledged.', at: '2026-10-05T18:00:00Z', read: true },
  { id: 'sn2', event: 'support_escalation', title: 'Case awaiting your response', body: 'RC-3024: damage report on Aurum Mono Panel 410 W.', at: '2026-10-05T15:05:00Z', read: false },
  { id: 'sn3', event: 'order_canceled', title: 'Cancellation requested', body: 'RC-3019: customer asked to cancel before dispatch.', at: '2026-10-06T06:40:00Z', read: false },
]

/** Tiny CSV parser: handles quoted fields, escaped quotes, CRLF. Returns rows of trimmed cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++
      else if (ch === '"') q = false
      else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') row.push(cell.trim()), (cell = '')
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cell.trim()), rows.push(row), (row = []), (cell = '')
    } else cell += ch
  }
  if (cell || row.length) row.push(cell.trim()), rows.push(row)
  return rows.filter((r) => r.some((c) => c !== ''))
}
