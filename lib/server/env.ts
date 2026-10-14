import 'server-only'

// Server configuration. Values are read lazily so a missing optional integration never blocks
// unrelated features, and errors name the missing variable without ever echoing a value.

export class ConfigError extends Error {
  constructor(public missing: string[]) {
    super(`Missing required environment variable(s): ${missing.join(', ')}. See .env.example.`)
    this.name = 'ConfigError'
  }
}

function required(...names: string[]) {
  const missing = names.filter((n) => !process.env[n]?.trim())
  if (missing.length) throw new ConfigError(missing)
  return names.map((n) => process.env[n]!.trim())
}

export const isProduction = () => process.env.NODE_ENV === 'production'

export function dbConfig() {
  const [uri] = required('MONGODB_URI')
  return { uri, dbName: process.env.MONGODB_DB_NAME?.trim() || 'price-select' }
}

export function authConfig() {
  // Production must state its public origin: it drives Secure cookies and trusted-origin checks.
  const [secret] = isProduction() ? required('BETTER_AUTH_SECRET', 'BETTER_AUTH_URL') : required('BETTER_AUTH_SECRET')
  return { secret, baseURL: process.env.BETTER_AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || undefined }
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.BETTER_AUTH_URL?.trim() || 'http://localhost:3000'

/** Shared secret for scheduled jobs (reservation expiry, upload cleanup, outbox). Optional. */
export const jobSecret = () => process.env.CRON_SECRET?.trim() || null

/**
 * Integration selection. Only providers that are actually implemented are accepted; anything else
 * is reported as not configured. `test` adapters exist for automated tests and local development
 * and are refused when NODE_ENV=production.
 */
export function providerName(kind: 'PAYMENT' | 'EMAIL'): 'test' | null {
  const v = process.env[`${kind}_PROVIDER`]?.trim().toLowerCase()
  if (v === 'test' && !isProduction()) return 'test'
  return null
}
