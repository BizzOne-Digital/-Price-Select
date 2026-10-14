import 'server-only'
import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import mongoose from 'mongoose'
import { headers as nextHeaders } from 'next/headers'
import { can, type Permission } from '@/lib/auth'
import type { Role } from '@/lib/types'
import { db } from './db'
import { authConfig } from './env'
import { HttpError } from './http'
import { sendTransactional } from './services/notify'

// Authentication: Better Auth with database sessions in MongoDB (collections: user, session,
// account, verification, rateLimit). Sessions are HttpOnly cookies; the cookie cache is disabled so
// sign-out, suspension and revocation take effect on the very next request.

const ROLES: Role[] = ['customer', 'supplier', 'support', 'admin']

function build(database: mongoose.mongo.Db, client: mongoose.mongo.MongoClient) {
  const { secret, baseURL } = authConfig()
  return betterAuth({
    secret,
    baseURL,
    database: mongodbAdapter(database, { client }),
    trustedOrigins: baseURL ? [baseURL] : undefined,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      // Verification is not required to sign in while email is optional; see docs/BACKEND.md.
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        const r = await sendTransactional({ template: 'password-reset', to: user.email, key: `reset:${user.id}:${Date.now()}`, payload: { name: user.name, url } })
        if (!r.sent) throw new HttpError(503, 'integration_not_configured', 'Email delivery is not configured, so a reset link cannot be sent.')
      },
    },
    user: {
      additionalFields: {
        // input:false — never accepted from sign-up/update bodies. Only server code assigns these.
        role: { type: 'string', input: false, defaultValue: 'customer', required: false },
        status: { type: 'string', input: false, defaultValue: 'active', required: false },
        supplierId: { type: 'string', input: false, required: false },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 300, max: 3 },
        '/reset-password': { window: 300, max: 5 },
        '/change-password': { window: 300, max: 5 },
      },
    },
    advanced: { useSecureCookies: !!baseURL?.startsWith('https://'), ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] } },
    databaseHooks: {
      session: {
        create: {
          // Suspended accounts cannot start a session, whichever endpoint is used.
          before: async (session) => {
            const u = await database.collection('user').findOne({ _id: new mongoose.Types.ObjectId(String(session.userId)) }, { projection: { status: 1 } })
            if (u?.status === 'suspended') return false
          },
        },
      },
    },
  })
}

type Auth = ReturnType<typeof build>
const g = globalThis as typeof globalThis & { __psAuth?: Promise<Auth> }

/** The Better Auth instance, created on first use after the database connects. */
export function getAuth(): Promise<Auth> {
  g.__psAuth ??= (async () => {
    const m = await db()
    const database = m.connection.db!
    await ensureAuthIndexes(database)
    return build(database, m.connection.getClient() as unknown as mongoose.mongo.MongoClient)
  })().catch((e) => {
    g.__psAuth = undefined
    throw e
  })
  return g.__psAuth
}

async function ensureAuthIndexes(database: mongoose.mongo.Db) {
  await Promise.all([
    database.collection('user').createIndex({ email: 1 }, { unique: true }),
    database.collection('user').createIndex({ role: 1 }),
    database.collection('user').createIndex({ supplierId: 1 }, { sparse: true }),
    database.collection('session').createIndex({ token: 1 }, { unique: true }),
    database.collection('session').createIndex({ userId: 1 }),
    database.collection('session').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection('account').createIndex({ userId: 1 }),
    database.collection('verification').createIndex({ identifier: 1 }),
    database.collection('verification').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ])
}

export interface Actor {
  id: string
  name: string
  email: string
  role: Role
  /** Supplier tenant for supplier users; derived from the user record only. */
  supplierId?: string
}

/** Resolve the signed-in user from request headers, or null. Suspended users are treated as signed out. */
export async function getActor(h?: Headers): Promise<Actor | null> {
  const auth = await getAuth()
  const s = await auth.api.getSession({ headers: h ?? (await nextHeaders()) })
  if (!s) return null
  const u = s.user as typeof s.user & { role?: string; status?: string; supplierId?: string }
  if (u.status === 'suspended') return null
  const role = ROLES.includes(u.role as Role) ? (u.role as Role) : 'customer'
  return { id: u.id, name: u.name, email: u.email, role, supplierId: role === 'supplier' ? u.supplierId || undefined : undefined }
}

export async function requireActor(roles?: Role[], h?: Headers): Promise<Actor> {
  const a = await getActor(h)
  if (!a) throw new HttpError(401, 'unauthenticated', 'Please sign in.')
  if (roles && !roles.includes(a.role)) throw new HttpError(403, 'forbidden', 'You do not have access to this resource.')
  return a
}

export async function requirePermission(p: Permission, h?: Headers): Promise<Actor> {
  const a = await requireActor(undefined, h)
  assertCan(a, p)
  return a
}

export function assertCan(a: Actor, p: Permission) {
  if (!can(a.role, p)) throw new HttpError(403, 'forbidden', 'You do not have permission for this action.')
}

export const isStaff = (a: Actor | null) => a?.role === 'admin' || a?.role === 'support'
