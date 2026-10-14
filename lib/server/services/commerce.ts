import 'server-only'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import mongoose, { type ClientSession, type Types } from 'mongoose'
import { z } from 'zod'
import type { Actor } from '../auth'
import { db, tx } from '../db'
import { conflict, HttpError, notConfigured, notFound } from '../http'
import { payments } from '../integrations'
import { Product, type ProductDoc } from '../models/catalog'
import { Cart, Customer, Supplier } from '../models/network'
import { Case, Order, PaymentOperation, Reservation, type OrderDoc } from '../models/orders'
import { deriveOrderStatus, orderTotals, PLANS, priceLine, stockStatus } from '../pricing'
import { audit, dollars, iso, isoOpt, nextSeq } from './common'
import { promoPrices, publicScope } from './catalog'
import { notify, notifyStaff, processOutbox, sendTransactional } from './notify'
import { getSettings } from './settings'
import type { AddressSnapshot, CartLineView, CheckoutQuote, MembershipTier, Order as OrderDTO, OrderLine, SupplierFulfillment } from '@/lib/types'

export const RESERVATION_MINUTES = 15
const MAX_LINES = 50
const MAX_QTY = 99

export const zCartItems = z.array(z.object({ productId: z.string().regex(/^[a-f\d]{24}$/i), qty: z.number().int().min(1).max(MAX_QTY) })).max(MAX_LINES)
export const zAddress = z.object({
  name: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(2).max(200),
  line2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).default(''),
  postal: z.string().trim().max(20).default(''),
  country: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(30).optional().default(''),
})

// ---------------------------------------------------------------- membership

export async function activeMembership(userId: string | undefined): Promise<MembershipTier | null> {
  if (!userId) return null
  const c = await Customer.findOne({ userId }, { membership: 1 }).lean()
  const m = c?.membership
  if (!m || m.status !== 'active' || !m.tier) return null
  if (m.renewsAt && new Date(m.renewsAt).getTime() < Date.now()) return null
  return m.tier as MembershipTier
}

// ---------------------------------------------------------------- quote

type Loaded = { doc: ProductDoc; sup: { _id: Types.ObjectId; code: string; name: string; membershipExcluded?: boolean } }

async function loadPurchasable(ids: string[]) {
  const scope = await publicScope()
  const docs = await Product.find({ ...scope, _id: { $in: ids } }).lean<ProductDoc[]>()
  const sups = await Supplier.find({ _id: { $in: docs.map((d) => d.supplier) } }, 'code name membershipExcluded').lean()
  const supById = new Map(sups.map((s) => [String(s._id), s]))
  return new Map(docs.map((d) => [String(d._id), { doc: d, sup: supById.get(String(d.supplier))! } as Loaded]))
}

/**
 * Server-authoritative quote. The client sends only product ids and quantities; prices, seasonal
 * prices, membership discounts, shipping and tax all come from the database and settings.
 */
