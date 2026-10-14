import 'server-only'
import { z } from 'zod'
import { assertCan, type Actor } from '../auth'
import { db, tx } from '../db'
import { badRequest, conflict, HttpError, notFound } from '../http'
import { PrivateAsset } from '../models/files'
import { Supplier } from '../models/network'
import { Case, Order, type CaseDoc, type OrderDoc } from '../models/orders'
import { audit, dollars, iso, isoOpt, nextSeq } from './common'
import { returnedQtyByLine } from './commerce'
import { deadline } from './metrics'
import { notify, notifyStaff, processOutbox, sendTransactional } from './notify'
import { refundOrder } from './operations'
import { getSettings } from './settings'
import { claimEvidence } from './uploads'
import { namesFor, staffList } from './users'
import type { CaseMessage, ReturnCase } from '@/lib/types'

const zAttachments = z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(8).default([])

export const zNewCase = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('return'),
    orderId: z.string().trim().max(40),
    type: z.enum(['return', 'damage', 'cancellation', 'replacement']),
    lines: z.array(z.object({ lineId: z.string().max(60), qty: z.number().int().min(1).max(999) })).min(1).max(20),
    reason: z.string().trim().min(3).max(200),
    message: z.string().trim().min(3).max(4000),
    attachments: zAttachments,
  }),
  z.object({
    kind: z.literal('support'),
    orderId: z.string().trim().max(40).optional(),
    subject: z.string().trim().min(3).max(200),
    message: z.string().trim().min(3).max(4000),
    attachments: zAttachments,
  }),
])

/** Customer opens a return/damage/cancellation case or a support request on their own order. */
export async function openCase(actor: Actor, input: z.infer<typeof zNewCase>) {
  if (actor.role !== 'customer') throw new HttpError(403, 'forbidden', 'Only customers can open cases from the account area.')
  await db()
  const s = await getSettings()
  let order: OrderDoc | null = null
  if (input.orderId) {
    order = await Order.findOne({ number: input.orderId, customerUserId: actor.id }).lean<OrderDoc>()
    if (!order) throw notFound('Order')
  }
  let supplier: import('mongoose').Types.ObjectId | undefined
  let fid: string | undefined
  let lines: { lineId: string; name: string; qty: number }[] = []
  if (input.kind === 'return') {
    if (!order) throw badRequest('Choose an order.')
    if (['pending', 'failed'].includes(order.paymentStatus)) throw conflict('This order has not been paid.')
    const returned = await returnedQtyByLine(order._id)
    const all = order.fulfillments.flatMap((f) => f.lines.map((l) => ({ f, l })))
    for (const req of input.lines) {
      const hit = all.find((x) => x.l.lineId === req.lineId)
      if (!hit) throw badRequest('An item does not belong to this order.')
      const left = hit.l.qty - (returned.get(req.lineId) ?? 0)
      if (req.qty > left) throw conflict(`${hit.l.name}: only ${left} unit(s) can still be returned.`)
      if (input.type === 'cancellation' ? !['pending', 'confirmed', 'processing'].includes(hit.f.status) : !['shipped', 'delivered'].includes(hit.f.status))
        throw conflict(input.type === 'cancellation' ? `${hit.l.name} has already shipped; request a return instead.` : `${hit.l.name} has not shipped yet; request a cancellation instead.`)
      lines.push({ lineId: req.lineId, name: hit.l.name ?? '', qty: req.qty })
      if (fid && fid !== hit.f.fid) throw badRequest('Open a separate case for items from each supplier shipment.')
      fid = hit.f.fid
      supplier = hit.f.supplier
    }
  }
  const number = await nextSeq(input.kind === 'return' ? 'case' : 'ticket', input.kind === 'return' ? 3100 : 7200)
  const now = new Date()
  const created = await tx(async (session) => {
    const [c] = await Case.create(
      [
        {
          number: `${input.kind === 'return' ? 'RC' : 'SC'}-${number}`,
          kind: input.kind,
          type: input.kind === 'return' ? input.type : 'support',
          order: order?._id,
          orderNumber: order?.number,
          customerUserId: actor.id,
          customerName: actor.name,
          supplier,
          fid,
          lines,
          subject: input.kind === 'return' ? `${input.reason} — ${lines.map((l) => `${l.qty} × ${l.name}`).join(', ')}` : input.subject,
          reason: input.kind === 'return' ? input.reason : input.subject,
          priority: input.kind === 'return' && input.type === 'damage' ? 'high' : 'normal',
          status: input.kind === 'return' ? 'awaiting_supplier' : 'open',
          openedAt: now,
          slaDueAt: deadline(s, 'response', now),
          messages: [{ authorId: actor.id, authorName: actor.name, role: 'customer', visibility: 'customer', text: input.message, attachments: input.attachments, at: now }],
        },
      ],
      { session },
    )
    await claimEvidence(actor, input.attachments, c._id, session)
    if (supplier) await notify({ supplier }, { event: 'case_opened', title: `${c.number}: ${input.kind === 'return' ? input.type : 'support'} request`, body: c.subject, href: '/supplier/returns' }, session)
    await notifyStaff({ event: 'case_opened', title: `New case ${c.number}`, body: c.subject, href: input.kind === 'return' ? '/admin/returns' : '/admin/support' }, session)
    return c
  })
  return toCaseDTO(created.toObject() as CaseDoc, actor)
}

