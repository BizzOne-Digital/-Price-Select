import { randomBytes } from 'node:crypto'
import { db } from '@/lib/server/db'
import { Category, Product } from '@/lib/server/models/catalog'
import { Supplier } from '@/lib/server/models/network'
import { Settings } from '@/lib/server/models/system'
import { createAccount } from '@/lib/server/services/users'
import * as signIn from '@/app/api/session/sign-in/route'
import type { Role } from '@/lib/types'

export const ORIGIN = 'http://localhost:3000'
const rnd = () => Math.floor(Math.random() * 250) + 1

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>

/** Build a same-origin request, optionally authenticated with a session cookie. */
export function request(method: string, path: string, opts: { body?: unknown; cookie?: string; origin?: string | null; headers?: Record<string, string>; raw?: BodyInit } = {}) {
  // Each request gets its own client IP so per-IP rate limits don't couple unrelated tests.
  const h = new Headers({ host: 'localhost:3000', 'x-forwarded-for': `10.${rnd()}.${rnd()}.${rnd()}`, ...(opts.headers ?? {}) })
  if (opts.origin !== null) h.set('origin', opts.origin ?? ORIGIN)
  if (opts.cookie) h.set('cookie', opts.cookie)
  let body: BodyInit | undefined = opts.raw
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body)
    h.set('content-type', 'application/json')
  }
  return new Request(`${ORIGIN}${path}`, { method, headers: h, body })
}

export async function call<T = any>(fn: Handler | ((req: Request, ctx: any) => Promise<Response>), req: Request, params: Record<string, string> = {}) {
  const res = await fn(req, { params: Promise.resolve(params) })
  const text = await res.text()
  let data: T
  try {
    data = JSON.parse(text)
  } catch {
    data = text as T
  }
  return { status: res.status, data, res }
}

export const cookieFrom = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')

export const uniq = () => randomBytes(4).toString('hex')

/** Create an account with a role, then sign in through the real portal route. */
export async function account(role: Role, opts: { supplierId?: string; password?: string } = {}) {
  const email = `${role}-${uniq()}@example.test`
  const password = opts.password ?? 'correct-horse-battery'
  const id = await createAccount({ name: `${role} ${uniq()}`, email, password, role, supplierId: opts.supplierId })
  const portal = role === 'customer' ? 'customer' : role === 'supplier' ? 'supplier' : 'staff'
  const r = await call(signIn.POST, request('POST', '/api/session/sign-in', { body: { email, password, portal } }))
  if (r.status !== 200) throw new Error(`sign-in failed for ${role}: ${JSON.stringify(r.data)}`)
  return { id, email, password, cookie: cookieFrom(r.res) }
}

export async function configureCommerce(opts: { shipping?: number | null; tax?: 'none_confirmed' | 'manual_rate' | 'not_configured'; ratePercent?: number } = {}) {
  await db()
  await Settings.updateOne(
    { key: 'global' },
    {
      $set: {
        'data.shipping': opts.shipping === null ? { carriers: '', mode: 'not_configured', flatRate: null, freeThreshold: null, freight: 'supplier', packaging: 'blind' } : { carriers: 'Test', mode: 'flat_per_shipment', flatRate: opts.shipping ?? 10, freeThreshold: null, freight: 'supplier', packaging: 'blind' },
        'data.tax': { mode: opts.tax ?? 'none_confirmed', ratePercent: opts.ratePercent ?? null },
      },
    },
    { upsert: true },
  )
}

/** Two approved suppliers, one standard and one enhanced category, a few published products. */
export async function catalog() {
  await db()
  const k = uniq()
  await Category.create([
    { slug: `gadgets-${k}`, name: `Gadgets ${k}`, short: 'Gadgets', reviewLevel: 'standard', active: true },
    { slug: `solar-${k}`, name: `Solar ${k}`, short: 'Solar', reviewLevel: 'enhanced', requiredDocuments: ['Electrical certification'], active: true },
  ])
  const [a, b] = await Supplier.create([
    { code: `sup-a-${k}`, name: `Supplier A ${k}`, status: 'approved', categories: [`gadgets-${k}`, `solar-${k}`], documents: [] },
    { code: `sup-b-${k}`, name: `Supplier B ${k}`, status: 'approved', categories: [`gadgets-${k}`], documents: [] },
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mk = (over: Record<string, unknown>): any => ({
    category: `gadgets-${k}`,
    brand: 'Brand',
    images: [{ src: 'https://images.unsplash.com/photo-1?w=10', alt: 'x' }],
    summary: 'Summary',
    description: 'Description',
    compliance: [{ label: 'Authenticity', required: true, status: 'on_file', reviewedBy: 'seed' }],
    status: 'published',
    publishedAt: new Date(),
    ...over,
  })
  const [widget, gizmo, scarce, hidden] = await Product.create([
    mk({ slug: `widget-${k}`, sku: 'W-1', name: 'Widget', supplier: a._id, priceCents: 10_000, inventory: { onHand: 10, reserved: 0 } }),
    mk({ slug: `gizmo-${k}`, sku: 'G-1', name: 'Gizmo', supplier: b._id, priceCents: 5_000, inventory: { onHand: 10, reserved: 0 } }),
    mk({ slug: `scarce-${k}`, sku: 'S-1', name: 'Scarce', supplier: a._id, priceCents: 2_000, inventory: { onHand: 1, reserved: 0 } }),
    mk({ slug: `hidden-${k}`, sku: 'H-1', name: 'Hidden draft', supplier: a._id, priceCents: 1_000, status: 'pending_review', inventory: { onHand: 5, reserved: 0 } }),
  ])
  return { k, supplierA: a, supplierB: b, widget, gizmo, scarce, hidden, categories: { standard: `gadgets-${k}`, enhanced: `solar-${k}` } }
}

export const idem = () => `idem-${randomBytes(12).toString('hex')}`
