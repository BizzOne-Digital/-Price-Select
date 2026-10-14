import 'server-only'
import { z } from 'zod'
import { assertCan, getAuth, type Actor } from '../auth'
import { db } from '../db'
import { conflict, HttpError, notConfigured, notFound } from '../http'
import { payments } from '../integrations'
import { Product, type ProductDoc } from '../models/catalog'
import { Customer, MEMBERSHIP_TIERS, Supplier } from '../models/network'
import { Case, Order, PaymentOperation } from '../models/orders'
import { PLANS } from '../pricing'
import { audit, dollars, iso, isoOpt } from './common'
import { promoPrices, publicScope, toProductDTO } from './catalog'
import { zAddress } from './commerce'
import { notify, sendTransactional } from './notify'
import { setUserStatus, users } from './users'
import type { Customer as CustomerDTO, MembershipState } from '@/lib/types'

async function profile(userId: string) {
  await db()
  return (await Customer.findOne({ userId })) ?? (await Customer.create({ userId }))
}

const membershipDTO = (m: { tier?: string | null; status?: string | null; startedAt?: Date | null; renewsAt?: Date | null; cancelAtPeriodEnd?: boolean | null } | undefined | null): MembershipState => ({
  tier: (m?.tier as MembershipState['tier']) ?? null,
  status: ((m?.status === 'active' && m.renewsAt && +m.renewsAt < Date.now() ? 'expired' : m?.status) ?? 'none') as MembershipState['status'],
  startedAt: isoOpt(m?.startedAt),
  renewsAt: isoOpt(m?.renewsAt),
  cancelAtPeriodEnd: !!m?.cancelAtPeriodEnd,
})

export async function getAccount(actor: Actor) {
  if (actor.role !== 'customer') throw new HttpError(403, 'forbidden', 'Customer accounts only.')
  const c = await profile(actor.id)
  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    phone: c.phone ?? '',
    marketingOptIn: !!c.marketingOptIn,
    addresses: c.addresses.map((a) => ({ id: String(a._id), label: a.label ?? '', name: a.name, line1: a.line1, line2: a.line2 ?? '', city: a.city, region: a.region ?? '', postal: a.postal ?? '', country: a.country, phone: a.phone ?? '', isDefault: !!a.isDefault })),
    membership: membershipDTO(c.membership),
    savedCount: c.saved.length,
  }
}

export async function updateProfile(actor: Actor, input: unknown) {
  const d = z.object({ name: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(30).optional(), marketingOptIn: z.boolean().optional() }).parse(input)
  if (actor.role !== 'customer') throw new HttpError(403, 'forbidden', 'Customer accounts only.')
  if (d.name && d.name !== actor.name) {
    const auth = await getAuth()
    const { headers } = await import('next/headers')
    await auth.api.updateUser({ body: { name: d.name }, headers: await headers() })
  }
  const c = await profile(actor.id)
  if (d.phone !== undefined) c.phone = d.phone
  if (d.marketingOptIn !== undefined) c.marketingOptIn = d.marketingOptIn
  await c.save()
  return getAccount({ ...actor, name: d.name ?? actor.name })
}

export const zAddressInput = zAddress.extend({ label: z.string().trim().max(40).optional().default(''), isDefault: z.boolean().optional() })

export async function saveAddress(actor: Actor, id: string | null, input: unknown) {
  if (actor.role !== 'customer') throw new HttpError(403, 'forbidden', 'Customer accounts only.')
  const a = zAddressInput.parse(input)
  const c = await profile(actor.id)
  if (id) {
    const existing = c.addresses.id(id)
    if (!existing) throw notFound('Address')
    existing.set(a)
  } else {
    if (c.addresses.length >= 20) throw conflict('You can save up to 20 addresses.')
    c.addresses.push({ ...a, isDefault: a.isDefault ?? !c.addresses.length })
  }
  if (a.isDefault) for (const x of c.addresses) x.isDefault = id ? String(x._id) === id : x === c.addresses[c.addresses.length - 1]
  await c.save()
  return getAccount(actor)
}