export async function quote(items: z.infer<typeof zCartItems>, actor: Actor | null): Promise<CheckoutQuote & { _priced: PricedForOrder[]; _totals: ReturnType<typeof orderTotals> }> {
  await db()
  const merged = new Map<string, number>()
  for (const i of items) merged.set(i.productId, Math.min(MAX_QTY, (merged.get(i.productId) ?? 0) + i.qty))
  const [loaded, settings, promo, tier] = await Promise.all([loadPurchasable([...merged.keys()]), getSettings(), promoPrices(), activeMembership(actor?.role === 'customer' ? actor.id : undefined)])
  const pct = tier ? PLANS[tier].pct : 0
  const lines: CartLineView[] = []
  const priced: PricedForOrder[] = []
  const blockers: CheckoutQuote['blockers'] = []
  for (const [productId, qty] of merged) {
    const l = loaded.get(productId)
    if (!l) {
      lines.push({ productId, slug: '', name: 'Unavailable item', brand: '', qty, unitPrice: 0, listPrice: 0, seasonal: false, stock: 'out_of_stock', available: 0, supplierId: '', problem: 'This product is no longer available.' })
      blockers.push({ code: 'unavailable', message: 'Remove unavailable items to continue.' })
      continue
    }
    const { doc, sup } = l
    const available = Math.max(0, (doc.inventory?.onHand ?? 0) - (doc.inventory?.reserved ?? 0))
    const p = priceLine({ listCents: doc.priceCents, seasonalCents: promo.get(productId), qty, memberEligible: doc.membershipEligible !== false && !sup.membershipExcluded }, pct, settings.discounts.stacking)
    const short = !doc.madeToOrder && available < qty
    lines.push({
      productId,
      slug: doc.slug,
      name: doc.name,
      brand: doc.brand ?? '',
      image: doc.images?.[0] ? { src: doc.images[0].src ?? '', alt: doc.images[0].alt ?? '' } : undefined,
      qty,
      unitPrice: dollars(p.unitCents),
      listPrice: dollars(doc.priceCents),
      seasonal: p.seasonal,
      stock: stockStatus(available, !!doc.madeToOrder),
      available,
      supplierId: sup.code,
      supplierName: sup.name,
      problem: short ? (available ? `Only ${available} available.` : 'Out of stock.') : undefined,
    })
    if (short) blockers.push({ code: 'insufficient_stock', message: `${doc.name}: only ${available} available.` })
    priced.push({ ...p, qty, doc, sup })
  }
  const totals = orderTotals(
    priced.map((p) => ({ ...p, supplier: String(p.sup._id) })),
    { mode: settings.shipping.mode, flatCents: settings.shipping.flatRate == null ? null : Math.round(settings.shipping.flatRate * 100), freeThresholdCents: settings.shipping.freeThreshold == null ? null : Math.round(settings.shipping.freeThreshold * 100) },
    { mode: settings.tax.mode, rateBps: settings.tax.ratePercent == null ? null : Math.round(settings.tax.ratePercent * 100) },
  )
  if (!merged.size) blockers.push({ code: 'empty', message: 'Your cart is empty.' })
  if (totals.shippingCents == null) blockers.push({ code: 'shipping_not_configured', message: 'Shipping rates have not been configured yet, so orders cannot be placed.' })
  if (totals.taxCents == null) blockers.push({ code: 'tax_not_configured', message: 'Tax handling has not been configured yet, so orders cannot be placed.' })
  if (!payments()) blockers.push({ code: 'payments_not_configured', message: 'Online payment is not available yet. No order can be placed until a payment provider is connected.' })
  return {
    lines,
    subtotal: dollars(totals.subtotalCents),
    discount: dollars(totals.discountCents),
    shipping: totals.shippingCents == null ? null : dollars(totals.shippingCents),
    tax: totals.taxCents == null ? null : dollars(totals.taxCents),
    total: totals.totalCents == null ? null : dollars(totals.totalCents),
    shipments: totals.shipments,
    membershipTier: tier,
    blockers,
    _priced: priced,
    _totals: totals,
  }
}
type PricedForOrder = ReturnType<typeof priceLine> & { qty: number } & Loaded

export const publicQuote = async (items: z.infer<typeof zCartItems>, actor: Actor | null): Promise<CheckoutQuote> => {
  const { _priced, _totals, ...q } = await quote(items, actor)
  void _priced
  void _totals
  return q
}

// ---------------------------------------------------------------- cart (signed-in customers)

export async function getCartItems(userId: string) {
  await db()
  const c = await Cart.findOne({ userId }).lean()
  return (c?.items ?? []).map((i) => ({ productId: String(i.product), qty: i.qty ?? 1 }))
}

export async function setCart(userId: string, items: z.infer<typeof zCartItems>) {
  await db()
  const loaded = await loadPurchasable(items.map((i) => i.productId))
  const valid = items.filter((i) => loaded.has(i.productId))
  await Cart.updateOne({ userId }, { $set: { items: valid.map((i) => ({ product: i.productId, qty: i.qty })) } }, { upsert: true })
  return valid
}

