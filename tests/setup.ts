import { afterAll, inject } from 'vitest'

// Isolated configuration for every test file: in-memory replica set, unique database, test-only
// adapters (refused in production by lib/server/env.ts).
process.env.MONGODB_URI = inject('mongoUri')
process.env.MONGODB_DB_NAME = `ps-test-${process.pid}-${Math.random().toString(36).slice(2, 8)}`
process.env.BETTER_AUTH_SECRET = 'test-secret-test-secret-test-secret-0123456789'
process.env.BETTER_AUTH_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
process.env.PAYMENT_PROVIDER ??= 'test'
process.env.EMAIL_PROVIDER ??= 'test'
process.env.CRON_SECRET = 'test-cron-secret'

afterAll(async () => {
  const mongoose = (await import('mongoose')).default
  if (mongoose.connection.readyState === 1) await mongoose.connection.db!.dropDatabase()
  const { disconnect } = await import('@/lib/server/db')
  await disconnect()
  ;(globalThis as { __psAuth?: unknown }).__psAuth = undefined
})
