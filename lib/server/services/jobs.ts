import 'server-only'
import { db } from '../db'
import { Customer } from '../models/network'
import { releaseExpiredReservations } from './commerce'
import { processOutbox } from './notify'
import { cleanupUploadSessions } from './uploads'

/** Scheduled maintenance. Every step is idempotent and safe to run concurrently. */
export async function runJobs() {
  await db()
  const reservations = await releaseExpiredReservations()
  const uploads = await cleanupUploadSessions()
  // Memberships past their paid period end; renewal charges need a payment provider (not automated).
  const expired = await Customer.updateMany({ 'membership.status': 'active', 'membership.renewsAt': { $lt: new Date() } }, { $set: { 'membership.status': 'expired' } })
  const outbox = await processOutbox({ limit: 50 })
  return { ok: true, reservations, uploads, memberships: { expired: expired.modifiedCount }, outbox }
}
