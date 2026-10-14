import 'server-only'
import { z } from 'zod'
import type { Actor } from '../auth'
import { db } from '../db'
import { badRequest, notFound, toCents } from '../http'
import { Content, Settings } from '../models/system'
import { Product } from '../models/catalog'
import { audit, cached, diff, invalidate, iso, TAGS } from './common'
import { SITE, TO_CONFIRM } from '@/lib/site'
import { TERMS, TERMS_INTRO } from '@/lib/terms'

// Persisted operational settings. Each section is validated on write and merged over defaults on
// read, so a new section never breaks an older document.

export const NOTIFICATION_EVENTS = ['order_confirmed', 'order_shipped', 'order_delayed', 'order_delivered', 'order_canceled', 'return_approved', 'refund_initiated', 'supplier_ack', 'support_escalation'] as const

const money = z.number().finite().min(0).max(1_000_000)
const pct = z.number().finite().min(0).max(100)

export const SECTIONS = {
  targets: z.object({
    items: z
      .array(z.object({ key: z.enum(['ack', 'tracking', 'response', 'inventory']), label: z.string().trim().min(1).max(80), amount: z.number().positive().max(1000), unit: z.enum(['hours', 'business_days', 'days']), detail: z.string().trim().max(200) }))
      .length(4),
    calendar: z.object({ timezone: z.string().trim().min(1).max(60).refine((tz) => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false } }, 'Unknown time zone'), businessDays: z.array(z.number().int().min(0).max(6)).min(1).max(7) }),
  }),
  shipping: z.object({
    carriers: z.string().trim().max(200),
    mode: z.enum(['not_configured', 'flat_per_shipment']),
    flatRate: money.nullable(),
    freeThreshold: money.nullable(),
    freight: z.enum(['supplier', 'flat']),
    packaging: z.enum(['blind', 'supplier']),
  }).refine((s) => s.mode !== 'flat_per_shipment' || s.flatRate != null, { message: 'Set a flat rate to enable flat shipping.', path: ['flatRate'] }),
  tax: z.object({ mode: z.enum(['not_configured', 'manual_rate', 'none_confirmed']), ratePercent: pct.nullable() }).refine((t) => t.mode !== 'manual_rate' || t.ratePercent != null, { message: 'Enter a rate for manual tax.', path: ['ratePercent'] }),
  fees: z.object({ commissionPercent: pct.nullable(), marginPercent: pct.nullable(), processingPassThrough: z.string().trim().max(120) }),
  returns: z.object({
    changeOfMind: z.enum(['', 'Customer', 'Supplier', 'Price-Select']),
    damaged: z.enum(['', 'Supplier', 'Price-Select', 'Per supplier agreement']),
    windows: z.record(z.string().max(80), z.number().int().min(0).max(365).nullable()),
  }),
  notifications: z.record(z.enum(NOTIFICATION_EVENTS), z.object({ email: z.boolean(), inApp: z.boolean() })),
  checklist: z.record(z.string().max(80), z.object({ done: z.boolean() })),
  discounts: z.object({ stacking: z.enum(['best_of', 'stack']) }),
} as const
export type SectionKey = keyof typeof SECTIONS

const promotionInput = z.object({
  active: z.boolean(),
  headline: z.string().trim().min(1).max(120),
  description: z.string().trim().max(400),
  items: z.array(z.object({ productId: z.string().regex(/^[a-f\d]{24}$/i), price: money })).max(4),
})

export type SettingsData = {
  targets: z.infer<(typeof SECTIONS)['targets']>
  shipping: z.infer<(typeof SECTIONS)['shipping']>
  tax: z.infer<(typeof SECTIONS)['tax']>
  fees: z.infer<(typeof SECTIONS)['fees']>
  returns: z.infer<(typeof SECTIONS)['returns']>
  notifications: Partial<z.infer<(typeof SECTIONS)['notifications']>>
  checklist: Record<string, { done: boolean; byName?: string; at?: string }>
  discounts: z.infer<(typeof SECTIONS)['discounts']>
  promotion: { active: boolean; headline: string; description: string; items: { productId: string; priceCents: number }[] }
}

