import { describe, expect, it } from 'vitest'
import * as apply from '@/app/api/supplier/apply/route'
import * as supplierDocs from '@/app/api/supplier/documents/route'
import * as supplierSubmit from '@/app/api/supplier/submit/route'
import * as supplierMe from '@/app/api/supplier/me/route'
import * as supplierProducts from '@/app/api/supplier/products/route'
import * as attach from '@/app/api/supplier/products/[id]/attach/route'
import * as submitProduct from '@/app/api/supplier/products/[id]/submit/route'
import * as supplierOrders from '@/app/api/supplier/orders/route'
import * as fulfill from '@/app/api/supplier/orders/[fid]/route'
import * as inventory from '@/app/api/supplier/inventory/route'
import * as decision from '@/app/api/admin/suppliers/[code]/decision/route'
import * as review from '@/app/api/admin/products/[id]/review/route'
import * as productRoute from '@/app/api/products/[slug]/route'
import * as privateUpload from '@/app/api/private-assets/route'
import * as checkoutRoute from '@/app/api/checkout/route'
import * as myOrder from '@/app/api/orders/[id]/route'
import * as cases from '@/app/api/cases/route'
import * as caseRoute from '@/app/api/cases/[id]/route'
import * as caseActions from '@/app/api/cases/[id]/actions/route'
import * as respond from '@/app/api/cases/[id]/respond/route'
import * as refund from '@/app/api/admin/orders/[id]/refund/route'
import * as adminOrder from '@/app/api/admin/orders/[id]/route'
import { Product } from '@/lib/server/models/catalog'
import { account, call, catalog, configureCommerce, cookieFrom, idem, request, uniq } from './helpers'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8])
const PDF = new TextEncoder().encode('%PDF-1.4 certificate')
const uploadPrivate = async (cookie: string, purpose: string, bytes: Uint8Array, name: string, label?: string) => {
  const f = new FormData()
  f.set('purpose', purpose)
  if (label) f.set('label', label)
  f.set('file', new File([bytes], name))
  const r = await call(privateUpload.POST, request('POST', '/api/private-assets', { cookie, raw: f }))
  expect(r.status).toBe(201)
  return r.data.id as string
}

