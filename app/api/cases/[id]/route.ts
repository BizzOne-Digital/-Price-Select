import { requireActor } from '@/lib/server/auth'
import { body, handler, json } from '@/lib/server/http'
import { addMessage, getCase, zMessage } from '@/lib/server/services/cases'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler<{ id: string }>(async (req, { params }) => json(await getCase(await requireActor(undefined, req.headers), (await params).id)))
/** Post a message. Visibility is fixed by role for customers and suppliers; staff choose. */
export const POST = handler<{ id: string }>(async (req, { params }) => json(await addMessage(await requireActor(undefined, req.headers), (await params).id, await body(req, zMessage))))
