import 'server-only'
import mongoose from 'mongoose'
import type { Role } from '@/lib/types'
import { getAuth, type Actor } from '../auth'
import { db } from '../db'
import { conflict, HttpError, notFound } from '../http'
import { audit } from './common'

// Better Auth owns the `user`, `session` and `account` collections. These helpers read them for
// display names and perform the few privileged writes Better Auth intentionally does not expose
// (role, status, supplier membership).

type UserRow = { _id: mongoose.Types.ObjectId; name: string; email: string; role?: Role; status?: string; supplierId?: string; createdAt?: Date }

export async function users() {
  const m = await db()
  return m.connection.db!.collection<UserRow>('user')
}

const toOid = (id: string) => (/^[a-f\d]{24}$/i.test(id) ? new mongoose.Types.ObjectId(id) : null)

export async function namesFor(ids: (string | undefined | null)[]) {
  const oids = [...new Set(ids.filter(Boolean) as string[])].map(toOid).filter(Boolean) as mongoose.Types.ObjectId[]
  if (!oids.length) return new Map<string, string>()
  const rows = await (await users()).find({ _id: { $in: oids } }, { projection: { name: 1 } }).toArray()
  return new Map(rows.map((r) => [String(r._id), r.name]))
}

export async function getUser(id: string) {
  const oid = toOid(id)
  return oid ? (await users()).findOne({ _id: oid }, { projection: { name: 1, email: 1, role: 1, status: 1, supplierId: 1, createdAt: 1 } }) : null
}

export async function staffList() {
  const rows = await (await users()).find({ role: { $in: ['admin', 'support'] }, status: { $ne: 'suspended' } }, { projection: { name: 1, role: 1 } }).toArray()
  return rows.map((r) => ({ id: String(r._id), name: r.name, role: r.role }))
}

/** Suspend or reinstate an account. Suspension also revokes every session immediately. */
export async function setUserStatus(actor: Actor, userId: string, status: 'active' | 'suspended', reason?: string) {
  const oid = toOid(userId)
  if (!oid) throw notFound('User')
  if (userId === actor.id) throw conflict('You cannot change the status of your own account.')
  const col = await users()
  const u = await col.findOne({ _id: oid })
  if (!u) throw notFound('User')
  if (u.role === 'admin' && actor.role !== 'admin') throw new HttpError(403, 'forbidden', 'Only administrators can change administrator accounts.')
  await col.updateOne({ _id: oid }, { $set: { status, updatedAt: new Date() } })
  if (status === 'suspended') await (await db()).connection.db!.collection('session').deleteMany({ userId: { $in: [oid, userId] } as never })
  await audit(actor, status === 'suspended' ? 'user.suspend' : 'user.reinstate', { type: 'user', id: userId }, `${status === 'suspended' ? 'Suspended' : 'Reinstated'} ${u.name}${reason ? `: ${reason}` : ''}`)
}

/**
 * Create an account with a server-assigned role. Used by the staff bootstrap script and by the
 * supplier application. Public sign-up always produces customers (role is `input: false`).
 */
export async function createAccount(input: { name: string; email: string; password: string; role: Role; supplierId?: string }) {
  const auth = await getAuth()
  const email = input.email.trim().toLowerCase()
  const col = await users()
  if (await col.findOne({ email })) throw conflict('An account with this email already exists.')
  const r = await auth.api.signUpEmail({ body: { name: input.name, email, password: input.password } })
  const id = r.user.id
  await col.updateOne({ _id: toOid(id)! }, { $set: { role: input.role, status: 'active', ...(input.supplierId ? { supplierId: input.supplierId } : {}) } })
  // Sign-up auto-creates a session server-side with no cookie attached; drop it.
  await (await db()).connection.db!.collection('session').deleteMany({ userId: { $in: [toOid(id), id] } as never })
  return id
}
