import { requireActor } from '@/lib/server/auth'
import { badRequest, clientIp, handler, json, rateLimit } from '@/lib/server/http'
import { PRIVATE_PURPOSES, savePrivateAsset, type PrivatePurpose } from '@/lib/server/services/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Single-request private upload (FormData: file, purpose, label). Use upload sessions above ~3.5 MB. */
export const POST = handler(async (req) => {
  const a = await requireActor(undefined, req.headers)
  await rateLimit(`private-upload:${a.id}:${clientIp(req)}`, 60, 600)
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const purpose = String(form?.get('purpose') ?? '')
  if (!(file instanceof File) || !(PRIVATE_PURPOSES as readonly string[]).includes(purpose)) throw badRequest('Send multipart form data with "file" and a valid "purpose".')
  const label = form?.get('label')
  return json(await savePrivateAsset(a, { purpose: purpose as PrivatePurpose, label: typeof label === 'string' ? label : undefined, originalName: file.name }, Buffer.from(await file.arrayBuffer())), 201)
})
