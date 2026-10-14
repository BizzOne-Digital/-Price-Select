import 'server-only'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { assertCan, type Actor } from '../auth'
import { db } from '../db'
import { badRequest, conflict, HttpError, notFound } from '../http'
import { Category, Product } from '../models/catalog'
import { PrivateAsset } from '../models/files'
import { Supplier, type SupplierDoc } from '../models/network'
import { audit, invalidate, iso, isoOpt, TAGS } from './common'
import { notify, notifyStaff, sendTransactional } from './notify'
import { supplierMetrics } from './metrics'
import { createAccount, users } from './users'
import type { Supplier as SupplierDTO, SupplierApplication } from '@/lib/types'

export const BUSINESS_TYPES = ['Manufacturer', 'Authorized distributor', 'Wholesaler', 'Brand owner', 'Specialist retailer'] as const

const zApplication = z.object({
  legalName: z.string().trim().min(2).max(160),
  tradingName: z.string().trim().max(160).default(''),
  businessType: z.enum(BUSINESS_TYPES),
  website: z.string().trim().max(200).regex(/^((https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?)?$/i, 'Enter a valid web address').default(''),
  categories: z.array(z.string().max(80)).min(1).max(20),
  contactName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[+()\d\s.-]{7,20}$/, 'Enter a phone number with country code'),
  taxId: z.string().trim().min(5).max(40),
  country: z.string().trim().min(2).max(60),
  shipFrom: z.string().trim().min(2).max(120),
  carriers: z.array(z.string().max(60)).min(1).max(10),
  handling: z.string().trim().min(1).max(60),
  blindShip: z.boolean(),
})

export const zApplyStart = zApplication.extend({ email: z.email().max(200), password: z.string().min(10).max(128) })

const codeFor = (name: string) => `sup-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'partner'}-${randomBytes(2).toString('hex')}`

async function validCategories(slugs: string[]) {
  const found = await Category.find({ slug: { $in: slugs } }, { slug: 1, reviewLevel: 1 }).lean()
  if (found.length !== new Set(slugs).size) throw badRequest('One or more categories are not recognised.')
  return found
}

/**
 * Step 1 of the application: create the applicant's supplier record and a supplier login.
 * The record stays `draft` until documents are attached and the application is submitted.
 */
export async function startApplication(input: z.infer<typeof zApplyStart>) {
  await db()
  await validCategories(input.categories)
  const s = await Supplier.create({
    code: codeFor(input.tradingName || input.legalName),
    name: input.tradingName || input.legalName,
    legalName: input.legalName,
    businessType: input.businessType,
    website: input.website,
    region: input.shipFrom,
    categories: input.categories,
    status: 'draft',
    contact: { name: input.contactName, email: input.email, phone: input.phone },
    tax: { country: input.country, idLast4: input.taxId.replace(/\W/g, '').slice(-4), id: input.taxId },
    shipping: { shipFrom: input.shipFrom, carriers: input.carriers, handling: input.handling, blindShip: input.blindShip },
  })
  try {
    await createAccount({ name: input.contactName, email: input.email, password: input.password, role: 'supplier', supplierId: String(s._id) })
  } catch (e) {
    await Supplier.deleteOne({ _id: s._id })
    throw e
  }
  return { supplierId: String(s._id), code: s.code }
}

const DOC_KINDS = { registration: 'Business registration', insurance: 'Insurance certificate', certificate: 'Product certificate', tax: 'Tax information', agreement: 'Supplier agreement', other: 'Other document' } as const

/** Attach an uploaded private file to the applicant's own supplier record. */
export async function attachSupplierDocument(actor: Actor, input: unknown) {
  const d = z.object({ assetId: z.string().regex(/^[a-f\d]{24}$/i), kind: z.enum(Object.keys(DOC_KINDS) as [keyof typeof DOC_KINDS]) }).parse(input)
  if (actor.role !== 'supplier' || !actor.supplierId) throw new HttpError(403, 'forbidden', 'Supplier access only.')
  await db()
  const asset = await PrivateAsset.findOne({ _id: d.assetId, uploadedBy: actor.id, supplier: actor.supplierId, purpose: 'supplier_document' }).lean()
  if (!asset) throw notFound('File')
  const s = await Supplier.findById(actor.supplierId)
  if (!s) throw notFound('Supplier')
  if (s.documents.some((x) => String(x.assetId) === d.assetId)) return getMySupplier(actor)
  s.documents.push({ label: asset.label || DOC_KINDS[d.kind], kind: d.kind, assetId: asset._id, status: 'pending' })
  await s.save()
  return getMySupplier(actor)
}

