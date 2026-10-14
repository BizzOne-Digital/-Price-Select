import 'server-only'
import { z } from 'zod'
import { assertCan, type Actor } from '../auth'
import { db } from '../db'
import { conflict, HttpError, notFound } from '../http'
import { Category } from '../models/catalog'
import { AuditEvent } from '../models/system'
import { audit, diff, invalidate, iso, TAGS } from './common'
import { listCategoriesAdmin } from './catalog'
import { cleanupUploads, parseUploadUrl } from './uploads'

const zImage = z
  .string()
  .trim()
  .max(500)
  .refine((s) => s === '' || !!parseUploadUrl(s) || /^https:\/\/images\.unsplash\.com\/[\w\-./?=&%]+$/.test(s), 'Upload the image through the image field.')

export const zCategory = z.object({
  name: z.string().trim().min(2).max(80),
  short: z.string().trim().min(2).max(40),
  description: z.string().trim().max(400).default(''),
  includes: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  image: zImage.default(''),
  imageAlt: z.string().trim().max(200).default(''),
  reviewLevel: z.enum(['standard', 'enhanced']),
  reviewNote: z.string().trim().max(300).default(''),
  requiredDocuments: z.array(z.string().trim().min(2).max(120)).max(12).default([]),
  active: z.boolean().default(true),
  sort: z.number().int().min(0).max(999).default(0),
})

export async function upsertCategory(actor: Actor, slug: string | null, input: unknown) {
  assertCan(actor, 'admin:products')
  if (actor.role !== 'admin') throw new HttpError(403, 'forbidden', 'Only administrators can edit categories.')
  const d = zCategory.partial().parse(input)
  await db()
  if (!slug) {
    const full = zCategory.parse(input)
    const newSlug = full.name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
    if (await Category.exists({ slug: newSlug })) throw conflict('A category with this name already exists.')
    await Category.create({ ...full, slug: newSlug })
    await audit(actor, 'category.create', { type: 'category', id: newSlug }, `Created category ${full.name}`)
    invalidate(TAGS.catalog)
    return (await listCategoriesAdmin()).find((c) => c.slug === newSlug)!
  }
  const c = await Category.findOne({ slug })
  if (!c) throw notFound('Category')
  const before = c.toObject() as unknown as Record<string, unknown>
  const oldImage = c.image
  c.set(d)
  await c.save()
  await audit(actor, 'category.update', { type: 'category', id: slug }, `Updated category ${c.name}`, diff(before, d as Record<string, unknown>))
  // Remove the replaced image only after the new reference is saved.
  if (d.image !== undefined && oldImage && oldImage !== d.image) await cleanupUploads(actor, [oldImage])
  invalidate(TAGS.catalog)
  return (await listCategoriesAdmin()).find((x) => x.slug === slug)!
}

export async function listAudit(actor: Actor, opts: { limit?: number; targetType?: string; targetId?: string } = {}) {
  assertCan(actor, 'admin:settings')
  await db()
  const rows = await AuditEvent.find({ ...(opts.targetType ? { targetType: opts.targetType } : {}), ...(opts.targetId ? { targetId: opts.targetId } : {}) })
    .sort({ at: -1 })
    .limit(Math.min(opts.limit ?? 50, 200))
    .lean()
  return rows.map((r) => ({ id: String(r._id), at: iso(r.at), who: r.actorName ?? 'System', role: r.actorRole ?? '', action: r.action, target: `${r.targetType ?? ''}:${r.targetId ?? ''}`, summary: r.summary ?? '' }))
}
