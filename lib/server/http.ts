import 'server-only'
import { z, ZodError } from 'zod'
import { ConfigError } from './env'

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, 'not_found', `${what} not found.`)
export const conflict = (message: string, details?: unknown) => new HttpError(409, 'conflict', message, details)
export const badRequest = (message: string, details?: unknown) => new HttpError(400, 'invalid_request', message, details)
/** A feature depends on an external provider that has not been configured. Never reported as success. */
export const notConfigured = (integration: string, message: string) => new HttpError(503, 'integration_not_configured', message, { integration })

export const json = (data: unknown, init?: number | ResponseInit) =>
  Response.json(data, typeof init === 'number' ? { status: init, headers: { 'Cache-Control': 'no-store' } } : { ...init, headers: { 'Cache-Control': 'no-store', ...init?.headers } })

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return json({ error: { code: e.code, message: e.message, details: e.details } }, e.status)
  if (e instanceof ZodError)
    return json({ error: { code: 'invalid_request', message: 'Some fields are invalid.', details: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) } }, 400)
  if (e instanceof ConfigError) {
    console.error(e.message)
    return json({ error: { code: 'server_not_configured', message: e.message } }, 503)
  }
  // Mongo duplicate key
  if (typeof e === 'object' && e && (e as { code?: number }).code === 11000) return json({ error: { code: 'conflict', message: 'That record already exists.' } }, 409)
  console.error('[api] unhandled error', e instanceof Error ? `${e.name}: ${e.message}` : 'unknown')
  return json({ error: { code: 'server_error', message: 'Something went wrong. Please try again.' } }, 500)
}

/**
 * Same-origin check for cookie-authenticated writes (CSRF). Browsers always send Origin on
 * cross-site POST/PUT/PATCH/DELETE; we accept only our own origin.
 */
export function assertSameOrigin(req: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return
  const origin = req.headers.get('origin')
  const site = req.headers.get('sec-fetch-site')
  if (origin) {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
    let ok = false
    try {
      ok = new URL(origin).host === host
    } catch {}
    if (ok) return
  } else if (site === 'same-origin' || site === null) {
    // No Origin and no fetch metadata: non-browser client (no ambient cookies to abuse) or same-origin.
    return
  }
  throw new HttpError(403, 'bad_origin', 'Cross-site request rejected.')
}

type Ctx<P> = { params: Promise<P> }

/** Wrap a route handler: origin check, typed errors → JSON. */
export function handler<P = Record<string, string>>(fn: (req: Request, ctx: Ctx<P>) => Promise<Response>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      assertSameOrigin(req)
      return await fn(req, ctx)
    } catch (e) {
      return errorResponse(e)
    }
  }
}

export async function body<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw badRequest('Request body must be JSON.')
  }
  return schema.parse(raw)
}

export function query<T extends z.ZodType>(req: Request, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams))
}

export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'

/** Persistent fixed-window rate limit (MongoDB), shared across serverless instances. */
export async function rateLimit(key: string, limit: number, windowSec: number) {
  const { RateBucket } = await import('./models/system')
  const { db } = await import('./db')
  await db()
  const win = Math.floor(Date.now() / 1000 / windowSec)
  const doc = await RateBucket.findOneAndUpdate(
    { key: `${key}:${win}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((win + 1) * windowSec * 1000) } },
    { upsert: true, returnDocument: 'after' },
  ).lean()
  if ((doc?.count ?? 0) > limit) throw new HttpError(429, 'rate_limited', 'Too many attempts. Please wait a moment and try again.')
}

// Shared validators
export const zId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
export const zSlug = z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9-]*$/, 'Use lowercase letters, numbers and hyphens')
export const zText = (max = 2000) => z.string().trim().max(max)
export const zMoney = z.number().finite().min(0).max(10_000_000)
export const toCents = (dollars: number) => Math.round(dollars * 100)
export const toDollars = (cents: number | null | undefined) => (cents == null ? 0 : cents / 100)
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
