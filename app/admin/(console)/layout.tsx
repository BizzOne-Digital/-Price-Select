import { AdminShell } from '@/components/admin/admin-shell'
import { ROLE_LABEL } from '@/lib/auth'
import { requirePage } from '@/lib/server/page-auth'
import { adminBadges } from '@/lib/server/services/admin-ui'
import { listNotifications } from '@/lib/server/services/notify'

export const dynamic = 'force-dynamic'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '··'

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePage(['admin', 'support'], '/admin/login')
  const [badges, notifications] = await Promise.all([adminBadges(actor), listNotifications(actor)])
  return (
    <AdminShell user={{ name: actor.name, role: ROLE_LABEL[actor.role], initials: initials(actor.name) }} role={actor.role} badges={badges} notifications={notifications}>
      {children}
    </AdminShell>
  )
}