export async function submitApplication(actor: Actor, input: unknown) {
  const d = z.object({ authentic: z.literal(true), terms: z.literal(true) }).parse(input)
  if (actor.role !== 'supplier' || !actor.supplierId) throw new HttpError(403, 'forbidden', 'Supplier access only.')
  await db()
  const s = await Supplier.findById(actor.supplierId)
  if (!s) throw notFound('Supplier')
  if (!['draft', 'rejected'].includes(s.status)) throw conflict('This application has already been submitted.')
  const kinds = new Set(s.documents.map((x) => x.kind))
  const missing: string[] = []
  if (!kinds.has('registration')) missing.push('Business registration')
  if (!kinds.has('insurance')) missing.push('Insurance certificate')
  const cats = await validCategories(s.categories)
  if (cats.some((c) => c.reviewLevel === 'enhanced') && !kinds.has('certificate')) missing.push('Product certificates (required for enhanced-review categories)')
  if (missing.length) throw badRequest('Required documents are missing.', missing)
  s.declarations = { authentic: d.authentic, terms: d.terms, at: new Date() }
  s.status = 'applied'
  s.appliedAt = new Date()
  s.review.push({ action: 'applied', by: actor.id, byName: actor.name, at: new Date() })
  await s.save()
  await notifyStaff({ event: 'supplier_application', title: `Supplier application: ${s.name}`, body: 'Ready for review.', href: `/admin/suppliers/${s.code}` })
  await audit(actor, 'supplier.apply', { type: 'supplier', id: s.code }, `Application submitted by ${s.name}`)
  return getMySupplier(actor)
}

// ---------------------------------------------------------------- DTOs

async function productCounts(ids: unknown[]) {
  const rows = await Product.aggregate<{ _id: unknown; n: number }>([{ $match: { supplier: { $in: ids }, status: 'published' } }, { $group: { _id: '$supplier', n: { $sum: 1 } } }])
  return new Map(rows.map((r) => [String(r._id), r.n]))
}

function toDTO(s: SupplierDoc, products: number, metrics: SupplierDTO['metrics']): SupplierDTO {
  return {
    id: s.code,
    dbId: String(s._id),
    name: s.name,
    region: s.region ?? '',
    categories: s.categories ?? [],
    status: s.status as SupplierDTO['status'],
    integration: (s.integration ?? 'Manual') as SupplierDTO['integration'],
    joined: iso(s.approvedAt ?? s.appliedAt ?? (s as { createdAt?: Date }).createdAt),
    products,
    contactName: s.contact?.name ?? '',
    contactEmail: s.contact?.email ?? '',
    metrics,
    documents: (s.documents ?? []).map((d) => ({ id: String(d._id), label: d.label ?? '', kind: d.kind ?? undefined, status: (d.status ?? 'pending') as 'pending', assetId: d.assetId ? String(d.assetId) : undefined })),
    feed: { status: (s.feed?.status ?? 'manual') as 'manual', lastSync: iso(s.feed?.lastSync ?? (s as { updatedAt?: Date }).updatedAt) },
    membershipExcluded: !!s.membershipExcluded,
  }
}

function toApplication(s: SupplierDoc, base: SupplierDTO): SupplierApplication {
  return {
    ...base,
    legalName: s.legalName ?? undefined,
    businessType: s.businessType ?? undefined,
    website: s.website ?? undefined,
    phone: s.contact?.phone ?? undefined,
    taxCountry: s.tax?.country ?? undefined,
    taxIdLast4: s.tax?.idLast4 ?? undefined,
    shipping: { shipFrom: s.shipping?.shipFrom ?? undefined, carriers: s.shipping?.carriers ?? [], handling: s.shipping?.handling ?? undefined, blindShip: s.shipping?.blindShip ?? undefined },
    declarations: { authentic: !!s.declarations?.authentic, terms: !!s.declarations?.terms, at: isoOpt(s.declarations?.at) },
    review: (s.review ?? []).map((r) => ({ action: r.action, byName: r.byName ?? undefined, at: iso(r.at), reason: r.reason ?? undefined })),
    statusReason: s.statusReason ?? undefined,
    appliedAt: isoOpt(s.appliedAt),
  }
}

export async function listSuppliers(actor: Actor) {
  assertCan(actor, 'admin:suppliers')
  await db()
  const docs = await Supplier.find().sort({ status: 1, name: 1 }).limit(1000).lean<SupplierDoc[]>()
  const [counts, metrics] = await Promise.all([productCounts(docs.map((d) => d._id)), supplierMetrics(docs.map((d) => String(d._id)))])
  return docs.map((d) => toDTO(d, counts.get(String(d._id)) ?? 0, metrics.get(String(d._id))!))
}

