import 'server-only'
import type { Types } from 'mongoose'
import type { Actor } from '../auth'
import { db } from '../db'
import { escapeRegex } from '../http'
import { Category, Product, type ProductDoc } from '../models/catalog'
import { Supplier } from '../models/network'
import { stockStatus } from '../pricing'
import { cached, dollars, iso, isoOpt, page, TAGS } from './common'
import { getSettings } from './settings'
import type { Category as CategoryDTO, Product as ProductDTO, ProductAdmin } from '@/lib/types'

// Public catalog reads. A product is public only when it is `published`, its supplier is
// `approved`, and its category is active. Everything else is visible to staff, or to the owning
// supplier, through authorized preview — never through noindex alone.

type SupplierLite = { _id: Types.ObjectId; code: string; name: string; status: string; membershipExcluded?: boolean }

export async function publicScope() {
  await db()
  const [sups, cats] = await Promise.all([Supplier.find({ status: 'approved' }, { _id: 1 }).lean(), Category.find({ active: true }, { slug: 1 }).lean()])
  return { status: 'published' as const, supplier: { $in: sups.map((s) => s._id) }, category: { $in: cats.map((c) => c.slug) } }
}

/** productId → seasonal price (cents) while the campaign is active. */
export async function promoPrices() {
  const s = await getSettings()
  return new Map(s.promotion.active ? s.promotion.items.map((i) => [i.productId, i.priceCents]) : [])
}

export function toProductDTO(p: ProductDoc, sup: SupplierLite | null, promo: Map<string, number>): ProductDTO {
  const available = Math.max(0, (p.inventory?.onHand ?? 0) - (p.inventory?.reserved ?? 0))
  const seasonalCents = promo.get(String(p._id))
  const seasonal = seasonalCents != null && seasonalCents < p.priceCents
  return {
    id: String(p._id),
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    brand: p.brand ?? '',
    category: p.category,
    supplierId: sup?.code ?? '',
    supplierName: sup?.name,
    price: dollars(p.priceCents),
    seasonalPrice: seasonal ? dollars(seasonalCents) : undefined,
    currency: 'USD',
    images: (p.images ?? []).map((i) => ({ src: i.src ?? '', alt: i.alt ?? '' })),
    summary: p.summary ?? '',
    description: p.description ?? '',
    specs: (p.specs ?? []).map((s) => ({ label: s.label ?? '', value: s.value ?? '' })),
    stock: stockStatus(available, !!p.madeToOrder),
    stockQty: available,
    handlingDays: p.handlingDays ?? 0,
    deliveryEstimate: p.deliveryEstimate ?? '',
    weightKg: p.weightKg ?? 0,
    dimensions: p.dimensions ?? '',
    upc: p.upc ?? undefined,
    compliance: (p.compliance ?? []).map((c) => ({ label: c.label, status: c.status as 'on_file' })),
    tag: (seasonal ? 'Seasonal' : p.tag) ?? undefined,
    featured: !!p.featured,
    seasonal,
    membershipEligible: p.membershipEligible !== false && !sup?.membershipExcluded,
    status: p.status as ProductDTO['status'],
  }
}

export function toProductAdmin(p: ProductDoc, sup: SupplierLite | null, promo: Map<string, number>): ProductAdmin {
  const base = toProductDTO(p, sup, promo)
  const onHand = p.inventory?.onHand ?? 0
  const reserved = p.inventory?.reserved ?? 0
  return {
    ...base,
    compliance: (p.compliance ?? []).map((c) => ({
      label: c.label,
      status: c.status as 'on_file',
      required: c.required !== false,
      assetId: c.assetId ? String(c.assetId) : undefined,
      reviewedByName: c.reviewedByName ?? undefined,
      reviewedAt: isoOpt(c.reviewedAt),
    })),
    madeToOrder: !!p.madeToOrder,
    inventory: { onHand, reserved, available: Math.max(0, onHand - reserved) },
    statusReason: p.statusReason ?? undefined,
    enhancedSignoff: p.review?.enhancedSignoff?.at ? { byName: p.review.enhancedSignoff.byName ?? undefined, at: iso(p.review.enhancedSignoff.at), note: p.review.enhancedSignoff.note ?? undefined } : undefined,
    reviewHistory: (p.review?.history ?? []).map((h) => ({ action: h.action, byName: h.byName ?? undefined, at: iso(h.at), reason: h.reason ?? undefined })),
    stagedImages: (p.stagedImages ?? []).map((s) => ({ assetId: String(s.assetId), alt: s.alt ?? undefined })),
    supportingDocs: (p.supportingDocs ?? []).map(String),
    submittedAt: isoOpt(p.submittedAt),
    publishedAt: isoOpt(p.publishedAt),
    updatedAt: isoOpt((p as { updatedAt?: Date }).updatedAt),
  }
}

