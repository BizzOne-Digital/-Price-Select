import 'server-only'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { assertCan, type Actor } from '../auth'
import { db } from '../db'
import { badRequest, conflict, HttpError, notFound, toCents } from '../http'
import { Category, Product, PRODUCT_STATUSES, type ProductDoc } from '../models/catalog'
import { PrivateAsset, StoredUpload } from '../models/files'
import { Supplier } from '../models/network'
import { Order } from '../models/orders'
import { audit, invalidate, TAGS } from './common'
import { promoPrices, toProductAdmin } from './catalog'
import { notify, notifyStaff } from './notify'
import { requireActiveSupplier } from './operations'
import { cleanupUploads, parseUploadUrl, sniff } from './uploads'
import { parseCsv } from '@/lib/csv'

// ---------------------------------------------------------------- shared field schema

const zImageSrc = z
  .string()
  .trim()
  .max(500)
  .refine((s) => !!parseUploadUrl(s) || /^https:\/\/images\.unsplash\.com\/[\w\-./?=&%]+$/.test(s), 'Images must be uploaded through the image field.')

export const zProductFields = z.object({
  name: z.string().trim().min(2).max(160),
  brand: z.string().trim().max(80).default(''),
  category: z.string().trim().min(1).max(80),
  price: z.number().positive().max(1_000_000),
  summary: z.string().trim().max(300).default(''),
  description: z.string().trim().max(10_000).default(''),
  specs: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) })).max(40).default([]),
  upc: z.string().trim().regex(/^\d{8,14}$/, 'UPC must be 8–14 digits').or(z.literal('')).optional(),
  weightKg: z.number().min(0).max(100_000).default(0),
  dimensions: z.string().trim().max(120).default(''),
  handlingDays: z.number().int().min(0).max(120).default(2),
  deliveryEstimate: z.string().trim().max(120).default(''),
  madeToOrder: z.boolean().default(false),
})
const zAdminExtra = z.object({
  images: z.array(z.object({ src: zImageSrc, alt: z.string().trim().max(200).default('') })).max(12).optional(),
  tag: z.enum(['Selected', 'New arrival', 'Seasonal', 'Limited']).nullable().optional(),
  featured: z.boolean().optional(),
  membershipEligible: z.boolean().optional(),
})
export const zAdminProductUpdate = zProductFields.partial().merge(zAdminExtra)

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'item'

async function categoryOrThrow(slug: string) {
  const c = await Category.findOne({ slug }).lean()
  if (!c) throw badRequest('Unknown category.')
  return c
}

async function mapAdmin(docs: ProductDoc[]) {
  const promo = await promoPrices()
  const sups = await Supplier.find({ _id: { $in: docs.map((d) => d.supplier) } }, 'code name status membershipExcluded').lean()
  const by = new Map(sups.map((s) => [String(s._id), s]))
  return docs.map((d) => toProductAdmin(d, (by.get(String(d.supplier)) as never) ?? null, promo))
}

// ---------------------------------------------------------------- staff

export async function listProductsAdmin(actor: Actor, opts: { status?: string } = {}) {
  assertCan(actor, 'admin:products')
  await db()
  const filter = opts.status && opts.status !== 'all' ? { status: opts.status as (typeof PRODUCT_STATUSES)[number] } : {}
  const [docs, counts] = await Promise.all([Product.find(filter).sort({ updatedAt: -1 }).limit(500).lean<ProductDoc[]>(), Product.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }])])
  return { items: await mapAdmin(docs), counts: Object.fromEntries(counts.map((c) => [c._id, c.n])) }
}

export async function getProductAdmin(actor: Actor, id: string) {
  await db()
  const doc = await Product.findById(id).lean<ProductDoc>()
  if (!doc) throw notFound('Product')
  const staff = actor.role === 'admin' || actor.role === 'support'
  if (!staff && !(actor.role === 'supplier' && actor.supplierId === String(doc.supplier))) throw notFound('Product')
  return (await mapAdmin([doc]))[0]
}

