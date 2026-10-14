import { beforeAll, describe, expect, it } from 'vitest'
import * as checkoutRoute from '@/app/api/checkout/route'
import * as quoteRoute from '@/app/api/checkout/quote/route'
import * as productRoute from '@/app/api/products/[slug]/route'
import * as productsRoute from '@/app/api/products/route'
import * as membership from '@/app/api/account/membership/route'
import * as trackRoute from '@/app/api/orders/track/route'
import * as myOrderRoute from '@/app/api/orders/[id]/route'
import { testPayments } from '@/lib/server/integrations'
import { Product } from '@/lib/server/models/catalog'
import { Supplier } from '@/lib/server/models/network'
import { Order, Reservation } from '@/lib/server/models/orders'
import { releaseExpiredReservations } from '@/lib/server/services/commerce'
import { account, call, catalog, configureCommerce, idem, request } from './helpers'

const shipTo = { name: 'Test Customer', line1: '1 Main St', city: 'Townsville', region: 'TS', postal: '12345', country: 'United States' }

let c: Awaited<ReturnType<typeof catalog>>
beforeAll(async () => {
  c = await catalog()
  await configureCommerce({ shipping: 10, tax: 'none_confirmed' })
})

const order = (cookie: string | undefined, items: { productId: string; qty: number }[], key = idem(), email = 'buyer@example.test') =>
  call(checkoutRoute.POST, request('POST', '/api/checkout', { cookie, body: { items, email, shipTo, idempotencyKey: key } }))

describe('publication eligibility', () => {
  it('shows published listings from approved suppliers only', async () => {
    const all = await call(productsRoute.GET, request('GET', `/api/products?category=${c.categories.standard}`))
    const slugs = all.data.items.map((p: { slug: string }) => p.slug)
    expect(slugs).toContain(c.widget.slug)
    expect(slugs).not.toContain(c.hidden.slug)
    expect((await call(productRoute.GET, request('GET', `/api/products/${c.hidden.slug}`), { slug: c.hidden.slug })).status).toBe(404)
  })

  it('lets staff and the owning supplier preview an unpublished listing', async () => {
    const admin = await account('admin')
    const owner = await account('supplier', { supplierId: String(c.supplierA._id) })
    const other = await account('supplier', { supplierId: String(c.supplierB._id) })
    const get = (cookie: string) => call(productRoute.GET, request('GET', `/api/products/${c.hidden.slug}`, { cookie }), { slug: c.hidden.slug })
    expect((await get(admin.cookie)).status).toBe(200)
    expect((await get(owner.cookie)).status).toBe(200)
    expect((await get(other.cookie)).status).toBe(404)
  })

  it('hides all listings of a suspended supplier', async () => {
    await Supplier.updateOne({ _id: c.supplierB._id }, { $set: { status: 'suspended' } })
    expect((await call(productRoute.GET, request('GET', `/api/products/${c.gizmo.slug}`), { slug: c.gizmo.slug })).status).toBe(404)
    await Supplier.updateOne({ _id: c.supplierB._id }, { $set: { status: 'approved' } })
  })
})