/** Merge a guest (browser) cart into the signed-in cart. Quantities add, clamped to availability. */
export async function mergeCart(userId: string, guest: z.infer<typeof zCartItems>) {
  const current = await getCartItems(userId)
  const merged = new Map(current.map((i) => [i.productId, i.qty]))
  const loaded = await loadPurchasable([...new Set([...merged.keys(), ...guest.map((g) => g.productId)])])
  for (const g of guest) merged.set(g.productId, (merged.get(g.productId) ?? 0) + g.qty)
  const items = [...merged]
    .filter(([id]) => loaded.has(id))
    .map(([productId, qty]) => {
      const d = loaded.get(productId)!.doc
      const avail = d.madeToOrder ? MAX_QTY : Math.max(0, (d.inventory?.onHand ?? 0) - (d.inventory?.reserved ?? 0))
      return { productId, qty: Math.min(qty, MAX_QTY, Math.max(avail, 1)) }
    })
  return setCart(userId, items)
}

// ---------------------------------------------------------------- checkout

export const zCheckout = z.object({
  items: zCartItems.min(1),
  email: z.email().max(200),
  shipTo: zAddress,
  billTo: zAddress.optional(),
  idempotencyKey: z.string().min(16).max(80).regex(/^[\w-]+$/),
  saveAddress: z.boolean().optional(),
})

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
const letters = (i: number) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '')

export interface CheckoutResult {
  orderId: string
  status: string
  paymentStatus: string
  total: number
  guestAccessToken?: string
  replayed?: boolean
}

