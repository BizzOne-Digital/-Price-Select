import 'server-only'
import type { Types } from 'mongoose'
import { z } from 'zod'
import { assertCan, type Actor } from '../auth'
import { db, tx } from '../db'
import { badRequest, conflict, HttpError, notConfigured, notFound } from '../http'
import { payments } from '../integrations'
import { Product } from '../models/catalog'
import { Supplier } from '../models/network'
import { Order, PaymentOperation, Reservation, type OrderDoc } from '../models/orders'
import { canTransition, deriveOrderStatus } from '../pricing'
import { audit, dollars, invalidate, page, TAGS } from './common'
import { toOrderDTO, toSupplierFulfillment } from './commerce'
import { notify, processOutbox, sendTransactional } from './notify'
import { namesFor } from './users'
import type { Order as OrderDTO, SupplierFulfillment } from '@/lib/types'

// ---------------------------------------------------------------- staff order views

export async function listOrders(actor: Actor, opts: { status?: string; q?: string; page?: number; pageSize?: number; from?: Date; to?: Date } = {}) {
  assertCan(actor, 'admin:orders')
  await db()
  const filter: Record<string, unknown> = {}
  if (opts.status && opts.status !== 'all') filter.status = opts.status
  if (opts.q) filter.number = opts.q.trim().toUpperCase()
  if (opts.from || opts.to) filter.placedAt = { ...(opts.from ? { $gte: opts.from } : {}), ...(opts.to ? { $lte: opts.to } : {}) }
  const pg = page(opts.page, opts.pageSize ?? 50, 200)
  const [docs, total, counts] = await Promise.all([
    Order.find(filter).sort({ placedAt: -1 }).skip(pg.skip).limit(pg.limit).lean<OrderDoc[]>(),
    Order.countDocuments(filter),
    Order.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ])
  const names = await namesFor(docs.map((d) => d.customerUserId))
  return { items: await Promise.all(docs.map((d) => toOrderDTO(d, d.customerUserId ? names.get(d.customerUserId) : undefined))), total, counts: Object.fromEntries(counts.map((c) => [c._id, c.n])), page: pg.page, pageSize: pg.pageSize }
}

export async function getOrderAdmin(actor: Actor, number: string) {
  assertCan(actor, 'admin:orders')
  await db()
  const o = await Order.findOne({ number }).lean<OrderDoc>()
  if (!o) throw notFound('Order')
  const names = await namesFor([o.customerUserId])
  const ops = await PaymentOperation.find({ order: o._id }).sort({ createdAt: -1 }).lean()
  return {
    order: await toOrderDTO(o, o.customerUserId ? names.get(o.customerUserId) : undefined),
    history: o.history.map((h) => ({ status: h.status ?? '', at: new Date(h.at!).toISOString(), note: h.note ?? '' })),
    paymentOperations: ops.map((p) => ({ id: String(p._id), kind: p.kind, amount: dollars(p.amountCents), status: p.status, reason: p.reason ?? undefined, by: p.byName ?? undefined, at: new Date((p as { createdAt?: Date }).createdAt!).toISOString(), error: p.error ?? undefined })),
  }
}

// ---------------------------------------------------------------- cancellation

/**
 * Cancel an order before anything has shipped. Unpaid holds are released; committed stock is
 * restored. An authorized payment is voided through the provider (voids are not refunds). A
 * captured payment stays captured and must be refunded explicitly by an administrator.
 */