describe('server-authoritative checkout', () => {
  it('ignores client-supplied prices and totals', async () => {
    const r = await call(quoteRoute.POST, request('POST', '/api/checkout/quote', { body: { items: [{ productId: String(c.widget._id), qty: 2, price: 0.01, total: 0.01 }] } }))
    expect(r.status).toBe(200)
    expect(r.data.subtotal).toBe(200)
    expect(r.data.shipping).toBe(10)
    expect(r.data.total).toBe(210)
  })

  it('is idempotent: retrying with the same key returns the same order and reserves stock once', async () => {
    const before = (await Product.findById(c.widget._id).lean())!.inventory!.onHand
    const key = idem()
    const first = await order(undefined, [{ productId: String(c.widget._id), qty: 1 }], key)
    const retry = await order(undefined, [{ productId: String(c.widget._id), qty: 1 }], key)
    expect(first.status).toBe(201)
    expect(retry.status).toBe(200)
    expect(retry.data.orderId).toBe(first.data.orderId)
    expect(retry.data.replayed).toBe(true)
    expect(await Order.countDocuments({ number: first.data.orderId })).toBe(1)
    expect((await Product.findById(c.widget._id).lean())!.inventory!.onHand).toBe(before - 1)
    expect(first.data.paymentStatus).toBe('captured')
    expect(first.data.guestAccessToken).toBeTruthy()
  })

  it('allows only one of two concurrent checkouts for the last unit', async () => {
    const results = await Promise.all([order(undefined, [{ productId: String(c.scarce._id), qty: 1 }]), order(undefined, [{ productId: String(c.scarce._id), qty: 1 }])])
    const codes = results.map((r) => r.status).sort()
    expect(codes).toEqual([201, 409])
    const p = (await Product.findById(c.scarce._id).lean())!
    expect(p.inventory!.onHand).toBe(0)
    expect(p.inventory!.reserved).toBe(0)
  })

  it('splits one order into supplier fulfillments with per-supplier shipping', async () => {
    const r = await order(undefined, [{ productId: String(c.widget._id), qty: 1 }, { productId: String(c.gizmo._id), qty: 1 }])
    const o = await Order.findOne({ number: r.data.orderId }).lean()
    expect(o!.fulfillments).toHaveLength(2)
    expect(o!.fulfillments.every((f) => f.shippingCents === 1_000 && f.status === 'pending')).toBe(true)
    expect(o!.totals!.totalCents).toBe(10_000 + 5_000 + 2_000)
  })

  it('releases stock explicitly when an unpaid hold expires', async () => {
    testPayments.mode = 'pending'
    const before = (await Product.findById(c.widget._id).lean())!.inventory!
    const r = await order(undefined, [{ productId: String(c.widget._id), qty: 2 }])
    testPayments.mode = 'succeed'
    expect(r.data.paymentStatus).toBe('pending')
    expect((await Product.findById(c.widget._id).lean())!.inventory!.reserved).toBe(before.reserved + 2)
    const o = await Order.findOne({ number: r.data.orderId }).lean()
    await Reservation.updateMany({ order: o!._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
    const rel = await releaseExpiredReservations()
    expect(rel.released).toBeGreaterThanOrEqual(1)
    const after = (await Product.findById(c.widget._id).lean())!.inventory!
    expect(after.reserved).toBe(before.reserved)
    expect(after.onHand).toBe(before.onHand)
    expect((await Order.findById(o!._id).lean())!.status).toBe('canceled')
    // Running again never double-releases.
    await releaseExpiredReservations()
    expect((await Product.findById(c.widget._id).lean())!.inventory!.reserved).toBe(before.reserved)
  })

  it('a declined payment places no order and frees the stock', async () => {
    testPayments.mode = 'fail'
    const before = (await Product.findById(c.widget._id).lean())!.inventory!
    const r = await order(undefined, [{ productId: String(c.widget._id), qty: 1 }])
    testPayments.mode = 'succeed'
    expect(r.status).toBe(402)
    const after = (await Product.findById(c.widget._id).lean())!.inventory!
    expect(after).toMatchObject({ onHand: before.onHand, reserved: before.reserved })
  })
})

describe('memberships', () => {
  it('activates only after a confirmed payment and discounts eligible products only', async () => {
    const cust = await account('customer')
    const q0 = await call(quoteRoute.POST, request('POST', '/api/checkout/quote', { cookie: cust.cookie, body: { items: [{ productId: String(c.widget._id), qty: 1 }] } }))
    expect(q0.data.discount).toBe(0)

    testPayments.mode = 'fail'
    const failed = await call(membership.POST, request('POST', '/api/account/membership', { cookie: cust.cookie, body: { tier: 'member_plus', idempotencyKey: idem() } }))
    testPayments.mode = 'succeed'
    expect(failed.status).toBe(402)
    const still = await call(quoteRoute.POST, request('POST', '/api/checkout/quote', { cookie: cust.cookie, body: { items: [{ productId: String(c.widget._id), qty: 1 }] } }))
    expect(still.data.membershipTier).toBeNull()

    const ok = await call(membership.POST, request('POST', '/api/account/membership', { cookie: cust.cookie, body: { tier: 'member_plus', idempotencyKey: idem() } }))
    expect(ok.status).toBe(200)
    expect(ok.data.membership.status).toBe('active')

    await Product.updateOne({ _id: c.gizmo._id }, { $set: { membershipEligible: false } })
    const q = await call(quoteRoute.POST, request('POST', '/api/checkout/quote', { cookie: cust.cookie, body: { items: [{ productId: String(c.widget._id), qty: 1 }, { productId: String(c.gizmo._id), qty: 1 }] } }))
    expect(q.data.membershipTier).toBe('member_plus')
    expect(q.data.discount).toBe(25) // 25% of widget (100) only; gizmo excluded
    expect(q.data.shipping).toBe(20) // shipping is never discounted
    await Product.updateOne({ _id: c.gizmo._id }, { $set: { membershipEligible: true } })
  })
})

describe('order access', () => {
  it('guests need the private access code; customers see only their own orders', async () => {
    const g = await order(undefined, [{ productId: String(c.widget._id), qty: 1 }])
    const noCode = await call(trackRoute.POST, request('POST', '/api/orders/track', { body: { orderId: g.data.orderId } }))
    expect(noCode.status).toBe(404)
    const wrong = await call(trackRoute.POST, request('POST', '/api/orders/track', { body: { orderId: g.data.orderId, accessCode: 'x'.repeat(32) } }))
    expect(wrong.status).toBe(404)
    const right = await call(trackRoute.POST, request('POST', '/api/orders/track', { body: { orderId: g.data.orderId, accessCode: g.data.guestAccessToken } }))
    expect(right.status).toBe(200)
    expect(right.data.id).toBe(g.data.orderId)

    const alice = await account('customer')
    const bob = await account('customer')
    const mine = await order(alice.cookie, [{ productId: String(c.widget._id), qty: 1 }])
    expect((await call(myOrderRoute.GET, request('GET', `/api/orders/${mine.data.orderId}`, { cookie: alice.cookie }), { id: mine.data.orderId })).status).toBe(200)
    expect((await call(myOrderRoute.GET, request('GET', `/api/orders/${mine.data.orderId}`, { cookie: bob.cookie }), { id: mine.data.orderId })).status).toBe(404)
  })
})

describe('missing integrations', () => {
  it('refuses checkout honestly when shipping or payments are not configured', async () => {
    await configureCommerce({ shipping: null, tax: 'none_confirmed' })
    const q = await call(quoteRoute.POST, request('POST', '/api/checkout/quote', { body: { items: [{ productId: String(c.widget._id), qty: 1 }] } }))
    expect(q.data.shipping).toBeNull()
    expect(q.data.total).toBeNull()
    expect(q.data.blockers.map((b: { code: string }) => b.code)).toContain('shipping_not_configured')
    expect((await order(undefined, [{ productId: String(c.widget._id), qty: 1 }])).status).toBe(409)
    await configureCommerce({ shipping: 10, tax: 'none_confirmed' })

    const prev = process.env.PAYMENT_PROVIDER
    delete process.env.PAYMENT_PROVIDER
    const before = await Order.countDocuments()
    const r = await order(undefined, [{ productId: String(c.widget._id), qty: 1 }])
    process.env.PAYMENT_PROVIDER = prev
    expect(r.status).toBe(503)
    expect(r.data.error.code).toBe('integration_not_configured')
    expect(await Order.countDocuments()).toBe(before)
  })
})