const SUP_FIELDS = 'code name status membershipExcluded'

async function mapPublic(docs: ProductDoc[]) {
  const promo = await promoPrices()
  const sups = await Supplier.find({ _id: { $in: [...new Set(docs.map((d) => String(d.supplier)))] } }, SUP_FIELDS).lean<SupplierLite[]>()
  const byId = new Map(sups.map((s) => [String(s._id), s]))
  return docs.map((d) => toProductDTO(d, byId.get(String(d.supplier)) ?? null, promo))
}

const toCategory = (c: { slug: string; name: string; short: string; description?: string | null; includes?: string[]; image?: string | null; imageAlt?: string | null; reviewLevel?: string | null; reviewNote?: string | null; requiredDocuments?: string[]; active?: boolean | null }, count?: number): CategoryDTO => ({
  slug: c.slug,
  name: c.name,
  short: c.short,
  description: c.description ?? '',
  includes: c.includes ?? [],
  image: c.image ?? '',
  imageAlt: c.imageAlt ?? '',
  reviewLevel: (c.reviewLevel as 'standard') ?? 'standard',
  reviewNote: c.reviewNote ?? undefined,
  requiredDocuments: c.requiredDocuments ?? [],
  count,
  active: c.active !== false,
})

async function _categories(): Promise<CategoryDTO[]> {
  const scope = await publicScope()
  const [cats, counts] = await Promise.all([
    Category.find({ active: true }).sort({ sort: 1, name: 1 }).lean(),
    Product.aggregate<{ _id: string; n: number }>([{ $match: scope }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
  ])
  const n = new Map(counts.map((c) => [c._id, c.n]))
  return cats.map((c) => toCategory(c, n.get(c.slug) ?? 0))
}
export const listCategories = cached(_categories, 'categories', [TAGS.catalog])

export async function getCategory(slug: string) {
  return (await listCategories()).find((c) => c.slug === slug) ?? null
}

/** All categories including inactive ones (staff). */
export async function listCategoriesAdmin(): Promise<(CategoryDTO & { total: number; live: number })[]> {
  await db()
  const [cats, counts] = await Promise.all([
    Category.find().sort({ sort: 1, name: 1 }).lean(),
    Product.aggregate<{ _id: string; total: number; live: number }>([{ $group: { _id: '$category', total: { $sum: 1 }, live: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } } } }]),
  ])
  const n = new Map(counts.map((c) => [c._id, c]))
  return cats.map((c) => ({ ...toCategory(c), total: n.get(c.slug)?.total ?? 0, live: n.get(c.slug)?.live ?? 0 }))
}

export interface SearchParams {
  q?: string
  category?: string
  brands?: string[]
  availability?: 'in_stock' | 'any'
  seasonal?: boolean
  min?: number
  max?: number
  sort?: 'featured' | 'price-asc' | 'price-desc' | 'newest' | 'name'
  page?: number
  pageSize?: number
}