/** Edit allow-listed fields. Replaced/removed images are cleaned up only after the save succeeds. */
export async function updateProductAdmin(actor: Actor, id: string, input: unknown) {
  assertCan(actor, 'admin:products')
  const patch = zAdminProductUpdate.parse(input)
  await db()
  const doc = await Product.findById(id)
  if (!doc) throw notFound('Product')
  if (patch.category) await categoryOrThrow(patch.category)
  const before = { name: doc.name, price: doc.priceCents, category: doc.category, images: doc.images.map((i) => i.src) }
  const { price, images, ...rest } = patch
  Object.assign(doc, rest)
  if (price != null) doc.priceCents = toCents(price)
  const removed = images ? before.images.filter((src) => !images.some((i) => i.src === src)) : []
  if (images) doc.set('images', images)
  await doc.save()
  await audit(actor, 'product.update', { type: 'product', id: doc.slug }, `Edited ${doc.name}`, { before, after: { name: doc.name, price: doc.priceCents, category: doc.category, images: doc.images.map((i) => i.src) } })
  if (removed.length) await cleanupUploads(actor, removed)
  invalidate(TAGS.catalog)
  return getProductAdmin(actor, id)
}

/** Why a product cannot be published yet. Empty means publishable. */
export async function publishBlockers(doc: ProductDoc) {
  const out: string[] = []
  const [cat, sup] = await Promise.all([Category.findOne({ slug: doc.category }).lean(), Supplier.findById(doc.supplier, 'status').lean()])
  if (!cat || cat.active === false) out.push('Category is missing or inactive.')
  if (sup?.status !== 'approved') out.push('Supplier is not approved.')
  if (!doc.images?.length) out.push('Add at least one published image.')
  const required = (doc.compliance ?? []).filter((c) => c.required !== false)
  for (const c of required) if (c.status !== 'on_file') out.push(`Document outstanding: ${c.label}.`)
  if (cat?.reviewLevel === 'enhanced') {
    for (const c of required) if (!c.assetId || !c.reviewedBy) out.push(`Enhanced review needs a reviewed file for: ${c.label}.`)
    if (!doc.review?.enhancedSignoff?.at) out.push('Enhanced-review sign-off has not been recorded.')
  }
  return out
}

const zReview = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.enum(['reject', 'flag', 'suspend', 'withdraw']), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal('signoff'), note: z.string().trim().max(500).default('') }),
  z.object({ action: z.literal('document'), label: z.string().max(120), decision: z.enum(['on_file', 'rejected']), note: z.string().trim().max(300).default('') }),
  z.object({ action: z.literal('publish_image'), assetId: z.string().regex(/^[a-f\d]{24}$/i), alt: z.string().trim().max(200).default('') }),
])

const TRANSITIONS: Record<string, string[]> = {
  approve: ['pending_review', 'flagged', 'suspended', 'rejected'],
  reject: ['pending_review', 'flagged'],
  flag: ['pending_review', 'published'],
  suspend: ['published', 'flagged', 'pending_review'],
  withdraw: ['published', 'flagged', 'suspended', 'pending_review', 'rejected', 'draft'],
}
const RESULT: Record<string, string> = { approve: 'published', reject: 'rejected', flag: 'flagged', suspend: 'suspended', withdraw: 'withdrawn' }

