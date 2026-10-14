import 'server-only'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { Actor } from '../auth'
import { db } from '../db'
import { badRequest, conflict, HttpError, notFound } from '../http'
import { Category, Product } from '../models/catalog'
import { PrivateAsset, StoredUpload, UploadChunk, UploadSession } from '../models/files'
import { Case } from '../models/orders'
import { Content } from '../models/system'
import { Supplier } from '../models/network'

// Uploads are stored in MongoDB, never on the filesystem, so they survive redeploys on read-only
// serverless hosts. Public catalog images and private documents are separate collections with
// separate routes.

export const PUBLIC_FOLDERS = ['products', 'gallery', 'pages', 'misc'] as const
export type PublicFolder = (typeof PUBLIC_FOLDERS)[number]
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const MAX_PRIVATE_BYTES = 10 * 1024 * 1024
/** Each chunk request stays well under Vercel's 4.5 MB function body limit, multipart overhead included. */
export const CHUNK_BYTES = 3 * 1024 * 1024
export const SESSION_TTL_MS = 60 * 60_000

type Kind = { mime: string; ext: string }
const IMAGE_KINDS: Record<string, Kind> = { png: { mime: 'image/png', ext: 'png' }, jpg: { mime: 'image/jpeg', ext: 'jpg' }, webp: { mime: 'image/webp', ext: 'webp' }, gif: { mime: 'image/gif', ext: 'gif' } }

