import 'server-only'
import type { ClientSession, Types } from 'mongoose'
import { renderEmail, type EmailData, type EmailTemplateId } from '@/lib/emails'
import { siteUrl } from '../env'
import { email } from '../integrations'
import type { Actor } from '../auth'
import { db } from '../db'
import { Notification, OutboxJob } from '../models/system'
import { iso } from './common'
import type { Notification as NotificationDTO } from '@/lib/types'

/** Recipient-scoped in-app notification. */
export async function notify(
  to: { userId?: string; role?: 'admin' | 'support'; supplier?: Types.ObjectId | string },
  n: { event: string; title: string; body?: string; href?: string },
  session?: ClientSession,
) {
  await Notification.create([{ ...to, ...n }], { session })
}

/** Staff notifications go to both admin and support queues. */
export async function notifyStaff(n: { event: string; title: string; body?: string; href?: string }, session?: ClientSession) {
  await Notification.create([{ role: 'admin', ...n }, { role: 'support', ...n }], { session, ordered: true })
}

function scopeFilter(actor: Actor) {
  if (actor.role === 'admin' || actor.role === 'support') return { $or: [{ role: actor.role }, { userId: actor.id }] }
  if (actor.role === 'supplier' && actor.supplierId) return { $or: [{ supplier: actor.supplierId }, { userId: actor.id }] }
  return { userId: actor.id }
}

export async function listNotifications(actor: Actor, limit = 30): Promise<NotificationDTO[]> {
  await db()
  const rows = await Notification.find(scopeFilter(actor)).sort({ at: -1 }).limit(limit).lean()
  return rows.map((r) => ({ id: String(r._id), event: r.event, title: r.title, body: r.body ?? '', at: iso(r.at), read: (r.readBy ?? []).includes(actor.id), href: r.href ?? undefined }))
}

export async function markNotificationsRead(actor: Actor, ids: string[] | 'all') {
  await db()
  const filter = ids === 'all' ? scopeFilter(actor) : { $and: [scopeFilter(actor), { _id: { $in: ids } }] }
  await Notification.updateMany(filter, { $addToSet: { readBy: actor.id } })
}

/**
 * Queue a transactional email in the outbox and, when an email provider is configured, attempt
 * delivery immediately (awaited). Without a provider the job stays `blocked` and the caller is told
 * nothing was sent.
 */
export async function sendTransactional<K extends EmailTemplateId>(m: { template: K; to: string; key: string; payload: EmailData[K] }, session?: ClientSession) {
  await db()
  const configured = !!email()
  await OutboxJob.updateOne(
    { idempotencyKey: m.key },
    { $setOnInsert: { kind: 'email', template: m.template, to: m.to, payload: m.payload, status: configured ? 'pending' : 'blocked', lastError: configured ? undefined : 'email_not_configured' } },
    { upsert: true, session },
  )
  if (!configured || session) return { sent: false, queued: true, reason: configured ? 'queued' : 'email_not_configured' }
  const r = await processOutbox({ key: m.key })
  return { sent: r.sent > 0, queued: true, reason: r.sent > 0 ? 'sent' : 'send_failed' }
}

/** Deliver pending outbox jobs. Called by the job runner and right after enqueueing. */
export async function processOutbox(opts: { key?: string; limit?: number } = {}) {
  await db()
  const adapter = email()
  if (!adapter) return { sent: 0, failed: 0, skipped: 'email_not_configured' as const }
  // Jobs queued while email was unconfigured become eligible once a provider is configured.
  await OutboxJob.updateMany({ status: 'blocked', lastError: 'email_not_configured' }, { $set: { status: 'pending', nextAttemptAt: new Date() } })
  let sent = 0
  let failed = 0
  for (let i = 0; i < (opts.limit ?? 25); i++) {
    const job = await OutboxJob.findOneAndUpdate(
      { status: 'pending', nextAttemptAt: { $lte: new Date() }, ...(opts.key ? { idempotencyKey: opts.key } : {}) },
      { $inc: { attempts: 1 }, $set: { nextAttemptAt: new Date(Date.now() + 5 * 60_000) } },
      { returnDocument: 'after' },
    )
    if (!job) break
    const { subject, html } = renderEmail(job.template as EmailTemplateId, job.payload as never)
    const r = await adapter.send({ to: job.to!, subject, html: html.replaceAll('%BASE%', siteUrl()), idempotencyKey: job.idempotencyKey })
    if (r.ok) {
      sent++
      await OutboxJob.updateOne({ _id: job._id }, { $set: { status: 'sent', lastError: undefined } })
    } else {
      failed++
      const dead = job.attempts >= 6
      await OutboxJob.updateOne({ _id: job._id }, { $set: { status: dead ? 'failed' : 'pending', lastError: (r.error ?? 'send failed').slice(0, 300), nextAttemptAt: new Date(Date.now() + 2 ** job.attempts * 60_000) } })
    }
    if (opts.key) break
  }
  return { sent, failed }
}