export async function checkout(input: z.infer<typeof zCheckout>, actor: Actor | null): Promise<CheckoutResult> {
  if (actor && actor.role !== 'customer') throw new HttpError(403, 'forbidden', 'Staff and supplier accounts cannot place customer orders.')
  await db()
  const owner = actor ? `u:${actor.id}` : `g:${input.email.toLowerCase()}`
  const key = sha256(`${owner}:${input.idempotencyKey}`)

  const existing = await Order.findOne({ idempotencyKey: key }).lean()
  if (existing) return { orderId: existing.number, status: existing.status, paymentStatus: existing.paymentStatus, total: dollars(existing.totals?.totalCents), replayed: true }

  await releaseExpiredReservations()
  const q = await quote(input.items, actor)
  if (q.blockers.some((b) => b.code === 'payments_not_configured')) throw notConfigured('payments', q.blockers.find((b) => b.code === 'payments_not_configured')!.message)
  if (q.blockers.length) throw conflict('Your order cannot be placed yet.', q.blockers)
  const adapter = payments()!
  const totals = q._totals

  const guestToken = actor ? undefined : randomBytes(24).toString('base64url')
  let orderId: Types.ObjectId
  try {
    orderId = await tx(async (session) => {
      const number = `PS-${await nextSeq('order', 240200, session)}`
      const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000)
      const _id = new mongoose.Types.ObjectId()
      const reservations: { order: Types.ObjectId; product: Types.ObjectId; qty: number; expiresAt: Date }[] = []
      for (const l of q._priced) {
        if (l.doc.madeToOrder) continue
        // Conditional reservation: succeeds only while available stock covers the quantity.
        const r = await Product.updateOne(
          { _id: l.doc._id, $expr: { $gte: [{ $subtract: ['$inventory.onHand', '$inventory.reserved'] }, l.qty] } },
          { $inc: { 'inventory.reserved': l.qty } },
          { session },
        )
        if (r.modifiedCount !== 1) throw conflict(`${l.doc.name} just sold out or has fewer units available.`, [{ code: 'insufficient_stock', productId: String(l.doc._id) }])
        reservations.push({ order: _id, product: l.doc._id, qty: l.qty, expiresAt })
      }
      if (reservations.length) await Reservation.insertMany(reservations, { session })

      const bySupplier = new Map<string, PricedForOrder[]>()
      for (const l of q._priced) bySupplier.set(String(l.sup._id), [...(bySupplier.get(String(l.sup._id)) ?? []), l])
      const settings = await getSettings()
      const now = new Date()
      const fulfillments = [...bySupplier.entries()].map(([supId, ls], i) => ({
        fid: `${number}-${letters(i)}`,
        supplier: supId,
        supplierName: ls[0].sup.name,
        status: 'awaiting_payment',
        shippingCents: totals.shippingBySupplier?.[supId] ?? 0,
        blindShip: settings.shipping.packaging === 'blind',
        estimatedDelivery: new Date(now.getTime() + (Math.max(...ls.map((l) => l.doc.handlingDays ?? 2)) + 5) * 86_400_000),
        lines: ls.map((l, j) => ({
          lineId: `${number}-${letters(i)}${j + 1}`,
          product: l.doc._id,
          slug: l.doc.slug,
          sku: l.doc.sku,
          name: l.doc.name,
          brand: l.doc.brand,
          image: l.doc.images?.[0]?.src,
          qty: l.qty,
          listPriceCents: l.doc.priceCents,
          unitPriceCents: l.unitCents,
          discountCents: l.discountCents,
          seasonal: l.seasonal,
        })),
        history: [{ status: 'awaiting_payment', at: now, note: 'Order placed; awaiting payment confirmation.' }],
      }))
      await Order.create(
        [
          {
            _id,
            number,
            customerUserId: actor?.id,
            email: input.email.toLowerCase(),
            guestAccessHash: guestToken ? sha256(guestToken) : undefined,
            placedAt: now,
            status: 'awaiting_payment',
            paymentStatus: 'pending',
            fulfillments,
            totals: { subtotalCents: totals.subtotalCents, discountCents: totals.discountCents, shippingCents: totals.shippingCents, taxCents: totals.taxCents, totalCents: totals.totalCents },
            pricing: { membershipTier: q.membershipTier ?? undefined, discountStacking: settings.discounts.stacking, taxMode: settings.tax.mode, taxRateBps: settings.tax.ratePercent == null ? undefined : Math.round(settings.tax.ratePercent * 100), shippingMode: settings.shipping.mode },
            shipTo: input.shipTo,
            billTo: input.billTo ?? input.shipTo,
            payment: { provider: adapter.name },
            idempotencyKey: key,
            reservationExpiresAt: expiresAt,
            history: [{ status: 'awaiting_payment', at: now, note: 'Order created.' }],
          },
        ],
        { session },
      )
      return _id
    })
  } catch (e) {
    // A concurrent retry with the same key won the race: return its order.
    if ((e as { code?: number }).code === 11000) {
      const o = await Order.findOne({ idempotencyKey: key }).lean()
      if (o) return { orderId: o.number, status: o.status, paymentStatus: o.paymentStatus, total: dollars(o.totals?.totalCents), replayed: true }
    }
    throw e
  }

  if (actor && input.saveAddress) await saveAddressIfNew(actor.id, input.shipTo)

  // Provider call happens outside any transaction; its outcome is applied with idempotent writes.
  const order = (await Order.findById(orderId).lean())!
  const opKey = `charge:${order._id}`
  await PaymentOperation.updateOne({ idempotencyKey: opKey }, { $setOnInsert: { order: order._id, kind: 'authorize', amountCents: order.totals!.totalCents, provider: adapter.name, status: 'pending' } }, { upsert: true })
  const r = await adapter.charge({ amountCents: order.totals!.totalCents!, currency: 'USD', idempotencyKey: opKey, description: `Price-Select order ${order.number}` })
  await applyChargeResult(order._id, r)
  const after = (await Order.findById(orderId).lean())!
  if (after.paymentStatus === 'failed') throw new HttpError(402, 'payment_failed', r.error ?? 'Payment was declined. No order was placed.', { orderId: after.number })
  if (actor && (after.paymentStatus === 'captured' || after.paymentStatus === 'authorized')) await Cart.updateOne({ userId: actor.id }, { $set: { items: [] } })
  return { orderId: after.number, status: after.status, paymentStatus: after.paymentStatus, total: dollars(after.totals?.totalCents), guestAccessToken: guestToken }
}

async function saveAddressIfNew(userId: string, a: AddressSnapshot) {
  const c = await Customer.findOne({ userId })
  const same = c?.addresses.some((x) => x.line1 === a.line1 && x.postal === a.postal && x.city === a.city)
  if (same) return
  await Customer.updateOne({ userId }, { $push: { addresses: { ...a, isDefault: !c?.addresses.length } } }, { upsert: true })
}

/**
 * Apply a payment provider outcome. Monotonic: only an order still `pending` can move to paid or
 * failed, so duplicate webhooks/retries are no-ops.
 */