// ---------------------------------------------------------------- reads (scoped)

function visibleTo(actor: Actor, m: { visibility: string }) {
  if (actor.role === 'admin' || actor.role === 'support') return true
  if (actor.role === 'customer') return m.visibility === 'customer'
  return m.visibility === 'customer' || m.visibility === 'supplier'
}

async function toCaseDTO(c: CaseDoc, actor: Actor, names?: Map<string, string>, codes?: Map<string, { code: string; name: string }>): Promise<ReturnCase> {
  const assets = await PrivateAsset.find({ _id: { $in: c.messages.flatMap((m) => m.attachments ?? []) } }, { originalName: 1 }).lean()
  const aName = new Map(assets.map((a) => [String(a._id), a.originalName ?? 'file']))
  const sup = c.supplier ? (codes?.get(String(c.supplier)) ?? (await Supplier.findById(c.supplier, 'code name').lean())) : null
  const staff = actor.role === 'admin' || actor.role === 'support'
  return {
    id: c.number,
    kind: c.kind as 'return',
    orderId: c.orderNumber ?? undefined,
    customerId: c.customerUserId ?? '',
    customerName: c.customerName ?? names?.get(c.customerUserId ?? '') ?? undefined,
    supplierId: sup?.code,
    supplierName: sup?.name,
    fulfillmentId: c.fid ?? undefined,
    productSlug: undefined,
    lines: (c.lines ?? []).map((l) => ({ lineId: l.lineId ?? '', name: l.name ?? '', qty: l.qty ?? 0 })),
    type: c.type as ReturnCase['type'],
    subject: c.subject,
    reason: c.reason ?? '',
    priority: c.priority as ReturnCase['priority'],
    status: c.status as ReturnCase['status'],
    assignee: staff ? (c.assigneeName ?? undefined) : undefined,
    assigneeId: staff ? (c.assigneeId ?? undefined) : undefined,
    openedAt: iso(c.openedAt),
    slaDue: isoOpt(c.slaDueAt),
    supplierRespondedAt: isoOpt(c.supplierRespondedAt),
    resolution: c.resolution?.summary ?? undefined,
    outcome: (c.resolution?.outcome ?? undefined) as ReturnCase['outcome'],
    refund: c.resolution?.refundStatus ? { amount: dollars(c.resolution.refundCents), status: c.resolution.refundStatus as 'pending' } : undefined,
    logistics: { labelIssuedAt: isoOpt(c.logistics?.labelIssuedAt), receivedAt: isoOpt(c.logistics?.receivedAt) },
    notes: c.messages
      .filter((m) => visibleTo(actor, m))
      .map((m): CaseMessage => ({ by: m.authorName ?? '', role: (m.role ?? 'system') as CaseMessage['role'], visibility: m.visibility as CaseMessage['visibility'], at: iso(m.at), text: m.text ?? '', attachments: (m.attachments ?? []).map((a) => ({ id: String(a), name: aName.get(String(a)) ?? 'file' })) })),
  }
}

function scope(actor: Actor) {
  if (actor.role === 'admin' || actor.role === 'support') return {}
  if (actor.role === 'customer') return { customerUserId: actor.id }
  if (actor.role === 'supplier' && actor.supplierId) return { supplier: actor.supplierId }
  throw new HttpError(403, 'forbidden', 'No access to cases.')
}

export async function listCases(actor: Actor, kind?: 'return' | 'support') {
  if (actor.role === 'admin' || actor.role === 'support') assertCan(actor, 'support:cases')
  await db()
  const docs = await Case.find({ ...scope(actor), ...(kind ? { kind } : {}) }).sort({ openedAt: -1 }).limit(500).lean<CaseDoc[]>()
  const [names, sups] = await Promise.all([namesFor(docs.map((d) => d.customerUserId)), Supplier.find({ _id: { $in: docs.map((d) => d.supplier).filter(Boolean) } }, 'code name').lean()])
  const codes = new Map(sups.map((s) => [String(s._id), { code: s.code, name: s.name }]))
  return Promise.all(docs.map((d) => toCaseDTO(d, actor, names, codes)))
}

