import 'server-only'
import { Schema } from 'mongoose'
import { model } from './util'

/** Single settings document (`key: 'global'`). Section shapes are validated in services/settings. */
const SettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    data: { type: Schema.Types.Mixed, default: {} },
    rev: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false },
)
export const Settings = model('Settings', SettingsSchema)

/** Policy and storefront content with separate draft and published versions. */
const ContentSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    draft: { data: Schema.Types.Mixed, by: String, byName: String, at: Date },
    published: { data: Schema.Types.Mixed, version: Number, by: String, byName: String, at: Date },
    history: { type: [{ _id: false, version: Number, data: Schema.Types.Mixed, by: String, byName: String, at: Date }], default: [] },
  },
  { timestamps: true, minimize: false },
)
export const Content = model('Content', ContentSchema)

const AuditSchema = new Schema({
  actorId: String,
  actorName: String,
  actorRole: String,
  action: { type: String, required: true },
  targetType: String,
  targetId: String,
  summary: String,
  changes: Schema.Types.Mixed,
  at: { type: Date, default: Date.now, index: true },
})
AuditSchema.index({ targetType: 1, targetId: 1, at: -1 })
export const AuditEvent = model('AuditEvent', AuditSchema)

/** Notifications are addressed to a user, a whole staff role, or a supplier's users. */
const NotificationSchema = new Schema({
  userId: { type: String, index: true },
  role: { type: String, enum: ['admin', 'support', null] },
  supplier: { type: Schema.Types.ObjectId, index: true },
  event: { type: String, required: true },
  title: { type: String, required: true },
  body: String,
  href: String,
  readBy: { type: [String], default: [] },
  at: { type: Date, default: Date.now },
})
NotificationSchema.index({ role: 1, at: -1 })
export const Notification = model('Notification', NotificationSchema)

/** Persistent outbox for side effects (email). Processed by the job runner, never fire-and-forget. */
const OutboxSchema = new Schema(
  {
    kind: { type: String, enum: ['email'], required: true },
    template: String,
    to: String,
    payload: Schema.Types.Mixed,
    status: { type: String, enum: ['pending', 'sent', 'failed', 'blocked'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: String,
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
)
OutboxSchema.index({ status: 1, nextAttemptAt: 1 })
export const OutboxJob = model('OutboxJob', OutboxSchema)

const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } })
export const Counter = model('Counter', CounterSchema)

/** Fixed-window rate limit buckets, removed by TTL after the window ends. */
const RateLimitSchema = new Schema({ key: { type: String, required: true, unique: true }, count: Number, expiresAt: Date })
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
export const RateBucket = model('RateBucket', RateLimitSchema)
