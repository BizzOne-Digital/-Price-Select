import { z } from 'zod'
import { requireActor } from '@/lib/server/auth'
import { handler, json } from '@/lib/server/http'
import { SECTIONS, updatePromotion, updateSection, type SectionKey } from '@/lib/server/services/settings'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KEY = z.enum([...(Object.keys(SECTIONS) as [SectionKey, ...SectionKey[]]), 'promotion'])

export const PUT = handler<{ section: string }>(async (req, { params }) => {
  const a = await requireActor(['admin'], req.headers)
  const key = KEY.parse((await params).section)
  const data = await req.json()
  return json(key === 'promotion' ? await updatePromotion(a, data) : await updateSection(a, key, data))
})