export async function applyChargeResult(orderId: Types.ObjectId, r: { status: string; providerRef?: string; error?: string }) {
  const opKey = `charge:${orderId}`
  if (r.status === 'pending') {
    await PaymentOperation.updateOne({ idempotencyKey: opKey }, { $set: { providerRef: r.providerRef } })
    await Order.updateOne({ _id: orderId }, { $set: { 'payment.providerRef': r.providerRef } })
    return
  }
  if (r.status === 'failed') {
    await PaymentOperation.updateOne({ idempotencyKey: opKey, status: 'pending' }, { $set: { status: 'failed', error: r.error?.slice(0, 300) } })
    await tx(async (session) => {
      const o = await Order.findOneAndUpdate(
        { _id: orderId, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'failed', status: 'canceled', canceledAt: new Date(), cancelReason: 'Payment failed', 'fulfillments.$[].status': 'canceled' }, $push: { history: { status: 'canceled', note: 'Payment failed.' } } },
        { session, returnDocument: 'after' },
      )
      if (o) await releaseFor(orderId, session)
    })
    return
  }
  const paidStatus = r.status === 'captured' ? 'captured' : 'authorized'
  const confirmed = await tx(async (session) => {
    const o = await Order.findOneAndUpdate({ _id: orderId, paymentStatus: 'pending' }, { $set: { paymentStatus: paidStatus, 'payment.providerRef': r.providerRef } }, { session, returnDocument: 'after' })
    if (!o) return null
    await PaymentOperation.updateOne({ idempotencyKey: opKey }, { $set: { status: 'succeeded', providerRef: r.providerRef } }, { session })
    const amt = o.totals!.totalCents!
    o.payment!.authorizedCents = amt
    if (paidStatus === 'captured') o.payment!.capturedCents = amt
    // Commit reservations: reserved stock becomes sold stock.
    const res = await Reservation.find({ order: orderId }).session(session)
    for (const rv of res) {
      if (rv.status === 'active') {
        await Product.updateOne({ _id: rv.product }, { $inc: { 'inventory.onHand': -rv.qty, 'inventory.reserved': -rv.qty } }, { session })
      } else if (rv.status === 'released') {
        // Payment confirmed after the hold lapsed: take stock if still available, else flag for staff.
        const ok = await Product.updateOne({ _id: rv.product, $expr: { $gte: [{ $subtract: ['$inventory.onHand', '$inventory.reserved'] }, rv.qty] } }, { $inc: { 'inventory.onHand': -rv.qty } }, { session })
        if (ok.modifiedCount !== 1) o.history.push({ status: o.status, at: new Date(), note: 'Stock hold expired before payment confirmation; availability needs staff review.' })
      }
      rv.status = 'committed'
      await rv.save({ session })
    }
    const now = new Date()
    for (const f of o.fulfillments) {
      f.status = 'pending'
      f.history.push({ status: 'pending', at: now, note: 'Payment confirmed. Routed to supplier for acknowledgment.' })
    }
    o.status = deriveOrderStatus(o.fulfillments.map((f) => f.status))
    o.history.push({ status: o.status, at: now, note: `Payment ${paidStatus}.` })
    await o.save({ session })
    for (const f of o.fulfillments) await notify({ supplier: f.supplier }, { event: 'supplier_ack', title: `New fulfillment ${f.fid}`, body: `${f.lines.length} item(s) routed to you. Please acknowledge.`, href: '/supplier/orders' }, session)
    if (o.customerUserId) await notify({ userId: o.customerUserId }, { event: 'order_confirmed', title: `Order ${o.number} confirmed`, body: 'We will update you as each item ships.', href: `/account/orders/${o.number}` }, session)
    await sendTransactional({ template: 'order-confirmation', to: o.email, key: `order-confirmation:${o.number}`, payload: confirmationPayload(o) }, session)
    return o
  })
  if (confirmed) await processOutbox().catch(() => undefined)
}

function confirmationPayload(o: OrderDoc) {
  const lines = o.fulfillments.flatMap((f) => f.lines.map((l) => ({ name: l.name ?? '', qty: l.qty, unitPrice: dollars(l.unitPriceCents) })))
  return {
    name: o.shipTo?.name ?? '',
    orderId: o.number,
    placedAt: iso(o.placedAt),
    lines,
    suppliers: o.fulfillments.length,
    subtotal: dollars(o.totals?.subtotalCents),
    discount: dollars(o.totals?.discountCents),
    shipping: dollars(o.totals?.shippingCents),
    tax: dollars(o.totals?.taxCents),
    total: dollars(o.totals?.totalCents),
    shipTo: { name: o.shipTo?.name ?? '', city: o.shipTo?.city ?? '', region: o.shipTo?.region ?? '' },
  }
}

