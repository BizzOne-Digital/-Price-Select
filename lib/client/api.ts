// Browser-side API client. Every write goes through here so success is only reported after the
// server confirms persistence, and errors carry the server's message and code.

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
  /** Provider not configured (payments, email, ...): show as "unavailable", not as a failure. */
  get unavailable() {
    return this.code === 'integration_not_configured'
  }
}

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'),
      headers: opts.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      credentials: 'same-origin',
      cache: 'no-store',
      signal: opts.signal,
    })
  } catch {
    throw new ApiError(0, 'network', 'Network error. Check your connection and try again.')
  }
  const text = await res.text()
  const data = text ? safeJson(text) : null
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error
    throw new ApiError(res.status, e?.code ?? 'error', e?.message ?? `Request failed (${res.status}).`, e?.details)
  }
  return data as T
}

function safeJson(t: string) {
  try {
    return JSON.parse(t)
  } catch {
    return t
  }
}

/** Human-readable message for an error, including field/row details when present. */
export function errorText(e: unknown) {
  if (!(e instanceof ApiError)) return 'Something went wrong. Please try again.'
  const d = e.details
  if (Array.isArray(d) && d.length) {
    const parts = d.map((x) => (typeof x === 'string' ? x : (x as { message?: string })?.message)).filter(Boolean)
    if (parts.length) return `${e.message} ${parts.slice(0, 4).join(' ')}`
  }
  return e.message
}

/** Unique key for idempotent writes (checkout, refunds, membership). Keep it for retries. */
export const idempotencyKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, '')
