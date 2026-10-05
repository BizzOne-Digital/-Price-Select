// Order pricing. Displayed product prices exclude taxes and shipping.
// Shipping and tax below are DEMO placeholders: the payment, tax and carrier providers are not yet
// selected (see TO_CONFIRM in lib/site.ts). Replace `quote` with provider calls before launch.

export interface QuoteLine {
  unitPrice: number
  qty: number
  supplierId: string
}

export interface Quote {
  subtotal: number
  shipping: number | null
  tax: number | null
  discount: number
  total: number
  shipments: number
}

/** Demo-only flat rate per supplier shipment, so split shipments are visible in the UI. */
export const DEMO_SHIPPING_PER_SHIPMENT = 15

export function quote(lines: QuoteLine[], opts: { estimateShipping?: boolean; discount?: number } = {}): Quote {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)
  const shipments = new Set(lines.map((l) => l.supplierId)).size
  const shipping = opts.estimateShipping ? shipments * DEMO_SHIPPING_PER_SHIPMENT : null
  const discount = opts.discount ?? 0
  // Tax stays null until a tax provider is connected; never invent a rate.
  const tax = null
  return { subtotal, shipping, tax, discount, total: subtotal + (shipping ?? 0) - discount, shipments }
}
