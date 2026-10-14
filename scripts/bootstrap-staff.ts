/**
 * Create a staff account (administrator or customer service) without any public registration
 * endpoint and without hardcoded credentials. Credentials come from environment variables only.
 *
 *   BOOTSTRAP_EMAIL=... BOOTSTRAP_PASSWORD=... BOOTSTRAP_NAME="..." npm run bootstrap:staff -- --role=admin
 *
 * The first administrator can be created freely. Further administrators need --allow-additional,
 * so the script cannot be reused quietly to mint extra admins.
 */
import { db, disconnect } from '@/lib/server/db'
import { createAccount, users } from '@/lib/server/services/users'

async function main() {
  const role = (process.argv.find((a) => a.startsWith('--role='))?.split('=')[1] ?? 'admin') as 'admin' | 'support'
  if (!['admin', 'support'].includes(role)) throw new Error('--role must be admin or support.')
  const email = process.env.BOOTSTRAP_EMAIL?.trim()
  const password = process.env.BOOTSTRAP_PASSWORD
  const name = process.env.BOOTSTRAP_NAME?.trim() || (role === 'admin' ? 'Administrator' : 'Customer service')
  if (!email || !password) throw new Error('Set BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD.')
  if (password.length < 12) throw new Error('BOOTSTRAP_PASSWORD must be at least 12 characters.')
  await db()
  const col = await users()
  if (role === 'admin' && (await col.findOne({ role: 'admin' })) && !process.argv.includes('--allow-additional')) throw new Error('An administrator already exists. Re-run with --allow-additional to create another.')
  await createAccount({ name, email, password, role })
  console.log(`Created ${role} account for ${email}. Sign in at /admin/login.`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => disconnect())