async function _search(params: SearchParams) {
  const scope = await publicScope()
  const filter: Record<string, unknown> = { ...scope }
  if (params.category) filter.category = { $in: (scope.category.$in as string[]).filter((c) => c === params.category) }
  if (params.brands?.length) filter.brand = { $in: params.brands.slice(0, 20) }
  if (params.q?.trim()) {
    const rx = new RegExp(escapeRegex(params.q.trim().slice(0, 80)), 'i')
    filter.$or = [{ name: rx }, { brand: rx }, { summary: rx }, { sku: rx }]
  }
  if (params.min != null || params.max != null) filter.priceCents = { ...(params.min != null ? { $gte: Math.round(params.min * 100) } : {}), ...(params.max != null ? { $lte: Math.round(params.max * 100) } : {}) }
  if (params.availability === 'in_stock') filter.$expr = { $or: [{ $eq: ['$madeToOrder', true] }, { $gt: [{ $subtract: ['$inventory.onHand', '$inventory.reserved'] }, 0] }] }
  if (params.seasonal) {
    const promo = await promoPrices()
    filter._id = { $in: [...promo.keys()] }
  }
  const sort: Record<string, 1 | -1> =
    params.sort === 'price-asc' ? { priceCents: 1 } : params.sort === 'price-desc' ? { priceCents: -1 } : params.sort === 'newest' ? { publishedAt: -1 } : params.sort === 'name' ? { name: 1 } : { featured: -1, publishedAt: -1 }
  const pg = page(params.page, params.pageSize, 60)
  const [docs, total, brands] = await Promise.all([
    Product.find(filter).sort({ ...sort, _id: 1 }).skip(pg.skip).limit(pg.limit).lean<ProductDoc[]>(),
    Product.countDocuments(filter),
    Product.distinct('brand', scope),
  ])
  return { items: await mapPublic(docs), total, page: pg.page, pageSize: pg.pageSize, brands: (brands as string[]).filter(Boolean).sort() }
}
export const searchProducts = cached(_search, 'search', [TAGS.catalog], 120)

async function _product(slug: string) {
  const scope = await publicScope()
  const doc = await Product.findOne({ ...scope, slug }).lean<ProductDoc>()
  return doc ? (await mapPublic([doc]))[0] : null
}
export const getPublicProduct = cached(_product, 'product', [TAGS.catalog])

async function _featured() {
  const scope = await publicScope()
  return mapPublic(await Product.find({ ...scope, featured: true }).sort({ publishedAt: -1 }).limit(8).lean<ProductDoc[]>())
}
export const featuredProducts = cached(_featured, 'featured', [TAGS.catalog])

async function _seasonal() {
  const promo = await promoPrices()
  if (!promo.size) return []
  const scope = await publicScope()
  return mapPublic(await Product.find({ ...scope, _id: { $in: [...promo.keys()] } }).limit(4).lean<ProductDoc[]>())
}
export const seasonalProducts = cached(_seasonal, 'seasonal', [TAGS.catalog])

async function _related(slug: string, category: string) {
  const scope = await publicScope()
  return mapPublic(await Product.find({ ...scope, category, slug: { $ne: slug } }).limit(4).lean<ProductDoc[]>())
}
export const relatedProducts = cached(_related, 'related', [TAGS.catalog])

export async function productsInCategory(category: string, limit = 60) {
  return (await searchProducts({ category, pageSize: limit })).items
}

/** Sitemap: eligible product and category URLs only. */
async function _sitemap() {
  const scope = await publicScope()
  const [products, cats] = await Promise.all([Product.find(scope, { slug: 1, updatedAt: 1 }).lean(), Category.find({ active: true }, { slug: 1, updatedAt: 1 }).lean()])
  return { products: products.map((p) => ({ slug: p.slug, updatedAt: iso((p as { updatedAt?: Date }).updatedAt) })), categories: cats.map((c) => ({ slug: c.slug, updatedAt: iso((c as { updatedAt?: Date }).updatedAt) })) }
}
export const sitemapData = cached(_sitemap, 'sitemap', [TAGS.catalog])

/**
 * Authorized preview of any listing state: staff see everything; a supplier sees only its own.
 * Returns null for anyone else so the page responds 404.
 */
export async function getProductPreview(slug: string, actor: Actor | null): Promise<ProductDTO | null> {
  if (!actor) return null
  await db()
  const doc = await Product.findOne({ slug }).lean<ProductDoc>()
  if (!doc) return null
  const staff = actor.role === 'admin' || actor.role === 'support'
  if (!staff && !(actor.role === 'supplier' && actor.supplierId === String(doc.supplier))) return null
  const sup = await Supplier.findById(doc.supplier, SUP_FIELDS).lean<SupplierLite>()
  return toProductDTO(doc, sup, await promoPrices())
}
