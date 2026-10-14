import { beforeAll, describe, expect, it } from 'vitest'
import * as upload from '@/app/api/upload/route'
import * as sessions from '@/app/api/upload/sessions/route'
import * as chunk from '@/app/api/upload/sessions/[id]/chunks/[index]/route'
import * as finalize from '@/app/api/upload/sessions/[id]/finalize/route'
import * as getImage from '@/app/api/uploads/[folder]/[filename]/route'
import * as privateUpload from '@/app/api/private-assets/route'
import * as privateGet from '@/app/api/private-assets/[id]/route'
import * as adminProduct from '@/app/api/admin/products/[id]/route'
import { StoredUpload, UploadChunk, UploadSession } from '@/lib/server/models/files'
import { CHUNK_BYTES, MAX_IMAGE_BYTES } from '@/lib/server/services/uploads'
import { account, call, catalog, request } from './helpers'

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const png = (size: number) => {
  const b = new Uint8Array(size)
  b.set(PNG_HEAD)
  for (let i = 8; i < size; i++) b[i] = i % 251
  return b
}
const form = (fields: Record<string, string | Blob>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

let admin: Awaited<ReturnType<typeof account>>
beforeAll(async () => {
  admin = await account('admin')
})

describe('POST /api/upload', () => {
  it('requires an administrator', async () => {
    const cust = await account('customer')
    expect((await call(upload.POST, request('POST', '/api/upload', { raw: form({ folder: 'products', file: new Blob([png(100)]) }) }))).status).toBe(401)
    expect((await call(upload.POST, request('POST', '/api/upload', { cookie: cust.cookie, raw: form({ folder: 'products', file: new Blob([png(100)]) }) }))).status).toBe(403)
  })

  it('validates the real format, folder and size — not the filename or browser MIME', async () => {
    const fake = new File([new TextEncoder().encode('<svg onload=alert(1)>')], 'photo.png', { type: 'image/png' })
    expect((await call(upload.POST, request('POST', '/api/upload', { cookie: admin.cookie, raw: form({ folder: 'products', file: fake }) }))).status).toBe(415)
    expect((await call(upload.POST, request('POST', '/api/upload', { cookie: admin.cookie, raw: form({ folder: '../etc', file: new Blob([png(100)]) }) }))).status).toBe(400)
    expect((await call(upload.POST, request('POST', '/api/upload', { cookie: admin.cookie, raw: form({ folder: 'products', file: new Blob([]) }) }))).status).toBe(400)
    expect((await call(upload.POST, request('POST', '/api/upload', { cookie: admin.cookie, raw: form({ folder: 'products', file: new Blob([png(MAX_IMAGE_BYTES + 1)]) }) }))).status).toBe(413)
  })

  it('stores the image in MongoDB and serves it with immutable caching', async () => {
    const r = await call(upload.POST, request('POST', '/api/upload', { cookie: admin.cookie, raw: form({ folder: 'gallery', file: new File([png(5000)], 'x.gif', { type: 'image/gif' }) }) }))
    expect(r.status).toBe(201)
    expect(r.data).toMatchObject({ success: true, folder: 'gallery', size: 5000 })
    expect(r.data.url).toMatch(/^\/api\/uploads\/gallery\/\d{13}-[a-f0-9]{16}\.png$/) // extension from the bytes, not the name
    expect(await StoredUpload.countDocuments({ filename: r.data.filename })).toBe(1)

    const res = await getImage.GET(request('GET', r.data.url), { params: Promise.resolve({ folder: 'gallery', filename: r.data.filename }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('content-length')).toBe('5000')
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(png(5000))
  })

  it('rejects traversal and malformed paths, and 404s missing files', async () => {
    const get = (folder: string, filename: string) => getImage.GET(request('GET', '/x'), { params: Promise.resolve({ folder, filename }) })
    expect((await get('products', '..')).status).toBe(400)
    expect((await get('products', '..%2F..%2Fsecret')).status).toBe(400)
    expect((await get('products', 'a\\b.png')).status).toBe(400)
    expect((await get('private', '1700000000000-0123456789abcdef.png')).status).toBe(400)
    expect((await get('products', '1700000000000-0123456789abcdef.png')).status).toBe(404)
  })
})

describe('chunked upload transport', () => {
  it('handles an 8 MB image in chunks, tolerates duplicate retries, and finalizes idempotently', async () => {
    const data = png(MAX_IMAGE_BYTES)
    const init = await call(sessions.POST, request('POST', '/api/upload/sessions', { cookie: admin.cookie, body: { target: 'public', folder: 'products', size: data.length } }))
    expect(init.status).toBe(201)
    const { uploadId, chunkCount, chunkSize } = init.data
    expect(chunkSize).toBe(CHUNK_BYTES)
    expect(chunkCount).toBe(Math.ceil(data.length / CHUNK_BYTES))
    for (let i = 0; i < chunkCount; i++) {
      const part = data.subarray(i * chunkSize, (i + 1) * chunkSize)
      const req = () => request('PUT', `/api/upload/sessions/${uploadId}/chunks/${i}`, { cookie: admin.cookie, raw: part, headers: { 'content-type': 'application/octet-stream' } })
      expect((await call(chunk.PUT, req(), { id: uploadId, index: String(i) })).status).toBe(200)
      if (i === 0) expect((await call(chunk.PUT, req(), { id: uploadId, index: '0' })).status).toBe(200) // retry
    }
    const f1 = await call(finalize.POST, request('POST', `/api/upload/sessions/${uploadId}/finalize`, { cookie: admin.cookie }), { id: uploadId })
    const f2 = await call(finalize.POST, request('POST', `/api/upload/sessions/${uploadId}/finalize`, { cookie: admin.cookie }), { id: uploadId })
    expect(f1.status).toBe(200)
    expect(f2.data.url).toBe(f1.data.url)
    expect(f1.data.size).toBe(MAX_IMAGE_BYTES)
    expect(await StoredUpload.countDocuments({ filename: f1.data.filename })).toBe(1)
    expect(await UploadChunk.countDocuments({ session: uploadId })).toBe(0)
  })

  it('rejects bad indices, wrong sizes, other users, missing chunks and expired sessions', async () => {
    const init = await call(sessions.POST, request('POST', '/api/upload/sessions', { cookie: admin.cookie, body: { target: 'public', folder: 'misc', size: CHUNK_BYTES + 10 } }))
    const id = init.data.uploadId
    const put = (index: number, bytes: Uint8Array, cookie = admin.cookie) => call(chunk.PUT, request('PUT', '/x', { cookie, raw: bytes, headers: { 'content-type': 'application/octet-stream' } }), { id, index: String(index) })
    expect((await put(5, png(10))).status).toBe(400)
    expect((await put(1, png(11))).status).toBe(400)
    const other = await account('admin')
    expect((await put(1, png(10), other.cookie)).status).toBe(404)
    expect((await put(1, png(10))).status).toBe(200)
    expect((await call(finalize.POST, request('POST', '/x', { cookie: admin.cookie }), { id })).status).toBe(409) // chunk 0 missing; session stays open
    await UploadSession.updateOne({ _id: id }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
    expect((await put(0, png(CHUNK_BYTES))).status).toBe(410)
    expect((await call(sessions.POST, request('POST', '/api/upload/sessions', { cookie: admin.cookie, body: { target: 'public', folder: 'misc', size: MAX_IMAGE_BYTES + 1 } }))).status).toBe(413)
  })

  it('aborts when reassembled content is not a valid image', async () => {
    const init = await call(sessions.POST, request('POST', '/api/upload/sessions', { cookie: admin.cookie, body: { target: 'public', folder: 'misc', size: 20 } }))
    const id = init.data.uploadId
    await call(chunk.PUT, request('PUT', '/x', { cookie: admin.cookie, raw: new Uint8Array(20), headers: { 'content-type': 'application/octet-stream' } }), { id, index: '0' })
    expect((await call(finalize.POST, request('POST', '/x', { cookie: admin.cookie }), { id })).status).toBe(415)
    expect((await UploadSession.findById(id).lean())!.status).toBe('aborted')
  })
})

describe('reference-safe replacement', () => {
  it('deletes the old image only after the product saves the new one, and keeps shared images', async () => {
    const c = await catalog()
    const up = async () => (await call(upload.POST, request('POST', '/api/upload', { cookie: admin.cookie, raw: form({ folder: 'products', file: new Blob([png(300)]) }) }))).data.url as string
    const [a, b, shared] = [await up(), await up(), await up()]
    const patch = (images: { src: string; alt: string }[], id = String(c.widget._id)) => call(adminProduct.PATCH, request('PATCH', `/api/admin/products/${id}`, { cookie: admin.cookie, body: { images } }), { id })
    expect((await patch([{ src: a, alt: 'a' }, { src: shared, alt: 's' }])).status).toBe(200)
    expect((await patch([{ src: shared, alt: 's' }], String(c.gizmo._id))).status).toBe(200)
    // Replace a → b on widget: a is unreferenced and removed; shared stays (still used by gizmo).
    expect((await patch([{ src: b, alt: 'b' }])).status).toBe(200)
    const exists = async (url: string) => !!(await StoredUpload.exists({ filename: url.split('/').pop() }))
    expect(await exists(a)).toBe(false)
    expect(await exists(b)).toBe(true)
    expect(await exists(shared)).toBe(true)
    // A failed save (invalid external URL) leaves the record and the stored image untouched.
    expect((await patch([{ src: 'https://evil.example/x.png', alt: 'x' }])).status).toBe(400)
    expect(await exists(b)).toBe(true)
  })
})

describe('private assets', () => {
  it('keeps supplier documents and customer evidence private to their owners', async () => {
    const c = await catalog()
    const supA = await account('supplier', { supplierId: String(c.supplierA._id) })
    const supB = await account('supplier', { supplierId: String(c.supplierB._id) })
    const cust = await account('customer')
    const pdf = new Blob([new TextEncoder().encode('%PDF-1.4 test document')])
    const up = await call(privateUpload.POST, request('POST', '/api/private-assets', { cookie: supA.cookie, raw: form({ purpose: 'supplier_document', label: 'Tax form', file: new File([pdf], 'tax.pdf') }) }))
    expect(up.status).toBe(201)
    const read = (cookie?: string) => privateGet.GET(request('GET', '/x', { cookie }), { params: Promise.resolve({ id: up.data.id }) })
    const ok = await read(supA.cookie)
    expect(ok.status).toBe(200)
    expect(ok.headers.get('cache-control')).toBe('private, no-store')
    expect((await read(supB.cookie)).status).toBe(404)
    expect((await read(cust.cookie)).status).toBe(404)
    expect((await read()).status).toBe(401)
    expect((await read(admin.cookie)).status).toBe(200)
    // Customers cannot upload supplier documents.
    expect((await call(privateUpload.POST, request('POST', '/api/private-assets', { cookie: cust.cookie, raw: form({ purpose: 'supplier_document', file: new File([pdf], 'x.pdf') }) }))).status).toBe(403)
    // Private files never resolve through the public image route.
    expect((await getImage.GET(request('GET', '/x'), { params: Promise.resolve({ folder: 'products', filename: `${up.data.id}.pdf` }) })).status).toBe(400)
  })
})
