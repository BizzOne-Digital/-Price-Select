import { beforeAll, describe, expect, it } from 'vitest'
import * as section from '@/app/api/admin/settings/[section]/route'
import * as settingsGet from '@/app/api/admin/settings/route'
import * as content from '@/app/api/admin/content/[key]/route'
import * as publish from '@/app/api/admin/content/[key]/publish/route'
import * as reports from '@/app/api/admin/reports/[key]/route'
import * as productRoute from '@/app/api/products/[slug]/route'
import * as audit from '@/app/api/admin/audit/route'
import * as jobs from '@/app/api/jobs/run/route'
import { getSiteContent } from '@/lib/server/services/settings'
import { Product } from '@/lib/server/models/catalog'
import { account, call, catalog, request } from './helpers'

let admin: Awaited<ReturnType<typeof account>>
let c: Awaited<ReturnType<typeof catalog>>
beforeAll(async () => {
  admin = await account('admin')
  c = await catalog()
})

const put = (key: string, body: unknown, cookie = admin.cookie) => call(section.PUT, request('PUT', `/api/admin/settings/${key}`, { cookie, body }), { section: key })

describe('persistent settings', () => {
  it('saves sections, survives a fresh read, and records the change in the audit log', async () => {
    expect((await put('shipping', { carriers: 'Parcel', mode: 'flat_per_shipment', flatRate: 12.5, freeThreshold: 200, freight: 'supplier', packaging: 'blind' })).status).toBe(200)
    expect((await put('tax', { mode: 'manual_rate', ratePercent: null })).status).toBe(400) // rate required
    const fresh = await call(settingsGet.GET, request('GET', '/api/admin/settings', { cookie: admin.cookie }))
    expect(fresh.data.settings.shipping).toMatchObject({ flatRate: 12.5, freeThreshold: 200 })
    expect(fresh.data.capabilities.shippingConfigured).toBe(true)
    const log = await call(audit.GET, request('GET', '/api/admin/audit?targetType=settings', { cookie: admin.cookie }))
    expect(log.data[0]).toMatchObject({ action: 'settings.update', target: 'settings:shipping' })
  })

  it('records who confirmed launch checklist items', async () => {
    const r = await put('checklist', { 'Payment provider': { done: true } })
    expect(r.data['Payment provider']).toMatchObject({ done: true, byName: expect.stringMatching(/^admin /) })
  })
})

describe('seasonal campaign', () => {
  const items = (prices: number[]) => [c.widget, c.gizmo, c.scarce].map((p, i) => ({ productId: String(p._id), price: prices[i] }))

  it('requires 3–4 eligible products with 0 < seasonal price < regular price', async () => {
    expect((await put('promotion', { active: true, headline: 'Winter', description: '', items: items([90, 40]).slice(0, 2) })).status).toBe(400)
    const bad = await put('promotion', { active: true, headline: 'Winter', description: '', items: items([100, 40, 10]) }) // widget regular is $100
    expect(bad.status).toBe(400)
    expect(bad.data.error.details[0].message).toMatch(/below the regular price/)
    const draft = [...items([90, 40, 15]), { productId: String(c.hidden._id), price: 5 }]
    expect((await put('promotion', { active: true, headline: 'Winter', description: '', items: draft })).status).toBe(400) // unpublished product
    expect((await put('promotion', { active: true, headline: 'Winter', description: '', items: items([90, 40, 15]) })).status).toBe(200)
  })

  it('changes storefront prices immediately', async () => {
    const p = await call(productRoute.GET, request('GET', `/api/products/${c.widget.slug}`), { slug: c.widget.slug })
    expect(p.data).toMatchObject({ price: 100, seasonalPrice: 90, seasonal: true })
    await put('promotion', { active: false, headline: 'Winter', description: '', items: items([90, 40, 15]) })
    const after = await call(productRoute.GET, request('GET', `/api/products/${c.widget.slug}`), { slug: c.widget.slug })
    expect(after.data.seasonalPrice).toBeUndefined()
  })
})

describe('content drafts and publication', () => {
  it('drafts never reach the storefront; publishing does', async () => {
    const body = { homeHeadline: 'Hand-picked for you.', campaignHeadline: 'Winter savings', campaignDescription: 'Limited window.', pricingNotice: 'Prices exclude taxes and shipping.', contactEmail: 'hello@example.test' }
    expect((await call(content.PUT, request('PUT', '/x', { cookie: admin.cookie, body }), { key: 'content:site' })).status).toBe(200)
    expect((await getSiteContent()).homeHeadline).not.toBe('Hand-picked for you.')
    const pub = await call(publish.POST, request('POST', '/x', { cookie: admin.cookie }), { key: 'content:site' })
    expect(pub.data.version).toBe(1)
    expect((await getSiteContent()).homeHeadline).toBe('Hand-picked for you.')
  })
})

describe('reports', () => {
  it('exports CSV for administrators only, with formula protection and date filters', async () => {
    await Product.updateOne({ _id: c.widget._id }, { $set: { name: '=cmd|calc' } })
    const support = await account('support')
    const denied = await reports.GET(request('GET', '/api/admin/reports/inventory', { cookie: support.cookie }), { params: Promise.resolve({ key: 'inventory' }) })
    expect(denied.status).toBe(403)
    const res = await reports.GET(request('GET', '/api/admin/reports/inventory', { cookie: admin.cookie }), { params: Promise.resolve({ key: 'inventory' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    const csv = await res.text()
    expect(csv).toContain(`"'=cmd|calc"`)
    expect(csv).not.toMatch(/(^|,)"=cmd/m)
    const empty = await reports.GET(request('GET', '/api/admin/reports/sales?from=2000-01-01&to=2000-01-02&format=json', { cookie: admin.cookie }), { params: Promise.resolve({ key: 'sales' }) })
    expect((await empty.json()).count).toBe(0)
  })
})

describe('scheduled jobs', () => {
  it('require the job secret', async () => {
    expect((await call(jobs.POST, request('POST', '/api/jobs/run', { origin: null }))).status).toBe(401)
    const ok = await call(jobs.POST, request('POST', '/api/jobs/run', { origin: null, headers: { authorization: 'Bearer test-cron-secret' } }))
    expect(ok.status).toBe(200)
    expect(ok.data.ok).toBe(true)
  })
})