export async function cancelOrder(actor: Actor, number: string, reason: string) {
  assertCan(actor, 'admin:orders')
  await db()
  const o = await Order.findOne({ number }).lean<OrderDoc>()
  if (!o) throw notFound('Order')
  if (o.status === 'canceled') throw conflict('This order is already canceled.')
  if (o.fulfillments.some((f) => ['shipped', 'delivered', 'returned'].includes(f.status))) throw conflict('Part of this order has shipped. Cancel individual items through a return or cancellation case instead.')
  if (o.paymentStatus === 'authorized') {
    assertCan(actor, 'admin:payments')
    const adapter = payments()
    if (!adapter) throw notConfigured('payments', 'The payment provider is not configured, so the authorization cannot be voided.')
    const key = `void:${o._id}`
    await PaymentOperation.updateOne({ idempotencyKey: key }, { $setOnInsert: { order: o._id, kind: 'void', amountCents: o.payment?.authorizedCents ?? 0, provider: adapter.name, by: actor.id, byName: actor.name, reason } }, { upsert: true })
    const r = await adapter.void({ providerRef: o.payment?.providerRef ?? '', idempotencyKey: key })
    await PaymentOperation.updateOne({ idempotencyKey: key }, { $set: { status: r.status === 'succeeded' ? 'succeeded' : r.status, error: r.error } })
    if (r.status !== 'succeeded') throw new HttpError(502, 'payment_failed', r.error ?? 'The authorization could not be voided. The order was not canceled.')
  }
  await tx(async (session) => {
    const doc = await Order.findOne({ _id: o._id }).session(session)
    if (!doc || doc.status === 'canceled') return
    const now = new Date()
    for (const f of doc.fulfillments) {
      if (f.status === 'canceled') continue
      const wasCommitted = !['awaiting_payment'].includes(f.status)
      f.status = 'canceled'
      f.history.push({ status: 'canceled', at: now, note: `Canceled by staff: ${reason}`, by: actor.name })
      if (wasCommitted) for (const l of f.lines) if (l.product) await Product.updateOne({ _id: l.product, madeToOrder: { $ne: true } }, { $inc: { 'inventory.onHand': l.qty } }, { session })
    }
    const active = await Reservation.find({ order: doc._id, status: 'active' }).session(session)
    for (const rv of active) {
      rv.status = 'released'
      await rv.save({ session })
      await Product.updateOne({ _id: rv.product }, { $inc: { 'inventory.reserved': -rv.qty } }, { session })
    }
    if (doc.paymentStatus === 'authorized') doc.paymentStatus = 'voided'
    doc.status = 'canceled'
    doc.canceledAt = now
    doc.cancelReason = reason
    doc.history.push({ status: 'canceled', at: now, note: reason, by: actor.name })
    await doc.save({ session })
    for (const f of doc.fulfillments) await notify({ supplier: f.supplier }, { event: 'order_canceled', title: `${f.fid} canceled`, body: 'Stop fulfillment for this item.', href: '/supplier/orders' }, session)
    if (doc.customerUserId) await notify({ userId: doc.customerUserId }, { event: 'order_canceled', title: `Order ${doc.number} canceled`, body: reason, href: `/account/orders/${doc.number}` }, session)
    await sendTransactional({ template: 'notice', to: doc.email, key: `order-canceled:${doc.number}`, payload: { title: `Order ${doc.number} canceled`, body: doc.paymentStatus === 'captured' ? 'Your order was canceled. Any refund due will be confirmed separately once processed.' : 'Your order was canceled. No payment was taken.' } }, session)
    await audit(actor, 'order.cancel', { type: 'order', id: doc.number }, `Canceled ${doc.number}: ${reason}`, undefined, session)
  })
  await processOutbox().catch(() => undefined)
  invalidate(TAGS.catalog)
  return getOrderAdmin(actor, number)
}

// ---------------------------------------------------------------- refunds

export const zRefund = z.object({ amount: z.number().positive().max(1_000_000), reason: z.string().trim().min(3).max(300), idempotencyKey: z.string().min(16).max(80).regex(/^[\w-]+$/) })

/**
 * Partial or full refund of captured funds. The refundable balance is reserved atomically before
 * the provider call, so concurrent refunds can never exceed what was captured.
 */
