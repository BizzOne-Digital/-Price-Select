import { AdminShell } from '@/components/admin/admin-shell'

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
