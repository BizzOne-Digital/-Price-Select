import { api, ApiError } from './api'

// Upload transport. Small files go in one multipart request; larger files are split into chunks
// so each request stays under the host's 4.5 MB body limit (Vercel), preserving the 8 MB image /
// 10 MB document limits. Chunk PUTs are retried; finalize is idempotent.

export const PUBLIC_FOLDERS = ['products', 'gallery', 'pages', 'misc'] as const
export type PublicFolder = (typeof PUBLIC_FOLDERS)[number]
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const MAX_PRIVATE_BYTES = 10 * 1024 * 1024
/** Above this, use chunked sessions (leaves room for multipart overhead under 4.5 MB). */
const SINGLE_REQUEST_MAX = 3.5 * 1024 * 1024

type Progress = (fraction: number) => void

async function putChunkWithRetry(url: string, blob: Blob, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { method: 'PUT', body: blob, headers: { 'Content-Type': 'application/octet-stream' }, credentials: 'same-origin' })
      if (res.ok) return
      const e = (await res.json().catch(() => null))?.error
      if (res.status < 500 || i >= tries - 1) throw new ApiError(res.status, e?.code ?? 'error', e?.message ?? 'Upload failed.')
    } catch (err) {
      if (err instanceof ApiError || i >= tries - 1) throw err
    }
    await new Promise((r) => setTimeout(r, 500 * 2 ** i))
  }
}

async function chunked(init: Record<string, unknown>, file: File, onProgress?: Progress) {
  const s = await api<{ uploadId: string; chunkSize: number; chunkCount: number }>('/api/upload/sessions', { body: { ...init, size: file.size, originalName: file.name } })
  for (let i = 0; i < s.chunkCount; i++) {
    await putChunkWithRetry(`/api/upload/sessions/${s.uploadId}/chunks/${i}`, file.slice(i * s.chunkSize, (i + 1) * s.chunkSize))
    onProgress?.((i + 1) / (s.chunkCount + 1))
  }
  const r = await api<Record<string, unknown>>(`/api/upload/sessions/${s.uploadId}/finalize`, { method: 'POST' })
  onProgress?.(1)
  return r
}

/** Upload a public catalog/content image (admins). Resolves to the saved public URL. */
export async function uploadImage(file: File, folder: PublicFolder, onProgress?: Progress): Promise<{ url: string; filename: string; size: number }> {
  if (!IMAGE_TYPES.includes(file.type)) throw new ApiError(415, 'unsupported_type', 'Choose a JPEG, PNG, WebP or GIF image.')
  if (file.size > MAX_IMAGE_BYTES) throw new ApiError(413, 'too_large', 'Images must be 8 MB or smaller.')
  if (file.size > SINGLE_REQUEST_MAX) return (await chunked({ target: 'public', folder }, file, onProgress)) as { url: string; filename: string; size: number }
  const form = new FormData()
  form.set('file', file)
  form.set('folder', folder)
  onProgress?.(0.1)
  const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'same-origin' })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Upload failed.')
  onProgress?.(1)
  return data
}

export type PrivatePurpose = 'supplier_document' | 'product_document' | 'product_image' | 'case_evidence'

/** Upload a private document/evidence file. Resolves to the private asset id. */
export async function uploadPrivate(file: File, purpose: PrivatePurpose, label?: string, onProgress?: Progress): Promise<{ id: string; name: string }> {
  if (file.size > MAX_PRIVATE_BYTES) throw new ApiError(413, 'too_large', 'Files must be 10 MB or smaller.')
  if (file.size > SINGLE_REQUEST_MAX) {
    const r = await chunked({ target: 'private', purpose, label }, file, onProgress)
    return { id: String(r.assetId), name: String(r.filename ?? file.name) }
  }
  const form = new FormData()
  form.set('file', file)
  form.set('purpose', purpose)
  if (label) form.set('label', label)
  const res = await fetch('/api/private-assets', { method: 'POST', body: form, credentials: 'same-origin' })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Upload failed.')
  onProgress?.(1)
  return { id: data.id, name: data.name }
}

/** Link to view/download a private file (authorization is enforced by the server). */
export const privateAssetUrl = (id: string) => `/api/private-assets/${id}`
