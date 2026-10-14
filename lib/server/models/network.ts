import 'server-only'
import { Schema, type InferSchemaType } from 'mongoose'
import { model } from './util'

const ReviewEvent = new Schema(
  { action: { type: String, required: true }, by: String, byName: String, at: { type: Date, default: Date.now }, reason: String },
  { _id: false },
)

export const SUPPLIER_STATUSES = ['draft', 'applied', 'under_review', 'approved', 'suspended', 'rejected'] as const

const SupplierSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    legalName: String,
    businessType: String,
    website: String,
    region: { type: String, default: '' },
    categories: { type: [String], default: [] },
    status: { type: String, enum: SUPPLIER_STATUSES, default: 'draft' },
    statusReason: String,
    integration: { type: String, enum: ['API', 'EDI', 'CSV', 'Manual'], default: 'Manual' },
    contact: { name: String, email: { type: String, lowercase: true, trim: true }, phone: String },
    tax: {
      country: String,
      idLast4: String,
      /** Full tax ID. Never selected by default and never returned by any API. */
      id: { type: String, select: false },
    },
    shipping: { shipFrom: String, carriers: [String], handling: String, blindShip: Boolean },
    declarations: { authentic: Boolean, terms: Boolean, at: Date },
    documents: {
      type: [
        {
          label: String,
          kind: { type: String, enum: ['registration', 'insurance', 'certificate', 'tax', 'agreement', 'other'] },
          assetId: { type: Schema.Types.ObjectId, ref: 'PrivateAsset' },
          status: { type: String, enum: ['pending', 'on_file', 'expired', 'rejected'], default: 'pending' },
          reviewedBy: String,
          reviewedAt: Date,
        },
      ],
      default: [],
    },
    review: { type: [ReviewEvent], default: [] },
    /** Supplier-specific exclusion from membership discounts (terms: "subject to supplier-specific exclusions"). */
    membershipExcluded: { type: Boolean, default: false },
    feed: { status: { type: String, enum: ['healthy', 'delayed', 'failed', 'manual'], default: 'manual' }, lastSync: Date },
    appliedAt: Date,
    approvedAt: Date,
  },
  { timestamps: true },
)
SupplierSchema.index({ status: 1 })
export const Supplier = model('Supplier', SupplierSchema)
export type SupplierDoc = InferSchemaType<typeof SupplierSchema> & { _id: import('mongoose').Types.ObjectId }

const Address = new Schema({
  label: String,
  name: { type: String, required: true },
  line1: { type: String, required: true },
  line2: String,
  city: { type: String, required: true },
  region: { type: String, default: '' },
  postal: { type: String, default: '' },
  country: { type: String, required: true },
  phone: String,
  isDefault: { type: Boolean, default: false },
})

export const MEMBERSHIP_TIERS = ['member', 'member_plus'] as const

const CustomerSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    phone: String,
    addresses: { type: [Address], default: [] },
    saved: { type: [Schema.Types.ObjectId], default: [] },
    membership: {
      tier: { type: String, enum: [...MEMBERSHIP_TIERS, null], default: null },
      status: { type: String, enum: ['none', 'pending_payment', 'active', 'canceled', 'expired'], default: 'none' },
      startedAt: Date,
      renewsAt: Date,
      cancelAtPeriodEnd: { type: Boolean, default: false },
      paymentOperationId: Schema.Types.ObjectId,
    },
    marketingOptIn: { type: Boolean, default: false },
  },
  { timestamps: true },
)
export const Customer = model('Customer', CustomerSchema)
export type CustomerDoc = InferSchemaType<typeof CustomerSchema>

const CartSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    items: { type: [{ _id: false, product: { type: Schema.Types.ObjectId, ref: 'Product' }, qty: Number, addedAt: { type: Date, default: Date.now } }], default: [] },
  },
  { timestamps: true },
)
export const Cart = model('Cart', CartSchema)