async function loadScoped(actor: Actor, number: string) {
  await db()
  const c = await Case.findOne({ number, ...scope(actor) })
  if (!c) throw notFound('Case')
  return c
}

export async function getCase(actor: Actor, number: string) {
  return toCaseDTO((await loadScoped(actor, number)).toObject() as CaseDoc, actor)
}

// ---------------------------------------------------------------- messages

export const zMessage = z.object({ text: z.string().trim().min(1).max(4000), visibility: z.enum(['customer', 'supplier', 'staff']).optional(), attachments: zAttachments })

export async function addMessage(actor: Actor, number: string, input: z.infer<typeof zMessage>) {
  const c = await loadScoped(actor, number)
  if (['resolved', 'declined'].includes(c.status) && actor.role !== 'admin' && actor.role !== 'support') throw conflict('This case is closed.')
  const staff = actor.role === 'admin' || actor.role === 'support'
  // Visibility is decided by the server for customers and suppliers; staff choose explicitly.
  const visibility = staff ? (input.visibility ?? 'staff') : actor.role === 'customer' ? 'customer' : 'supplier'
  if (visibility === 'supplier' && !c.supplier) throw badRequest('This case has no supplier.')
  await tx(async (session) => {
    await claimEvidence(actor, input.attachments, c._id, session)
    c.messages.push({ authorId: actor.id, authorName: actor.name, role: actor.role, visibility, text: input.text, attachments: input.attachments, at: new Date() })
    if (actor.role === 'supplier' && !c.supplierRespondedAt) c.supplierRespondedAt = new Date()
    await c.save({ session })
    if (actor.role !== 'customer' && visibility === 'customer' && c.customerUserId) await notify({ userId: c.customerUserId }, { event: 'case_update', title: `Update on ${c.number}`, body: input.text.slice(0, 140), href: '/account/returns' }, session)
    if (actor.role !== 'supplier' && visibility !== 'staff' && c.supplier) await notify({ supplier: c.supplier }, { event: 'case_update', title: `Update on ${c.number}`, body: input.text.slice(0, 140), href: '/supplier/returns' }, session)
    if (!staff) await notifyStaff({ event: 'case_update', title: `Reply on ${c.number}`, body: input.text.slice(0, 140), href: c.kind === 'return' ? '/admin/returns' : '/admin/support' }, session)
  })
  return toCaseDTO(c.toObject() as CaseDoc, actor)
}

/** Supplier decision on a return routed to it. A decline goes to staff, never straight to the customer. */
export async function supplierRespond(actor: Actor, number: string, input: unknown) {
  const d = z.object({ decision: z.enum(['approve', 'decline', 'info']), message: z.string().trim().min(3).max(4000) }).parse(input)
  if (actor.role !== 'supplier') throw new HttpError(403, 'forbidden', 'Supplier access only.')
  const c = await loadScoped(actor, number)
  if (!['open', 'awaiting_supplier', 'escalated'].includes(c.status)) throw conflict('This case is not awaiting a supplier decision.')
  c.messages.push({ authorId: actor.id, authorName: actor.name, role: 'supplier', visibility: 'supplier', text: `${d.decision === 'approve' ? 'Approved' : d.decision === 'decline' ? 'Declined (for staff review)' : 'Information'}: ${d.message}`, attachments: [], at: new Date() })
  c.supplierRespondedAt = c.supplierRespondedAt ?? new Date()
  if (d.decision === 'approve') c.status = 'approved'
  if (d.decision === 'decline') c.status = 'escalated'
  await c.save()
  await notifyStaff({ event: 'supplier_response', title: `${c.number}: supplier ${d.decision}`, body: d.message.slice(0, 140), href: c.kind === 'return' ? '/admin/returns' : '/admin/support' })
  await audit(actor, `case.supplier_${d.decision}`, { type: 'case', id: c.number }, d.message.slice(0, 200))
  return toCaseDTO(c.toObject() as CaseDoc, actor)
}

// ---------------------------------------------------------------- staff workflow

export const zStaffAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign'), assigneeId: z.string().regex(/^[a-f\d]{24}$/i).nullable() }),
  z.object({ action: z.literal('status'), status: z.enum(['open', 'awaiting_supplier', 'approved', 'in_transit', 'escalated', 'declined']), note: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal('priority'), priority: z.enum(['low', 'normal', 'high', 'urgent']) }),
  z.object({ action: z.literal('label_issued') }),
  z.object({ action: z.literal('received') }),
  z.object({
    action: z.literal('resolve'),
    outcome: z.enum(['refund', 'replacement', 'store_credit', 'none']),
    summary: z.string().trim().min(3).max(2000),
    refundAmount: z.number().positive().max(1_000_000).optional(),
    idempotencyKey: z.string().min(16).max(80).regex(/^[\w-]+$/).optional(),
  }),
])