export async function reviewProduct(actor: Actor, id: string, input: unknown) {
  assertCan(actor, 'admin:products')
  const r = zReview.parse(input)
  await db()
  const doc = await Product.findById(id)
  if (!doc) throw notFound('Product')
  const event = { by: actor.id, byName: actor.name, at: new Date() }

  if (r.action === 'document') {
    const item = doc.compliance.find((c) => c.label === r.label)
    if (!item) throw notFound('Document')
    if (r.decision === 'on_file' && !item.assetId) throw conflict('Attach the document file before marking it on file.')
    item.status = r.decision
    item.reviewedBy = actor.id
    item.reviewedByName = actor.name
    item.reviewedAt = new Date()
    item.note = r.note
    doc.review!.history.push({ ...event, action: `document_${r.decision}`, reason: `${r.label}${r.note ? `: ${r.note}` : ''}` })
  } else if (r.action === 'signoff') {
    const cat = await categoryOrThrow(doc.category)
    if (cat.reviewLevel !== 'enhanced') throw conflict('Sign-off applies to enhanced-review categories only.')
    const missing = doc.compliance.filter((c) => c.required !== false && (c.status !== 'on_file' || !c.assetId || !c.reviewedBy))
    if (missing.length) throw conflict(`Review every required document first: ${missing.map((m) => m.label).join(', ')}.`)
    doc.review!.enhancedSignoff = { by: actor.id, byName: actor.name, at: new Date(), note: r.note }
    doc.review!.history.push({ ...event, action: 'enhanced_signoff', reason: r.note })
  } else if (r.action === 'publish_image') {
    // Admin-controlled publication of a supplier-staged image: copy bytes into the public store.
    const staged = doc.stagedImages.find((s) => String(s.assetId) === r.assetId)
    if (!staged) throw notFound('Staged image')
    if (actor.role !== 'admin') throw new HttpError(403, 'forbidden', 'Only administrators can publish images.')
    const a = await PrivateAsset.findById(r.assetId).select('+data')
    if (!a) throw notFound('Staged image')
    const kind = sniff(a.data)
    if (!kind?.mime.startsWith('image/')) throw conflict('Staged file is not an image.')
    const filename = `${Date.now()}-${randomBytes(8).toString('hex')}.${kind.ext}`
    await StoredUpload.create({ folder: 'products', filename, mimeType: kind.mime, size: a.size, data: a.data, uploadedBy: actor.id })
    doc.images.push({ src: `/api/uploads/products/${filename}`, alt: r.alt || staged.alt || doc.name })
    doc.set('stagedImages', doc.stagedImages.filter((s) => String(s.assetId) !== r.assetId))
    doc.review!.history.push({ ...event, action: 'image_published' })
  } else {
    if (!TRANSITIONS[r.action].includes(doc.status)) throw conflict(`Cannot ${r.action} a listing that is ${doc.status.replace('_', ' ')}.`)
    if (r.action === 'approve') {
      const blockers = await publishBlockers(doc.toObject() as ProductDoc)
      if (blockers.length) throw conflict('This listing cannot be published yet.', blockers)
      doc.publishedAt = doc.publishedAt ?? new Date()
      doc.statusReason = undefined
    } else doc.statusReason = r.reason
    doc.status = RESULT[r.action] as typeof doc.status
    doc.review!.history.push({ ...event, action: r.action, reason: 'reason' in r ? r.reason : undefined })
    await notify({ supplier: doc.supplier }, { event: 'product_review', title: `${doc.name}: ${doc.status.replace('_', ' ')}`, body: 'reason' in r ? r.reason : 'Your listing is live on the storefront.', href: '/supplier/products' })
  }
  await doc.save()
  await audit(actor, `product.${r.action}`, { type: 'product', id: doc.slug }, `${r.action} ${doc.name}${'reason' in r ? `: ${r.reason}` : ''}`)
  invalidate(TAGS.catalog)
  return getProductAdmin(actor, id)
}

/** Orders containing a product (safety removal notices). */
export async function ordersWithProduct(actor: Actor, id: string) {
  assertCan(actor, 'admin:products')
  await db()
  const os = await Order.find({ 'fulfillments.lines.product': id, paymentStatus: { $nin: ['pending', 'failed'] } }, { number: 1, customerUserId: 1, email: 1 }).limit(500).lean()
  return os
}

export async function notifyAffectedCustomers(actor: Actor, id: string, message: string) {
  assertCan(actor, 'admin:products')
  const doc = await Product.findById(id, 'name').lean()
  if (!doc) throw notFound('Product')
  const os = await ordersWithProduct(actor, id)
  const { sendTransactional } = await import('./notify')
  let queued = 0
  let sent = 0
  for (const o of os) {
    if (o.customerUserId) await notify({ userId: o.customerUserId }, { event: 'product_notice', title: `Important notice: ${doc.name}`, body: message, href: `/account/orders/${o.number}` })
    const r = await sendTransactional({ template: 'notice', to: o.email, key: `notice:${id}:${o.number}:${message.length}`, payload: { title: `Important notice about ${doc.name}`, body: message } })
    queued++
    if (r.sent) sent++
  }
  await audit(actor, 'product.notify_customers', { type: 'product', id }, `Notified ${os.length} order(s) about ${doc.name}`)
  return { orders: os.length, emailsQueued: queued, emailsSent: sent }
}

// ---------------------------------------------------------------- supplier

export const zSupplierDraft = zProductFields.extend({
  sku: z.string().trim().toUpperCase().min(2).max(40).regex(/^[A-Z0-9][A-Z0-9._-]*$/, 'SKU: letters, numbers, dot, dash, underscore'),
  onHand: z.number().int().min(0).max(1_000_000).default(0),
})

