import 'server-only'
import mongoose from 'mongoose'
import { dbConfig } from './env'

// One connection per server instance, reused across hot reloads and warm serverless invocations.
// Nothing connects at import time: callers await `db()` when they actually need the database.

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
const g = globalThis as typeof globalThis & { __psMongo?: Cache }
const cache: Cache = (g.__psMongo ??= { conn: null, promise: null })

// Unknown paths are dropped from filters. Operator injection is prevented at the boundary: every
// request body/query is parsed with Zod into primitives before it can reach a filter.
mongoose.set('strictQuery', true)

export async function db() {
  if (cache.conn) return cache.conn
  if (!cache.promise) {
    const { uri, dbName } = dbConfig()
    cache.promise = mongoose
      .connect(uri, { dbName, maxPoolSize: 10, serverSelectionTimeoutMS: 10_000, autoIndex: process.env.NODE_ENV !== 'production' })
      .catch((e) => {
        cache.promise = null
        throw e
      })
  }
  cache.conn = await cache.promise
  return cache.conn
}

/** Run `fn` inside a transaction (requires a replica set, which Atlas always provides). */
export async function tx<T>(fn: (session: mongoose.ClientSession) => Promise<T>): Promise<T> {
  await db()
  const session = await mongoose.startSession()
  try {
    let out!: T
    await session.withTransaction(async () => {
      out = await fn(session)
    })
    return out
  } finally {
    await session.endSession()
  }
}

/** Test hook: drop the cached connection so a new URI can be used. */
export async function disconnect() {
  await mongoose.disconnect()
  cache.conn = null
  cache.promise = null
}
