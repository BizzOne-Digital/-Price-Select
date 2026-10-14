import 'server-only'
import { revalidateTag, unstable_cache } from 'next/cache'
import type { ClientSession } from 'mongoose'
import type { Actor } from '../auth'
import { db } from '../db'
import { AuditEvent, Counter } from '../models/system'

export const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : '')
export const isoOpt = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : undefined)
export const dollars = (cents: number | null | undefined) => (cents ? cents / 100 : 0)

/** Atomic sequence (order and case numbers). */
export async function nextSeq(name: string, start: number, session?: ClientSession) {
  await db()
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after', session }).lean()
  return start + (doc!.seq as number)
}

export async function audit(actor: Pick<Actor, 'id' | 'name' | 'role'> | null, action: string, target: { type: string; id: string }, summary: string, changes?: unknown, session?: ClientSession) {
  await AuditEvent.create(
    [{ actorId: actor?.id ?? 'system', actorName: actor?.name ?? 'System', actorRole: actor?.role ?? 'system', action, targetType: target.type, targetId: target.id, summary, changes }],
    { session },
  )
}

/** Shallow diff of allow-listed fields for the audit log. */
export function diff(before: Record<string, unknown>, after: Record<string, unknown>) {
  const out: Record<string, { from: unknown; to: unknown }> = {}
  for (const k of Object.keys(after)) if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) out[k] = { from: before[k], to: after[k] }
  return out
}

export const TAGS = { catalog: 'catalog', content: 'content', settings: 'settings' } as const

const inNext = () => !process.env.VITEST

/** Cache a public read across requests; invalidated by `invalidate(tag)` after mutations. */
export function cached<A extends unknown[], R>(fn: (...a: A) => Promise<R>, key: string, tags: string[], revalidate = 300) {
  if (!inNext()) return fn
  return unstable_cache(fn, [key], { tags, revalidate })
}

export function invalidate(...tags: string[]) {
  if (!inNext()) return
  for (const t of tags) {
    try {
      revalidateTag(t, { expire: 0 })
    } catch {
      // Outside a request scope (scripts); nothing cached to invalidate.
    }
  }
}

export const page = (p?: number, size?: number, max = 100) => {
  const pageSize = Math.min(Math.max(size ?? 24, 1), max)
  const n = Math.max(p ?? 1, 1)
  return { skip: (n - 1) * pageSize, limit: pageSize, page: n, pageSize }
}
