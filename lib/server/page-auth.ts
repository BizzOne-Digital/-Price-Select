import 'server-only'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import type { Role } from '@/lib/types'
import { getActor, type Actor } from './auth'

/**
 * Guard for Server Components (pages and layouts). Unauthenticated visitors go to the portal's
 * sign-in page; signed-in users with the wrong role get a 404 (no hint that the page exists).
 * This complements, never replaces, the authorization inside every service and API route.
 */
export async function requirePage(roles: Role[], loginPath: string): Promise<Actor> {
  const h = await headers()
  const actor = await getActor(h)
  if (!actor) {
    const path = h.get('x-invoke-path') ?? h.get('next-url') ?? ''
    redirect(`${loginPath}${path ? `?next=${encodeURIComponent(path)}` : ''}`)
  }
  if (!roles.includes(actor.role)) notFound()
  return actor
}

/** Current actor for optional personalization (header, preview). Never throws. */
export async function currentActor(): Promise<Actor | null> {
  try {
    return await getActor(await headers())
  } catch {
    return null
  }
}