export async function refundOrder(actor: Actor, number: string, input: z.infer<typeof zRefund>, caseId?: Types.ObjectId) {
  assertCan(actor, 'admin:payments')
  const adapter = payments()
  if (!adapter) throw notConfigured('payments', 'The payment provider is not configured. No refund was issued.')
  await db()
  const amountCents = Math.round(input.amount * 100)
  const key = `refund:${number}:${input.idempotencyKey}`
  const prior = await PaymentOperation.findOne({ idempotencyKey: key }).lean()
  if (prior) return { operationId: String(prior._id), status: prior.status, amount: dollars(prior.amountCents) }

  const o = await Order.findOneAndUpdate(
    {
      number,
      paymentStatus: { $in: ['captured', 'partially_refunded'] },
      $expr: { $gte: [{ $subtract: ['$payment.capturedCents', { $add: [{ $ifNull: ['$payment.refundedCents', 0] }, { $ifNull: ['$payment.pendingRefundCents', 0] }] }] }, amountCents] },
    },
    { $inc: { 'payment.pendingRefundCents': amountCents } },
    { returnDocument: 'after' },
  )
  if (!o) {
    const exists = await Order.exists({ number })
    if (!exists) throw notFound('Order')
    throw conflict('Refund amount exceeds the remaining refundable balance, or the payment has not been captured.')
  }
  let op
  try {
    op = await PaymentOperation.create({ order: o._id, kind: 'refund', amountCents, provider: adapter.name, idempotencyKey: key, by: actor.id, byName: actor.name, reason: input.reason, case: caseId })
  } catch (e) {
    await Order.updateOne({ _id: o._id }, { $inc: { 'payment.pendingRefundCents': -amountCents } })
    throw e
  }
  const r = await adapter.refund({ providerRef: o.payment?.providerRef ?? '', amountCents, idempotencyKey: key })
  await applyRefundResult(op._id, r)
  await audit(actor, 'payment.refund', { type: 'order', id: number }, `Refund of $${input.amount.toFixed(2)} ${r.status}: ${input.reason}`)
  const after = await PaymentOperation.findById(op._id).lean()
  return { operationId: String(op._id), status: after!.status, amount: dollars(amountCents), error: after!.error ?? undefined }
}

/** Apply a refund outcome exactly once (also the entry point for a future refund webhook). */
export async function applyRefundResult(opId: Types.ObjectId, r: { status: string; providerRef?: string; error?: string }) {
  if (r.status === 'pending') return
  const op = await PaymentOperation.findOneAndUpdate({ _id: opId, status: 'pending' }, { $set: { status: r.status === 'succeeded' ? 'succeeded' : 'failed', providerRef: r.providerRef, error: r.error?.slice(0, 300) } }, { returnDocument: 'after' })
  if (!op) return
  const amt = op.amountCents
  if (op.status === 'succeeded') {
    const o = await Order.findOneAndUpdate({ _id: op.order }, { $inc: { 'payment.refundedCents': amt, 'payment.pendingRefundCents': -amt } }, { returnDocument: 'after' })
    if (o) {
      const full = (o.payment!.refundedCents ?? 0) >= (o.payment!.capturedCents ?? 0)
      await Order.updateOne({ _id: o._id }, { $set: { paymentStatus: full ? 'refunded' : 'partially_refunded' } })
      if (o.customerUserId) await notify({ userId: o.customerUserId }, { event: 'refund_initiated', title: `Refund issued for ${o.number}`, body: `$${(amt / 100).toFixed(2)} was refunded to your original payment method.`, href: `/account/orders/${o.number}` })
    }
  } else {
    await Order.updateOne({ _id: op.order }, { $inc: { 'payment.pendingRefundCents': -amt } })
  }
}

// ---------------------------------------------------------------- supplier fulfillment

async function supplierCode(supplierId: string) {
  const s = await Supplier.findById(supplierId, 'code status').lean()
  if (!s) throw new HttpError(403, 'forbidden', 'Supplier account not found.')
  return s
}

/** Supplier must be signed in, attached to a supplier, and that supplier approved. */
export async function requireActiveSupplier(actor: Actor) {
  if (actor.role !== 'supplier' || !actor.supplierId) throw new HttpError(403, 'forbidden', 'Supplier access only.')
  const s = await supplierCode(actor.supplierId)
  if (s.status !== 'approved') throw new HttpError(403, 'supplier_inactive', s.status === 'suspended' ? 'Your supplier account is suspended. Contact Price-Select.' : 'Your supplier account has not been approved yet.')
  return { supplierId: actor.supplierId, code: s.code }
}

/** Only paid orders are released to suppliers; each supplier sees its own fulfillment only. */
export async function myFulfillments(actor: Actor): Promise<SupplierFulfillment[]> {
  const { supplierId, code } = await requireActiveSupplier(actor)
  const docs = await Order.find({ 'fulfillments.supplier': supplierId, paymentStatus: { $nin: ['pending', 'failed'] } }, { number: 1, placedAt: 1, shipTo: 1, fulfillments: 1 }).sort({ placedAt: -1 }).limit(200).lean<OrderDoc[]>()
  return docs.map((d) => toSupplierFulfillment(d, supplierId, code)).filter((x): x is SupplierFulfillment => !!x && x.fulfillment.status !== 'awaiting_payment')
}

