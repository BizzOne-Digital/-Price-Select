import 'server-only'
import { Schema, type InferSchemaType } from 'mongoose'
import { model } from './util'

// Orders hold immutable snapshots: product names, SKUs, supplier, prices, discounts and full
// addresses are copied at checkout so later catalog edits never rewrite history.

const AddressSnapshot = new Schema(
  { name: String, line1: String, line2: String, city: String, region: String, postal: String, country: String, phone: String },
  { _id: false },
)

const Line = new Schema(
  {
    lineId: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    slug: String,
    sku: String,
    name: String,
    brand: String,
    image: String,
    qty: { type: Number, required: true, min: 1 },
    /** Catalog list price per unit at checkout. */
    listPriceCents: { type: Number, required: true },
    /** Price per unit actually charged before membership discount (seasonal price when applicable). */
    unitPriceCents: { type: Number, required: true },
    /** Total membership discount for this line (all units). */
    discountCents: { type: Number, default: 0 },
    seasonal: { type: Boolean, default: false },
  },
  { _id: false },
)

export const FULFILLMENT_STATUSES = ['awaiting_payment', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'canceled', 'returned'] as const

const History = new Schema({ status: String, at: { type: Date, default: Date.now }, note: String, by: String }, { _id: false })

const Fulfillment = new Schema(
  {
    fid: { type: String, required: true },
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: String,
    status: { type: String, enum: FULFILLMENT_STATUSES, default: 'awaiting_payment' },
    lines: { type: [Line], default: [] },
    shippingCents: { type: Number, default: 0 },
    carrier: String,
    tracking: String,
    estimatedDelivery: Date,
    blindShip: { type: Boolean, default: true },
    acknowledgedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    history: { type: [History], default: [] },
  },
  { _id: false },
)

export const PAYMENT_STATUSES = ['pending', 'authorized', 'captured', 'partially_refunded', 'refunded', 'voided', 'failed'] as const

const OrderSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    customerUserId: { type: String, index: true },
    email: { type: String, required: true, lowercase: true },
    /** Guest orders: SHA-256 of a random access token emailed/shown once at checkout. */
    guestAccessHash: { type: String, select: false },
    placedAt: { type: Date, default: Date.now },
    status: { type: String, default: 'awaiting_payment' },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    currency: { type: String, default: 'USD' },
    fulfillments: { type: [Fulfillment], default: [] },
    totals: {
      subtotalCents: Number,
      discountCents: Number,
      shippingCents: Number,
      taxCents: Number,
      totalCents: Number,
    },
    pricing: { membershipTier: String, discountStacking: String, taxMode: String, taxRateBps: Number, shippingMode: String },
    shipTo: { type: AddressSnapshot, required: true },
    billTo: AddressSnapshot,
    payment: {
      provider: String,
      providerRef: String,
      authorizedCents: { type: Number, default: 0 },
      capturedCents: { type: Number, default: 0 },
      refundedCents: { type: Number, default: 0 },
      /** Refunds sent to the provider but not yet confirmed; counted against the refundable balance. */
      pendingRefundCents: { type: Number, default: 0 },
    },
    idempotencyKey: { type: String, unique: true, sparse: true },
    reservationExpiresAt: Date,
    canceledAt: Date,
    cancelReason: String,
    history: { type: [History], default: [] },
  },
  { timestamps: true },
)
OrderSchema.index({ customerUserId: 1, placedAt: -1 })
OrderSchema.index({ 'fulfillments.supplier': 1, placedAt: -1 })
OrderSchema.index({ status: 1, placedAt: -1 })
OrderSchema.index({ 'fulfillments.fid': 1 })
export const Order = model('Order', OrderSchema)
export type OrderDoc = InferSchemaType<typeof OrderSchema> & { _id: import('mongoose').Types.ObjectId }
export type FulfillmentDoc = OrderDoc['fulfillments'][number]
export type LineDoc = FulfillmentDoc['lines'][number]

const ReservationSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['active', 'committed', 'released'], default: 'active' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
)
// Expiry is processed explicitly (releaseExpiredReservations) so stock is restored; no TTL delete.
ReservationSchema.index({ status: 1, expiresAt: 1 })
export const Reservation = model('Reservation', ReservationSchema)

const PaymentOperationSchema = new Schema(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    userId: String,
    kind: { type: String, enum: ['authorize', 'capture', 'void', 'refund', 'membership'], required: true },
    amountCents: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
    provider: String,
    providerRef: String,
    idempotencyKey: { type: String, required: true, unique: true },
    error: String,
    case: { type: Schema.Types.ObjectId, ref: 'Case' },
    by: String,
    byName: String,
    reason: String,
  },
  { timestamps: true },
)
export const PaymentOperation = model('PaymentOperation', PaymentOperationSchema)

/** Webhook de-duplication: one row per provider event id. */
const WebhookEventSchema = new Schema({ provider: String, eventId: String, receivedAt: { type: Date, default: Date.now } })
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true })
export const WebhookEvent = model('WebhookEvent', WebhookEventSchema)

export const CASE_STATUSES = ['open', 'awaiting_supplier', 'approved', 'in_transit', 'escalated', 'resolved', 'declined'] as const

const CaseSchema = new Schema(
  {
    number: { type: String, required: true, unique: true },
    kind: { type: String, enum: ['return', 'support'], required: true },
    type: { type: String, enum: ['return', 'damage', 'cancellation', 'replacement', 'support'], required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    orderNumber: String,
    customerUserId: { type: String, index: true },
    customerName: String,
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', index: true },
    fid: String,
    lines: { type: [{ _id: false, lineId: String, name: String, qty: Number }], default: [] },
    subject: { type: String, required: true },
    reason: String,
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    status: { type: String, enum: CASE_STATUSES, default: 'open' },
    assigneeId: String,
    assigneeName: String,
    openedAt: { type: Date, default: Date.now },
    slaDueAt: Date,
    supplierRespondedAt: Date,
    messages: {
      type: [
        {
          authorId: String,
          authorName: String,
          role: { type: String, enum: ['customer', 'supplier', 'support', 'admin', 'system'] },
          /** customer: customer + staff (+ supplier when the case has one); supplier: supplier + staff; staff: staff only. */
          visibility: { type: String, enum: ['customer', 'supplier', 'staff'], required: true },
          text: String,
          attachments: [{ type: Schema.Types.ObjectId, ref: 'PrivateAsset' }],
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    logistics: { labelIssuedAt: Date, receivedAt: Date },
    resolution: {
      outcome: { type: String, enum: ['refund', 'replacement', 'store_credit', 'none'] },
      summary: String,
      refundCents: Number,
      refundOperation: { type: Schema.Types.ObjectId, ref: 'PaymentOperation' },
      refundStatus: { type: String, enum: ['not_applicable', 'pending', 'succeeded', 'failed', 'unavailable'] },
      by: String,
      byName: String,
      at: Date,
    },
  },
  { timestamps: true },
)
CaseSchema.index({ kind: 1, status: 1, openedAt: -1 })
CaseSchema.index({ order: 1 })
export const Case = model('Case', CaseSchema)
export type CaseDoc = InferSchemaType<typeof CaseSchema> & { _id: import('mongoose').Types.ObjectId }