/** Identify the real format from file signature bytes; the client's name and MIME are not trusted. */
export function sniff(buf: Uint8Array): Kind | null {
  const b = buf
  const ascii = (s: number, e: number) => String.fromCharCode(...b.subarray(s, e))
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 4) === 'PNG' && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return IMAGE_KINDS.png
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return IMAGE_KINDS.jpg
  if (b.length >= 6 && (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a')) return IMAGE_KINDS.gif
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return IMAGE_KINDS.webp
  if (b.length >= 5 && ascii(0, 5) === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' }
  return null
}

const isImage = (k: Kind | null): k is Kind => !!k && k.mime.startsWith('image/')

// ---------------------------------------------------------------- public images

const FILENAME_RX = /^\d{13}-[a-f0-9]{16}\.(png|jpg|webp|gif)$/

export function isPublicFolder(f: string): f is PublicFolder {
  return (PUBLIC_FOLDERS as readonly string[]).includes(f)
}
export const isValidFilename = (f: string) => FILENAME_RX.test(f)

/** Parse an `/api/uploads/<folder>/<filename>` URL; anything else (external, legacy, traversal) → null. */
export function parseUploadUrl(url: string): { folder: PublicFolder; filename: string } | null {
  const m = /^\/api\/uploads\/([a-z]+)\/([^/\\]+)$/.exec(url)
  if (!m || !isPublicFolder(m[1]) || !isValidFilename(m[2])) return null
  return { folder: m[1], filename: m[2] }
}

function assertAdmin(actor: Actor) {
  if (actor.role !== 'admin') throw new HttpError(403, 'forbidden', 'Only administrators can upload public images.')
}

export async function savePublicImage(actor: Actor, folder: string, data: Buffer) {
  assertAdmin(actor)
  if (!isPublicFolder(folder)) throw badRequest('Folder must be one of products, gallery, pages, misc.')
  if (!data.length) throw badRequest('The file is empty.')
  if (data.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'too_large', 'Images must be 8 MB or smaller.')
  const kind = sniff(data)
  if (!isImage(kind)) throw new HttpError(415, 'unsupported_type', 'Only JPEG, PNG, WebP or GIF images are accepted.')
  await db()
  const filename = `${Date.now()}-${randomBytes(8).toString('hex')}.${kind.ext}`
  await StoredUpload.create({ folder, filename, mimeType: kind.mime, size: data.length, data, uploadedBy: actor.id })
  return { success: true as const, url: `/api/uploads/${folder}/${filename}`, filename, size: data.length, folder }
}

export async function getPublicImage(folder: string, filename: string) {
  if (!isPublicFolder(folder) || !isValidFilename(filename)) throw badRequest('Malformed image path.')
  await db()
  const doc = await StoredUpload.findOne({ folder, filename }, { data: 1, mimeType: 1, size: 1 }).lean()
  if (!doc) throw notFound('Image')
  return { data: Buffer.from(doc.data.buffer ?? doc.data), mimeType: doc.mimeType, size: doc.size }
}

/** Whether any saved record still points at this image URL. */
export async function isUploadReferenced(url: string) {
  const [p, c] = await Promise.all([Product.exists({ 'images.src': url }), Category.exists({ image: url })])
  if (p || c) return true
  const contents = await Content.find({}, { draft: 1, published: 1 }).lean()
  return contents.some((d) => JSON.stringify([d.draft?.data, d.published?.data]).includes(url))
}

/**
 * Delete stored images that are no longer referenced. Only our own `/api/uploads/...` URLs are
 * considered; external URLs are never fetched or touched. Call this only AFTER the record that
 * dropped the reference has been saved.
 */
export async function cleanupUploads(actor: Actor, urls: (string | null | undefined)[]) {
  assertAdmin(actor)
  await db()
  const deleted: string[] = []
  for (const url of new Set(urls.filter(Boolean) as string[])) {
    const ref = parseUploadUrl(url)
    if (!ref || (await isUploadReferenced(url))) continue
    const r = await StoredUpload.deleteOne({ folder: ref.folder, filename: ref.filename })
    if (r.deletedCount) deleted.push(url)
  }
  return deleted
}

// ---------------------------------------------------------------- private assets

export const PRIVATE_PURPOSES = ['supplier_document', 'product_document', 'product_image', 'case_evidence'] as const
export type PrivatePurpose = (typeof PRIVATE_PURPOSES)[number]

async function privateOwner(actor: Actor, purpose: PrivatePurpose) {
  if (purpose === 'case_evidence') {
    if (actor.role === 'customer') return { customerUserId: actor.id }
    if (actor.role === 'admin' || actor.role === 'support') return {}
    throw new HttpError(403, 'forbidden', 'You cannot attach evidence to cases.')
  }
  if (actor.role === 'admin') return {}
  if (actor.role !== 'supplier' || !actor.supplierId) throw new HttpError(403, 'forbidden', 'Only suppliers can upload this document type.')
  if (purpose !== 'supplier_document') {
    const s = await Supplier.findById(actor.supplierId, 'status').lean()
    if (s?.status !== 'approved') throw new HttpError(403, 'supplier_inactive', 'Your supplier account must be approved to upload product files.')
  }
  return { supplier: actor.supplierId }
}

function validatePrivate(purpose: PrivatePurpose, data: Buffer) {
  if (!data.length) throw badRequest('The file is empty.')
  if (data.length > MAX_PRIVATE_BYTES) throw new HttpError(413, 'too_large', 'Files must be 10 MB or smaller.')
  const kind = sniff(data)
  if (!kind || kind.mime === 'image/gif') throw new HttpError(415, 'unsupported_type', 'Upload a PDF, JPEG, PNG or WebP file.')
  if (purpose === 'product_image' && !isImage(kind)) throw new HttpError(415, 'unsupported_type', 'Product images must be JPEG, PNG or WebP.')
  return kind
}

const safeName = (n?: string) => (n ?? 'file').replace(/[^\w.\- ]+/g, '_').slice(0, 120)

export async function savePrivateAsset(actor: Actor, input: { purpose: PrivatePurpose; label?: string; originalName?: string }, data: Buffer) {
  const owner = await privateOwner(actor, input.purpose)
  const kind = validatePrivate(input.purpose, data)
  await db()
  const a = await PrivateAsset.create({ purpose: input.purpose, label: input.label?.slice(0, 120), originalName: safeName(input.originalName), mimeType: kind.mime, size: data.length, data, uploadedBy: actor.id, uploaderRole: actor.role, ...owner })
  return { id: String(a._id), name: a.originalName, size: a.size, mimeType: a.mimeType, purpose: a.purpose }
}

/** Authorization for reading a private asset. */
export async function canReadPrivate(actor: Actor, a: { _id: unknown; purpose: string; supplier?: unknown; customerUserId?: string | null; uploadedBy: string; case?: unknown }) {
  if (actor.role === 'admin') return true
  if (a.uploadedBy === actor.id) return true
  if (a.purpose === 'case_evidence' && a.case) {
    const c = await Case.findById(a.case, { customerUserId: 1, supplier: 1, messages: 1 }).lean()
    if (!c) return false
    if (actor.role === 'support') return true
    const msg = c.messages.find((m) => (m.attachments ?? []).some((x) => String(x) === String(a._id)))
    if (actor.role === 'customer') return c.customerUserId === actor.id && msg?.visibility === 'customer'
    if (actor.role === 'supplier') return !!actor.supplierId && String(c.supplier) === actor.supplierId && (msg?.visibility === 'customer' || msg?.visibility === 'supplier')
    return false
  }
  if (actor.role === 'supplier') return !!actor.supplierId && String(a.supplier) === actor.supplierId
  return false
}

export async function readPrivateAsset(actor: Actor, id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound('File')
  await db()
  const a = await PrivateAsset.findById(id).select('+data').lean()
  if (!a || !(await canReadPrivate(actor, a))) throw notFound('File')
  return { data: Buffer.from(a.data.buffer ?? a.data), mimeType: a.mimeType, size: a.size, name: a.originalName ?? 'file' }
}

/** Link uploaded evidence to a case. Only the uploader's own, still-unlinked evidence is accepted. */
export async function claimEvidence(actor: Actor, ids: string[], caseId: unknown, session?: import('mongoose').ClientSession) {
  if (!ids.length) return []
  const r = await PrivateAsset.updateMany({ _id: { $in: ids }, uploadedBy: actor.id, purpose: 'case_evidence', case: { $exists: false } }, { $set: { case: caseId } }, { session })
  if (r.modifiedCount !== ids.length) throw badRequest('One or more attachments are invalid or already attached elsewhere.')
  return ids
}

// ---------------------------------------------------------------- chunked transport

export const zInit = z.discriminatedUnion('target', [
  z.object({ target: z.literal('public'), folder: z.enum(PUBLIC_FOLDERS), size: z.number().int().positive(), originalName: z.string().max(200).optional() }),
  z.object({ target: z.literal('private'), purpose: z.enum(PRIVATE_PURPOSES), label: z.string().max(120).optional(), size: z.number().int().positive(), originalName: z.string().max(200).optional() }),
])

export async function initUpload(actor: Actor, input: z.infer<typeof zInit>) {
  if (input.target === 'public') assertAdmin(actor)
  else await privateOwner(actor, input.purpose)
  const max = input.target === 'public' ? MAX_IMAGE_BYTES : MAX_PRIVATE_BYTES
  if (input.size > max) throw new HttpError(413, 'too_large', `Files must be ${max / 1024 / 1024} MB or smaller.`)
  await db()
  const s = await UploadSession.create({
    userId: actor.id,
    target: input.target,
    folder: input.target === 'public' ? input.folder : undefined,
    purpose: input.target === 'private' ? input.purpose : undefined,
    label: input.target === 'private' ? input.label : undefined,
    originalName: safeName(input.originalName),
    size: input.size,
    chunkSize: CHUNK_BYTES,
    chunkCount: Math.ceil(input.size / CHUNK_BYTES),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  })
  return { uploadId: String(s._id), chunkSize: CHUNK_BYTES, chunkCount: s.chunkCount, expiresAt: s.expiresAt.toISOString() }
}

async function ownSession(actor: Actor, id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) throw notFound('Upload')
  await db()
  const s = await UploadSession.findOne({ _id: id, userId: actor.id })
  if (!s) throw notFound('Upload')
  return s
}

export async function putChunk(actor: Actor, id: string, index: number, data: Buffer) {
  const s = await ownSession(actor, id)
  if (s.status === 'finalized') return { received: s.chunkCount, chunkCount: s.chunkCount, done: true }
  if (s.status !== 'open') throw conflict('This upload is no longer accepting chunks.')
  if (s.expiresAt.getTime() < Date.now()) throw new HttpError(410, 'expired', 'This upload session expired. Start again.')
  if (!Number.isInteger(index) || index < 0 || index >= s.chunkCount) throw badRequest('Chunk index out of range.')
  const expected = index === s.chunkCount - 1 ? s.size - CHUNK_BYTES * (s.chunkCount - 1) : CHUNK_BYTES
  if (data.length !== expected) throw badRequest(`Chunk ${index} must be exactly ${expected} bytes.`)
  try {
    await UploadChunk.create({ session: s._id, index, data, size: data.length })
  } catch (e) {
    // Duplicate retry of the same chunk: accept if identical in size, otherwise reject.
    if ((e as { code?: number }).code !== 11000) throw e
    const prior = await UploadChunk.findOne({ session: s._id, index }, { size: 1 }).lean()
    if (prior?.size !== data.length) throw conflict('A different chunk was already received at this index.')
  }
  const after = await UploadSession.findOneAndUpdate({ _id: s._id }, { $addToSet: { received: index } }, { returnDocument: 'after' }).lean()
  return { received: after!.received.length, chunkCount: s.chunkCount, done: after!.received.length === s.chunkCount }
}

/** Reassemble, validate and store. Idempotent: a repeated finalize returns the saved result. */
export async function finalizeUpload(actor: Actor, id: string) {
  const s = await ownSession(actor, id)
  if (s.status === 'finalized') return s.result!
  if (s.expiresAt.getTime() < Date.now()) throw new HttpError(410, 'expired', 'This upload session expired. Start again.')
  if (s.status === 'aborted') throw new HttpError(410, 'aborted', 'This upload was rejected. Start again.')
  // Missing chunks are retryable: report which are absent and leave the session open.
  const have = new Set(s.received)
  const missing = Array.from({ length: s.chunkCount }, (_, i) => i).filter((i) => !have.has(i))
  if (missing.length) throw conflict(`Missing chunks: received ${have.size} of ${s.chunkCount}.`, { missing })
  const locked = await UploadSession.findOneAndUpdate({ _id: s._id, status: 'open' }, { $set: { status: 'finalizing' } }, { returnDocument: 'after' })
  if (!locked) {
    const now = await UploadSession.findById(s._id).lean()
    if (now?.status === 'finalized') return now.result!
    throw conflict('This upload is already being finalized. Retry in a moment.')
  }
  try {
    const chunks = await UploadChunk.find({ session: s._id }).sort({ index: 1 }).lean()
    if (chunks.length !== s.chunkCount || chunks.some((c, i) => c.index !== i)) throw new HttpError(503, 'retry', 'Chunks are still being written. Retry finalize.')
    const data = Buffer.concat(chunks.map((c) => Buffer.from(c.data.buffer ?? c.data)))
    if (data.length !== s.size) throw new HttpError(422, 'invalid_content', 'Uploaded size does not match the declared size.')
    let result: { url?: string; assetId?: string; filename?: string; size: number; folder?: string }
    if (s.target === 'public') {
      const r = await savePublicImage(actor, s.folder!, data)
      result = { url: r.url, filename: r.filename, size: r.size, folder: r.folder }
    } else {
      const r = await savePrivateAsset(actor, { purpose: s.purpose as PrivatePurpose, label: s.label ?? undefined, originalName: s.originalName ?? undefined }, data)
      result = { assetId: r.id, filename: r.name ?? undefined, size: r.size }
    }
    await UploadSession.updateOne({ _id: s._id }, { $set: { status: 'finalized', result } })
    await UploadChunk.deleteMany({ session: s._id })
    return result
  } catch (e) {
    // Invalid content (format/size): abort so the client starts over; anything else reopens for retry.
    const invalid = e instanceof HttpError && [413, 415, 422].includes(e.status)
    await UploadSession.updateOne({ _id: s._id }, { $set: { status: invalid ? 'aborted' : 'open' } })
    if (invalid) await UploadChunk.deleteMany({ session: s._id })
    throw e
  }
}

/** Remove abandoned sessions and their chunks, and old finalized session records. */
export async function cleanupUploadSessions() {
  await db()
  const stale = await UploadSession.find({ $or: [{ status: { $ne: 'finalized' }, expiresAt: { $lt: new Date() } }, { status: 'finalized', updatedAt: { $lt: new Date(Date.now() - 86_400_000) } }] }, { _id: 1 }).limit(500).lean()
  const ids = stale.map((s) => s._id)
  const chunks = await UploadChunk.deleteMany({ session: { $in: ids } })
  await UploadSession.deleteMany({ _id: { $in: ids } })
  return { sessions: ids.length, chunks: chunks.deletedCount }
}