async function releaseFor(orderId: Types.ObjectId, session: ClientSession) {
  const res = await Reservation.find({ order: orderId, status: 'active' }).session(session)
  for (const rv of res) {
    const r = await Reservation.updateOne({ _id: rv._id, status: 'active' }, { $set: { status: 'released' } }, { session })
    if (r.modifiedCount === 1) await Product.updateOne({ _id: rv.product }, { $inc: { 'inventory.reserved': -rv.qty } }, { session })
  }
}

/**
 * Release stock held by unpaid orders whose hold expired. Explicit (not TTL) so `reserved` is
 * decremented exactly once per reservation. Safe to run concurrently.
 */
export async function releaseExpiredReservations(limit = 200) {
  await db()
  const due = await Reservation.find({ status: 'active', expiresAt: { $lte: new Date() } }).limit(limit).lean()
  let released = 0
  for (const rv of due) {
    await tx(async (session) => {
      const r = await Reservation.updateOne({ _id: rv._id, status: 'active' }, { $set: { status: 'released' } }, { session })
      if (r.modifiedCount !== 1) return
      await Product.updateOne({ _id: rv.product }, { $inc: { 'inventory.reserved': -rv.qty } }, { session })
      released++
      await Order.updateOne(
        { _id: rv.order, paymentStatus: 'pending' },
        { $set: { status: 'canceled', canceledAt: new Date(), cancelReason: 'Payment not completed in time', 'fulfillments.$[].status': 'canceled' }, $push: { history: { status: 'canceled', note: 'Stock hold expired before payment was confirmed.' } } },
        { session },
      )
    })
  }
  return { released }
}

// ---------------------------------------------------------------- order DTOs

export async function returnedQtyByLine(orderId: Types.ObjectId) {
  const cases = await Case.find({ order: orderId, kind: 'return', status: { $ne: 'declined' } }, { lines: 1 }).lean()
  const m = new Map<string, number>()
  for (const c of cases) for (const l of c.lines ?? []) if (l.lineId) m.set(l.lineId, (m.get(l.lineId) ?? 0) + (l.qty ?? 0))
  return m
}

const addr = (a: OrderDoc['shipTo'] | undefined | null): AddressSnapshot => ({ name: a?.name ?? '', line1: a?.line1 ?? '', line2: a?.line2 ?? '', city: a?.city ?? '', region: a?.region ?? '', postal: a?.postal ?? '', country: a?.country ?? '', phone: a?.phone ?? '' })

const lineDTO = (l: OrderDoc['fulfillments'][number]['lines'][number], returned?: Map<string, number>): OrderLine => ({
  lineId: l.lineId,
  productSlug: l.slug ?? '',
  sku: l.sku ?? undefined,
  name: l.name ?? '',
  image: l.image ?? undefined,
  qty: l.qty,
  unitPrice: dollars(l.unitPriceCents),
  listPrice: dollars(l.listPriceCents),
  discount: dollars(l.discountCents),
  returnedQty: returned?.get(l.lineId) ?? 0,
})