export async function myProducts(actor: Actor) {
  const { supplierId } = await requireActiveSupplier(actor)
  return mapAdmin(await Product.find({ supplier: supplierId }).sort({ updatedAt: -1 }).limit(1000).lean<ProductDoc[]>())
}

export async function createDraft(actor: Actor, input: unknown) {
  const { supplierId } = await requireActiveSupplier(actor)
  const d = zSupplierDraft.parse(input)
  const cat = await categoryOrThrow(d.category)
  const sup = await Supplier.findById(supplierId, 'categories').lean()
  if (!sup?.categories.includes(d.category)) throw badRequest('You are not approved to supply this category.')
  if (await Product.exists({ supplier: supplierId, sku: d.sku })) throw conflict(`You already have a product with SKU ${d.sku}.`)
  const docs = ['Authenticity & new-condition confirmation', ...(cat.requiredDocuments ?? [])]
  const doc = await Product.create({
    ...d,
    slug: `${slugify(d.name)}-${randomBytes(3).toString('hex')}`,
    supplier: supplierId,
    priceCents: toCents(d.price),
    upc: d.upc || undefined,
    inventory: { onHand: d.onHand, reserved: 0, updatedAt: new Date() },
    compliance: docs.map((label) => ({ label, required: true, status: 'required' })),
    status: 'draft',
    review: { history: [{ action: 'created', by: actor.id, byName: actor.name, at: new Date() }] },
  })
  await audit(actor, 'product.create', { type: 'product', id: doc.slug }, `Draft created: ${doc.name}`)
  return getProductAdmin(actor, String(doc._id))
}

async function ownProduct(actor: Actor, id: string) {
  const { supplierId } = await requireActiveSupplier(actor)
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound('Product')
  const doc = await Product.findOne({ _id: id, supplier: supplierId })
  if (!doc) throw notFound('Product')
  return doc
}

export async function updateDraft(actor: Actor, id: string, input: unknown) {
  const doc = await ownProduct(actor, id)
  if (!['draft', 'rejected'].includes(doc.status)) throw conflict('Only drafts and rejected listings can be edited. Contact Price-Select to change a live listing.')
  const d = zSupplierDraft.partial().parse(input)
  if (d.category && d.category !== doc.category) await categoryOrThrow(d.category)
  if (d.sku && d.sku !== doc.sku && (await Product.exists({ supplier: doc.supplier, sku: d.sku }))) throw conflict(`You already have a product with SKU ${d.sku}.`)
  const { price, onHand, upc, ...rest } = d
  Object.assign(doc, rest)
  if (upc !== undefined) doc.upc = upc || undefined
  if (price != null) doc.priceCents = toCents(price)
  if (onHand != null) {
    if (onHand < (doc.inventory?.reserved ?? 0)) throw conflict('On-hand cannot be lower than units reserved by open orders.')
    doc.inventory!.onHand = onHand
  }
  if (doc.status === 'rejected') doc.status = 'draft'
  await doc.save()
  return getProductAdmin(actor, id)
}

/** Attach uploaded private files to a draft: compliance documents, staged images, supporting docs. */
export async function attachToProduct(actor: Actor, id: string, input: unknown) {
  const a = z.object({ assetId: z.string().regex(/^[a-f\d]{24}$/i), as: z.enum(['document', 'image', 'supporting']), label: z.string().max(120).optional(), alt: z.string().max(200).optional() }).parse(input)
  const doc = await ownProduct(actor, id)
  if (!['draft', 'rejected', 'pending_review', 'flagged'].includes(doc.status)) throw conflict('Files can be attached to listings under review only.')
  const asset = await PrivateAsset.findOne({ _id: a.assetId, supplier: doc.supplier, uploadedBy: actor.id }).lean()
  if (!asset) throw notFound('File')
  if (a.as === 'document') {
    const item = doc.compliance.find((c) => c.label === a.label)
    if (!item) throw badRequest('Choose which document this file satisfies.')
    item.assetId = asset._id
    item.status = 'pending'
    item.reviewedBy = undefined
    item.reviewedAt = undefined
  } else if (a.as === 'image') {
    if (!asset.mimeType.startsWith('image/')) throw badRequest('Images must be JPEG, PNG or WebP.')
    doc.stagedImages.push({ assetId: asset._id, alt: a.alt ?? '' })
  } else doc.supportingDocs.push(asset._id)
  await PrivateAsset.updateOne({ _id: asset._id }, { $set: { product: doc._id } })
  await doc.save()
  return getProductAdmin(actor, id)
}