export const DEFAULT_SETTINGS: SettingsData = {
  targets: {
    items: [
      { key: 'ack', label: 'Supplier order acknowledgment', amount: 1, unit: 'business_days', detail: 'Supplier confirms each routed order.' },
      { key: 'tracking', label: 'Tracking upload after shipment', amount: 24, unit: 'hours', detail: 'Carrier and tracking number submitted after dispatch.' },
      { key: 'response', label: 'Escalated support response', amount: 1, unit: 'business_days', detail: 'Response to escalated customer requests.' },
      { key: 'inventory', label: 'Inventory updates', amount: 1, unit: 'days', detail: 'More frequent where API or EDI feeds are connected.' },
    ],
    // Time zone and working days are placeholders until confirmed (launch checklist).
    calendar: { timezone: 'UTC', businessDays: [1, 2, 3, 4, 5] },
  },
  shipping: { carriers: '', mode: 'not_configured', flatRate: null, freeThreshold: null, freight: 'supplier', packaging: 'blind' },
  tax: { mode: 'not_configured', ratePercent: null },
  fees: { commissionPercent: null, marginPercent: null, processingPassThrough: '' },
  returns: { changeOfMind: '', damaged: '', windows: {} },
  notifications: Object.fromEntries(NOTIFICATION_EVENTS.map((e) => [e, { email: true, inApp: true }])),
  checklist: Object.fromEntries([...TO_CONFIRM, 'Discount stacking (seasonal + membership)', 'Business-day calendar and time zone'].map((t) => [t, { done: false }])),
  discounts: { stacking: 'best_of' },
  promotion: { active: false, headline: 'Buy summer in winter. Save.', description: 'Price-Select, just for you: three to four products chosen for the season ahead, at special off-season pricing for a limited window.', items: [] },
}

async function load(): Promise<SettingsData> {
  await db()
  const doc = await Settings.findOne({ key: 'global' }).lean()
  const d = (doc?.data ?? {}) as Partial<SettingsData>
  const out = { ...DEFAULT_SETTINGS } as SettingsData
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof SettingsData)[]) if (d[k] != null) (out as Record<string, unknown>)[k] = { ...(DEFAULT_SETTINGS[k] as object), ...(d[k] as object) }
  return out
}

/** Uncached read for staff and for pricing decisions. */
export const getSettings = load
/** Cached read for public pages. */
export const getPublicSettings = cached(load, 'settings', [TAGS.settings])

async function write(actor: Actor, key: keyof SettingsData, value: unknown, summary: string) {
  const before = await load()
  await Settings.updateOne({ key: 'global' }, { $set: { [`data.${key}`]: value }, $inc: { rev: 1 } }, { upsert: true })
  await audit(actor, 'settings.update', { type: 'settings', id: key }, summary, diff({ v: before[key] }, { v: value }))
  invalidate(TAGS.settings, TAGS.catalog)
}

export async function updateSection(actor: Actor, key: SectionKey, input: unknown) {
  const parsed = SECTIONS[key].parse(input) as Record<string, unknown>
  let value: unknown = parsed
  if (key === 'checklist') {
    const prev = (await load()).checklist
    value = Object.fromEntries(
      Object.entries(parsed as Record<string, { done: boolean }>).map(([k, v]) => [k, v.done === prev[k]?.done ? prev[k] : { done: v.done, byName: v.done ? actor.name : undefined, at: v.done ? new Date().toISOString() : undefined }]),
    )
  }
  await write(actor, key, value, `Updated ${key} settings`)
  return (await load())[key]
}

/** Seasonal campaign: 3–4 eligible published products, each with 0 < seasonal price < regular price. */
export async function updatePromotion(actor: Actor, input: unknown) {
  const p = promotionInput.parse(input)
  if (p.active && (p.items.length < 3 || p.items.length > 4)) throw badRequest('An active campaign needs three or four products.')
  if (new Set(p.items.map((i) => i.productId)).size !== p.items.length) throw badRequest('Each product can appear once.')
  const products = await Product.find({ _id: { $in: p.items.map((i) => i.productId) } }).populate<{ supplier: { status: string } }>('supplier', 'status').lean()
  const errors: { productId: string; message: string }[] = []
  const items = p.items.map((i) => {
    const prod = products.find((x) => String(x._id) === i.productId)
    const cents = toCents(i.price)
    if (!prod) errors.push({ productId: i.productId, message: 'Product not found.' })
    else if (prod.status !== 'published' || prod.supplier?.status !== 'approved') errors.push({ productId: i.productId, message: `${prod.name} is not a published listing from an approved supplier.` })
    else if (!(cents > 0 && cents < prod.priceCents)) errors.push({ productId: i.productId, message: `${prod.name}: special price must be above $0 and below the regular price.` })
    return { productId: i.productId, priceCents: cents }
  })
  if (errors.length) throw badRequest('Campaign has invalid products.', errors)
  const value = { active: p.active, headline: p.headline, description: p.description, items }
  await write(actor, 'promotion', value, `${p.active ? 'Saved active' : 'Saved inactive'} seasonal campaign with ${items.length} products`)
  return value
}

