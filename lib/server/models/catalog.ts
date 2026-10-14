import 'server-only'
import { Schema, type InferSchemaType } from 'mongoose'
import { model } from './util'

const ReviewEvent = new Schema(
  { action: { type: String, required: true }, by: String, byName: String, at: { type: Date, default: Date.now }, reason: String },
  { _id: false },
)

const CategorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    short: { type: String, required: true },
    description: { type: String, default: '' },
    includes: { type: [String], default: [] },
    image: { type: String, default: '' },
    imageAlt: { type: String, default: '' },
    reviewLevel: { type: String, enum: ['standard', 'enhanced'], default: 'standard' },
    reviewNote: String,
    /** Document labels every listing in this category must carry before publication. */
    requiredDocuments: { type: [String], default: [] },
    sort: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)
export const Category = model('Category', CategorySchema)
export type CategoryDoc = InferSchemaType<typeof CategorySchema>

const ComplianceDoc = new Schema({
  label: { type: String, required: true },
  required: { type: Boolean, default: true },
  /** `on_file` is only ever set by a staff review of an attached private asset (or the dev seed). */
  status: { type: String, enum: ['required', 'pending', 'on_file', 'rejected'], default: 'required' },
  assetId: { type: Schema.Types.ObjectId, ref: 'PrivateAsset' },
  reviewedBy: String,
  reviewedByName: String,
  reviewedAt: Date,
  note: String,
})

export const PRODUCT_STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'flagged', 'suspended', 'withdrawn'] as const

const ProductSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    sku: { type: String, required: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    /** Integer minor units (cents). */
    priceCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    currency: { type: String, default: 'USD' },
    images: { type: [{ _id: false, src: String, alt: String }], default: [] },
    summary: { type: String, default: '' },
    description: { type: String, default: '' },
    specs: { type: [{ _id: false, label: String, value: String }], default: [] },
    madeToOrder: { type: Boolean, default: false },
    inventory: {
      onHand: { type: Number, default: 0, min: 0 },
      reserved: { type: Number, default: 0, min: 0 },
      updatedAt: Date,
    },
    handlingDays: { type: Number, default: 2 },
    deliveryEstimate: { type: String, default: '' },
    weightKg: { type: Number, default: 0 },
    dimensions: { type: String, default: '' },
    upc: String,
    compliance: { type: [ComplianceDoc], default: [] },
    /** Supplier-submitted assets awaiting staff review (private until an admin publishes images). */
    stagedImages: { type: [{ _id: false, assetId: Schema.Types.ObjectId, alt: String }], default: [] },
    supportingDocs: { type: [Schema.Types.ObjectId], default: [] },
    tag: { type: String, enum: ['Selected', 'New arrival', 'Seasonal', 'Limited', null] },
    featured: { type: Boolean, default: false },
    seasonal: { type: Boolean, default: false },
    membershipEligible: { type: Boolean, default: true },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'draft' },
    statusReason: String,
    review: {
      enhancedSignoff: { by: String, byName: String, at: Date, note: String },
      history: { type: [ReviewEvent], default: [] },
    },
    submittedAt: Date,
    publishedAt: Date,
  },
  { timestamps: true, optimisticConcurrency: true },
)
ProductSchema.index({ supplier: 1, sku: 1 }, { unique: true })
ProductSchema.index({ status: 1, category: 1 })
ProductSchema.index({ status: 1, featured: 1 })
export const Product = model('Product', ProductSchema)
export type ProductDoc = InferSchemaType<typeof ProductSchema> & { _id: import('mongoose').Types.ObjectId }