export async function toOrderDTO(o: OrderDoc, customerName?: string): Promise<OrderDTO> {
  const sups = await Supplier.find({ _id: { $in: o.fulfillments.map((f) => f.supplier) } }, 'code name').lean()
  const code = new Map(sups.map((s) => [String(s._id), s]))
  const returned = await returnedQtyByLine(o._id)
  const refunded = o.payment?.refundedCents ?? 0
  const paid = o.payment?.capturedCents ?? 0
  return {
    id: o.number,
    customerId: o.customerUserId ?? 'guest',
    customerName: customerName ?? o.shipTo?.name ?? undefined,
    email: o.email,
    placedAt: iso(o.placedAt),
    status: o.status as OrderDTO['status'],
    fulfillments: o.fulfillments.map((f) => ({
      id: f.fid,
      supplierId: code.get(String(f.supplier))?.code ?? '',
      supplierName: f.supplierName ?? code.get(String(f.supplier))?.name,
      status: f.status as OrderDTO['fulfillments'][number]['status'],
      lines: f.lines.map((l) => lineDTO(l, returned)),
      carrier: f.carrier ?? undefined,
      tracking: f.tracking ?? undefined,
      shippingCost: dollars(f.shippingCents),
      estimatedDelivery: iso(f.estimatedDelivery),
      history: f.history.map((h) => ({ status: h.status as OrderDTO['fulfillments'][number]['status'], at: iso(h.at), note: h.note ?? '' })),
      blindShip: f.blindShip !== false,
      acknowledgedAt: isoOpt(f.acknowledgedAt),
    })),
    subtotal: dollars(o.totals?.subtotalCents),
    shipping: dollars(o.totals?.shippingCents),
    tax: dollars(o.totals?.taxCents),
    discount: dollars(o.totals?.discountCents),
    total: dollars(o.totals?.totalCents),
    payment: o.paymentStatus as OrderDTO['payment'],
    refunded: dollars(refunded),
    refundable: dollars(Math.max(0, paid - refunded - (o.payment?.pendingRefundCents ?? 0))),
    shipTo: addr(o.shipTo),
    billTo: addr(o.billTo),
  }
}

/** Supplier view: only its own fulfillment plus the delivery address needed to ship it. */
export function toSupplierFulfillment(o: OrderDoc, supplierId: string, supplierCode: string): SupplierFulfillment | null {
  const f = o.fulfillments.find((x) => String(x.supplier) === supplierId)
  if (!f) return null
  return {
    orderId: o.number,
    placedAt: iso(o.placedAt),
    shipTo: addr(o.shipTo),
    fulfillment: {
      id: f.fid,
      supplierId: supplierCode,
      supplierName: f.supplierName ?? undefined,
      status: f.status as SupplierFulfillment['fulfillment']['status'],
      lines: f.lines.map((l) => lineDTO(l)),
      carrier: f.carrier ?? undefined,
      tracking: f.tracking ?? undefined,
      shippingCost: dollars(f.shippingCents),
      estimatedDelivery: iso(f.estimatedDelivery),
      history: f.history.map((h) => ({ status: h.status as SupplierFulfillment['fulfillment']['status'], at: iso(h.at), note: h.note ?? '' })),
      blindShip: f.blindShip !== false,
      acknowledgedAt: isoOpt(f.acknowledgedAt),
    },
  }
}

// ---------------------------------------------------------------- customer reads

export async function myOrders(actor: Actor) {
  await db()
  const os = await Order.find({ customerUserId: actor.id }).sort({ placedAt: -1 }).limit(100).lean<OrderDoc[]>()
  return Promise.all(os.map((o) => toOrderDTO(o, actor.name)))
}

export async function myOrder(actor: Actor, number: string) {
  await db()
  const o = await Order.findOne({ number, customerUserId: actor.id }).lean<OrderDoc>()
  if (!o) throw notFound('Order')
  return toOrderDTO(o, actor.name)
}

/**
 * Guest tracking: order number + the private access token issued at checkout. Wrong numbers and
 * wrong tokens are indistinguishable.
 */
export async function guestOrder(number: string, token: string) {
  await db()
  const o = await Order.findOne({ number, customerUserId: { $exists: false } }).select('+guestAccessHash').lean<OrderDoc & { guestAccessHash?: string }>()
  const want = Buffer.from(o?.guestAccessHash ?? '0'.repeat(64), 'hex')
  const got = Buffer.from(sha256(token), 'hex')
  if (!o || !o.guestAccessHash || want.length !== got.length || !timingSafeEqual(want, got)) throw notFound('Order')
  return toOrderDTO(o)
}

export async function auditOrder(actor: Actor, o: { _id: Types.ObjectId; number: string }, action: string, summary: string, changes?: unknown) {
  await audit(actor, action, { type: 'order', id: o.number }, summary, changes)
}

export async function notifyStaffDelayed(o: OrderDoc, reason: string) {
  await notifyStaff({ event: 'order_delayed', title: `Order ${o.number} needs attention`, body: reason, href: `/admin/orders/${o.number}` })
}
