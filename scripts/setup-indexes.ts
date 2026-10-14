/**
 * Create every MongoDB index declared by the models plus Better Auth's collections.
 * Production connections set autoIndex=false, so run this once per environment (safe to repeat):
 *
 *   npm run db:indexes
 */
import mongoose from 'mongoose'
import { getAuth } from '@/lib/server/auth'
import { db, disconnect } from '@/lib/server/db'
import '@/lib/server/models/catalog'
import '@/lib/server/models/files'
import '@/lib/server/models/network'
import '@/lib/server/models/orders'
import '@/lib/server/models/system'

async function main() {
  await db()
  for (const name of mongoose.modelNames()) {
    await mongoose.model(name).createIndexes()
    console.log(`indexes ok: ${name}`)
  }
  await getAuth() // creates Better Auth indexes
  console.log('indexes ok: user, session, account, verification')
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => disconnect())
