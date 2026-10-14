// Pure pricing rules (integer cents). No I/O, so they are unit-tested directly.
// Terms: membership discounts apply only to the base price of eligible products, never to
// shipping, taxes or duties, and are subject to supplier-specific exclusions.

import type { MembershipTier } from '@/lib/types'

export const PLANS: Record<MembershipTier, { name: string; feeCents: number; pct: number }> = {
  member: { name: 'Member', feeCents: 1000, pct: 10 },
  member_plus: { name: 'Member Plus', feeCents: 2500, pct: 25 },
}

export type Stacking = 'best_of' | 'stack'

export interface LineInput {
  listCents: number
  seasonalCents?: number | null
  qty: number
  /** Product flagged eligible and supplier not excluded. */
  memberEligible: boolean
}

export interface PricedLine {
  unitCents: number
  discountCents: number
  seasonal: boolean
}

/**
 * Price one line. Seasonal price replaces the list price while a campaign is active. Stacking with
 * the membership discount is a configurable, client-to-confirm rule:
 *  - `stack`:   membership % applies on top of the seasonal price;
 *  - `best_of`: the customer pays whichever is lower, seasonal price or membership price.
 */
export function priceLine(l: LineInput, memberPct: number, stacking: Stacking): PricedLine {
  const seasonal = l.seasonalCents != null && l.seasonalCents > 0 && l.seasonalCents < l.listCents
  const base = seasonal ? l.seasonalCents! : l.listCents
  if (!memberPct || !l.memberEligible) return { unitCents: base, discountCents: 0, seasonal }
  if (stacking === 'stack') return { unitCents: base, discountCents: Math.round((base * l.qty * memberPct) / 100), seasonal }
  const memberTotal = l.listCents * l.qty - Math.round((l.listCents * l.qty * memberPct) / 100)
  if (seasonal && base * l.qty <= memberTotal) return { unitCents: base, discountCents: 0, seasonal }
  return { unitCents: l.listCents, discountCents: Math.round((l.listCents * l.qty * memberPct) / 100), seasonal: false }
}

export interface ShippingRule {
  mode: 'not_configured' | 'flat_per_shipment'
  flatCents: number | null
  freeThresholdCents: number | null
}
export interface TaxRule {
  mode: 'not_configured' | 'manual_rate' | 'none_confirmed'
  rateBps: number | null
}

/** Order totals. `null` shipping/tax means "not configured" and must block checkout, never mean $0. */
export function orderTotals(lines: (PricedLine & { qty: number; supplier: string })[], ship: ShippingRule, tax: TaxRule) {
  const subtotalCents = lines.reduce((s, l) => s + l.unitCents * l.qty, 0)
  const discountCents = lines.reduce((s, l) => s + l.discountCents, 0)
  const merchandise = subtotalCents - discountCents
  const suppliers = [...new Set(lines.map((l) => l.supplier))]
  let shippingBySupplier: Record<string, number> | null = null
  if (ship.mode === 'flat_per_shipment' && ship.flatCents != null) {
    const free = ship.freeThresholdCents != null && merchandise >= ship.freeThresholdCents
    shippingBySupplier = Object.fromEntries(suppliers.map((s) => [s, free ? 0 : ship.flatCents!]))
  }
  const shippingCents = shippingBySupplier ? Object.values(shippingBySupplier).reduce((a, b) => a + b, 0) : null
  // Tax is charged on discounted merchandise only (shipping taxability is jurisdiction-specific and
  // is left to a tax provider).
  const taxCents = tax.mode === 'none_confirmed' ? 0 : tax.mode === 'manual_rate' && tax.rateBps != null ? Math.round((merchandise * tax.rateBps) / 10_000) : null
  const totalCents = shippingCents == null || taxCents == null ? null : merchandise + shippingCents + taxCents
  return { subtotalCents, discountCents, shippingCents, shippingBySupplier, taxCents, totalCents, shipments: suppliers.length }
}

/** Customer-facing order status derived from its supplier fulfillments (mixed states). */
export function deriveOrderStatus(statuses: string[]): string {
  const live = statuses.filter((s) => s !== 'canceled')
  if (!statuses.length) return 'pending'
  if (!live.length) return 'canceled'
  if (live.every((s) => s === 'awaiting_payment')) return 'awaiting_payment'
  if (live.every((s) => s === 'returned')) return 'returned'
  if (live.every((s) => s === 'delivered' || s === 'returned')) return 'delivered'
  const moving = live.filter((s) => s === 'shipped' || s === 'delivered' || s === 'returned').length
  if (moving === live.length) return 'shipped'
  if (moving > 0) return 'partially_shipped'
  if (live.some((s) => s === 'processing')) return 'processing'
  if (live.some((s) => s === 'confirmed')) return 'confirmed'
  return 'pending'
}

/** Allowed supplier fulfillment transitions (server timestamps are applied by the service). */
export const FULFILLMENT_FLOW: Record<string, string[]> = {
  pending: ['confirmed', 'canceled'],
  confirmed: ['processing', 'shipped', 'canceled'],
  processing: ['shipped', 'canceled'],
  shipped: ['delivered'],
  delivered: ['returned'],
  awaiting_payment: ['canceled'],
  canceled: [],
  returned: [],
}
export const canTransition = (from: string, to: string) => (FULFILLMENT_FLOW[from] ?? []).includes(to)

/**
 * Add a target duration to a start time. `business_days` skips non-working days in the configured
 * time zone (holidays are not modelled); a business-day deadline lands at the same local
 * time-of-day on the Nth following working day.
 */
export function addTarget(start: Date, amount: number, unit: 'hours' | 'business_days' | 'days', cal: { timezone: string; businessDays: number[] }) {
  if (unit === 'hours') return new Date(start.getTime() + amount * 3_600_000)
  if (unit === 'days') return new Date(start.getTime() + amount * 86_400_000)
  const dow = (d: Date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(new Intl.DateTimeFormat('en-US', { timeZone: cal.timezone, weekday: 'short' }).format(d))
  let d = new Date(start)
  let left = Math.ceil(amount)
  for (let guard = 0; left > 0 && guard < 366; guard++) {
    d = new Date(d.getTime() + 86_400_000)
    if (cal.businessDays.includes(dow(d))) left--
  }
  return d
}

export const stockStatus = (available: number, madeToOrder: boolean) => (madeToOrder ? 'made_to_order' : available <= 0 ? 'out_of_stock' : available < 10 ? 'low_stock' : 'in_stock') as 'in_stock' | 'low_stock' | 'made_to_order' | 'out_of_stock'