export async function getSupplierAdmin(actor: Actor, code: string) {
  assertCan(actor, 'admin:suppliers')
  await db()
  const s = await Supplier.findOne({ code }).lean<SupplierDoc>()
  if (!s) throw notFound('Supplier')
  const [counts, metrics] = await Promise.all([productCounts([s._id]), supplierMetrics([String(s._id)])])
  return toApplication(s, toDTO(s, counts.get(String(s._id)) ?? 0, metrics.get(String(s._id))!))
}

/** The signed-in supplier's own record, in any status (so applicants can see progress). */
export async function getMySupplier(actor: Actor) {
  if (actor.role !== 'supplier' || !actor.supplierId) throw new HttpError(403, 'forbidden', 'Supplier access only.')
  await db()
  const s = await Supplier.findById(actor.supplierId).lean<SupplierDoc>()
  if (!s) throw notFound('Supplier')
  const [counts, metrics] = await Promise.all([productCounts([s._id]), supplierMetrics([String(s._id)])])
  return toApplication(s, toDTO(s, counts.get(String(s._id)) ?? 0, metrics.get(String(s._id))!))
}

// ---------------------------------------------------------------- staff decisions

const STATUS_FLOW: Record<string, { from: string[]; to: string }> = {
  review: { from: ['applied'], to: 'under_review' },
  approve: { from: ['applied', 'under_review'], to: 'approved' },
  reject: { from: ['applied', 'under_review'], to: 'rejected' },
  suspend: { from: ['approved'], to: 'suspended' },
  reinstate: { from: ['suspended'], to: 'approved' },
}

export const zSupplierDecision = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['review', 'approve', 'reinstate']), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.enum(['reject', 'suspend']), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal('document'), documentId: z.string().regex(/^[a-f\d]{24}$/i), decision: z.enum(['on_file', 'rejected', 'expired']) }),
  z.object({ action: z.literal('settings'), integration: z.enum(['API', 'EDI', 'CSV', 'Manual']).optional(), membershipExcluded: z.boolean().optional() }),
])

export async function decideSupplier(actor: Actor, code: string, input: unknown) {
  assertCan(actor, 'admin:suppliers')
  const d = zSupplierDecision.parse(input)
  await db()
  const s = await Supplier.findOne({ code })
  if (!s) throw notFound('Supplier')
  const event = { by: actor.id, byName: actor.name, at: new Date() }
  if (d.action === 'document') {
    const doc = s.documents.id(d.documentId)
    if (!doc) throw notFound('Document')
    if (d.decision === 'on_file' && !doc.assetId) throw conflict('No file is attached to this document.')
    doc.status = d.decision
    doc.reviewedBy = actor.name
    doc.reviewedAt = new Date()
    s.review.push({ ...event, action: `document_${d.decision}`, reason: doc.label ?? undefined })
  } else if (d.action === 'settings') {
    if (d.integration) s.integration = d.integration
    if (d.membershipExcluded != null) s.membershipExcluded = d.membershipExcluded
    s.review.push({ ...event, action: 'settings' })
  } else {
    const flow = STATUS_FLOW[d.action]
    if (!flow.from.includes(s.status)) throw conflict(`Cannot ${d.action} a supplier that is ${s.status.replace('_', ' ')}.`)
    if (d.action === 'approve') {
      const missing = ['registration', 'insurance'].filter((k) => !s.documents.some((x) => x.kind === k && x.status === 'on_file'))
      if (missing.length) throw conflict('Review the business registration and insurance documents before approving.', missing)
      s.approvedAt = s.approvedAt ?? new Date()
    }
    s.status = flow.to as typeof s.status
    s.statusReason = d.reason
    s.review.push({ ...event, action: d.action, reason: d.reason })
    await notify({ supplier: s._id }, { event: 'supplier_status', title: `Account ${flow.to.replace('_', ' ')}`, body: d.reason ?? '', href: '/supplier' })
    if (s.contact?.email) await sendTransactional({ template: 'notice', to: s.contact.email, key: `supplier:${s.code}:${d.action}:${Date.now()}`, payload: { title: `Your Price-Select supplier account is ${flow.to.replace('_', ' ')}`, body: d.reason ?? (flow.to === 'approved' ? 'You can now sign in to the supplier portal and submit listings.' : 'Please contact Price-Select for details.') } })
  }
  await s.save()
  await audit(actor, `supplier.${d.action}`, { type: 'supplier', id: s.code }, `${d.action} ${s.name}${'reason' in d && d.reason ? `: ${d.reason}` : ''}`)
  invalidate(TAGS.catalog)
  return getSupplierAdmin(actor, code)
}

/** Supplier user accounts (for staff). */
export async function supplierUsers(supplierId: string) {
  const rows = await (await users()).find({ supplierId }, { projection: { name: 1, email: 1, status: 1 } }).toArray()
  return rows.map((r) => ({ id: String(r._id), name: r.name, email: r.email, status: r.status ?? 'active' }))
}