export async function submitForReview(actor: Actor, id: string) {
  const doc = await ownProduct(actor, id)
  if (!['draft', 'rejected'].includes(doc.status)) throw conflict('This listing is not a draft.')
  if (!doc.description || !doc.summary) throw badRequest('Add a summary and description before submitting.')
  if (!doc.stagedImages.length && !doc.images.length) throw badRequest('Add at least one product image before submitting.')
  doc.status = 'pending_review'
  doc.submittedAt = new Date()
  doc.review!.history.push({ action: 'submitted', by: actor.id, byName: actor.name, at: new Date() })
  await doc.save()
  await notifyStaff({ event: 'product_submitted', title: `Listing submitted: ${doc.name}`, body: 'Awaiting review.', href: '/admin/products' })
  await audit(actor, 'product.submit', { type: 'product', id: doc.slug }, `Submitted ${doc.name} for review`)
  return getProductAdmin(actor, id)
}

// ---------------------------------------------------------------- inventory

type RowOutcome = { line: number; sku: string; qty: string; ok: boolean; error?: string; previous?: number; reserved?: number }

/**
 * Validate (and optionally apply) on-hand quantities by SKU. Every row is re-checked on the server:
 * ownership, duplicate SKUs, whole-number quantities, and on-hand never below reserved units.
 */
export async function applyInventory(actor: Actor, rows: { line: number; sku: string; qty: string }[], apply: boolean): Promise<RowOutcome[]> {
  const { supplierId } = await requireActiveSupplier(actor)
  if (rows.length > 5000) throw badRequest('Upload at most 5,000 rows at a time.')
  const products = await Product.find({ supplier: supplierId }, { sku: 1, inventory: 1, madeToOrder: 1 }).lean()
  const bySku = new Map(products.map((p) => [p.sku.toUpperCase(), p]))
  const seen = new Set<string>()
  const out: RowOutcome[] = []
  for (const r of rows) {
    const sku = r.sku.trim().toUpperCase()
    const p = bySku.get(sku)
    let error: string | undefined
    if (!sku) error = 'Missing SKU'
    else if (!p) error = 'SKU not in your catalog'
    else if (seen.has(sku)) error = 'Duplicate SKU in file'
    else if (!/^\d{1,7}$/.test(r.qty.trim())) error = 'Quantity must be a whole number'
    else if (Number(r.qty) < (p.inventory?.reserved ?? 0)) error = `${p.inventory?.reserved} units are reserved by open orders`
    if (sku) seen.add(sku)
    out.push({ line: r.line, sku: sku || '—', qty: r.qty || '—', ok: !error, error, previous: p?.inventory?.onHand, reserved: p?.inventory?.reserved })
  }
  if (!apply) return out
  for (const o of out.filter((x) => x.ok)) {
    const qty = Number(o.qty)
    // Conditional write: a reservation made since validation still can't be erased.
    const res = await Product.updateOne({ supplier: supplierId, sku: o.sku, 'inventory.reserved': { $lte: qty } }, { $set: { 'inventory.onHand': qty, 'inventory.updatedAt': new Date() } })
    if (res.matchedCount !== 1) Object.assign(o, { ok: false, error: 'Reserved units changed; retry this row' })
  }
  await Supplier.updateOne({ _id: supplierId }, { $set: { 'feed.lastSync': new Date() } })
  await audit(actor, 'inventory.update', { type: 'supplier', id: supplierId }, `Updated ${out.filter((x) => x.ok).length} stock level(s)`)
  invalidate(TAGS.catalog)
  return out
}

export function rowsFromCsv(text: string) {
  if (text.length > 1_000_000) throw new HttpError(413, 'too_large', 'CSV must be 1 MB or smaller.')
  const [head, ...body] = parseCsv(text)
  const h = (head ?? []).map((c) => c.toLowerCase())
  const si = h.indexOf('sku')
  const qi = h.findIndex((c) => c === 'quantity' || c === 'qty' || c === 'stock')
  if (si < 0 || qi < 0) throw badRequest('Header row must include "sku" and "quantity" columns.')
  return body.map((r, i) => ({ line: i + 2, sku: r[si] ?? '', qty: r[qi] ?? '' }))
}