export const zFulfillmentAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('acknowledge') }),
  z.object({ action: z.literal('status'), status: z.enum(['processing', 'shipped', 'delivered']) }),
  z.object({ action: z.literal('tracking'), carrier: z.string().trim().min(2).max(60), tracking: z.string().trim().min(4).max(60).regex(/^[\w-]+$/, 'Letters, numbers and dashes only') }),
])

export async function updateFulfillment(actor: Actor, fid: string, input: z.infer<typeof zFulfillmentAction>) {
  const { supplierId, code } = await requireActiveSupplier(actor)
  const result = await tx(async (session) => {
    const o = await Order.findOne({ 'fulfillments.fid': fid, 'fulfillments.supplier': supplierId }).session(session)
    const f = o?.fulfillments.find((x) => x.fid === fid && String(x.supplier) === supplierId)
    if (!o || !f) throw notFound('Fulfillment')
    if (['pending', 'failed'].includes(o.paymentStatus)) throw conflict('This order is not paid yet.')
    const now = new Date()
    let to = f.status
    let note = ''
    if (input.action === 'acknowledge') {
      to = 'confirmed'
      note = 'Supplier acknowledged the order.'
    } else if (input.action === 'status') {
      to = input.status
      if (to !== f.status && !canTransition(f.status, to)) throw conflict(`Cannot move from ${f.status} to ${to}.`)
      if (to === 'shipped' && !f.tracking) throw badRequest('Add carrier and tracking before marking as shipped.')
      note = `Status updated to ${to}.`
    } else {
      if (!['confirmed', 'processing', 'shipped'].includes(f.status)) throw conflict('Tracking can be added once the order is acknowledged.')
      f.carrier = input.carrier
      f.tracking = input.tracking
      to = 'shipped'
      note = `Tracking submitted: ${input.carrier} ${input.tracking}.`
    }
    if (to !== f.status && !canTransition(f.status, to)) throw conflict(`Cannot move from ${f.status} to ${to}.`)
    if (to === 'confirmed') f.acknowledgedAt = now
    if (to === 'shipped' && !f.shippedAt) f.shippedAt = now
    if (to === 'delivered') f.deliveredAt = now
    const changed = to !== f.status
    f.status = to
    f.history.push({ status: to, at: now, note, by: actor.name })
    o.status = deriveOrderStatus(o.fulfillments.map((x) => x.status))
    await o.save({ session })
    if (o.customerUserId && (changed || input.action === 'tracking') && ['shipped', 'delivered'].includes(to))
      await notify({ userId: o.customerUserId }, { event: to === 'delivered' ? 'order_delivered' : 'order_shipped', title: `${f.fid} ${to}`, body: f.lines.map((l) => l.name).join(', '), href: `/account/orders/${o.number}` }, session)
    if (input.action === 'tracking')
      await sendTransactional({ template: 'shipping-update', to: o.email, key: `ship:${f.fid}:${input.tracking}`, payload: { name: o.shipTo?.name ?? '', orderId: o.number, shipmentId: f.fid, carrier: input.carrier, tracking: input.tracking, estimatedDelivery: f.estimatedDelivery?.toISOString(), lines: f.lines.map((l) => ({ name: l.name ?? '', qty: l.qty, unitPrice: dollars(l.unitPriceCents) })) } }, session)
    if (to === 'delivered' && changed) await sendTransactional({ template: 'delivered', to: o.email, key: `delivered:${f.fid}`, payload: { orderId: o.number, shipmentId: f.fid, lines: f.lines.map((l) => ({ name: l.name ?? '', qty: l.qty, unitPrice: dollars(l.unitPriceCents) })) } }, session)
    await audit(actor, `fulfillment.${input.action}`, { type: 'fulfillment', id: fid }, note, undefined, session)
    return o.toObject() as OrderDoc
  })
  await processOutbox().catch(() => undefined)
  return toSupplierFulfillment(result, supplierId, code)!
}

export type { OrderDTO }