export async function deleteAddress(actor: Actor, id: string) {
  const c = await profile(actor.id)
  const a = c.addresses.id(id)
  if (!a) throw notFound('Address')
  a.deleteOne()
  if (!c.addresses.some((x) => x.isDefault) && c.addresses[0]) c.addresses[0].isDefault = true
  await c.save()
  return getAccount(actor)
}

// ---------------------------------------------------------------- saved products

export async function savedProducts(actor: Actor) {
  const c = await profile(actor.id)
  const scope = await publicScope()
  const docs = await Product.find({ ...scope, _id: { $in: c.saved } }).lean<ProductDoc[]>()
  const sups = await Supplier.find({ _id: { $in: docs.map((d) => d.supplier) } }, 'code name status membershipExcluded').lean()
  const promo = await promoPrices()
  const by = new Map(sups.map((s) => [String(s._id), s]))
  return docs.map((d) => toProductDTO(d, (by.get(String(d.supplier)) as never) ?? null, promo))
}

export async function setSaved(actor: Actor, productId: string, saved: boolean) {
  if (actor.role !== 'customer') throw new HttpError(403, 'forbidden', 'Customer accounts only.')
  const c = await profile(actor.id)
  if (saved) {
    if (!(await Product.exists({ _id: productId }))) throw notFound('Product')
    await Customer.updateOne({ _id: c._id }, { $addToSet: { saved: productId } })
  } else await Customer.updateOne({ _id: c._id }, { $pull: { saved: productId } })
  return { saved }
}

export async function savedIds(actor: Actor) {
  return (await profile(actor.id)).saved.map(String)
}

// ---------------------------------------------------------------- membership

/**
 * Purchase a membership. Benefits activate only after the payment provider confirms the charge;
 * without a provider this fails honestly and nothing changes.
 */
export async function purchaseMembership(actor: Actor, input: unknown) {
  const d = z.object({ tier: z.enum(MEMBERSHIP_TIERS), idempotencyKey: z.string().min(16).max(80).regex(/^[\w-]+$/) }).parse(input)
  if (actor.role !== 'customer') throw new HttpError(403, 'forbidden', 'Customer accounts only.')
  const adapter = payments()
  if (!adapter) throw notConfigured('payments', 'Membership purchase is not available yet: no payment provider is connected.')
  const c = await profile(actor.id)
  if (c.membership?.status === 'active' && c.membership.renewsAt && +c.membership.renewsAt > Date.now()) throw conflict('You already have an active membership.')
  const plan = PLANS[d.tier]
  const key = `membership:${actor.id}:${d.idempotencyKey}`
  const op = await PaymentOperation.findOneAndUpdate({ idempotencyKey: key }, { $setOnInsert: { kind: 'membership', userId: actor.id, amountCents: plan.feeCents, provider: adapter.name, status: 'pending', reason: d.tier } }, { upsert: true, returnDocument: 'after' })
  if (op.status === 'succeeded') return getAccount(actor)
  await Customer.updateOne({ _id: c._id }, { $set: { 'membership.tier': d.tier, 'membership.status': 'pending_payment', 'membership.paymentOperationId': op._id } })
  const r = await adapter.charge({ amountCents: plan.feeCents, currency: 'USD', idempotencyKey: key, description: `Price-Select ${plan.name} (annual)` })
  await applyMembershipPayment(op._id, r)
  if (r.status === 'failed') throw new HttpError(402, 'payment_failed', r.error ?? 'Payment was declined. Your membership was not activated.')
  return getAccount(actor)
}