export async function staffCaseAction(actor: Actor, number: string, input: z.infer<typeof zStaffAction>) {
  assertCan(actor, 'support:cases')
  const c = await loadScoped(actor, number)
  const note = (text: string) => c.messages.push({ authorId: actor.id, authorName: actor.name, role: actor.role, visibility: 'staff', text, attachments: [], at: new Date() })
  if (input.action === 'assign') {
    if (input.assigneeId) {
      const staff = (await staffList()).find((s) => s.id === input.assigneeId)
      if (!staff) throw badRequest('Assignee must be an active staff member.')
      c.assigneeId = staff.id
      c.assigneeName = staff.name
      note(`Assigned to ${staff.name}.`)
    } else {
      c.assigneeId = undefined
      c.assigneeName = undefined
      note('Unassigned.')
    }
  } else if (input.action === 'status') {
    if (['resolved'].includes(c.status)) throw conflict('Resolved cases cannot change status.')
    c.status = input.status
    note(`Status changed to ${input.status.replace('_', ' ')}${input.note ? ` — ${input.note}` : ''}.`)
    if (input.status === 'escalated') await notify({ role: 'admin' }, { event: 'support_escalation', title: `${c.number} escalated`, body: input.note ?? c.subject, href: c.kind === 'return' ? '/admin/returns' : '/admin/support' })
  } else if (input.action === 'priority') {
    c.priority = input.priority
    note(`Priority set to ${input.priority}.`)
  } else if (input.action === 'label_issued') {
    // Carrier labels are not generated automatically (no shipping provider); this records a manual label.
    if (c.logistics?.labelIssuedAt) throw conflict('A return label is already recorded.')
    c.logistics = { ...c.logistics, labelIssuedAt: new Date() }
    c.status = 'in_transit'
    note('Return label issued to customer (recorded manually).')
  } else if (input.action === 'received') {
    if (c.logistics?.receivedAt) throw conflict('Receipt is already recorded.')
    c.logistics = { ...c.logistics, receivedAt: new Date() }
    note('Returned item received and inspected.')
  } else {
    if (['resolved', 'declined'].includes(c.status)) throw conflict('This case is already closed.')
    type RefundState = 'not_applicable' | 'succeeded' | 'failed' | 'pending'
    let refundStatus = 'not_applicable' as RefundState
    let refundCents: number | undefined
    let opId: unknown
    if (input.outcome === 'refund') {
      if (!c.orderNumber) throw badRequest('Refunds require an order.')
      if (!input.refundAmount || !input.idempotencyKey) throw badRequest('Enter the refund amount.')
      // refundOrder enforces admin:payments, provider configuration and the refundable balance.
      const r = await refundOrder(actor, c.orderNumber, { amount: input.refundAmount, reason: `${c.number}: ${input.summary}`.slice(0, 300), idempotencyKey: input.idempotencyKey }, c._id)
      refundStatus = r.status as RefundState
      refundCents = Math.round(r.amount * 100)
      opId = r.operationId
      if (r.status === 'failed') throw new HttpError(502, 'payment_failed', r.error ?? 'The refund failed. The case was not resolved.')
    }
    c.status = refundStatus === 'pending' ? 'approved' : 'resolved'
    c.resolution = { outcome: input.outcome, summary: input.summary, refundCents, refundOperation: opId as never, refundStatus, by: actor.id, byName: actor.name, at: new Date() }
    note(`${refundStatus === 'pending' ? 'Refund submitted, awaiting provider confirmation' : 'Resolved'} — outcome: ${input.outcome.replace('_', ' ')}. ${input.summary}`)
    if (c.customerUserId) await notify({ userId: c.customerUserId }, { event: 'case_resolved', title: `${c.number} ${c.status === 'resolved' ? 'resolved' : 'updated'}`, body: input.summary.slice(0, 140), href: '/account/returns' })
    c.messages.push({ authorId: actor.id, authorName: actor.name, role: actor.role, visibility: 'customer', text: input.summary, attachments: [], at: new Date() })
    if (refundStatus === 'succeeded' && c.orderNumber) {
      const o = await Order.findOne({ number: c.orderNumber }, { email: 1 }).lean()
      if (o) await sendTransactional({ template: 'refund-processed', to: o.email, key: `refund-case:${c.number}`, payload: { caseId: c.number, orderId: c.orderNumber, item: c.lines.map((l) => l.name).join(', ') || c.subject, amount: dollars(refundCents) } })
    }
  }
  await c.save()
  await audit(actor, `case.${input.action}`, { type: 'case', id: c.number }, `${input.action} ${c.number}`)
  await processOutbox().catch(() => undefined)
  return toCaseDTO(c.toObject() as CaseDoc, actor)
}

export { staffList }
