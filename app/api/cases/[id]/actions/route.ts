import { requireActor } from '@/lib/server/auth'
import { body, handler, json } from '@/lib/server/http'
import { staffCaseAction, zStaffAction } from '@/lib/server/services/cases'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = handler<{ id: string }>(async (req, { params }) => json(await staffCaseAction(await requireActor(['admin', 'support'], req.headers), (await params).id, await body(req, zStaffAction))))