// ---- Policies and storefront content: draft → explicit publish ----

export const CONTENT_KEYS = ['policy:terms', 'policy:privacy', 'policy:returns', 'content:site'] as const
export type ContentKey = (typeof CONTENT_KEYS)[number]

const siteContent = z.object({
  homeHeadline: z.string().trim().min(1).max(120),
  campaignHeadline: z.string().trim().min(1).max(120),
  campaignDescription: z.string().trim().max(400),
  pricingNotice: z.string().trim().min(1).max(200),
  contactEmail: z.email().max(200),
})
const policyContent = z.object({ body: z.string().trim().max(50_000) })
const schemaFor = (k: ContentKey) => (k === 'content:site' ? siteContent : policyContent)

export const DEFAULT_SITE_CONTENT: z.infer<typeof siteContent> = {
  homeHeadline: SITE.tagline,
  campaignHeadline: DEFAULT_SETTINGS.promotion.headline,
  campaignDescription: DEFAULT_SETTINGS.promotion.description,
  pricingNotice: 'Prices exclude applicable taxes and shipping.',
  contactEmail: SITE.email,
}

/** Client-supplied terms wording, used until an administrator publishes a replacement. */
export const termsAsText = () => [TERMS_INTRO, ...TERMS.map((s) => [s.title, s.text, ...(s.items ?? []).map(([l, t]) => `${l}: ${t}`)].filter(Boolean).join('\n'))].join('\n\n')

export async function getContentAdmin(key: ContentKey) {
  await db()
  const c = await Content.findOne({ key }).lean()
  return {
    key,
    draft: c?.draft?.data ?? null,
    draftBy: c?.draft?.byName,
    draftAt: c?.draft?.at ? iso(c.draft.at) : undefined,
    published: c?.published?.data ?? null,
    version: c?.published?.version ?? 0,
    publishedBy: c?.published?.byName,
    publishedAt: c?.published?.at ? iso(c.published.at) : undefined,
  }
}

export async function saveDraft(actor: Actor, key: ContentKey, input: unknown) {
  const data = schemaFor(key).parse(input)
  await db()
  await Content.updateOne({ key }, { $set: { draft: { data, by: actor.id, byName: actor.name, at: new Date() } } }, { upsert: true })
  await audit(actor, 'content.draft', { type: 'content', id: key }, `Saved draft of ${key}`)
  return getContentAdmin(key)
}

export async function publishContent(actor: Actor, key: ContentKey) {
  await db()
  const c = await Content.findOne({ key })
  if (!c?.draft?.data) throw notFound('Draft')
  const version = (c.published?.version ?? 0) + 1
  const entry = { data: c.draft.data, version, by: actor.id, byName: actor.name, at: new Date() }
  await Content.updateOne({ key }, { $set: { published: entry }, $push: { history: { $each: [entry], $slice: -20 } } })
  await audit(actor, 'content.publish', { type: 'content', id: key }, `Published ${key} version ${version}`)
  invalidate(TAGS.content)
  return getContentAdmin(key)
}

async function loadPublished(key: ContentKey) {
  await db()
  const c = await Content.findOne({ key }, { published: 1 }).lean()
  return (c?.published?.data as Record<string, unknown> | undefined) ?? null
}
const publishedCached = cached(loadPublished, 'content', [TAGS.content])

export async function getSiteContent() {
  try {
    const p = await publishedCached('content:site')
    return { ...DEFAULT_SITE_CONTENT, ...(p ?? {}) } as typeof DEFAULT_SITE_CONTENT
  } catch {
    return DEFAULT_SITE_CONTENT
  }
}

/** Published policy body, or null when the client-supplied default should be shown. */
export async function getPublishedPolicy(slug: 'terms' | 'privacy' | 'returns') {
  const p = await publishedCached(`policy:${slug}`)
  return (p?.body as string | undefined) ?? null
}
