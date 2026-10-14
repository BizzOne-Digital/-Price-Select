import { describe, expect, it } from 'vitest'
import * as session from '@/app/api/session/route'
import * as signIn from '@/app/api/session/sign-in/route'
import * as signUp from '@/app/api/session/sign-up/route'
import * as signOut from '@/app/api/session/sign-out/route'
import * as adminOrders from '@/app/api/admin/orders/route'
import * as adminSettings from '@/app/api/admin/settings/[section]/route'
import * as adminCustomerStatus from '@/app/api/admin/customers/[id]/status/route'
import * as refund from '@/app/api/admin/orders/[id]/refund/route'
import * as productsAdmin from '@/app/api/admin/products/route'
import * as upload from '@/app/api/upload/route'
import { account, call, cookieFrom, idem, request } from './helpers'

describe('authentication', () => {
  it('registers a customer, restores the session, and logs out with server-side invalidation', async () => {
    const email = `new-${Date.now()}@example.test`
    const r = await call(signUp.POST, request('POST', '/api/session/sign-up', { body: { name: 'New Customer', email, password: 'long-enough-pass', role: 'admin' } }))
    expect(r.status).toBe(201)
    const cookie = cookieFrom(r.res)
    const me = await call(session.GET, request('GET', '/api/session', { cookie }))
    // A role field in the sign-up body is ignored: accounts from public sign-up are customers.
    expect(me.data.user).toMatchObject({ email, role: 'customer' })

    const out = await call(signOut.POST, request('POST', '/api/session/sign-out', { cookie }))
    expect(out.status).toBe(200)
    // The old cookie no longer restores a session (record deleted, not just the cookie cleared).
    const after = await call(session.GET, request('GET', '/api/session', { cookie }))
    expect(after.data.user).toBeNull()
  })

  it('rejects wrong passwords and accounts used at the wrong portal with the same error', async () => {
    const c = await account('customer')
    const wrongPw = await call(signIn.POST, request('POST', '/api/session/sign-in', { body: { email: c.email, password: 'nope-nope-nope', portal: 'customer' } }))
    const wrongPortal = await call(signIn.POST, request('POST', '/api/session/sign-in', { body: { email: c.email, password: c.password, portal: 'staff' } }))
    expect(wrongPw.status).toBe(401)
    expect(wrongPortal.status).toBe(401)
    expect(wrongPortal.data.error.message).toBe(wrongPw.data.error.message)
  })

  it('suspension revokes sessions and blocks new sign-ins', async () => {
    const admin = await account('admin')
    const c = await account('customer')
    const s = await call(adminCustomerStatus.POST, request('POST', `/api/admin/customers/${c.id}/status`, { cookie: admin.cookie, body: { status: 'suspended' } }), { id: c.id })
    expect(s.status).toBe(200)
    expect((await call(session.GET, request('GET', '/api/session', { cookie: c.cookie }))).data.user).toBeNull()
    const again = await call(signIn.POST, request('POST', '/api/session/sign-in', { body: { email: c.email, password: c.password, portal: 'customer' } }))
    expect(again.status).toBe(403)
  })

  it('rejects cross-site writes', async () => {
    const c = await account('customer')
    const r = await call(signOut.POST, request('POST', '/api/session/sign-out', { cookie: c.cookie, origin: 'https://evil.example' }))
    expect(r.status).toBe(403)
  })

  it('persistently rate-limits sign-in attempts per email', async () => {
    const c = await account('customer')
    let last = 0
    for (let i = 0; i < 9; i++) last = (await call(signIn.POST, request('POST', '/api/session/sign-in', { headers: { 'x-forwarded-for': '10.9.9.9' }, body: { email: c.email, password: 'wrong-password-x', portal: 'customer' } }))).status
    expect(last).toBe(429)
  })
})

describe('role enforcement', () => {
  it('customers and suppliers cannot reach staff APIs', async () => {
    const c = await account('customer')
    const s = await account('supplier')
    expect((await call(adminOrders.GET, request('GET', '/api/admin/orders', { cookie: c.cookie }))).status).toBe(403)
    expect((await call(adminOrders.GET, request('GET', '/api/admin/orders', { cookie: s.cookie }))).status).toBe(403)
    expect((await call(adminOrders.GET, request('GET', '/api/admin/orders'))).status).toBe(401)
  })

  it('support is limited to permitted operations', async () => {
    const support = await account('support')
    expect((await call(adminOrders.GET, request('GET', '/api/admin/orders', { cookie: support.cookie }))).status).toBe(200)
    expect((await call(adminSettings.PUT, request('PUT', '/api/admin/settings/tax', { cookie: support.cookie, body: { mode: 'none_confirmed', ratePercent: null } }), { section: 'tax' })).status).toBe(403)
    expect((await call(refund.POST, request('POST', '/api/admin/orders/PS-1/refund', { cookie: support.cookie, body: { amount: 1, reason: 'test', idempotencyKey: idem() } }), { id: 'PS-1' })).status).toBe(403)
    expect((await call(productsAdmin.GET, request('GET', '/api/admin/products', { cookie: support.cookie }))).status).toBe(403)
    const form = new FormData()
    form.set('folder', 'products')
    form.set('file', new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])]), 'a.png')
    expect((await call(upload.POST, request('POST', '/api/upload', { cookie: support.cookie, raw: form }))).status).toBe(403)
  })
})
