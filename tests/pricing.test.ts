import { describe, expect, it } from 'vitest'
import { addTarget, canTransition, deriveOrderStatus, orderTotals, priceLine } from '@/lib/server/pricing'
import { toCsv } from '@/lib/server/services/reports'

describe('membership and seasonal pricing (cents)', () => {
  it('applies the membership percentage only to eligible products', () => {
    expect(priceLine({ listCents: 10_000, qty: 2, memberEligible: true }, 10, 'best_of')).toEqual({ unitCents: 10_000, discountCents: 2_000, seasonal: false })
    expect(priceLine({ listCents: 10_000, qty: 2, memberEligible: false }, 25, 'best_of')).toEqual({ unitCents: 10_000, discountCents: 0, seasonal: false })
  })

  it('best_of picks the lower of seasonal price and member price', () => {
    // seasonal 80.00 vs member (25%) 75.00 → member price wins, seasonal not applied
    expect(priceLine({ listCents: 10_000, seasonalCents: 8_000, qty: 1, memberEligible: true }, 25, 'best_of')).toEqual({ unitCents: 10_000, discountCents: 2_500, seasonal: false })
    // seasonal 70.00 vs member (10%) 90.00 → seasonal wins, no extra discount
    expect(priceLine({ listCents: 10_000, seasonalCents: 7_000, qty: 1, memberEligible: true }, 10, 'best_of')).toEqual({ unitCents: 7_000, discountCents: 0, seasonal: true })
  })

  it('stack applies membership on top of the seasonal price', () => {
    expect(priceLine({ listCents: 10_000, seasonalCents: 8_000, qty: 1, memberEligible: true }, 10, 'stack')).toEqual({ unitCents: 8_000, discountCents: 800, seasonal: true })
  })

  it('ignores an invalid seasonal price (not below regular)', () => {
    expect(priceLine({ listCents: 10_000, seasonalCents: 12_000, qty: 1, memberEligible: true }, 0, 'best_of').unitCents).toBe(10_000)
  })

  it('never discounts shipping or tax; missing configuration is null, not zero', () => {
    const lines = [{ unitCents: 10_000, discountCents: 1_000, seasonal: false, qty: 1, supplier: 'a' }, { unitCents: 5_000, discountCents: 0, seasonal: false, qty: 2, supplier: 'b' }]
    const t = orderTotals(lines, { mode: 'flat_per_shipment', flatCents: 1_500, freeThresholdCents: null }, { mode: 'manual_rate', rateBps: 1_000 })
    expect(t.subtotalCents).toBe(20_000)
    expect(t.shippingCents).toBe(3_000)
    expect(t.taxCents).toBe(1_900) // 10% of discounted merchandise (19,000)
    expect(t.totalCents).toBe(19_000 + 3_000 + 1_900)
    const missing = orderTotals(lines, { mode: 'not_configured', flatCents: null, freeThresholdCents: null }, { mode: 'not_configured', rateBps: null })
    expect(missing.shippingCents).toBeNull()
    expect(missing.taxCents).toBeNull()
    expect(missing.totalCents).toBeNull()
  })
})

describe('order status from mixed fulfillments', () => {
  it('derives customer-facing status', () => {
    expect(deriveOrderStatus(['shipped', 'pending'])).toBe('partially_shipped')
    expect(deriveOrderStatus(['delivered', 'canceled'])).toBe('delivered')
    expect(deriveOrderStatus(['canceled', 'canceled'])).toBe('canceled')
    expect(deriveOrderStatus(['confirmed', 'pending'])).toBe('confirmed')
    expect(deriveOrderStatus(['delivered', 'shipped'])).toBe('shipped')
    expect(deriveOrderStatus(['awaiting_payment'])).toBe('awaiting_payment')
  })
  it('allows only forward fulfillment transitions', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true)
    expect(canTransition('pending', 'shipped')).toBe(false)
    expect(canTransition('delivered', 'pending')).toBe(false)
    expect(canTransition('shipped', 'delivered')).toBe(true)
  })
})

describe('business-day targets', () => {
  it('skips weekends in the configured time zone', () => {
    const fri = new Date('2026-10-16T15:00:00Z') // Friday
    const due = addTarget(fri, 1, 'business_days', { timezone: 'UTC', businessDays: [1, 2, 3, 4, 5] })
    expect(due.toISOString()).toBe('2026-10-19T15:00:00.000Z') // Monday
    expect(addTarget(fri, 24, 'hours', { timezone: 'UTC', businessDays: [1] }).toISOString()).toBe('2026-10-17T15:00:00.000Z')
  })
})

describe('CSV export', () => {
  it('neutralises spreadsheet formulas', () => {
    const csv = toCsv([['=HYPERLINK("x")', '+1', '-cmd', '@SUM(A1)', 'safe', -5]])
    expect(csv).toBe(`"'=HYPERLINK(""x"")","'+1","'-cmd","'@SUM(A1)","safe","-5"`)
  })
})