/** Activation is driven only by a confirmed payment outcome (direct result or verified webhook). */
export async function applyMembershipPayment(opId: unknown, r: { status: string; providerRef?: string; error?: string }) {
  if (r.status === 'pending') return
  const op = await PaymentOperation.findOneAndUpdate({ _id: opId, status: 'pending' }, { $set: { status: r.status === 'failed' ? 'failed' : 'succeeded', providerRef: r.providerRef, error: r.error } }, { returnDocument: 'after' })
  if (!op) return
  if (op.status === 'failed') {
    await Customer.updateOne({ userId: op.userId, 'membership.paymentOperationId': op._id }, { $set: { 'membership.status': 'none', 'membership.tier': null } })
    return
  }
  const now = new Date()
  const renewsAt = new Date(now)
  renewsAt.setFullYear(renewsAt.getFullYear() + 1)
  await Customer.updateOne({ userId: op.userId }, { $set: { 'membership.status': 'active', 'membership.startedAt': now, 'membership.renewsAt': renewsAt, 'membership.cancelAtPeriodEnd': false } })
  const tier = op.reason as keyof typeof PLANS
  const u = await (await users()).findOne({ _id: new (await import('mongoose')).default.Types.ObjectId(op.userId!) }, { projection: { name: 1, email: 1 } })
  if (u) await sendTransactional({ template: 'membership-welcome', to: u.email, key: `membership-welcome:${op._id}`, payload: { name: u.name, plan: PLANS[tier].name, discountPct: PLANS[tier].pct, fee: `$${PLANS[tier].feeCents / 100} per year` } })
  await notify({ userId: op.userId! }, { event: 'membership', title: `${PLANS[tier].name} is active`, body: `${PLANS[tier].pct}% off eligible purchases.`, href: '/account/details' })
}

/** Cancel auto-renewal; benefits continue to the end of the paid period (terms: cancel before renewal). */
export async function cancelMembership(actor: Actor) {
  const c = await profile(actor.id)
  if (c.membership?.status !== 'active') throw conflict('There is no active membership to cancel.')
  await Customer.updateOne({ _id: c._id }, { $set: { 'membership.cancelAtPeriodEnd': true } })
  await audit(actor, 'membership.cancel', { type: 'customer', id: actor.id }, 'Membership set to end at period end')
  return getAccount(actor)
}

// ---------------------------------------------------------------- staff

export async function listCustomers(actor: Actor) {
  assertCan(actor, 'support:customers')
  await db()
  const rows = await (await users()).find({ $or: [{ role: 'customer' }, { role: { $exists: false } }] }, { projection: { name: 1, email: 1, status: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(2000).toArray()
  const ids = rows.map((r) => String(r._id))
  const [orders, cases, profiles] = await Promise.all([
    Order.aggregate<{ _id: string; n: number; value: number }>([
      { $match: { customerUserId: { $in: ids }, paymentStatus: { $in: ['authorized', 'captured', 'partially_refunded', 'refunded'] } } },
      { $group: { _id: '$customerUserId', n: { $sum: 1 }, value: { $sum: { $subtract: [{ $ifNull: ['$payment.capturedCents', 0] }, { $ifNull: ['$payment.refundedCents', 0] }] } } } },
    ]),
    Case.aggregate<{ _id: string; n: number }>([{ $match: { customerUserId: { $in: ids } } }, { $group: { _id: '$customerUserId', n: { $sum: 1 } } }]),
    Customer.find({ userId: { $in: ids } }, { userId: 1, membership: 1 }).lean(),
  ])
  const o = new Map(orders.map((x) => [x._id, x]))
  const k = new Map(cases.map((x) => [x._id, x.n]))
  const p = new Map(profiles.map((x) => [x.userId, x]))
  return rows.map(
    (r): CustomerDTO & { requests: number } => ({
      id: String(r._id),
      name: r.name,
      email: r.email,
      joined: iso(r.createdAt),
      orders: o.get(String(r._id))?.n ?? 0,
      status: r.status === 'suspended' ? 'suspended' : 'active',
      lifetimeValue: dollars(o.get(String(r._id))?.value ?? 0),
      membership: membershipDTO(p.get(String(r._id))?.membership),
      requests: k.get(String(r._id)) ?? 0,
    }),
  )
}

export async function setCustomerStatus(actor: Actor, userId: string, status: 'active' | 'suspended', reason?: string) {
  assertCan(actor, 'support:customers')
  const u = await (await users()).findOne({ _id: new (await import('mongoose')).default.Types.ObjectId(userId) }, { projection: { role: 1 } })
  if (!u || (u.role && u.role !== 'customer')) throw notFound('Customer')
  await setUserStatus(actor, userId, status, reason)
  return { id: userId, status }
}
