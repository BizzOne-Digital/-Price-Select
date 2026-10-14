import { requireActor } from '@/lib/server/auth'
import { badRequest, handler, json } from '@/lib/server/http'
import { CHUNK_BYTES, putChunk } from '@/lib/server/services/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Upload one chunk as multipart `chunk` field or raw application/octet-stream body. Retries are safe. */
export const PUT = handler<{ id: string; index: string }>(async (req, { params }) => {
  const a = await requireActor(undefined, req.headers)
  const { id, index } = await params
  const len = Number(req.headers.get('content-length') ?? 0)
  if (len > CHUNK_BYTES + 64 * 1024) throw badRequest('Chunk too large.')
  let data: Buffer
  if ((req.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
    const f = (await req.formData()).get('chunk')
    if (!(f instanceof File)) throw badRequest('Missing "chunk" field.')
    data = Buffer.from(await f.arrayBuffer())
  } else data = Buffer.from(await req.arrayBuffer())
  return json(await putChunk(a, id, Number(index), data))
})