describe('marketplace end to end', () => {
  it('application → approval → listing → publication → checkout → fulfillment → tracking → partial return → refund', async () => {
    const base = await catalog()
    await configureCommerce({ shipping: 10, tax: 'none_confirmed' })
    const admin = await account('admin')
    const support = await account('support')
    const otherSupplier = await account('supplier', { supplierId: String(base.supplierB._id) })

    // 1. Supplier application creates a login and a draft record.
    const email = `apply-${uniq()}@example.test`
    const a = await call(apply.POST, request('POST', '/api/supplier/apply', { body: { legalName: 'Sunrise Energy LLC', tradingName: 'Sunrise Energy', businessType: 'Manufacturer', website: 'sunrise.example', categories: [base.categories.enhanced], contactName: 'Pat Applicant', email, password: 'applicant-password', phone: '+1 555 0100', taxId: '12-3456789', country: 'United States', shipFrom: 'Austin, TX', carriers: ['Parcel carrier'], handling: '2 business days', blindShip: true } }))
    expect(a.status).toBe(201)
    const sup = cookieFrom(a.res)
    const code = a.data.supplier as string

    // Not approved yet: no listings.
    expect((await call(supplierProducts.POST, request('POST', '/api/supplier/products', { cookie: sup, body: {} }))).status).toBe(403)
    // Submission requires documents.
    expect((await call(supplierSubmit.POST, request('POST', '/api/supplier/submit', { cookie: sup, body: { authentic: true, terms: true } }))).status).toBe(400)
    for (const kind of ['registration', 'insurance', 'certificate'] as const) {
      const id = await uploadPrivate(sup, 'supplier_document', PDF, `${kind}.pdf`)
      expect((await call(supplierDocs.POST, request('POST', '/api/supplier/documents', { cookie: sup, body: { assetId: id, kind } }))).status).toBe(200)
    }
    const submitted = await call(supplierSubmit.POST, request('POST', '/api/supplier/submit', { cookie: sup, body: { authentic: true, terms: true } }))
    expect(submitted.data.status).toBe('applied')
    expect(submitted.data.taxIdLast4).toBe('6789')
    expect(JSON.stringify(submitted.data)).not.toContain('12-3456789')

    // 2. Admin reviews documents, then approves (approval before review is refused).
    expect((await call(decision.POST, request('POST', '/x', { cookie: admin.cookie, body: { action: 'approve' } }), { code })).status).toBe(409)
    for (const d of submitted.data.documents) await call(decision.POST, request('POST', '/x', { cookie: admin.cookie, body: { action: 'document', documentId: d.id, decision: 'on_file' } }), { code })
    const approved = await call(decision.POST, request('POST', '/x', { cookie: admin.cookie, body: { action: 'approve' } }), { code })
    expect(approved.data.status).toBe('approved')
    expect((await call(supplierMe.GET, request('GET', '/api/supplier/me', { cookie: sup }))).data.status).toBe('approved')

    // 3. Supplier drafts a full listing in an enhanced-review category and submits it.
    const draft = await call(supplierProducts.POST, request('POST', '/api/supplier/products', { cookie: sup, body: { name: 'Sunrise Panel 400', brand: 'Sunrise', category: base.categories.enhanced, price: 300, summary: 'A 400 W panel.', description: 'Monocrystalline module.', specs: [{ label: 'Power', value: '400 W' }], upc: '012345678905', weightKg: 21, dimensions: '172 × 113 × 3 cm', handlingDays: 2, deliveryEstimate: '4–7 business days', sku: 'SUN-400', onHand: 5 } }))
    expect(draft.status).toBe(201)
    const pid = draft.data.id as string
    expect(draft.data).toMatchObject({ upc: '012345678905', weightKg: 21, dimensions: '172 × 113 × 3 cm', status: 'draft' })
    expect(draft.data.specs).toEqual([{ label: 'Power', value: '400 W' }])
    const img = await uploadPrivate(sup, 'product_image', PNG, 'panel.png')
    await call(attach.POST, request('POST', '/x', { cookie: sup, body: { assetId: img, as: 'image', alt: 'Panel' } }), { id: pid })
    for (const label of ['Authenticity & new-condition confirmation', 'Electrical certification']) {
      const doc = await uploadPrivate(sup, 'product_document', PDF, 'doc.pdf')
      expect((await call(attach.POST, request('POST', '/x', { cookie: sup, body: { assetId: doc, as: 'document', label } }), { id: pid })).status).toBe(200)
    }
    expect((await call(submitProduct.POST, request('POST', '/x', { cookie: sup }), { id: pid })).data.status).toBe('pending_review')
    // Suppliers cannot publish or approve their own compliance.
    expect((await call(review.POST, request('POST', '/x', { cookie: sup, body: { action: 'approve' } }), { id: pid })).status).toBe(403)

    // 4. Admin publication: blocked until documents are reviewed, signed off, and an image is published.
    const blocked = await call(review.POST, request('POST', '/x', { cookie: admin.cookie, body: { action: 'approve' } }), { id: pid })
    expect(blocked.status).toBe(409)
    expect(blocked.data.error.details.join(' ')).toMatch(/Enhanced-review sign-off/)
    expect((await call(review.POST, request('POST', '/x', { cookie: admin.cookie, body: { action: 'signoff', note: '' } }), { id: pid })).status).toBe(409)
    for (const label of ['Authenticity & new-condition confirmation', 'Electrical certification']) await call(review.POST, request('POST', '/x', { cookie: admin.cookie, body: { action: 'document', label, decision: 'on_file' } }), { id: pid })
    await call(review.POST, request('POST', '/x', { cookie: admin.cookie, body: { action: 'signoff', note: 'Certificates verified' } }), { id: pid })
    await call(review.POST, request('POST', '/x', { cookie: admin.cookie, body: { action: 'publish_image', assetId: img, alt: 'Panel' } }), { id: pid })
    const live = await call(review.POST, request('POST', '/x', { cookie: admin.cookie, body: { action: 'approve' } }), { id: pid })
    expect(live.data.status).toBe('published')
    expect(live.data.enhancedSignoff.byName).toMatch(/^admin /) // the signed-in reviewer, recorded server-side
    expect(live.data.images[0].src).toMatch(/^\/api\/uploads\/products\//)
    const slug = live.data.slug as string
    expect((await call(productRoute.GET, request('GET', `/api/products/${slug}`), { slug })).status).toBe(200)

    // Inventory CSV respects reservations and ownership.
    const inv = await call(inventory.POST, request('POST', '/x', { cookie: sup, body: { apply: false, csv: 'sku,quantity\nSUN-400,8\nW-1,3\nSUN-400,9\n' } }))
    expect(inv.data.rows.map((r: { ok: boolean; error?: string }) => r.error ?? 'ok')).toEqual(['ok', 'SKU not in your catalog', 'Duplicate SKU in file'])
    await call(inventory.POST, request('POST', '/x', { cookie: sup, body: { apply: true, csv: 'sku,quantity\nSUN-400,8\n' } }))

    // 5. Customer checks out three units.
    const cust = await account('customer')
    const order = await call(checkoutRoute.POST, request('POST', '/api/checkout', { cookie: cust.cookie, body: { items: [{ productId: pid, qty: 3 }], email: cust.email, shipTo: { name: 'Casey Customer', line1: '5 Elm St', city: 'Denver', region: 'CO', postal: '80202', country: 'United States', phone: '+1 555 0101' }, idempotencyKey: idem() } }))
    expect(order.status).toBe(201)
    const orderId = order.data.orderId as string
    expect((await Product.findById(pid).lean())!.inventory).toMatchObject({ onHand: 5, reserved: 0 })

    // 6. Supplier isolation and fulfillment.
    expect((await call(supplierOrders.GET, request('GET', '/x', { cookie: otherSupplier.cookie }))).data.some((f: { orderId: string }) => f.orderId === orderId)).toBe(false)
    const mine = (await call(supplierOrders.GET, request('GET', '/x', { cookie: sup }))).data.find((f: { orderId: string }) => f.orderId === orderId)
    expect(mine).toBeTruthy()
    expect(Object.keys(mine).sort()).toEqual(['fulfillment', 'orderId', 'placedAt', 'shipTo'])
    expect(JSON.stringify(mine)).not.toContain(cust.email)
    const fid = mine.fulfillment.id as string
    expect((await call(fulfill.POST, request('POST', '/x', { cookie: otherSupplier.cookie, body: { action: 'acknowledge' } }), { fid })).status).toBe(404)
    expect((await call(fulfill.POST, request('POST', '/x', { cookie: sup, body: { action: 'status', status: 'shipped' } }), { fid })).status).toBe(409) // must acknowledge first
    expect((await call(fulfill.POST, request('POST', '/x', { cookie: sup, body: { action: 'acknowledge' } }), { fid })).data.fulfillment.status).toBe('confirmed')
    expect((await call(fulfill.POST, request('POST', '/x', { cookie: sup, body: { action: 'tracking', carrier: 'Parcel carrier', tracking: '1Z999AA10123456784' } }), { fid })).data.fulfillment.status).toBe('shipped')
    expect((await call(fulfill.POST, request('POST', '/x', { cookie: sup, body: { action: 'status', status: 'delivered' } }), { fid })).data.fulfillment.status).toBe('delivered')

    // 7. Customer tracking.
    const tracked = await call(myOrder.GET, request('GET', '/x', { cookie: cust.cookie }), { id: orderId })
    expect(tracked.data.status).toBe('delivered')
    expect(tracked.data.fulfillments[0].tracking).toBe('1Z999AA10123456784')
    const lineId = tracked.data.fulfillments[0].lines[0].lineId as string

    // 8. Partial return: one unit of three; asking for three more is refused.
    const rc = await call(cases.POST, request('POST', '/api/cases', { cookie: cust.cookie, body: { kind: 'return', orderId, type: 'damage', lines: [{ lineId, qty: 1 }], reason: 'Cracked glass', message: 'One panel arrived cracked.' } }))
    expect(rc.status).toBe(201)
    const caseId = rc.data.id as string
    expect(rc.data.lines).toEqual([{ lineId, name: 'Sunrise Panel 400', qty: 1 }])
    expect((await call(cases.POST, request('POST', '/api/cases', { cookie: cust.cookie, body: { kind: 'return', orderId, type: 'return', lines: [{ lineId, qty: 3 }], reason: 'Too many', message: 'Return the rest please.' } }))).status).toBe(409)

    // 9. Supplier approves; staff-only notes stay internal.
    expect((await call(respond.POST, request('POST', '/x', { cookie: sup, body: { decision: 'approve', message: 'Replacement or refund approved.' } }), { id: caseId })).data.status).toBe('approved')
    await call(caseRoute.POST, request('POST', '/x', { cookie: admin.cookie, body: { text: 'Internal: check carrier claim', visibility: 'staff' } }), { id: caseId })
    const supView = await call(caseRoute.GET, request('GET', '/x', { cookie: sup }), { id: caseId })
    expect(JSON.stringify(supView.data.notes)).not.toContain('Internal: check carrier claim')
    expect((await call(caseRoute.GET, request('GET', '/x', { cookie: otherSupplier.cookie }), { id: caseId })).status).toBe(404)

    // 10. Support cannot move money; an admin refunds exactly one unit.
    const resolveBody = (amount: number) => ({ action: 'resolve', outcome: 'refund', summary: 'Refunded one damaged unit.', refundAmount: amount, idempotencyKey: idem() })
    expect((await call(caseActions.POST, request('POST', '/x', { cookie: support.cookie, body: resolveBody(300) }), { id: caseId })).status).toBe(403)
    const resolved = await call(caseActions.POST, request('POST', '/x', { cookie: admin.cookie, body: resolveBody(300) }), { id: caseId })
    expect(resolved.status).toBe(200)
    expect(resolved.data.status).toBe('resolved')
    expect(resolved.data.refund).toEqual({ amount: 300, status: 'succeeded' })
    const ao = await call(adminOrder.GET, request('GET', '/x', { cookie: admin.cookie }), { id: orderId })
    expect(ao.data.order.payment).toBe('partially_refunded')
    expect(ao.data.order.refunded).toBe(300)
    expect(ao.data.order.refundable).toBe(ao.data.order.total - 300)
    const over = await call(refund.POST, request('POST', '/x', { cookie: admin.cookie, body: { amount: ao.data.order.refundable + 0.01, reason: 'too much', idempotencyKey: idem() } }), { id: orderId })
    expect(over.status).toBe(409)

    // 11. Customer sees the resolution, never the internal note.
    const custView = await call(caseRoute.GET, request('GET', '/x', { cookie: cust.cookie }), { id: caseId })
    expect(custView.data.status).toBe('resolved')
    expect(JSON.stringify(custView.data.notes)).not.toContain('Internal')
    expect(custView.data.assignee).toBeUndefined()
  })
})
